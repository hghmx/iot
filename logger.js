"use strict";
var cnfg = require('./config').config.bc;
var winston = require('winston');
if(!logger){
    var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: ( typeof cnfg !== 'undefined' &&  cnfg )?cnfg.logger.colorize:true,
                level :  ( typeof cnfg !== 'undefined' &&  cnfg )?cnfg.logger.level:'info'
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
