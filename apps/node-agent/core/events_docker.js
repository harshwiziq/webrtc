var log             = require('node-agent/common/log');
var docker_monitor  = require('node-agent/utils/docker_monitor');
var prov_if         = require('node-agent/core/prov-if');
var docker          = require('node-agent/core/docker');
var filesys         = require('node-agent/core/filesystem');

function event_handler (err, event) {
	var info = {};	
	if (!event)
		return;
	
	log.debug({ err: err, evt: event.status}, 'docker event');

	switch (event.status) {
		// create, restart, start, destroy, die, kill, stop
		case 'create':
		case 'restart':
			break;
		
		case 'start':
			_extract (event, function (err, info) {
				if (err) {
					log.error ({ err : err }, 'docker data extract failed for event "start"');
					return;
				}
				info.state = 'waiting-to-start';         // up
				prov_if.send (info,'docker');
			});
			break;

		case 'destroy':                     // tells container has been destroyed
		case 'stop':
		case 'kill':
			break;	

		case 'die':
			_extract (event, function (err, info) {
				if (err) {
					log.error ({ err : err }, 'docker data extract failed for event "die"');
					return;
				}
				info.state = 'stopped';
				prov_if.send (info,'docker');            // inform provisioning server of session stop
				docker.remove (event.id);                 // remove the container once it is stopped
				filesys.remove_sess_file (info.sess_id);  // try and remove sess_info file 
			});
			break;

		default:
			log.warn ('unexpected event', event);
	}
}

function _extract (raw, callback) {
	var info = {};
	var _container = {};

	info.cont_id = raw.id;
	_container   = docker.docker.getContainer (raw.id);

	_container.inspect (function (err, data) {
		if (err) {
			log.error ({ err: err, container : raw.id }, 'container inspection failed');
			return callback (err, null);
		}

		info.sess_id = data.Name.replace (/^\//g, '');
		info.docker  = {
			create_ts : data.Created,
			host      : data.Hostname,
			state     : data.State
		};

		return callback (null, info);

	});
}

docker_monitor (event_handler, function(err){
	if (err) {
		log.error (err, 'docker monitor init error');
	}
});
