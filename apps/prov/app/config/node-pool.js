var events     = require('events');
var promise    = require('bluebird');
var log        = require('prov/app/common/log').child({ module: 'config/node-pool' });
var app_config = require('common/config');
var schema     = require('prov/app/models/__node');
var db         = require('prov/app/lib/db');

var pool   = {};
var conn   = db.conn;
var cached = [];

pool.update_cache = function () {
    var p = promise.pending();

	/*
	 * This method id guarenteed to be called after the db connection
	 * has succeeded. Therefore, we should be getting the model without
	 * any error. */
	var model = conn.model('node', schema);

	if (!model)
		return p.reject ('pool model not ready yet');

	model.get_all ()
		.then (
			function (nodes) {
				cached = nodes;
				return p.resolve (nodes);
			},
			function (err) {
				log.error ({ err : err }, 'init pool configuration failed');
				return p.reject (err);
			}
		);

		return p.promise;
};

pool.add = function (node_info) {
    var p     = promise.pending();
	var model = conn.model('node', schema);

	if (!model)
		return p.reject ('pool model not ready yet');

	model.create (node_info)
		.then (
			function (config) {
				pool.update_cache ()
					.then (
						function () {
							return p.resolve (config);
						},
						function (err) {
							log.error ({ err : err, input : node_info}, 'update cache (post add node configuration) failed');
							return p.reject (err);
						}
					);
			},
			function (err) {
				log.error ({ err : err, input : conf }, 'add node configuration failed');
				return p.reject (err);
			}
		);

	return p.promise;
};

pool.remove = function (node_id) {
    var p     = promise.pending();
	var model = conn.model('node', schema);

	if (!model)
		return p.reject ('pool model not ready yet');

	model.remove (node_id)
		.then (
			function () {
				pool.update_cache ()
					.then (
						function () {
							return p.resolve (node_id);
						},
						function (err) {
							log.error ({ err : err, input : node_id}, 'update cache (post remove node configuration) failed');
							return p.reject (err);
						}
					);
			},
			function (err) {
				log.error ({ err : err, input : node_id }, 'remove node configuration failed');
				return p.reject (err);
			}
		);

	return p.promise;
};

pool.get_all = function () {
	/*
	 * This function shouldn't get called before the
	 * 'cache' is set. Throw an error. */
	if (!cached) {
		log.error ('pool.get called before the pool.init. throwing exception');
		throw 'pool.get called before the pool.init';
	}

	return cached;
};

pool.get = function (node_id) {

	if (!node_id)
		throw 'illegal call: no node_id specified';

	/*
	 * This function shouldn't get called before the
	 * 'cache' is set. Throw an error. */
	if (!cached) {
		log.error ('pool.get called before the pool.init. throwing exception');
		throw 'pool.get called before the pool.init';
	}

	for (var i = 0; i < cached.length; i++) {
		if (cached[i].id == node_id)
			return cached[i];
	}

	return null;
};

module.exports = pool;
