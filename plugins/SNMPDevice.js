function SNMPDevice(){     
}

SNMPDevice.prototype.start = function (thingTypeCnfg, thingInfo, complete) {
    complete(null);
};

SNMPDevice.prototype.stop = function (complete) {
    complete(null);
};

SNMPDevice.prototype.update = function (complete) {
    complete(null);
};

SNMPDevice.prototype.command = function (complete) {
    complete(null);
};

module.exports.SNMPDevice = SNMPDevice;