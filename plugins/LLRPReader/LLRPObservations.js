///*******************************************************************************
// * Copyright (C) 2015 AmTech.
// *
// * Licensed to the Apache Software Foundation (ASF) under one
// * or more contributor license agreements.  See the NOTICE file
// * distributed with this work for additional information
// * regarding copyright ownership.  The ASF licenses this file
// * to you under the Apache License, Version 2.0 (the
// * "License"); you may not use this file except in compliance
// * with the License.  You may obtain a copy of the License at
// *
// *   http://www.apache.org/licenses/LICENSE-2.0
// *
// * Unless required by applicable law or agreed to in writing,
// * software distributed under the License is distributed on an
// * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// * KIND, either express or implied.  See the License for the
// * specific language governing permissions and limitations
// * under the License.
// *******************************************************************************/
"use strict";
var clone = require('clone');
var hashMap = require('hashmap');
var util = require('util');
var epcEncodings = ["dod", "gdti", "giai", "gid", "grai", "gsrn", "raw", "sgln", "sgtin", "sscc"];
var decodedParts = ['Filter', 'Partition', 'CompanyPrefix', 'ItemReference', 'SerialNumber', 
                    'SerialReference', 'LocationReference', 'Extension', 'AssetType',
                    'IndividualAssetReference', 'ServiceReference', 'DocumentType', 'ManagerNumber',
                    'ObjectClass', 'CAGEOrDODAAC'];
var llrpPlaceHolders = ['antennaId','smoothResult', 'filter', 'partition', 'companyPrefix', 'itemReference', 'serialNumber', 
                    'serialReference', 'locationReference', 'extension', 'assetType',
                    'individualAssetReference', 'serviceReference', 'documentType', 'managerNumber',
                    'objectClass', 'cAGEOrDODAAC'];                
var epcObservations =  [
    {   "targetthings": "[]",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "documentType": "",
        "serialReference": "",
        "location": "",
        "companyPrefix": "",
        "epcString": "",
        "serialNumber": "",
        "smoothingResult": "new",
        "assetType": "",
        "itemReference": "",
        "locationReference": "",
        "topic": "",
        "managerNumber": "",
        "@type": "/amtech/linkeddata/types/composite/observation/decode96EPC",
        "objectClass": "",
        "extension": "",
        "guesttenants": [],
        "epcUri": "",
        "serviceReference": "",
        "producer": "",
        "cAGEOrDODAAC": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-25T20:20:25.000Z",
        "@id": "/amtech/things/observations/decodeEPCSimulation"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "dataSize": 0,
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/dataEPC",
        "epcString": "",
        "binaryData": "",
        "smoothingResult": "",
        "guesttenants": [],
        "producer": "",
        "tagEncoding": "",
        "detectiontime": "2015-11-28T06:26:16.000Z",
        "occurrencetime": "2015-11-28T06:26:16.000Z",
        "@id": "/amtech/things/observations/dataEPCSimulation"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "epcString": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/sgtinEPC",
        "companyPrefix": "",
        "serialNumber": "",
        "smoothingResult": "new",
        "epcUri": "",
        "guesttenants": [],
        "itemReference": "",
        "producer": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-24T22:27:38.000Z",
        "@id": "/amtech/things/observations/stginEPCDevelopment"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/rawEPC",
        "epcString": "",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "producer": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-27T17:26:29.000Z",
        "@id": "/amtech/things/observations/rawEPCSimulator"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/encoded96EPC",
        "epcString": "",
        "smoothingResult": "",
        "guesttenants": [],
        "producer": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-28T07:11:20.000Z",
        "@id": "/amtech/things/observations/encoded96EPCSimulation"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "serialReference": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/ssccEPC",
        "epcString": "",
        "companyPrefix": "",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "sscc",
        "occurrencetime": "Tue Nov 24 22:25:23 UTC 2015"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/sglnEPC",
        "epcString": "",
        "companyPrefix": "",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "sgln",
        "occurrencetime": "Tue Nov 24 22:23:20 UTC 2015",
        "locationReference": ""
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/graiEPC",
        "epcString": "",
        "serialNumber": "",
        "companyPrefix": "",
        "assetType": "",
        "smoothingResult": "",
        "description": "",
        "guesttenants": [],
        "epcUri": "",
        "producer": "",
        "tagEncoding": "grai",
        "occurrencetime": "Tue Nov 24 22:22:14 UTC 2015"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "individualAssetReference": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/giaiEPC",
        "epcString": "",
        "companyPrefix": "",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "giai",
        "occurrencetime": "Tue Nov 24 22:19:57 UTC 2015"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "documentType": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/gdtiEPC",
        "epcString": "",
        "companyPrefix": "",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "gdti",
        "occurrencetime": "Tue Nov 24 22:18:43 UTC 2015"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "serialReference": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/gsrnEPC",
        "epcString": "",
        "companyPrefix": "",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "gsrn",
        "occurrencetime": "Tue Nov 24 22:17:14 UTC 2015"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "managerNumber": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/gidEPC",
        "epcString": "",
        "serialNumber": "",
        "objectClass": "",
        "smoothingResult": "",
        "description": "",
        "guesttenants": [],
        "epcUri": "",
        "producer": "",
        "tagEncoding": "gid",
        "occurrencetime": "Tue Nov 24 22:15:57 UTC 2015"
    },
    {   "topic": "",
        "antennaId": "",
        "antennaName": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/dodEPC",
        "epcString": "",
        "serialNumber": "Product serial number",
        "smoothingResult": "",
        "guesttenants": [],
        "description": "",
        "epcUri": "",
        "cAGEOrDODAAC": "",
        "producer": "",
        "tagEncoding": "dod",
        "occurrencetime": "Sat Nov 28 21:38:23 UTC 2015"
    },
    {   "topic": "",
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/llrpError",
        "code": 0,
        "message": "",
        "description": "",
        "guesttenants": [],
        "producer": "",
        "occurrencetime": "Sun Nov 29 16:38:51 UTC 2015"
    },
    {
        "topic": "",
        "groupName": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/groupEPC",
        "groupResult": "",
        "tagsResultAmount": 0,
        "tagEncoding": "",        
        "description": "",
        "guesttenants": [],
        "producer": "",
        "occurrencetime": "Tue Dec 08 19:55:21 UTC 2015"
    }    
];               
                
String.prototype.lowerFirstLetter = function() {
    return this.charAt(0).toLowerCase() + this.slice(1);
};

function LLRPObservations(location,
                          observationsCnfg, 
                          decodeEPCValues, 
                          useSingleDecode96EPC,
                          groupReport,
                          antennas,
                          proximityarea,
                          logger) {
    var self = this;
    self.location = location;
    self.observationsCnfg = observationsCnfg;
    self.decodeEPCValues = decodeEPCValues;
    self.useSingleDecode96EPC = useSingleDecode96EPC;
    self.groupReport = groupReport;
    self.setAntennaGroups(antennas);
    self.proximityarea = proximityarea;
    self.observsGroups  = new hashMap();
    self.logger = logger;
}

LLRPObservations.prototype.setAntennaGroups = function (antennas) { 
    var self = this;
    self.antennas = antennas;
    self.groupAntennas = [];
    if(self.antennas){
        self.antennas.forEach(function (antenna){
            if(antenna.groupReport && self.groupAntennas.indexOf(antenna.groupReport) === -1){
                self.groupAntennas.push(antenna.groupReport);
            }
        });
    }    
};

/*
    [{id:1, 
    name : "door1", 
    groupReport: "group1", 
    decodeEPCValues : true, 
    smoothing: true,
    reportAmountForSmoothing:2, 
    useSingleDecode96EPC : false}];
*/

LLRPObservations.prototype.getAntennaValue = function (antennaId, property) {   
    var value = null;
    if(this.antennas && this.antennas.has(antennaId)){
        var value = this.antennas.get(antennaId)[property];
        if(value !== undefined ){
            value = this.antennas.get(antennaId)[property];
        }
    }
    return value;
};

LLRPObservations.prototype.getAntennaName = function (antennaId) {
    var name = this.getAntennaValue(antennaId, 'name');
    return name? name : antennaId;
};

LLRPObservations.prototype.getAntennaValueOrDefault = function (antennaId, property, defValue) {   
    var value = defValue;
    if(this.antennas && this.antennas.has(antennaId)){
        var value = this.antennas.get(antennaId)[property];
        if(value !== undefined ){
            value = this.antennas.get(antennaId)[property];
        }
    }
    return value;
};

LLRPObservations.prototype.getUseSingleDecode96EPC = function (antennaId) {
    var value = this.getAntennaValueOrDefault(antennaId, 'useSingleDecode96EPC', this.useSingleDecode96EPC);
    this.logger.debug(util.format("Antenna id %d got useSingleDecode96EPC %s", antennaId, value));
    return value;
};

LLRPObservations.prototype.getEPCObservations = function (tagsInfo) {   
    var self = this;
    var observationName;
    var observationGroups = [];
    tagsInfo.forEach(function (tagToSend) {
        var isEpcEncodings = epcEncodings.indexOf(tagToSend.name )!== -1;
        if( self.getUseSingleDecode96EPC(tagToSend.antenna) &&  isEpcEncodings){
            observationName = 'decode96EPC';
        }else{
            observationName = tagToSend.name + 'EPC';
        }
        
        var epcObsrv = self.getObsrvInstance(observationName);
        
        //Specific epcData properties
        if(tagToSend.name ==='data') {
            epcObsrv.dataSize = tagToSend.EPCData.dataSize;
            epcObsrv.binaryData = tagToSend.EPCData.binaryData;     
        }
        var ph = {'antennaId': tagToSend.antenna};
        //common EPCDecode properties
        if(isEpcEncodings){
            epcObsrv.epcUri = tagToSend.EPC96['epcUri'];
            self.assingEPCDecodeParts(epcObsrv,tagToSend.EPC96.parts, ph );
            ph['epcUri'] = tagToSend.EPC96['epcUri'];
        }
        //Common properties
        if (self.location) {
            epcObsrv.location = self.location;
        }
        
        if(tagToSend.smoothingResult){
            epcObsrv.smoothingResult = tagToSend.smoothingResult;
            ph['smoothingResult'] = tagToSend.smoothingResult;
        }
        epcObsrv.epcString = tagToSend.tag;
        epcObsrv.tagEncoding = tagToSend.name;
        epcObsrv.antennaId= tagToSend.antenna;
        epcObsrv.antennaName = self.getAntennaName(tagToSend.antenna);
        //Configurable properties
        if(self.observationsCnfg && self.observationsCnfg.has(observationName)){
            epcObsrv.targetthings = self.fillPlaceholder(self.observationsCnfg.get(observationName).thingsconfig, ph);
            epcObsrv.targetthings = self.fillProximityArea(epcObsrv.antennaId, epcObsrv.targetthings); 
            epcObsrv.producer = self.fillPlaceholder(self.observationsCnfg.get(observationName).producerschema, ph);
            epcObsrv.topic = self.fillPlaceholder(self.observationsCnfg.get(observationName).topicschema, ph);
            epcObsrv.occurrencetime = new Date().toISOString();
            var key;
            var antennaGroup = self.getAntennaValue(tagToSend.antenna, 'groupReport');
            if(antennaGroup && self.groupAntennas.indexOf(antennaGroup) !== -1){
                key =  antennaGroup + '/' + tagToSend.name;
            }else if(self.groupReport){
                key = tagToSend.name;
            }else{
                key = '_all_';
            }

            if( !self.observsGroups.has(key)){
                self.observsGroups.set( key , [epcObsrv]);
            }else{
                self.observsGroups.get(key).push(epcObsrv);
            }            
        }else if(!self.observationsCnfg.has(observationName)){
            //stop
            self.logger.error(util.format('Observation type %s has not production configuration \n json: %s ',
                    observationName, JSON.stringify(epcObsrv, undefined, 4) ) );
        }        
    });
    
    if (self.observsGroups.count() > 0) {
        if (!self.groupReport && self.groupAntennas.length === 0) {
            observationGroups = observationGroups.concat(self.observsGroups.get('_all_'));
            self.logger.debug(util.format('Grouping by %s', '_all_'));
        } else if (self.groupReport) {
            self.observsGroups.forEach(function (tagsGroup, key) {
                self.buildGroup(tagsGroup, key, observationGroups);
            });
        } else if (self.groupAntennas.length > 0) {
            self.observsGroups.forEach(function (tagsGroup, key) {
                var antennaKey = key.split('/')[0];
                if (self.groupAntennas.indexOf(typeof antennaKey === "number"? parseInt(antennaKey) : antennaKey) !== -1) {
                    //tagsGroup[0].groupReportResult = JSON.stringify(tagsGroup);
                    self.buildGroup(tagsGroup, key, observationGroups);
                    //observationGroups.push(tagsGroup[0]);
                } else {
                    observationGroups = observationGroups.concat(tagsGroup);
                    self.logger.debug(util.format('Adding to grouping by %s ', '_all_'));
                }
            });
        }
        self.observsGroups.clear();
    }
    return observationGroups;
};

LLRPObservations.prototype.fillProximityArea = function (antennaId, targetThings) {   
    var pa = this.getAntennaValueOrDefault(antennaId, 'proximityarea', this.proximityarea);
    if(targetThings && pa && pa.length > 0){
        var target = JSON.parse(targetThings);
        target.forEach(function(tt){
            tt.proximityarea = pa;
        });
        return JSON.stringify(target);
    }
    return targetThings;
};

LLRPObservations.prototype.buildGroup = function (tagsGroup, key, observationGroups) {
    var self = this;
    var observationName = 'groupEPC';
    
    var antennaKey = key.split('/')[0];
    var ph = {'antennaId':antennaKey};
    if(self.observationsCnfg && self.observationsCnfg.has(observationName)){
        var gObsrv = self.getObsrvInstance(observationName);
        gObsrv.groupResult = JSON.stringify(tagsGroup); 
        gObsrv.tagsResultAmount = tagsGroup.length;
        gObsrv.tagEncoding = key.split('/')[1];
        gObsrv.groupName = key;            
        gObsrv.targetthings = self.fillPlaceholder(self.observationsCnfg.get(observationName).thingsconfig, ph);
        gObsrv.producer = self.fillPlaceholder(self.observationsCnfg.get(observationName).producerschema, ph);
        gObsrv.topic = self.fillPlaceholder(self.observationsCnfg.get(observationName).topicschema, ph);
        gObsrv.occurrencetime = new Date().toISOString();
        if (self.location) {
            gObsrv.location = self.location;
        }
        observationGroups.push(gObsrv);
        self.logger.debug(util.format('Grouping by %s ', key));
    }else if(!self.observationsCnfg.has(observationName)){
        //stop
        self.logger.error(util.format('Observation type %s has not production configuration',
                observationName) );
    }       
};

LLRPObservations.prototype.getObsrvInstance = function (obsrvName) {
    var self = this;
    var cloneObsrv = undefined;
    epcObservations.find(function( epcObserv){
        if(self.getResourceName( epcObserv['@type']) === obsrvName){
            cloneObsrv = clone(epcObserv);
            return true;
        }
    });
    return cloneObsrv;
};

LLRPObservations.prototype.getResourceName = function (typeurl) {
    return (typeurl) ? typeurl.substr(typeurl.lastIndexOf("/") + 1) : undefined;
};

LLRPObservations.prototype.assingEPCDecodeParts = function (observation, parts, ph) {
    decodedParts.forEach(function(propertyName){
        var obsrvPN = propertyName.lowerFirstLetter();
        if(parts[propertyName]!== undefined && observation.hasOwnProperty(obsrvPN)){
            observation[obsrvPN] = parts[propertyName];
            ph[obsrvPN] = parts[propertyName];
        }                  
    });    
};

LLRPObservations.prototype.fillPlaceholder = function (phString, placeHolders ) {   
    var re = new RegExp( "\\#{(\\b(|" + Object.getOwnPropertyNames(placeHolders).join('|')  + ")\\b)\\}", 'g' );   
    var replaceClientPlaceholders = (function ()
    {
        var replacer = function (context)
        {
            return function (s, name)
            {
                return context[name];
            };
        };

        return function (input, context)
        {
            //return input.replace(/\#{(\b(|antennaId|smoothResult)\b)\}/g, replacer(context));
            return input.replace(re, replacer(context));
        };
    })();
    return replaceClientPlaceholders(phString, placeHolders);
};

LLRPObservations.prototype.getErrorObservations = function (error) {
    var self = this;
    var observationName = 'llrpError';
    if (self.observationsCnfg && self.observationsCnfg.has(observationName)) {
        var llrpError = self.getObsrvInstance(observationName);
        if (error.code) {
            llrpError.code = error.code;
        }
        llrpError.message = error.message;
        llrpError.targetthings = self.observationsCnfg.get(observationName).thingsconfig;
        llrpError.producer = self.observationsCnfg.get(observationName).producerschema;
        llrpError.topic = self.observationsCnfg.get(observationName).topicschema;
        if (self.location) {
            llrpError.location = self.location;
        }
        llrpError.occurrencetime = new Date().toISOString();
        self.logger.debug(util.format("llrpError json:\n json%s", JSON.stringify(llrpError, undefined, 4)));
        return llrpError;
    }else{
        self.logger.error(util.format('Observation type %s has not production configuration',
                observationName) );  
        return null;
    }    
};

module.exports.LLRPObservations = LLRPObservations;