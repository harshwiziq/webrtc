define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var log         = require('log')('recording', 'info');
	var xhr         = require('xhr');
	var framework   = require('framework');
	var button      = require('./button-ctrl');

	var recording = {};
	var f_handle = framework.handle ('recording');
	var am_i_recbot = false;

	recording.init = function (display_spec, custom, perms, mod_name) {
		var _d = $.Deferred();

		button.init (display_spec, custom, perms, mod_name, f_handle)
			.then (
				_d.resolve.bind (_d),
				_d.reject.bind (_d)
			);

		return _d.promise();
	};

	recording.info = function (from, info_id, info, _instance) {

		switch (info_id) {
			case 'recording-status' :

				if (info.recording)
					button.enable ();
				else
					button.disable ();

				am_i_recbot = info.you_are_recbot;
				break;

			case 'recording-start' :
				button.set_recording_on ();
				break;

			case 'recording-stop' :
				button.set_recording_off ();
				break;

			default :
				log.error ('received unknown info_id (' + info_id + '). Ignoring.');
				return;
		}
	};

	recording.remote_req = function (command, data, _instance) {
		var _d = $.Deferred ();

		if (!am_i_recbot) {
			log.error ('recieved command "' + command + '", but I am not recbot. rejected');
			_d.reject ('i am not recbot');
			return _d.promise ();
		}

		/*
		 * If we come here, it means we have determined ourselves to be the recbot */

		switch (command) {
			case 'recording-start' :
				/*
				 * The below hostname is actually a hack. The host is, in reality,
				 * non-existent. Due to certificate and security issues, on the recbot
				 * the /etc/hosts is modified to include the host "recbot-localhost.wiziq.com"
				 * to point to 127.0.0.1. The node server running on the recbot can then,
				 * listen to HTTPS requests using the WizIQ certificate */
				xhr.post ('https://recbot-localhost.wiziq.com:2179/start', null)
					.then (
						function (data) {
							_d.resolve ('xhr start ok', data);
						},
						function (err) {
							_d.reject ('xhr failed with error', err);
						}
					);

				break;

			case 'recording-stop' :
				xhr.post ('https://recbot-localhost.wiziq.com:2179/stop', null)
					.then (
						function (data) {
							_d.resolve ('xhr stop ok', data);
						},
						function (err) {
							_d.reject ('xhr failed with error', err);
						}
					);

				break;

			default :
				log.error ('received unknown command (' + command + '). Ignoring.');
				log.error (command, data);
				return;
		}

		return _d.promise ();
	};

	recording.start = function (sess_info) {
		log.info ('sess_info = ', sess_info);

		am_i_recbot = sess_info.you_are_recbot;

		if (sess_info.recording === true) {
			button.enable ();
			log.info ('recording is enabled - enabling button');
		}

		if (sess_info.current_status === 'recording') {
			button.set_recording_on();
			return;
		}
		button.set_recording_off ();

		return;
	};

	recording.stop = function () {
		button.disable ();

		xhr.post ('https://recbot-localhost.wiziq.com:2179/end', null)
			.then (
				function (data) {
					_d.resolve ('xhr end ok', data);
				},
				function (err) {
					_d.reject ('xhr failed with error', err);
				}
			);

		return;
	};

	return recording;

});
