/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
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

function LLRPReader() {

};

LLRPReader.prototype.getLLRPCmd = function (filename) {
    var file = new File(filename);
    var llrpMsg =  java.callStaticMethodSync("org.llrp.ltk.util.Util", "loadXMLLLRPMessage", file);
    return llrpMsg;
};

LLRPReader.prototype.setCommands = function () {
    this.getReaderCapability = this.getLLRPCmd("getReaderCapabilities.llrp");
    this.keepAliveAck =  this.getLLRPCmd("keepAliveAck.llrp");
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
	self.client.on('data',  self.startEventCycle.bind(self));
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
                    }else{
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
                    if(self.readerCapabilities.getGeneralDeviceCapabilitiesSync().getCanSetAntennaPropertiesSync().intValueSync() === 1){
                        self.sendMessage('SET_READER_CONFIG', self.setReaderConfig);
                    }else{
                        self.configReaderSet =  true;
                        self.sendMessage('ADD_ROSPEC', self.addRospec);                      
                    }
                    break;
                    //6
                case messageC.SET_READER_CONFIG_RESPONSE:
                    self.configReaderSet =  true;
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

LLRPReader.prototype.eventCycle = function (accessReport) {
    var self = this;
    var size = accessReport.getTagReportDataListSync().sizeSync();
    for(var i = 0; i < size; i++){
        var ts = accessReport.getTagReportDataListSync().getSync(i);
        var tag = ts.getEPCParameterSync().getEPCSync().toStringSync();
        self.tagEvents.set( tag, {  tag: tag,  
                                    name: ts.getEPCParameterSync().getNameSync(),
                                    lastSeen: new Date().toString(),
                                    antenna: ts.getAntennaIDSync().getAntennaIDSync().intValueSync(),
                                    PeakRSSI: ts.getPeakRSSISync().getPeakRSSISync().toIntegerSync()});
    }
    console.log('-------------------------------------------------------------------------------------------------');
    self.tagEvents.forEach(function (ts) {
       console.log(util.format( "Tag data %s \n json%s" ,ts.tag, JSON.stringify(ts, undefined, 4) )); 
    });
    self.tagEvents.clear();
    
};

LLRPReader.prototype.stop = function (complete) {
    try {
        if(this.isConnected){
            this.sendMessage('CLOSE_CONNECTION', this.closeConnection);
        }
        this.configReaderSet =  false;
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

module.exports.LLRPReader = LLRPReader;