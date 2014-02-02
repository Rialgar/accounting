define(function() {
	"use strict";
    var Emitter = function Emitter() {
        this.observers = [];
    };
    
    Emitter.prototype.register = function(obj, signal, fct) {
        this.observers.push({obj: obj, signal: signal, fct: fct});
    };
    
    Emitter.prototype.unregister = function(obj, signal) {
        for(var i = 0; i < this.observers.length; i++) {
            if(this.observers[i].obj === obj && (!signal || this.observers[i].signal === signal)) {
                this.observers[i].splice(i,1);
                i--;
            }
        }
    };
    
    Emitter.prototype.emit = function() {
        var args = Array.prototype.slice.call(arguments);
        args.splice(0,1);
        for(var i = 0; i < this.observers.length; i++) {
            if(this.observers[i].signal === arguments[0]) {
                this.observers[i].fct.apply(this.observers[i].obj, args);
            }
        }
    };
    return Emitter;
});