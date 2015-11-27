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

var fs = require("fs");
var java = require("java");
java.classpath.push("./ltkjava-1.0.0.7-with-dependencies.jar");
var messageC = require('./LLRPMessagesConstants.js');
var ROSPEC_ID = 1;
var net = require('net');
var util = require('util');
var File = java.import("java.io.File");
var msgBuffers = require("./MsgBuffers");
var hashMap = require('hashmap');
var epc = require('node-epc');
var clone = require('clone');
var async = require('async');
var epc96Size = 24;
var smoothNew = 'appeared';
var smoothLost = 'dessapeared';
String.prototype.padLeft = function (len, c) {
    var s = this, c = c || '0';
    while (s.length < len)
        s = c + s;
    return s;
};

function LLRPReader() {

}
;

LLRPReader.prototype.getLLRPCmd = function (filename) {
    var file = new File(filename);
    var llrpMsg = java.callStaticMethodSync("org.llrp.ltk.util.Util", "loadXMLLLRPMessage", file);
    return llrpMsg;
};

LLRPReader.prototype.setCommands = function () {
    this.getReaderCapability = this.getLLRPCmd("getReaderCapabilities.llrp");
    this.keepAliveAck = this.getLLRPCmd("keepAliveAck.llrp");
    this.getReaderConfig = this.getLLRPCmd("getReaderConfig.llrp");
    this.stopRospec = this.getLLRPCmd("stopRospec.llrp");
    this.setReaderConfig = this.getLLRPCmd("setReaderConfig.llrp");
    //this.addRospec = this.getLLRPCmd("addRospec.llrp");
    this.addRospec = this.getLLRPCmd("addRospecEmptyOld.llrp");
    this.delRospec = this.getLLRPCmd("delRospec.llrp");
    this.enableRospec = this.getLLRPCmd("enableRospec.llrp");
    this.startRospec = this.getLLRPCmd("startRospec.llrp");
    this.delAccessSpec = this.getLLRPCmd("delAccessSpec.llrp");
    this.closeConnection = this.getLLRPCmd("closeConnection.llrp");
    this.enableEventsAndReports = this.getLLRPCmd("enableEventsAndReports.llrp");
};

LLRPReader.prototype.start = function (bc, observationsCnfg, thingInfo, complete) {
    try {
        var self = this;
        self.smoothing = true;
        self.decode = true;
        self.setCommands();
        self.configReaderSet = false;
        self.isConnected = false;
        self.msgBuffers = new msgBuffers.MsgBuffers();
        self._complete = complete;
        self.socket = new net.Socket();
        // timeout after 60 seconds.
        self.socket.setTimeout(60000, function () {
            //log error
            //send error
            var a = 'a';
        });
        // connect with reader
        self.client = self.socket.connect(thingInfo.port, thingInfo.ipaddress, function () {
            //log sucsesss
            self.tagEvents = new hashMap();
        });
        // whenever reader sends data.
        self.client.on('data', self.startEventCycle.bind(self));
        //the reader or client has ended the connection.
        self.client.on('end', function () {
            //send llrpError
        });
        //cannot connect to the reader other than a timeout.
        self.client.on('error', function (err) {
            //send llrpError
            complete(err);
        });
    } catch (e) {
        throw(e);
        complete(e);
    }
};

LLRPReader.prototype.startEventCycle = function (data) {
    var self = this;
    process.nextTick(function () {
        //check if there is data.
        if (data === undefined) {
            //log error
            return;
        }
        var msgs = self.msgBuffers.getMsgs(data);
        msgs.forEach(function (msg) {
            var byteArray = java.newArray("byte", msg.data);
            switch (msg.type) {
                //n
                case messageC.KEEPALIVE:
                    //send KEEPALIVE_ACK
                    self.sendMessage('KEEPALIVE_ACK', self.keepAliveAck);
                    break;
                    //1
                case messageC.READER_EVENT_NOTIFICATION:
                    var llrpMessage = java.callStaticMethodSync("org.llrp.ltk.generated.LLRPMessageFactory", "createLLRPMessage", byteArray);
                    if (llrpMessage.getReaderEventNotificationDataSync().getConnectionAttemptEventSync()) {
                        if (llrpMessage.getReaderEventNotificationDataSync().getConnectionAttemptEventSync().getStatusSync().toStringSync()
                            === 'Success') {
                            self.isConnected = true;
                            self.sendMessage('GET_READER_CAPABILITIES', self.getReaderCapability);
                        } else {
                            self.isConnected = false;
                            self._complete(new Error(util.format("Error connection to reader ip %s port %d", "ip", "port")));
                        }
                    } else {
                        //console.log(llrpMessage.toXMLStringSync());
                    }
                    break;
                    //2
                case messageC.GET_READER_CAPABILITIES_RESPONSE:
                    self.readerCapabilities = java.newInstanceSync('org.llrp.ltk.generated.messages.GET_READER_CAPABILITIES_RESPONSE', byteArray);
                    self.sendMessage('GET_READER_CONFIG', self.getReaderConfig);
                    //var success = self.llrpSuccess(self.readerCapabilities);
                    //Get antenna available
                    //self.readerCapabilities.getGeneralDeviceCapabilitiesSync().getMaxNumberOfAntennaSupportedSync().intValueSync();
                    //self.readerCapabilities.getGeneralDeviceCapabilitiesSync().getHasUTCClockCapabilitySync().intValueSync();                    
                    break;
                    //3
                case messageC.GET_READER_CONFIG_RESPONSE:
                    self.readerConfig = java.newInstanceSync('org.llrp.ltk.generated.messages.GET_READER_CONFIG_RESPONSE', byteArray);
                    var success = self.llrpSuccess(self.readerConfig);
                    self.sendMessage('DELETE_ROSPEC', self.delRospec);
                    break;
                    //4,7     
                case messageC.DELETE_ROSPEC_RESPONSE:
                    if (!self.configReaderSet) {
                        self.sendMessage('DELETE_ACCESSSPEC', self.delAccessSpec);
                    } else {
                        self.sendMessage('ADD_ROSPEC', self.addRospec);
                    }
                    break;
                    //5
                case messageC.DELETE_ACCESSSPEC_RESPONSE:
                    if (self.readerCapabilities.getGeneralDeviceCapabilitiesSync().getCanSetAntennaPropertiesSync().intValueSync() === 1) {
                        self.sendMessage('SET_READER_CONFIG', self.setReaderConfig);
                    } else {
                        self.configReaderSet = true;
                        self.sendMessage('ADD_ROSPEC', self.addRospec);
                    }
                    break;
                    //6
                case messageC.SET_READER_CONFIG_RESPONSE:
                    self.configReaderSet = true;
                    self.sendMessage('DELETE_ROSPEC', self.delRospec);
                    break;
                    //8
                case messageC.ADD_ROSPEC_RESPONSE:
                    self.sendMessage('ENABLE_ROSPEC', self.enableRospec);
                    break;
                    //9
                case messageC.ENABLE_ROSPEC_RESPONSE:
                    self.sendMessage('START_ROSPEC', self.startRospec);
                    break;
                    //10
                case messageC.START_ROSPEC_RESPONSE:
                    self.sendMessage('ENABLE_EVENTS_AND_REPORTS', self.enableEventsAndReports);
                    self._complete(null);
                    break;
                    //n
                case messageC.RO_ACCESS_REPORT:
                    var accessReport = java.newInstanceSync('org.llrp.ltk.generated.messages.RO_ACCESS_REPORT', byteArray);
                    self.eventCycle(accessReport);
                    break;
                case messageC.CLOSE_CONNECTION_RESPONSE:
                    self.isConnected = false;
                    //Bye, bye....
                    break;
            }
        });
    });
};

//TODO:Thing magic reader does not support antenna configuration
LLRPReader.prototype.buildSetConfigurationCmnd = function () {
    var cmd = '';
    //self.readerCapabilities.getAntennaPropertiesListSync().getSync(0).getAntennaConnectedSync().intValueSync();
    //self.readerConfig.getSync(0).getRFTransmitterSync().getTransmitPowerSync().toShortSync()
    return cmd;
};

LLRPReader.prototype.llrpSuccess = function (llrpMessage) {
    return llrpMessage.getLLRPStatusSync().getStatusCodeSync().toString() === 'M_Success';
};

LLRPReader.prototype.sendMessage = function (messageName, llrpMessage) {
    this.client.write(new Buffer(llrpMessage.encodeBinarySync()));
};

function decode96EPC(tagInfo, complete) {
    epc.parse(tagInfo.EPC96.tag)
        .then(function (parsed) {
            tagInfo.EPC96['name'] = parsed.getName();
            tagInfo.EPC96['parts'] = parsed.parts;
            complete(null);
        })
        .fail(function (err) {
            complete(err);
        });
};

function get96EPCUrn(tagInfo, complete) {
    epc.getParser(tagInfo.EPC96['name'].toLowerCase())
        .then(function (parser) {
            parser.getUri(tagInfo.EPC96.tag)
                .then(function (epcUrn) {
                    tagInfo.EPC96['epcUri'] = epcUrn;
                    complete(null);
                })
                .fail(function (err) {
                    complete(err);
                });
        });
};

LLRPReader.prototype.getTagIngo = function (ts, complete) {
    var self = this;
    var tag = ts.getEPCParameterSync().getEPCSync().toStringSync();
    var antenna = ts.getAntennaIDSync().getAntennaIDSync().intValueSync();
    var tagUrn = antenna + '/' + tag;
    var tagInfo;
    //new
    if (!self.tagEvents.has(tagUrn)) {
        tagInfo = {tag: tag, antenna: antenna};
        if (ts.getEPCParameterSync().getNameSync() === 'EPC_96') {
            tagInfo['EPC96'] = {};
            tagInfo.EPC96['tag'] = tag.padLeft(epc96Size, '0');
            if (self.decode) {
               async.series([
                    async.apply(decode96EPC, tagInfo),
                    async.apply(get96EPCUrn, tagInfo)], function(err){
                        if(!err){
                            self.updateTagInfo(tagUrn, ts, tagInfo);
                            self.addTagInfo(tagUrn, tagInfo);
                            complete(null);
                        }
                    });
            } else {
                tagInfo.EPC96['name'] = 'epc-96';
                tagInfo.EPC96['tag'] = tag;
                self.updateTagInfo(tagUrn, ts, tagInfo);
                self.addTagInfo(tagUrn, tagInfo);
                complete(null);

            }
        } else if (ts.getEPCParameterSync().getNameSync() === 'EPCData') {
            tagInfo['EPCData'] = {};
            tagInfo.EPCData['tag'] = tag;
            tagInfo.EPCData['size'] = ts.getEPCParameterSync().getEPCSync().sizeSync();
            tagInfo.EPCData['binaryData'] = ts.getEPCParameterSync().getEPCSync().encodeBinarySync().toStringSync();
            self.updateTagInfo(tagUrn, ts, tagInfo);
            self.addTagInfo(tagUrn, tagInfo);
            complete(null);
        }

    } else {
        tagInfo = self.tagEvents.get(tagUrn);
        self.updateTagInfo(tagUrn, ts, tagInfo);
        complete(null);
    }

};

LLRPReader.prototype.addTagInfo = function (tagUrn, tagInfo) {
    //new
    if (this.smoothing) {
        this.newTags.push(tagUrn);
    }
    this.tagEvents.set(tagUrn, tagInfo);
};

LLRPReader.prototype.updateTagInfo = function (tagUrn, ts, tagInfo) {
    var self = this;
    //Update tag Info
    tagInfo['lastSeen'] = new Date().toString();
    tagInfo['PeakRSSI'] = ts.getPeakRSSISync().getPeakRSSISync().toIntegerSync();
    tagInfo['seenCount'] = ts.getTagSeenCountSync().getTagCountSync().toIntegerSync();
    //no lost
    if (self.smoothing && self.lostTags.indexOf(tagUrn) !== -1) {
        self.lostTags.splice(self.lostTags.indexOf(tagUrn), 1);
    }
};


LLRPReader.prototype.eventCycle = function (accessReport) {
    var self = this;
    if (self.smoothing) {
        self.newTags = [];
        self.lostTags = self.tagEvents.keys();
    }
    try {
        async.each(accessReport.getTagReportDataListSync().toArraySync(),
            LLRPReader.prototype.getTagIngo.bind(self),
            function (err) {
                if (err) {
                    console.error(err);
                } else {
                    if (!self.smoothing) {
                        //Send tags event
                        console.log('-------------------------------------------------------------------------------------------------');
                        self.tagEvents.forEach(function (ts) {
                            console.log(util.format("Tag data %s \n json%s", ts.tag, JSON.stringify(ts, undefined, 4)));
                        });
                        self.sendObservatios(self.tagEvents.values());
                    } else {
                        var smoothTags = [];
                        //Send new event
                        console.log('--------------------------------NEW---------------------------------------------');
                        self.newTags.forEach(function (tagUrn) {
                            var tagInfo = self.tagEvents.get(tagUrn);
                            tagInfo['smoothingResult'] = smoothNew;
                            smoothTags.push(tagInfo);
                            console.log(util.format("Tag urn %s \n json%s", tagUrn, JSON.stringify(tagInfo, undefined, 4)));
                        });
                        console.log('--------------------------------LOST---------------------------------------------');
                        self.lostTags.forEach(function (tagUrn) {
                            var tagInfo = self.tagEvents.get(tagUrn);
                            tagInfo['smoothingResult'] = smoothLost;
                            smoothTags.push(tagInfo);
                            console.log(util.format("Tag urn %s \n json%s", tagUrn, JSON.stringify(tagInfo, undefined, 4)));
                        });
                        self.sendObservatios(self.tagEvents.values());
                    }
                    //Delete lost
                    if (self.smoothing) {
                        self.lostTags.forEach(function (tagUrn) {
                            self.tagEvents.remove(tagUrn);
                        });
                    } else {
                        self.tagEvents.clear();
                    }
                }
            });
    } catch (e) {
        console.error(e);
    }
};

LLRPReader.prototype.sendObservatios = function (tagsInfo) {

};

LLRPReader.prototype.stop = function (complete) {
    try {
        if (this.isConnected) {
            this.sendMessage('CLOSE_CONNECTION', this.closeConnection);
        }
        this.configReaderSet = false;
        this.isConnected = false;
    } catch (e) {
        complete(e);
    }
};

LLRPReader.prototype.update = function (observation, complete) {
    try {
    } catch (e) {
        complete(e);
    }
};

LLRPReader.prototype.update = function (observation, complete) {
    try {
    } catch (e) {
        complete(e);
    }
};

LLRPReader.prototype.decode96EPC = function (code, message) {
    var decode96EPC = clone(
        {
            "targetthings": "[]",
            "guestusers": [],
            "documentType": "",
            "serialReference": "",
            "location": "",
            "companyPrefix": "",
            "serialNumber": "",
            "smoothingResult": "new",
            "epcScheme": "",
            "assetType": "",
            "description": "",
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
            "detectiontime": "2015-11-25T20:20:25.000Z",
            "occurrencetime": "2015-11-25T20:20:25.000Z",
            "@id": "/amtech/things/observations/decodeEPCSimulation"
        });
    if (this.location) {
        decode96EPC.location = this.location;
    }
    decode96EPC.targetthings = this.observationsCnfg.get("decode96EPC").thingsconfig;
    decode96EPC.producer = this.observationsCnfg.get("decode96EPC").producerschema;
    decode96EPC.topic = this.observationsCnfg.get("decode96EPC").topicschema;
    decode96EPC.code = code;
    decode96EPC.occurrencetime = new Date().toISOString();
    decode96EPC.message = message;
    return decode96EPC;
};
module.exports.LLRPReader = LLRPReader;