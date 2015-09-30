'use strict';

var nextConvID = 0;
var unmatchedCompetitors = [];
var clients = {};
var socketIDMap = {};
var conversations = {};
var nextMachineID = 0;
var Cleverbot = require('cleverbot');
var cBot = new Cleverbot;

var Conversation = function (firstComp, secondComp, convID) {
  this.firstComp = firstComp;
  this.secondComp = secondComp;
  this.convID = convID;
  this.firstQuestions = [];
  this.secondQuestions = [];
  this.firstAnswers = [];
  this.secondAnswers = [];
};

Conversation.prototype.askQuestions = function(askerID, questions) {
  if (askerID == this.firstComp) {
    this.firstQuestions = questions;
    var jsonQuestions = JSON.stringify({'questions': questions, 'userID': askerID});
    var receiver = clients[this.secondComp];
    receiver.emit('/about/#receiveQuestions', jsonQuestions);
  }
  else {
    this.secondQuestions = questions;
    var jsonQuestions = JSON.stringify({'questions': questions, 'userID': askerID});
    var receiver = clients[this.firstComp];
    receiver.emit('/about/#receiveQuestions', jsonQuestions);
  }
};

Conversation.prototype.answerQuestions = function(answerID, answers) {
  if (answerID == this.firstComp) {
    this.firstAnswers = answers;
    var jsonAnswers = JSON.stringify({'answers': answers, 'userID': answerID});
    var receiver = clients[this.secondComp];
    receiver.emit('/about/#receiveAnswers', jsonAnswers);
  }
  else {
    this.secondAnswers = answers;
    var jsonAnswers = JSON.stringify({'answers': answers, 'userID': answerID});
    var receiver = clients[this.firstComp];
    receiver.emit('/about/#receiveAnswers', jsonAnswers);
  }
};


exports.inithuman = function(app, socket){
  return function() {
    socket.visitor = 'guest';
    if (socket.request.user) {
      socket.visitor = socket.request.user.username;
    }
    socket.join('/about/');
    clients[socket.visitor] = socket;
    socket.emit('/about/#idset', socket.visitor, false);
  };
};

exports.initmachine = function(app, socket){
  return function() {
    socket.visitor = 'guest';
    if (socket.request.user) {
      socket.visitor = socket.request.user.username;
    }
    socket.join('/about/');
    clients[socket.visitor] = socket;

    var machineID = nextMachineID;
    nextMachineID += 1;
    clients[machineID] = socket;
    socket.emit('/about/#idset', socket.visitor, machineID);
  };
}

exports.matchrequest = function(app, socket){
  return function(myID) {
    if (unmatchedCompetitors.length == 0){
      unmatchedCompetitors.push(myID);
    }
    else if (unmatchedCompetitors != [myID]){
      var comp = unmatchedCompetitors.shift();
      var conversation = new Conversation(myID, comp, nextConvID);
      conversations[nextConvID] = conversation;
      nextConvID += 1;
      socket.emit('/about/#matchset', conversation.convID);
      clients[comp].emit('/about/#matchset', conversation.convID);
    }
  };
};

exports.localmatch = function(app, socket){
  return function(humanID, machineID) {
    var conversation = new Conversation(humanID, machineID, nextConvID);
    conversations[nextConvID] = conversation;
    nextConvID += 1;
    socket.emit('/about/#matchset', conversation.convID);
  };
};

exports.sendquestions = function(app, socket){
  return function(msg) {
    var jsonQuestions = JSON.parse(msg);
    console.log("received questions");
    console.log(jsonQuestions);
    var conv = conversations[jsonQuestions['conversationID']];
    conv.askQuestions(jsonQuestions['userID'], jsonQuestions['questions']);
    console.log("asked questions");
  };
};

exports.sendanswers = function(app, socket){
  return function(msg) {
    var jsonAnswers = JSON.parse(msg);
    var conv = conversations[jsonAnswers['conversationID']];
    conv.answerQuestions(jsonAnswers['userID'], jsonAnswers['answers']);
  };
};

exports.getCleverbotResponse = function(app, socket){
  return function(msg) {
    console.log("msg: "+msg);
    Cleverbot.prepare(function(){
      cBot.write(msg, function (response) {
        console.log("got response "+response.message);
        socket.emit('/about/#cbotresponse', response.message);
      });
    });
  }
}


