define(function (require) {
	var $            = require('jquery');
	var events       = require('events');
	var log          = require('log')('av-events', 'info');

	var e = {};
	var f_handle_cached;
	var custom_config_cached;

	e.init = function (f_handle, custom) {
		f_handle_cached = f_handle;
		custom_config_cached = custom;

		events.bind('framework:attendees', handle_events, 'av-tokbox');

		return null;
	};

	function handle_events (ev, data) {
		switch (ev) {

			case 'av' : handle_av_events (data); break;
			default : /* Ignore */ break;
		}
	}

	function handle_av_events (data) {
		var key    = data.key;
		var val    = data.value;
		var vc_id  = data.vc_id;
		var for_me = f_handle_cached.identity.am_i (vc_id);

		if (!for_me)
			return send_command (vc_id, key, val ? 'unmute' : 'mute' );

		/* Else this command is for me */
	}

	function send_command (vc_id, key, val) {
		f_handle_cached.send_command (vc_id, key, val)
			.then(
					function () {
						log.info ('remote command "' + key + '->' + val + '" ok');
					},
					function (err) {
						log.error ('remote command "' + key +  '->' + val + '" failed: reason: ' + err);
					}
			     );
	}

	return e;
});
