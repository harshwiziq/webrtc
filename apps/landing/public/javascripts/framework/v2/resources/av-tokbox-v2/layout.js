define(function(require) {
	var $            = require('jquery');
	var events       = require('events');
	var log          = require('log')('av-layout', 'info');
	var av_container = require('./container');
	var cpool        = require('./container-pool');
	var menu         = require('./menu');

	var layout = {};
	var sess_info_cached;
	var anchor;
	var _allowed;
	var pool_free = {}, pool_used = {};
	var current_layout = 'av-default';

	layout.init = function (f_handle, display_spec, custom, perms) {

		var templ_name = 'av-tokbox';
		var template = f_handle.template(templ_name);

		anchor = display_spec.anchor;
		_allowed = f_handle.perms.has_perm;

		if (!template)
			return 'av-layout: template "' + templ_name + '" not found';

		$(anchor).append( template() );
		set_handlers ();

		return null;
	};

	layout.get_container = function (type, meta_info) {
		/*
		 * Type should be : 'video-primary', 'video-secondary', 'screenshare-local', 'screenshare-remote',
		 * 'audio-only'
		 */ 
		var mode = display_mode (current_layout, type);

		if (type === 'screenshare-local') {
			primary = cpool.get_containers_by_mode ('primary');
			if (primary.length === 0)
				mode = 'primary';
		}

		var cont = cpool.alloc_container (type, mode, meta_info);

		/* We know that the # of containers for screenshare are limited. So if we just
		 * allocated one for screenshare then see if we've already exhausted all containers
		 * reserved for screenshare. If yes, disable the menu-item for screenshare.
		 * - skip if screenshare is local, clicking again will stop the screenshare */

		if (type === 'screenshare-remote') {
			handle_internal_layout_change (cont);

			if (!cpool.free_count('screenshare')) {
				menu.screenshare.disable();
				log.info('cpool not free');
			}
		}
		return cont;
	};

	layout.giveup_container = function (container, reason) {
		
		var type = container.get_type ();
		cpool.giveup_container (container);
		layout.adjust ();

		/* See comment in 'get_container' above */
		var has_wc = _allowed ('write', 'control');
		if (type === 'screenshare-remote' && has_wc)
			menu.screenshare.enable();

		return;
	};

	layout.show_error = function (container, error) {
		return container.show_error (error);
	};

	layout.stream_destroyed = function (container, reason) {
		container.stream_destroyed (reason);
	};

	layout.reveal_video = function (container) {
		container.reveal_video ();
	};

	/* 
	 * get container type to be allocated initially 
	 * on the basis of startup config for A/V 
	 */ 
	layout.get_initial_container_type = function (on_startup) {
		
		if (on_startup.video)
			return layout.get_container_type_conditionally (null, true);
				
		if (on_startup.audio)
			return 'audio-only';
		
		return null;
	};

	/* 
	 * check if primary video slot is empty 
	 */ 
	layout.is_primary_vid_free = function () {
		
		if (cpool.get_containers_by_mode ('primary').length === 0) {
			log.info ('no primary video present');
			return true;			
		}
	
		return false;
	};

	layout.get_container_type_conditionally = function (stream, local, is_primary) {
		
		/* currently present visible containers */
		var curr_containers = cpool.get_num_visible_containers ();
		var type;
		
		switch (curr_containers) {
			
			case 0 :
				/* no visible containers present as of now */
				type = 'video-primary';
				break;

			case 1 :
				/* one container present as of now. */
				
				if (local) {
					/* upcoming stream is local --> present stream is remote */
					type = 'video-secondary';
					break;
				}

				/* upcoming stream is remote
				 * 1. make the primary video as secondary, if needed
				 * 2. set container type of upcoming stream as video-primary
				 */
				set_as_secondary ('primary');
				type = 'video-primary';
				break;

			default :
				/* visible containers being two or more.
				 * If some stream property has been set to make
				 * this stream as the primary one OR local stream
				 * is primary (if only local screenshare nd local
				 * video present), make it as primary.
				 * Else, set it as secondary */
				var primary_stream_type = null;
				var primary = cpool.get_containers_by_type ('video-primary');

				if (primary.length) {
					primary_stream_type = primary[0].get_attribute ('stream_type') || null; 
				}

				if (primary_stream_type == 'local') {
					log.info ('Primary container contains local stream. Replace it with incoming stream');
					set_as_secondary (primary[0].get_mode());
					type = 'video-primary';
					break;
				}

				/* if incoming stream is to be set as primary and is not local */
				if (stream && is_primary && !local) {
					log.info ('Set incoming stream as primary. Replace primary with incoming stream');
					set_as_secondary (primary[0].get_mode());
					type = 'video-primary';
					break;
				}

				/* ..else */
				log.info ('Set incoming stream as a secondary one');
				type = 'video-secondary';
				break;

		}

		return type;
	};

	/* 
	 * adjust A/V layout as per need
	 */
	layout.adjust = function () {

		/* currently present visible containers */
		var curr_containers = cpool.get_num_visible_containers ();
		var type;
		var cont;
		var sec_containers;
		
		switch (curr_containers) {
			
			case 0 :
				
				/* no visible containers present as of now */
				break;

			case 1 :
				
				/* 
				 * one container present as of now.
				 * if already present video stream is secondary, make it primary
				 * else let it be as it is.
				 */
				sec_containers = cpool.get_containers_by_mode ('secondary');
				if (sec_containers.length === 0) {
					/* present video is primary, do nothing */
					break;
				}

				/* 
				 * present video is secondary, make it primary
				 */
				cont = sec_containers [0];
				cont.set_type('video-primary');
				break;

			default :
				
				/* 
				 * two or more visible containers left
				 * if primary stream leaves, set remote secondary as primary
				 * else let it be the way as it is.
				 * If we had screenshare working, it had changed the mode of
				 * primary video, take care of that as well.
				 */
				if (cpool.get_containers_by_mode('primary').length > 0 ||
				    cpool.get_containers_by_mode('pip').length > 0) {
					log.info ('No layout management needed since there is a primary container');
					break;
				}
				
				/* 
				 * from stream related info in container, check which secondary
				 * container must be made primary 
				 */
				sec_containers = cpool.get_containers_by_mode ('secondary');
				set_secondary_as_primary (sec_containers);
				break;

		}

		set_layout_defaults (current_layout, null);
		return;
	};

	/* 
	 * set type and mode of container 
	 */ 
	layout.set_container_properties = function (cont, type) {
		
		cont.set_type (type);
		cont.set_mode (display_mode (current_layout, type));
		return;
	};

	layout.get_num_visible_containers = function () {
		 return cpool.get_num_visible_containers ();
	};

	/*
	 * set primary container as secondary
	 */  
	function set_as_secondary (mode) {
		
		var cont = cpool.get_containers_by_mode (mode);

		if (!cont.length) {
			log.info ('No video of mode : ' + mode + 'as of now. Looking for secondary containers');
			cont = cpool.get_containers_by_mode ('secondary');
		}

		layout.set_container_properties (cont[0], 'video-secondary');
		return;
	}

	/*
	 * set first secondary container's type as primary 
	 */ 

	function set_secondary_as_primary (sec_containers) {
		
		var cont;
		var done = false;
		
		for (var i = 0; i < sec_containers.length; i++) {
			cont = sec_containers [i];
			/* continue if local stream */
			if (cont.attrs.stream_type === 'local')
				continue;
			
			/* assign remote stream's container as primary */
			cont.set_type ('video-primary');
			log.info ('secondary container set as primary. '+ 'cont.conn_id' + cont.conn_id );
			done = true;
			break;
		}
		 
		/* if secondary container set as primary, return */
		if (done)
			return;

		/* 
		 * ...else, take the first secondary container, whether local or remote,
		 * and set it as primary.
		 * TODO : May be, think of a better logic.
		 * This check takes care of the fact when there is only local video and
		 * local screenshare, then local screenshare must not come into primary 
		 * container
		 */ 
		sec_containers[0].set_type ('video-primary');
		return;
	}
	
	/*
	 * _______Container Pool Management___________
	 *
	 */
	function probe_layout (anchor, pool) {

		$.each( $('#av-containers .av-container'), function (index, div) {
			var id = $(div).attr('id');
			pool[id] = new av_container(div);
			log.info ('probe_layout: adding container "#' + id + '" to av pool');
		});
	}

	function handle_no_video (ev, data) {
		if (!layout.get_num_visible_containers()) {
			$('.av-initial .av-background').css('display', 'block');
			return;
		}

		/*
		 * Else there is at least one visible container */
		$('.av-initial .av-background').css('display', 'none');
	}

	function set_handlers () {

		events.bind('framework:layout', set_layout_defaults, 'av-layout');
		events.bind('av:connection', flasher, 'av-layout');
		events.bind('av:containers', handle_no_video, 'av-layout');

		$('#av-containers').on('click','.av-container', function (ev) {
			var clicked_div = ev.currentTarget;

			var div_id = $(clicked_div).attr('id');
			var clicked_container = cpool.get_container_by_id ('used', div_id);

			if (!clicked_container) {
				log.error ('clicked_container is null. Ignoring click.');
				return;
			}

			handle_internal_layout_change (clicked_container);

		});
	}

	function handle_internal_layout_change (clicked_container) {
		switch (current_layout) {

			case 'av-default':
				handle_click_default (clicked_container);
				break;

			case 'av-fullscreen':
				handle_click_fullscreen (clicked_container);
				break;

			case 'av-tiled':
				/* Do nothing for now */
				break;

			default:
				/* Should not come here */
				log.error ('unknown layout "' + current_layout + '". Handling as default.');
				handle_click_default (clicked_container);
				break;

		}
	}

	function handle_click_default (clicked) {
		var primary, pip;

		/* 
		 * If screnshare is cliked then make it fullscreen, and 
		 * make the primary pip. Lose all the secondaries.
		 */
		if (clicked.in_mode('screenshare')) {
			primary = cpool.get_containers_by_mode ('primary');
			clicked.set_mode ('full');
			if (primary.length)
				primary[0].set_mode ('pip');
			return;
		}

		/* 
		 * If the clicked video is secondary, then exchange with primary
		 */
		if (clicked.in_mode('secondary')) {
			primary = cpool.get_containers_by_mode ('primary')[0];
			primary.set_mode('secondary');
			clicked.set_mode('primary');
			return;
		}

		/* 
		 * If the clicked video is full, then this happened due to an earlier
		 * click on the screenshare. Restore the original layout.
		 */
		if (clicked.in_mode('full')) {
			pip = cpool.get_containers_by_mode ('pip')[0];
			pip.set_mode('primary');
			clicked.set_mode('screenshare');
			return;
		}
	}

	function handle_click_fullscreen (clicked) {
		var primary, pip;

		/* 
		 * In fullscreen layout, we only respond to the clicks
		 * on a secondary by swapping the primary with it.
		 */
		if (clicked.in_mode('secondary')) {
			primary = cpool.get_containers_by_mode ('primary')[0];
			clicked.set_mode ('primary');
			primary.set_mode ('secondary');
			return;
		}

	}

	function display_mode (_layout, type) {
		var mode;

		/* 
		 * Return the display mode depending upon the layout
		 */

		switch (_layout) {
			case 'av-fullscreen':
				mode = {
					'video-primary'      : 'primary',
					'video-secondary'    : 'secondary',
					'screenshare-local'  : 'secondary',
					'screenshare-remote' : 'secondary',
					'audio-only'         : 'shunya', 
					'null'               : 'shunya' 
				};
				break;

			case 'av-tiled':
				mode = {
					'video-primary'      : 'secondary',
					'video-secondary'    : 'secondary',
					'screenshare-local'  : 'secondary',
					'screenshare-remote' : 'secondary',
					'audio-only'         : 'shunya', 
					'null'               : 'shunya' 
				};
				break;

			case 'av-default':
				mode = {
					'video-primary'      : 'primary',
					'video-secondary'    : 'secondary',
					'screenshare-local'  : 'secondary',
					'screenshare-remote' : 'screenshare',
					'audio-only'         : 'shunya',
					'null'               : 'shunya' 
				};
				break;

			default:
				mode = {
					'video-primary'      : 'primary',
					'video-secondary'    : 'secondary',
					'screenshare-local'  : 'secondary',
					'screenshare-remote' : 'screenshare',
					'audio-only'         : 'shunya',
					'null'               : 'shunya' 
				};
				break;
		}

		return mode[type];
	}

	var incomning_count = 0;
	function flasher (ev, data) {

		/* the following code is commented since
		 * it has to be written in some other
		 * way. TODO 
		 var flasher_el = $('#av-indicator');

		if (ev === 'incoming-connection')
			incomning_count++;
		if (ev === 'incoming-media')
			incomning_count--;

		if (incomning_count < 0)
			incomning_count = 0;

		if (incomning_count) {
			$(flasher_el).css('display', 'block');
		}
		else {
			$(flasher_el).css('display', 'none');
		}
		*/
	}

	function set_layout_defaults (ev, data) {
		var new_layout = ev;

		switch (new_layout) {

			case 'av-default' :
				__set_layout_av_default ();
				break;

			default :
				/*
				 * Others */
				__set_layout (new_layout);
				break;
		}

		current_layout = new_layout;
		return;
	}

	function __set_layout (new_layout) {

		cpool.get_used_list ().forEach(function (container, index, arr) {
			var curr_mode = container.get_mode();
			var type      = container.get_type();
			var new_mode  = display_mode (new_layout, type);

			if (new_mode != curr_mode)
				container.set_mode (new_mode);
		});
	}

	function __set_layout_av_default () {
		/*
		 * If we have a remote screenshare, then the primary video
		 * must become PIP and the screenshare should be fullscreen.
		 * Else the primary video remains primary */

		var screenshare_remote = cpool.get_containers_by_type ('screenshare-remote');
		var primary_videos     = cpool.get_containers_by_type ('video-primary');

		__set_layout ('av-default');

		if (screenshare_remote.length) {
			screenshare_remote[0].set_mode ('full');
			if (primary_videos.length)
				primary_videos[0].set_mode ('pip');
		}
	}

	return layout;

});
