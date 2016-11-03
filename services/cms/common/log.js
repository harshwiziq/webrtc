var events        = require('events');
var bunyan        = require('bunyan');
var log           = require ('ext/log').sub_app('cms');

function serializer (req, res) {
	if (!req || !req.connection)
		return req;

	var entry =  {
		method: req.method,
		url: req.url,
		remoteAddress: req.ip,
		remotePort: req.connection.remotePort
	};

    if (!res || !res.statusCode)
        return entry;

    entry.statusCode =  res.statusCode;

	return entry;
}

log.req_logger = function (req, res, next) {
	req.log = log.child({ req_id : req.req_id });					// _may be used to log things with request id; not being used, yet_
	req.log.info({ req : serializer (req, res) }, 'http request');
	next();
};

log.err_logger = function (err, req, res, next) {
	var entry = {};

	if (err) {
		entry.err = err;
		if (err.stack)
			entry.stack = err.stack;
		entry.req = serializer (req, res);

		log.error (entry, 'error');
	}
	next(err);
};

module.exports = log;
