require('app-module-path').addPath(__dirname + '/');

var express            = require ('express');
var path     	       = require ('path');
var log      	       = require ('common/log-middleware');
var recbot_setup       = require ('setup');
var controller         = require ('controller');

var app = express ();

var config;

recbot_setup.setup ()
	.then (
		function (__config) {
			config = __config;
			log.info ("recbot join class successfully");	
		},	
		function (str, err) {
			log.error ('err = ' + str + ':' + err);
		}
	);

/*
 * Enable CORS */
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.options ('/*',  function (req, res, next) {
	/*
	 * Call made by browsers due to COR before they make any 
	 * of the below calls */
	res.status (200).send ('');
});

app.post ('/start',  function (req, res, next) {
	controller.start (req, res, next, config);
});

app.post ('/stop',  function (req, res, next) {
	controller.stop (req, res, next, config);
});

app.post ('/end',  function (req, res, next) {
	controller.end (req, res, next, config);
});

app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

module.exports = app;
