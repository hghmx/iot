"use strict";
var async = require('async');
var fs = require('fs');
var extfs = require('extfs');
var pluginsDir = './plugins';
var plugininterface = ['start', 'stop', 'update', 'command'];
var logger = require('./logger').logger;
var util = require('util');
var dapws = require('./dapWs').DapWs;
///amtech/push/things/events?topic=/dap/things/<thingType>/<CRUD>&client=<client_id>
var urlDapCrud = '/amtech/push/things/events?topic=/dap/things/%s&client=%s';
///amtech/push/things/commands?client=<client_id>&thingtype=<thing_type>
var urlDapCmds = '/amtech/push/things/commands?client=%s&thingtype=%s';

function Plugins( bc, dapClient, observs ){     
    this.bc = bc;
    this.dapClient = dapClient;
    this.observs = observs;
}

Plugins.prototype.load = function (complete) {
    var self = this;
    //Nothing to do...
    if (!fs.existsSync(pluginsDir) || extfs.isEmptySync(pluginsDir)) {
        complete(new Error("No plugins to load"));
    }
    self.loadedPlugs = [];
    this.plugins = self.observs.typesConfiguration;

    async.each(this.plugins.values(), Plugins.prototype.pluged.bind(this),
            function (err) {
                if (err) {
                    complete(err);
                } else {
                    async.each(self.plugins.values(), Plugins.prototype.connectWS.bind(self),
                            function (err) {
                                if (err) {
                                    complete(err);
                                } else {
                                    self.loadedPlugs.push(util.format("Loaded: %d plugins", self.getInstances().length));
                                    complete(null, self.loadedPlugs);
                                }
                            });
                }
            });
};

Plugins.prototype.connectWS = function (pluginInstance, complete) {
    async.parallel([pluginInstance.commands.connect.bind(pluginInstance.commands),
                    pluginInstance.crud.connect.bind(pluginInstance.crud)], 
                    function(err){
                        complete(err);
                    }
    );
};

Plugins.prototype.pluged = function (pluginConfig, complete) {
    var self = this;
    try{
        //self.plugins.set(pluginConfig.name, {instances:new hashMap(), commands:null, crud:null});   
        self.addWebSockets(pluginConfig.name);
        var plugClass = require(pluginsDir + '/' + pluginConfig.name);
        plugClass[ pluginConfig.name].prototype['sendObservation'] = self.observs.send.bind(self.observs);
        async.each(pluginConfig.instances.values(), 
            async.apply(Plugins.prototype.newInstance.bind(this), 
                        plugClass, pluginConfig.name, pluginConfig.config),
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

Plugins.prototype.addWebSockets = function (pluginName) {
    var wsDapUrl = this.bc.dap.dapUrl.replace('https', 'wss');
    var cmdUrl = wsDapUrl + util.format(urlDapCmds, this.bc.bridgeId, pluginName);
    this.plugins.get(pluginName)['commands'] = new dapws(this.bc, cmdUrl, this.onCommand.bind(this), pluginName);
    var crudUrl = wsDapUrl + util.format(urlDapCrud, pluginName, this.bc.bridgeId);
    this.plugins.get(pluginName)['crud'] = new dapws(this.bc, crudUrl, this.onCrud.bind(this), pluginName);
};

Plugins.prototype.newInstance = function (plugClass, pluginName, typeC, pluginInstance, complete ) {
    var self = this;
    try{
        var newPlugin = new plugClass[ pluginName]();
        this.validateInterface(pluginName, newPlugin);        
        newPlugin.start( typeC, pluginInstance.config, function (err) {
            if (err) {
                complete(err);
            } else {
                pluginInstance['instance'] = newPlugin;
                //self.plugins.get(pluginName).instances.set(instanceC['@id'], newPlugin);
                self.loadedPlugs.push(util.format("New plugin type: %s id: %s", pluginName,  pluginInstance.config['@id']));
                complete(null);
            }
        });
    }catch(e){
        complete(e);
    }
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

Plugins.prototype.onCommand = function (pluginName, observation) {
};

Plugins.prototype.onCrud = function (pluginName, observation) {
    var self = this;
    switch(observation.crudoperation){
        case 'POST':
            //"resourceuri": "/amtech/things/entities/cardemo",
            this.dapClient.getThing(observation['resourceuri'], 
            function (err, instance) {
                if(err){
                    logger.error( util.format("Error Getting a new  plugin %s id %s information error: %s",pluginName, 
                    this.observs.getResourceName(observation['resourceuri']), err.message));
                }else{
                    try{
                        var pluginName = this.observs.getResourceName(observation['"@type"']);
                        var plugClass = require(pluginsDir + '/' + pluginName);
                        var resourceUrn = this.observs.getResourceName(observation['resourceuri']);
                        self.observs.plugins.get(pluginName).instances.set(resourceUrn, {config:instance});
                        self.newInstance(plugClass, pluginName, 
                                            self.observs.plugins.get(pluginName).config, 
                                            self.observs.plugins.get(pluginName).instances.get(resourceUrn) ,
                        function(err){
                            logger.error( util.format("Error starting a new  plugin %s id %s information error: %s",pluginName,
                                this.observs.getResourceName(observation['resourceuri']), err.message));
                        });
                    }catch(err){
                        logger.error( util.format("Error Creating a new  plugin %s id %s information error: %s",pluginName,
                                this.observs.getResourceName(observation['resourceuri']), err.message));
                    }
                }
            });
            break;
        case 'PUT':
            var id = this.observs.getResourceName(observation['@id']);
            var plugIn = this.plugins.get(pluginName).instances.get(id).instance;
            var plugInConfig = this.plugins.get(pluginName).instances.get(id).config;    
            plugInConfig[observation['propId']] = observation['newvalue'];
            plugIn.update(observation, 
                function (err) {
                if(err){
                    logger.error( util.format("Error Updating a plugin %s id %s error: %s",pluginName, observation['@id'], err.message));
                }
            }); 
            break;
        case 'DELETE':
            var id = this.observs.getResourceName(observation['@id']);
            var plugIn = this.plugins.get(pluginName).instances.get(id).instance;
            this.plugins.get(pluginName).instances.remove(id);
            plugIn.stop(function (err) {
                if(err){
                    logger.error( util.format("Error Deleting a plugin %s id %s error: %s",pluginName, observation['@id'], err.message));
                }
            }); 
            break;
    };    
};

Plugins.prototype.stop = function (plugIn, complete) {
    plugIn.stop( function (err) {
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

Plugins.prototype.getInstances = function () {
    var instances = [];
    this.plugins.values().forEach(function(value){
            value.instances.forEach(function(value){
                instances = instances.concat(value.instance);
        }); 
    });
    return instances;
};

module.exports = {
    Plugins : Plugins
};

