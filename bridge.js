"use strict";
var fs = require('fs');
var async = require('async');
var rObservationConfiguration = 2;
var jobsDir = './data';
var bridgeId = './data/bridgeId.json';
var logger;

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
    this.observs.getConfiguration(complete);
};

Bridge.prototype.initDispatcher = function (complete) {
    try{
        this.observs.dispatch();
        complete(null, "Observations dispatcher initialized");
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
            logger = require('./logger').logger;
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
                        }                        
                    }
                } );
            }
            complete(null, "Configuration loaded");
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
   this.plugs.stopPlugIns(function (err) {
            if(err) throw err;
        });
};

module.exports = {
    Bridge : Bridge
};
