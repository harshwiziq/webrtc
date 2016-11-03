var log     = require('node-agent/common/log');
var system  = require('node-agent/utils/system');
var config  = require('node-agent/controllers/config');
var prov_if = require('node-agent/core/prov-if'); 

var node = {};
var get_status_code = require('./status_codes').get;

/* --------------------------------------  *
 * called by provisioning to own the node  */

node.acquire = function (req, res, next) {
	var sys_config = {};
	switch ( config.get_node_state() ) {
		case 'error':
			/*
			 *  maybe undo config.init and things like that (not yet needed) */ 
	
 		case 'acquired':
			/* 
			 * maybe a different prov server
			 * resource configs can be different
			 * will need handling but for now just get-acquired  */

		case 'free':
			return get_acquired (req, res, next);

		case 'acquiring':
			log.warn('acquire rx in acquiring state');
			return res.status(400).send(get_status_code('BUSY'));

		case 'releasing':
			log.warn('acquire rx in releasing state');
			return res.status(400).send(get_status_code('BUSY'));

		case 'out-of-service':
			log.warn('acquire rx in out-of-service state');
			return res.status(400).send(get_status_code('OUT_OF_SERVICE'));

		default :
			log.error ({ state : config.get_node_state () }, 'unknown state');
			return res.status(500).send(get_status_code('UNKNOWN_ERROR'));
	}
};

node.health = function (req, res, next) {
	res.status(200).send({ code: 'OK', msg: 'doing jusst fine'});
};

node.init = init;

node.update = function (req, res, next) {
	res.status = 200;
	res.send( get_status_code('NOT_YET_IMPLEMENTED') );
};

node.renounce = function (req, res, next) {
	res.status = 200;
	res.send( get_status_code('NOT_YET_IMPLEMENTED') );
};

/* 
 * private methods  */

/*--------------------------------------
  info: {
	 prov:{
		name:
		host:
		port:
		protocol:
	    etc.
	 },
	 host:{
		id:
	    keep_alive_frequency:
	    keep_alive_count:
	 }
	 docker:{
		image:
	 }
	 logs:[{
		server:
	    credentials maybe!
	 }]
  }
*------------------------------------------*/

function get_acquired (req, res, next) {
	var info = req.body;	
	log.info({ info: info }, 'Node Acquire');
	try{
		if (!info.prov.ip) {
			info.prov.ip  = info.prov.protocol + '://' + info.prov.host;
			info.prov.ip += info.prov.port ? ':' + info.prov.port : '';
		}
		info.node = info.host;
		info.node.id = info.node.id;				// just making sure it is there (avoiding an if condition)
		info.force = req.query && req.query.force;		// headless start (free body testing with shell scripts)
	}
	catch (e) {
		return res.status(400).send( get_status_code('BAD_REQUEST',e) );
	}
	res.status(202).send( get_status_code('PROCESSING') );

	// process the info and get ready
	init (info);
}

function init (info) {
	config.set_node_state ('acquiring');

	// set to redis											-- is this OK? (on restart it will be set again)				 
	config.set_cache (info);

	// add to conf file
	config.init (info);
	
	//init resources
	//resources.init (info);  //configure and start resources 	

	return publish_ready (info.force);
}

function publish_ready (force) {
	/*
	 * tells provisioning "I am ready and this is my config" */
	var sys_config = system.get_config();
	var _d = prov_if.send (sys_config, 'node', 'ready');
	if (force)
		return config.set_node_state('acquired');

	_d.then( config.set_node_state.bind(null,'acquired'), config.set_node_state.bind(null,'error') );  // actually clean up and then move to free
}

module.exports = node;
