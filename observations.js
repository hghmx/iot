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
var levelup = require('levelup', {keyEncoding:'json',valueEncoding: 'json'});
var uuid = require('uuid');

var async = require('async');
var dapClient = require('./dapClient').DapClient;
var logger = require('./logger').logger;
var util = require('util');
var hashMap = require('hashmap');
var clone = require('clone');
var dapReconnect = require('./reconnectDAP').reconnectDAP;

function Observations(bc, dapClient) {
    this.bc = bc;
    this.dapClient = dapClient;
    //this.recCount = 0;
    if(logger && logger.transports.console.level === "debug"){
        this.osCounter = 0;
    }
}

Observations.prototype.getConfiguration = function (complete) {
    var _self = this;
    this.dapClient.getConfiguration(function (err, results) {
        if (err) {
            complete(err);
        } else {
            if (results.length === 0) {
                complete(new Error(util.format('The M2MBridge user id %s has no configuration', _self.bc.dap.userId)));
            }
            //Auto discovery...
            if(_self.bc.autoDiscover && _self.bc.autoDiscover.execute){                
                async.series([ async.apply( Observations.prototype.doAutoDiscovery.bind(_self), results),
                               async.apply( Observations.prototype.generateSensorConfig.bind(_self), results)],
                               function(err, results){
                                    if (err) {
                                        complete(err);
                                    } else {
                                        _self.setTypesConfiguration(results[1], complete);
                                    }    
                            });
            }else{
                _self.generateSensorConfig(results, function (err, config) {
                    if (err) {
                        complete(err);
                    } else {
                        _self.setTypesConfiguration(config, complete);
                    }
                });
            }
        }
    });
};

Observations.prototype.setTypesConfiguration = function ( config, complete) {
    var _self = this;
    var pluginsType = config.values();
    for (var i = 0; i < pluginsType.length; i++) {
        if (pluginsType[i].instances.values().length === 0) {
            config.remove(pluginsType[i].name);
            logger.warn(util.format(
                'The M2MBridge with user id %s has no instances for plugin type %s' ,
                            _self.bc.dap.userId, _self.getResourceName(pluginsType[i].id)));
        }
    }
    _self.typesConfiguration = config;
    complete(null, "Retrieved Things types and instances information");    
};

Observations.prototype.stopDispatch = function (complete) {
    if (this.qObservations) {
        this.qObservations.close(function (err) {
            complete(err);
        });
    }
};

Observations.prototype.dispatch = function (complete) {   
    var self = this;
    
    levelup('./data/observation.db', {keyEncoding:'json'}, function (err, db) {
      if (err){
          complete(err);
      }else{
        dapReconnect.init(self.bc, self);
        self.qSendJobs = async.queue(Observations.prototype.sendJob.bind(self), 3);
        self.qObservations = db;  
        self.qObservations.on('open', function(){
            self.sendJobsPending( function(result){
                complete(result, "Observations dispatcher initialized");
            });
        });
        //self.qObservations.on('put', Observations.prototype.dispatchJob.bind(self));
        self.dispatching = true;      
      }
    });   
};

Observations.prototype.pauseDispatch = function (msgError) {
    var self = this;
    if(self.dispatching){
        logger.info('PAUSE DISPATCHING Observations');
        self.dispatching = false;
        self.qSendJobs.pause();
        //Queue existing workers
        self.qSendJobs.workersList().forEach(function(worker){
            logger.debug(util.format("QUEUE observation from PAUSE DISPATCH type: %s", worker.data["@type"]));
            self.queueObservation(worker.data); 
        });
        
        //Queue existing tasks 
        self.qSendJobs.tasks.forEach(function(worker){
            logger.debug(util.format("QUEUE observation from PAUSE DISPATCH type: %s", worker.data["@type"]));
            self.queueObservation(worker.data); 
        });
        
        ///Kill pending jobs
        self.qSendJobs.kill();
        dapReconnect.reconnect(msgError, function(err, msg){
            if(err){
                logger.error(err.message);
            }else{
                logger.info(msg);
            }
        });               
    }
};

Observations.prototype.resumeDispatch = function (complete) {
    var self = this;
    if(!self.dispatching){
        logger.info('RESUME DISPATCHING Observations');
        self.dispatching = true;
        self.sendJobsPending(function(err){
            if(err){
                self.dispatching = false;
            }else{
                self.qSendJobs.resume();
            }
            complete(err);
        });
    }else{
        call(null);
    }
};

Observations.prototype.sendJobsPending = function (complete) {
    var self = this;   
    var endStream = false;
    var inPause = false;
    if(!self.dispatching) return;
    var rs = self.qObservations.createReadStream({keyEncoding:'json',valueEncoding: 'json'})
        .on('data', function (data) {
            rs.pause();
            inPause = true;
            async.series([async.apply(self.sendJob.bind(self), data.value), 
                          async.apply( self.qObservations.del.bind(self.qObservations), data.key)],
                function(err){
                     if(err){
                        logger.error(err);
                        rs.destroy();
                    }else{
                        if(logger && logger.transports.console.level === "debug"){
                            try{
                                self.osCounter++;
                            }catch(e){
                                self.osCounter = 0;
                            }
                            logger.debug(util.format("[ %d ] TOTAL MESSAGES sent", self.osCounter));
                        }
                        logger.info(util.format("Producer %s Sent pending observations job id %s type: %s", 
                                     data.value["producer"],data.key, data.value["@type"]));
                        rs.resume();
                        if(endStream){
                            logger.info('End sending pending observations');
                            complete(null); 
                        }
                    } });
        })
        .on('error', function (err) {
            logger.error(err);
            complete(err);
        })
        .on('end', function () {
            if(inPause){
                endStream = true;
            }else{
                logger.info('End sending pending observations');
                complete(null); 
            }
        });
};

Observations.prototype.sendJob = function (value, callback) {
    var self = this;
    var hasCallback = typeof(callback) === 'function';
    try {
        self.dapClient.sendObservation( value, 
            function (err) {
                if (err) {
                    logger.error(util.format("Error %s sending observation type %s", err.message, value['@type']));
                    if (err instanceof Error && err.code && err.code === 403) {
                        logger.error(util.format('Access control error: ', err.message));
                        if(hasCallback) callback(null);
                    } else{                                               
                        var error = new Error(util.format("Error sending observation type %s reconnectiing", value['@type']));                        
                        pauseDispatch(error.message);
                        if(hasCallback) callback(error);
                    }          
                } else {
                    if(hasCallback) callback(null);
                }
            });
    } catch (err) {
        if(hasCallback){
            callback(err);
        }
        logger.error(err);
    }
};

Observations.prototype.send = function (observation) {
    var self = this;
    observation = self.setSecurity(observation);
    observation = self.setLocation(observation);
    if(self.dispatching){
//        self.recCount++;
//        if(self.recCount === 10){
//            self.pauseDispatch("Testing reconnection...");
//            logger.debug(util.format("QUEUE observation from SEND type: %s", observation["@type"]));
//            self.queueObservation(observation);  
//            return;
//        }
        logger.debug(util.format("QUEUE->Worker observation from SEND type: %s", observation["@type"]));
        self.qSendJobs.push(observation, function(err){
            if(err){
                logger.err('Sending observation type: ' + observation['@type']);
            }else{
                if(logger && logger.transports.console.level === "debug"){
                    try{
                        self.osCounter++;
                    }catch(e){
                        self.osCounter = 0;
                    }
                    logger.debug(util.format("[ %d ] TOTAL MESSAGES sent", self.osCounter));
                }
                logger.info(util.format("Sent observation producer: %s type: %s", observation["producer"],observation["@type"]));
            }          
        });
    }else{
        logger.debug(util.format("QUEUE observation from SEND type: %s", observation["@type"]));
        self.queueObservation(observation);       
    }
};

Observations.prototype.queueObservation = function (observation) {   
    this.qObservations.put(uuid.v4(), observation, {keyEncoding:'json',valueEncoding: 'json'},function (err) {
                         if (err) {
                             logger.error(err);
                         } else {
                             logger.debug('enqueued observation type: ' + observation['@type']);
                         }
                     });           
};

Observations.prototype.setSecurity = function (resource) {
    if(this.bc.guestSecurity){ 
        if(this.bc.guestSecurity.guesttenants && this.bc.guestSecurity.guesttenants.length > 0){
            resource.guesttenants = 
                resource.guesttenants.concat(this.bc.guestSecurity.guesttenants);
        }
        if(this.bc.guestSecurity.guestusers && this.bc.guestSecurity.guestusers.length > 0){
            resource.guestusers=
                resource.guestusers.concat(this.bc.guestSecurity.guestusers);
        }       
    } 
    return resource;
};

Observations.prototype.setLocation = function (resource) {
    if(!resource.location || resource.location.length<=0 && this.bc.location){
        resource.location = this.bc.location;
    }
    return resource;
};

Observations.prototype.generateSensorConfig = function (jsonCnfg, complete) {
    var cnfg = new hashMap();
    var self = this;
    async.each(jsonCnfg, async.apply(Observations.prototype.getPluginTypeInstances.bind(self), cnfg),
            function (err) {
                if (err) {
                    complete(err);
                } else {
                    complete(null, cnfg);
                }
            });
};

Observations.prototype.fillTypePlaceholder = function (phString, placeHolders) {

    var replaceClientPlaceholders = (function ()
    {
        var replacer = function (context)
        {
            return function (s, name)
            {
                return context[name];
            };
        };

        return function (input, context)
        {
            return input.replace(/\#{(\b(|deviceId|tenantId|userId|typeId)\b)\}/g, replacer(context));
        };
    })();

    return replaceClientPlaceholders(phString, placeHolders);
};

Observations.prototype.fillInstancePlaceholder = function (phString, placeHolders) {

    var replaceClientPlaceholders = (function ()
    {
        var replacer = function (context)
        {
            return function (s, name)
            {
                return context[name];
            };
        };

        return function (input, context)
        {
            return input.replace(/\#{(\b(|thingId)\b)\}/g, replacer(context));
        };
    })();
    return replaceClientPlaceholders(phString, placeHolders);
};

Observations.prototype.getPluginTypeInstances = function (cnfg, config, complete) {
    var _self = this;
    var plugName = _self.getResourceName(config.entitytype);
    var properties = new hashMap();
    var observations = new hashMap();
    var placeHolders = {deviceId: this.bc.bridgeId,
        tenantId: this.bc.dap.tenant,
        userId: this.bc.dap.userId,
        typeId: plugName};

    config.observationsproducedconfig.members.forEach(function (observation) {
            var tt = [];
            if (observation.thingsconfig && Array.isArray(observation.thingsconfig)) {
                observation.thingsconfig.forEach(function (targetThing) {
                    targetThing.resourceId = _self.fillTypePlaceholder(targetThing.resourceId, placeHolders);
                    var tThing = {thingType: targetThing.resourcetype, thingsId: [targetThing.resourceId]};
                    if(targetThing.proximityarea && ['#{llrpReaderProximity}', '#{antennaProximity}'].indexOf(targetThing.proximityarea) !== -1){
                        tThing.proximityarea = targetThing.proximityarea;
                    }
                    
                    tt.push(tThing);
                });
            } else {
                tt.push({thingType: config.entitytype, thingsId: ['#{thingId}']});
            }
            observations.set(observation._name, {name: observation._name,
                topicschema: observation.topicschema ?
                        _self.fillTypePlaceholder(observation.topicschema, placeHolders) :
                        util.format('m2mBridge/%s/#{thingId}', plugName),
                producerschema: observation.producerschema ?
                        _self.fillTypePlaceholder(observation.producerschema, placeHolders) : config._name,
                thingsconfig: JSON.stringify(tt)});
        });

    cnfg.set(plugName, {name: plugName, id: config['entitytype'], properties: properties, instances: new hashMap()});
    
    _self.dapClient.getPluginsInstances(config.entitytype,
            function (err, instances) {
                if (err) {
                    complete(err);
                } else {
                    instances.forEach(function (instance) {
                        var ph = {'thingId': instance._name};
                        var iobs = clone(observations);
                        iobs.forEach(function (observation) {
                            observation.topicschema = _self.fillInstancePlaceholder(observation.topicschema, ph);
                            observation.producerschema = _self.fillInstancePlaceholder(observation.producerschema, ph);
                            observation.thingsconfig = _self.fillInstancePlaceholder(observation.thingsconfig, ph);
                        });
                        cnfg.get(plugName).instances.set(_self.getResourceName(instance['@id']), {config: instance, observations: iobs});

                    });
                    complete(null, cnfg);
                }
            });
};

Observations.prototype.getResourceName = function (typeurl) {
    return (typeurl) ? typeurl.substr(typeurl.lastIndexOf("/") + 1) : undefined;
};

Observations.prototype.doAutoDiscovery = function (jsonCnfg, complete) {
    var self = this;
    if( !this.bc.autoDiscover.instances){
        complete(new Error("Auto discovery configuration set to execute, but have not instances set"));
    }
    var postInstances = [];
    jsonCnfg.forEach(function( config){
        var plugName = self.getResourceName(config.entitytype);
        if( self.bc.autoDiscover.instances[plugName]){    
            postInstances = postInstances.concat(self.bc.autoDiscover.instances[plugName]);
        }else{
            logger.warn(util.format("Plugin type  %s has no instances set for auto discovering" , plugName));            
        }
    });
    if(postInstances.length > 0){
        async.each(postInstances, Observations.prototype.newInstance.bind(self),
            function (err) {
                if (err) {
                    complete(err);
                } else {
                    complete(null);
                }
            });        
    }else{
        complete(null);
    }
};

Observations.prototype.newInstance = function (ni, complete) {
    ni = this.setSecurity(ni);
    ni = this.setLocation(ni);    
    this.dapClient.newInstance(ni, function (err, data) {
        if (err) {
            if (data.errorType === "amtech.utils.model.ResourceAlreadyExistException") {
                logger.info(util.format("Plugin type %s instance id %s already exist", ni['@type'], ni['@id']));
                complete(null);
            } else {
                complete(err);
            }
        } else {
            logger.info(util.format("Plugin type %s instance id %s created", ni['@type'], ni['@id']));
            complete(null);
        }
    });
};

module.exports = {
    Observations: Observations
};
