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

//Percentage of space used on disk: .1.3.6.1.4.1.2021.9.1.9.1
//(Used – buffers – cached) / Total * 100 = % memory used http://www.debianadmin.com/linux-snmp-oids-for-cpumemory-and-disk-statistics.html
//The OIDs (ssCpuRawUser,ssCpuRawnice,ssCpuRawSystem,ssCpuRawIdle,ssCpuRawWait,ssCpuRawKernel,ssCpuRawInterrupt) are The number of 'ticks' (typically 1/100s) spent processing those catagories.
//the formula Truncate({100-{ssCpuRawIdle}/({ssCpuRawKerne}+{ssCpuRawIdle}+{ssCpuRawSystem}+{ssCpuRawUse}+{ssCpuRawWait}+{ssCpuRawnice})*100},2)
var snmp = require('snmpjs');
var async = require('async');
require('string.prototype.endswith');
var moment = require('moment');
var util = require('util');
var clone = require('clone');
//snmpTrapOID
var SNMP_TRAP_OID = "1.3.6.1.6.3.1.1.4.1.0";
//coldStart OID 
var COLDSTART_OID = "1.3.6.1.6.3.1.1.5.1";
// warmStart OID 
var WARMSTART_OID = "1.3.6.1.6.3.1.1.5.2";
// linkDown OID 
var LINKDOWN_OID = "1.3.6.1.6.3.1.1.5.3";
//linkUp OID 
var LINKUP_OID = "1.3.6.1.6.3.1.1.5.4";
//trap timestamp
var TRAP_TIMESTAMP = "1.3.6.1.2.1.1.3.0";
var TRAP_PORT = 162;

function SNMPDevice() {
}

SNMPDevice.prototype.start = function ( context, complete) {
    try {
        var self = this;
        self.client = snmp.createClient();
        var operations = [];
        self.ipaddress = context.thingInstance.ipaddress;
        self.communityString = context.thingInstance.communityString;
        self.thingId = context.thingInstance._name;
        self.thingType = context.thingInstance["@type"];
        self.frequency = moment.duration(context.thingInstance.readFrequency).asMilliseconds();
        self.snmpVersion = self.getSnmpVer( context.thingInstance.snmpVersion);
        self.observationsCnfg = context.observationsCnfg;
        
        self.logger = context.logger;

        if (context.thingInstance.getOIDs || context.thingInstance.getOIDs.length > 0) {
            self.getOIDs = JSON.parse(context.thingInstance.getOIDs);
            if (self.hasGets()) {
                self.getResults = [];
                operations.push(self.snmpget.bind(self));
            }
        }

        if (context.thingInstance.setOIDs || context.thingInstance.setOIDs.length > 0) {
            self.setOIDs = JSON.parse(context.thingInstance.setOIDs);
            if (self.hasSets()) {
                operations.push(self.snmpset.bind(self));
            }
        }
        //operations.push(self.setTrapListener.bind(self));
        async.parallel(operations,
                function (err) {
                    self.sendGetResults();
                    self.setGetWithFrequency();
                    complete(err);
                });
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.getSnmpVer = function (ver) {
    switch (ver) {
	case "1":
            return 0;
	case "2c":
            return 1;
	default:
            throw new Error('SNMP version ' + ver +' is unsupported');
	}
};

SNMPDevice.prototype.setGetWithFrequency = function () {   
    var self = this;
    self.clearGetInterval();
    if (self.hasGets() && !self.getInterval) {
        self.client = snmp.createClient();
        self.getInterval = setInterval(function () {
            self.snmpget(function (err) {
                if (err) {
                    //send error
                    //log error
                }
                self.sendGetResults();
            });
        }, self.frequency);
    } else {
        self.closeClient();
    }
};

SNMPDevice.prototype.sendGetResults = function () {
    if (this.getResults) {
        //send getResults observation
        var snmpRead = this.newSnmpRead(this.getResults);
        this.sendObservation(this, snmpRead);
        this.getResults = [];
    }
};

SNMPDevice.prototype.closeClient = function () {
    if (this.client) {
        this.client.close();
        this.client = null;    
    }
};

SNMPDevice.prototype.hasGets = function () {
    return this.getOIDs && this.getOIDs.length > 0;
};

SNMPDevice.prototype.hasSets = function () {
    return this.setOIDs && this.setOIDs.length > 0;
};

SNMPDevice.prototype.snmpget = function (complete) {
    var self = this;
    async.each(self.getOIDs, self.get.bind(self),
            function (err) {
                if (err) {
                    complete(err);
                } else {
                    complete(null);
                }
            });
};

SNMPDevice.prototype.get = function (getOid, complete) {
    var self = this;
    function finOidById(oid) {
        for (var i = 0; i < self.getOIDs.length; i++) {
            if (self.getOIDs[i].oid === oid || self.getOIDs[i].oid.endsWith(oid)) {
                return self.getOIDs[i];
            }
        }
        return null;
    };
    self.client.get(self.ipaddress, self.communityString, self.snmpVersion, getOid.oid, function (snmpmsg) {
        snmpmsg.pdu.varbinds.forEach(function (varbind) {
            if(self.logger){ 
                self.logger.debug(util.format("SNMPDevice id %s varbind.oid = " , self._name, varbind.data.value));
            };
            var getOid = finOidById(varbind.oid);
            if (getOid) {
                self.getResults.push({name: getOid.name, oid: getOid.oid, value: varbind.data.value, type: varbind.data.typename});
            } else {
                //log error send error
                var snmpError = self.newSnmpError(0, "An ID has been read without a matching value in the configuration");
            }
        });
        complete(null);
    });
};

SNMPDevice.prototype.snmpset = function (complete) {
    var self = this;
    async.each(self.setOIDs, self.set.bind(self),
            function (err) {
                if (err) {
                    complete(err);
                } else {
                    complete(null);
                }
            });
};

SNMPDevice.prototype.set = function (setOid, complete) {
    var self = this;
    self.client.set(self.ipaddress, self.communityString, self.snmpVersion, setOid.oid, snmp.data.createData({type: setOid.type,
        value: setOid.value}), function (snmpmsg) {
        if(self.logger){ 
            self.logger.debug(util.format("SNMPDevice id %s set error %s", self._name, snmp.pdu.strerror(snmpmsg.pdu.error_status)));
        };
        if (snmpmsg.pdu.error_status !== 0) {
            //send snmp error message
            var snmpError = self.newSnmpError( snmpmsg.pdu.error_status, snmp.pdu.strerror(snmpmsg.pdu.error_status));
        }
        complete(null);
    });

};

SNMPDevice.prototype.setTrapListener = function (complete) {
    try{
        var self = this;
        self.trapListener = snmp.createTrapListener();
        var options = {family: 'udp4', port: TRAP_PORT, addr:  self.ip};
        self.trapListener.bind(options, function(err){
            if(!err){
                self.trapOn = true;
                self.trapListener.on('trap', function (msg) {
                    //send trap observation
                    var ms =snmp.message.serializer(msg);
                    if(ms.pdu.error_index !== 0){
                        //log error
                        //send error
                        var snmpError = self.newSnmpError( ms.pdu.error_index, ms.pdu.error_status);

                    }else{
                        var trapOID, trapTimeTicks, variableBinds;
                        var index = 0;
                        var found = ms.pdu.varbinds.find(function(item){                
                            if(item.oid === SNMP_TRAP_OID){
                                return item;
                            }
                            index++;
                        });
                        if(found){
                            trapOID = found.value;
                            ms.pdu.varbinds.splice(index, 1);
                        }
                        index = 0;
                        found = ms.pdu.varbinds.find(function(item){
                            if(item.oid === TRAP_TIMESTAMP){
                                return item;
                            }
                            index++;
                        });
                        if(found){
                            trapTimeTicks = found.value;
                            ms.pdu.varbinds.splice(index, 1);
                        }
                        variableBinds = JSON.stringify(ms.pdu.varbinds);
                        var newSnmpTrup = self.newSnmpTrup(trapOID, trapTimeTicks, variableBinds);
                        self.sendObservation(self, newSnmpTrup);
                    }
                    if(self.logger){ 
                        self.logger.debug(util.format("SNMPDevice id %s trap message %s", self._name, snmp.message.serializer(msg)));
                    }
                });
                complete(null);
            }else{
                var error = new Error(util.format("SNPDevice id: %s error setting snmp trap error %s", self['@id'], err.message));
                complete(error);
            }

        });
    }catch(err){
        var error = new Error(util.format("SNPDevice id: %s error setting snmp trap error %s", self['@id'], err.message));
        complete(error);
    }
};

SNMPDevice.prototype.clearGetInterval = function () {
    if(this.getInterval){
        clearInterval(this.getInterval);
        this.getInterval = null;
    }    
};

SNMPDevice.prototype.stop = function (complete) {
    try {
        this.clearGetInterval();
        this.closeClient();
        if(this.trapOn || this.trapListener ){
            this.trapListener.close();
        }
        this.logger.info(util.format("Stop plugin id: %s", this['@id']));
        complete(null);
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.executeSet = function (setOIDs, complete) {
    try {
        var self = this;
        if (setOIDs.length > 0) {
            this.setOIDs = JSON.parse(setOIDs);
            if (this.hasGets()) {
                this.getResults = [];
                self.snmpget(function (err) {
                    if (err) {
                        complete(err);
                        //log error
                    } else {
                        complete(null);
                    }
                });
            }
        } else {
            this.setOIDs = setOIDs;
            complete(null);
        }
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.command = function (observation, complete) {
    try {
        if(observation["@type"] === "/amtech/linkeddata/types/composite/observation/snmpSet"){
            this.executeSet(observation.setOIDs, complete); 
        }else{
            complete(new Error("SNMPDevice support commands just of observations type snmpSet"));
        }
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.newSnmpRead = function (getOIDs) {   
    var snmpRead = clone(   {
            "topic": "",
            "creationDate": "2015-10-29T16:45:46.452Z",
            "targetthings": "[]",
            "location": "",
            "description": "",
            "guesttenants": [],
            "@type": "/amtech/linkeddata/types/composite/observation/snmpRead",
            "producer": "",
            "detectiontime": "2015-10-24T15:30:07.000Z",
            "occurrencetime": "2015-10-24T15:30:07.000Z",
            "getOIDs": ""
        }); 
        if( this.location){
            snmpRead.location = this.location;
        }
        
        snmpRead.targetthings = this.observationsCnfg.get("snmpRead").thingsconfig;
        snmpRead.producer = this.observationsCnfg.get("snmpRead").producerschema;
        snmpRead.topic = this.observationsCnfg.get("snmpRead").topicschema;
        
        snmpRead.getOIDs = JSON.stringify(getOIDs);
        snmpRead.occurrencetime = new Date().toISOString();
        return snmpRead;
};

SNMPDevice.prototype.newSnmpTrup = function ( trapOID, trapTimeTicks, variableBinds) {
    var snmpTrup = clone({
        "topic": "",
        "targetthings": "[]",
        "location": "",
        "@type": "/amtech/linkeddata/types/composite/observation/snmpTrap",
        "trapTimeTicks": 0,
        "creationDate": "2015-10-29T17:52:00.445Z",
        "guesttenants": [],
        "description": "",
        "producer": "",
        "detectiontime": "2015-10-29T17:26:46.000Z",
        "occurrencetime": "2015-10-29T17:26:46.000Z",
        "trapOID": "",
        "variableBinds": ""
    });
    if (this.location) {
        snmpTrup.location = this.location;
    }
    
    snmpTrup.targetthings = this.observationsCnfg.get("snmpTrap").thingsconfig;
    snmpTrup.producer = this.observationsCnfg.get("snmpTrap").producerschema;
    snmpTrup.topic = this.observationsCnfg.get("snmpTrap").topicschema;    
    snmpTrup.variableBinds = variableBinds;
    snmpTrup.occurrencetime = new Date().toISOString();
    snmpTrup.trapOID = trapOID;
    snmpTrup.trapTimeTicks = trapTimeTicks;
    return snmpTrup;
};

SNMPDevice.prototype.newSnmpError = function (code, message) {
    var snmpError = clone(
            {
                "topic": "",
                "targetthings": "[]",
                "location": "",
                "@type": "/amtech/linkeddata/types/composite/observation/snmpError",
                "code": 0,
                "message": "",
                "creationDate": "2015-10-29T21:30:33.805Z",
                "guesttenants": [],
                "description": "",
                "producer": "",
                "detectiontime": "2015-10-29T19:03:44.000Z",
                "occurrencetime": "2015-10-29T19:03:44.000Z"
            });
    if (this.location) {
        snmpError.location = this.location;
    }
    snmpError.targetthings = this.observationsCnfg.get("snmpError").thingsconfig;
    snmpError.producer = this.observationsCnfg.get("snmpError").producerschema;
    snmpError.topic = this.observationsCnfg.get("snmpError").topicschema;    
    snmpError.code = code;
    snmpError.occurrencetime = new Date().toISOString();
    snmpError.message = message;
    return snmpError;
};
module.exports.SNMPDevice = SNMPDevice;
