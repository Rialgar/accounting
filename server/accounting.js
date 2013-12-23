var http = require("http"),
    fileSystem = require("fs"),
    path = require("path"),
    colors = require('colors'),
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

var serve = function(prefix, file, type, response)
{
	var filePath = path.join(__dirname, ".."+prefix+file);

	console.log("serving file: ".green + filePath);

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

	serve(prefix, requestedFile, types[ending], response);
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
			var body = "";
	        request.on("data", function (data) {
	            body += data;
	        });
	        request.on("end", function () {

	        	try
	        	{
		            var message = JSON.parse(body);

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
		    		console.error(e.stack);
		    		response.writeHead(505, {
			        	"Content-Type": "application/json",
			        	"Content-Length": 0
			    	});
			    	response.end();
		    	}

	        });
    	}
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
console.log("Accounting".cyan + " http://"+host+":"+port);