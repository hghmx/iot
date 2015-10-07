"use strict";
var tinq = require('tinq');
var client = tinq('./data');
var queueObservations = "observations";
var jobSend = "send";
var async = require('async');
var dapClient = require('./dapClient').DapClient;
var logger = require('./logger').logger;

function Observations( bc, dapClient ){
    this.bc = bc;
    this.dapClient = dapClient;
    this.reconnectInterval = null;
}

Observations.prototype.getConfiguration = function (complete) {
    var _self = this;
    async.series([dapClient.prototype.getConfiguration.bind(this.dapClient)], function (err, results) {
        if (err) {
            complete(err);
        } else {
            _self.configuration = results[0];
            complete(null, "Retrieved observation configuration");
        }
    });    
};

Observations.prototype.dispatch = function () {
    this.worker = client.worker([queueObservations]);
    this.worker.register({
        send: Observations.prototype.sendJob.bind(this)});
    this.worker.on('error', Observations.prototype.errorOnWorker.bind(this));
    this.worker.start();
    return true;
};

Observations.prototype.sendJob = function (params, callback) {
    var self = this;
    try {
        if(self.reconnectInterval){
            clearInterval(self.reconnectInterval);
        }
        async.retry(
                {times: this.bc.networkFailed.retries, interval: this.bc.networkFailed.failedWait}, 
                async.apply( dapClient.prototype.sendObservation.bind(this.dapClient), params), 
                function(err) {
                    if(err){
                        self.reconnectInterval = setInterval(function () {
                            self.sendJob(params, callback);}, 
                                self.bc.networkFailed.reconnectWait);                                
                    }else{
                        callback();
                    }
                });                
} catch (err) {
        callback(err);
    }
};

Observations.prototype.errorOnWorker = function (error) {
    logger.error(error);
};

Observations.prototype.send = function (observation) {
    var queue = client.queue(queueObservations);
    queue.enqueue(jobSend, observation, function (err, job) {
        if (err){
            logger.error(err);
        }else{
            logger.debug('enqueued:', job.data);
        }
    });
};

module.exports = {
    Observations : Observations
};
