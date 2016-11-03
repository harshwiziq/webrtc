define(function(require) {
	var $            = require('jquery');
	var log          = require('log')('av-local', 'info');
	var layout       = require('./layout');
	var tokbox       = require('./tokbox');
	var av_container = require('./container');
	var menu         = require('./menu');

	var local = {};
	var publisher;
	var my_container;
	var conn_emitter_cached;
	var f_handle_cached;

	local.init = function (f_handle, container, conn_emitter, sess_info) {
		var d    = $.Deferred ();
		var i_am = f_handle.identity.vc_id;

		f_handle_cached = f_handle;
		my_container = container;
		conn_emitter_cached = conn_emitter;

		/* OT destroys the div upon mediastream destruction, so create a child under it,
		 * and pass */
		$(my_container.div()).append('<div id="av-ot-localmedia-wrap"></div>');
		var div = $('div#av-ot-localmedia-wrap');

		tokbox.init_publisher (i_am, sess_info, div[0])
			.then (
				function (__sess_info, _publisher) {
					publisher = _publisher;
					set_handlers(d, sess_info);
				},
				d.reject.bind(d)
			);

		return d.promise();
	};

	local.start = function (sess_info) {
		var d          = $.Deferred ();
		var on_startup = sess_info.on_startup;

		tokbox.publish ()
			.then (
				function () {
					my_container.set_meta ({
						identity  : f_handle_cached.identity,
						has_video : on_startup.video,
						has_audio : on_startup.audio
					});

					send_publishing_status (on_startup, 'success');
					return d.resolve(sess_info);
				},
				function (err) {
					/*
					 * since av could not be started,
					 * remove publisher object
					 */
					publisher = null;
					send_publishing_status (on_startup, 'failure');
					return d.reject (err);
				}
			);

		/*
		 * Purely test code 
		for (var i = 0; i < 4; i++) {
			var _cn = layout.get_container ('video-secondary');
			_cn.set_attribute ('stream_type', 'remote');
			tokbox.init_publisher (null, null, _cn.div())
			//tokbox.init_publisher (f_handle_cached.identity.vc_id, __cached_sess_info, _cn.div());
			log.info ('div --> ', _cn.div())
		}
	   */

		return d.promise();
	};

	local.container = function () {
		return my_container;
	};

	local.set_meta = function (element, action) {
		if (element === 'audio') {
			my_container.set_meta ({ has_audio : (action === 'mute' ? false : true)});
			return;
		}
		/* ..else */
		my_container.set_meta ({ has_audio : (action === 'mute' ? false : true)});
		return;
	};

	function set_handlers (d, sess_info) {
		tokbox.set_pub_handlers ({
			'accessAllowed'        : accessAllowed,
			'accessDenied'         : accessDenied,
			'accessDialogOpened'   : accessDialogOpened,
			'accessDialogClosed'   : accessDialogClosed,
			'destroyed'            : destroyed,
			'mediaStopped'         : mediaStopped,
			'streamCreated'        : streamCreated,
			'streamDestroyed'      : streamDestroyed,
		});

		d.resolve(sess_info);
	}

	/*
	 * ___________ Handlers ____________
	 *
	 */
	local.publisher_controls = function (element, action) {

		switch (element) {
			case 'audio':
				publisher.publishAudio (action === 'mute' ? false : true);
				my_container.set_meta ({ has_audio : (action === 'mute' ? false : true)});
				break;

			case 'video':
				publisher.publishVideo (action === 'mute' ? false : true);
				my_container.set_meta ({ has_video : (action === 'mute' ? false : true)});
				break;

			default:
				log.error ('invalid element type = ' + element + ', for action: ' + action);
		}
	};

	/* return publisher object */
	local.has_publisher = function () {
		if (publisher)
			return true;

		return false;
	};

	function accessAllowed (ev) {
		/* All is well - do nothing */
	}
	function accessDenied (ev) {
		log.error ('it seems, access to local media was denied by the user. TODO: Show a modal error here.');
	}
	function accessDialogOpened (ev) {
		/* All is well - do nothing */
	}
	function accessDialogClosed (ev) {
		/* All is well - do nothing */
	}
	function destroyed (ev) {
		log.info ('publisher element destroyed: reason: ' + ev.reason);
	}
	function mediaStopped (ev) {
		/* All is well - do nothing */
	}
	function streamCreated (ev) {
		var stream = ev.stream;
		
		if (stream.hasVideo)
			layout.reveal_video (my_container);

		/* set a/v menu state as on-enabled */
		var config = {};
		config.audio = stream.hasAudio;
		config.video = stream.hasVideo;
		menu.av_controls.change_state_conditionally (config, 'on-enabled');
		
		conn_emitter_cached.emit('incoming-media', {
			connection_id : 'local-media',
			stream_id     : stream.streamId,
			stream        : stream
		});
	}
	function streamDestroyed (ev) {
		log.info ('streamDestroyed: ev = ', ev);
		layout.stream_destroyed (my_container, ev.reason);
	}

	/*
	 * ____________ Local methods ____________
	 *
	 */

	/*
	 * send info to session cluster about success
	 * or failure of local stream publishing.
	 * Params :
	 *          1. on_startup : startup config
	 *          2. status     : 'success' or 'failure'
	 */
	function send_publishing_status (on_startup, status) {
		var info = {
			vc_id      : f_handle_cached.identity.vc_id,
			on_startup : on_startup,
			status     : status
		};
		f_handle_cached.send_info (null, 'av-startup-confirm', info, 0);
	}

	return local;

});
