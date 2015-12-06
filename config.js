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
var configFile ='./bridgeConfig.json';
var singleton = null;
function Config (){
    this.bc = null;   
}
Config.prototype.validateDapConfig = function () {
    if(!this.bc.dap){
       throw new Error("dap is a required configuration parameter");
    }
    if(!this.bc.dap.dapUrl){
         throw new Error("dapUrl is a required configuration parameter");
    }
    if(!this.bc.dap.userId){
         throw new Error("userId is a required configuration parameter");
    }
    if(!this.bc.dap.tenant){
        throw new Error("tenant is a required configuration parameter");
    }
    if(!this.bc.dap.password){
         throw new Error("password is a required configuration parameter");
    }              
};

Config.prototype.get = function () {
    return this.bc;
};

Config.prototype.init = function ( complete ) {
    var _self = this;
    this.bc = null;   
    fs.readFile(configFile, function (er, data) {
        if(er){
            complete( new Error("AMTech M2M Bridge requieres a bridgeConfig.json to start"));
        }else{
            _self.bc = JSON.parse(data.toString());
            if(!_self.bc.description){
                _self.bc.description = "AMTech M2M Bridge";
            }
            try{
                _self.validateDapConfig();
                complete(null, _self.bc);
            }catch(e){
                complete(e);
            }
        }
    });
};

Config.prototype.initSync = function ( ) {
    var _self = this;
    this.bc = null;   
    var data = fs.readFileSync(configFile);
    _self.bc = JSON.parse(data.toString());
    if(!_self.bc.description){
        _self.bc.description = "AMTech M2M Bridge";
    }
    _self.validateDapConfig();
};


singleton = singleton || new Config();
module.exports = {
    config : singleton,
    configObject : Config        
};


