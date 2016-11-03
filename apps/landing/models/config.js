var $             = require( 'jquery-deferred' );
var config_model  = require( 'landing/common/config-model' );
var log           = require( 'landing/common/log' ).child( { module : 'models/config' } );

var config = {};

config.get = function (key, __default) {
	var _d = $.Deferred();
	var query = {};

	if (key)
		query[key] = { $exists : true };

	config_model.model.findOne (query, function (err, doc) {

		if (err) {
			log.error ({ err : err, method : 'config.get', key : key }, 'error fetching configuration from db');
			return _d.reject (err);
		}

		if (!key) {
			log.debug ({ doc : doc, method : 'config.get' }, 'returning full config');
			return _d.resolve(doc);
		}

		if (is_empty(doc) || is_empty(doc[key])) {
			if (!__default) {
				log.error ({ method : 'config.get', key : key }, 'null configuration, no default fallback');
				return _d.reject (err);
			}

			log.warn ({ config : __default, key : key }, 'returning default');
			return _d.resolve (__default);
		}

		return _d.resolve (doc[key]);
	});

	return _d.promise ();
};

function is_empty (obj) {
	if (!obj)
		return true;

	return true && JSON.stringify(obj) === JSON.stringify({});
}

config.set = function (what, blob) {
	var _d = $.Deferred();
	var _data = {};

	_data[what] = blob;

	log.debug ({ config : _data }, 'setting config');

	config_model.model.findOneAndUpdate ({}, _data, { upsert : true }, function (err, result) {

		if (err) {
			return _d.reject (err);
		}

		return _d.resolve ('ok');
	});

	return _d.promise ();
};

module.exports = config;
