/*******************************************************************************
 * Copyright (C) 2015 AmTech.
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *******************************************************************************/

var llrpReader = require('./LLRPReader');

var epc = require('node-epc');

//epc.parse('307b5df88f6a210009a5ffa4')
//    .then(function(parsed) {
//        console.log('Encoding = ' + parsed.getName());
//        console.log('Company Prefix = ' + parsed.parts.CompanyPrefix);
//        console.log('Item Reference = ' + parsed.parts.ItemReference);
//        console.log('Serial Number = ' + parsed.parts.SerialNumber);
//    })
//    .fail(function(err) {
//        console.error(err);
//    });
//
//epc.parse('00460000000000000001a8b')
//    .then(function(parsed) {
//        console.log('Encoding = ' + parsed.getName());
//    })
//    .fail(function(err) {
//        console.error(err);
//    });
//    
//    epc.parse('0013098a82120222128092d0')
//    .then(function(parsed) {
//        console.log('Encoding = ' + parsed.getName());
//    })
//    .fail(function(err) {
//        console.error(err);
//    });
//    
//    
// epc.parse('201307118727010001010a01')
//    .then(function(parsed) {
//        console.log('Encoding = ' + parsed.getName());
//    })
//    .fail(function(err) {
//        console.error(err);
//    });   


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
