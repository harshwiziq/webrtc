var mongoose = require( 'mongoose' );
var log      = require( 'auth/common/log' ).child ({ 'sub-module' : 'auth-db' });

var db_url = "mongodb://localhost/auth"; 
var connection = mongoose.createConnection (db_url);

connection.on ( 'error', function (err) {
	log.error ({ error : err }, 'Connection error to mongodb');
	process.exit (1);
});

connection.on ( 'disconnected', function () {
	log.warn ('disconnected');
});

connection.on ( 'connected', function () {
	log.info ('connected');
});

connection.once ( 'open', function () {
	log.info ({ db_url : db_url }, 'connection OK');
});

var db = {};
db.conn = connection;
module.exports = db;
