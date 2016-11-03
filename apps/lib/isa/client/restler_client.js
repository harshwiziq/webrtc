var restler = require('restler');
var events  = require('events');
var map     = require('./client-map');
var isa_cli = require('./isa_client');
var log     = require('./log');

var restler_client = {};

restler_client.get = function (to, url, options) {
	var emitter = new events.EventEmitter();
	var opt = attach_token(options, to);

	if (!opt) {
		log.error('client-map empty');
		return;
	}

	var r_get = restler.get(url, opt);
	
	attach_listener(r_get, emitter, 'get', to, url, options);
		
	return emitter;
};

restler_client.put = function (to, url, options) {
	var emitter = new events.EventEmitter();
	var opt = attach_token(options, to);

	if (!opt) {
		log.error('client-map empty');
		return;
	}

	var r_put = restler.put(url, opt);

	attach_listener(r_put, emitter, 'put', to, url, options);
		
	return emitter;
};

restler_client.del = function (to, url, options) {
	var emitter = new events.EventEmitter();
	var opt = attach_token(options, to);

	if (!opt) {
		log.error('client-map empty');
		return;
	}

	var r_del = restler.del(url, opt);

	attach_listener(r_del, emitter, 'del', to, url, options);
		
	return emitter;
};

restler_client.post = function (to, url, options) {
	var emitter = new events.EventEmitter();
	var opt = attach_token(options, to);

	if (!opt) {
		log.error('client-map empty');
		return;
	}

	var r_post = restler.post(url, opt);

	attach_listener(r_post, emitter, 'post', to, url, options);
	
	return emitter;
};

/* Local methods  */
function success (emitter, data, response) {
	emitter.emit('success', data, response);
}

function fail (emitter, req_type, to, url, options, data, response) {
	/* for non 403 failures emit the fail event */
	if (response.statusCode !== 403) {
		emitter.emit('fail', data, response);
		log.error(data, 'restler_client :: request failed');
		return;
	}

	/* Get new token */
	log.error({ code : response.statusCode }, 'status code');
	var map_obj = map.find(to);

	if (!map_obj) {
		log.error({ msg : 'should never happen' }, 'restler_client :: fail');
		emitter.emit('fail', data, response);
		return;
	}
	
	var _r = isa_cli.init(map_obj.url, null, null, to);
	
	_r.on('success', function (data, response) {
		log.info({ msg : 'Get token success', data : data }, 'got new token');
		var retry;
		
		switch (req_type) {
			case 'get' :
				retry = restler_client.get(to, url, options);
				break;
			case 'post':
				retry = restler_client.post(to, url, options);
				break;
			case 'put' :
				retry = restler_client.put(to, url, options);
				break;
			case 'del' :
				retry = restler_client.del(to, url, options);
				break;
		}

		attach_listener(retry, emitter, req_type, to, url, options);
		
		log.info({ msg : 'Retry the same request with the new token' });
	});

	_r.on('fail', function (data, response) {
		log.error({ msg : 'GET token fail', data : data }, 'get new token failed');
		emitter.emit('fail', data, response);
	});

	_r.on('error', error_handler.bind(null, emitter));
	_r.on('timeout', timeout.bind(null, emitter));
}

function timeout (emitter, ms) {
	log.error({ msg : 'req timed out', ms : ms }, 'timeout::restler-wrapper');
	emitter.emit('timeout', ms);
}

function error_handler(emitter, error, response) {
	log.error(err, 'error :: restler-wrapper');
	emitter.emit('error', error, response);
}

/* Attach token in the header */
function attach_token (options, to) {
	var map_obj = map.find(to);

	if (!map_obj) {
		return;
	}

	if (!options) {
		var opts = { headers : { 'x-access-token' : map_obj.token }};
		return opts;
	}

	if (!options.headers) {
		options.headers = { 'x-access-token' : map_obj.token };
		return options;
	}

	options.headers['x-access-token'] = map_obj.token;
	return options;

}

function attach_listener (_r, emitter, req_type, to, url, options) {
	_r.on('success', success.bind(null, emitter));
	_r.on('fail', fail.bind(null, emitter, req_type, to, url, options));
	_r.on('timeout', timeout.bind(null, emitter));
	_r.on('error', error_handler.bind(null, emitter));
}

module.exports = restler_client;
