var events     = require('events');
var promise    = require('bluebird');
var log        = require('prov/app/common/log').child({ module: 'config/backend' });
var app_config = require('common/config');
var schema     = require('prov/app/models/backend');
var db         = require('prov/app/lib/db');

var backend = {};
var conn    = db.conn;
var cached;

backend.emitter = new events.EventEmitter();

backend.init = function (db_conf) {
    var p = promise.pending();

	/*
	 * This method id guarenteed to be called after the db connection
	 * has succeeded. Therefore, we should be getting the model without
	 * any error. */
	var model = conn.model('backend', schema);

	if (!model)
		return p.reject ('backend model not ready yet');

	model.get_config ()
		.then (
			function (config) {
				/*
				 * If there's no config, "findOne" should return a null */
				if (!config) {
					config = {
						config : {
							host     : 'localhost',
							protocol : 'https',
							port     : app_config.app_port
						}
					};

					log.warn ('no config for backend. defaulting to ' + config.host + ':' + config.port);
				}

				cached = config;
				backend.emitter.emit ('config-updated', config);
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err }, 'init backend configuration failed');
				return p.reject (err);
			}
		);

		return p.promise;
};

backend.update = function (conf) {
    var p     = promise.pending();
	var model = conn.model('backend', schema);

	if (!model)
		return p.reject ('backend model not ready yet');

	model.create ({ config : conf })
		.then (
			function (config) {
				cached = config;
				backend.emitter.emit ('config-updated', config);
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err, input : conf }, 'update backend configuration failed');
				return p.reject (err);
			}
		);

	return p.promise;
};

backend.remove = function (conf) {
    var p     = promise.pending();
	var model = conn.model('backend', schema);

	if (!model)
		return p.reject ('backend model not ready yet');

	model.remove_config (conf)
		.then (
			function (config) {
				cached = null;
				backend.emitter.emit ('config-updated', config);
				return p.resolve (config);
			},
			function (err) {
				return p.reject (err);
			}
		);

	return p.promise;
};

backend.get = function () {
	/*
	 * This function shouldn't get called before the
	 * 'cache' is set. Throw an error. */
	if (!cached) {
		log.error ('backend.get called before the backend.init. throwing exception');
		throw 'backend.get called before the backend.init';
	}

	return cached;
};

module.exports = backend;
