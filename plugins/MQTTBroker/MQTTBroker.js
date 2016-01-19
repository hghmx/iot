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
var fs = require('fs');
var mosca = require('mosca');
var util = require('util');
var clone = require('clone');
var msgDir = './plugins/MQTTBroker/mqttMsg';
function MQTTBroker() {
}

/**
 * Method called from the bridge at starting time. It's used to initialize the plugin and receive the initial configuration.
 * 
 * @param context{  
 *  bc config object instance
 *  observationsCnfg plugin production configuration information,
 *  thingInstance plugin thinh type instance,
 *  logger logger object instance}
 *  complete function 
 */
MQTTBroker.prototype.start = function (context, complete) {
    try {
        var self = this;
        self.observationsCnfg = context.observationsCnfg;
        self.deviceUserName = context.thingInstance.deviceUserName;
        self.devicePassword = context.thingInstance.devicePassword;
        if (context.logger) {
            this.logger = context.logger;
        }
        var moscaSettings = {
            port: context.thingInstance.mqttPort.mqttPort,
            persistence: {
                factory: mosca.persistence.LevelUp,
                path: msgDir +"/messages.db"
            }
        };

        fs.stat(msgDir, function (err) {
            if (err && err.code === "ENOENT") {
                fs.mkdir(msgDir, function (e) {
                    if (e) {
                        complete(e);
                    } else {
                        self.server = new mosca.Server(moscaSettings);
                        self.server.on('ready', self.setAuthentication.bind(self));
                        self.server.on('published', self.sendMessage.bind(self));
                        complete(null);
                    }
                });
            } else {
                self.server = new mosca.Server(moscaSettings);
                self.server.on('ready', self.setAuthentication.bind(self));
                self.server.on('published', self.sendMessage.bind(self));
                complete(null);
            }
        });
    } catch (e) {
        complete(e);
    }
};

MQTTBroker.prototype.setAuthentication = function ( ) {
    if (this.deviceUserName && this.devicePassword) {
        this.authenticate = this.authenticate.bind(this);
    }    
};

MQTTBroker.prototype.authenticate = function (client, username, password, callback) {
    var authorized = (username === this.deviceUserName && 
        password.toString() === this.devicePassword);
    if (authorized)
        client.user = username;
    callback(null, authorized);
};

MQTTBroker.prototype.sendMessage = function (packet, client) {
    var mqttMsg = this.newMQTTMessage(packet);
    this.sendObservation(this, mqttMsg);
};

/**
 * Method called from the bridge to stop the work session. It's used to release resources like network connections.
 * 
 * @param complete function
 */
MQTTBroker.prototype.stop = function (complete) {
    var self = this;
    try {
        this.server.close(function () {
            self.logger.info(util.format("Stop plugin id: %s", self['@id']));
            complete(null);
        });
    } catch (e) {
        complete(e);
    }
};

/**
 * Method called from the bridge when a command has been sent to a plugin instance
 * 
 * @param observation
 * @param complete
 */
MQTTBroker.prototype.command = function (observation, complete) {
    try {
        if (observation["@type"] === "/amtech/linkeddata/types/composite/observation/MQTTMessage") {

            var message = {
                topic: observation.mqttTopic,
                payload: observation.mqttPayload, // or a Buffer
                qos: 0, // 0, 1, or 2
                retain: false // or true
            };
            this.server.publish(message, function () {
                console.log('done!');
            });

        } else {
            complete(new Error("MQTTBroker support commands of observations type MQTTMessage"));
        }
    } catch (e) {
        complete(e);
    }
};

MQTTBroker.prototype.newMQTTMessage = function (packet) {
    var mqttMessage = clone({
        "proximityarea": "",
        "topic": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/MQTTMessage",
        "creationDate": "2016-01-06T02:01:33.704Z",
        "mqttTopic": "",
        "guesttenants": [],
        "description": "",
        "mqttPayload": "",
        "producer": "",
        "detectiontime": "2016-01-05T19:46:18.000Z",
        "@id": "/amtech/things/observations/mqttMessageForTesting",
        "occurrencetime": "2016-01-05T19:46:18.000Z"
    });

    mqttMessage.targetthings = this.observationsCnfg.get("MQTTMessage").thingsconfig;
    mqttMessage.producer = this.observationsCnfg.get("MQTTMessage").producerschema;
    mqttMessage.topic = this.observationsCnfg.get("MQTTMessage").topicschema;

    mqttMessage.mqttPayload = packet;
    mqttMessage.occurrencetime = new Date().toISOString();
    return mqttMessage;
};

module.exports.MQTTBroker = MQTTBroker;