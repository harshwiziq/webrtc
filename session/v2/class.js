var $               = require('jquery-deferred');
var moment          = require('moment');
var log             = require("./common/log").sub_module('class');
var config          = require("./config");
var events          = require('./events')('class');
var resources       = require("./resources");
var users           = require("./users");
var agent           = require("./agent");

var state = 'scheduled';

class_ = {};
class_.events = events;

class_.init = function (sess_info) {
	var _d = $.Deferred ();

	log.info ({state : 'PROVISIONING'}, '+-- transition -->');
	state = 'provisioning';
	provision (sess_info)
		.then (
			function () {
				state = 'provisioned';

				/*
				 * Start a timer for now. Will change this later */
				start_timer (sess_info);

				log.info ({state : 'PROVISIONED'}, '+-- transition -->');
				_d.resolve ('provisioned');
			},
			function (err) {
				log.error ({state : 'PROVISIONING-FAILED', err : err}, '+-- transition --> error');
				state = 'provisioning-failed';
				_d.reject.bind(_d);
			}
		);
	
	return _d.promise ();
};

class_.ready = function () {
	return (state === 'active') || (state === 'provisioned');
};

class_.started = function () {
	return (state === 'active');
};

/* if any new class state introduced, relook this method
 * to add any state for which class has run its course 
 */
class_.ended = function () {
	return (state === 'terminating');
};

function provision (sess_info) {
	return resources.load (sess_info);
}

function start (sess_info) {
	state = 'active';
	log.info ({state : 'ACTIVE'}, '+-- transition -->');
	events.emit ('active');

	/*
	 * Inform the agent */
	inform_agent (sess_info);

	/*
	 * Attach timer for class duration */
	session_timer (sess_info);
}

function inform_agent (sess_info) {
	var _r = agent.send_event (sess_info.sess_id, 'started', { time : moment().utc().toISOString() });

	_r.on('success', function (data, response) {
		log.info ({ res : data }, 'send event "started" ok');
	});

	_r.on('fail', function (data, response) {
		log.error ({ res : data }, 'send event "started" failed');
	});

	_r.on('error', function (err, response) {
		log.error({ err : err }, 'send event "started" error');
	});

	_r.on('timeout', function (ms) {
		log.error({ timeout : ms }, 'send event "started" timeout');
	});
}
function start_timer (sess_info) {

	/*
	 * Check if current time is greater than or equal to start time */

	try {
		log.info ({ start_time : sess_info.start_time, duration : sess_info.duration }, 'session info received');

		/*
		 * Start 5 seconds before if possible */
		var start_time = moment (sess_info.start_time).subtract (5, 'seconds');
		var diff = start_time.diff (moment());

		if (diff < 0)
			diff = 0;

		var duration = moment.duration (diff).asMilliseconds();

		log.debug({ start_in : (duration/1000) + ' secs' }, 'class will start in');
		
		setTimeout (start.bind(null, sess_info), duration);
	}
	catch (err) {
		log.error(err, 'start_timer');
	}
}

function session_timer (sess_info) {
	/*
	 * The start time of the class will likely not be accurate, and 
	 * may start too early or too late. The class should however, not
	 * end before it's scheduled time. */

	var duration     = sess_info.duration || 60;
	var start_time   = moment (sess_info.start_time);

	if (duration == -1) {
		log.info ('permanent class. not setting sesion expiry timer');
		return;
	}

	log.debug({ expire_after : duration + ' mins' }, 'session expiry timer set');

	duration *= 60*1000;

	/* Start session timer */
	setTimeout (terminate.bind (null, sess_info.sess_id), duration);
}

function terminate (sess_id) {
	state = 'terminating';
	log.info ({state : 'TERMINATING'}, '+-- transition -->');
	events.emit('terminate', sess_id);
}

module.exports = class_;
