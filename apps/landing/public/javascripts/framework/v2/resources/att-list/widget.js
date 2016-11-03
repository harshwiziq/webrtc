define( function(require){

	var search = require('./search'),
	    my_namespace = '_att_skin';   /* because we don't want an element with id=vc_id *
	                                   * what if some other resource has such an element and it does $('#vc_id').remove() */
	var user_tpt   = {},
	    widget_att = {},
	    $anchor    = {},
	    $counter   = {},
	    log        = {};

	var f_handle_cached;
	var _allowed;

	widget_att.init = function( f_handle, anchor, templates, logger){
		var _d = $.Deferred();
	
		f_handle_cached = f_handle;
		_allowed = f_handle_cached.perms.has_perm;
		log = logger;	
		$anchor = $(anchor);			// just search once
		user_tpt = templates[1];
		$anchor.append (templates[0] ());
		
		$counter = $anchor.find('.atl-counter');

		_d.resolve();
		return _d.promise();
	};

	widget_att.set_local_user = function (user, templates) {
		var me_tpt = templates[2];

		/*
		 * make fit for template */
		format (user);
		$anchor.find ('.atl-me').append (me_tpt (user));
	};

	widget_att.add_user = function (user) {
		var _d = $.Deferred();

		/* make fit for template */
		format (user);
		
		/*  
		 * user.vc_id is must for every user, 
		 * as this id is used as element id in our ul 
		 * and hence is required while removing li
		 */
		var $ele = user_tpt (user);
		if( !$ele){
			log.info ('template creation failed');
		}

		$('#atl-list').append( $ele);	     // why hardcode it? 
		update_counter ();

		/*
		 * set states of attendee list controls */
		var has_wc = f_handle_cached.perms.check_perm (user.perms, 'write', 'control', '*');
		f_handle_cached.attendees.set_meta (user.vc_id, 'write-control', has_wc);
		var can_kick = _allowed('kick', 'enable', user.vc_id);
		if (can_kick)
			f_handle_cached.attendees.set_meta (user.vc_id, 'kick', true);

		_d.resolve();
		return _d.promise();
	};

	widget_att.toggle_visible = function () {
		/*
		 * No clean way to directly work with the $anchor here - resorting
		 * to manipulating the "widget-attendees" directly */

		if ($('#widget-attendees').hasClass ('show'))
			$('#widget-attendees').removeClass ('show');
		else
			$('#widget-attendees').addClass ('show');
	};

	widget_att.remove_user = function (vc_id) {
		$('#'+vc_id + my_namespace).remove();
		update_counter ();
	};

	function update_counter () {
		var num = $anchor.find('#atl-list').children().length;
		$counter.text (num);
	}

	function format (user){
		var avatar_def = "/landing/images/user.svg",
			t_join;

		if ( user.history ) {
			var temp = $(user.history).get(-1);	      /* get last joined (the latest one) */
			
			if (!temp.joined)
				t_join = 'not known';
			else {
				var _d = new Date (temp.joined),
					_h = _d.getHours(),
					_m = _d.getMinutes();

					_hx = _h > 12 ? _h - 12: _h;
					_m  = _m < 10 ? '0'+_m : _m;                               /* zero padding */	
					t_join = _hx + ':' + _m + (_h < 13 ? ' am' : ' pm');
			}
		}

		/*
		 * search.js uses the same defaults
		 * try not to break it (the search)
		 * while changing things here...... */
		user.avatar  = user.photos ? user.photos[0].value : null;
		user.time	 = t_join;
		user.email 	 = user.emails ? user.emails[0].value  : "no email";
		user.att_id  = user.vc_id + my_namespace;
		user.authvia = user.auth_via || "not known";

		if (user.displayName) {
			var initials = user.displayName.match(/\b\w/g) || [];
			initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
			user.initials = user.displayName ?  initials : null;
		}
		user.displayName = user.displayName || "not known";	          // even this happens
		user.mic_clickable  = _allowed('av-microphone', 'mute', user.vc_id);
		user.cam_clickable  = _allowed('av-camera', 'disable', user.vc_id);
		user.wc_clickable   = _allowed('perms', 'grant', user.vc_id);
		user.kick_clickable = _allowed('kick', 'enable', user.vc_id);
	}

	/*
	 * this method should be called when attendee list is visible and there is atleast one user present */
	var first = {	
		ack : function(){
			require('./scroll').start( $('#atl-list-wrap') );		/* we allow scrolling with lower limit of one attendee  */	
			
			first = null;
		}	
	};
	
	return widget_att;
});
