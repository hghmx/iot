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
var hashMap = require('hashmap');
var smoothNew = 'new';
var smoothLost = 'lost';
var util = require('util');

function LLRPSmoothing( isReaderSmoothing, antennas,
                         llrpObservs,reportAmountForSmoothing,
                          logger  ) {
    this.antennas = antennas;
    this.isReaderSmoothing = isReaderSmoothing;
    this.smoothig = this.setSmoothing(isReaderSmoothing);    
    this.llrpObservs = llrpObservs;
    this.reportAmountForSmoothing = reportAmountForSmoothing;
    this.logger = logger;
    
    if(this.smoothig){
        this.newTags = [];
        this.lostTags = [];
        this.isNoSmothAntenna = this.setNoSmothAntenna();
    }
};

LLRPSmoothing.prototype.setNoSmothAntenna = function () {
    var self = this;
    var noSmothAntenna = false;
    if(self.antennas){
        self.antennas.forEach(function(_antenna){
            if(_antenna.smoothing !== undefined && _antenna.smoothing === false ){
                noSmothAntenna = true;
            }
        });
    }
    return noSmothAntenna;
};

LLRPSmoothing.prototype.setSmoothing = function (smoothing) {
    var self = this;
    var smoothing = smoothing;
    if(self.antennas){
        self.antennas.forEach(function(_antenna){
            if(_antenna.smoothing){
                smoothing = true;
            }
        });
    }
    return smoothing;
};

LLRPSmoothing.prototype.getAntennaSmoothing = function (antennaId) {
    var smoothing = this.llrpObservs.getAntennaValueOrDefault(antennaId, 'smoothing', this.isReaderSmoothing);
    this.logger.debug(util.format("Antenna id %d got isReaderSmoothing %s", antennaId, smoothing));
    return smoothing;
};

LLRPSmoothing.prototype.doSmoothing = function (tagEvents) {
    var self = this;
    if(!tagEvents || tagEvents.count === 0 ) return null;
    self.applySmooth(tagEvents);
    if(!self.newTags && !self.lostTags && !self.isNoSmothAntenna) return;
    var smoothTags = [];
    //Send none smooth tags by antenna
    if(self.isNoSmothAntenna){
        var noSmoothNew = [];
        for(var index in self.newTags){
            var tagNew = tagEvents.get(self.newTags[index]);
            if(!self.getAntennaSmoothing(tagNew.antenna)){
                smoothTags.push(tagNew);
                noSmoothNew.push({newIndex:index, tagUrn : tagNew.tagUrn });
            }
        }
        if(noSmoothNew.length>0){
            noSmoothNew.forEach(function(toDel){
                self.newTags.splice(toDel.newIndex, 1);
                tagEvents.remove(toDel.tagUrn);
            });
        }
        self.logTags("Non Smoothing", smoothTags);
    }    
    //Send new event
    self.newTags.forEach(function (tagUrn) {
        var tagNew = tagEvents.get(tagUrn);
        tagNew['smoothingResult'] = smoothNew;
        smoothTags.push(tagNew);
    });
    self.logTags("New", smoothTags, smoothNew);

    self.lostTags.forEach(function (tagUrn) {
        var tagLost = tagEvents.get(tagUrn);
        tagLost['smoothingResult'] = smoothLost;
        smoothTags.push(tagLost);
    });
    self.logTags("Lost", smoothTags, smoothLost);
    self.lostTags.forEach(function (tagUrn) {
        tagEvents.remove(tagUrn);
    });
    tagEvents.forEach(function (tagInfo) {
        if (tagInfo.reportAmountForSmoothing === 0) {
            tagInfo.reportAmountForSmoothing = 1;
        }
    });
    //clean
    self.lostTags = [];
    self.newTags = [];
    return smoothTags;
};

LLRPSmoothing.prototype.getReportAmountForSmoothing = function (antennaId) {
    var reportAmount = this.llrpObservs.getAntennaValueOrDefault(antennaId, 'reportAmountForSmoothing', this.reportAmountForSmoothing);
    this.logger.debug(util.format("Antenna id %d got reportAmountForSmoothing %s", antennaId, reportAmount));
    return reportAmount;
};

LLRPSmoothing.prototype.applySmooth = function (tagEvents) {
    var self = this;
    tagEvents.forEach(function(tag){
        if(tag.reportAmountForSmoothing > 0){
            tag.reportAmountForSmoothing += 1;
        }
        if(tag.reportAmountForSmoothing >= self.getReportAmountForSmoothing(tag.antenna)){
            self.lostTags.push(tag.tagUrn);
        }
    }); 
};

LLRPSmoothing.prototype.logTags = function (comment, tags, smoothStatus) {
    var self = this;
    if(self.logger && self.logger.transports.console.level === "debug"){
        self.logger.debug(util.format("---------------------%s--------------", comment));
        tags.forEach(function (ts) {
            if(!smoothStatus){
                self.logger.debug(util.format("Tag data %s \n json%s", ts.tag, JSON.stringify(ts, undefined, 4)));
            }else if(ts.smoothingResult === smoothStatus){
                 self.logger.debug(util.format("Tag data %s \n json%s", ts.tag, JSON.stringify(ts, undefined, 4)));
            }
        });        
    }
};

module.exports.LLRPSmoothing = LLRPSmoothing;



