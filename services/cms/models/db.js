var $			= require('jquery-deferred')  ,
	mongoose	= require('mongoose')  ,
	config		= require('common/config')  ,
	log			= require('common/log')  ;

mongoose.connect( config.mongo);

var _d			= $.Deferred()  ,
	connection	= mongoose.connection  ;

connection.on('error', function( err){
	log.error('connection to database: '+ config.mongo + ', failed.');
	_d.reject( err);
});
connection.on('disconnected',function(){
	log.warn('database disconnected');
});
connection.on('connected',function(){
	log.info('database connected');
});
connection.once('open', function( callback){
	log.info('database connection OK');
	_d.resolve();
});

var db = {};

db.handle = connection;

db.init = function(){
	return _d.promise();
};

db.close = function(){

};

module.exports = db;
