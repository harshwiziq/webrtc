define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var log         = require('log')('av-main', 'info');
	var f_events    = require('events');
	var framework   = require('framework');
	var session     = require('./session');
	var layout      = require('./layout');
	var screenshare = require('./screenshare');
	var local       = require('./local-media');
	var menu        = require('./menu');
	var av_events   = require('./av-events');
	var cpool       = require('./container-pool');

	var av = {};
	var f_handle = framework.handle ('av-tokbox-v2');

	av.init = function (display_spec, custom, perms) {
		var _d = $.Deferred();

		/*
		 * Initialize the layout */
		var err = layout.init (f_handle, display_spec, custom, perms);
		if (err) {
			_d.reject (err);
			return _d.promise ();
		}

		/*
		 * Initialize the session controller */
		err = session.init ();
		if (err) {
			_d.reject (err);
			return _d.promise ();
		}

		menu.init (f_handle, custom);
		av_events.init (f_handle, custom);
		cpool.init (f_handle, display_spec, custom, perms);

		/*
		 * Initialize the screenshare controller */
		err = screenshare.init (f_handle, custom);
		if (err) {
			_d.reject (err);
			return _d.promise ();
		}

		f_events.bind ('framework:perms', handle_perm_evts, 'av-tokbox-v2');
		_d.resolve();
		return _d.promise();
	};

	av.start = function (sess_info) {
		return session.start (f_handle, sess_info);
	};

	/*
	 * received info from outside has to be handled here
	 */
	av.info = function (from, info_id, data) {
		session.info (from, info_id, data);
	};

	av.remote_req = function (command, data, instance) {
		var _d = $.Deferred ();

		if (data !== 'mute' && data !== 'unmute') {
			_d.reject ('incorrect data');
			return _d.promise ();
		}

		switch (command) {

			case 'microphone':
				/* local.publisher_controls ('audio', data); */
				session.manage_publisher (_d, 'audio', data);
				break;

			case 'camera':
				/* local.publisher_controls ('video', data); */
				session.manage_publisher (_d, 'video', data);
				break;

			default:
				_d.reject ('unrecognized command "' + command + '"');
				break;
		}

		return _d.promise ();
	};

	function handle_perm_evts (evt, data) {
		if (evt !== 'override')
			return;

		if (data.key === 'write' && data.subkey === 'control') {
			var method = data.val ? "enable" : "disable";

			if (method === 'disable') {
				/*
				 * stop if running */
				var reason = 'Taken write control back!';
				screenshare.stop (reason);
			}

			/*
			 * only the ones with
			 * write control can share screens */
			menu.screenshare [method] ();
		}
	}

	return av;

});
