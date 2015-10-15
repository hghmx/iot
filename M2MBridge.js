/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var spinner = require('simple-spinner');
spinner.start();
var async = require('async');
var bridge =require('./bridge');
var extend = require('util')._extend;
var util = require('util');
var logger;


var m2mB = new bridge.Bridge();
async.series([bridge.Bridge.prototype.init.bind(m2mB),
    bridge.Bridge.prototype.getConfiguration.bind(m2mB), 
    bridge.Bridge.prototype.initDispatcher.bind(m2mB), 
    bridge.Bridge.prototype.getObservsConfiguration.bind(m2mB), 
    bridge.Bridge.prototype.loadPlugIns.bind(m2mB)], 
    done );
    
    
function done(err, results) {
    logger = require('./logger').logger;
    if (err) {
        logger.error("Exit with error: " + err.message);
        exitHandler({cleanup:true, exit:true}, null);
    } else {
        process.on('exit', exitHandler.bind(null,{cleanup:true}));
        process.on('SIGINT', exitHandler.bind(null, {exit:true, exitCode:2}));
        process.on('uncaughtException', exitHandler.bind(null, {exit:false, exitCode:99}));

        logger.info(m2mB.bc.description + ' id: ' + m2mB.bridgeId.bridgeId + ' started with parameters...'); 
        var cnfgShow = extend({}, m2mB.bc);
        delete cnfgShow['dap']['password'];
        logger.info(util.inspect(cnfgShow)); 
        logger.info("Started the following services...");
        logger.info(util.inspect(results));
        spinner.stop();
        m2mB.run();
    }
}

function exitHandler(options, err) {
    spinner.stop();
    if (options.cleanup){
        m2mB.stop();
        logger.info('Stopped plugins...');
    }
    if (err && typeof err ===  'object'){
         logger.error(err.stack);
    }
    if (options.exit){
        if(options.exitCode===2){
            logger.info('Ctrl+C');
        }
        process.exit(options.exitCode);
    }
}    
    
