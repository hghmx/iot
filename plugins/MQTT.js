/**
 * http://usejsdoc.org/
 */
var logger = require('./../logger').logger;

function MQTT() {
}

/**
 * Method called from the bridge at starting time. It's used to initialize the plugin and receive the initial configuration.
 * 
 * @param bc bridge instance
 * @param thingTypeCnfg info
 * @param thingInfo details
 * @param complete function 
 */
MQTT.prototype.start = function (bc, thingTypeCnfg, thingInfo, complete) {
	logger.debug("Starting MQTT plugin");
    try {
        var self = this;
    } catch (e) {
        complete(e);
    }
};

/**
 * Method called from the bridge to stop the work session. It's used to release resources like network connections.
 * 
 * @param complete function
 */
MQTT.prototype.stop = function (complete) {
    try {

        complete(null);
    } catch (e) {
        complete(e);
    }
};

/**
 * Method called from the bridge to propagate an observation or a list of observations.
 * 
 * @param observation update
 * @param complete function
 */
MQTT.prototype.update = function (observation, complete) {
    try {
        var self = this;
    } catch (e) {
        complete(e);
    }
};

/**
 * 
 * 
 * @param observation
 * @param complete
 */
MQTT.prototype.command = function (observation, complete) {
    try {

    } catch (e) {
        complete(e);
    }
};


module.exports.MQTT = MQTT;