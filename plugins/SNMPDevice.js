function SNMPDevice(){
}

SNMPDevice.prototype.start = function ( thingTypeCnfg, thingInfo, complete) {
    try{
        complete(null);
    }catch(e){
        complete(e);
    }
};

SNMPDevice.prototype.stop = function (complete) {
    try{
        complete(null);
    }catch(e){
        complete(e);
    }
};

SNMPDevice.prototype.update = function ( observation, complete) {
    try{
        complete(new Error("Testing Error"));
        //complete(null);
    }catch(e){
        complete(e);
    }
};

SNMPDevice.prototype.command = function ( observation, complete) {
    try{
        complete(null);
    }catch(e){
        complete(e);
    }
};

module.exports.SNMPDevice = SNMPDevice;