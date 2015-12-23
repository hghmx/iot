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

var spinner = require('simple-spinner');
spinner.start();
var async = require('async');
var bridge =require('./bridge');
var extend = require('util')._extend;
var util = require('util');
var logger;


var m2mB = new bridge.Bridge();
async.series([bridge.Bridge.prototype.init.bind(m2mB),
    bridge.Bridge.prototype.getConfiguration.bind(m2mB), 
    bridge.Bridge.prototype.initDispatcher.bind(m2mB), 
    bridge.Bridge.prototype.getObservsConfiguration.bind(m2mB), 
    bridge.Bridge.prototype.loadPlugIns.bind(m2mB)], 
    done );
    
    
function done(err, results) {
    logger = require('./logger').logger;
    if (err) {
        logger.error("Exit with error: " + err.message);
        exitHandler({cleanup:true, exit:true}, null);
    } else {
        process.on('exit', exitHandler.bind(null,{cleanup:true}));
        process.on('SIGINT', exitHandler.bind(null, {exit:true, exitCode:2}));
        process.on('uncaughtException', exitHandler.bind(null, {exit:false, exitCode:99}));

        logger.info(m2mB.bc.description + ' id: ' + m2mB.bridgeId + ' started with parameters...'); 
        var cnfgShow = extend({}, m2mB.bc);
        delete cnfgShow['dap']['password'];
        logger.info(util.inspect(cnfgShow)); 
        logger.info("Started the following services...");
        logger.info(util.inspect(results));
        spinner.stop();
        m2mB.run();
    }
}

function exitHandler(options, err) {
    spinner.stop();
    if (options.cleanup){
        m2mB.stop();
        logger.info('Stopped plugins...');
    }
    if (err && typeof err ===  'object'){
         logger.error(err.stack);
    }
    if (options.exit){
        if(options.exitCode===2){
            logger.info('Ctrl+C');
        }
        process.exit(options.exitCode);
    }
}    
    
