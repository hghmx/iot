/*******************************************************************************
 * Copyright (C) 2015 AmTech.
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *******************************************************************************/
var mosca = require('mosca');
var util = require('util');
var clone = require('clone');

function MQTT() {
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
MQTT.prototype.start = function function (context, complete){
    try {
        var self = this; 
        self.observationsCnfg = context.observationsCnfg;
        
        if (context.logger) {
            this.logger = context.logger;
        }
        var moscaSettings = {
            port: context.thingInstance.mqttPort.mqttPort,
            persistence: {
                factory: mosca.persistence.LevelUp,
                path: " ./mqtt-msg/messages.db",
                keyEncoding:'json',
                valueEncoding: 'json'
            }
        };
        
        self.server = new mosca.Server(moscaSettings);
        //var db = new mosca.persistence.LevelUp({ path: " ./mqtt-msg/messages.db",keyEncoding:'json',valueEncoding: 'json' });
        //db.wire(self.server); 
        
        self.server.on('ready', function(){  
            if(context.thingInstance.deviceUserName && 
                context.thingInstance.devicePassword){
                server.authenticate = self.authenticate.bind(self);
            }
            complete(null);
        });
        
        self.server.on('published', function(packet, client) {      
            self.sendMessage(packet, client);
        });
        
    } catch (e) {
        complete(e);
    }
};

MQTT.prototype.authenticate = function(client, username, password, callback){
    var authorized = (username === 'alice' && password.toString() === 'secret');
    if (authorized) client.user = username;
    callback(null, authorized);   
}

MQTT.prototype.sendMessage = function(packet, client){
    var mqttMsg = this.newMQTTMessage(packet);
    this.sendObservation(this, mqttMsg);
}

/**
 * Method called from the bridge to stop the work session. It's used to release resources like network connections.
 * 
 * @param complete function
 */
MQTT.prototype.stop = function (complete) {
    try {
        this.server.close(function(){
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
MQTT.prototype.command = function (observation, complete) {        
    try {
        if (observation["@type"] === "/amtech/linkeddata/types/composite/observation/MQTTMessage") {
 
            var message = {
              topic: observation.mqttTopic,
              payload: observation.mqttPayload, // or a Buffer
              qos: 0, // 0, 1, or 2
              retain: false // or true
            }; 
            self.server.publish(message, function() {
                console.log('done!');
            }); 
            
        } else {
            complete(new Error("MQTTBroker support commands of observations type MQTTMessage"));
        }
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.newMQTTMessage = function (packet) {   
    var mqttMessage = clone(   {
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

module.exports.MQTT = MQTT;