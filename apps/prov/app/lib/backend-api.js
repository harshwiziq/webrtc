var promise = require('bluebird');
var config  = require('prov/app/config/config');
var backend = require('prov/app/config/backend');
var log     = require('prov/app/common/log').child({ module: 'backend-api' });
var librest = require('prov/app/lib/librest');

var backend_api = {};

var cached_url_base;
backend.emitter.on ('config-updated', function (data) {
	if (!data) {
		log.warn ('cached backend url set to null');
		cached_url_base = null;
		return;
	}

	var config = data.config;
	var port = config.port ? ':' + config.port : '';
	cached_url_base = config.protocol + '://' + config.host + port + '/backend/provisioning/';
});

backend_api.get_class_config = function (class_id) {
    var p = promise.pending();

    if (!class_id) {
        p.reject('no class id found');
        return p.promise;
    }

    var data = {
        class_id : class_id
    };

    if (!cached_url_base) {
        p.reject('backend api url for provisioning not found');
        return p.promise;
    }

    var request_url = cached_url_base + class_id + '/config';

    log.debug({ request_url: request_url, data: data }, 'get_class_config');

    librest.request(request_url, 'GET', data)
		.then (
			p.resolve.bind(p),
			p.reject.bind(p)
		);

    return p.promise;
};

backend_api.lock_class_config = function (class_id) {
    var p = promise.pending();

    if (!class_id) {
        p.reject ('no class id found');
        return p.promise;
    }

    var data = {
        class_id : class_id
    };

    if (!cached_url_base) {
        p.reject('backend api url for provisioning not found');
        return p.promise;
    }

    var request_url = cached_url_base + class_id + '/lock';

    log.debug ({ info: data }, 'lock_class_config');

    librest.request(request_url, 'POST', data)
		.then (
			p.resolve.bind(p),
			p.reject.bind(p)
		);

    return p.promise;
};

backend_api.set_class_status = function (class_id, state, err, __data) {
    var p = promise.pending();

    if (!class_id) {
        p.reject ('no class id found');
        return p.promise;
    }

    var data = {
        class_id : class_id,
        status : state,
		err    : err,
		data   : __data
    };

    if (!cached_url_base) {
        p.reject('backend api url for provisioning not found');
        return p.promise;
    }

    var request_url = cached_url_base + class_id + '/status';

    log.debug ({ info: data }, 'set_class_status');

    librest.request(request_url, 'POST', data)
		.then (
			p.resolve.bind(p),
			p.reject.bind(p)
		);

    return p.promise;
};

module.exports = backend_api;
