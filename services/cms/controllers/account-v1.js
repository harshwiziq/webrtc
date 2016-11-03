var log = require('common/log');

var account = {};

account.login = function( req, res, next){

};

account.get = function( req, res, next){
	log.info('account get called');
};

account.add = function( req, res, next){
	log.info('account add called');
};

account.upgrade = function( req, res, next){
	log.info('account upgrade called');
};

module.exports = account;
