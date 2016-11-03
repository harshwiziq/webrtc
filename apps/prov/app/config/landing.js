var promise    = require('bluebird');
var log        = require('prov/app/common/log').child({ module: 'config/landing' });
var app_config = require('common/config');
var schema     = require('prov/app/models/landing');
var db         = require('prov/app/lib/db');

var landing = {};
var conn    = db.conn;
var cached;


landing.init = function () {
    var p = promise.pending();

	/*
	 * This method id guarenteed to be called after the db connection
	 * has succeeded. Therefore, we should be getting the model without
	 * any error. */
	var model = conn.model('landing', schema);

	if (!model)
		return p.reject ('landing model not ready yet');

	model.get_config ()
		.then (
			function (config) {
				/*
				 * If there's no config, "findOne" should return a null */
				if (!config) {
					config = {
						host     : 'localhost',
						protocol : 'https',
						port     : app_config.app_port
					};

					log.warn ('no config for landing. defaulting to ' + config.host + ':' + config.port);
				}

				cached = config;
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err }, 'init landing configuration failed');
				return p.reject (err);
			}
		);

		return p.promise;
};

landing.update = function (conf) {
    var p     = promise.pending();
	var model = conn.model('landing', schema);

	if (!model)
		return p.reject ('landing model not ready yet');

	model.create (conf)
		.then (
			function (config) {
				cached = config;
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err }, 'update landing configuration failed');
				return p.reject (err);
			}
		);

	return p.promise;
};

landing.get = function () {
	/*
	 * This function shouldn't get called before the
	 * 'cache' is set. Throw an error. */
	if (!cached) {
		log.error ('landing.get called before the landing.init. throwing exception');
		throw 'landing.get called before the landing.init';
	}

	return cached;
};

module.exports = landing;
