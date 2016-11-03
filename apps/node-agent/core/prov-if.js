var $       = require ('jquery-deferred');
var rest    = require ('restler');
var log     = require ('node-agent/common/log').child ({ module : 'prov-if' });
var config  = require ('node-agent/common/config');
var prov_if = {};


/*
 *	Send info to provisioning server */

prov_if.send = function (info, type, event) {
	/*
	 * type tells the class viz. node, session, docker
	 * event tells which call (of this class) :
	 * 		node ==> ready, health etc.
	 * 		docker ==> up, down, error, health
	 * 		session ==> session-events
	 * * * * * * * * * * * * * * * * * * * * * * * * */
	var _d =  $.Deferred();
	var url;

	log.debug ({ info: info, type: type, event: event }, 'sending to provisioning');

	if (!info || !type) {
		log.debug({ info: info, type: type }, 'info missing prov send');
		_d.reject ({ 'Information missing': 'required 2 args' });
		return _d.promise ();
	}

	url = get_url (type, event);
	if (!url) {
		_d.reject ('no url match found');
		return _d.promise();
	}

	// attach "host" info as well
	info.hostid = config.node.id;
	info.host_url = config.node.url;

	var _r = rest.post (url,{
		headers : {'Content-Type':'application/json'},
		data    : JSON.stringify(info) // send info directly
	});

	_r.on ('success', function (data, response) {
		log.info ({ type: type, event: event, url: url}, 'post successful');
		_d.resolve (data);
	});
	_r.on ('fail', function (data, response) {
		log.warn ({ type: type, event: event, url: url, data: data}, 'post failed');
		_d.reject (data);
	});
	_r.on ('error', function (err, response) {
		log.warn ({ type: type, event: event, url: url, err: err}, 'post error');
		_d.reject (err);
	});
	_r.on ('timeout', function (ms) {
		log.warn ({ type: type, event: event, url: url, ms: ms}, 'post timeout');
		_d.reject (ms);
	
	});
	// remove it.. not tested 
	_r.on ('actual response code', function (data, response) {
		log.debug ({ type: type, event: event, url: url, data: data}, 'post actual response code');
	});

	return _d.promise();
};

function get_url (type, event) {
	var url;

	try{
		url = config.prov.ip;
	}
	catch (e) {
		log.warn ('exception in conf get prov-base-url ', e );
		return null;
	}

	switch (type) {
		case 'node':
			url += get_url_node(event);
			break;

		case 'docker':
			url += get_url_docker(event);
			break;

		case 'session':
			url += get_url_session(event);
			break;

		default:
			log.warn ('type of info not recognized', type);
			return null;
	}

	return url;
}

function get_url_node (event) {
	switch (event) {
		case 'ready'  : return '/prov/v1/sesshost/ready';
		case 'health' : return '/node/v1/health';
		default       : return '/node/v1/';
	}
}

function get_url_docker (event) {
	switch (event) {
		default       : return '/prov/v1/session/status';
	}
}

function get_url_session (event) {
	switch (event) {
		default 		: return '/session/v1/event';
	}
}

module.exports = prov_if;
