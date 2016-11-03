define(function(require) {
	var $           = require('jquery');
	var events      = require('events');
	var log         = require('log')('av-session', 'info');
	var local       = require('./local-media');
	var layout      = require('./layout');
	var tokbox      = require('./tokbox');
	var menu        = require('./menu');
	var urls        = require('urls');

	var session = {};
	var sess_info_cached;
	var f_handle_cached;
	var handlers = {
		/* Session related */
		'sessionConnected'       : sessionConnected,
		'sessionConnectFailed'   : sessionConnectFailed,
		'sessionDisconnected'    : sessionDisconnected,
		'sessionReconnecting'    : sessionReconnecting,
		'sessionReconnected'     : sessionReconnected,

		/* Connection related */
		'connectionCreated'      : connectionCreated,
		'connectionDestroyed'    : connectionDestroyed,
		'streamCreated'          : streamCreated,
		'streamDestroyed'        : streamDestroyed,

		/* Connection related */
		'streamPropertyChanged'  : streamPropertyChanged,
	};
	var conn_emitter    = events.emitter('av:connection', 'av:session.js');
	var stream_emitter  = events.emitter('av:stream', 'av:session.js');
	var cont_emitter    = events.emitter('av:containers', 'av:session.js');
	var channel_emitter = events.emitter('av:channel', 'av:session.js');
	var throttle        = 500;

	session.init = function (display_spec, custom, perms) {
		tokbox.set_exception_handler (exception_handler);
		return null;
	};

	session.start = function (f_handle, sess_info) {
		var d = $.Deferred ();

		sess_info_cached = sess_info;
		f_handle_cached  = f_handle;

		if (!sess_info.on_startup) {
			log.error ('Can not find AV startup config in sess info');
			d.reject ({err: 'no a/v startup config'});
			return d.promise();
		}
		
		tokbox.init (sess_info)
			.then ( tokbox.set_handlers.bind(tokbox, handlers),          __err_exit.bind(d) )
			.then ( tokbox.connect,                                      __err_exit.bind(d) )
			.then (
				function (result) {
					/*
					 * set a/v menu handler here itself, instead of on streamCreated
					 * event, since we must let a person to start his a/v in between
					 * the session, if he has perms for the same
					 */
					menu.av_controls.set_handler (session.manage_publisher);

					start_local_media (sess_info, conn_emitter, true)
						.then (
							function (done) {
								d.resolve(done);
							},
							function (err) {
								/* set av-menu state as off-disabled */
								menu.av_controls.change_state_conditionally (sess_info.on_startup, 'off-disabled');
								d.reject(err);
							}
						);
				},
				__err_exit.bind(d, err)
			);

		return d.promise();

		function __err_exit (err) {
			f_handle_cached.alerts.open ({
				level   : 'alert-danger',
				dismiss : true,
				refresh : true,
				model   : err
			});
			return this.reject (err);
		}
	};

	session.info = function (from, info_id, data) {

		log.info ('from ' + from + ', info_id : ' + info_id + ', data : ' + data);
		switch (info_id) {
			case 'channel-status' :
				/* manage av menu */
				var enable_aud = (data.free_audio_channels > 0) ? true : false;
				var enable_vid = (data.free_video_channels > 0) ? true : false;
				menu.av_controls.manage ('audio', enable_aud);
				menu.av_controls.manage ('video', enable_vid);

				/* fire an event in 'av' namespace and relax ! */
				channel_emitter.emit (info_id, data);
				log.info ('Event emitted in "av:channel" namespace : '+ info_id);
				break;

			default :
				log.error ('received unknown info_id (' + info_id + '). Ignoring.');
				return;
		}

	};

	/*
	 * manage publisher properties.
	 * Params :
	 *       1. d        : deferred object
	 *       2. property : 'audio' or 'video'
	 *       3. data     : corresponding data
	 */
	session.manage_publisher = function (d, property, data) {

		if (local.has_publisher()) {
			/* set busy-disabled state for av-menu */
			var the_thing = (property === 'video') ? 'camera' : 'microphone';
			menu.av_controls.change_state (the_thing, 'busy-disabled');

			local.publisher_controls (property, data);
			d.resolve ('done');
			return;
		}

		/* ..else start publishing first */
		var av_info = {};
		av_info.on_startup = {};
		av_info.on_startup.audio = (property === 'audio') ? true : false;
		av_info.on_startup.video = (property === 'video') ? true : false;
		/* start local media */
		start_local_media (av_info, conn_emitter, false)
			.then (
				function (result) {
					local.set_meta (property, data);
					d.resolve ('done');
					return;
				},
				function (err) {
					/* set av-menu state as off-disabled */
					menu.av_controls.change_state_conditionally (av_info.on_startup, 'off-disabled');
					d.reject (err);
					return;
				}
			);
	};

	var conn_map = {};
	var stream_map = {};

	/*
	 * start local media as and when needed
	 */
	function start_local_media (sess_info, conn_emitter, is_sess_start) {

		var _d = $.Deferred ();

		var on_startup = sess_info.on_startup;

		if (is_sess_start && !on_startup.audio && !on_startup.video) {
			log.info ('A/V does not have to be started as per startup config');
			_d.resolve ('No need to start av');
			return _d.promise();
		}

		/* first of all, set av-menu state as busy-disabled */
		menu.av_controls.change_state_conditionally (on_startup, 'busy-disabled');

		/* Get a div for the local media.*/
		var cont_type = layout.get_initial_container_type (on_startup);

		if (!cont_type) {
			log.info ('Can not allocate a container for A/V as per startup conditions');
			_d.reject('No container available');
			return _d.promise ();
		}
		
		var params = urls.params ('av_publish');
		if (params && params === "false") {
			log.info ("I am the recbot");
			_d.resolve ();
			return _d.promise ();
		}
		
		var cont = layout.get_container (cont_type);
		cont.set_attribute ('stream_type', 'local');

		local.init (f_handle_cached, cont, conn_emitter, sess_info)
			.then (local.start,                              _d.reject.bind(_d) )
			.then (_d.resolve.bind(_d),                      _d.reject.bind(_d) )
			;

		return _d.promise();
	}

	function exception_handler (code, title, message) {
		f_handle_cached.alerts.open ({
			level   : 'alert-danger',
			dismiss : true,
			refresh : true,
			model   : '<span style="font-weight:bold;">' + title + '</span><span>&nbsp:&nbsp' + message + '</span>'
		});
	}

	function sessionConnected (ev) {
		log.info ('TODO : sessionConnected:', ev);
	}

	function sessionConnectFailed (ev) {
		log.error ('TODO : sessionConnectFailed:', ev);
		f_handle_cached.alerts.open ({
			level   : 'alert-danger',
			dismiss : true,
			refresh : true,
			model   : ev.message + '(' + ev.code + ')'
		});
	}

	function sessionDisconnected (ev) {
		f_handle_cached.alerts.open ({
			level   : 'alert-danger',
			dismiss : true,
			refresh : true,
			model   : ev.message + '(' + ev.code + ')'
		});
	}
	function sessionReconnecting (ev) {
		log.info ('TODO : sessionReconnected', ev);
	}
	function sessionReconnected (ev) {
		log.info ('TODO : sessionConnected', ev);
	}

	function connectionCreated (connection_id, data_, local_) {

		var container;
		var data = JSON.parse(data_);

		if (!conn_map[connection_id])
			conn_map[connection_id] = { streams : {} };

		if (!local_)
			local_ = false;

		conn_map[connection_id].local      = local_;
		conn_map[connection_id].vc_id      = data.vc_id;
		conn_map[connection_id].primary    = data.is_primary;

		conn_emitter.emit('incoming-connection', {
			connection_id : connection_id,
			vc_id         : data.vc_id,
			local         : local_
		});

		if (conn_map[connection_id].pending) {

			/* 
			 * See description of the race condition below in "streamCreated"
			 */

			for (var stream_id in conn_map[connection_id].pending) {
				var stream = conn_map[connection_id].pending[stream_id];

				/* Delayed call to streamCreated */
				streamCreated (stream_id, stream);
			}

			delete conn_map[connection_id].pending;
		}
	}

	function connectionDestroyed (connection_id, reason) {

		if (!conn_map[connection_id]) {
			log.error ('connectionDestroyed: no mapping for connection id ' + connection_id + ' (reason = ' + reason + ')');
			return;
		}

		log.info ('connection destroyed: ' + connection_id + ', reason = ' + reason);

		for (var stream_id in conn_map[connection_id].streams) {
			var stream = conn_map[connection_id].streams[stream_id];
			streamDestroyed (stream_id, stream);
		}

		delete conn_map[connection_id];
	}

	function streamCreated (stream_id, stream) {
		/*
		 * A new remote stream has been created */
		var opts_override = {};
		var connection_id = stream.connection.connectionId;

		/* Handle the race condition where the streamCreated may be called
		 * before the connectionCreated callback */
		if (!conn_map[connection_id]) {
			log.info ('race-condition: "streamCreated" called before "connectionCreated". Handling it.');

			if (!conn_map[connection_id].pending)
				conn_map[connection_id] = { pending : {} };

			conn_map[connection_id].pending[stream_id] = stream;

			/* We'll be called again once the connectionCreated is fired (unless tokbox has 
			 * some bug). */
			return;
		}

		/* 
		 * This is the normal path. Decide the type of container needed and get it.
		 *
		 */
		var local = conn_map[connection_id].local;
		
		var type = get_container_type (stream, local); 

		/*
		 * Generally used by the 'container' module to create a tooltip */
		var vc_id  = conn_map[connection_id].vc_id;
		var _identity  = f_handle_cached.attendees.get_identity(vc_id);
		var meta_info = {
			identity : _identity,
			stream_id : stream_id,
			has_video : stream.hasVideo,
			has_audio : stream.hasAudio,
		};

		/* Also inform the framework */
		f_handle_cached.attendees.set_meta ( vc_id, 'microphone', stream.hasAudio);
		f_handle_cached.attendees.set_meta ( vc_id, 'camera', stream.hasVideo);

		var container = layout.get_container (type, meta_info);
		if (!container) {
			/* We cannot show this video as we ran out of containers. Here
			 * we should switch to pure audio. TODO: implement this */
			f_handle_cached.alerts.open ({
				level   : 'alert-danger',
				dismiss : true,
				refresh : true,
				model   : 'Internal error : Ran out of containers'
			});

			return;
		}


		container.set_connection_id (connection_id);

		stream_map[stream_id] = {
			connection_id : connection_id,
		};

		conn_map[connection_id].streams[stream_id] = {
			stream : stream,
			container : container,
			timer : null
		};

		tokbox.subscribe (stream, container.div(), opts_override)
			.then(
				function (subscriber) {
					
					/* set container's stream attribute as remote */	
					container.set_attribute ('stream_type', 'remote');

					/* The video should automatically get shown in the container
					 * that we passed above */
					if (stream.hasVideo)
						layout.reveal_video(container);

					conn_emitter.emit('incoming-media', {
						connection_id : connection_id,
						stream_id     : stream_id,
						stream        : stream
					});

					/* Start a periodic timer to collect stats for this subscriber */
					stream_map[stream_id].timer = setInterval (get_subscriber_stats.bind(null, subscriber, container), 1000);

					last_updated[vc_id] = { ts : Date.now(), level : 0 };
					subscriber.on('audioLevelUpdated', function (ev) {
						set_audio_level_throttled (vc_id, ev.audioLevel);
					});

				},
				function (err) {
					layout.show_error (container, err);
					conn_emitter.emit('incoming-media', {
						err           : err,
						connection_id : connection_id,
					});
				}
			);
	}

	/* 
	 * get the type of container needed 
	 */
	function get_container_type (stream, local) {
		
		var type;

		switch (stream.videoType) {
			case 'screen': 
				type = local ? 'screenshare-local' : 'screenshare-remote';
				break;

			case 'camera':
				if (stream.hasVideo) {
					type = layout.get_container_type_conditionally (stream, local, is_primary(stream));
					break;
				}
				type = 'audio-only';
				break;

			default:
				log.error ('Unknown stream type "' + stream.videoType + '", conn_id: ' + connection_id + ', stream_id: ' + stream_id);
				type = 'video-secondary';
				break;
		}
		
		return type;
	}

	var last_updated = {};
	function set_audio_level_throttled (vc_id, level) {
		/*
		 * TODO: This code will not scale for a huge attendees list, as this only throttles
		 * per attendee. Need to revisit this to have a global throttling, which does not
		 * miss individual values */
		var curr_ts = Date.now();

		last_updated[vc_id].level = level;
		if (curr_ts - last_updated[vc_id].ts < throttle)
			return;

		last_updated[vc_id].ts = curr_ts;
		f_handle_cached.attendees.set_meta (vc_id, 'audio-level', level);
	}

	function streamDestroyed (stream_id, reason) {

		if (!stream_map[stream_id])
			return;

		var connection_id = stream_map[stream_id].connection_id;
		var container = conn_map[connection_id].streams[stream_id].container;

		log.info ('stream destroyed: stream_id: ' + stream_id + ', reason = ' + reason);

		layout.giveup_container (container, reason);
		clearInterval(stream_map[stream_id].timer);

		delete conn_map[connection_id].streams[stream_id];
		delete stream_map[stream_id];
	}

	function streamPropertyChanged (stream_id, stream, property, _old, _new) {
		/*
		 * This gets called for local media as well as remote media. For local media,
		 * we dont' handle the streamCreated event here (it is handled within local-media.js),
		 * so our stream_map does not contain it's information. However, the connectionCreated
		 * handler is still called, so we do have its information in our conn_map. */
		var cont, the_thing;
		var meta = {};
		var conn_id = stream.connection.connectionId;
		var _local = conn_map[conn_id].local;
		var vc_id  = conn_map[conn_id].vc_id;

		try {
			cont = _local ? local.container() : conn_map[conn_id].streams[stream_id].container;
		}
		catch (e) {
			log.error ('streamPropertyChanged, caught an exception', e);
			cont = null;
		}

		log.info ('stream property changed: ' + stream_id + ', property: ' + property + ', changed from (' + _old + ') --> (' + _new + ')');

		switch (property) {
			case 'hasAudio' :
				the_thing = 'microphone';
				meta.has_audio = _new;
				break;

			case 'hasVideo' :
				the_thing = 'camera';
				meta.has_video = _new;
				break;
		}

		/*
		 * Container management 
		 */
		cont_management (stream, cont, property, _old, _new);	

		f_handle_cached.attendees.set_meta (vc_id, the_thing, _new);

		if (cont)
			cont.set_meta (meta);

		if (_local) {
			var new_state = (_new === true) ? 'on-enabled' : 'off-enabled';
			menu.av_controls.change_state (the_thing, new_state);
		}
	
		/* 
		 * emit event of stream property changed corresponding to 
		 * container 
		 */
		cont_emitter.emit ('stream-property-changed', {
			type          : cont.type,
			mode          : cont.mode,
			visible_conts : layout.get_num_visible_containers (),
			meta          : meta
		});

		/*
		 * inform session cluster that stream property has changed.
		 * Basically done to inform about mute/unmute scenarios.
		 * Make sure that this info must be sent only for local media
		 * else sess_cluster may get multiple requests for same stream
		 * property change
		 */
		if (_local){
			var info = {
				vc_id    : vc_id,
				property : (property === 'hasAudio') ? 'audio' : 'video',
				is_set   : (_new === true) ? true : false
			};
			f_handle_cached.send_info (null, 'stream-property-changed', info, 0);
		}

	}

	/*
	 * manage containers and layout (if needed) on stream property change.
	 * Params :
	 *           1. stream    : affected stream
	 *           2. cont      : container associated with affected stream
	 *           3. property  : audio or video
	 *           4. old       : old boolean value of property
	 *           5. new       : new boolean value of property
	 *
	 */           
	function cont_management (stream, cont, property, old_, new_) {
		
		switch (property) {
			
			case 'hasAudio' :
				
				switch (new_) {
					
					case true :
						/* audio turned on */
						
						if (!stream.hasVideo) {
							/* audio started of an empty stream */
							layout.set_container_properties (cont, 'audio-only');
							break;
						}
						
						/* if stream has video already, do nothing */
						
						log.info ('Property changed : audio '+ ' new value :  true');
						break;

					case false:
						/* audio turned off */

						if (!stream.hasVideo) {
							/* audio stopped of an empty container */
							layout.set_container_properties (cont, 'null');
						}
						break;
				
				}

				break;
				
			case 'hasVideo' :

				switch (new_) {
					
					case true :
						/* video turned on */

						var local = cont.get_attribute ('stream_type') == 'local' ? true : false ;
						var type  = layout.get_container_type_conditionally (stream, local, is_primary(stream));
						layout.set_container_properties (cont, type);
						/* reveal video */
						layout.reveal_video(cont);
						break;

					case false:
						/* video turned off */
						
						if (stream.hasAudio) {
							layout.set_container_properties (cont, 'audio-only');
						}
						else {
							layout.set_container_properties (cont, 'null');
						}

						layout.adjust();
						break;
				}

				break;
		
		}

	}

	function get_subscriber_stats (subscriber, container) {
		subscriber.getStats (function (err, stats) {
			container.set_meta ({
				subscriber_err : err,
				subscriber_stats : stats
			});
		});
	}

	/*
	 * check whether a stream is primary or not
	 */
	function is_primary (stream) {
		var conn_id = stream.connection.connectionId;
		return (conn_map[conn_id].primary ? true : false);
	}

	return session;

});
