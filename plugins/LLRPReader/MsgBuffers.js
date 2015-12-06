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
var slice = require('sliced');
function MsgBuffers() {
    this.pending = undefined;
};

MsgBuffers.prototype.getMsgs = function (buffer) {
    var self = this;
    var fm = [];
    if (buffer.length === 0) {
        return undefined;
    }
    
    var workingBuffer;
    if (self.pending) {
        workingBuffer = new Buffer(buffer.length + self.pending.length );
        self.pending.copy(workingBuffer);
        buffer.copy( workingBuffer, self.pending.length);
        self.pending = undefined;
    }else{
        workingBuffer = new Buffer(buffer.length);
        buffer.copy( workingBuffer);
    }
    
    var bp = 0;
    while (bp < workingBuffer.length) {
        var length = workingBuffer.readUInt32BE(bp + 2);
        if (bp + length <= workingBuffer.length) {
            fm.push({
                type: ((workingBuffer[bp] & 3) << 8) | workingBuffer[bp + 1], //type is the first 2 bits of the first octet and the second octet.
                length: length, //total length of message in octets.
                id: workingBuffer.readUInt32BE(bp + 6), //id would be read from the 7th octet, 4 octets.
                data: slice(workingBuffer, bp, bp + length) //the parameter value would be starting from 11 up to the end of the curernt message.
            });
        } else {
            self.pending = new Buffer(workingBuffer.length - bp );
            workingBuffer.copy(self.pending, 0, bp );
        }
        bp += length;
    }
    return fm;
};
module.exports.MsgBuffers = MsgBuffers;