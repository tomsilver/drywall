'use strict';

exports = module.exports = function(app) {
  app.io.sockets.on('connection', function(socket) {
    socket.on('/about/#join', require('./events/about/index').join(app, socket));
  	socket.on('/about/#matchrequest', require('./events/about/index').matchrequest(app, socket));
  	socket.on('/about/#sendquestions', require('./events/about/index').sendquestions(app, socket));
  	socket.on('/about/#sendanswers', require('./events/about/index').sendanswers(app, socket));
  });
};