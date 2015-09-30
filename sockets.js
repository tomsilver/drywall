'use strict';

exports = module.exports = function(app) {
  app.io.sockets.on('connection', function(socket) {
    socket.on('/about/#inithuman', require('./events/about/index').inithuman(app, socket));
    socket.on('/about/#initmachine', require('./events/about/index').initmachine(app, socket));
  	socket.on('/about/#matchrequest', require('./events/about/index').matchrequest(app, socket));
  	socket.on('/about/#localmatch', require('./events/about/index').localmatch(app, socket));
  	socket.on('/about/#sendquestions', require('./events/about/index').sendquestions(app, socket));
  	socket.on('/about/#sendanswers', require('./events/about/index').sendanswers(app, socket));
  	socket.on('/about/#getCleverbotResponse', require('./events/about/index').getCleverbotResponse(app, socket));
  });
};