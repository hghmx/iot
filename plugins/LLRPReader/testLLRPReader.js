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

var llrpClientM2mBridge = {
    "port": 5084,
    "guestusers": [],
    "_lastmodified": 1448813406163,
    "location": "{\"wkt\":\"POINT(-70.224609375 26.745610382199022)\",\"sContext\":\"geo\",\"hash\":\"dky01uzurzpurvrzpfxcxb2p\"}",
    "decodeEPCValues": true,
    "@type": "/amtech/linkeddata/types/composite/entity/LLRPReader",
    "_resourcestatus": "valid",
    "svgicon": "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\r\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\r\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\r\n<svg version=\"1.1\" id=\"Capa_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\r\n\t width=\"437.804px\" height=\"437.804px\" viewBox=\"0 0 437.804 437.804\" style=\"enable-background:new 0 0 437.804 437.804;\"\r\n\t xml:space=\"preserve\">\r\n<g>\r\n\t<path d=\"M1.915,0v437.804h146.856h146.543h140.575V0H1.915z M412.843,414.758H295.314H158.308L94.974,351.43V93.13h316.829v259.872\r\n\t\tH199.601l-47.653-47.652V161.624h207.38V298.6h-95.093l-17.803-17.803h48.042v-80.656h-80.644v80.656h0.718l-0.354,0.348\r\n\t\tl40.5,40.495h127.661v-183.06H128.899v176.31l61.156,61.153h222.789V414.758L412.843,414.758z M412.843,70.09H71.931v290.88\r\n\t\tl53.797,53.8H24.964V23.049h387.879V70.09z\"/>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n</svg>\r\n",
    "smoothing": true,
    "reportAmountForSmoothing": 2,
    "_name": "llrpClientM2mBridge",
    "ipaddress": "192.168.1.146",
    "emaillist": "",
    "instanceobservationconfig": "{}",
    "creationDate": "2015-11-29T16:04:28.790Z",
    "description": "llrp reader instance 192.168.1.146 for development/testing",
    "guesttenants": [],
    "groupReport": false,
    "phonelist": "",
    "antennas": "[{id:1,name:\"cuarto\",groupReport:true,decode:true}]",
    "@id": "/amtech/things/entities/llrpClientM2mBridge",
    "frequencyOfReport": 6000,
    "_user": "m2mcreator@amtech.mx",
    "useSingleDecode96EPC": false
}


var bc = {"description":"AMTech M2M Bridge",
           "dap":{"dapUrl":"https://dapdev.amtech.mx",
                  "userId":"follower_m2mcreator@@amtech.mx",
                  "tenant":"follower_m2mcreator@@amtech.mx"
                 },"networkFailed":{"retries":5,"failedWait":3000,"reconnectWait":180000},
                 "pluginLoad":{"continueWithError":true},
                 "logger":{"colorize":true,"level":"debug"},
                 "address":{"country":"usa","city":"irvine","road":"","number":""},
                 "bridgeId":"m2mBridgeDevelopment",
                 "location": {"wkt":"POINT(-117.72047996520998 33.70534863057765)","sContext":"geo"},
            };






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

r.start(bc, null,llrpClientM2mBridge, function(err){
    var e = err;
//    s.stop( function(err){
//        e = err;
//    });
});
