define( function(require){
	var $       = require('jquery'),
	   _dom     = require('./element');

	var log,
	    keys,
	    user_obj,
	    user_arr,
	    f_handle;

	var search = {},
		mod_name = 'att-list';

	search.init = function (_f_handle, logger){
		log = logger;
		f_handle = _f_handle;
		user_obj = {};

		$('#atl-search input').on('keyup', keyup_handler);
	};
	
	search.start = function () {
		/*
		 * set the searchable fields */
		keys = ['name', 'email'];
		user_obj = f_handle.attendees.get_users(); 

		/*
		 * Do what me must to make it work */
		set_up_search ();
	};

	search.add = function (user) {
		set_keys (user.vc_id);
	};

	function set_up_search () {
		user_arr = Object.keys (user_obj); 
		user_arr.forEach (function (vc_id) {
			set_keys (vc_id);
		});
	}

	function set_keys (vc_id) {
		var identity = user_obj[vc_id].identity;
		var name = identity.displayName || 'not known';
		var email = identity.emails && identity.emails[0].value;

		email = email || 'no email';

		f_handle.attendees.save_info (mod_name, vc_id, 'name', name.toLowerCase());
		f_handle.attendees.save_info (mod_name, vc_id, 'email', email.toLowerCase());
	}

	function keyup_handler(){
		var value;
		var val = $(this).val();
		if( val){
			val = val.toLowerCase();
		}
		
		user_arr = Object.keys (user_obj); 

		/* TODO: 
		 * handle backspaces differently and 
		 * search only in the filtered ones instead of all the keys */

		/*
		 * TODO:
		 * Here goes one from my share of tight loops
		 * yield CPU once a while to avoid page freezing */
		user_arr.forEach (function (vc_id) {
			/*
			 * For each active attendee
			 * search all the keys meant to be searched */
			var meta = f_handle.attendees.get_meta (vc_id);
			if (! (meta && meta.isActive) )
				return;

			for (var i = 0; i < keys.length; i++) {
				value = f_handle.attendees.get_info (mod_name, vc_id, keys[i]);

				/*
				 * 2's complement of -1 is 0 */
				if (value && ~value.indexOf (val))
					return _show (vc_id, true);
			}	

			return _show (vc_id, false);
		});
	}

	function _show( vc_id, val){
		var $elem = _dom.handle(vc_id);				/* we are caching them already in controls.js. */
		return val ? $elem.show() : $elem.hide();
	}

	return search;
});
