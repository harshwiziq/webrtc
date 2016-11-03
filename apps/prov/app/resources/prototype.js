var promise    = require('bluebird');
var log        = require('prov/app/common/log').child({ module : 'resources/prototype' });
var app_config = require('common/config');
var schema     = require('prov/app/models/resource');
var db         = require('prov/app/lib/db');

function resource (name) {
	if (!name)
		throw 'resource with unspecified name';

	this.name   = name;
	this.cached = null;
	this.conn   = db.conn;

	this.init = function () {
		var p = promise.pending();

		/*
		 * This method id guarenteed to be called after the db connection
		 * has succeeded. Therefore, we should be getting the model without
		 * any error. */
		var model = this.conn.model('resource', schema);

		if (!model)
			return p.reject ('resource model not ready yet');

		var __this = this;

		model.get (this.name)
		.then (
			function (config) {
				/*
				 * If there's no config, "findOne" should return a null */
				if (!config || !Object.keys (config).length) {
					log.warn ('null or empty config for resource ' + __this.name);
					return p.reject ('resource null or empty');
				}

				__this.cached = config.toObject ();
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err }, 'resource "' + __this.name + '" init failed');
				return p.reject (err);
			}
		);

		return p.promise;
	};

	this.create = function (conf) {
		var p     = promise.pending();
		var model = this.conn.model('resource', schema);

		if (!model)
			return p.reject ('resource model not ready yet');

		var __this = this;

		model.create (conf)
		.then (
			function (config) {
				__this.cached = config.toObject ();
				return p.resolve (config);
			},
			function (err) {
				log.error ({ err : err }, 'update resource "' + __this.name + '" configuration failed');
				return p.reject (err);
			}
		);

		return p.promise;
	};

	this.remove = function (conf) {
		var p     = promise.pending();
		var model = this.conn.model('resource', schema);

		if (!model)
			return p.reject ('resource model not ready yet');

		var __this = this;

		model.remove_config (conf)
		.then (
			function (config) {
				__this.cached = null;
				return p.resolve (config);
			},
			function (err) {
				return p.reject (err);
			}
		);

		return p.promise;
	};

	this.update = function (conf) {
		return this.create (conf);
	};

	this.get = function () {
		return this.cached;
	};

	this.get_variant = function (attrib, options) {
		var p = promise.pending();

		p.resolve ('returning empty data from a template funtion');

		return p.promise;
	};

	this.provision = function (resource_info, class_config) {
		var p = promise.pending ();

		if (!this.cached)
			p.reject ('no config found for resource "' + this.name + '"');
		else
			p.resolve (this.cached);

		return p.promise;
	};

}
module.exports = resource;
