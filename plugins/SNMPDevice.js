function SNMPDevice(){     
}

SNMPDevice.prototype.start = function (thingTypeCnfg, thingInfo, complete) {
    complete(null);
};

SNMPDevice.prototype.stop = function (complete) {
    complete(null);
};

SNMPDevice.prototype.update = function ( update, complete) {
    complete(null);
};

SNMPDevice.prototype.command = function ( cmnd, complete) {
    complete(null);
};

module.exports.SNMPDevice = SNMPDevice;