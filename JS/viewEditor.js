define(["data", "Emitter"], function(Data, Emitter){
	"use strict";
	var viewEditor = new Emitter();

	var views = [{
		name: "All",
		filters:[]
	},{
		name: "Allso All",
		filters:[]
	}];

	var activeView = false;

	var createDomElement = function(view){
		var elem = document.createElement("a");
		elem.href = "#";
		elem.classList.add("list-group-item");
		elem.classList.add("viewItem");

		var nameSpan = document.createElement("span");
		nameSpan.classList.add("viewName");
		elem.appendChild(nameSpan);

		var countSpan = document.createElement("span");
		countSpan.classList.add("badge");
		countSpan.classList.add("viewCount");
		elem.appendChild(countSpan);

		var deleteBadge = document.createElement("span");
		deleteBadge.classList.add("badge");
		deleteBadge.classList.add("viewButton");
		var deleteIcon = document.createElement("span");
		deleteIcon.classList.add("glyphicon");
		deleteIcon.classList.add("glyphicon-trash");
		deleteBadge.appendChild(deleteIcon);
		elem.appendChild(deleteBadge);

		var editBadge = document.createElement("span");
		editBadge.classList.add("badge");
		editBadge.classList.add("viewButton");
		var editIcon = document.createElement("span");
		editIcon.classList.add("glyphicon");
		editIcon.classList.add("glyphicon-pencil");
		editBadge.appendChild(editIcon);
		elem.appendChild(editBadge);

		document.getElementById("viewList").appendChild(elem);

		elem.addEventListener("click", function(evt){
			evt.preventDefault();
			activateView(view);
		});
		return elem;
	}

	var updateDomElement = function(view){
		view.domElement.firstChild.textContent = view.name;
		if(typeof view.exactNumber !== "undefined"){
			view.domElement.firstChild.nextSibling.textContent = view.exactNumber;	
		} else {
			if(!view.estimatedNumber){
				view.estimatedNumber = Data.estimateNumber(view.filters);
			}
			view.domElement.firstChild.nextSibling.textContent = "<=" + view.estimatedNumber;
		}
	}

	var activateView = function(view, callback){
		if(activeView){
			activeView.domElement.classList.remove("active");
		}
		activeView = view;
		activeView.domElement.classList.add("active");
		viewEditor.emit("activated", activeView, function(){
			activeView.exactNumber = Data.estimateNumber(activeView.filters);
			updateDomElement(activeView);
			if(typeof callback === "function"){
				callback();
			}
		});
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
		showEditDialog();
	};

	viewEditor.init = function(callback){
		//load views from data or local storage (do we want to store them online?)
		//load active view
		for (var i = 0; i < views.length; i++) {
			views[i].domElement = createDomElement(views[i]);
		};
		activateView(views[0], function(){
			for (var i = 0; i < views.length; i++) {
				updateDomElement(views[i]);
			};
			if(typeof callback === "function"){
				callback();
			};
		});
	}

	return viewEditor;
});