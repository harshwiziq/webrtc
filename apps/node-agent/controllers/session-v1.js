var $         = require ('jquery-deferred');
var log       = require ('node-agent/common/log');
var docker    = require ('node-agent/core/docker');
var f_sys     = require ('node-agent/core/filesystem');
var fs        = require ('node-agent/core/filesystem');
var prov_if   = require ('node-agent/core/prov-if');
var config    = require ('node-agent/controllers/config');
var dock_evts = require ('node-agent/core/events_docker');

var session = {};
var get_status_code = require('./status_codes').get;

function init () {
	var _p = $.Deferred ();

	f_sys.init ()
		.then (docker.init,          _p.reject.bind (_p))
		.then (_p.resolve.bind (),   _p.reject.bind (_p))
		;

	return _p.promise ();
}

function can_entertain (req, res, next) {
	var state = config.get_node_state();
	if ( state != 'acquired') {
		log.warn ({ state : state }, 'controller: session NODE_BUSY');
		res.status (400).send( get_status_code('BUSY',{state: state}) );
		return false;
	}
	return true;
}

/*
 * 	Start docker call  */

function start (req, res, next) {
	var info = req.body;
	log.debug ({ info : info }, 'controller: session start');

	if (!can_entertain(req,res,next)) 
		return;

	if (!info || !info.sess_id ) {
		log.warn ({ err:'Bad request', info : info }, 'parameters missing');
		return res.status (400).send (get_status_code ('BAD_REQUEST'));
	}

	/* 
	 * send the response, 
	 * it only tells that request has been accepted */
	res.status (202).send (get_status_code ('PROCESSING'));

	// add additional info
	info.node = {
		// any info which agent wants to give to session instance (docker)
	};
	
	fs.write_sess_info (info.sess_id, JSON.stringify (info), function (err, location) {
		if (err) {
			log.error ({ sess_id: info.sess_id, err: err}, 'filewrite callback');
			var data = {};
			data.sess_id = info.sess_id;
			data.state = 'failed'; 
			prov_if.send (data, 'docker');
			return;			// we may want to have a fallback strategy
		}

		var labels = info.common ? info.common.tags : null;
		docker.start (info.sess_id, { class_id : info.class_id, labels: labels, docker: info.docker }) 
			.then( 
				  function (result){
					  log.info ({result:result}, 'docker start success');
				  },
				  function (err){
					  var data = {};
					  log.error ({err : err}, 'docker start failed');

					  data.sess_id = info.sess_id;
					  data.state = 'failed'; 
					  prov_if.send (data, 'docker');
				  }			
			);
	});
}

/*
 *  Stop docker call  */
function stop (req, res, next) {
	var sess_id = req.params ? req.params.sess_id : null;
	log.info ({sess_id : sess_id}, 'controller: session stop');

	if (!can_entertain(req,res,next)) 
		return;

	if (!sess_id) {
		return res.status (400).send( get_status_code ('BAD_REQUEST','missing sess_id') );
	}

	res.status (202).send (get_status_code ('PROCESSING'));
	
	docker.stop (sess_id) 
		.then (
			function (result){
				// good, prov will receive the docker event
				// res.status (200).send (result);
			},
			function (err) {
				log.warn ({err : err}, 'Error while removing docker.');
				var data = {};
				data.sess_id = sess_id;
				data.state = 'not_found';
				prov_if.send (data, 'docker');
			}

		);
}


/*
 *	Show all active dockers  */
function list (req, res, next ){
	if (!can_entertain(req,res,next)) 
		return;

	docker.list()
		.then (
			function (result){
				log.info ({result : result});
				res.status (200).send (result );
			},
			function (err) {
				log.error ({err : err}, 'Error while getting dockers info.');
				res.status (500).send( get_status_code('SERVER_ERROR', err) );
			}
		);
}


function event (req, res, next) {
	var payload = req.body;
	var headers = payload.header;
	var in_data = payload.data;

	try {
		if( !(headers.sess_id || headers.evt_name) )
			throw('headers missing');

		if ( !payload )
			throw('body missing');
	}
	catch (e) {
		log.error ({ payload : payload, error : e }, 'session event parse error');
		return res.status (400).send( get_status_code ('BAD_REQUEST', e) );
	}

	log.info ({ evt_name: headers.evt_name, sess_id: headers.sess_id}, 'session event received');
	res.status (202).send (get_status_code ('PROCESSING'));

	var data = {};

	switch (headers.evt_name) {
		case 'started':
			data.sess_id           = headers.sess_id;
			data.state             = 'started';
			data.actual_start_time = in_data.time;

			prov_if.send (data, 'docker');
			break;

		case 'terminate':
			data.sess_id    = headers.sess_id;
			data.state      = 'completed';
			data.attendance = in_data;

			prov_if.send (data, 'docker');
			docker.stop (headers.sess_id);
			break;

		default:
			log.error ({ payload : payload }, 'unknown session event. ignoring');
	}
}

module.exports =  { 
	init	: init, 
	start	: start, 
	stop	: stop, 
	list	: list,
	event   : event,
	info 	: info
};



/*-------------------------------------------UNUSED CODE---------------------------------------------------*/

//  -- function info not being used now, we moved to writing sess_info instead of pulling it over network --
//  get session info 

function info (req, res, next) {
	var sess_id = req.params.sess_id;
	log.info({sess_id: sess_id},'get session info');
	
	if (!sess_id) {
		return res.status (400).send ({ error: 'Bad request: missing sess_id'});
	}
	
	cache.get (req.params.sess_id+'_info')
		.then(
			function (result){
				// if typeof result === object then send else make object and send
				result = JSON.parse(result);
				res.status(200).send (result);
			},
			function (err) {
				log.warn ({sess_id: sess_id, err:err}, 'Session info not found.') ;
				res.status(500).send ({error: err});
			}
		);
}
