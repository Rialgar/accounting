var http = require("http"),
    fileSystem = require("fs"),
    path = require("path"),
    colors = require('colors'),
    util = require('util'),
    SRP = require("./SRP");

var types = {
	XHTML: "application/xhtml+xml; charset=utf-8",
	JS: "application/javascript; charset=utf-8",
	CSS: "text/css; charset=utf-8",
	EOT: "application/vnd.ms-fontobject",
	SVG: "image/svg+xml",
	TTF: "application/octet-stream",
	WOFF: "application/x-font-woff" 
};

var ex = fileSystem.existsSync("./data");
if(!ex){
	var error = fileSystem.mkdirSync("./data");
	if(error){
		util.log("Could not create ./data".red);
		return;
	}
	delete error;
} else {
	var stats = fileSystem.statSync("./data");
	if(!stats.isDirectory()){
		util.log("There is ./data, but it is not a directory".red);
		return;
	}
	delete stats;
}
delete ex;

var save = function(prefix, file, contents, callback)
{
	if(typeof callback != "function"){
		callback = function(){};
	}
	var folder = path.join(__dirname, "./"+prefix);
	var filePath = path.join(__dirname, "./"+prefix+file);
	util.log("saving file: ".cyan + filePath);

	fileSystem.exists(folder, function(exists){
		if(!exists){
			var error = fileSystem.mkdirSync(folder);
			if(error){
				util.log("Could not create userdir: ".red + folder);
				callback(false);
			}
		}
		fileSystem.stat(folder, function(error, stat){
			if(!error && stat.isDirectory()){
				fileSystem.writeFile(filePath, contents, function(error){
					if(!error){
						callback(true);
					}else{
						util.log("Could not write file: ".red + filePath + "  ");
						callback(false);
					}
				});
			} else {
				util.log("Could not access userdir: ".red + folder);
				callback(false);
			}
		});
	});
}

var serve = function(prefix, file, type, response)
{
	var filePath = path.join(__dirname, "./"+prefix+file);

	util.log("serving file: ".green + filePath);

	fileSystem.stat(filePath, function(error, stat)
	{
		if(!error)
		{
			response.writeHead(200,
			{
		        "Content-Type": type,
		        "Content-Length": stat.size
		    });

		    var readStream = fileSystem.createReadStream(filePath);

			readStream.pipe(response);
		}
		else
		{
			response.writeHead(404,
			{
				"Content-Type": "text/plain; charset=utf-8",
				"Content-Length": 0
			});
			response.end();
		}
	});
}

var serveFile = function(requestedFile, response, prefix)
{
	var array = requestedFile.split("/");
	var fileName = array[array.length-1];
	var ending;
	if(fileName != "" && fileName.indexOf(".") >= 0)
	{
		var temp = ending = fileName.split(".");
		ending = temp[temp.length-1].toUpperCase();
	}
	else
	{
		ending = "XHTML";
		fileName = "index.xhtml";
		requestedFile = "/index.xhtml";
	}

	prefix = typeof prefix == "string" ? prefix : "/"+ending;

	serve(".."+prefix, requestedFile, types[ending], response);
}

var readMessage = function(request, callback){
	var body = "";
    request.on("data", function (data) {
        body += data;
    });
    request.on("end", function () {

    	try
    	{
            var message = JSON.parse(body);
            message.remoteAddress = request.connection.remoteAddress;

            callback(message);
    	}
    	catch(e)
    	{
    		util.log(e.stack.toString().red);
    		response.writeHead(500, {
	        	"Content-Type": "text/plain; charset=utf-8",
	        	"Content-Length": 0
	    	});
	    	response.end();
    	}

    });
}

var handler = function (request, response) {
	var requestedFile = request.url.split("?")[0];
	if(requestedFile.indexOf("..") >= 0)
	{
		requestedFile = "/";
	}
	var array = requestedFile.split("/");
	if(array.length <= 2)
	{
		serveFile(requestedFile, response);
	}
	else if(array[1] == "libs")
	{
		serveFile(requestedFile, response, "");	
	}
	else if(array[1] == "SRP")
	{
		if(SRP[array[2]])
		{
			readMessage(request, function(message){
				try{
		            var result = SRP[array[2]](message);

		            var responseText = JSON.stringify(result);

		            response.writeHead(200, {
			        	"Content-Type": "application/json",
			        	"Content-Length": responseText.length
			    	});

			    	response.end(responseText);
		    	}
		    	catch(e)
		    	{
		    		util.log(e.stack.toString().red);
		    		response.writeHead(500, {
			        	"Content-Type": "text/plain; charset=utf-8",
			        	"Content-Length": 0
			    	});
			    	response.end();
		    	}

	        });
    	}
	}
	else if(array[1] == "getFile")
	{
		readMessage(request, function(message){
			try{
	            if(SRP.hasSession(message.I, message.M1, message.M2, message.remoteAddress))
	            {
	            	serve("data/"+message.I, "/"+array[2], "text/plain; charset=utf-8", response);
				}
				else
				{
					response.writeHead(403, {
			        	"Content-Type": "text/plain; charset=utf-8",
			        	"Content-Length": 0
			    	});

			    	response.end();
				}
	    	}
	    	catch(e)
	    	{
	    		util.log(e.stack.toString().red);
	    		response.writeHead(500, {
		        	"Content-Type": "text/plain; charset=utf-8",
		        	"Content-Length": 0
		    	});
		    	response.end();
	    	}
        });
	}
	else if(array[1] == "saveFiles")
	{
		readMessage(request, function(message){
			try{
	            if(SRP.hasSession(message.I, message.M1, message.M2, message.remoteAddress))
	            {
	            	var success = true;
	            	var done = 0;
	            	if(!(message.contents.length > 0)){
	            		var result = {success: true};
			            var responseText = JSON.stringify(result);
			            response.writeHead(200, {
				        	"Content-Type": "application/json",
				        	"Content-Length": responseText.length
				    	});
				    	response.end(responseText);
				    	return;
	            	}
	            	for (var i = 0; i < message.contents.length; i++) {
	            		save("data/"+message.I, "/"+message.contents[i].n, message.contents[i].c, function(saved){
	            			done++;
	            			success &= saved;
	            			if(done == message.contents.length){
			            		if (success) {
			            			var result = {success: true};
						            var responseText = JSON.stringify(result);
						            response.writeHead(200, {
							        	"Content-Type": "application/json",
							        	"Content-Length": responseText.length
							    	});
							    	response.end(responseText);
			            		} else {
			            			response.writeHead(500, {
							        	"Content-Type": "text/plain; charset=utf-8",
							        	"Content-Length": 0
							    	});
							    	response.end();			
			            		}
		            		}
		            	});
	            	}	            	
				}
				else
				{
					response.writeHead(403, {
			        	"Content-Type": "text/plain; charset=utf-8",
			        	"Content-Length": 0
			    	});
			    	response.end();
				}
	    	}
	    	catch(e)
	    	{
	    		util.log(e.stack.toString().red);
	    		response.writeHead(500, {
		        	"Content-Type": "text/plain; charset=utf-8",
		        	"Content-Length": 0
		    	});
		    	response.end();
	    	}
        });
	}
	else
	{
		response.writeHead(404,
		{
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Length": 0
		});
		response.end();
	}
};

var port = 5723;
var host = "127.0.0.1";

http.createServer(handler).listen(port, host);
util.log("Accounting".cyan + " http://"+host+":"+port);