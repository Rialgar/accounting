define(["data", "Emitter"], function(Data, Emitter){
	"use strict";
	var viewEditor = new Emitter();

	var views = [{
		name: "All",
		filters:[]
	}];

	var activeView = false;

	var createDomElement = function(){
		var elem = document.createElement("a");
		elem.href = "#";
		elem.classList.add("list-group-item");

		var nameSpan = document.createElement("span");
		nameSpan.classList.add("viewName");
		elem.appendChild(nameSpan);

		var countSpan = document.createElement("span");
		countSpan.classList.add("badge");
		elem.appendChild(countSpan);

		document.getElementById("viewList").appendChild(elem);
		return elem;
	}

	var updateDomElement = function(view){
		if(!view.domElement){
			view.domElement = createDomElement();
		}
		view.domElement.firstChild.textContent = view.name;
		if(view.exactNumber){
			view.domElement.lastChild.textContent = view.exactNumber;	
		} else {
			if(!view.estimatedNumber){
				view.estimatedNumber = Data.estimateNumber(view.filters);
			}
			view.domElement.lastChild.textContent = "<=" + view.estimatedNumber;
		}
	}

	var activateView = function(view){
		if(activeView){
			activeView.domElement.classList.remove("active");
		}
		activeView = view;
		activeView.domElement.classList.add("active");
		viewEditor.emit("activation", activeView);
	}

	var dialog = document.getElementById("viewEditor");

	dialog.addEventListener("click", function(evt){
		if(dialog === evt.target){
			closeEditDialog();
		}
	})

	dialog.getElementsByClassName("close")[0].addEventListener("click", function(){
		closeEditDialog();
	})

	var showEditDialog = function(){
		dialog.style.display = "block";
		document.body.classList.add("modal-open");
		window.setTimeout(function(){
			dialog.classList.add("in");
		}, 0);
	}

	var closeEditDialog = function(){
		document.body.classList.remove("modal-open");
		dialog.classList.remove("in");
		var listener = function(){
			dialog.style.display = "none";
			dialog.removeEventListener("transitionend", listener);
		};
		dialog.addEventListener("transitionend", listener);	
	}

	viewEditor.addView = function(){
		//$("#viewEditor").modal("show");
		showEditDialog();
	};

	viewEditor.init = function(initViews){
		if(initViews){
			views = initViews;
		}
		for (var i = 0; i < views.length; i++) {
			updateDomElement(views[i]);
		};
	}

	return viewEditor;
});