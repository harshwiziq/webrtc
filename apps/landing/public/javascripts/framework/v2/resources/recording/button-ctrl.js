define(function(require) {
	var $           = require('jquery');
	var log         = require('log')('rec-button-ctrl', 'info');
	var framework   = require('framework');

	var state           = 'disabled';
	var recording_on    = false;
	var button          = {};
	var f_handle_cached = null;
	var $button         = $('#widget-nav ul.nav li.av-recording');
	var _allowed        = null;

	button.init = function (display_spec, custom, perms, mod_name, f_handle) {
		var _d = $.Deferred();

		f_handle_cached = f_handle;
		_allowed = f_handle_cached.perms.has_perm;

		/*
		 * All attendees should see the recording button, and it's various states,
		 * including the fact that this session is getting recorded. However, only
		 * the one with the right permissions should be able to control the 
		 * recording */

		$button.css('display', 'inline-block');

		if (_allowed ("recording", "do")) {
			if ($button.length)
				$button.on('click', handle_button);
		}

		_d.resolve();
		return _d.promise();
	};

	button.enable = function () {
		if (state === 'enabled' || state === 'busy')
			return;

		state = 'enabled';
		$button.removeClass ('disabled');
	};

	button.disable = function () {
		if (state === 'disabled' || state === 'busy')
			return;

		state = 'disabled';
		$button.addClass ('disabled');
	};

	button.busy = function () {
		if (state === 'disabled' || state === 'busy')
			return;

		state = 'busy';
		$button.removeClass ('disabled');
		$button.addClass ('recording-busy');
	};

	button.un_busy = function () {
		if (state !== 'busy')
			return;

		state = 'enabled';
		$button.removeClass ('recording-busy');
	};

	button.start = function () {
		if (state === 'disabled' || state === 'busy')
			return;
	};

	button.set_recording_on = function () {
		recording_on = true;
		$button.addClass ('recording-on');
	};

	button.set_recording_off = function () {
		recording_on = false;
		$button.removeClass ('recording-on');
	};

	function handle_button (ev) {
		if (state === 'disabled' || state === 'busy')
			return false;

		button.busy ();

		/* if we come here, it means we are state */
		switch (recording_on) {

			case false: 
				f_handle_cached.send_command (null, 'recording-start' , null, 0)
					.then (
						function (response) {
							button.set_recording_on ();

							log.info ('recording-start command ok');
						},
						function (err) {
							log.error ('recording-start command failed with error: ' + err);
						}
					)
					.always (function () {
						button.un_busy ();
					});
				break;

			case true : 
				f_handle_cached.send_command (null, 'recording-stop' , null, 0)
					.then (
						function (response) {
							button.set_recording_off ();

							log.info ('recording-stop command ok');
						},
						function (err) {
							log.error ('recording-stop command failed with error: ' + err);
						}
					)
					.always (function () {
						button.un_busy ();
					});
				break;
		}

	}

	return button;
});
