"use strict";
var ws = require('ws');
var singleton = null;
function DapWs( bc, onMessage, url, complete  ){     
    this.bc = bc;
    this.url = url;
    this.connect(complete);
    this.onMessage = onMessage;
}

DapWs.prototype.connect = function (complete) {
    var self = this;
    if(self.reconnectInterval){
        clearInterval(self.reconnectInterval);
    }
    self.ws = new ws(this.url);
    self.ws.on('open', function() {
        self.ws.on('message', DapWs.prototype.message.bind(this));       
        self.ws.on('error', DapWs.prototype.error.bind(this));
        self.ws.on('close', DapWs.prototype.error.bind(this));
        complete(null);
    });
    this.ws.once('error', function( err ) {
        complete(err);
    });
};

DapWs.prototype.message = function (data, flags) {
    this.onMessage(data);
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

var replaceUrlParams = (function()
{
    var replacer = function(context)
    {
        return function(s, name)
        {
            return context[name];
        };
    };

    return function(input, context)
    {
        return input.replace(/\#{(\b(|deviceId|tenantId|userId)\b)\}/g, replacer(context));
    };
})();
