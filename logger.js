"use strict";
var cnfg = require('./config').config.bc;
var winston = require('winston');
var singleton = null;
function Logger (){
    this.logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: cnfg.logger.colorize,
                level :  cnfg.logger.level
            })
        ]
    });   
}
singleton = singleton || new Logger();
module.exports = {
    logger : singleton.logger
};
