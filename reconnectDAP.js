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
var singleton = null;
var ping = require('ping');
var logger = require('./logger').logger;
var util = require('util');
var async = require('async');
function ReconnectDAP() {
    this.reconnecting = false;
}

ReconnectDAP.prototype.init = function (bc, observations, plugins) {
    this.bc = bc;
    this.observations = observations;
    this.plugins = plugins;
};

ReconnectDAP.prototype.resumeDispatch = function (complete) {
    var self = this;
    self.observations.resumeDispatch(function (err) {
        if (err) {
            logger.error("Error resuming dispatching");
            complete(err);
        } else {
            logger.info("Resume dispatching..");
            complete(null);
        }
    });
};

ReconnectDAP.prototype.reconnectWS = function (complete) {
    var self = this;
    self.plugins.reconnectWS(
        function (err) {
            if (err) {
                logger.error("Error reconnecting bridge websocket");
                complete(err);
            } else {
                logger.info("Reconnected bridge websocket");
                complete(null);
            }
        });
};

ReconnectDAP.prototype.reconnect = function (errMessage, complete) {
    var self = this;
    if (!self.reconnecting) {
        self.reconnecting = true;
        logger.error(util.format("Reconnecting to AMTech Servers after error %s", errMessage));
        var isAlive = false;
        async.whilst(
            function () {
                return !isAlive;
            },
            function (callback) {
                ping.sys.probe(self.bc.dap.dapUrl.split('//')[1], function (alive) {
                    isAlive = alive;
                    callback(null, isAlive);
                });
            },
            function (err, res) {
                if (err) {
                    logger.error(util.format("Error pinging %s reconnecting", this.bc.dap.dapUrl));
                    complete(err);
                } else if (isAlive) {
                    logger.info("SEEN AMTech server and reconnecting");
                    var funcs = [];
                    if(self.observations){
                        funcs.push(self.resumeDispatch.bind(self));
                        
                    }
                    if(self.plugins){
                        funcs.push(self.reconnectWS.bind(self));
                    }
                    
                    if(funcs.length> 0){
                        async.series(funcs, 
                            function(err){
                                if(!err){
                                    self.reconnecting = false;
                                }
                                complete(err, "RECONNECTED to AMTech Server..." );
                            });
                    }else{
                        self.reconnecting = false;
                        complete(null, "RECONNECTED to AMTech Server...");
                    }                    
                }
            });
    } else {
        complete(null, "Reconnecting to AMTech Server in process");
    }
};

singleton = singleton || new ReconnectDAP();
module.exports = {
    reconnectDAP : singleton,
    reconnectDAPObject : ReconnectDAP        
};
