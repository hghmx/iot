"use strict";
var websocket = require("websocket");
var logger = require('./logger').logger;
var util = require('util');
function DapWs( bc, url, onMessage, pluginName ){     
    this.bc = bc;
    this.url = url;
    this.onMessage = onMessage;
    this.pluginName = pluginName;
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

DapWs.prototype.retry = function() {
    var self = this;
    if (self.reconnectInterval) {
        clearInterval(self.reconnectInterval);
        self.reconnectInterval = null;
    }
    self.reconnectInterval = setTimeout(function() {
        self.connect();
    }.bind(self), self.bc.networkFailed.reconnectWait);
};

DapWs.prototype.close = function (reasonCode, description) {
    logger.error( util.format("Web socket %s close %d %s", this.url, reasonCode, description));
    this.connection = null;
    this.retry();
};

DapWs.prototype.error = function (err) {
    logger.error( util.format("Web socket url %s error %d", this.url, err));
    this.connection = null;
    this.retry();
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
