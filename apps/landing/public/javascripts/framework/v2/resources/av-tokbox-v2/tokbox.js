define(
	[ 
		'require', 
		'//tokbox.com/v2/js/opentok.min.js', 
		'log', 
		'jquery' 
	], 
function (require, ot, _log, $) {

	var log         = _log('av-tokbox', 'info');
	var OT          = window.OT;

	var tokbox = {};
	var sess_obj;
	var publisher;

	OT.on ('exception', handle_exceptions);

	tokbox.init = function (sess_info) {
		var d = $.Deferred ();

		if ( OT.checkSystemRequirements() === 0 ) {
			d.reject ('OT: no WebRTC support. Aborting.');
			return d.promise();
		}

		sess_obj = OT.initSession(sess_info.key, sess_info.sessionid);
		sess_obj.off ();

		d.resolve (sess_info);

		return d.promise();
	};

	tokbox.set_handlers = function (handlers, sess_info) {
		var d = $.Deferred ();

		sess_obj.on ({

			/*
			 * Session related hanclers
			 */
			sessionConnected     : handlers.sessionConnected,
			sessionConnectFailed : handlers.sessionConnectFailed,
			sessionDisconnected  : handlers.sessionDisconnected,
			sessionReconnecting  : handlers.sessionReconnecting,
			sessionReconnected   : handlers.sessionReconnected,

			/*
			 * Connection related hanclers
			 */

			connectionCreated : function (ev) {
				var connection = ev.connection;
				var id = connection.connectionId;
				var data = connection.data;

				add_to_list (id, connection);
				var local = (id == sess_obj.connection.connectionId) ? true : false;
				log.info ('connection created: ' + id + ' (local = ' + local + '), data: ' + connection.data);

				handlers.connectionCreated (id, data, local);
			},

			connectionDestroyed : function (ev) {
				var connection = ev.connection;
				var id = connection.connectionId;

				log.info ('connection destroyed: ' + id + ', reason: ' + ev.reason);
				remove_from_list (id);
				handlers.connectionDestroyed (id, ev.reason);
			},

			/*
			 * Stream related hanclers
			 */

			streamCreated : function (ev) {
				var stream = ev.stream;
				var id = stream.streamId;
				var connection_id = stream.connection.connectionId;

				log.info ('stream created: (conn_id = ' + connection_id + ')' + id + ', type: ' + stream.videoType + ', stream: ', stream);
				handlers.streamCreated (id, stream);
			},

			streamDestroyed : function (ev) {
				var stream = ev.stream;
				var id = stream.streamId;

				log.info ('stream destroyed: ' + id + ', reason: ' + ev.reason);
				handlers.streamDestroyed (id, ev.reason);
			},

			streamPropertyChanged : function (ev) {
				var property = ev.changedProperty;
				var _old = ev.oldValue;
				var _new = ev.newValue;
				var id = ev.stream.streamId;

				handlers.streamPropertyChanged (id, ev.stream, property, _old, _new);
			},

		});

		d.resolve (sess_info);

		return d.promise();
	};

	function format_err (err, prefix) {
		if (typeof err === 'string')
			return (prefix ? prefix + '-' : '') + err;

		switch (err.code) {
			case 1500 :
				err.message = 'permission denied. Enable the webcam and microphone and load the page again.';
				break;
			default:
		}
		return (prefix ? prefix + ' - ' : '') + err.message + ' (code = ' + err.code + ')';
	}

	tokbox.connect = function (sess_info) {
		var token = sess_info.token;
		var d = $.Deferred ();

		sess_obj.connect (token, function (err) {
			if (err)
				return d.reject (format_err (err, 'connect'));

			d.resolve(sess_info);
		});

		return d.promise();
	};

	tokbox.init_publisher = function (i_am, sess_info, div, opts) {
		var d = $.Deferred ();

		if (!div)
			log.error ('no div supplied !');
		
		/* 
		 * whether to publish video and/or audio (by default true).
		 */
		var pub_video = true;
		var pub_audio = true;
	
		if (sess_info && sess_info.on_startup) {
			pub_video = sess_info.on_startup.video ? true : false;
			pub_audio = sess_info.on_startup.audio ? true : false;
		}

		log.info ('publisher config ' + pub_video + ' '+ pub_audio);

		var options = {
			width : '100%',
			height : '100%',
			audioFallbackEnabled : true,
			fitMode : 'cover',
			frameRate : 30,
			insertMode : 'append',
			maxResolution : { width : 1280, height : 720 },
			name : i_am,
			publishAudio : pub_audio,
			publishVideo : pub_video,
			resolution : opts && opts.resolution || "320x240",
			showControls : false,
			style : {
				audioLevelDisplayMode : 'off',
				backgroundImageURI : 'off',
				nameDisplayMode : 'off',
				buttonDisplayMode: 'off'
			}
		};

		var pub_opts = (!sess_info || (Object.keys(sess_info).length === 0)) ? opts : options;

		publisher = OT.initPublisher (div, pub_opts, function (err) {
			if (err)
				return d.reject (format_err (err, 'webcam'));

			return d.resolve (sess_info, publisher);
		});

		/* Remove any styling introduced by the tokbox api.All our
		* styling will be done via our code/CSS. */
		$(div).attr('style', '');

		return d.promise();
	};

	tokbox.publish = function (_publisher) {
		var d = $.Deferred ();

		/*
		 * This can be called by the local media or the screenshare. Defaults
		 * to local media */
		if (!_publisher)
			_publisher = publisher;

		sess_obj.publish (_publisher, function (err) {
			if (err) {
				log.error ('publish: err = ' + format_err (err));
				return d.reject(format_err (err));
			}

			d.resolve(_publisher);
		});

		return d.promise();
	};

	var upstream_exception_h;
	tokbox.set_exception_handler = function (handler) {
		upstream_exception_h = handler;
	};

	tokbox.set_pub_handlers = function (handlers) {
		for (var ev in handlers) {
			publisher.on(ev, handlers[ev]);
		}
	};

	tokbox.subscribe = function (stream, div, opts_override) {
		var d = $.Deferred ();

		if (!div)
			log.error ('no div supplied !');

		var options = {
			style : {
				nameDisplayMode : 'off',
				buttonDisplayMode: 'off',
				videoDisabledDisplayMode: 'auto',
				audioLevelDisplayMode: 'off'
			},
			fitmode : 'cover', /* This property appears to have stopped working as of 16 uly 2016. Adding hack */
			insertMode : 'append',
			width : '100%',
			height : '100%',
		};

		var subscriber = sess_obj.subscribe (stream, div, options, function (err) {
			if (err)
				return d.reject (format_err (err));

			/* Hack as described above
			 *  --- does not seem to be required anymore
			$(div).find('.OT_fit-mode-contain').removeClass('OT_fit-mode-contain').addClass('OT_fit-mode-cover');
			*/
			d.resolve(subscriber);
		});

		return d.promise ();
	};

	tokbox.checkScreenSharingCapability   = OT.checkScreenSharingCapability;
	tokbox.registerScreenSharingExtension = OT.registerScreenSharingExtension;

	var exceptions = {
		'1004' : 'Authentication error',
		'1005' : 'Invalid Session ID',
		'1006' : 'Connect Failed',
		'1007' : 'Connect Rejected',
		'1008' : 'Connect Time-out',
		'1009' : 'Security Error',
		'1010' : 'Not Connected',
		'1011' : 'Invalid Parameter',
		'1013' : 'Connection Failed',
		'1014' : 'API Response Failure',
		'1026' : 'Terms of Service Violation: Export Compliance',
		'1500' : 'Unable to Publish',
		'1520' : 'Unable to Force Disconnect',
		'1530' : 'Unable to Force Unpublish',
		'1535' : 'Force Unpublish on Invalid Stream',
		'2000' : 'Internal Error',
		'2010' : 'Report Issue Failure',
	};

	function handle_exceptions (ev) {
		if (!upstream_exception_h)
			return log.error ('exception: (' + ev.code + ')' + ev.title + ': ' + ev.message);

		upstream_exception_h (ev.code, ev.title, ev.message);
	}

	var list = {};
	function add_to_list (id, conn_obj) {
		list[id] = conn_obj;
	}

	function remove_from_list (id) {
		delete list[id];
	}
	
	return tokbox;

});
