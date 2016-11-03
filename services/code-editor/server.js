var express = require('express');
var server  = require('http').createServer();
var sharejs = require('./src'); 
var hat     = require('hat').rack(32, 36);
var proxy   = require('./proxy');
var app     = express();
var port    = 8000;

/*server.use(function (req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	next();
});*/

var options = {
  db: { type: 'none' },
  //browserChannel: { cors: '*', reconnect: true },
  browserChannel: null,
  sockjs: null,
  websocket: { prefix : "editor" },
  auth: function(client, action) {
    // This auth handler rejects any ops bound for docs starting with 'readonly'.
    if (action.name === 'submit op' && action.docName.match(/^readonly/)) {
      action.reject();
    } else {
      action.accept();
    }
  }
};

// Lets try and enable redis persistance if redis is installed...
try {
  require('redis');
  options.db = {type: 'redis'};
} 
catch (e) {}

sharejs.server.attach(server, options);

proxy.add_route("/code-editor", "localhost:8000/", 3141);

console.log("Demos running at http://localhost:" + port);

process.title = 'sharejs';

process.on('uncaughtException', function (err) {
  console.error('An error has occurred. Please file a ticket here: https://github.com/josephg/ShareJS/issues');
  console.error('Version ' + sharejs.version + ': ' + err.stack);
});

server.on("request", app);

server.listen(port);
