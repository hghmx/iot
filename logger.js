"use strict";
var cnfg = require('./config').config.bc;
var winston = require('winston');
if(!logger){
    var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: cnfg.logger.colorize,
                level :  cnfg.logger.level
            })
        ]
    }); 

    logger.on('error', 
    function (err) { 
        console.error(err);
    });
}
module.exports = {
    logger : logger
};
