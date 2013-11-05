var fs = require("fs"),
	path = require("path"),
	crypto = require("crypto"),
	sjcl = require("./sjcl.js");

//load accounts
var accountFileName = path.join(__dirname, "./srp_accounts.json");
if(!fs.existsSync(accountFileName))
{
	fs.writeFileSync(accountFileName, "{}");
}
var accounts = JSON.parse(fs.readFileSync(accountFileName, {encoding: "utf8"}));
var sessions = {};

//seed sjcl random generator, as creating sjcl.bn from it is easier
//capsuled to not polute the namespace
(function(){
	var data = crypto.randomBytes(1024);
	for (var i = 0; i < data.length; i++) {
		sjcl.random.addEntropy(data[i], 8, "crypto.randomBytes");
	};
})();

SRP = {};

//these need to be the same on the client and are not to be changed after account creation
SRP.g = new sjcl.bn("0xda79878e03210039d1186cee28d294dfda8fd959fd50515a08b572c9711298319041c09a28d24a5d20f837f67adf7fea0ab1162a22a4dcefc8fc94a087be575d");

SRP.N = new sjcl.bn("0x1b4f30f1c06420073a230d9dc51a529bfb51fb2b3faa0a2b4116ae592e22530632083813451a494ba41f06fecf5beffd415622c544549b9df91f929410f7caebb");

SRP.k = new sjcl.bn(1); 

/**
*	Creates a new account, if the ID is still available
*
*	@param message.I the users Identifier, to be derived from the username.
*	@param message.s the salt, should be random
*	@param message.v the users password-verifier
*
**/

SRP.createAccount = function(message)
{
	if(!message.I || !message.s || !message.v)
	{
		return {success: false};
	}

	var I = message.I;
	
	if(accounts[I])
		return {success: false, nameUsed: true};

	var s = message.s;
	var v = message.v;

	try {
		new sjcl.bn("0x" + I);
		new sjcl.bn("0x" + s);
		new sjcl.bn("0x" + v);
	}
	catch(e)
	{
		return {success: false};
	}

	accounts[I] =
	{
		s: s,
		v: v
	};

	console.log("created account " + I);

	fs.writeFileSync(accountFileName, JSON.stringify(accounts));

	return {success: true};
}

/**
*	Checks if the users ID exists and starts SRP authentification if so.
*
*	@param message.I the users Identifier, to be derived from the username.
*	@param message.A the users randomly created A
*
**/

SRP.loginU = function(message)
{
	if(!message.I || !message.A)
	{
		return {success: false};
	}

	var I = message.I;
	var A = message.A;

	if(!accounts[I])
		return {success: false};	

	try {
		sessions[I] = {
			state: "A_received",
			I: new sjcl.bn("0x" + I),
			A: new sjcl.bn("0x" + A),
			v: new sjcl.bn("0x" + accounts[I].v)
		}
	}
	catch(e)
	{
		delete session[I];
		return {success: false};
	}

	if(sessions[I].A.mod(SRP.N).equals(new sjcl.bn(0)))
	{
		delete session[I];
		return {success: false};
	}

	var length = SRP.N.toBits().length;
	var b = SRP.N.add(1);
	while(!SRP.N.greaterEquals(b))
	{
		b = sjcl.bn.fromBits(sjcl.random.randomWords(length-1));
	}
	sessions[I].B = SRP.k.mul(sessions[I].v).addM(
		SRP.g.powermod(b, SRP.N),
		SRP.N
	)

	var u = sjcl.bn.fromBits(
				sjcl.hash.sha256.hash(
					sessions[I].A.toString().substring(2) + sessions[I].B.toString().substring(2)
				)
			).mod(SRP.N);

	// (Av^u)^b

	var S = sessions[I].A.mul(
				sessions[I].v.powermod(
					u,
					SRP.N
				)
			).powermod(b, SRP.N);

	sessions[I].K = sjcl.bn.fromBits(sjcl.hash.sha256.hash(S.toString().substring(2)));

	sessions[I].M1 = sjcl.bn.fromBits(sjcl.hash.sha256.hash(
				sjcl.bn.fromBits(sjcl.hash.sha256.hash(SRP.N.toString().substring(2))).toString().substring(2) +
				sjcl.bn.fromBits(sjcl.hash.sha256.hash(SRP.g.toString().substring(2))).toString().substring(2) +
				sjcl.bn.fromBits(sjcl.hash.sha256.hash(I)).toString().substring(2) +
				accounts[I].s +
				sessions[I].A.toString().substring(2) + 
				sessions[I].B.toString().substring(2) + 
				sessions[I].K.toString().substring(2)
			));
	sessions[I].M2 = sjcl.bn.fromBits(sjcl.hash.sha256.hash(
				accounts[I].s +
				sessions[I].A.toString().substring(2) +
				sessions[I].M1.toString().substring(2) +
				sessions[I].K.toString().substring(2) +
				sessions[I].B.toString().substring(2)
			));

	sessions[I].state = "secret_generated"

	delete S;
	delete u;
	delete b;

	return {
		success: true,
		s: accounts[I].s,
		B: sessions[I].B.toString().substring(2)
	}
}

/**
*	Compares the users calculated proof with ours, sends our proof if succesfull.
*
*	@param message.I the users Identifier, to be derived from the username.
*	@param message.M1 the users proof of identity/conformity
*
**/

SRP.loginP = function(message)
{
	if(!message.I || !message.M1)
	{
		return {success: false};
	}

	var I = message.I;

	if(	sessions[I] &&
		sessions[I].state == "secret_generated" &&
		sessions[I].M1.toString() == "0x"+message.M1)
	{
		sessions[I].sate = "authenticated";
		return {
			success: true,
			M2: sessions[I].M2.toString().substring(2)
		}
	}

	else
	{
		delete sessions[I];
		return {success: false};
	}
}

module.exports = SRP;