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
    this.reconnectInterval = null;
}

Observations.prototype.getConfiguration = function (complete) {
    var _self = this;
    this.dapClient.getConfiguration(function (err, results) {
        if (err) {
            complete(err);
        } else {
            if (results.length === 0) {
                complete(new Error(util.format('The M2MBridge with user id %s has no configuration', _self.bc.dap.userId)));
            }
            _self.generateSensorConfig(results, function (err, config) {
                if (err) {
                    complete(err);
                } else {
                    var pluginsType = config.values();
                    for (var i = 0; i < pluginsType.length; i++) {
                        if (pluginsType[i].instances.values().length === 0) {
                            complete(new Error(util.format('The M2MBridge with user id %s has no instances for plugin type %s'
                                    , _self.bc.dap.userId, _self.getResourceName(pluginsType[i].id))));
                        }
                    }
                    _self.typesConfiguration = config;
                    complete(null, "Retrieved Things types and instances information");
                }
            });
        }
    });
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
        self.qObservations = db;  
        self.qObservations.on('open', Observations.prototype.sendJobsPending.bind(self));
        self.qObservations.on('put', Observations.prototype.dispatchJob.bind(self));
        self.dispatching = true;
//        self.reconnectInterval = setTimeout(function () {
//            var error = new Error("Error sending observation type Testing reconnectiing");                        
//            dapReconnect.reconnect(error.message, error, 
//            function(err){
//                if(err){
//                    logger.error(err.message);
//                }
//            });}, 60000);        
        complete(null, "Observations dispatcher initialized");
      }
    });   
};

Observations.prototype.pauseDispatch = function () {
    this.dispatching = false;
};

Observations.prototype.resumeDispatch = function () {
    this.dispatching = true;
    this.sendJobsPending();
};

Observations.prototype.sendJobsPending = function () {
    var self = this;
    if(!self.dispatching) return;
    self.qObservations.createReadStream({keyEncoding:'json',valueEncoding: 'json'})
        .on('data', function (data) {            
            self.dispatchJob(data.key, data.value, function(err){
                if(err){
                     logger.error(err);
                }else{
                    // logger.debug(util.format("Resending pending observations amount %d", data.length));
                    logger.debug(util.format("Resending pending observations amount job id %s \n json: %s", data.key, 
                    JSON.stringify(data.value, undefined, 4)));
                }
            });
        })
        .on('error', function (err) {
            logger.error(err);
        })
        .on('end', function () {
            logger.info('End sending pending observations');
        });
};

Observations.prototype.dispatchJob = function (key, value, callback) {
    if (this.dispatching) {
        this.sendJob(key, value, callback);
    }
};

Observations.prototype.sendJob = function (key, value, callback) {
    var self = this;
    var hasCallback = typeof(callback) === 'function';
    try {
        if (self.reconnectInterval) {
            clearInterval(self.reconnectInterval);
        }       
        async.retry(
            {times: self.bc.networkFailed.retries, interval: self.bc.networkFailed.failedWait},
        async.apply(dapClient.prototype.sendObservation.bind(self.dapClient), value),
            function (err) {
                if (err) {
                    logger.error(util.format("Error %s sending observation type %s", err.message, value['@type']));
                    if (err instanceof Error && err.code && err.code === 403) {
                        logger.error('sent observation: ' + err.message);
                        if(hasCallback) callback(err);
                    } else if(dapReconnect && !dapReconnect.reconnecting){                    
                        var error = new Error(util.format("Error sending observation type %s reconnectiing", value['@type']));                        
                        dapReconnect.reconnect(error.message, error, function(err){
                            if(err){
                                logger.error(err.message);
                            }
                        });
                    }
                    if(hasCallback) callback(error);
                } else {                
                    logger.debug('sent observation: ' + value['@type']);
                    self.qObservations.del(key, function (err) {
                        if (err) {
                            if (hasCallback)
                                callback(err);
                        } else {
                            logger.debug(util.format("Completed and deleted job id %s observation type: %s", key, value['@type']));
                            if (hasCallback)
                                callback(null);
                        }
                    });
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
    self.qObservations.put(uuid.v4(), observation, {keyEncoding:'json',valueEncoding: 'json'},function (err) {
        if (err) {
            logger.error(err);
        } else {
            logger.debug('enqueued observation type: ' + observation['@type']);
        }
    });
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

    if(config.properties.members){ 
        config.properties.members.forEach(function (property) {
            properties.set(property._name, {name: property._name, value: property.propertyvalue});
        });
    };
    config.observationsproducedconfig.members.forEach(function (observation) {
            var tt = [];
            if (observation.thingsconfig && Array.isArray(observation.thingsconfig)) {
                observation.thingsconfig.forEach(function (targetThing) {
                    targetThing.resourceId = _self.fillTypePlaceholder(targetThing.resourceId, placeHolders);
                    tt.push({thingType: targetThing.resourcetype, thingsId: [targetThing.resourceId]});
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

module.exports = {
    Observations: Observations
};
