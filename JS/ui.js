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
	}

	var maxId = 0;
	var names = [];
	var categories = [];
	var data = {};

	function show(id){
		var row = document.getElementById("data_"+id);
		if(row && data[id]){
			var tds = row.getElementsByTagName("td");
			tds[0].textContent = data[id].date.getFullYear() + "-" + (data[id].date.getMonth()+1) + "-" + data[id].date.getDate();
			tds[1].textContent = data[id].name >= 0 ? names[data[id].name] : "";
			tds[2].textContent = data[id].price.toFixed(2) + "€";
			tds[3].textContent = data[id].category >= 0 ? categories[data[id].category] : "";
		}
	}

	function saveEdit(){
		var id = this.parentElement.getAttribute("id").substring(5);
		var field = this.getAttribute("class");
		var value = this.textContent;

		if(id == "new"){
			maxId++;
			id = maxId;
			var date = new Date();
			data[id] = {
				date: date,
				name: -1,
				price: 0,
				category: -1
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
			console.log(date);
		} else if(field == "name") {
			var index = names.indexOf(value)
			if( index < 0 && value != ""){
				index = names.push(value)-1;
			}
			data[id].name = index;
		} else if(field == "price") {
			data[id].price = parseFloat(value);
		} else if(field == "category") {
			var index = categories.indexOf(value)
			if( index < 0 && value != ""){
				index = categories.push(value)-1;
			}
			data[id].category = index;
		}
		show(id);
	}

	function selectAll(){
		var selection = window.getSelection();
  		selection.selectAllChildren(this);
	}

	$("#data td").on("blur", saveEdit);
	$("#data td").on("focus", selectAll);

});