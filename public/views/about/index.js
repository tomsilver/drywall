/* global app:true, io:false */

var socket;
var competitor;
var totalQuestions = 5;
var gameStateMessages = ["Waiting to find a competitor...", "Game started. Please ask your competitor "+totalQuestions.toString()+" questions:", "Waiting for competitor's questions...", "Please answer your competitor's questions:", "Waiting for your competitor's answers...", "Please enter how many questions your competitor answered correctly:"];

// game states:
// 0: waiting for competitor
// 1: asking questions
// 2: waiting for comp questions
// 3: answering questions
// 4: waiting for comp answers
// 5: scoring comp answers

(function() {
  'use strict';

  var Competitor = function(myID) {
    this.myID = myID;
    this.questionsAsking = [];
    this.answersGiving = [];
    this.answersReceived = [];
    this.questionsReceived = [];
    this.waitingForAnswers = false;
    this.waitingForQuestions = false;
    this.cID = null;
    this.gameState = 0;

    this.addChatMessage(gameStateMessages[this.gameState]);
  };

  Competitor.prototype.setConversation = function (convID) {
    this.cID = convID;
    this.advanceGameState();
  };

  Competitor.prototype.addChatMessage = function() {
    return false;
  };

  Competitor.prototype.advanceGameState = function() {
    this.gameState += 1;
    this.addChatMessage(gameStateMessages[this.gameState]);
  };

  Competitor.prototype.handleInput = function(newMessage) {
    // waiting for competitor
    if (this.gameState === 0) {
      return false;
    }
    // asking questions
    else if (this.gameState === 1) {
      this.askQuestion(newMessage);
    }
    // waiting for comp questions
    else if (this.gameState === 2) {
      return false;
    }
    // answering questions
    else if (this.gameState === 3) {
      this.answerLastQuestion(newMessage);
      this.presentNextQuestion();
    }
    // waiting for comp answers
    else if (this.gameState === 4) {
      return false;
    }
    // scoring comp answers
    else if (this.gameState === 5) {
      // TODO
      return false;
    }
  };

  Competitor.prototype.sendQuestions = function(jsonQuestions) {
    socket.emit('/about/#sendquestions', jsonQuestions);

    this.advanceGameState();

    if (this.questionsReceived.length === 0) {
      this.waitingForQuestions = true;
    }
    else {
      this.presentQuestions();
    }
  };

  Competitor.prototype.sendAnswers = function(jsonAnswers) {
    socket.emit('/about/#sendanswers', jsonAnswers);

    this.advanceGameState();

    if (this.answersReceived.length === 0) {
      this.waitingForAnswers = true;
    }
    else {
      this.presentAnswers();
    }
  };

  Competitor.prototype.receiveQuestions = function(jsonQuestions) {
    var qJson = JSON.parse(jsonQuestions);
    this.questionsReceived = qJson.questions;
    if (this.waitingForQuestions) {
      // will need to fix!!!
      this.presentQuestions();
    }
  };

  Competitor.prototype.receiveAnswers = function(jsonAnswers) {
    var aJson = JSON.parse(jsonAnswers);
    this.answersReceived = aJson.answers;
    if (this.waitingForAnswers) {
      this.presentAnswers();
    }
  };

  Competitor.prototype.askQuestion = function(question) {
    var numQ = this.questionsAsking.length;
    if (numQ < totalQuestions) {
      if (question) {
        this.addChatMessage('My Question '+(numQ+1).toString()+' : '+ question);
        this.questionsAsking.push(question);
      }
    }
    if (this.questionsAsking.length === totalQuestions) {
      var jsonQuestions = JSON.stringify({'userID': this.myID, 'conversationID': this.cID, 'questions': this.questionsAsking});
      this.sendQuestions(jsonQuestions);
    }
  };

  Competitor.prototype.presentQuestions = function() {
    this.advanceGameState();
    this.presentNextQuestion();
  };

  Competitor.prototype.presentNextQuestion = function() {
    if (this.questionsReceived.length) {
      var nextQuestion = this.questionsReceived.shift();
      var idx = totalQuestions - this.questionsReceived.length;
      this.addChatMessage("Competitor Question "+idx.toString()+": "+nextQuestion);
    }
  };

  Competitor.prototype.answerLastQuestion = function(answer) {
    var numA = this.answersGiving.length;
    if (numA < totalQuestions) {
      if (answer) {
        this.addChatMessage('My Answer '+(numA+1).toString()+' : '+ answer);
        this.answersGiving.push(answer);
      }
    }
    if (this.answersGiving.length === totalQuestions) {
      var jsonAnswers = JSON.stringify({'userID': this.myID, 'conversationID': this.cID, 'answers': this.answersGiving});
      this.sendAnswers(jsonAnswers);
    }
  };

  Competitor.prototype.presentAnswers = function() {
    var me = this;
    if (this.answersReceived.length) {
      $.each(this.answersReceived, function(i, obj) {
        me.addChatMessage("Question: "+me.questionsAsking[i]);
        me.addChatMessage("Competitor Answer: "+obj);
      });
      this.advanceGameState();
    }
  };

  var HumanCompetitor = function (myID) {
    Competitor.call( this, myID );
  };

  HumanCompetitor.prototype = Object.create( Competitor.prototype );
  HumanCompetitor.prototype.constructor = HumanCompetitor;

  HumanCompetitor.prototype.addChatMessage = function(data) {
    $('<div/>', { text: data }).appendTo('#chatBox');
    $("#chatBox").animate({ scrollTop: $('#chatBox')[0].scrollHeight}, 500);
  };


  socket = io.connect();
  socket.on('connect', function() {
    socket.emit('/about/#join');
  });
  socket.on('/about/#idset', function(myID) {
    competitor = new HumanCompetitor(myID);
    socket.emit('/about/#matchrequest', myID);
  });
  socket.on('/about/#matchset', function(convID) {
    competitor.setConversation(convID);
    console.log("joined conversation "+convID.toString());
  });
  socket.on('/about/#receiveQuestions', function(jsonQuestions) {
    competitor.receiveQuestions(jsonQuestions);
  });
  socket.on('/about/#receiveAnswers', function(jsonAnswers) {
    competitor.receiveAnswers(jsonAnswers);
  });

  app = app || {};

  app.ChatForm = Backbone.View.extend({
    el: '#chatForm',
    template: _.template( $('#tmpl-chatForm').html() ),
    events: {
      'submit form': 'preventSubmit',
      'click .btn-chat': 'formSubmit'
    },
    initialize: function() {
      this.render();
    },
    render: function() {
      this.$el.html(this.template());
    },
    preventSubmit: function(event) {
      event.preventDefault();
    },
    formSubmit: function() {
      var newMessage = this.$el.find('[name="message"]').val();
      this.$el.find('[name="message"]').val('');
      competitor.handleInput(newMessage);
    }
  });

  $(document).ready(function() {
    app.chatForm = new app.ChatForm();
  });
}());