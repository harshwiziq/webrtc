var promise = require('bluebird');
var rest = require('restler');
var log = require('prov/app/common/log').child({ module: 'librest' });
var config = require('prov/app/config/config');

var librest = {};

var req_timeout = config.rest_timeout || 5000;

librest.request = function (url, method, data) {
	var p = promise.pending();
	var timeout = req_timeout;
	var headers = {'Content-Type':'application/json'};
	var r;

	switch (method) {
		case 'GET':
			r = rest.get(url, {
				timeout : timeout,
				headers : headers,
				data	  : JSON.stringify(data)
			});
			break;

		case 'POST':
			r = rest.post(url, {
				timeout : timeout,
				headers : headers,
				data	  : JSON.stringify(data)
			});
			break;

		case 'PUT':
			r = rest.put(url, {
				timeout : timeout,
				headers : headers,
				data	  : JSON.stringify(data)
			});
			break;

		case 'DELETE':
			r = rest.del(url, {
				timeout : timeout,
				headers : headers,
				data	  : JSON.stringify(data)
			});
			break;

		default:
			p.reject('Bad Method request');
			return p.promise;
	}

	r.on('success', function (data, response) {
		p.resolve(data);
	});

	r.on('fail', function (data, response) {
		log.warn({ method: method, url: url, data: data }, 'failed');
		return data ? p.reject(data) : p.reject('failed');
	});

	r.on('error', function (err, response) {
		log.warn({ method: method, url: url, err: err }, 'error');
        if (err) {
            err.type = 'http error ';
        }
		p.reject(err);
	});

	r.on('timeout', function (ms) {
		log.error({ method: method, url: url, ms: ms }, 'timeout');
		p.reject('timeout');
	});

	return p.promise;
};

module.exports = librest;
