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
var fs = require("fs");
var java = require("java");
var path = require("path");
java.classpath.push(path.resolve(__dirname, "./ltkjava-1.0.0.7-with-dependencies.jar"));
var net = require('net');
var util = require('util');
var File = java.import("java.io.File");
var hashMap = require('hashmap');
var epc = require('node-epc');
var clone = require('clone');
var async = require('async');
var epc96Size = 24;
var msgBuffers = require("./MsgBuffers");
var messageC = require('./LLRPMessagesConstants.js');
var llrpObservations = require("./LLRPObservations").LLRPObservations;
var llrpSmoothing = require("./LLRPSmoothing").LLRPSmoothing;

String.prototype.padLeft = function (len, c) {
    var s = this, c = c || '0';
    while (s.length < len)
        s = c + s;
    return s;
};

function LLRPReader() {

};

LLRPReader.prototype.setLLRPCmds = function (llrpCommands) {
    var self = this;
    llrpCommands.forEach(function (cmd) {
        var file = new File(cmd.fileName);
        self[cmd.pn] = java.callStaticMethodSync("org.llrp.ltk.util.Util", "loadXMLLLRPMessage", file);
    });
};

LLRPReader.prototype.writeCnfgLLRPCmd = function (cmd, complete) {
    fs.writeFile(cmd.fn, cmd.cmd, 'utf8',
        function (e) {
            complete(e);
        });
};

LLRPReader.prototype.setCommands = function (complete) {
    var llrpCommands = [
        {pn: 'getReaderCapability', fileName: path.resolve(__dirname, "./getReaderCapabilities.llrp")},
        {pn: 'keepAliveAck', fileName: path.resolve(__dirname, "./keepAliveAck.llrp")},
        {pn: 'getReaderConfig', fileName: path.resolve(__dirname, "./getReaderConfig.llrp")},
        {pn: 'stopRospec', fileName: path.resolve(__dirname, "./stopRospec.llrp")},
        {pn: 'setReaderConfig', fileName: path.resolve(__dirname, "./setReaderConfig.llrp")},
        {pn: 'addRospec', fileName: path.resolve(__dirname, "./addRospecEmptyOld.llrp")},
        {pn: 'delRospec', fileName: path.resolve(__dirname, "./delRospec.llrp")},
        {pn: 'enableRospec', fileName: path.resolve(__dirname, "./enableRospec.llrp")},
        {pn: 'startRospec', fileName: path.resolve(__dirname, "./startRospec.llrp")},
        {pn: 'delAccessSpec', fileName: path.resolve(__dirname, "./delAccessSpec.llrp")},
        {pn: 'closeConnection', fileName: path.resolve(__dirname, "./closeConnection.llrp")},
        {pn: 'enableEventsAndReports', fileName: path.resolve(__dirname, "./enableEventsAndReports.llrp")}
    ];    
    if (this._addRospec || this._setReaderConfig) {
        var _addRospecFile = "./addRospecEmptyOld.llrp";
        var _setReaderConfigFile = "./setReaderConfig.llrp";
        var llrpCmdsConfg = [];
        if (this._addRospec) {
            _addRospecFile = "./addRospecFromInstance.llrp";
            llrpCmdsConfg.push({fn: _addRospecFile, cmd: this._addRospec, pn:'addRospec'});
        }
        if (this._setReaderConfig) {
            _setReaderConfigFile = "./setReaderConfig.llrp";
            llrpCmdsConfg.push({fn: _setReaderConfigFile, cmd: this._addRospec, pn:'setReaderConfig'});
        }
        async.each(llrpCmdsConfg, this.writeCnfgLLRPCmd.bind(this),
            function (e) {
                if (e) {
                    complete(e);
                } else {
                     try{
                        llrpCmdsConfg.forEach(function(cmdCnfg){
                            var cmds = llrpCommands.filter(function(cmd){
                                return cmdCnfg.pn === cmd.pn;
                            });
                            cmds[0].fileName = path.resolve(__dirname, cmdCnfg.fn);
                        });
                        this.setLLRPCmds(llrpCommands);
                        complete(null);
                    }catch(e){
                        complete(e);
                    }
                }
            });
    } else {
        try{
            this.setLLRPCmds(llrpCommands);
            complete(null);
        }catch(e){
            complete(e);
        }
    }
};

LLRPReader.prototype.start = function (context, complete) {
    try {
        if (!context.observationsCnfg) {
            complete(new Error('LLRPReader requires observation production configuration'));
        }
        if (!context.thingInstance) {
            complete(new Error('LLRPReader requires an LLRPReader type instance'));
        }

        this.decodeEPCValues = context.thingInstance.decodeEPCValues;
        this.reportAmountForSmoothing = context.thingInstance.reportAmountForSmoothing;
        this.useSingleDecode96EPC = context.thingInstance.useSingleDecode96EPC;
        this.groupReport = context.thingInstance.groupReport;
        if (context.thingInstance.addRospec && context.thingInstance.addRospec.length > 0) {
            this._addRospec = context.thingInstance.addRospec;
        }
        if (context.thingInstance.setReaderConfig && context.thingInstance.setReaderConfig.length > 0) {
            this._setReaderConfig = context.thingInstance.setReaderConfig;
        }
        this.port = context.thingInstance.port;
        this.ipaddress = context.thingInstance.ipaddress;
        this.observationsCnfg = context.observationsCnfg;

        if (context.thingInstance.location && context.thingInstance.location.length > 0) {
            this.location = context.thingInstance.location;
        } else if (context.bc.location) {
            this.location = context.bc.location;
        }

        this.name = context.thingInstance._name;
        this.urn = context.thingInstance["@id"];
        if (context.logger) {
            this.logger = context.logger;
        }

        this.setAntennasMap(context.thingInstance.antennas);
        this.smoothing = context.thingInstance.smoothing;
        this.connectReader(complete);
    } catch (err) {
        this.sendError(err);
        complete(err);
    }
};

LLRPReader.prototype.setAntennasMap = function (antennas) {
    if (antennas) {
        try {
            var _antennas = JSON.parse(antennas);
            var self = this;
            self.antennas = new hashMap();
            _antennas.forEach(function (antenna) {
                self.antennas.set(antenna.id, antenna);
            });
        } catch (e) {
            this.antennas = null;
            if (this.logger) {
                 this.logger.error(util.format('LLRP reader %s wrong json antenna configuration', this.name));
            }
            ;
            if (this.logger) {
                 this.logger.info(util.format('LLRP reader %s running without antenna configuration', this.name));
            }
            ;
        }
    } else {
        this.antennas = null;
        if (this.logger) {
             this.logger.info(util.format('LLRP reader %s running without antenna configuration', this.name));
        }
    }    
};

LLRPReader.prototype.connectReader = function (complete) {
    try {
        var self = this;
        self.configReaderSet = false;
        self.lastReportNotification = 'none';
        self._complete = complete;
        self.isConnected = false;
        self.setCommands(
            function (err) {
                if (err) {
                    self.startError(err);
                } else {

                    self.msgBuffers = new msgBuffers.MsgBuffers();

                    self.llrpObservs = new llrpObservations(self.location,
                        self.observationsCnfg,
                        self.decodeEPCValues,
                        self.useSingleDecode96EPC,
                        self.groupReport,
                        self.antennas,
                        self.logger);

                    self.llrpSmothing = new llrpSmoothing(self.smoothing,
                        self.antennas,
                        self.llrpObservs,
                        self.reportAmountForSmoothing,
                        self.logger);

                    self.smoothing = self.llrpSmothing.smoothig;

 
                    self.socket = new net.Socket();
                    // timeout after 60 seconds.
                    self.socket.setTimeout(60000, function () {
                        //send llrperror
                        var msg = util.format("LLRP reader %s timeout", self.name);
                        if (self.logger) {
                            self.logger.error(msg);
                        }
                        ;
                        var err = new Error(msg);
                        self.sendError(err);
                        self.startError(err);
                        if(self.isConnected){
                            self.restartPlugIn(self);
                        }
                    });
                    // connect with reader
                    self.client = self.socket.connect(self.port, self.ipaddress, function () {
                        self.tagEvents = new hashMap();
                    });
                    // whenever reader sends data.
                    self.client.on('data', self.startEventCycle.bind(self));
                    //the reader or client has ended the connection.
                    self.client.on('end', function () {
                        //send llrpError
                        var msg = util.format("LLRP reader %s end connection", self.name);
                        if (self.logger) {
                            self.logger.error(msg);
                        }
                        self.sendError(new Error(msg));
                    });
                    //cannot connect to the reader other than a timeout.
                    self.client.on('error', function (err) {
                        var msg = util.format("LLRP reader %s error on connection %s", self.name, err.message);
                        if (self.logger) {
                            self.logger.error(msg);
                        }
                        self.sendError(new Error(msg));
                        self.startError(err);
                    });
                }
            });
    } catch (err) {
        self.startError(err);
    }
};

LLRPReader.prototype.startError = function (err) {
    var eE = new Error(util.format("Error at %s: %s", this.name, err.message));
    if (this._complete) {
        this._complete(eE);
        this._complete = null;
    }
    this.logger.error(eE);
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
                            if (self.logger) {
                                self.logger.info(util.format('LLRP reader %s connected', self.name));
                            }
                            ;
                            self.sendMessage('GET_READER_CAPABILITIES', self.getReaderCapability);
                            if (self._complete) {
                                self._complete(null);
                                self._complete = null;
                            }
                        } else {
                            self.isConnected = false;
                            self.startError(new Error(util.format("Error connection to reader ip %s port %d", self.ipaddress, self.port)));
                        }
                    } else {

                        if (llrpMessage.getReaderEventNotificationDataSync().getAISpecEventSync()) {
                            self.lastReportNotification = llrpMessage.getReaderEventNotificationDataSync().getAISpecEventSync().getEventTypeSync().toStringSync();
                        }
                        else if (llrpMessage.getReaderEventNotificationDataSync().getROSpecEventSync()) {
                            if (self.lastReportNotification === 'End_Of_AISpec') {
                                if (self.smoothing) {
                                    self.execSmoothing();
                                    self.logger.debug("Run smoothing no report received");
                                }
                            } else {
                                self.logger.debug("Report end with ..." + self.lastReportNotification);
                            }
                        }
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
//                    if (!self.configReaderSet) {
//                        self.sendMessage('DELETE_ACCESSSPEC', self.delAccessSpec);
//                    } else {
//                        self.sendMessage('ADD_ROSPEC', self.addRospec);
//                    }
                    self.sendMessage('DELETE_ACCESSSPEC', self.delAccessSpec);
                    break;
                    //5
                case messageC.DELETE_ACCESSSPEC_RESPONSE:
//                    if (self.readerCapabilities.getGeneralDeviceCapabilitiesSync().getCanSetAntennaPropertiesSync().intValueSync() === 1) {
//                        self.sendMessage('SET_READER_CONFIG', self.setReaderConfig);
//                    } else {
//                        self.configReaderSet = true;
//                        self.sendMessage('ADD_ROSPEC', self.addRospec);
//                    }
                    self.sendMessage('SET_READER_CONFIG', self.setReaderConfig);
                    break;
                    //6
                case messageC.SET_READER_CONFIG_RESPONSE:
                    self.configReaderSet = true;
                    //self.sendMessage('DELETE_ROSPEC', self.delRospec);
                    self.sendMessage('ADD_ROSPEC', self.addRospec);
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
                    break;
                    //n
                case messageC.RO_ACCESS_REPORT:
                    var accessReport = java.newInstanceSync('org.llrp.ltk.generated.messages.RO_ACCESS_REPORT', byteArray);
                    self.lastReportNotification = 'RO_ACCESS_REPORT';
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
            tagInfo['name'] = parsed.getName().toLowerCase();
            ;
            tagInfo.EPC96['parts'] = clone(parsed.parts);
            parsed.getUri(tagInfo.EPC96.tag)
                .then(function (epcUrn) {
                    tagInfo.EPC96['epcUri'] = epcUrn;
                    complete(null);
                });
        })
        .fail(function (err) {
            complete(err);
        });
}
;

LLRPReader.prototype.getdecodeEPCValues = function (antennaId) {
    var decodeEPCValues = this.llrpObservs.getAntennaValueOrDefault(antennaId, 'decodeEPCValues', this.decodeEPCValues);
    this.logger.debug(util.format("Antenna id %d got decodeEPCValues %s", antennaId, decodeEPCValues));
    return decodeEPCValues;
};

LLRPReader.prototype.getTagInfo = function (ts, complete) {
    var self = this;
    var tag = ts.getEPCParameterSync().getEPCSync().toStringSync();
    var antenna = ts.getAntennaIDSync().getAntennaIDSync().intValueSync();

    var tagUrn = antenna + '/' + tag;
    var tagInfo;
    //new
    if (!self.tagEvents.has(tagUrn)) {
        tagInfo = {tagUrn: tagUrn, tag: tag, antenna: antenna, reportAmountForSmoothing: 0};
        if (ts.getEPCParameterSync().getNameSync() === 'EPC_96') {
            tagInfo['EPC96'] = {};
            tagInfo.EPC96['tag'] = tag.padLeft(epc96Size, '0');
            if (self.getdecodeEPCValues(antenna)) {
                decode96EPC(tagInfo,
                    function (err) {
                        if (!err) {
                            self.updateTagInfo(tagUrn, ts, tagInfo);
                            self.addTagInfo(tagUrn, tagInfo);
                            self.logger.debug(util.format("NEW TAG----(EPC_96)------> URN: %s Name: %s", tagUrn, tagInfo.name));
                            complete(null);
                        }
                    });
            } else {
                tagInfo['name'] = 'encoded96';
                tagInfo.EPC96['tag'] = tag;
                self.updateTagInfo(tagUrn, ts, tagInfo);
                self.addTagInfo(tagUrn, tagInfo);
                self.logger.debug(util.format("NEW TAG---(encoded96)-------> URN: %s Name: %s", tagUrn, tagInfo.name));
                complete(null);
            }
        } else if (ts.getEPCParameterSync().getNameSync() === 'EPCData') {
            tagInfo['EPCData'] = {};
            tagInfo['name'] = 'data';
            tagInfo.EPCData['tag'] = tag;
            tagInfo.EPCData['dataSize'] = ts.getEPCParameterSync().getEPCSync().sizeSync();
            tagInfo.EPCData['binaryData'] = ts.getEPCParameterSync().getEPCSync().encodeBinarySync().toStringSync();
            self.updateTagInfo(tagUrn, ts, tagInfo);
            self.addTagInfo(tagUrn, tagInfo);
            self.logger.debug(util.format("NEW TAG----(EPCData)------> URN: %s Name: %s", tagUrn, tagInfo.name));
            complete(null);
        }
    } else {
        tagInfo = self.tagEvents.get(tagUrn);
        self.logger.debug(util.format("SEEN AGAIN----------> URN: %s Name: %s", tagUrn, tagInfo.name));
        self.updateTagInfo(tagUrn, ts, tagInfo);
        complete(null);
    }
};

LLRPReader.prototype.addTagInfo = function (tagUrn, tagInfo) {
    //new
    if (this.smoothing) {
        this.llrpSmothing.newTags.push(tagUrn);
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
    if (self.smoothing) {
        tagInfo['reportAmountForSmoothing'] = 0;
    }
};

LLRPReader.prototype.execSmoothing = function () {
    var smoothTags = this.llrpSmothing.doSmoothing(this.tagEvents);
    if (smoothTags) {
        this.buildAndSend(smoothTags);
    }
};

LLRPReader.prototype.eventCycle = function (accessReport) {
    var self = this;
    try {
        var reportTags = accessReport.getTagReportDataListSync().toArraySync();
        self.logger.debug(util.format("EVENT CYCLE TOTAL----------> %d", reportTags.length));
        if (reportTags.length === 0) {
            if (this.smoothing) {
                self.execSmoothing();
            }
        } else {
            async.each(reportTags,
                LLRPReader.prototype.getTagInfo.bind(self),
                function (err) {
                    if (err) {
                        if (self.logger) {
                            self.error(err);
                        };
                    } else {
                        if (!self.smoothing) {
                            self.llrpSmothing.logTags("All no smoothing", self.tagEvents.values());
                            self.buildAndSend(self.tagEvents.values());
                            self.tagEvents.clear();
                        } else {
                            self.execSmoothing();
                        }
                    }
                });
        }
    } catch (e) {
        self.logger.error(e);
    }
};

LLRPReader.prototype.buildAndSend = function (tagsInfo) {
    var observations = this.llrpObservs.getEPCObservations(tagsInfo);
    var self = this;
    self.logger.debug("---------------------Sending observations-------------------");
    observations.forEach(function (obsrv) {
        if (self.sendObservation) {
            self.sendObservation(self, obsrv);
        } else {
            self.logger.debug(util.format("Observation tag data %s \n json%s", obsrv.epcString, JSON.stringify(obsrv, undefined, 4)));
        }
    });
};

LLRPReader.prototype.sendError = function (error) {
    var llrpError = this.llrpObservs.getErrorObservations(error);
    if (this.sendObservation) {
        this.sendObservation(this, llrpError);
    } else {
        this.logger.debug(util.format("Error observation data \n json: %s", JSON.stringify(llrpError, undefined, 4)));
    }
};

LLRPReader.prototype.stop = function (complete) {
    try {
        if (this.isConnected) {
            //this.sendMessage('CLOSE_CONNECTION', this.closeConnection);
            this.socket.destroy();
        }
        this.configReaderSet = false;
        this.isConnected = false;
        complete(null);
    } catch (e) {
        complete(e);
    }
};

LLRPReader.prototype.command = function (observation, complete) {
    try {
        if (observation["@type"] === "/amtech/linkeddata/types/composite/observation/gpoWriteDataEPC") {
            //send llrp GPOWriteData
            var gpoWriteData = java.newInstanceSync('org.llrp.ltk.generated.parameters.GPOWriteData');
            gpoWriteData.setGPOPortNumber(observation.gpoPort);
            gpoWriteData.setGPOData(observation.gpoData);
            this.sendMessage('GPOWriteData', gpoWriteData);
        } else {
            complete(new Error("LLRPReader support commands of observations type gpoWriteDataEPC"));
        }
    } catch (e) {
        complete(e);
    }
};
module.exports.LLRPReader = LLRPReader;