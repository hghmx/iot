/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var async = require('async');
var bridge =require('./bridge');
var extend = require('util')._extend;
function done(err, results) {
    var logger = require('./logger').logger;
    if (err) {
        logger.error("Exit with error: " + err.message);
    } else {
        logger.info(m2mB.bc.description + ' id: ' + m2mB.bridgeId.bridgeId + ' started with parameters...'); 
        var cnfgShow = extend({}, m2mB.bc);
        delete cnfgShow['dap']['password'];
        logger.info(JSON.stringify(cnfgShow, undefined, 4)); 
        logger.info("Started the following services " + JSON.stringify(results, undefined, 4));
        m2mB.stop();
        m2mB.run();
    }
}

var m2mB = new bridge.Bridge();
async.series([bridge.Bridge.prototype.init.bind(m2mB),
    bridge.Bridge.prototype.getConfiguration.bind(m2mB), 
    bridge.Bridge.prototype.initDispatcher.bind(m2mB), 
    bridge.Bridge.prototype.getObservsConfiguration.bind(m2mB), 
    bridge.Bridge.prototype.loadPlugIns.bind(m2mB)], 
    done );
