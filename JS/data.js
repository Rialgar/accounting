define(["sjcl"], function(){
	var Data = {};

	var chunks = [];

	var index = {
		version: 1,
		maxId: -1,
		names: [],
		categories: [],
		categoriesPerName: [],
		chunks: []
	};

	function getChunkSize(version){
		if(version == 1){
			return 10000;
		} else {
			alert("Something is wrong, please reload");
			throw new Error("Something is wrong, please reload");
		}
	};

	function getFields(version){ //unused until now, might be usefull for backwards compatibility later
		if(version == 1){
			return ["date", "name", "price"]
		} else {
			alert("something is wrong, please reload");
			throw new Error("Something is wrong, please reload");
		}	
	};

	function getEntrySize(version){
		if(version == 1)
		{
			return {
				date: 2, //date.valueOf()/(1000*60*60*24) as binaryString
				name: 2, //Integer id as binary String
				price: 3, //Price times 100 + 8,388,608 as binary String
				field: 7, //Sum of the above (fields might be added)
			};
		} else {
			alert("something is wrong, please reload");
			throw new Error("Something is wrong, please reload");
		}
	}

	function getIndexSize(version){
		if(version == 1)
		{
			return {
				maxId: 4,
				perCategory: 2,
				chunk: {
					version: 2,
					iv: 24,
					minDate: 2,
					maxDate: 2,
					minPrice: 3,
					maxPrice: 3,
					perName: 2
				}
			}
		} else {
			alert("something is wrong, please reload");
			throw new Error("Something is wrong, please reload");
		}	
	}

	var fileVersion = 1;
	
	function numberToString(number, bits){
		var n = Math.floor(number);
		var out = "";
		for(var i=0; i < bits; i++){
			var bit = n%256;
			n = Math.floor(n/256);
			out = String.fromCharCode(bit) + out;
		}
		return out;
	}

	function stringToNumber(string){
		var n = 0;
		for (var i = 0; i < string.length; i++) {
			n *= 256;
			n += string.charCodeAt(i);
		};
		return n;
	}

	var millisecondsPerDay = 1000*60*60*24;

	function dateToString(date){
		var num = Math.floor(date.valueOf()/millisecondsPerDay);
		
		return numberToString(num, getEntrySize(fileVersion).date);
	}

	function stringToDate(dateString)
	{
		var num = stringToNumber(dateString);

		var date = new Date(num*millisecondsPerDay);

		return date;
	}

	function dataToString(data){
		var entrySize = getEntrySize(fileVersion);
		var out = dateToString(data.date);

		var name = data.name;
		out += numberToString(name+1, getEntrySize(fileVersion).name);

		var price = data.price*100;
		out += numberToString(price+8388608, getEntrySize(fileVersion).price);

		return out;
	}

	function stringToData(string, version){
		version = version || fileVersion;
		var entrySize = getEntrySize(version);

		var p = 0;
		var dateString = string.substr(p, entrySize.date);
		p += entrySize.date;
		var nameString = string.substr(p, entrySize.name);
		p += entrySize.name;
		var priceString = string.substr(p, entrySize.price);

		var date = stringToDate(dateString);
		return {
			date: date,
			name: stringToNumber(nameString)-1,
			price: (stringToNumber(priceString)-8388608)/100,
		}
	}

	var srpClient = false;
	var fileKey = false;

	function getFile(filename, callback){
		if(!srpClient || srpClient.state != "authenticated"){
			console.log("Tried to get a File while not logged in, aborting.")
			return;
		}

		var xhr = new XMLHttpRequest();

		xhr.onreadystatechange = function()
		{
			if(xhr.readyState == 4 && callback && typeof callback == "function")
			{
				var response;
				if(xhr.status >= 200 && xhr.status < 300)
				{
					response = {contents: xhr.responseText};
				}
				else
				{
					response = {error: xhr.status}
				}
				callback.call(window, response);
			}
		}

		var url = "./getFile/"+filename;
		var message = {
			I: srpClient.I.toString().substring(2),
			M1: srpClient.M1.toString().substring(2),
			M2: srpClient.M2.toString().substring(2)
		}

		xhr.open("POST", url, true);
		xhr.send(JSON.stringify(message));
	}

	function saveFile(filename, contents, callback){
		if(!srpClient || srpClient.state != "authenticated"){
			console.log("Tried to save a File while not logged in, aborting.")
			return;
		}
		
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

		var url = "./saveFile/"+filename;
		var message = {
			I: srpClient.I.toString().substring(2),
			M1: srpClient.M1.toString().substring(2),
			M2: srpClient.M2.toString().substring(2),
			contents: contents
		}

		xhr.open("POST", url, true);
		xhr.send(JSON.stringify(message));
	}

	function pad(string, length){
		if(string.length < length){
			var character = string[string.length-1] || "0";
			return (new Array(length-string.length+1).join(character) + string);
		}
		return string;
	}

	function getFileName(fileName, iv){
		iv = iv || "vQAy6yxxMVTIrf+z/95Waw==";
		console.log(fileName);
		fileName = pad(fileName, 17);
		var out = JSON.parse(sjcl.encrypt(fileKey.toBits(), fileName, {"iv":iv})).ct;
		out = out.replace(/\//g, "-");
		console.log(fileName);
		console.log(out);
		return out;
	}

	var indexChanged = false;
	
	function storeIndex(callback){
		if(indexChanged)
		{
			console.log("storing index");
			console.assert(index.version == fileVersion);

			var str = "";

			var sizes = getIndexSize(index.version);

			str += numberToString(index.version,2);
			str += numberToString(index.maxId, sizes.maxId);
			str += JSON.stringify(index.names);
			str += JSON.stringify(index.categories);

			for (var i = 0; i < index.categoriesPerName.length; i++) {
				str += numberToString(index.categoriesPerName[i]+1, sizes.perCategory);
			};

			for (var i = 0; i < index.chunks.length; i++) {
				var chunk = index.chunks[i];

				str += numberToString(chunk.version, sizes.chunk.version);
				console.assert(sizes.chunk.iv == chunk.iv.length);
				str += chunk.iv;
				str += dateToString(chunk.dateRange.min);
				str += dateToString(chunk.dateRange.max);
				str += numberToString(chunk.priceRange.min*100+8388608, sizes.chunk.minPrice);
				str += numberToString(chunk.priceRange.max*100+8388608, sizes.chunk.maxPrice);

				for(var name in chunk.names){
					if(chunk.names.hasOwnProperty(name)){
						str += numberToString(name+2, sizes.chunk.perName);
					}
				}

				str += numberToString(0, sizes.chunk.perName);
			};

			var fileName = getFileName("index");
			var contents = sjcl.encrypt(fileKey.toBits(), str);
			saveFile(fileName, contents, function(response){
				if(!response.error && response.success){
					indexChanged = false;
				} else {
					console.log("Error when saving index", response);
				}
				callback();
			});
		} else {
			callback();
		}
	}

	function loadIndex(callback){
		var fileName = getFileName("index");

		getFile(fileName, function(result){

			var str = "";
			if(!result.error){
				str = result.contents;
			}
			if(str == ""){
				callback();
				return;
			} else {
				str = sjcl.decrypt(fileKey.toBits(), str);
			}

			var position = 0;

			index = {};

			index.version = stringToNumber(str.substr(position,2));
			position += 2;
			var sizes = getIndexSize(index.version);

			index.maxId = stringToNumber(str.substr(position,sizes.maxId));
			position += sizes.maxId;
			
			var pos2 = position;
			while (str[pos2] != "]"){
				pos2++;
			}
			pos2++;
			index.names = JSON.parse(str.substring(position,pos2));
			position = pos2;

			while (str[pos2] != "]"){
				pos2++;
			}
			pos2++;
			index.categories = JSON.parse(str.substring(position,pos2));
			position = pos2;

			index.categoriesPerName = [];
			for (var i = index.names.length - 1; i >= 0; i--) {
				index.categoriesPerName.push(stringToNumber(str.substr(position, sizes.perCategory))-1);
				position += sizes.perCategory;
			};

			index.chunks = [];
			while(position < str.length){
				var chunk = {};
				index.chunks.push(chunk);

				chunk.version = stringToNumber(str.substr(position, sizes.chunk.version));
				position += sizes.chunk.version;

				chunk.iv = str.substr(position, sizes.chunk.iv);
				position += sizes.chunk.iv;

				chunk.dateRange = {};
				chunk.dateRange.min = stringToDate(str.substr(position, sizes.chunk.minDate));
				position += sizes.chunk.minDate;
				chunk.dateRange.max = stringToDate(str.substr(position, sizes.chunk.maxDate));
				position += sizes.chunk.maxDate;

				chunk.priceRange = {};
				chunk.priceRange.min = (stringToNumber(str.substr(position, sizes.chunk.minPrice))-8388608)/100;
				position += sizes.chunk.minPrice;
				chunk.priceRange.max = (stringToNumber(str.substr(position, sizes.chunk.maxPrice))-8388608)/100;
				position += sizes.chunk.maxPrice;

				chunk.names = [];
				do{
					var name = stringToNumber(str.substr(position, sizes.chunk.perName));
					chunk.names.push(name-2);
					position += sizes.chunk.perName;
				}while(name != 0)
				chunk.names.pop();
			};		
			callback();
		});
	}

	var changedChunks = {};

	function storeChunk(id, callback){
		if(changedChunks[id]){
			console.log("storing chunk " + id);
			var chunk = chunks[id];
			var chunkSize = getChunkSize(fileVersion);
			var entrySize = getEntrySize(fileVersion);

			var str = "";

			for(var i = 0; i<chunk.length; i++){
				str += dataToString(chunk[i]);
			}

			if(chunk.length < chunkSize){
				str += new Array(entrySize.field+1).join(String.fromCharCode(0));

				for(var i = chunk.length+1; i < chunkSize; i++){
					for(var j = 0; j < entrySize.field; j++){
						str += String.fromCharCode(Math.floor(Math.random()*256));
					}
				}
			}

			var fileName = getFileName("chunk"+id, index.chunks[id].iv);
			var contents = sjcl.encrypt(fileKey.toBits(), str);
			saveFile(fileName, contents, function(response){
				if(!response.error && response.success){
					delete changedChunks[id];
				} else {
					console.log("Error when saving chunk " + id, response);
				}
				callback();
			});
		} else {
			callback();
		}
	}
	
	function storeChunks(callback){
		var todo = 0;
		for(var i in changedChunks){
			if(changedChunks.hasOwnProperty(i) && changedChunks[i]){
				todo++;
			}
		}

		if(todo == 0){
			callback();
		} else {
			for(var i in changedChunks){
				if(changedChunks.hasOwnProperty(i) && changedChunks[i]){
					storeChunk(i, function(){
						todo--;
						if(todo == 0){
							callback();
						}
					});
				}
			}
		}
	}

	function isAllZeros(string){
		for (var i = 0; i < string.length; i++) {
			if(string.charCodeAt(i) != 0){
				return false;
			}
		}
		return true;
	}

	function loadChunk(id, version, callback){
		var fileName = getFileName("chunk"+id, index.chunks[id].iv);

		getFile(fileName, function(result){

			var str = "";
			if(!result.error){
				str = result.contents;
			}
			if(str == ""){
				callback();
				return;
			} else {
				str = sjcl.decrypt(fileKey.toBits(), str);
			}
			var entrySize = getEntrySize(version);
			var chunkSize = getChunkSize(version);

			var chunk = [];

			var index = 0;

			while(index < chunkSize*entrySize.field)
			{
				var entry = str.substr(index, entrySize.field);
				if(isAllZeros(entry)){
					break;
				}else{
					chunk.push(stringToData(entry));
				}
				index += entrySize.field;
			}
			chunks[id] = chunk;
			callback();
		});
	}

	function rebuildDateIndex(id){
		var chunk = chunks[id];
		var chIndex = index.chunks[id];

		chIndex.dateRange = {
			min: false,
			max: false
		}

		chunk.forEach(function(ea){
			if(!chIndex.dateRange.min || chIndex.dateRange.min > ea.date){
				chIndex.dateRange.min = ea.date;
			}
			if(!chIndex.dateRange.max || chIndex.dateRange.max < ea.date){
				chIndex.dateRange.max = ea.date;
			}
		});
		indexChanged = true;
	}

	function rebuildNameIndex(id){
		var chunk = chunks[id];
		var chIndex = index.chunks[id];

		chIndex.names = {};

		chunk.forEach(function(ea){
			chIndex.names[ea.name] = true;
		});
		indexChanged = true;
	}

	function rebuildPriceIndex(id){
		var chunk = chunks[id];
		var chIndex = index.chunks[id];

		chIndex.priceRange = {
			min: false,
			max: false
		}

		chunk.forEach(function(ea){
			if(!chIndex.priceRange.min || chIndex.priceRange.min > ea.price){
				chIndex.priceRange.min = ea.price;
			}
			if(!chIndex.priceRange.max || chIndex.priceRange.max < ea.price){
				chIndex.priceRange.max = ea.price;
			}
		});
		indexChanged = true;
	}

	function internalizeData(extData){
		var nameId = index.names.indexOf(extData.name);
		if(nameId == -1 && extData.name != ""){
			nameId = index.names.push(extData.name)-1;
			index.categoriesPerName.push(-1);
			indexChanged = true;
		}

		var date = extData.date;
		date.setHours(1);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);

		return {
			date: date,
			name: nameId,
			price: extData.price
		}
	}

	function externalizeData(data){
		return {
			date: data.date,
			name: data.name < 0 ? "" : index.names[data.name],
			price: data.price
		}
	}

	Data.storeData = function(id, data){
		var chunkSize = getChunkSize(fileVersion);

		if(id > index.maxId){
			if(id != index.maxId+1){
				return false;
			}
			index.maxId = id;
			indexChanged = true;
		}
		data = internalizeData(data);

		var i = (id - id%chunkSize)/chunkSize;

		var prev = false;
		if(!chunks[i]){
			//TODO check if the chunk can be loaded (does this happen?)
			chunks[i] = [];
			index.chunks[i] = {
				dateRange: {min: new Date(data.date), max: new Date(data.date)},
				names: {},
				priceRange: {min: data.price, max: data.price},
				version: fileVersion,
				iv: sjcl.codec.base64.fromBits(sjcl.random.randomWords(4))
			};
			indexChanged = true;
		}else{
			prev = chunks[i][id-i*chunkSize];

			if(!prev){
				if(index.chunks[i].dateRange.min > data.date){
					index.chunks[i].dateRange.min = new Date(data.date);
				} else if(index.chunks[i].dateRange.max < data.date){
					index.chunks[i].dateRange.max = new Date(data.date);
				}

				if(index.chunks[i].priceRange.min > data.price){
					index.chunks[i].priceRange.min = data.price;
				} else if(index.chunks[i].priceRange.max < data.price){
					index.chunks[i].priceRange.max = data.price;
				}
			}
		}

		index.chunks[i].names[data.name] = true;

		chunks[i][id-i*chunkSize] = data

		if(prev){
			if(prev.date != data.date){
				rebuildDateIndex(i);
			}
			if(prev.name != data.name){
				rebuildNameIndex(i);
			}
			if(prev.price != data.price){
				rebuildPriceIndex(i);
			}
		}

		changedChunks[i] = true;
	}

	Data.getCategoryForName = function(name){
		var id = index.names.indexOf(name);
		if(id >= 0){
			var catId = index.categoriesPerName[id];
			return catId < 0 ? "" : index.categories[catId];
		}
		return "";
	}

	Data.setCategoryForName = function(name, category){
		var id = index.names.indexOf(name);
		if(id >= 0){
			var prevCatId = index.categoriesPerName[id];
			var catId = -1;
			if(category != ""){
				var catId = index.categories.indexOf(category);
				if(catId < 0){
					catId = index.categories.push(category)-1;
				}
			}
			index.categoriesPerName[id] = catId;
			indexChanged = (prevCatId != catId);
		}
	}

	Data.retrieveData = function(filters, callback){
		//TODO respect filters
		if(index.chunks.length == 0){
			callback({});
		} else {
			var out = {};
			var done = 0;
			for (var i = 0; i < index.chunks.length; i++) {
				if(!chunks[i]){
					loadChunk(i, index.chunks[i].version || fileVersion, function(){
						done++;
						if(done == index.chunks.length){
							for (var i = 0; i < chunks.length; i++) {
								for (var j = 0; j < chunks[i].length; j++) {
									out[i*getChunkSize(fileVersion)+j] = externalizeData(chunks[i][j]);
								}
							}
							callback(out);
						}
					});
				}
			}
		}
	}

	Data.__defineGetter__("maxId", function(){
		return index.maxId;
	})

	Data.initialize = function(aSrpClient, aFileKey, callback){
		srpClient = aSrpClient;
		fileKey = aFileKey;
		loadIndex(callback);
	}

	Data.storeChanges = function(){
		storeChunks(function(){
			storeIndex(function(){});
		});
	}

	Data.debug = {};
	Data.debug.__defineGetter__("index", function(){
		return index;
	});
	Data.debug.__defineGetter__("chunks", function(){
		return chunks;
	});
	Data.debug.getFileName = getFileName;

	return Data;

});