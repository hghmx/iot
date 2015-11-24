/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
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