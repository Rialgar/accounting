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

	var values = {
		name: ["Miete", "DSL", "Käse", "Milch", "Brot", "Wasser"]
	};

	function edit(td, type){
		if(!td.editing) {
			td.editing = true;
			var val = td.textContent;
			td.textContent="";
			var input = document.createElement("input");
			input.value = val;
			td.appendChild(input);
			$(input).autocomplete({source:values[type]});
			$(input).on("keypress", function(evt){
				if((evt.keyCode || evt.which) == 13){
					stopEditing(this);
				}
			});
			input.focus();
		}
	}

	function stopEditing(input)
	{
		var td = input.parentNode;
		if(td.editing) {
			td.editing = false;
			var val = input.value;
			td.removeChild(input);
			td.textContent = val;
		}
	}

	$( "tr>td:nth-child(2)" ).on("click", function(){
		edit(this, "name");
	});

});