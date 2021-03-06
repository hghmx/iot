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
'use strict';
var define = function (name, value, exportsObject) {
	//check if exportsObject is set.
	if (exportsObject === undefined) {
		//tell them there is an error.
		throw new Error('Undefined exportsObject in defining constants.');
	}

	//defining our constant.
	Object.defineProperty(exportsObject, name, {
		'value': value,
		'enumerable': true,
		'writable': false //non-writable, making it a constant.
	});

	//defining our constant, reversed with key as value and value as key.
	Object.defineProperty(exportsObject, value, {
		'value': name,
		'enumerable': true,
		'writable': false //non-writable, making it a constant.
	});
};

var exportsObject = {};

/*--Constants--
-----------------------------------------------------------------------------*/
define('GET_READER_CAPABILITIES', 1, exportsObject);
define('GET_READER_CAPABILITIES_RESPONSE', 11, exportsObject);
define('ADD_ROSPEC', 20, exportsObject);
define('ADD_ROSPEC_RESPONSE', 30, exportsObject);
define('DELETE_ROSPEC', 21, exportsObject);
define('DELETE_ROSPEC_RESPONSE', 31, exportsObject);
define('START_ROSPEC', 22, exportsObject);
define('START_ROSPEC_RESPONSE', 32, exportsObject);
define('STOP_ROSPEC', 23, exportsObject);
define('STOP_ROSPEC_RESPONSE', 33, exportsObject);
define('ENABLE_ROSPEC', 24, exportsObject);
define('ENABLE_ROSPEC_RESPONSE', 34, exportsObject);
define('DISABLE_ROSPEC', 25, exportsObject);
define('DISABLE_ROSPEC_RESPONSE', 35, exportsObject);
define('GET_ROSPECS', 26, exportsObject);
define('GET_ROSPECS_RESPONSE', 36, exportsObject);
define('ADD_ACCESSSPEC', 40, exportsObject);
define('ADD_ACCESSSPEC_RESPONSE', 50, exportsObject);
define('DELETE_ACCESSSPEC', 41, exportsObject);
define('DELETE_ACCESSSPEC_RESPONSE', 51, exportsObject);
define('ENABLE_ACCESSSPEC', 42, exportsObject);
define('ENABLE_ACCESSSPEC_RESPONSE', 52, exportsObject);
define('DISABLE_ACCESSSPEC', 43, exportsObject);
define('DISABLE_ACCESSSPEC_RESPONSE', 53, exportsObject);
define('GET_ACCESSSPECS', 44, exportsObject);
define('GET_ACCESSSPECS_RESPONSE', 54, exportsObject);
define('CLIENT_REQUEST_OP', 45, exportsObject);
define('CLIENT_REQUEST_OP_RESPONSE', 55, exportsObject);
define('GET_REPORT', 60, exportsObject);
define('RO_ACCESS_REPORT', 61, exportsObject);
define('KEEPALIVE', 62, exportsObject);
define('KEEPALIVE_ACK', 72, exportsObject);
define('READER_EVENT_NOTIFICATION', 63, exportsObject);
define('ENABLE_EVENTS_AND_REPORTS', 64, exportsObject);
define('ERROR_MESSAGE', 100, exportsObject);
define('GET_READER_CONFIG', 2, exportsObject);
define('GET_READER_CONFIG_RESPONSE', 12, exportsObject);
define('SET_READER_CONFIG', 3, exportsObject);
define('SET_READER_CONFIG_RESPONSE', 13, exportsObject);
define('CLOSE_CONNECTION', 14, exportsObject);
define('CLOSE_CONNECTION_RESPONSE', 4, exportsObject);
define('CUSTOM_MESSAGE', 1023, exportsObject);

module.exports = exportsObject;