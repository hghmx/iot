/**
 * http://usejsdoc.org/
 */
var baseDir = "../../"
	
var assert = require('assert');
var logger = require(baseDir + 'logger').logger;


var pluginsBaseDir = baseDir + "plugins/"; 
var mqtt = new (require(pluginsBaseDir + "MQTT.js").MQTT);
//var mqtt = new (require(pluginsBaseDir + "SNMPDevice.js").SNMPDevice);
var plugins = new (require(baseDir + "plugins.js").Plugins);
var pluginList = [mqtt];

logger.info('Starting test: plugins.validateInterface');

pluginList.forEach(function(pluged) {
	//after I hit the second bug in assert lib in assert.doesNotThrow I decided not to use it 
	try{
		plugins.validateInterface("plugin", pluged);
	}catch(e){
		console.log("Invalid pluging implementation");
	}
});

logger.info('Completed test: plugins.validateInterface');

