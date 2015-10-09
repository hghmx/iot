"use strict";
var rest = require('restler');
var baseUrl = '/amtech';
var observationsUrl = baseUrl + '/things/events';
var getConfigUrl = baseUrl + '/system/queries/getobservationconfig';

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
                if (response.statusCode != 200) {
                    complete(new Error(
                            'Not a 200 OK response sending observation: '
                                    + response.statusCode));
                } else if (data instanceof Error) {
                    complete(data);
                } else if (data['success'] === false) {
                    complete(new Error(data['message'] + " (detail: "
                            + data['messageDetail'] + ")"));
                } else {
                    complete();
                }
            });
};

DapClient.prototype.getConfiguration = function (complete) {
    var self = this;
    var options = self._options();
    options.query = options.query || {};
    options.query['selfContained'] = true;
    rest.get(self.dapUrl + getConfigUrl, options).on(
        'complete',
        function (data, response) {
            if (response.statusCode != 200) {
                complete(new Error(
                        'Not a 200 OK response while retrieving resource: '
                        + response.statusCode));
            } else if (data instanceof Error) {
                complete(data);
            } else if ('success' in data && !data['success']) {
                complete(new Error(data['message'] + " (detail: "
                        + data['messageDetail'] + ")"));
            } else {
                complete(null, data.results);
            }
        });
};

DapClient.prototype.getThing = function ( url, complete) {
    var self = this;
    var options = self._options();
    options.query = options.query || {};
    options.query['selfContained'] = true;
    rest.get(self.dapUrl + url, options).on(
        'complete',
        function (data, response) {
            if (response.statusCode != 200) {
                complete(new Error(
                        'Not a 200 OK response while retrieving resource: '
                        + response.statusCode));
            } else if (data instanceof Error) {
                complete(data);
            } else if ('success' in data && !data['success']) {
                complete(new Error(data['message'] + " (detail: "
                        + data['messageDetail'] + ")"));
            } else {
                complete(null, data.results);
            }
        });
};

module.exports = {
    DapClient : DapClient
};