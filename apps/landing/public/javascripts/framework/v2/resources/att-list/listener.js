/* 
 *	read api_spec in docs 
 *	folder to know about 
 *	event handling (namespace, binder etc.).
 */

define(function(require){

	var _events  = require('events'),
	    search   = require('./search'),
	    widget   = require('./widget'),
	    controls = require('./controls');

	var att_namespace   = 'framework:attendees',
	    av_namespace    = 'av:channel',
	    binder          = 'att-list',
	    listener        = {},
	    log             = {},
	    f_handle_cached,
		att_api;

	listener.init = function(f_handle, logger){
		log = logger;
		f_handle_cached = f_handle;
		att_api = f_handle.attendees;
		_events.bind (att_namespace, handle_att_events, binder);
		_events.bind (av_namespace, handle_av_events, binder);
	};

	/*
	 * handle attendee related events
	 */
	function handle_att_events (evt, data){
		
		switch( evt){
			case 'in':
				data.forEach( function(user){
					widget.add_user( user);
					search.add (user);
				});
				break;

			case 'out':
				widget.remove_user(data);
				controls.forget(data);
				break;

			case 'control_changed':
				controls.change( data.vc_id, data.known_key, data.value);
				break;

			case 'kick':
				f_handle_cached.send_command(data.vc_id, data.key, data.value)
				.then (
					function () {
						att_api.set_meta (data.vc_id, data.key, data.value);
					},
					function () {
						att_api.set_meta (data.vc_id, data.key, !data.value);
					}
				);
				break;

			default:
				log.info('Ignoring event : ' + evt);
		}	
	
	}

	/*
	 * handle av channel related events
	 */
	function handle_av_events (ev, data) {

		log.info ('ev : ' + ev);

		switch (ev) {
			case 'channel-status':

				var to_be_set;

				/*
				 * if free audio channels, set audio in off state,
				 * else make it disabled for all users except one
				 * in data.
				 */
				to_be_set = (data.free_audio_channels > 0) ? true : false;
				update_av (data, 'microphone', to_be_set);

				/*
				 * if free video channels, set video in off state,
				 * else make it disabled for all users except one
				 * in data
				 */
				to_be_set = (data.free_video_channels > 0) ? true : false;
				update_av (data, 'camera', to_be_set);
				break;

			default :
				log.info ('Unhandled event : ' + ev +'. Do nothing');
				break;
		}

	}

	/*
	 * update a/v in att_list as desired.
	 * Params :
	 *         1. data : av channel related info
	 *         2. key  : camera or microphone
	 *         3. to_be_set : whether audio or video has
	 *                        to be set as off or
	 *                        disabled..
	 *                        true  -> enable
	 *                        false -> disable
	 */
	function update_av (data, key, enable) {

		var users = f_handle_cached.attendees.get_users();

		Object.keys(users).forEach(function(vc_id){

			if (!users[vc_id].meta.isActive)
				return;

			if (!enable) {
				controls.manage (data, vc_id, key, false);
				return;
			}

			/* if (enable) .... */
			controls.manage (data, vc_id, key, true);
			if (users[vc_id].meta[key] == null) {
				controls.change (vc_id, key, false);
			}

		});

	}


	return listener;
});
