var events   = require('events');
var mongoose = require('mongoose');
var config   = require('prov/app/config/config');
var log      = require('prov/app/common/log').child({ module : 'mongoose' });

var connection = mongoose.createConnection(config.mongo.server);

var state = 'not-open';
var emitter = new events.EventEmitter();

connection.on('error', function (err) {
    state = 'failed';
    emitter.emit('db-error', err);
    log.error ({ error : err }, 'Connection error');
});

connection.on('disconnected', function () {
    state = 'disconnected';
    log.warn ('disconnected');
});

connection.on('connected', function () {
    log.info ('connected');
});

connection.once('open', function () {
    state = 'connected';
    log.info ({ db : config.mongo.server }, 'connection OK');
    emitter.emit('db-connected');
});

var db = {};
db.conn = connection;
db.emitter = emitter;

module.exports = db;
