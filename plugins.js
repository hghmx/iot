"use strict";
var async = require('async');
var fs = require('fs');
var extfs = require('extfs');
var pluginsDir = './plugins';
var plugininterface = ['start', 'stop', 'update', 'command'];
var logger = require('./logger').logger;
var util = require('util');
var dapws = require('./dapWs').DapWs;
var clone = require('clone');
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

Plugins.prototype.sendPluginError = function (pluginName, error) {
    var m2mError = clone(   {
                                "errorMessage": "Error testing",
                                "topic": "amtech/m2mBox/testing",
                                "targetthings": "[]",
                                "location": "",
                                "@type": "/amtech/linkeddata/types/composite/observation/m2mBridgeError",
                                "creationDate": "2015-10-19T18:51:46.667Z",
                                "guesttenants": [],
                                "description": "Simulate an M2M Bridge error observation",
                                "producer": "simulator",
                                "errorCode": 1,
                                "detectiontime": "2015-10-19T18:46:36.000Z",
                                "@id": "/amtech/things/observations/simulateM2MBridge",
                                "occurrencetime": "2015-10-19T18:46:36.000Z"
                            });
    if(error.message){
        m2mError.errorMessage = error.message;
    }else{
        m2mError.errorMessage = "Unknown error";
    }
    if(error.code){
        m2mError.errorCode =error.code;
    }
    m2mError.topic = util.format( "m2mBridge/errors/%s", pluginName);
    
    this.observs.send(m2mError);
};

Plugins.prototype.onCommand = function (pluginName, observation, complete) {
    
    if(observation.targetthings){
        var targetThings = JSON.parse(observation.targetthings);
        complete(null);
    }else{
        var err = new Error("Command has been sent withou a targetthings property");
        //send error
        this.sendPluginError(pluginName, err);
        complete(err);
    }
};

Plugins.prototype.onCrud = function (pluginName, observation, complete) {
    var self = this;
    var id = self.observs.getResourceName(observation['resourceuri']);
    function updatePlugIn() {
        var plugIn = self.plugins.get(pluginName).instances.get(id).instance;
        self.plugins.get(pluginName).instances.get(id).config[observation['propId']]
                = observation['newvalue'];
        plugIn.update(observation,
                function (err) {
                    if (err) {
                        logger.error(util.format("Error Updating a plugin %s id %s error: %s"
                                , pluginName, id, err.message));
                        //send error
                        self.sendPluginError(pluginName, err);
                    }else{
                        logger.debug( util.format("Update a plugin type %s with id", pluginName, id));
                    }
                    complete(null);
                });
    }

    function newPlugIn() {
        //"resourceuri": "/amtech/things/entities/cardemo",
        self.dapClient.getThing(observation['resourceuri'],
                function (err, instance) {
                    if (err) {
                        logger.error(util.format("Error Getting a new  plugin %s id %s information error: %s", pluginName,
                                self.observs.getResourceName(observation['resourceuri']), err.message));
                        //send error
                        self.sendPluginError(pluginName, err);
                    } else {
                        try {
                            var pluginName = self.observs.getResourceName(instance['@type']);
                            //was created in parallel
                            if (self.plugins.get(pluginName).instances.has(id)) {
                                updatePlugIn();
                            }else{
                                var plugClass = require(pluginsDir + '/' + pluginName);
                                var resourceUrn = self.observs.getResourceName(observation['resourceuri']);
                                self.plugins.get(pluginName).instances.set(resourceUrn, {config: instance});
                                self.newInstance(plugClass, pluginName,
                                        self.plugins.get(pluginName).config,
                                        self.plugins.get(pluginName).instances.get(resourceUrn),
                                        function (err) {
                                            if (err) {
                                                logger.error(util.format("Error starting a new  plugin %s id %s information error: %s", pluginName,
                                                        self.observs.getResourceName(observation['resourceuri']), err.message));
                                                //send error
                                                self.sendPluginError(pluginName, err);
                                            }else{
                                                logger.debug( util.format("Created a new  plugin type %s with id", pluginName, id));
                                            }
                                        });
                                
                            }
                        } catch (err) {
                            logger.error(util.format("Error Creating a new  plugin %s id %s information error: %s", pluginName,
                                    self.observs.getResourceName(observation['resourceuri']), err.message));
                            self.sendPluginError(pluginName, err);
                        }
                    }
                    complete(null);
                });
    }

    switch (observation.crudoperation) {
        case 'POST':
            complete(null);
            break;
        case 'PUT':
            if (self.plugins.get(pluginName).instances.has(id)) {
                updatePlugIn();
            } else {
                newPlugIn();
            }
            break;
        case 'DELETE':
            var plugIn = self.plugins.get(pluginName).instances.get(id).instance;
            if(self.plugins.get(pluginName).instances.has(id)){
                self.plugins.get(pluginName).instances.remove(id);
                plugIn.stop(function (err) {
                    if (err) {
                        logger.error(util.format("Error Deleting a plugin %s id %s error: %s", pluginName, id, err.message));
                        //send error
                        this.sendPluginError(pluginName, err);
                    }else{
                        logger.debug( util.format("Delete a plugin type %s with id", pluginName, id));
                    }
                    complete(null);
                });
            }else{
                 complete(null);
            }
            break;
    }
    ;
};

Plugins.prototype.stop = function (plugIn, complete) {
    plugIn.stop(function (err) {
        complete(err);
    });
};

Plugins.prototype.closeSocket = function (pluginType, complete) {

    async.parallel([pluginType.commands.endConnection.bind(pluginType.commands),
        pluginType.crud.endConnection.bind(pluginType.crud)],
            function (err) {
                complete(err);
            });
};

Plugins.prototype.stopPlugIns = function (complete) {
    var pluginsType = this.plugins.values();
    async.each(pluginsType, Plugins.prototype.closeSocket.bind(this),
            function (err) {
                complete(err);
            });
    var instances = this.getInstances();
    async.each(instances, Plugins.prototype.stop.bind(this),
            function (err) {
                complete(err);
            });
};

Plugins.prototype.getInstances = function () {
    var instances = [];
    this.plugins.values().forEach(function (value) {
        value.instances.forEach(function (value) {
            instances = instances.concat(value.instance);
        });
    });
    return instances;
};

module.exports = {
    Plugins: Plugins
};