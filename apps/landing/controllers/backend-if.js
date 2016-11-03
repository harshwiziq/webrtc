var rest       = require('restler');
var $	       = require('jquery-deferred');
var async      = require('async');
var args       = require('common/args');
var app_config = require('common/config');
var config     = require('landing/models/config');
var log        = require('landing/common/log').child({ module : 'landing/backend-if'});
var prov       = require('landing/controllers/prov-if');
var templates  = require('landing/controllers/templates');


/*
 * This is a interface to the actual backend. Going forward
 * the backend may reside on a different location and the
 * communication to it will be be controlled by this module.
 *
 * For now, we code the backend right here.
 *
 */

controller = {};
controller.get_config = function (class_id, callback) {
	var backend_default = {
		host	 : 'localhost',
		protocol : 'http',
		port	 : app_config.app_port
	};

	/*---------------------------------------
	 *
	 * Things to do:
	 *
	 *		- If the session config is in the cache
	 *		  then return it
	 *
	 *		- else load the session configuration
	 *		  from the core backend
	 *
	 *		- Cache it
	 *
	 *--------------------------------------*/

	config.get('backend', backend_default)
		.then (
			function (backend) {
				get_prov_ip (backend, class_id)
				.then (
					function (response) {
						prov.get_sess_info (response.prov_profile, class_id)
							.then (
								function (sess_config) {
									callback(null, sess_config, response);
								},
								function (err) {
									callback (err, null, response);
								}
							);
					},
					callback.bind(null)
				);
			},
			function (err) {
				callback (err, null);
			}
		);
};

function get_prov_ip (backend, class_id) {
    var _d = $.Deferred();
    var timeout = 5000;
    var headers = { 'Content-Type':'application/json' };
    var host	= backend.protocol + '://' + backend.host + (backend.port ? ':' + backend.port : '');
    var url	    = host + '/backend/landing/class/' + class_id + '/profile/prov';
    var r;

    r = rest.get (url, { timeout : timeout, headers : headers });

	r.on('success', function (data, response) {
		_d.resolve(data);
	});

	r.on('fail', function (data, response) {
		log.error ({ url: url, data: data }, 'backend returned failure');
		return data ? _d.reject(data) : _d.reject('backend connect to failed');
	});

	r.on('error', function (err, response) {
		log.error ({ url: url, err: err }, 'connect to backend error');
		_d.reject(err);
	});

	r.on('timeout', function (ms) {
		log.error ({ url: url, ms: ms }, 'connect to backend timeout');
		_d.reject('timeout');
	});

    return _d.promise();
}

module.exports = controller;
