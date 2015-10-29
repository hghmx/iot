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

function SNMPDevice() {
}

SNMPDevice.prototype.start = function (bc, thingTypeCnfg, thingInfo, complete) {
    try {
        var self = this;
        self.client = snmp.createClient();
        var operations = [];
        self.ip = thingInfo.ipaddress;
        self.communityString = thingInfo.communityString;
        self.thingId = thingInfo._name;
        self.thingType = thingInfo["@type"];
        self.frequency = moment.duration(thingInfo.readFrequency).asMilliseconds();
        self.trapsPort = thingInfo.trapsPort;
        
        if(thingInfo.location && thingInfo.location.length>0){
            self.location = thingInfo.location;
        }else if(bc.location){
            self.location = bc.location;
        }

        if (thingInfo.getOIDs || thingInfo.getOIDs.length > 0) {
            self.getOIDs = JSON.parse(thingInfo.getOIDs);
            if (self.hasGets()) {
                self.getResults = [];
                operations.push(self.snmpget.bind(self));
            }
        }

        if (thingInfo.setOIDs || thingInfo.setOIDs.length > 0) {
            self.setOIDs = JSON.parse(thingInfo.setOIDs);
            if (self.hasSets()) {
                operations.push(self.snmpset.bind(self));
            }
        }

        async.parallel(operations,
                function (err) {
                    self.sendGetResults();
                    //set get frequency read if any
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
                    }else{
                        self.closeClient();
                    }
                    //set get traps logic
                    self.setTrapListener();
                    complete(err);
                });
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.sendGetResults = function () {
    if (this.getResults) {
        //send getResults observation
        var snmpRead = this.newSnmpRead(this.getResults);
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
    self.client.get(self.ip, self.communityString, 0, getOid.oid, function (snmpmsg) {
        snmpmsg.pdu.varbinds.forEach(function (varbind) {
            console.log(varbind.oid + ' = ' + varbind.data.value);
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
    self.client.set(self.ip, self.communityString, 0, setOid.oid, snmp.data.createData({type: setOid.type,
        value: setOid.value}), function (snmpmsg) {
        // console.log(snmp.pdu.strerror(snmpmsg.pdu.error_status));
        if (snmpmsg.pdu.error_status !== 0) {
            //send snmp error message
            var snmpError = self.newSnmpError( snmpmsg.pdu.error_status, snmp.pdu.strerror(snmpmsg.pdu.error_status));
        }
        complete(null);
    });

};

SNMPDevice.prototype.setTrapListener = function () {
    var self = this;
    this.trapListener = snmp.createTrapListener();
    this.trapListener.on('trap', function (msg) {
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
        }
        console.log(snmp.message.serializer(msg));
    });
    
    var options = {family: 'udp4', port: this.trapsPort, addr:  this.ip};
    this.trapListener.bind(options, function(err){
        if(!err){
            self.trapOn = true;
        }
    });
};

SNMPDevice.prototype.stop = function (complete) {
    try {
        if(this.getInterval){
            clearInterval(this.getInterval);
            this.getInterval = null;
        }
        this.closeClient();
        if(this.trapOn || this.trapListener ){
            this.trapListener.close();
        }
        complete(null);
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.update = function (observation, complete) {
    try {
        complete(new Error("Testing Error"));
        //complete(null);
    } catch (e) {
        complete(e);
    }
};

SNMPDevice.prototype.command = function (observation, complete) {
    try {
        complete(null);
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
            "@id": "/amtech/things/observations/snmpReadDemo",
            "occurrencetime": "2015-10-24T15:30:07.000Z",
            "getOIDs": ""
        }); 
        if( this.location){
            snmpRead.location = this.location;
        }
        snmpRead.targetthings = [{"thingType": this.thingType,"thingsId":[this.thingId]}];
        snmpRead.getOIDs = getOIDs;
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
        "@id": "/amtech/things/observations/snmpTrapDemo",
        "trapOID": "",
        "variableBinds": ""
    });
    if (this.location) {
        snmpTrup.location = this.location;
    }
    snmpTrup.targetthings = [{"thingType": this.thingType, "thingsId": [this.thingId]}];
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
                "@id": "/amtech/things/observations/snmpErrorDemo",
                "occurrencetime": "2015-10-29T19:03:44.000Z"
            });
    if (this.location) {
        snmpError.location = this.location;
    }
    snmpError.targetthings = [{"thingType": this.thingType, "thingsId": [this.thingId]}];
    snmpError.code = code;
    snmpError.occurrencetime = new Date().toISOString();
    snmpError.message = message;
    return snmpError;
};
module.exports.SNMPDevice = SNMPDevice;