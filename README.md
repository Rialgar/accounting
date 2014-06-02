A simple Zero Knowledge accounting tool, basically only login and client side encrypted tables at this moment.

Badly done, libraries included instead of package information.

Discontinued

To start the server, have node.js, navigate to ./server and run

	node accounting.js

Per default, it uses port 5723 on localhost, can be set in lines 299 and 300 in ./server/accounting.js

To Create an account, delete or comment out ./server/SRP.js line 46, start the server, load the page and enter something like this into your browsers console:

	var ac = new SRP.Account("foo", "bar", function(){console.log(arguments)});
	//log: [SRP.Account]
	ac.send(function(){console.log(arguments)});
	//log: [SRP.Account, {success: true}]