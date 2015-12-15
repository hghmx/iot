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
var websocket = require("websocket");
var logger = require('./logger').logger;
var util = require('util');
function DapWs( bc, url, onMessage, pluginName, onError ){     
    this.bc = bc;
    this.url = url;
    this.onMessage = onMessage;
    this.pluginName = pluginName;
    this.onError = onError;
    this.connected = false;
    this.authorization =  new Buffer(bc.dap.userId + '/' + bc.dap.tenant + ":" + bc.dap.password).toString("Base64");
    this.connection = null;
}

DapWs.prototype.connect = function (complete) {
    try {
        this.wsclient = new websocket.client();
        var self = this;
        if (self.reconnectInterval) {
            clearInterval(self.reconnectInterval);
        }
        this.wsclient.on("connectFailed", function (error) {
            complete(error);
        });
        this.wsclient.on("connect", function (connection) {
            connection.on("error", DapWs.prototype.error.bind(self));
            connection.on("close", DapWs.prototype.close.bind(self));
            connection.on("message", DapWs.prototype.message.bind(self));
            logger.debug('Connected web socket : ' + self.url);
            self.connection = connection;
            complete(null);
        });

        this.wsclient.connect(this.url, null, null, {"Authorization": "Basic " + this.authorization});
    } catch (e) {
        complete(e);
    }
};

DapWs.prototype.message = function (data) {   
    if(data.type=== "utf8"){
        var observation = JSON.parse(data.utf8Data); 
        this.onMessage(this.pluginName, observation, function(err){
            if(err){
                logger.error( "Error processing command " + err.message);
            }
        });       
    }else{
        logger.error( util.format("Error wrong data format %s from %s",data.type, this.url ));
    }
    
};

DapWs.prototype.close = function (reasonCode, description) {
    logger.error( util.format("Web socket %s close %d %s", this.url, reasonCode, description));
    this.connection = null;
    this.retry();
};

DapWs.prototype.error = function (err) {
    this.connection = null;
    this.onError(this.url, err);
};

DapWs.prototype.endConnection = function ( complete) {
    if(this.connection){
        this.connection.close();
    }
    complete(null);
};

module.exports = {
    DapWs : DapWs            
};
