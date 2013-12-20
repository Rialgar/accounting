"use strict"

define(function(){

	var Data = {};

	var chunks = [];

	var index = {
		version: 1,
		maxId: -1,
		names: [],
		categories: [],
		chunks: []
	};

	function getChunkSize(version){
		if(version == 1){
			return 500;
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
				price: 3, //Price times 100 as binary String
				category: 2, //Integer id as binary String
				field: 9, //Sum of the above (fields might be added)
			};
		} else {
			alert("something is wrong, please reload");
			throw new Error("Something is wrong, please reload");
		}
	}

	var fileVersion = 1;

	function pad(number, width, padString) {
		padString = padString || '0';
		number = number.toString();
		return (
			number.length >= width ?
				number 
			:
				new Array(width - number.length + 1).join(padString) + number
		);
	}

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
		out += numberToString(price, getEntrySize(fileVersion).price);

		var category = data.category;
		out += numberToString(category+1, getEntrySize(fileVersion).category);

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
		p += entrySize.price;
		var categoryString = string.substr(p, entrySize.category);

		var date = stringToDate(dateString);
		return {
			date: date,
			name: stringToNumber(nameString)-1,
			price: stringToNumber(priceString)/100,
			category: stringToNumber(categoryString)-1
		}
	}

	var indexChanged = false;
	
	function storeIndex(){
		if(indexChanged)
		{
			console.assert(index.version == fileVersion);

			var indexMin = [
				index.version,
				index.maxId,
				index.names,
				index.categories,
				[]
			]

			for (var i = 0; i < index.chunks.length; i++) {
				var chunk = index.chunks[i];

				var chunkMin = [
					chunk.version,
					[
						dateToString(chunk.dateRange.min),
						dateToString(chunk.dateRange.max)
					],
					[chunk.priceRange.min, chunk.priceRange.max],
					[],
					[]
				]

				for(var name in chunk.names){
					if(chunk.names.hasOwnProperty(name)){
						chunkMin[3].push(parseInt(name));
					}
				}

				for(var category in chunk.categories){
					if(chunk.categories.hasOwnProperty(category)){
						chunkMin[4].push(parseInt(category));
					}
				}

				indexMin[4].push(chunkMin);
			};

			var str = JSON.stringify(indexMin);

			//TODO encrypt index and send it to server, callback for response?
			//use extra module for crypto
			localStorage.index = str;
			indexChanged = false;
		}
	}

	function loadIndex(){
		//TODO load from server and decrypt
		var str = localStorage.index;
		if(!str){
			return;
		}

		var indexMin = JSON.parse(str);
		index = {
			version: indexMin[0],
			maxId: indexMin[1],
			names: indexMin[2],
			categories: indexMin[3],
			chunks: []
		}

		if(index.version > fileVersion){
			alert("Something is wrong, please reload");
			throw new Error("Something is wrong, please reload");
		}

		for (var i = 0; i < indexMin[4].length; i++) {
			var chunkMin = indexMin[4][i];
			var chunk = {
				version: chunkMin[0],
				dateRange: {
					min: stringToDate(chunkMin[1][0]),
					max: stringToDate(chunkMin[1][1])
				},
				priceRange: {
					min: chunkMin[1][0],
					max: chunkMin[1][1]
				},
				names: {},
				categories: {}
			}
			for (var j = 0; j < chunkMin[3].length; j++) {
				var name = chunkMin[3][j];
				chunk.names[name] = true;
			};
			for (var j = 0; j < chunkMin[4].length; j++) {
				var category = chunkMin[4][j];
				chunk.categories[category] = true;
			};
			index.chunks.push(chunk);
		};
	}

	function storeChunk(id){
		var chunk = chunks[id];
		var chunkSize = getChunkSize(fileVersion);
		var entrySize = getEntrySize(fileVersion);

		var str = "";

		for(var i = 0; i<chunk.length; i++){
			str += dataToString(chunk[i]);
		}

		if(chunk.length < chunkSize){
			str += new Array(entrySize.field+1).join(0);

			for(var i = chunk.length+1; i < chunkSize; i++){
				for(var j = 0; j < entrySize.field; j++){
					str += String.fromCharCode(Math.floor(Math.random()*256));
				}
			}
		}

		//TODO encrypt chunk and send it to server, callback for response?
		//use extra module for crypto
		localStorage[id] = str;
		indexChanged = false;
	}

	function isAllZeros(string){
		for (var i = 0; i < string.length; i++) {
			if(string[i] != "0"){
				return false;
			}
		}
		return true;
	}

	function loadChunk(id, version){
		//TODO load from server and decrypt
		var str = localStorage[id];
		if(!str){
			return;
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

	function rebuildCategoryIndex(id){
		var chunk = chunks[id];
		var chIndex = index.chunks[id];

		chIndex.categories = {};

		chunk.forEach(function(ea){
			chIndex.categories[ea.category] = true;
		});
		indexChanged = true;
	}

	function internalizeData(extData){
		var nameId = index.names.indexOf(extData.name);
		if(nameId == -1 && extData.name != ""){
			nameId = index.names.push(extData.name)-1;
			indexChanged = true;
		}
		var categoryId = index.categories.indexOf(extData.category);
		if(categoryId == -1 && extData.category != ""){
			categoryId = index.categories.push(extData.category)-1;
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
			price: extData.price,
			category: categoryId
		}
	}

	function externalizeData(data){
		return {
			date: data.date,
			name: data.name < 0 ? "" : index.names[data.name],
			price: data.price,
			category: data.category < 0 ? "" : index.categories[data.category]
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
				categories: {},
				version: fileVersion
			};
			indexChanged = true;
		}else{
			prev = chunks[i][id-i*500];

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
		index.chunks[i].categories[data.category] = true;

		chunks[i][id-i*500] = data

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
			if(prev.category != data.category){
				rebuildCategoryIndex(i);
			}
		}

		storeIndex();
		storeChunk(i);
	}

	Data.retrieveData = function(filters, callback){
		//TODO respect filters, make asynchronous
		var out = {};
		for (var i = 0; i < index.chunks.length; i++) {
			if(!chunks[i]){
				loadChunk(i, index.chunks[i].version || fileVersion);
			}
		};
		for (var i = 0; i < chunks.length; i++) {
			for (var j = 0; j < chunks[i].length; j++) {
				out[i*getChunkSize(fileVersion)+j] = externalizeData(chunks[i][j]);
			}
		};
		callback(out);
	}

	Data.__defineGetter__("maxId", function(){
		return index.maxId;
	})

	Data.initialize = function(callback){
		//TODO make asynchronous;
		loadIndex();
		callback();
	}

	Data.debug = {};
	Data.debug.__defineGetter__("index", function(){
		return index;
	});
	Data.debug.__defineGetter__("chunks", function(){
		return chunks;
	})

	return Data;

});