var $         = require('jquery-deferred');
var rest      = require('restler');
var recording = {};
var myinfo;
var log, coms, h_user;
var recbot_login_id = null, recbot_vc_id = null;

recording.init = function (__myinfo, common, handles) { 

	var _d = $.Deferred ();
	log    = handles.log;
	coms   = handles.coms;
	h_user = handles.user;

	log.info ({ myinfo : __myinfo, common : common }, 'init');
	myinfo = __myinfo;
	recbot_login_id = __myinfo.custom.login_id;
	
	_d.resolve ();
	return _d.promise ();
};

var session_info = {
	you_are_recbot : false,
	recording      : false,
	current_status : 'stopped',
};

recording.init_user = function (user, prev_info, __log) { 
	var _d = $.Deferred ();

	if (user.id === recbot_login_id) {
		log.info ('This is the RECBOT !');

		var recbot_sess_info = {
			you_are_recbot : true,
			recording      : true,
			current_status : 'stopped',
		};

		_d.resolve (recbot_sess_info);

		session_info.recording = true;
		recbot_vc_id           = user.vc_id;

		/* also broadcast to all users about the availability of recording */
		coms.broadcast_info ('recording-status', session_info, null);
	}
	else {
		_d.resolve (session_info);
	}

	__log.info ({ user : user, prev_info : prev_info }, 'init user');

	return _d.promise ();
};

recording.command = function (vc_id, command, data) {
	var _d = $.Deferred ();

	if (!recbot_login_id) {
		log.error ({ command:command }, 'no recbot registered. rejecting command');
		_d.reject ('no recbot available');
		return _d.promise ();
	}

		/*
		 * Check permission */
	if (!h_user.has_perms (vc_id, 'recording', 'do', '*')) {
		log.error ({ command:command, vc_id:vc_id }, 'no permission to start/stop recording. command rejected');
		_d.reject ('not allowed');
		return _d.promise ();
	}

	switch (command) {

		case 'recording-start' :
			log.info ('recording-start RX: sending ok');
			coms.send_command (recbot_vc_id, 'recording-start', {})
				.then (
					function (msg) {
						session_info.current_status = 'recording';
						coms.broadcast_info ('recording-start', session_info, null);
						_d.resolve(msg);
					},
					_d.reject.bind (_d)
				);
			break;

		case 'recording-stop' :
			log.info ('recording-stop RX: sending ok');
			coms.send_command (recbot_vc_id, 'recording-stop', {})
				.then (
					function (msg) {
						session_info.current_status = 'stopped';
						coms.broadcast_info ('recording-stop', session_info, null);
						_d.resolve(msg);
					},
					_d.reject.bind (_d)
				);
			break;

		default :
			_d.reject ('unknown command');
	}

	return _d.promise ();
};

recording.info = function (from, id, info) {
};

recording.relay_info = function (from, to, id, info) {

	switch (id) {
		default :
			log.error ({ from: from, id: id, info: info }, 'unknown info id');
			return false;
	}

	return false;
};

module.exports = recording;
