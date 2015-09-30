/* global app:true, io:false */

var socket;
var cID = null;
var totalQuestions = 5;
var questionsAsking = [];
var answersGiving = [];
var answersReceived = [];
var questionsReceived = [];
var questionsReceived;
var waitingForAnswers = false;
var waitingForQuestions = false;
var gameState = -1;
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

  var advanceGameState = function() {
    gameState += 1;
    addChatMessage(gameStateMessages[gameState]);
  };

  var addChatMessage = function(data) {
    $('<div/>', { text: data }).appendTo('#chatBox');
    $("#chatBox").animate({ scrollTop: $('#chatBox')[0].scrollHeight}, 500);
  };

  var askQuestion = function(question) {
    var numQ = questionsAsking.length;
    if (numQ < totalQuestions) {
      if (question) {
        addChatMessage('My Question '+(numQ+1).toString()+' : '+ question);
        questionsAsking.push(question);
      }
    }
    if (questionsAsking.length === totalQuestions) {
      var jsonQuestions = JSON.stringify({'userID': socket.visitor, 'conversationID': cID, 'questions': questionsAsking});
      sendQuestions(jsonQuestions);
    }
  };

  var sendQuestions = function(jsonQuestions) {
    socket.emit('/about/#sendquestions', jsonQuestions);

    advanceGameState();

    if (questionsReceived.length === 0) {
      waitingForQuestions = true;
    }
    else {
      presentQuestions();
    }
  };

  var presentQuestions = function() {
    advanceGameState();
    presentNextQuestion();
  };

  var presentNextQuestion = function() {
    if (questionsReceived.length) {
      var nextQuestion = questionsReceived.shift();
      var idx = totalQuestions - questionsReceived.length;
      addChatMessage("Competitor Question "+idx.toString()+": "+nextQuestion);
    }
  };

  var answerLastQuestion = function(answer) {
    var numA = answersGiving.length;
    if (numA < totalQuestions) {
      if (answer) {
        addChatMessage('My Answer '+(numA+1).toString()+' : '+ answer);
        answersGiving.push(answer);
      }
    }
    if (answersGiving.length === totalQuestions) {
      var jsonAnswers = JSON.stringify({'userID': socket.visitor, 'conversationID': cID, 'answers': answersGiving});
      sendAnswers(jsonAnswers);
    }
  };

  var sendAnswers = function(jsonAnswers) {
    socket.emit('/about/#sendanswers', jsonAnswers);

    advanceGameState();

    if (answersReceived.length === 0) {
      waitingForAnswers = true;
    }
    else {
      presentAnswers();
    }
  };

  var presentAnswers = function() {
    if (answersReceived.length) {
      $.each(answersReceived, function(i, obj) {
        addChatMessage("Question: "+questionsAsking[i]);
        addChatMessage("Competitor Answer: "+obj);
      });
      advanceGameState();
    }
  };

  socket = io.connect();
  socket.on('connect', function() {
    socket.emit('/about/#join');
    advanceGameState();
  });
  socket.on('/about/#idset', function(myID) {
    socket.visitor = myID;
    socket.emit('/about/#matchrequest', socket.visitor);
  });
  socket.on('/about/#incoming', function(visitor, message) {
    addChatMessage(visitor +': '+ message);
  });
  socket.on('/about/#matchset', function(convID) {
    cID = convID;
    console.log("joined conversation "+convID.toString());
    advanceGameState();
  });
  socket.on('/about/#receiveQuestions', function(jsonQuestions) {
    var qJson = JSON.parse(jsonQuestions);
    questionsReceived = qJson.questions;
    if (waitingForQuestions) {
      presentQuestions();
    }
  });
  socket.on('/about/#receiveAnswers', function(jsonAnswers) {
    var aJson = JSON.parse(jsonAnswers);
    answersReceived = aJson.answers;
    if (waitingForAnswers) {
      presentAnswers();
    }
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
      // waiting for competitor
      if (gameState === 0) {
        return false;
      }
      // asking questions
      else if (gameState === 1) {
        askQuestion(newMessage);
      }
      // waiting for comp questions
      else if (gameState === 2) {
        return false;
      }
      // answering questions
      else if (gameState === 3) {
        answerLastQuestion(newMessage);
        presentNextQuestion();
      }
      // waiting for comp answers
      else if (gameState === 4) {
        return false;
      }
      // scoring comp answers
      else if (gameState === 5) {
        // TODO
        return false;
      }
    }
  });

  $(document).ready(function() {
    app.chatForm = new app.ChatForm();
  });
}());