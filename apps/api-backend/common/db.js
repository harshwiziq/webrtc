var events   = require('events');
var mongodb  = require('mongodb');
var mongoose = require('mongoose');
var config   = require('common/config');
var log      = require('api-backend/common/log').child({ module : 'db' });

/*
 * Initialize and connnect */
var connection = mongoose.createConnection (config.api.mongo);

var emitter = new events.EventEmitter();

/* if connection error, exit the app */
connection.on ('error', function (err) {
	log.error ({ error : err }, 'Connection error to mongoDB');
	process.exit (1);
});

connection.on ('disconnected', function () {
	log.warn ('disconnected');
});

connection.on ('connected', function () {
	log.info ('connected');
});

connection.once ('open', function (callback) {
	log.info ({ db : config.api.mongo }, 'connection OK');
	emitter.emit ('db-connected');
});

var db = {};
db.conn = connection;
db.emitter  = emitter;

module.exports = db;