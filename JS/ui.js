require.config({
  paths: {
    libs: "libs"
  }
});

require(['libs/domReady', 'data', 'srp', 'sjcl'], function(domReady, Data, SRP){
	domReady(function(){
		function signin()
		{
			document.getElementById("signin").style.display = "none";
			document.getElementById("loadingIndicator").style.display = "block";

			var username = document.getElementById("username").value;
			var password = document.getElementById("password").value;
			var fileKey = "";

			new SRP.Client(username, function(client, message){
				if (message == "A generated") {
					delete username;
					client.sendA();
				} else if (message == "Password required") {
					fileKey = sjcl.bn.fromBits(sjcl.misc.pbkdf2(password, client.s.mul(23).toBits()));
					client.setPassword(password);
					delete password;
				} else if (message == "Shared state calculated") {
					client.sendM1();
				} else if (message == "Authentification successfull") {
					signinSuccess(client, fileKey);
				} else {
					alert(message);
					delete password;
					delete fileKey;
					signinFailure(client);
				}
			}, function(client, message){
				alert(message);
				delete password;
				delete fileKey;
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

		var data = {};

		function show(id){
			if(data[id]){
				var row = document.getElementById("data_"+id);
				if(!row){
					row = document.getElementById("data_new"); 
					row.setAttribute("id", "data_"+id);
					createNewRow();
				}
				var tds = row.getElementsByTagName("td");
				tds[0].textContent = data[id].date.getFullYear() + "-" + (data[id].date.getMonth()+1) + "-" + data[id].date.getDate();
				tds[1].textContent = data[id].name;
				tds[2].textContent = data[id].price.toFixed(2) + "€";
				tds[3].textContent = Data.getCategoryForName(data[id].name);
			}
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
				var date = new Date();
				data[id] = {
					date: date,
					name: "",
					price: 0,
					category: ""
				}
			}
			
			if(field == "date") {
				var arr = value.split("-");

				var date = new Date(0);
				date.setFullYear(parseInt(arr[0]));
				date.setMonth(parseInt(arr[1])-1);
				date.setDate(parseInt(arr[2]));
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

		var saveInterval = false;

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

			Data.initialize(srpClient, fileKey, function(){
				Data.retrieveData([], function(d){
					data = d;
					for (var i in data) {
						if(data.hasOwnProperty(i)){
							show(i);
						};
					};
					saveInterval = window.setInterval(saveChanges, 1000) //every second
					callback();
				});
			});
		};

		function saveChanges(){
			Data.storeChanges();
		};

		/*window.debug={
		};

		window.debug.__defineGetter__("data", function(){
			return data;
		});

		window.debug.__defineGetter__("Data", function(){
			return Data;
		});

		window.debug.__defineGetter__("SRP", function(){
			return SRP;
		});*/
	});
});