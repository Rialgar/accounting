define(["sjcl"], function(){

	/**
	*	Usage example:
	*		Account creation:
	*			var ac = new SRP.Account("test", "test", function(){console.log(arguments)});
	*			//log: [SRP.Account]
	*			ac.send(function(){console.log(arguments)});
	*			//log: [SRP.Account, {success: true}]
	*			
	*		Login:
	*			var cl = new SRP.Client("test", function(){console.log(arguments)});
	*			//log: [SRP.Client, "A generated"]
	*			cl.sendA();
	*			//log: [SRP.Client, "Password required"]
	*			cl.setPassword("test");
	*			//log: [SRP.Client, "Shared state calculated"]
	*			cl.sendM1()		
	*			//log: [SRP.Client, "Authentification successfull"]
	**/



	var SRP = {};
				
	if(!sjcl || !sjcl.bn)
	{
		throw new Error("SRP requires the stanford javascript crypto library with bignumber support");
	}

	//these need to be the same on the server and are not to be changed after account creation
	SRP.g = new sjcl.bn("0xda79878e03210039d1186cee28d294dfda8fd959fd50515a08b572c9711298319041c09a28d24a5d20f837f67adf7fea0ab1162a22a4dcefc8fc94a087be575d");

	SRP.N = new sjcl.bn("0x1b4f30f1c06420073a230d9dc51a529bfb51fb2b3faa0a2b4116ae592e22530632083813451a494ba41f06fecf5beffd415622c544549b9df91f929410f7caebb");

	SRP.k = new sjcl.bn(1);

	/**
	*	Utility function to send webrequests as part of the Secure Remote Password Protocoll
	*	
	*	@param url The url to send the message to
	*	@param message mesage to send
	*
	**/
	SRP.send = function(url, message, callback)
	{
		var xhr = new XMLHttpRequest();

		xhr.onreadystatechange = function()
		{
			if(xhr.readyState == 4 && callback && typeof callback == "function")
			{
				var response;
				if(xhr.status >= 200 && xhr.status < 300)
				{
					response = JSON.parse(xhr.responseText);
				}
				else
				{
					response = {error: xhr.status}
				}
				callback.call(window, response);
			}
		}

		xhr.open("POST", url, true);
		xhr.send(JSON.stringify(message));
	}

	/**
	*	Creates initial credentials to be sent to the server for future authentification
	*	
	*	@param username The users username
	*	@param password The users password
	*	@param callback (Optional)  function to be called when creation is complete.
	*	@param callbackEntropy (Optional) function to be called when mouse movement is required to create entropy.
	*
	**/
	SRP.Account = function (username, password, callback, callbackEntropy)
	{
		username = username.toString();
		password = password.toString();

		this.ready = false;

		this.I = sjcl.bn.fromBits(sjcl.hash.sha256.hash(username));

		this.callback = callback;
		this.callbackEntropy = callbackEntropy;

		this.createS(password);
	}

	/**
	*	__FOR INTERNAL USE ONLY__ Creates a random salt, may return without completion and complete later if the random generator was not seeded enough, calls callback on completion.
	*
	*	@param password to be passed down from constructor
	*
	**/
	SRP.Account.prototype.createS = function(password)
	{
		if(this.listener)
		{
			sjcl.random.removeEventListener("seeded", this.listener);
			this.listener = false;
			sjcl.stopCollectors();
		}

		try
		{
			var s = sjcl.random.randomWords(32);
			this.s = sjcl.bn.fromBits(s);
			var x = sjcl.bn.fromBits(sjcl.misc.pbkdf2(password, s));
			this.v = SRP.g.powermod(x, SRP.N)

			delete password;

			this.ready = true;
			if(this.callback && typeof this.callback == "function")
			{
				this.callback.call(window, this);
			}
		}
		catch(e)
		{
			this.listener = this.createS.bind(this, password);
			sjcl.random.addEventListener("seeded", this.listener);
			sjcl.startCollectors();
			if(this.callbackEntropy && typeof this.callbackEntropy == "function")
			{
				this.callbackEntropy.call(window, this);
			}
		}
	}

	/**
	*	Sends account information to server, response is passed to callback.
	*
	*	@param url (Optional) the url to send to, defaults to "./SRP/createAccount"
	*	@param callback (Optional) function to call when response arrived.
	*
	**/
	SRP.Account.prototype.send = function(callback, url)
	{
		url = url || "./SRP/createAccount";

		var message = 
		{
			I: this.I.toString().substring(2),
			s: this.s.toString().substring(2),
			v: this.v.toString().substring(2)
		}

		if(callback && typeof callback == "function")
		{
			SRP.send(url, message, callback.bind(window, this));
		}
		else
		{
			SRP.send(url, message);	
		}
	}

	/**
	*	Starts the Secure Remote Password Protocoll handshake and calls callback when progress was made and the next step can begin, callBackError when something went wrong.
	*	
	*	@param username The users username
	*	@param password The users password
	*	@param callback (Optional) function to be called when progress is made
	*	@param callbackError (Optional) function to be called when something went wrong
	*
	*	Possible Messages passed to callback are:
	*		"A generated": Client random A has been generated, call sendA to continue.
	*		"Need entropy": Some mouse movement is required to create entropy.
	*		"Password required": Server has sent his random B, call setPassword to continue.
	*		"Shared state calculated": Both sides now the shared secret, call sendM1 to continue.
	*		"Authentification successfull": The Authentification was succesfull, you may use the shared secret K for any further encryptions.
	*
	**/

	SRP.Client = function (username, callback, callbackError)
	{
		username = username.toString();

		this.I = sjcl.bn.fromBits(sjcl.hash.sha256.hash(username));

		this.callback = callback;
		this.callbackError = callbackError;

		this.createA();
	}

	/**
	*	__FOR INTERNAL USE ONLY__ Calls the callback if present with a message.
	*
	*	@param message The message to be passed to the callback.
	*
	**/

	SRP.Client.prototype.callCallback = function(message)
	{
		if(this.callback && typeof this.callback == "function"){
			this.callback.call(window, this, message);
		}
	}

	/**
	*	__FOR INTERNAL USE ONLY__ Creates random A.
	*
	**/
	SRP.Client.prototype.createA = function()
	{
		this.state = "creating_random_a";

		if(this.listener)
		{
			sjcl.random.removeEventListener("seeded", this.listener);
			this.listener = false;
			sjcl.stopCollectors();
		}

		try 
		{
			var length = SRP.N.toBits().length;
			this.a = SRP.N.add(1);
			while(!SRP.N.greaterEquals(this.a))
			{
				this.a = sjcl.bn.fromBits(sjcl.random.randomWords(length-1));
			}
			this.A = SRP.g.powermod(this.a, SRP.N);

			this.state = "A_set",

			this.callCallback("A generated");
		}
		catch (e)
		{
			console.log(e.stack);
			this.listener = this.createA.bind(this);
			sjcl.random.addEventListener("seeded", this.listener);
			sjcl.startCollectors();
			this.callCallback("Need entropy");
		}
	}

	/**
	*	Sends the randomly created A and registers a completion handler. Should only be called once.
	*
	*	@param url (Optional) the url to send to, defaults to "./SRP/loginU
	*
	**/
	SRP.Client.prototype.sendA = function(url)
	{
		url = url || "./SRP/loginU";

		if(this.state != "A_set")
			return;

		this.state = "sending_A";
		var message = 
		{
			I: this.I.toString().substring(2),
			A: this.A.toString().substring(2)
		}

		SRP.send(url, message, this.receiveB.bind(this));
	}

	/**
	*	__FOR INTERNAL USE ONLY__ Processes the response of sendA, requests a password if successfull, calls callbackError otherwise
	*
	*	@param respone the response of sendA
	*
	**/
	SRP.Client.prototype.receiveB = function(response)			
	{
		if(this.state != "sending_A")
			return;

		if(response.error)
		{
			this.state = "no_connection";
			this.fireError("Could not connect to server");
		}
		else if(response.success && response.s && response.B)
		{
			this.state = "need_password";

			this.s = new sjcl.bn("0x"+response.s);
			this.B = new sjcl.bn("0x"+response.B);

			if(this.B.mod(SRP.N).equals(new sjcl.bn(0)))
			{
				this.state = "failed";
				this.fireError("Server error");
				return;
			}

			this.callCallback("Password required");
		}
		else
		{
			this.state = "failed";
			this.fireError("Could not login");
		}	
	}

	/**
	*	Computes the shared secret, the password is NOT stored. Should only be called once.
	*
	*	@param password the users password (not stored internally)
	*
	**/
	SRP.Client.prototype.setPassword = function(password)
	{
		if(this.state != "need_password")
			return;

		var x = sjcl.bn.fromBits(sjcl.misc.pbkdf2(password, this.s.toBits()));

		var u = sjcl.bn.fromBits(
					sjcl.hash.sha256.hash(
						this.A.toString().substring(2) + this.B.toString().substring(2)
					)
				).mod(SRP.N);

		if(u.equals(new sjcl.bn(0)))
		{
			this.state = "failed";
			this.fireError("Server error");
			return;
		}

		// (B-kg^x)^(a+ux)
		var S = this.B.sub(
					SRP.k.mul(
						SRP.g.powermod(
							x,
							SRP.N
						)
					)
				).powermod(
					this.a.add(
						u.mul(
							x
						)
					),
					SRP.N
				);

		this.K = sjcl.bn.fromBits(sjcl.hash.sha256.hash(S.toString().substring(2)));

		this.M1 = sjcl.bn.fromBits(sjcl.hash.sha256.hash(
					sjcl.bn.fromBits(sjcl.hash.sha256.hash(SRP.N.toString().substring(2))).toString().substring(2) +
					sjcl.bn.fromBits(sjcl.hash.sha256.hash(SRP.g.toString().substring(2))).toString().substring(2) +
					sjcl.bn.fromBits(sjcl.hash.sha256.hash(this.I.toString().substring(2))).toString().substring(2) +
					this.s.toString().substring(2) +
					this.A.toString().substring(2) + 
					this.B.toString().substring(2) + 
					this.K.toString().substring(2)
				));
		this.M2 = sjcl.bn.fromBits(sjcl.hash.sha256.hash(
					this.s.toString().substring(2) +
					this.A.toString().substring(2) +
					this.M1.toString().substring(2) +
					this.K.toString().substring(2) +
					this.B.toString().substring(2)
				));

		this.state = "shared_secret_calculated";

		this.callCallback("Shared state calculated");
	}


	/**
	*	Sends the computed M1 to the server, starting the actual authentification handshake. Should only be called once.
	*
	*	@param url (Optional) the url to send to, defaults to "./SRP/loginP
	*
	**/
	SRP.Client.prototype.sendM1 = function(url)
	{
		url = url || "./SRP/loginP";

		if(this.state != "shared_secret_calculated")
			return;

		this.state = "sending_M1";
		var message = 
		{
			I: this.I.toString().substring(2),
			M1: this.M1.toString().substring(2)
		}

		SRP.send(url, message, this.checkM2.bind(this));
	}

	/**
	*	__FOR INTERNAL USE ONLY__ Processes the response of sendM1, compares M2 if sucesfull and calls callbackComplete, calls callbackError otherwise
	*
	*	@param respone the response of sendM1
	*
	**/
	SRP.Client.prototype.checkM2 = function(response)
	{
		if(this.state != "sending_M1")
			return;

		if(response.error)
		{
			this.state = "no_connection";
			this.fireError("Could not connect to server");
		}
		else if(response.success && response.M2)
		{
			if(this.M2.toString() == "0x"+response.M2)
			{
				this.state = "authenticated";

				this.callCallback("Authentification successfull");
			}
			else
			{
				this.state = "server_error";
				this.fireError("Server error");
			}
		}
		else
		{
			this.state = "failed";
			this.fireError("Could not login");
		}
	}

	/**
	*	__FOR INTERNAL USE ONLY__ Calls callbackError if present with a message
	*
	*	@param message the error message
	*
	**/
	SRP.Client.prototype.fireError = function(message)
	{
		if(this.callbackError && typeof this.callbackError == "function")
		{
			this.callbackError.call(window, this, message);
		}
	}

	return SRP;
});