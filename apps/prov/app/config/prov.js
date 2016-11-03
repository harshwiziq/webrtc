var events     = require('events');
var promise    = require('bluebird');
var log        = require('prov/app/common/log').child({ module: 'config/prov' });
var app_config = require('common/config');
var schema     = require('prov/app/models/prov');
var db         = require('prov/app/lib/db');

var prov = {};
var conn    = db.conn;
var cached;

prov.emitter = new events.EventEmitter();

prov.init = function (db_conf) {
    var p = promise.pending();

	/*
	 * This method id guarenteed to be called after the db connection
	 * has succeeded. Therefore, we should be getting the model without
	 * any error. */
	var model = conn.model('prov', schema);

	if (!model)
		return p.reject ('prov model not ready yet');

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

					log.warn ('no config for prov. defaulting to ' + config.host + ':' + config.port);
				}

				cached = config.config;
				prov.emitter.emit ('config-updated', config);
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err }, 'init prov configuration failed');
				return p.reject (err);
			}
		);

		return p.promise;
};

prov.update = function (conf) {
    var p     = promise.pending();
	var model = conn.model('prov', schema);

	if (!model)
		return p.reject ('prov model not ready yet');

	model.create ({ config : conf })
		.then (
			function (config) {
				cached = config.config;
				prov.emitter.emit ('config-updated', config);
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err, input : conf }, 'update prov configuration failed');
				return p.reject (err);
			}
		);

	return p.promise;
};

prov.remove = function (conf) {
    var p     = promise.pending();
	var model = conn.model('prov', schema);

	if (!model)
		return p.reject ('prov model not ready yet');

	model.remove_config (conf)
		.then (
			function (config) {
				cached = null;
				prov.emitter.emit ('config-updated', config);
				return p.resolve (config);
			},
			function (err) {
				return p.reject (err);
			}
		);

	return p.promise;
};

prov.get = function () {
	/*
	 * This function shouldn't get called before the
	 * 'cache' is set. Throw an error. */
	if (!cached) {
		log.error ('prov.get called before the prov.init. throwing exception');
		throw 'prov.get called before the prov.init';
	}

	return cached;
};

module.exports = prov;
