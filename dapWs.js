"use strict";
var websocket = require("websocket");
var logger = require('./logger').logger;
var util = require('util');
function DapWs( bc, url, onMessage, pluginName ){     
    this.url = url;
    this.onMessage = onMessage;
    this.pluginName = pluginName;
    this.connected = false;
    this.authorization =  new Buffer(bc.dap.userId + '/' + bc.dap.tenant + ":" + bc.dap.password).toString("Base64");
}

DapWs.prototype.connect = function (complete) {
    this.wsclient = new websocket.client();
    var self = this;
    if(self.reconnectInterval){
        clearInterval(self.reconnectInterval);
    }
    this.wsclient.on("connectFailed", function(error) {
        complete(error);
    });
    this.wsclient.on("connect", function(connection) {
        connection.on("error", DapWs.prototype.error.bind(self));
        connection.on("close", DapWs.prototype.error.bind(self));
        connection.on("message",  DapWs.prototype.message.bind(self));
        logger.debug( 'Connected web socket : ' + self.url);
        complete(null);
    });  
    
    this.wsclient.connect(this.url, null, null, {"Authorization": "Basic " + this.authorization});    
    
    
};

DapWs.prototype.message = function (data, flags) {
    this.onMessage(this.pluginName, data);
};

DapWs.prototype.retry = function() {
    if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
    }
    this.reconnectInterval = setTimeout(function() {
        this.connect();
    }.bind(this), this.bc.networkFailed.reconnectWait);
};

DapWs.prototype.close = function () {
    this.connected = false;
    this.retry();
};

DapWs.prototype.error = function (err) {
    logger.error( util.format("Web socket url %s error %s", this.url, err.message));
    this.connected = false;
    this.retry();
};

module.exports = {
    DapWs : DapWs            
};
