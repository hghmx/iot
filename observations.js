"use strict";
var tinq = require('tinq');
var client = tinq('./data');
var queueObservations = "observations";
var jobSend = "send";
var async = require('async');
var dapClient = require('./dapClient').DapClient;
var logger = require('./logger').logger;
var util = require('util');
var hashMap = require('hashmap');
var clone = require('clone');

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
                                    , _self.bc.dap.userId, _self.getResourceName(pluginsType[i].config.thingtype))));
                        }
                    }
                    _self.typesConfiguration = config;
                    complete(null, "Retrieved Things types and instances information");
                }
            });
        }
    });
};

Observations.prototype.dispatch = function () {
    this.worker = client.worker([queueObservations]);
    this.worker.register({
        send: Observations.prototype.sendJob.bind(this)});
    this.worker.on('error', Observations.prototype.errorOnWorker.bind(this));
    this.worker.on('failed', Observations.prototype.errorOnWorker.bind(this));
    this.worker.start();
    return true;
};

Observations.prototype.sendJob = function (params, callback) {
    var self = this;
    try {
        if (self.reconnectInterval) {
            clearInterval(self.reconnectInterval);
        }
        async.retry(
                {times: this.bc.networkFailed.retries, interval: this.bc.networkFailed.failedWait},
        async.apply(dapClient.prototype.sendObservation.bind(this.dapClient), params),
                function (err) {
                    if (err) {
                        logger.error(util.format("Error %s sending observation type %s", err.message, params['@type']));
                        if (err instanceof Error && err.code && err.code === 403) {
                            callback();
                        } else {
                            self.reconnectInterval = setInterval(function () {
                                self.sendJob(params, callback);
                            },
                                    self.bc.networkFailed.reconnectWait);
                        }
                    } else {
                        logger.debug('sent observation: ' + params['@type']);
                        callback();
                    }
                });
    } catch (err) {
        callback(err);
    }
};

Observations.prototype.errorOnWorker = function (error) {
    logger.error(error);
};

Observations.prototype.send = function (observation) {
    try {
        var queue = client.queue(queueObservations);
        queue.enqueue(jobSend, observation, function (err, job) {
            if (err) {
                logger.error(err);
            } else {
                logger.debug('enqueued observation type: ' + job.data.params['@type']);
            }
        });
    } catch (err) {
        logger.error(err);
    }
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

    config.properties.members.forEach(function (property) {
        properties.set(property._name, {name: property._name, value: property.propertyvalue});
    });

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
    
    _self.dapClient.getPluginsInstances(config.thingtype,
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
