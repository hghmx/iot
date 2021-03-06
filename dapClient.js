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
var rest = require('restler');
var baseUrl = '/amtech';
var observationsUrl = baseUrl + '/things/events';
var newInstanceUrl = baseUrl + '/things/entities';
var getConfigUrl = baseUrl + '/system/queries/observationconfigfromactivities';
var getPluginInstances = baseUrl + '/observersexec/amtech/observers/getThingsByType';
var geoUrl = baseUrl + '/geo/address';
var util = require('util');

function DapClient(dapUrl, user, tenant, password) {
    this.dapUrl = dapUrl;
    this.user = user;
    this.tenant = tenant;
    this.password = password;
}

DapClient.prototype._options = function() {
    var self = this;
    var username = self.user;
    if (self.tenant !== null) {
        username += "/" + self.tenant;
    }
    return {
        username : username,
        password : self.password
    };
};

DapClient.prototype.sendObservation = function (observation, complete) {
   var self = this;
    var options = self._options();
    rest.postJson(self.dapUrl + observationsUrl, observation, options).on(
            'complete',
            function(data, response) {
                if (response && response.statusCode && response.statusCode !== 200) {
                    complete(self.buildError(response, "Sending observation"), data);
                } else if (data instanceof Error) {
                    complete(data);
                } else if (data['success'] === false) {
                    complete(self.buildDapError(data, 'At DapClient sendObservation'), data);
                } else {
                    complete();
                }
            });
};

DapClient.prototype.buildError = function (response, msg) {
    var error =  new Error(  
        util.format("%s (%d) %s", msg, response.statusCode,  
        response.statusMessage ? response.statusMessage : 'Unknown error' ));
    error.code = response.statusCode;
    return error;  
};

DapClient.prototype.getConfiguration = function (complete) {
    var self = this;
    var options = self._options();
    options.query = options.query || {};
    options.query['selfContained'] = true;
    rest.get(self.dapUrl + getConfigUrl, options).on(
        'complete',
        function (data, response) {
            if (response && response.statusCode && response.statusCode !== 200) {
                complete(self.buildError(response, "Getting observation production configuration"), data);
            } else if (data instanceof Error) {
                complete(data);
            } else if ('success' in data && !data['success']) {
                complete(self.buildDapError(data, 'At DapClient getConfiguration'), data);
            } else {
                complete(null, data.results);
            }
        });
};

DapClient.prototype.getPluginsInstances = function (pluginType, complete) {
    var self = this;
    var options = self._options();
    options.query = options.query || {};
    options.query['selfContained'] = true;
    options.query['/amtech/observers/getThingsByType/entitiesFilter/ProgressNextAttendee/resourcetype'] = pluginType;
    rest.get(self.dapUrl + getPluginInstances, options).on(
        'complete',
        function (data, response) {
            if (response && response.statusCode && response.statusCode !== 200) {
                complete(self.buildError(response, "Getting plugins instances"), data);
            } else if (data instanceof Error) {
                complete(data);
            } else if ('success' in data && !data['success']) {
                complete(self.buildDapError(data, 'At DapClient getPluginsInstances'), data);
            } else {
                complete(null, data.queriesresults.members[0].entities);
            }
        });
};

DapClient.prototype.buildDapError = function (data, msg) {
    return  new Error(  
        util.format("%s %s (detail: %s %s)", msg, data['message'], data['messagedetail'],  data['resource']));
};

DapClient.prototype.getThing = function ( url, complete) {
    var self = this;
    var options = self._options();
    options.query = options.query || {};
    options.query['selfContained'] = true;
    rest.get(self.dapUrl + url, options).on(
        'complete',
        function (data, response) {
            if (response && response.statusCode && response.statusCode !== 200) {
                complete(self.buildError(response, "Getting a plugging instance"), data);
            } else if (data instanceof Error) {
                complete(data);
            } else if ('success' in data && !data['success']) {
                complete(self.buildDapError(data, 'At DapClient getThing'), data);
            } else {
                complete(null, data);
            }
        });
};

DapClient.prototype.getBoxLocation = function (address, complete) {
    var self = this;
    var options = self._options();
    rest.postJson(self.dapUrl + geoUrl, address, options).on(
            'complete',
            function (data, response) {
                if (response && response.statusCode && response.statusCode !== 200) {
                    complete(self.buildError(response, "Getting bridge location"), data);
                } else if (data instanceof Error) {
                    complete(data);
                } else if (data['success'] === false) {
                    complete(self.buildDapError(data, 'At DapClient getBoxLocation'), data);
                } else {
                    complete(null, data.results);
                }
            });
};

DapClient.prototype.newInstance = function (newInstance, complete) {
   var self = this;
    var options = self._options();
    rest.postJson(self.dapUrl + newInstanceUrl, newInstance, options).on(
            'complete',
            function(data, response) {
                if (response && response.statusCode && response.statusCode !== 200) {
                    complete(self.buildError(response, "Creating new Instance"), data);
                } else if (data instanceof Error) {
                    complete(data);
                } else if (data['success'] === false) {
                    complete(self.buildDapError(data, 'At DapClient newInstance'), data);
                } else {
                    complete();
                }
            });
};

module.exports = {
    DapClient : DapClient
};
