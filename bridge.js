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
var fs = require('fs');
var async = require('async');
var rObservationConfiguration = 2;
var jobsDir = './data';
var bridgeId = './data/bridgeId.json';
var logger = require('./logger').logger;

function Bridge( ){     
    this.bc = null;    
}

Bridge.prototype.init = function (complete) {
    var _self = this;
    this.bc = null;
    var checkDir = function(done){ fs.stat(jobsDir, function (err) {
        if (err && err.code === "ENOENT") {
                fs.mkdir(jobsDir, function (e) {
                    if (e) {
                        done(e);
                    }else {
                        done(null);
                    }
                });
        }else{
            done(null);
        } 
           
    });};
    var createFirstId = function(done){fs.stat(bridgeId, function (err) {
        if (err && err.code === "ENOENT") {            
            var uuid = require('uuid');
            fs.writeFile(bridgeId, JSON.stringify({bridgeId: uuid.v4()}), 'utf8',
                    function (e) {
                        if (e) {
                            done(e)
                        }else{
                            done(null);
                        }
                    });
        }else{ 
            done(err);
        }
            
    });};
    var readId = function(done){fs.readFile(bridgeId, function (err, data) {
        if (err) {
            done(err);
        } else {
            _self.bridgeId = JSON.parse(data.toString()).bridgeId;
            done(null);
        }
    });};

    async.series([checkDir, createFirstId, readId], function (err) {
        if (err) {
            complete(err);
        } else {
            complete(null, "Check job directory and read bridge");
        }
    });
};

Bridge.prototype.getObservsConfiguration = function (complete) {
    logger.debug("Getting observations production configuration");
    this.observs.getConfiguration(complete);
};

Bridge.prototype.initDispatcher = function (complete) {
    try{
        this.observs.dispatch(complete);
    }catch(e){
        complete(e);
    }    
};

Bridge.prototype.getConfiguration = function (complete) {
    try{
        var config = require('./config').config; 
        var _self = this;
    } catch(e){
        complete(e);
    }    
    config.init(function (err, result) {
        if (err) {
            complete(err);
        } else {
            _self.bc = result;
            if(!_self.bc.bridgeId){
                _self.bc['bridgeId'] = _self.bridgeId;
            }else{
                _self.bridgeId = _self.bc.bridgeId;
            }            
            var dapClient = require('./dapClient');
            _self.dapClient = new dapClient.DapClient(_self.bc.dap.dapUrl, _self.bc.dap.userId, _self.bc.dap.tenant, _self.bc.dap.password);
            var observations = require('./observations');
            _self.observs = new observations.Observations(_self.bc, _self.dapClient);
            var plugins = require('./plugins');
            _self.plugs = new plugins.Plugins(_self.bc, _self.dapClient, _self.observs);
            
            if(_self.bc.address){
                _self.dapClient.getBoxLocation( _self.bc.address, 
                function(err, result) {
                    if(err){
                        complete(err);
                    }else{
                        if(result){
                            _self.bc['location'] = result;
                            complete(null, "Configuration loaded");
                        }                        
                    }
                } );
            }
            
        }
    });
};

Bridge.prototype.loadPlugIns = function (complete) {
    this.plugs.load(complete);
};

Bridge.prototype.run = function () {
    //Wait for end....
};

Bridge.prototype.stop = function () {
    if (this.plugs) {
        this.plugs.stopPlugIns(function (err) {
            if (err)
                throw err;
        });
    }
    if (this.observs) {
        this.observs.stopDispatch(function (err) {
            if (err)
                throw err;
        });
    }
};

module.exports = {
    Bridge : Bridge
};
