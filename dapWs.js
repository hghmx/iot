"use strict";
var ws = require('ws');
var singleton = null;
function DapWs( url, onMessage, pluginName ){     
    this.url = url;
    this.onMessage = onMessage;
    this.pluginName = pluginName;
}

DapWs.prototype.connect = function (complete) {
    var self = this;
    if(self.reconnectInterval){
        clearInterval(self.reconnectInterval);
    }
    self.ws = new ws(this.url);
    self.ws.on('open', function() {
        self.ws.on('message', DapWs.prototype.message.bind(self));       
        self.ws.on('error', DapWs.prototype.error.bind(self));
        self.ws.on('close', DapWs.prototype.error.bind(self));
        complete(null);
    });
    this.ws.once('error', function( err ) {
        complete(err);
    });
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
    this.retry();
};

DapWs.prototype.error = function (err) {
    this.ws.close();
    this.retry();
};

module.exports = {
    DapWs : DapWs            
};
