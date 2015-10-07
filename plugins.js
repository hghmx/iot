"use strict";
var async = require('async');
var fs = require('fs');
var extfs = require('extfs');
var pluginsDir = './plugins';
var hashMap = require('hashmap');
var plugininterface = ['start', 'stop', 'update', 'command'];
var observations = require('./observations');

function Plugins( bc ){     
    this.bc = bc;
    this.plugins = new hashMap();
}

Plugins.prototype.load = function (complete) {
    //Nothing to do...
    if (!fs.existsSync(pluginsDir) || extfs.isEmptySync(pluginsDir)){
        complete(new Error("No plugins to load"));
    }
    
    var cnfg = [{name:"SNMPDevice", 
                typeCnfg: {'@id':"type1"}, 
                instancesCnfg:[{'@id':"instance1"},{'@id':"instance2"},{'@id':"instance3"}]}];
    async.each(cnfg, Plugins.prototype.pluged.bind(this), 
        function (err) {
            if (err) {
                complete(err);
            } else {
                complete(null, "Loaded: " + cnfg.length + " plugins");
            }
    });
};

Plugins.prototype.pluged = function (pluginConfig, complete) {
    var self = this;
    try{
        var plugClass = require(pluginsDir + '/' + pluginConfig.name);
        plugClass[ pluginConfig.name].prototype['sendObservation'] = observations.Observations.prototype.send;
        var newPlugin = new plugClass[ pluginConfig.name]();
        this.validateInterface(pluginConfig.name, newPlugin);
        self.plugins.set(pluginConfig.name, {instances:new hashMap(), commands:{}, crud:{}});        
        async.each(pluginConfig.instancesCnfg, 
            async.apply(Plugins.prototype.newInstance.bind(this), 
                        newPlugin, pluginConfig.name, pluginConfig.typeCnfg),
            function (err) {
                if (err) {
                    complete(err);
                } else {
                    complete(null);
                }
            });
    }catch(e){
        complete(e);
    }
};

Plugins.prototype.newInstance = function (newPlugin, pluginName, typeC, instanceC, complete) {
    var self = this;
    async.series([async.apply( newPlugin.start.bind(newPlugin), typeC, instanceC)], function (err, results) {
        if (err) {
            complete(err);
        } else {
            self.plugins.get(pluginName).instances.set(instanceC['@id'], newPlugin);
            complete(null, "Retrieved observation configuration");
        }
    });
};

Plugins.prototype.validateInterface = function (name, plugin) {
    var notImplemented = [];
    for (var i = 0; i < plugininterface.length; i++  ) {
        if(!plugin[plugininterface[i]]){
            notImplemented.push(plugininterface[i]);
        }
    }
    if(notImplemented.length > 1){
        new Error("Plugin :" + name + ' does not implement methods '+ notImplemented);
    }            
};

Plugins.prototype.command = function (complete) {
};

Plugins.prototype.new = function (complete) {
};

Plugins.prototype.delete = function (complete) {
};

Plugins.prototype.update = function (complete) {
};



Plugins.prototype.stop = function (plugIn, complete) {
    async.series([plugIn.stop.bind(plugIn)], function (err) {
        complete(err);
    });
};

Plugins.prototype.stopPlugIns = function (complete) {
    var instances = this.getInstances();
    async.each(instances,Plugins.prototype.stop.bind(this),
            function (err) {
                complete(err);
            });
};

Plugins.prototype.getInstances = function (complete) {
    var instances = [];
    this.plugins.forEach(function(value, plugName){
        instances = instances.concat(value.instances.values());
        
    });
    return instances;
};

module.exports = {
    Plugins : Plugins
};


