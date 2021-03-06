require.config({
  paths: {
    libs: "libs"
  }
});

require(['libs/domReady', 'data', 'viewEditor', 'srp', 'sjcl'], function(domReady, Data, viewEditor, SRP){
	domReady(function(){
		"use strict";
		function signin()
		{
			document.getElementById("signin").style.display = "none";
			document.getElementById("loadingIndicator").style.display = "block";

			var username = document.getElementById("username").value;
			var password = document.getElementById("password").value;
			var fileKey = "";

			new SRP.Client(username, function(client, message){
				if (message == "A generated") {
					username = false;
					client.sendA();
				} else if (message == "Password required") {
					fileKey = sjcl.bn.fromBits(sjcl.misc.pbkdf2(password, client.s.mul(23).toBits()));
					client.setPassword(password);
					password = false;
				} else if (message == "Shared state calculated") {
					client.sendM1();
				} else if (message == "Authentification successfull") {
					signinSuccess(client, fileKey);
				} else {
					alert(message);
					password = false;
					fileKey = false;
					signinFailure(client);
				}
			}, function(client, message){
				alert(message);
				password = false;
				fileKey = false;
				signinFailure(client);
			});
		}

		document.getElementById("signinButton").addEventListener("click", function(evt){
			evt.preventDefault();
			signin();
		});

		function signinFailure(srpClient){
			console.log("Authentification failed: " + srpClient.state);
			document.getElementById("loadingIndicator").style.display = "none";
		}

		function signinSuccess(srpClient, fileKey){
			console.log("Authentification succesfull");
			init(srpClient, fileKey, function(){
				document.getElementById("loadingIndicator").style.display = "none";		
				document.getElementById(mode).style.display = "block";
			});
		}

		function activate(which){
			var display = document.getElementById(mode).style.display;
			document.getElementById(mode).style.display = "none";
			document.getElementById("mode_"+mode).classList.remove("active");

			mode = which;
			document.getElementById(mode).style.display = display;
			document.getElementById("mode_"+mode).classList.add("active");

			localStorage.setItem("mode", mode);
		}

		var mode = window.location.hash.substring(1) ||
				localStorage.getItem("mode") ||
				(document.getElementById("mode_stats").classList.contains("active") ? "stats" : "tables");

		activate(mode);

		document.getElementById("mode_tables").addEventListener("click", function(){
			activate("tables");
		});

		document.getElementById("mode_stats").addEventListener("click", function(){
			activate("stats");
		});

		function createNewRow()
		{
			var tr = document.createElement("tr");
			tr.setAttribute("id", "data_new");

			var td = document.createElement("td");
			td.setAttribute("contenteditable", "true");
			td.setAttribute("class", "date");
			td.addEventListener("blur", saveEdit);
			td.addEventListener("focus", selectAll);
			tr.appendChild(td);

			var td = document.createElement("td");
			td.setAttribute("contenteditable", "true");
			td.setAttribute("class", "name");
			td.addEventListener("blur", saveEdit);
			td.addEventListener("focus", selectAll);
			tr.appendChild(td);

			var td = document.createElement("td");
			td.setAttribute("contenteditable", "true");
			td.setAttribute("class", "price");
			td.addEventListener("blur", saveEdit);
			td.addEventListener("focus", selectAll);
			tr.appendChild(td);

			var td = document.createElement("td");
			//td.setAttribute("contenteditable", "true");
			td.setAttribute("class", "category");
			//td.addEventListener("blur", saveEdit);
			//td.addEventListener("focus", selectAll);
			td.addEventListener("click", changeCategory);
			tr.appendChild(td);

			document.getElementById("data").appendChild(tr);
			return tr;
		}

		function clearTable(){
			var table = document.getElementById("data");
			while(table.children.length > 0){
				table.removeChild(table.firstChild);
			}
			createNewRow();
		}

		var data = {};

		function pad(string, length){
			string = "" + string;
			return new Array(Math.max(0,length+1-string.length)).join("0") + string;
		}

		function show(id){
			if(data[id]){
				var row = document.getElementById("data_"+id);
				if(!row){
					row = document.getElementById("data_new"); 
					row.setAttribute("id", "data_"+id);
					sortedBy = false;
					createNewRow();
				}
				var tds = row.getElementsByTagName("td");
				tds[0].textContent = pad(data[id].date.getFullYear(), 4) + "-" +
									pad((data[id].date.getMonth()+1), 2) + "-" +
									pad(data[id].date.getDate(), 2);
				tds[1].textContent = data[id].name;
				tds[2].textContent = data[id].price.toFixed(2) + "€";
				tds[3].textContent = Data.getCategoryForName(data[id].name);
			}
		}

		function parseDate(str){
			var arr = str.split("-");

			var date = new Date(0);

			if(arr.length == 3){
				date.setFullYear(parseInt(arr[0]));
				date.setMonth(parseInt(arr[1])-1);
				date.setDate(parseInt(arr[2]));
			}
			return date;
		}

		function saveEdit(evt){
			var id = this.parentElement.getAttribute("id").substring(5);
			var field = this.getAttribute("class");
			var value = this.textContent;

			if(id == "new"){
				if(value == ""){
					return;
				}
				id = Data.maxId+1;
				var trs = this.parentElement.parentElement.getElementsByTagName("tr");

				var date = new Date();
				if(trs.length >= 2){
					date = parseDate(trs[trs.length-2].getElementsByClassName("date")[0].textContent);
				}
				data[id] = {
					date: date,
					name: "",
					price: 0,
					category: ""
				}
			}
			
			if(field == "date") {
				var date = parseDate(value);
				if(date.valueOf() === 0) {
					var td = new Date();
					date.setFullYear(td.getFullYear());
					date.setMonth(td.getMonth());

					switch(value.toLowerCase()){
						case "monday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-1) )%7)); break;
						case "tuesday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-2) )%7)); break;
						case "wednesday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-3) )%7)); break;
						case "thursday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-4) )%7)); break;
						case "friday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-5) )%7)); break;
						case "saturday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-6) )%7)); break;
						case "sunday":
							date.setDate(td.getDate()-(( 7+(td.getDay()-7) )%7)); break;
						case "last week":					
							date.setDate(td.getDate()-7); break;
						case "yesterday":
							date.setDate(td.getDate()-1); break;
						case "today":
							date.setDate(td.getDate()); break;
						default:
							date.setDate(NaN);
					};
				}
				if(!isNaN(date.valueOf())){
					data[id].date = date;
				}
			} else if(field == "name") {
				data[id].name = value;
			} else if(field == "price") {
				data[id].price = parseFloat(value);
			} else if(field == "category") {
				data[id].category = value;
			}
			if(sortedBy == "field"){
				sortedBy = false;
			}
			show(id);
			Data.storeData(id, data[id]);
		}

		function selectAll(){
			var selection = window.getSelection();
	  		selection.selectAllChildren(this);
		}

		function changeCategory(){
			var id = this.parentElement.getAttribute("id").substring(5);
			if(id != "new"){
				var name = data[id].name;
				var category = this.textContent;
				category = window.prompt("Set category for " + name, category);
				if(category != null){
					Data.setCategoryForName(name, category);
					for (var i in data) {
						if(data.hasOwnProperty(i) && data[i].name == name){
							document.getElementById("data_"+i).getElementsByTagName("td")[3].textContent = category;
						}
					};
				}
			}
		}

		function getId(domElement){
			return parseInt(domElement.id.substring(5));
		}

		var sortType = localStorage.getItem("sortType") || "id";
		var descending = localStorage.getItem("descending") === "true";

		var sortedBy = false;

		var collator =  new Intl.Collator("de");

		var comparators = {
			id: function(a,b){
				return getId(a) - getId(b);
			},
			date: function(a,b){
				return data[getId(a)].date.valueOf() - data[getId(b)].date.valueOf();
			},
			name: function(a,b){
				return collator.compare(data[getId(a)].name, data[getId(b)].name);
			},
			category: function(a,b){
				return collator.compare(a.getElementsByClassName("category")[0].textContent, b.getElementsByClassName("category")[0].textContent)
			},
			price: function(a,b){
				return data[getId(a)].price - data[getId(b)].price;
			}
		}

		function sort(){
			if(sortType != sortedBy){
				var n = document.getElementById("data_new");
				var table = document.getElementById("data");
				table.removeChild(n);
				var arr = Array.prototype.slice.apply(table.getElementsByTagName("tr"));
				arr.sort(comparators[sortType]);
				if(!descending){
					for (var i = 0; i < arr.length; i++) {
						table.appendChild(arr[i]);
					}
				} else {
					for (var i = arr.length-1; i >= 0; i--) {
						table.appendChild(arr[i]);
					}
				}

				table.appendChild(n);
			}
		}

		function sortBy(what){
				if(sortType == what){
					descending = !descending;
				} else {
					descending = false;
				}
				sortType = what;
				localStorage.setItem("sortType", sortType);
				localStorage.setItem("descending", descending);
				sort();
		}

		var saveTimeout = false;

		function init(srpClient, fileKey, callback){
			var trs = document.getElementById("data").getElementsByTagName("tr");

			for (var i = 0; i < trs.length; i++) {
				var tds = trs[i].getElementsByTagName("td");
				for (var j = 0; j < 3; j++) {
					tds[j].addEventListener("blur", saveEdit);
					tds[j].addEventListener("focus", selectAll);
				};
				tds[3].addEventListener("click", changeCategory);
			};

			var ths = document.getElementById("thead").getElementsByTagName("th");
			ths[0].addEventListener("click", function(){sortBy("date")});
			ths[1].addEventListener("click", function(){sortBy("name")});
			ths[2].addEventListener("click", function(){sortBy("price")});
			ths[3].addEventListener("click", function(){sortBy("category")});

			Data.initialize(srpClient, fileKey, function(){
				saveTimeout = window.setTimeout(saveChanges, 1000); //every second
				viewEditor.register(this, "activated", function(view, callback){
					Data.retrieveData(view.filters, function(d){
						clearTable();
						data = d;
						for (var i in data) {
							if(data.hasOwnProperty(i)){
								show(i);
							};
						};
						sort();
						callback();
					});
				});
				viewEditor.init(callback);
			});

			document.getElementById("rebuild").addEventListener("click", function(evt){
				if(evt.button == 0){
					evt.preventDefault();
					if(confirm("Rebuild date and category index? (This may take a while, depending on the number of your entries)")){
						Data.rebuildIndices();
					}
				}
			});

			document.getElementById("addView").addEventListener("click", function(evt){
				viewEditor.addView();
			});
		};

		function saveChanges(){
			Data.storeChanges(function(){
					saveTimeout = window.setTimeout(saveChanges, 1000); //every second
				}, function(){
					alert("You have been logged out");
					window.location = ".";
			});
		};

		window.debug={
			sortBy: sortBy
		};

		window.debug.__defineGetter__("data", function(){
			return data;
		});

		window.debug.__defineGetter__("Data", function(){
			return Data;
		});

		window.debug.__defineGetter__("SRP", function(){
			return SRP;
		});
	});
});