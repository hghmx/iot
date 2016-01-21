///*******************************************************************************
// * Copyright (C) 2015 AmTech.
// *
// * Licensed to the Apache Software Foundation (ASF) under one
// * or more contributor license agreements.  See the NOTICE file
// * distributed with this work for additional information
// * regarding copyright ownership.  The ASF licenses this file
// * to you under the Apache License, Version 2.0 (the
// * "License"); you may not use this file except in compliance
// * with the License.  You may obtain a copy of the License at
// *
// *   http://www.apache.org/licenses/LICENSE-2.0
// *
// * Unless required by applicable law or agreed to in writing,
// * software distributed under the License is distributed on an
// * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// * KIND, either express or implied.  See the License for the
// * specific language governing permissions and limitations
// * under the License.
// *******************************************************************************/
"use strict";
var async = require('async');
var fs = require('fs');
var extfs = require('extfs');
var pluginsDir = './plugins';
var plugininterface = ['start', 'stop', 'command'];
var logger = require('./logger').logger;
var util = require('util');
var dapws = require('./dapWs').DapWs;
var clone = require('clone');
var dapReconnect = require('./reconnectDAP').reconnectDAP;
//var urlDapCmds = '/amtech/push/things/commands?client=%s&thingtype=/amtech/linkeddata/types/composite/entity/%s';
//var urlDapCrud = '/amtech/push/things/events?topic=%s&client=%s';
var crudCommandWS = '/amtech/push/things/events?topic=%s&client=%s';

var urlThingCrud = "thingcrud/";

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
    if (!self.plugins.get('amtechM2mBridge') || 
        !self.plugins.get('amtechM2mBridge').instances ||
        !self.plugins.get('amtechM2mBridge').instances.get(self.bc.bridgeId) ||
        !self.plugins.get('amtechM2mBridge').instances.get(self.bc.bridgeId).config ||
        self.plugins.get('amtechM2mBridge').instances.get(self.bc.bridgeId).config._name !== self.bc.bridgeId) {
            complete(new Error(util.format("amtechM2mBridge has not instance defined by autodiscoverung or server side with the name %s.", self.bc.bridgeId)));
    }        
    async.each(this.plugins.values(), Plugins.prototype.pluged.bind(this),
        function (err) {
            if (err) {
                complete(err);
            } else {
                self.connectWS(function (error) {
                    if (error) {
                        complete(error);
                    } else {
                        self.loadedPlugs.push(util.format("Loaded: %d plugins", self.getInstances().length));
                        dapReconnect.plugins = self;
                        complete(null, self.loadedPlugs);
                    }
                });
            }
        });
};

Plugins.prototype.connectWS = function (complete) {
    var self = this;
    var wsDapUrl = this.bc.dap.dapUrl.replace('https', 'wss');
    var ccAsyncWSUrl = wsDapUrl + util.format(crudCommandWS,this.bc.dap.crudCommandUrl, this.bc.bridgeId);
    self['ccAsyncWS'] = new dapws(this.bc, ccAsyncWSUrl, this.onCCAsync.bind(this));
    self.ccAsyncWS.connect(function(err){
        if(!err){
            logger.info("CRUD and Command websocket successfully opened" );
        }
        complete(err);
    });
};

Plugins.prototype.pluged = function (pluginConfig, complete) {
    var self = this;
    try{
        if(pluginConfig['id'] === "/amtech/linkeddata/types/composite/entity/amtechM2mBridge"){
            logger.debug(util.format("Load  amtechM2mBridge instance %s.", pluginConfig.instances.values()[0].config._name));
            if(!pluginConfig.instances.values()[0].observations.get('m2mBridgeError') ||
                !pluginConfig.instances.values()[0].observations.get('m2mBridgeError').topicschema ||
                pluginConfig.instances.values()[0].observations.get('m2mBridgeError').length === 0){
                    var error = 
                        new Error(util.format("amtechM2mBridge id %s has not topic defined for m2mError observations.", self.bc.bridgeId));
                logger.error(error);
                complete(error);
            }else{
                self['m2mErrorTopic'] = pluginConfig.instances.values()[0].observations.get('m2mBridgeError').topicschema;
                self['m2mErrorTargetThings'] = pluginConfig.instances.values()[0].observations.get('m2mBridgeError').thingsconfig;
                self['m2mErrorProducer'] = pluginConfig.instances.values()[0].observations.get('m2mBridgeError').producerschema;
            }           
            complete(null);
        }else{
            var plugClass = require(pluginsDir +'/' + pluginConfig.name + '/' + pluginConfig.name);
            //plugClass[ pluginConfig.name].prototype['sendObservation'] = self.observs.send.bind(self.observs);
            plugClass[ pluginConfig.name].prototype['sendObservation'] = self.sendObservation.bind(self);
            plugClass[ pluginConfig.name].prototype['restartPlugIn'] = self.restartPlugIn.bind(self);
            async.each(pluginConfig.instances.values(), 
                async.apply(Plugins.prototype.newInstance.bind(this), 
                            plugClass, pluginConfig.name),
                function (err) {
                    if (err) {
                        complete(err);
                    } else {
                        complete(null);
                    }
                });
        }
    }catch(e){
        if(e.code === 'MODULE_NOT_FOUND'){
            logger.warn(util.format("Thing Type %s without a plugin installed, can be a lnked type or error in configuration", pluginConfig.name));
            complete(null);
        }else{
            complete(new Error(util.format("Error loding plugin type %s.js error %s.", pluginConfig.name, e.message)));
        }
    }
};

Plugins.prototype.sendObservation = function (pginInstance, observation) {   
    //get plugin instance
    var pluginName = this.observs.getResourceName(pginInstance['@type']);
    var instanceId = this.observs.getResourceName(pginInstance['@id']);
    var thingInstance = this.plugins.get(pluginName).instances.get(instanceId).config;
    
    //No producer set default...
    if(!observation.producer || observation.producer.length<=0){
        observation.producer = instanceId;
    }
    
    //No location set default...
    if(!observation.location || observation.location.length<=0){
        if(thingInstance.location && thingInstance.location.length>0){
            observation.location = thingInstance.location;
        }else if(this.bc.location){
            observation.location = this.bc.location;
        }
    }
    this.observs.send(observation);
};

Plugins.prototype.newInstance = function (plugClass, pluginName, pluginInstance, complete ) {
    var self = this;
    try{
        var newPlugin = new plugClass[ pluginName]();
        this.validateInterface(pluginName, newPlugin); 
        var context = { bc: self.bc,    observationsCnfg:pluginInstance.observations, 
                        thingInstance: pluginInstance.config, logger : logger };
        //inject jsonld properties
        newPlugin['@id'] =pluginInstance.config['@id'];
        newPlugin['@type']=pluginInstance.config['@type'];
        
        newPlugin.start(context, function (err) {
            if (err) {
                complete(err);
            } else {
                pluginInstance['instance'] = newPlugin;
                //self.plugins.get(pluginName).instances.set(instanceC['@id'], newPlugin);
                self.loadedPlugs.push(util.format("New plugin type: %s id: %s", pluginName,  newPlugin['@id']));
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
    if(notImplemented.length > 0){
        throw new Error("Plugin :" + name + ' does not implement methods '+ notImplemented);
    }            
};

Plugins.prototype.sendPluginError = function (pluginName, error) {
    var m2mError = clone(   {
                                "proximityarea": "",
                                 "guestusers": [],
                                "topic": "",
                                "errorMessage": "",
                                "targetthings": "[]",
                                "location": "",
                                "@type": "/amtech/linkeddata/types/composite/observation/m2mBridgeError",
                                "creationDate": "2016-01-21T04:08:32.629Z",
                                "guesttenants": [],
                                "description": "",
                                "producer": "",
                                "errorCode": 0,
                                "occurrencetime": "2015-12-24T20:03:18.000Z"
                            });                        
    var  errorMsg;                       
    if(error.message){
        errorMsg = error.message;
    }else{
        errorMsg = "Unknown error";
    }    
    m2mError.errorMessage = util.format( "Plugin name %s, error %s.", pluginName, errorMsg);
    
    if(!this.m2mErrorTopic){
        logger.error(util.format("amtechM2mBridge id %s has not defined m2mBridgeError topic at activity.", this.bc.bridgeId));
    }else{
        if(error.code){
            m2mError.errorCode =error.code;
        }else{
            error.code = 0;
        }
        m2mError.occurrencetime = new Date().toISOString();
        m2mError.topic = this.m2mErrorTopic;
        m2mError.producer = this.m2mErrorProducer;
        m2mError.targetthings = this.m2mErrorTargetThings;
        this.observs.send(m2mError);           
    }   
    logger.error( m2mError.errorMessage);    
};

Plugins.prototype.getLinkedThingParent = function (linkedThing) {
    var self = this;
    for (var i = 0; i < self.plugins.values().length; i++) {
        var plugIn = self.plugins.values()[i];
        for (var j = 0; j < plugIn.instances.values().length; j++) {
            var pluginInst = plugIn.instances.values()[j];
            for (var property in pluginInst.config) {
                var sp = pluginInst.config[property];
                if (typeof sp === 'object' &&
                    sp['@type'] &&
                    sp['@type'] === "http://www.w3.org/ns/hydra/core#Collection" &&
                    sp.members && sp.members.length > 0 &&
                    sp.memberstype ===  linkedThing['@type']) {
                    for (var k = 0; k < sp.members.length; k++) {
                        var instance = sp.members[k];
                        if (instance['@id'] === linkedThing['@id']) {
                            return {parent: pluginInst.instance, config: instance};
                        }
                    }
                }
            }
        }
    }
    return null;
};

Plugins.prototype.onCCAsync = function (observation, complete) {
    var self = this;
    if (observation['@type'] === "/amtech/linkeddata/types/composite/observation/observationresourcecrud") {
        var pluginName = this.observs.getResourceName(observation.resourcetype);
        var plugId = this.observs.getResourceName(observation.resourceuri);
        if (self.plugins.get(pluginName) && self.plugins.get(pluginName).instances &&
            self.plugins.get(pluginName).instances.get(plugId) &&
            self.plugins.get(pluginName).instances.get(plugId).instance) {
            self.onCrud(pluginName, observation, complete);
        } else {
            var linkedInstance = self.getLinkedThingParent({'@type': observation.resourcetype,
                '@id': observation.resourceuri});
            if (linkedInstance) {
                self.updateLinkedThing(linkedInstance, observation, complete);
            } else {
                var err = new Error(
                    util.format("Crud operation has ben sent to an unknown plugin %s id %s"
                        , pluginName, plugId));
                if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
                    self.sendPluginError(pluginName, err);
                }
            }
        }
    } else {
        if (!observation.targetthings) {
            var err = new Error("Command has been sent without a targetthings property");
            //send error
            if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
                self.sendPluginError("Uknown", err);
            }
            complete(err);
        } else {
            var tt = JSON.parse(observation.targetthings);
            self.onCommand(this.observs.getResourceName(tt[0].thingType), observation, complete);
        }
    }
};

Plugins.prototype.updateLinkedThing = function (linkedInstance, observation, complete) {
    var self = this;
    var pluginName = this.observs.getResourceName(linkedInstance.parent['@type']);
    var id = this.observs.getResourceName(linkedInstance.parent['@id']);    
    try{
        var od = new Date(observation.occurrencetime);
        if (linkedInstance.config[observation['propId']] !== observation['newvalue']) {
            linkedInstance.config._lastmodified = od.getTime();
            linkedInstance.config[observation['propId']] = observation['newvalue'];
            var plugIn = self.plugins.get(pluginName).instances.get(id).instance;
            var pluginInstance = self.plugins.get(pluginName).instances.get(id);
            var context = {bc: self.bc, observationsCnfg: pluginInstance.observations,
                thingInstance: pluginInstance.config, logger: logger};
            async.series([plugIn.stop.bind(plugIn),
                async.apply(plugIn.start.bind(plugIn), context)],
                function (err) {
                    if (err) {
                        if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
                            self.sendPluginError(id, err);
                        }
                        complete(err);
                    } else {
                        logger.debug(util.format("Updated plugIn %s property %s from %s to %s"),
                            id, observation['propId'], linkedInstance.config[observation['propId']],
                            observation['newvalue']);
                        complete(null);
                    }
                });
        } else {
            logger.debug(util.format("Updated not called plugIn %s last modified at %s property has same value %s old %s new %s"),
                id, od, observation['propId'], linkedInstance.config[observation['propId']],
                observation['newvalue']);
            complete(null);
        }
    }catch(e){
        logger.error();
        var err = new Error(util.format("Updating linked resource to plugin type %s id %s",pluginName, id));
        if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
            self.sendPluginError(pluginName, err);
        }        
        complete(e);
    }
};

Plugins.prototype.onCommand = function (pluginName, observation, complete) {
    var self = this; 
    try {
        var targetThings = JSON.parse(observation.targetthings);
        targetThings.forEach(function (tt) {
            pluginName = self.observs.getResourceName(tt.thingType);
            if (self.plugins.has(pluginName)) {
                tt.thingsId.forEach(function (instanceId) {
                    if (self.plugins.get(pluginName).instances.has(instanceId)) {
                        self.plugins.get(pluginName).instances.get(instanceId).instance.command(observation,
                            function (err) {
                                if (err) {
                                    if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
                                        self.sendPluginError(pluginName, err);
                                    }
                                    //complete(err);
                                }else{
                                    logger.info(util.format("Command has been executes by plugin: %s instance id: %s observation type: %s"
                                            , pluginName, instanceId, observation['@type']));
                                }
                            });
                    } else {
                        var err = new Error(
                            util.format("Command has ben sent to a plugin %s with an unknown instance %s"
                                , pluginName, instanceId));
                        if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
                            self.sendPluginError(pluginName, err);
                        }
                        //complete(err);
                    }
                });
            } else {
                var err = new Error(
                    util.format("Command has ben sent to an unknown plugin  %s"
                        , pluginName));
                if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
                    self.sendPluginError(pluginName, err);
                }
                //complete(err);
            }
        });
        complete(null);
    } catch (e) {
        var err = new Error(util.format("Error on command sent to a plugin %s error: %s"
                                    , pluginName, e.message));
        //send error
        if (self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError) {
            self.sendPluginError(pluginName, err);
        }
        complete(err);          
    }
};

Plugins.prototype.onCrud = function (pluginName, observation, complete) {
    var self = this;
    var id = self.observs.getResourceName(observation['resourceuri']);
    function updatePlugIn() {
        var plugIn = self.plugins.get(pluginName).instances.get(id).instance;
        var pluginInstance = self.plugins.get(pluginName).instances.get(id);
        var od = new Date(observation.occurrencetime);
        //var pd = new Date( pluginInstance.config._lastmodified);      
        //set new value... 
        if (pluginInstance.config[observation['propId']] !== observation['newvalue']) {
            pluginInstance.config._lastmodified = od.getTime();
            pluginInstance.config[observation['propId']] = observation['newvalue'];
            var context = {bc: self.bc, observationsCnfg: pluginInstance.observations,
                thingInstance: pluginInstance.config, logger: logger};
            async.series([plugIn.stop.bind(plugIn),
                async.apply(plugIn.start.bind(plugIn), context)],
                function (err) {
                    if (err) {
                        if(self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError){
                            self.sendPluginError(id, err);
                        }                              
                        complete(err);
                    } else {
                        logger.debug(util.format("Updated plugIn %s last modified at %s property %s from %s to %s"),
                            id, od, observation['propId'], pluginInstance.config[observation['propId']],
                            observation['newvalue']);
                        complete(null);
                    }
                });
        }else{
            logger.debug(util.format("Updated not called plugIn %s last modified at %s property has same value %s old %s new %s"),
                id, od, observation['propId'], pluginInstance.config[observation['propId']],
                observation['newvalue']);
            complete(null);
        }
    }

    function newPlugIn() {
        //"resourceuri": "/amtech/things/entities/cardemo",
        self.dapClient.getThing(observation['resourceuri'],
            function (err, instance) {
                if (err) {
                    logger.error(util.format("Error Getting a new  plugin %s id %s information error: %s", pluginName,
                        self.observs.getResourceName(observation['resourceuri']), err.message));
                    //send error
                    if(self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError){
                        self.sendPluginError(pluginName, err);
                    }
                    complete(err);
                } else {
                    try {
                        var pluginName = self.observs.getResourceName(instance['@type']);
                        //was created in parallel
                        if (self.plugins.get(pluginName).instances.has(id)) {
                            updatePlugIn();
                        } else {
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
                                        if(self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError){
                                            self.sendPluginError(pluginName, err);
                                        } 
                                        complete(err);
                                    } else {
                                        logger.debug(util.format("Created a new  plugin type %s with id", pluginName, id));
                                    }
                                });

                        }
                    } catch (err) {
                        logger.error(util.format("Error Creating a new  plugin %s id %s information error: %s", pluginName,
                            self.observs.getResourceName(observation['resourceuri']), err.message));
                            
                        if(self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError){
                            self.sendPluginError(pluginName, err);
                        } 
                        complete(err);
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
            if (self.plugins.get(pluginName).instances.has(id)) {
                self.plugins.get(pluginName).instances.remove(id);
                plugIn.stop(function (err) {
                    if (err) {
                        logger.error(util.format("Error Deleting a plugin %s id %s error: %s", pluginName, id, err.message));
                        //send error
                        if(self.bc.pluginLoad && self.bc.pluginLoad.sendM2mBridgeError){
                            self.sendPluginError(pluginName, err);
                        } 
                        complete(err);
                    } else {
                        logger.debug(util.format("Delete a plugin type %s with id", pluginName, id));
                    }
                    complete(null);
                });
            } else {
                complete(null);
            }
            break;
    };
};

Plugins.prototype.stop = function (plugIn, complete) {
    if(plugIn){
        plugIn.stop(function (err) {
            complete(err);
        });
    }else{
        complete(null);
    }
};

Plugins.prototype.closeWS = function (complete) {
    if(this.ccAsyncWS){
        this.ccAsyncWS.endConnection(complete);
    }else{
        complete(null);
    }
};

Plugins.prototype.stopPlugIns = function (complete) {
    var self = this;
    if (self.plugins) {
        self.closeWS(function (err) {
            var instances = self.getInstances();
            async.each(instances, Plugins.prototype.stop.bind(self),
                function (err) {
                    if(err){
                        logger.error(err.message);
                    }
                    complete(err);
                });
        });
    }
};

Plugins.prototype.reconnectWS = function (complete) {
    this.connectWS(complete);
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

Plugins.prototype.restartPlugIn = function (pginInstance) {
    var self = this;
    process.nextTick(function () {
        //get plugin instance
        var pluginName = self.observs.getResourceName(pginInstance['@type']);
        var instanceId = self.observs.getResourceName(pginInstance['@id']);
        var pluginInstance = self.plugins.get(pluginName).instances.get(instanceId).instance;
        var observationsCnfg = self.plugins.get(pluginName).instances.get(instanceId).observations;
        var thingInstance = self.plugins.get(pluginName).instances.get(instanceId).config; 
        
        pluginInstance.stop(function(err){
            if(err){
                logger.error(util.format("At stopping for restarting plugin %s id %s error: %s", pluginName, instanceId, err.message));
            }else{
                var restartInterval = 
                    setInterval(function () {
                        var context = {bc: self.bc, 
                            observationsCnfg: observationsCnfg,
                            thingInstance: thingInstance, 
                            logger: logger};
                        pluginInstance.start(context, function(err){
                            if(!err){
                                clearInterval(restartInterval);
                                logger.debug(util.format("Restarted plugin %s id %s successfully", pluginName, instanceId));
                            }else{
                                logger.error(util.format("At starting for restarting plugin %s id %s error: %s", pluginName, instanceId, err.message));
                            }
                        });},  
                        self.bc.networkFailed.reconnectWait);      
            }

        }); 
    });
};

module.exports = {
    Plugins: Plugins
};
