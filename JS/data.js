window.addEventListener("load", function(){

	window.Data = {};

	var chunks = [];

	var index = {
		maxId: 0,
		names: [],
		categories: [],
		chunks: []
	};

	var chunkSize = 500;
	var entrySize = {
		date: 8, //2013111 (2013-11-11)
		name: 3, //Integer id
		price: 6, //005000 (50.00€)
		category: 3 //Integer id
	}

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

	function dataToString(data){
		var out = "";
		
		var year = data.date.getFullYear().toString();
		out += year;

		var month = data.date.getMonth();
		month = pad(month, 2);
		out += month;

		var day = data.date.getDate();
		day = pad(day,2);
		out += day;

		var name = data.name;
		if(name < 0){
			name = "-01";
		} else {
			name = pad(name, 3);
		}
		out += name;

		var price = data.price*100;
		price = price.toString();
		while(price.length < entrySize.price){
			price = "0" + price;
		}
		out += price;

		var category = data.category;
		if(category < 0){
			category = "-01";
		} else {
			category = pad(category, 3);
		}
		out += category;

		return out;
	}

	function stringToData(string){
		var p = 0;
		var dateString = string.substr(p, entrySize.date);
		p += entrySize.date;
		var nameString = string.substr(p, entrySize.name);
		p += entrySize.name;
		var priceString = string.substr(p, entrySize.price);
		p += entrySize.price;
		var categoryString = string.substr(p, entrySize.category);

		var date = new Date();
		date.setFullYear(dateString.substring(0,4));
		date.setMonth(dateString.substring(4,6));
		date.setDate(dateString.substring(6,8));

		return{
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
			var str = "";

			console.log(index);
			indexChanged = false;
		}
	}

	function storeChunk(chunk){
		//TODO encrypt chunk and send it to server, callback for response?
		//stringify here, encrypt and send in extra module
		var str = "";

		console.log(chunk);
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
		storeChunk(chunks[i]);
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