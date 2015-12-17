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

ReconnectDAP.prototype.init = function (bc, obsevrations, plugins) {
    this.bc = bc;
    this.obsevrations = obsevrations;
    this.plugins = plugins;
};

ReconnectDAP.prototype.reconnect = function (url, err, complete) {
    var self = this;
    if (!self.reconnecting) {
        self.reconnecting = true;
        if(self.obsevrations){
            self.obsevrations.pauseDispatch();
        }
        logger.error(util.format("Reconnecting after receiving error from Web Socket url %s error %s", url, err.message));
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
                    logger.error(util.format("Error pinging %s trying to reconnect", this.bc.dap.dapUrl));
                    complete(err);
                } else if (isAlive) {
                    if(self.obsevrations){
                        self.obsevrations.resumeDispatch();
                    }
                    if(self.plugins){
                        self.plugins.reconnectWS(
                            function (err) {
                                if (err) {
                                    logger.error("Error reconnecting web sockets or resuming observations dispatching");
                                    complete(err);
                                } else {
                                    logger.debug("Reconnected to AMTech DAP...");
                                    self.reconnecting = false;
                                    complete(null);
                                }
                            });
                    }else{
                        self.reconnecting = false;
                        complete(null);                        
                    }
                }
            });
    } else {
        logger.debug(util.format("Reconnecting after receiving error from Web Socket url %s error %s", url, err.message));
        complete(null);
    }
};

singleton = singleton || new ReconnectDAP();
module.exports = {
    reconnectDAP : singleton,
    reconnectDAPObject : ReconnectDAP        
};
