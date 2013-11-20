"use strict"
window.addEventListener("load", function(){

	window.Data = {};

	var chunks = [];

	var index = {
		version: 0,
		maxId: -1,
		names: [],
		categories: [],
		chunks: []
	};

	var chunkSizes = [500];
	var fields = [["date", "name", "price", "category"]]; //unused until now, might be usefull for backwards compatibility later
	var entrySizes = [{
		date: 8, //2013111 (2013-11-11)
		name: 3, //Integer id
		price: 6, //005000 (50.00€)
		category: 3, //Integer id
		field: 20, //Sum of the above (fields might be added)
		chunkId: 5 //Integer id
	}];

	var fileVersion = 0;

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

	function dateToString(date){
		var out = "";
		
		var year = date.getFullYear().toString();
		out += year;

		var month = date.getMonth();
		month = pad(month, 2);
		out += month;

		var day = date.getDate();
		day = pad(day,2);
		out += day;

		return out;
	}

	function stringToDate(str)
	{
		var date = new Date();
		date.setFullYear(dateString.substring(0,4));
		date.setMonth(dateString.substring(4,6));
		date.setDate(dateString.substring(6,8));

		return date;
	}

	function dataToString(data){
		var entrySize = entrySizes[fileVersion];
		var out = dateToString(data.date);

		var name = data.name;
		if(name < 0){
			name = "-01";
		} else {
			name = pad(name, entrySize.name);
		}
		out += name;

		var price = data.price*100;
		price = pad(price, entrySize.price);
		out += price;

		var category = data.category;
		if(category < 0){
			category = "-01";
		} else {
			category = pad(category, entrySize.category);
		}
		out += category;

		return out;
	}

	function stringToData(string, version){
		version = version || fileVersion;
		var entrySize = entrySizes[version];

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
			name: parseInt(nameString),
			price: parseInt(priceString)/100,
			category: parseInt(categoryString)
		}
	}

	var indexChanged = false;
	
	function storeIndex(){
		if(indexChanged)
		{
			//TODO encrypt index and send it to server, callback for response?
			//stringify here, encrypt and send in extra module
			console.assert(index.version = fileVersion);

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
					[
						parseInt(dateToString(chunk.dateRange.min)),
						parseInt(dateToString(chunk.dateRange.max))
					],
					[chunk.priceRange.min, chunk.priceRange.max],
					[],
					[]
				]

				for(var name in chunk.names){
					if(chunk.names.hasOwnProperty(name)){
						chunkMin[2].push(parseInt(name));
					}
				}

				for(var category in chunk.categories){
					if(chunk.categories.hasOwnProperty(category)){
						chunkMin[3].push(parseInt(category));
					}
				}

				indexMin[4].push(chunkMin);
			};

			var str = JSON.stringify(indexMin);

			console.log(str);
			indexChanged = false;
		}
	}

	function storeChunk(id){
		var chunk = chunks[id];
		var chunkSize = chunkSizes[fileVersion];
		var entrySize = entrySizes[fileVersion];

		var str = "";

		str += pad(fileVersion, 3); //size of version field cannot be changed

		str += pad(id, entrySize.chunkId);

		for(var i = 0; i<chunk.length; i++){
			str += dataToString(chunk[i]);
		}

		if(chunk.length < chunkSize){
			str += new Array(entrySize.field+1).join(0);

			for(var i = chunk.length+1; i < chunkSize; i++){
				for(var j = 0; j < entrySize.field; j++){
					str += Math.floor(Math.random()*10).toString().substring(0,1);
				}
			}
		}

		//TODO encrypt chunk and send it to server, callback for response?
		//use extra module for crypto
		console.log(str);
		indexChanged = false;
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
			category: data.category < 0 ? "" : index.names[data.category]
		}
	}

	Data.storeData = function(id, data){
		var chunkSize = chunkSizes[fileVersion];

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
				categories: {}
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

	Data.retrieveData = function(filters){
		//TODO respect filters
		var out = [];
		chunks.forEach(function(ea){
			chunks[ea].forEach(function(data)
			{
				out.push(externalizeData(data));
			})
		})
	}

	Data.__defineGetter__("maxId", function(){
		return index.maxId;
	})

});