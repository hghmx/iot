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
singleton = singleton || new Config();
module.exports = {
    config : singleton,
    configObject : Config        
};


