define(function (require) {
	var $            = require('jquery');
	var log          = require('log')('av-menu', 'info');

	var menu = {};
	var f_handle_cached;
	var custom_config_cached;
	var _allowed;

	menu.init = function (f_handle, custom) {
		f_handle_cached = f_handle;
		custom_config_cached = custom;
		_allowed = f_handle_cached.perms.has_perm;

		$('#widget-nav .av-menu-item').on('click', menu.av_controls.fire);

		return null;
	};

	var screenshare_handler = null;
	var screenshare_enabled = false;

	menu.screenshare = {
		set_handler : function (handler) {
				screenshare_handler = handler;
				screenshare_enabled = true;
				$('#widget-nav li#nav-screenshare a').on('click', handler);
				$('#widget-nav li#nav-screenshare').removeClass('disabled');
			},

		enable : function () {
				if (screenshare_handler) {
					if (screenshare_enabled)
						return;

					$('#widget-nav li#nav-screenshare a').on('click', screenshare_handler);
					$('#widget-nav li#nav-screenshare').removeClass('disabled');
				}
			},

		disable : function () {
				screenshare_enabled = false;
				$('#widget-nav li#nav-screenshare a').off('click');
				$('#widget-nav li#nav-screenshare').addClass('disabled');
			},
	};

	var av_controls_handler = null;
	var cam_state = 'unmute';

	menu.local_media_changed = function (the_thing, _new) {
		var target = the_thing === 'camera' ? 'video' : 'audio';
		var action = _new ? 'unmute' : 'mute';
		var inverse_action = (!_new) ? 'unmute' : 'mute';

		$('#av-menu-' + target + '-' + action).css('display', 'inline-block');
		$('#av-menu-' + target + '-' + inverse_action).css('display', 'none');
	};

	var curr_state = {};
	curr_state.audio = 'off-disabled';
	curr_state.video = 'off-disabled';

	menu.av_controls = {
		set_handler : function (handler) {

			if (av_controls_handler)
				throw 'menu.av_controls : duplicate handler registered';

			av_controls_handler = handler;

			/*
			 * Check permissions and change to read-only state if not allowed
			 */
			if (!_allowed ('av-microphone', 'mute')) {
				$('#av-menu-audio-mute').addClass('read-only');
				$('#av-menu-audio-unmute').addClass('read-only');
			}

			if (!_allowed ('av-camera', 'disable')) {
				$('#av-menu-video-mute').addClass('read-only');
				$('#av-menu-video-unmute').addClass('read-only');
			}

			$('.av-menu-item').removeClass('disabled');
		},

		fire : function (ev) {
			curr_target = $(ev.currentTarget).attr('id');

			if (!av_controls_handler)
				return;

			if ($(ev.currentTarget).closest('li').hasClass('disabled'))
				return;

			if ($(ev.currentTarget).hasClass('read_only'))
				return;
			/*
			 * The ids of the menu items are of the following syntax:
			 *     #av-menu-(audio|video)-(mute|unmute)
			 */
			var target = curr_target.replace(/^av-menu-([^-]+)-.*$/g, "$1");
			var curr_state = curr_target.replace(/^.*-([^-]*mute)$/g, "$1");
			var action = (curr_state === 'mute' ? 'unmute' : 'mute');
			var res, op;

			/*
			 * Check permission for mic and camera
			 */
			switch (target) {
				case "audio" :
					res = 'av-microphone';
					op  = 'mute';
				   break;
				case "video" :
					res = 'av-camera';
			 		op  = 'disable';
					break;
				default :
					log.error ('invalid target type = ' + target + ', for action: ' + action);
					return;		
			}

			if (!_allowed (res, op)) {
				log.log({ res : res, op : op }, 'permission denied');
				return;
			}

			var d = $.Deferred ();
			/*
			 * TODO : use the deferred object's return value,
			 * if rejected to set corresponding states of av-menu
			 */
			av_controls_handler (d, target, action);
			return;
		},

		/* manage audio or video
		 * Params :
		 *         1. target    : 'audio' or 'video'
		 *         2. enable    : enable (true) or disable (false)
		 */
		manage : function (target, __enable) {

			if (__enable) {
				enable (target);
				return;
			}

			/* ..else disable */
			disable (target);
		},

		/*
		 * change state of audio or video menu button as per need
		 * Possible states :
		 *                 1. off-disabled
		 *                 2. off-enabled
		 *                 3. busy-disabled
		 *                 4. on-enabled
		 */
		change_state : function (the_thing, __new) {

			var target = the_thing === 'camera' ? 'video' : 'audio';
			var current_state = curr_state [target];
			/* just used so that it is not required to input action again and again */
			var action = 'mute';

			log.info ('Change state. Old state : ' + current_state + ', new state : ' + __new);

			switch (current_state) {

				case 'off-disabled' :
					switch (__new) {
						case 'off-disabled' :
							/* do nothing */
							break;
						case 'busy-disabled' :
							$('#av-menu-' + target + '-' + action).closest('li').addClass('busy');
							curr_state [target] = __new;
							break;
						case 'off-enabled' :
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('disabled');
							curr_state [target] = __new;
							break;
						case 'on-enabled' :
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('disabled');
							menu.local_media_changed (the_thing, true);
							curr_state [target] = __new;
							break;
					}
					break;

				case 'busy-disabled' :
					switch (__new) {
						case 'off-disabled' :
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('busy');
							curr_state [target] = __new;
							break;
						case 'busy-disabled' :
							/* do nothing */
							break;
						case 'off-enabled' :
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('busy');
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('disabled');
							curr_state [target] = __new;
							break;
						case 'on-enabled' :
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('busy');
							$('#av-menu-' + target + '-' + action).closest('li').removeClass('disabled');
							menu.local_media_changed (the_thing, true);
							curr_state [target] = __new;
							break;
					}
					break;

				case 'off-enabled' :
					switch (__new) {
						case 'off-disabled' :
							$('#av-menu-' + target + '-' + action).closest('li').addClass('disabled');
							curr_state [target] = __new;
							break;
						case 'busy-disabled' :
							$('#av-menu-' + target + '-' + action).closest('li').addClass('busy');
							$('#av-menu-' + target + '-' + action).closest('li').addClass('disabled');
							curr_state [target] = __new;
							break;
						case 'off-enabled' :
							/* do nothing */
							break;
						case 'on-enabled' :
							menu.local_media_changed (the_thing, true);
							curr_state [target] = __new;
							break;
					}
					break;

				case 'on-enabled' :
					switch (__new) {
						case 'off-disabled' :
							log.error ('Not a possible state transition of button. Old state : ' + current_state + ', new state : ' + __new);
							break;
						case 'busy-disabled' :
							$('#av-menu-' + target + '-' + action).closest('li').addClass('busy');
							$('#av-menu-' + target + '-' + action).closest('li').addClass('disabled');
							menu.local_media_changed (the_thing, false);
							curr_state [target] = __new;
							break;
						case 'off-enabled' :
							log.error ('Not a possible state transition of button. Old state : ' + current_state + ', new state : ' + __new);
							break;
						case 'on-enabled' :
							/* do nothing */
							break;
					}
					break;

			}

			return;
		},

		change_state_conditionally : function (config, __new) {
			if (config.audio)
				menu.av_controls.change_state ('microphone', __new);

			if (config.video)
				menu.av_controls.change_state ('camera', __new);

			return;
		}

	};

	function enable (target) {

		var element = (target === 'video') ? 'camera' : 'microphone'; 
		if (!_allowed ('av-' + element, 'turn-on'))
			return;

		var action = 'mute';

		switch (curr_state [target]) {
			case 'off-disabled' :
				menu.av_controls.change_state (element, 'off-enabled');
				break;
			case 'busy-disabled' :
			case 'off-enabled' :
			case 'on-enabled' :
				/* do nothing */
				break;
			default :
				log.error ('Unknown state of ' + target + ', state : ' + curr_state [target]);
		}

	}

	function disable (target) {

		var element = (target === 'video') ? 'camera' : 'microphone'; 
		var action = 'mute';

		switch (curr_state [target]) {
			case 'off-disabled' :
			case 'busy-disabled' :
				/* do nothing */
				break;
			case 'off-enabled' :
				menu.av_controls.change_state (element, 'off-disabled');
				break;
			case 'on-enabled' :
				/* do nothing */
				break;
			default :
				log.error ('Unknown state of ' + target + ', state : ' + curr_state [target]);
				break;
		}
	}

	return menu;

});
