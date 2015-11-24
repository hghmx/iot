/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var llrpReader = require('./LLRPReader');


process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true, exitCode:2}));
process.on('uncaughtException', exitHandler.bind(null, {exit:false, exitCode:99}));

var r = new llrpReader.LLRPReader( );

function exitHandler(options, err) {
    if (options.cleanup){
        r.stop();
        console.log('Stopped plugins...');
    }
    if (err && typeof err ===  'object'){
         console.error(err.stack);
    }
    if (options.exit){
        if(options.exitCode===2){
            console.log('Ctrl+C');
        }
        process.exit(options.exitCode);
    }
}    

r.start({}, null,{port:5084, ipaddress:"192.168.1.147"}, function(err){
    var e = err;
//    s.stop( function(err){
//        e = err;
//    });
});
