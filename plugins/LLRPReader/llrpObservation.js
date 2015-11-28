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
var clone = require('clone');
var epcEncodings = ["dod", "gdti", "giai", "gid", "grai", "gsrn", "raw", "sgln", "sgtin", "sscc"];
var decodedParts = ['Filter', 'Partition', 'CompanyPrefix', 'ItemReference', 'SerialNumber', 
                    'SerialReference', 'LocationReference', 'Extension', 'AssetType',
                    'IndividualAssetReference', 'ServiceReference', 'DocumentType', 'ManagerNumber',
                    'ObjectClass', 'CAGEOrDODAAC'];
var epcObservations =  [
    {   "targetthings": "[]",
        "guestusers": [],
        "documentType": "",
        "serialReference": "",
        "location": "",
        "companyPrefix": "",
        "epcString": "",
        "serialNumber": "",
        "smoothingResult": "new",
        "epcScheme": "",
        "assetType": "",
        "itemReference": "",
        "locationReference": "",
        "topic": "",
        "managerNumber": "",
        "groupReportResult": "",
        "@type": "/amtech/linkeddata/types/composite/observation/decode96EPC",
        "objectClass": "",
        "extension": "",
        "creationDate": "2015-11-26T06:09:10.939Z",
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
        "guestusers": [],
        "groupReportResult": "",
        "targetthings": "[]",
        "dataSize": 0,
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/dataEPC",
        "epcString": "",
        "binaryData": "",
        "creationDate": "2015-11-28T06:27:55.016Z",
        "smoothingResult": "",
        "guesttenants": [],
        "producer": "",
        "tagEncoding": "",
        "detectiontime": "2015-11-28T06:26:16.000Z",
        "occurrencetime": "2015-11-28T06:26:16.000Z",
        "@id": "/amtech/things/observations/dataEPCSimulation"
    },
    {   "topic": "",
        "guestusers": [],
        "targetthings": "[]",
        "epcString": "",
        "groupReportResult": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/sgtinEPC",
        "companyPrefix": "",
        "serialNumber": "",
        "creationDate": "2015-11-27T16:42:19.244Z",
        "smoothingResult": "new",
        "epcScheme": "",
        "epcUri": "",
        "guesttenants": [],
        "itemReference": "",
        "producer": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-24T22:27:38.000Z",
        "@id": "/amtech/things/observations/stginEPCDevelopment"
    },
    {   "topic": "",
        "guestusers": [],
        "groupReportResult": "",
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/rawEPC",
        "epcString": "",
        "creationDate": "2015-11-27T17:35:39.770Z",
        "smoothingResult": "",
        "epcScheme": "",
        "epcUri": "",
        "guesttenants": [],
        "producer": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-27T17:26:29.000Z",
        "@id": "/amtech/things/observations/rawEPCSimulator"
    },
    {   "topic": "",
        "guestusers": [],
        "groupReportResult": "",
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/encoded96EPC",
        "epcString": "",
        "creationDate": "2015-11-28T07:16:02.643Z",
        "smoothingResult": "",
        "epcScheme": "",
        "guesttenants": [],
        "producer": "",
        "tagEncoding": "",
        "occurrencetime": "2015-11-28T07:11:20.000Z",
        "@id": "/amtech/things/observations/encoded96EPCSimulation"
    },
    {   "topic": "",
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "serialReference": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/ssccEPC",
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
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/sglnEPC",
        "companyPrefix": "",
        "creationDate": "Tue Nov 24 22:23:20 UTC 2015",
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
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/graiEPC",
        "serialNumber": "",
        "companyPrefix": "",
        "creationDate": "Tue Nov 24 22:22:14 UTC 2015",
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
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "individualAssetReference": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/giaiEPC",
        "companyPrefix": "",
        "creationDate": "Tue Nov 24 22:19:57 UTC 2015",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "giai",
        "occurrencetime": "Tue Nov 24 22:19:57 UTC 2015"
    },
    {   "topic": "",
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "documentType": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/gdtiEPC",
        "companyPrefix": "",
        "creationDate": "Tue Nov 24 22:18:43 UTC 2015",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "gdti",
        "occurrencetime": "Tue Nov 24 22:18:43 UTC 2015"
    },
    {   "topic": "",
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "serialReference": "",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/gsrnEPC",
        "companyPrefix": "",
        "creationDate": "Tue Nov 24 22:17:14 UTC 2015",
        "smoothingResult": "",
        "epcUri": "",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "tagEncoding": "gsrn",
        "occurrencetime": "Tue Nov 24 22:17:14 UTC 2015"
    },
    {   "topic": "",
        "managerNumber": "",
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/gidEPC",
        "serialNumber": "",
        "objectClass": "",
        "creationDate": "Tue Nov 24 22:15:57 UTC 2015",
        "smoothingResult": "",
        "description": "",
        "guesttenants": [],
        "epcUri": "",
        "producer": "",
        "tagEncoding": "gid",
        "occurrencetime": "Tue Nov 24 22:15:57 UTC 2015"
    },
    {
        "topic": "",
        "groupReportResult": "",
        "guestusers": [],
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/dodEPC",
        "serialNumber": "Product serial number",
        "creationDate": "Sat Nov 28 21:38:23 UTC 2015",
        "smoothingResult": "",
        "guesttenants": [],
        "description": "",
        "epcUri": "",
        "cAGEOrDODAAC": "",
        "producer": "",
        "tagEncoding": "dod",
        "occurrencetime": "Sat Nov 28 21:38:23 UTC 2015"
    }
];               
                
String.prototype.lowerFirstLetter = function() {
    return this.charAt(0).toLowerCase() + this.slice(1);
};
                
function LLRPObservations(observationsCnfg, 
                          decodeEPCValues, 
                          useSingleDecode96EPC) {
    this.observationsCnfg = observationsCnfg;
    this.decodeEPCValues = decodeEPCValues;
    this.useSingleDecode96EPC = useSingleDecode96EPC;
};

LLRPObservations.prototype.getEPCObservations = function (tagsInfo) {
    var self = this;
    var epcObsrv;
    var observationName;
    var observations  = [];
    tagsInfo.forEach(function (tagToSend) {
        if( self.useSingleDecode96EPC &&  tagToSend.name in epcEncodings){
            observationName = 'decode96EPC';
        }else{
            observationName = tagToSend.name + 'EPC';
        }
        
        epcObsrv = self.getObsrvInstance(observationName);
        
        //Specific epcData properties
        if(tagToSend.name ==='data') {
            epcObsrv.dataSize = tagToSend.dataSize;
            epcObsrv.binaryData = tagToSend.binaryData;     
        }
        
        //common EPCDecode properties
        if(tagToSend.name in epcEncodings){
            epcObsrv.epcUri = tagToSend.EPC96['epcUri'];
            self.assingEPCDecodeParts(epcObsrv,tagToSend.EPC96.parts );
        }
        //Common properties
        if (this.location) {
            epcObsrv.location = this.location;
        }
        if(tagToSend.smoothingResult){
            epcObsrv.smoothingResult = tagToSend.smoothingResult;
        }
        epcObsrv.epcString = tagToSend.tag;
        epcObsrv.tagEncoding = tagToSend.name;

        //Configurable properties
        epcObsrv.targetthings = this.observationsCnfg.get(observationName).thingsconfig;
        epcObsrv.producer = this.observationsCnfg.get(observationName).producerschema;
        epcObsrv.topic = this.observationsCnfg.get(observationName).topicschema;
        epcObsrv.occurrencetime = new Date().toISOString();
        observations.push(epcObsrv);
    });
};

LLRPObservations.prototype.getObsrvInstance = function (obsrvName) {
    var self = this;
    epcObservations.find(function( epcObserv){
        if(self.getResourceName( epcObserv['@type']) === obsrvName){
            return clone(epcObserv);
        }
    });
};

LLRPObservations.prototype.getResourceName = function (typeurl) {
    return (typeurl) ? typeurl.substr(typeurl.lastIndexOf("/") + 1) : undefined;
};

LLRPObservations.prototype.assingEPCDecodeParts = function (observation, parts) {
    for(var propertyName in decodedParts){
        var obsrvPN = propertyName.lowerFirstLetter();
        if(parts[propertyName] && observation[obsrvPN]){
            observation[obsrvPN] = parts[propertyName];
        }          
    }
};
module.exports.LLRPObservations = LLRPObservations;

