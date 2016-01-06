/*******************************************************************************
 * Copyright (C) 2015 AmTech.
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *******************************************************************************/
function COAP() {
}

/**
 * Method called from the bridge at starting time. It's used to initialize the plugin and receive the initial configuration.
 * 
 * @param context{  
 *  bc config object instance
 *  observationsCnfg plugin production configuration information,
 *  thingInstance plugin thinh type instance,
 *  logger logger object instance}
 *  complete function 
 */
COAP.prototype.start = function function (context, complete){
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
COAP.prototype.stop = function (complete) {
    try {

        complete(null);
    } catch (e) {
        complete(e);
    }
};

/**
 * Method called from the bridge when a command has been sent to a plugin instance
 * 
 * @param observation
 * @param complete
 */
COAP.prototype.command = function (observation, complete) {
    try {

    } catch (e) {
        complete(e);
    }
};

module.exports.COAP = COAP;