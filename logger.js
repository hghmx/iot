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
var winston = require('winston');
var logger = null;
function initLogger() {
    var cnfg = require('./config').config;
    function setLogger() {
        var theLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({
                    colorize: (typeof cnfg !== 'undefined' && cnfg) ? cnfg.bc.logger.colorize : true,
                    level: (typeof cnfg !== 'undefined' && cnfg) ? cnfg.bc.logger.level : 'info'
                })]
        });
        theLogger.on('error',
            function (err) {
                console.error(err);
            });
        return theLogger;
    }
    if (!cnfg.bc) {
        cnfg.initSync();
        return setLogger();
    } else {
        return setLogger();
    }
}

logger = logger || initLogger();
module.exports = {
    logger: logger
};
