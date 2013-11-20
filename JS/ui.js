"use strict"
window.addEventListener("load", function(){
	
	function signin()
	{
		$("#signin").hide();
		$("#loadingIndicator").show();

		window.setTimeout(signinSuccess, 1234); //Mockup
	}

	$("#signinButton").on("click", function(evt){
		evt.preventDefault();
		signin();
	});

	function signinSuccess(){
		$("#loadingIndicator").hide();		
		$("#" + mode).show();
	}

	function activate(which){
		var display = $("#"+mode).css("display");
		$("#"+mode).css("display", "none");

		mode = which;
		$("#"+mode).css("display", display);

		$(".modeButton").removeClass("active");
		$("#mode_" + mode).addClass("active");
	}

	var mode = window.location.hash.substring(1) ||
			localStorage.getItem("mode") ||
			$("#mode_stats").hasClass("active") ? "tables" : "stats";
	localStorage.setItem("mode", mode);

	activate(mode);

	$("#mode_tables").on("click", function(){
		activate("tables");
	});

	$("#mode_stats").on("click", function(){
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
		td.setAttribute("contenteditable", "true");
		td.setAttribute("class", "category");
		td.addEventListener("blur", saveEdit);
		td.addEventListener("focus", selectAll);
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
			tds[3].textContent = data[id].category;
		}
	}

	function saveEdit(evt){
		var id = this.parentElement.getAttribute("id").substring(5);
		var field = this.getAttribute("class");
		var value = this.textContent;

		if(id == "new"){
			id = Data.maxId+1;
			var date = new Date();
			data[id] = {
				date: date,
				name: "",
				price: 0,
				category: ""
			}
			this.parentElement.setAttribute("id", "data_"+id);
			createNewRow();
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

	$("#data td").on("blur", saveEdit);
	$("#data td").on("focus", selectAll);

	Data.initialize(function(){
		data = Data.retrieveData();
		for (var i in data) {
			if(data.hasOwnProperty(i)){
				show(i);
			};
		};
	});

	window.ui_debug={
	};

	window.ui_debug.__defineGetter__("data", function(){
		return data;
	})

});