/* 
 * List of users
 * present in the session
 */

define(function(require){
	var $          = require('jquery'),
	    framework  = require('framework'),
	    scrollbar  = require('scrollbar'),
	    events     = require('events'),
	    log        = require('log')('att-list','info'),
	    widget     = require('./widget'),
	    controls   = require('./controls'),
	    search     = require('./search'),
	    listener   = require('./listener');

	var att = {},
	    f_handle = framework.handle('att-list'),
	    templates = [];
	
	att.init = function( display_spec, custom, perms ) {
		var _d = $.Deferred();

		var _compile = function (name) {
			templates.push( f_handle.template(name) );
		};

		if( !display_spec.anchor || display_spec.templates.length < 3)
			return _d.reject('wrong info from backend').promise();

		var anchor  = display_spec.anchor,
		    trigger = $('#nav-attendees'); 	            // should come from the framework
		
		display_spec.templates.forEach( _compile );	    // forEach is synchronous.
	
		/*
		 * Visibility related. Hidden initially */
		trigger.on('click', toggle_visibility);
		$(anchor).on('click', '#atl-header a.fa-times', toggle_visibility);

		add_scrollbar ();
		widget.init (f_handle, anchor, templates, log);
		controls.init (f_handle, log);
		search.init (f_handle, log);

		/* Start listening to events */
		listener.init(f_handle, log);

		_d.resolve();
		return _d.promise();
	};

	att.start = function () {
		/*
		 * Set the local user first */
		widget.set_local_user ($.extend({}, f_handle.identity), templates);

		/*
		 * Now set the remote users */
		var users = f_handle.attendees.get_users(); 
		Object.keys(users).forEach( function(key){
			widget.add_user( $.extend({}, users[key].identity));
		});

		search.start();
	};

	att.remote_req = function (command, data) {
		var _d = $.Deferred();

		log.info({ command : command, data : data }, 'command received from remote end');

		switch (command) {
			case 'kick':
				/*
				 * kick out attendee info received from session cluster
				 * trigger signout click
				 */
				$('[data-remodal-id="signout-confirm"] button.remodal-confirm').trigger("click");
				return _d.resolve('done');
			default:
				log.error('Unknown command received');
				return _d.reject('unrecognized command : ' + command);
		}

		return _d.promise();
	};

	/*
	 *	private methods
	 */

	function toggle_visibility( evt){
		//$('#widget-attendees').toggle();

		var att_nav = $('#widget-nav li#nav-attendees');

		if (att_nav.hasClass('enabled')) {
			att_nav.removeClass('enabled');
		}
		else {
			att_nav.addClass('enabled');
		}
		widget.toggle_visible();
		/* what else? */	
	}

	function add_scrollbar () {
		$('#widget-attendees').perfectScrollbar();
		$('#widget-attendees').resize(function (ev) {
			$('#widget-attendees').perfectScrollbar('update');
		});
	}

	return att;
});
