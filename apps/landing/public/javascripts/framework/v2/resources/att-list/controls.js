/* 
 * an 'icon' in controlsbar represents on/off state of a control(aka key) */

define( function(require){
	var $ 		= require('jquery'),
		_dom 	= require('./element');	/* provides the cached handles of elements */

	var	log 	 	 = {},
		state 	 	 = {},				/* state of each control: initially 'undefined' then either 'set' or 'busy'. */
		controls 	 = {},
		attendee_api = {},
		_allowed,
		f_handle_cached,
		my_namespace = '_att_skin',
		av_info      = {};

	controls.init = function( f_handle, logger){
		var _d = $.Deferred();
		
		f_handle_cached = f_handle;
		log = logger;
		window.att_api = f_handle_cached.attendees; 	/* for testing purpose */
		attendee_api = f_handle_cached.attendees;
		_allowed = f_handle_cached.perms.has_perm;

		$('body').on ('click', '#atl-list .atl-control', control_clicked);
		av_info.free_audio_channels = 0;
		av_info.free_video_channels = 0;
	
		_d.resolve();
		return _d.promise();
	};

	controls.change = function (vc_id, key, val) {

		if (key != 'audio-level' && val !== true && val !== false) {
			log.error ('controls.change: invalid value for val', val, 'expected "true" or "false"');
			return;
		}

		state[vc_id]   = state[vc_id] || {};
		var curr_state = state[vc_id][key];

		if (key === 'audio-level')
			return ; //update_vu_meters (vc_id, key, val);

		/* if (key === 'microphone')
			update_vu_state (vc_id, val); */

		switch_control_icon (vc_id, key, val);	/* decides which icon to show (on/off) */
		change_state (vc_id, key, 'set');
		return;
	};

	controls.forget = function( vc_id){
		/* remove the things related to this user
		 * i.e. states of the controls
		 * and dom elements cache */
		state[vc_id] = undefined;
		_dom.forget(vc_id); 
	};

	controls.manage = function (data, vc_id, key, enable) {

		av_info.free_audio_channels = data.free_audio_channels;
		av_info.free_video_channels = data.free_video_channels;

		var element = _dom.handle(vc_id, key + '-slashed');

		if (enable) {
			if ($(element).hasClass ('read-only'))
				$(element).removeClass ('read-only');
		}

		/* .. else disable */
		if (!$(element).hasClass ('read-only'))
			$(element).addClass ('read-only');
	};

	/*
	 * private methods */

	var vu_update_ts = {};
	var throttle_duration = 400;

	function update_vu_meters (vc_id, key, val) {
		var curr_ts = Date.now();

		if (vu_update_ts[vc_id]) {
			/*
			 * Do not update the DOM if early */
			if (curr_ts - vu_update_ts[vc_id].ts < throttle_duration)
				return;
		}

		vu_update_ts[vc_id] = { ts : curr_ts };

		show_indicator (vc_id, key, val);
	}

	function show_indicator (vc_id, key, val) {
		var _ele    = _dom.handle(vc_id, key);
		var _active = _ele.find('.vu-indicator.active');

		var level = Math.floor ((val*100) / 2) + 1;

		level = Math.min(level, 6);
		level = Math.max(level, 1);

		if (_active.hasClass ('vu'+level))
			return ;

		_active.removeClass ('active');
		_ele.find('.vu' + level).addClass ('active');
	}

	function update_vu_state (vc_id, val) {
		var _el  = _dom.handle (vc_id, 'audio-level');

		if (val)
			return _el.addClass ('atl-audio-set');

		_el.removeClass ('atl-audio-set');
	}

	function control_clicked ( evt ) {

		var id = $(this).closest('li').attr('id');
		if (!id) {
			log.error ('user id not found, did someone change the user template?');
			return false; 
		}
	
		var vc_id = id.replace (my_namespace, ''),
			ele   = $(this).attr('data-id'),
			key	  = ele.replace('-slashed','');
			val   = undefined;

		state[vc_id] = state[vc_id] || {};

		if (state[vc_id][key] === 'busy' || !state[vc_id][key]) {
			log.error ('key: ' + key + ', state: ' + state[vc_id][key] + ', not clickable!');
			return false;
		}

		if ( !op_allowed(vc_id, key, ele) ) {
			log.error ('element: ' + ele + ' clicked, operation not allowed!');
			return false;
		}

		switch (ele) {
			case 'microphone':
				val = false;
				break;
			case 'microphone-slashed':
				val = true;
				break;
			case 'camera':
				val = false;
				break;
			case 'camera-slashed':
				val = true;
				break;
			case 'write-control':
				val = false;
				break;
			case 'write-control-slashed':
				val = true;
				break;
			case 'kick':
				val = false;
				break;
			case 'kick-slashed':
				log.error('attendee is being removed avoid this click');
				return;
			default:
				log.info( key + " clicked but isnt handled yet");
				return;
		}
		
		if (val !== undefined) {
			var is_req = true;
			attendee_api.set_meta (vc_id, key, val, is_req);
			change_state (vc_id, key, 'busy');
		}

		log.info (vc_id + ' key: ' + key + ', to be val:' + val + ', on_click');
	}

	/*
	 * To check if the corresponding av operation is allowed
	 * On the basis of perms and free audio/video channels
	 */
	function op_allowed(vc_id, key, ele) {
		var res, op;
		/*
		 * checking the number of free a/v channels
		 * to decide whether an operation must be allowed
		 */
		switch (ele) {
			case 'microphone-slashed' :
				if (av_info.free_audio_channels <= 0)
					return false;
				break;
			case 'camera-slashed' :
				if (av_info.free_video_channels <= 0)
					return false;
				break;
		}

		switch (key) {
			case 'microphone' :
				res = 'av-' + key;
				op = 'mute';
				break;
			case 'camera' :
				res = 'av-' + key;
				op = 'disable';
				break;
			case 'kick':
				res = key;
				op  = 'enable';
				break;
			case 'write-control' :
				res = 'perms';
				op  = 'grant';
				break;
			default : 
				return true;
		}
		
		return _allowed (res, op, vc_id);
	}
	
	function switch_control_icon (vc_id, key, val) {
		
		/* ----------------------
		 * all others are similar
		 * ---------------------- */
		var _ele_on = _dom.handle(vc_id, key),
			_ele_off= _dom.handle(vc_id, key + '-slashed');
	
		var to_show =  val ? _ele_on : _ele_off;
		var to_hide = !val ? _ele_on : _ele_off;

		to_show.css('display', 'inline-block');
		to_hide.css('display', 'none');
	}

	function change_state (vc_id, key, __state) {
		/* allowed state changes are:
		 *		1. undefined ----> set
		 *		2. set		 ----> busy
		 *		3. busy 	 ----> set */
		
		if (__state !== 'busy' && __state !== 'set') {
			log.error ('change_state: invalid state = ', __state);
			return;
		}

		var el_on  = _dom.handle (vc_id, key),
			el_off = _dom.handle (vc_id, key + '-slashed');

		var add_class = 'att-state-' + __state;
		var rem_class = (__state === 'busy' ? 'att-state-set' : 'att-state-busy');

		el_on.addClass (add_class);
		el_on.removeClass (rem_class);

		el_off.addClass (add_class);
		el_off.removeClass (rem_class);

		state[vc_id][key] = __state;
		return;
	}

	return controls;
});
