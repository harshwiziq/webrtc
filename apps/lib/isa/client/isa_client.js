var os         = require('os');
var jwt        = require('jsonwebtoken');
var rest       = require('restler');
var map        = require('./client-map');
var log        = require('./log');
var secret     = require('../isa-config').shared_secret;
var isa_client = {};
var requestor;

isa_client.init = function (url, service, id, to) {
	if ((!service || !id) && !requestor) {
		log.error('service name and id are missing');
		return;
	}

	if (service && id) {
		requestor = { 
			id      : id, 
			service : service 
		};
	}

	return get_token(url, to);
};

function get_token (url, to) {
	var client       = create_info(requestor, to);
	var encoded_info = jwt.sign(client, secret);
	var r_get        = rest.get(url, { headers : { client_info : encoded_info }});
	
	r_get.on('success', success.bind(null, to, url));
	r_get.on('fail', fail);
	r_get.on('error', error);
	r_get.on('timeout', timeout);
	
	return r_get;
}

/* Local methods  */
function success(to, url, data, response) {
	//store the token in the token map
	map.add(to, data.token, url);
	log.debug(data, 'rest success::isa_client');
}

function fail (data, response) {
	//no need to handle just display error
	log.error(data, 'rest fail::isa_client');
}

function error (err, response) {
	log.error (err, 'request failed');
}

function timeout (ms) {
	log.error({ timeout : ms }, 'rest timed out::isa_client');
}

function create_info(from, to) {
	var client = {
		svc        : from.service,
		svc_id     : from.id,
		provider   : to,
		os         : os.type(),
		hostname   : os.hostname(),
		n_address  : os.networkInterfaces()
	};
	
	log.info(client, 'client-info');

	return client;
}

module.exports = isa_client;
