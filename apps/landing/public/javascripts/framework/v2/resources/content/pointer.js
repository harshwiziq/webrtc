define (function(require) {
	
	var $		   = require('jquery');
	var log        = require('log')('content-pointer', 'info');

	var pointer = {};
	var f_handle_cached;
	var circlediv;
	var map_viewers = {};
	
	/** 
	* intialize the pointer for content
	*/
	pointer.init = function (f_handle) {
		f_handle_cached = f_handle;
	};

	/**
	* Method get called when user shared his/her content
	* 1. Register mouse evnets
	* 2. change mouse cursor 
	* 3. append pointer div
	*/ 
	pointer.register  = function (viewer, uuid, iscommand) {
		
		if (!viewer) {
		   log.error ('null viewer ! aborting register.');
		   return;
		}

		var tab = f_handle_cached.tabs.get_by_uuid (uuid) || {};
		var handle = tab.handle;
		if (!handle) {
		   log.error ('pointer cant be added on non-existent tab : uuid = ' + uuid);
		   return;
		}

		/*
		 * Store the viewer instance in a map */
		var $anchor = $(handle.anchor).find('.content-player-outer');
		map_viewers [uuid] = {
			viewer  : viewer,
			$anchor : $anchor
		};

		if (!iscommand) {            	
			/** Initialize mouse event listeners*/
			init_handlers ($anchor);
		} else {
			/** append div */
			$anchor.append('<div class="remote-cursor"></div>');
			circlediv = $anchor.find('.remote-cursor');
		}
	}; 

	/*
	 * Get current tab pointer 
	*/
	pointer.nowshowing  = function (uuid) {

		var tab = f_handle_cached.tabs.get_by_uuid (uuid) || {};
		var handle = tab.handle;
		if (!handle) {
		   log.error ('pointer cant be added on non-existent tab : uuid = ' + uuid);
		}

		var map_entry = map_viewers [uuid];
		if (!map_entry) {
			log.error ('no mapping for uuid = ' + uuid + '. aborting.');
			return;
		}

		var $anchor = map_entry.$anchor;

		circlediv = $anchor.find('.remote-cursor');	
	};	

	/**
	* Method get called when Content destroyed 
	* 1. Remove mouse listeners
	* 2. set mouse default cursor
	* 3. remove pointer div 
	*/
	pointer.destroy = function ($tab_anchor, uuid, is_command) {
		
		// to do : remove listeners , remove div		
	};

	/**
	 * Calculate the x, y corresonding to remote geomtry
	 */
	function calc_xy (viewer, remote_geo, x, y) {
		/*
		 * Get local geometry */
		var local_geo = viewer.getGeometry ();

		/*
		 * Calculate proportion */
		var page_scale = local_geo.page_width/remote_geo.page_width;
		var remote_margin = (remote_geo.viewport_width - remote_geo.page_width)/2;
		var local_margin = (local_geo.viewport_width - local_geo.page_width)/2;
		var margin_scale = local_margin/remote_margin;

		/* Does the point lie in the left margin ? */
		if (x < remote_margin) {
			return {
				x : x * margin_scale,
				y : y * page_scale
			};
		}
		/* Does the point lie on the actual page ? */
		if (x >= remote_margin && x <= remote_geo.viewport_width - remote_margin) {
			return {
				x : local_margin + ((x - remote_margin) * page_scale),
				y : y * page_scale
			};
		}
		/* Does the point lie in the right margin ? */
		if (x > remote_margin + remote_geo.page_width) {
			return {
				x : local_margin + local_geo.page_width + ((x - remote_margin - remote_geo.page_width) * margin_scale),
				y : y * page_scale
			};
		}
	}

	/**
	* Method that recieves the data from server 
	* and plots the pointer on receiver side 
	*/
	pointer.info = function (info) {
		
		if (!f_handle_cached.tabs.is_active (info.uuid)) {
			log.error ('pointer event rx for inactive tab (uuid="' + info.uuid + '"). ignoring.');
			return;
		}

		var tab = f_handle_cached.tabs.get_by_uuid (info.uuid);
		var handle = tab.handle;
		if (!handle) { 
			log.error ('pointer moved for non-existent tab : uuid = ' + info.uuid);
		 	return;	
		}

		var map_entry = map_viewers[ info.uuid ];
		if (!map_entry) {
			log.error ('something wrong happened: no map entry instance for uuid = ' + info.uuid + '. aborting.');
			return;
		}

		var ev_type      = info.ev_type;
		var $anchor      = map_entry.$anchor;
		var viewer       = map_entry.viewer;
		var local_xy     = calc_xy (viewer, info.geometry, info.x, info.y);
		/*
		var my_width     = $anchor.width();
		var remote_width = info.width;
		var x            = (info.x * my_width)/remote_width;
		var y            = (info.y * my_width)/remote_width;
	   */

		/* 
		 * On mousemove use event.clientX and event.clientY to set
		 * the location of the div to the location of the cursor */

		switch (ev_type) {

		    case 'pointer-moved' :
				return handle_remote_pointer_moved ( local_xy.x, local_xy.y );
			case 'pointer-clicked' :
				return handle_remote_pointer_clicked ( local_xy.x, local_xy.y, $anchor.width, $anchor.height );
			case 'pointer-leave':
				return handle_remote_pointer_leave ();
			case 'pointer-enter':
				return handle_remote_pointer_enter ();
		}
               
 	};	

	/**
	* Method send data(moved, clicked, leave) at receiver end
	*/
	function send_data (ev_type, ev_data) {
		
		/*
		 * Send the mouse data to the framework, to sync with other clients */
		f_handle_cached.send_info('*', ev_type, ev_data, 0);
	}


	/**
	* Method to update the state of pointer
	* as pet the event type (move/click/leave)
	*/
	var timeout;
	function stateupdatehandler (data) {

		if (!circlediv) {
			log.error ('stray event "stateupdatehandler" called - no circlediv assigned yet');
			return;
		}

		switch (data.state) {

			case 'show' :
				circlediv.addClass('pointer-show'); 
				break;

			case 'hide' :
				circlediv.removeClass('pointer-show ripple');
				break;

			case 'click':
				if (timeout) {
					clearTimeout (timeout);
					timeout = null;
				}

				circlediv.removeClass('pointer-show ripple').addClass('ripple');
				timeout = setTimeout (function () {
					circlediv.removeClass('ripple');
				}, 700);
				break;
		}
	}

	/** 
	 * Method to calculate the location 
	 * to get and plot the pointer
	 */
	 function calculate_coordinates () {
	 }

	 function get_x (ev) {
		 return ev.clientX - $(ev.currentTarget).offset().left;
	 }
	
	 function get_y (ev) {
		 return ev.clientY - $(ev.currentTarget).offset().top;
	 }
	
	function handle_mousemove_on_content (ev) {
	    var $content_outer = $(ev.currentTarget);
		var uuid           = $content_outer.attr('data-uuid');
		var viewer         = map_viewers [uuid].viewer;

		if (!viewer) {
			log.error ('viewer null: no mapping for uuid = ' + uuid + '. aborting.');
			return;
		}

		var geometry = viewer.getGeometry ();

		if (!geometry) {
			log.error ('viewer.getGeometry() returned null ! aborting');
			return;
		}

		/**
		 * Calulate current position of mouse 
		 **/
		var msg_data = {
					  x : get_x(ev),
					  y : get_y(ev),
		       geometry : geometry,
				   uuid : uuid,
				ev_type : "pointer-moved"
		};

		send_data ('pointer-event', msg_data);
	}

	/** Orgnizer END */
	function handle_mouseclick_on_content (ev) {
		var $content_outer = $(ev.currentTarget);
		var uuid           = $content_outer.attr('data-uuid');
		var viewer         = map_viewers [uuid].viewer;

		if (!viewer) {
			log.error ('viewer null: no mapping for uuid = ' + uuid + '. aborting.');
			return;
		}

		var geometry = viewer.getGeometry ();

		if (!geometry) {
			log.error ('viewer.getGeometry() returned null ! aborting');
			return;
		}

		 
		 var msg_data = {
			        x : get_x(ev),
			        y : get_y(ev),
				 uuid : uuid,
		     geometry : geometry,
		 	  ev_type : "pointer-clicked"		 
		 };

		 send_data ( 'pointer-event', msg_data);
	}
	
	/** Orgnizer END */
	function handle_mouseleave_from_content (ev) {
		 var $content_outer = $(ev.currentTarget);
		 var uuid           = $content_outer.attr('data-uuid');
		var viewer          = map_viewers [uuid].viewer;

		if (!viewer) {
			log.error ('viewer null: no mapping for uuid = ' + uuid + '. aborting.');
			return;
		}

		var geometry = viewer.getGeometry ();

		if (!geometry) {
			log.error ('viewer.getGeometry() returned null ! aborting');
			return;
		}

		
	 	 var msg_data = {
			        x : get_x(ev),
			        y : get_y(ev),
		         uuid : uuid,
		     geometry : geometry,
		      ev_type : "pointer-leave"
		 }; 
		
		 send_data ( 'pointer-event' , msg_data);
	}

	/** Orgnizer END */
	function handle_mouseenter_on_content (ev) {
		 var $content_outer = $(ev.currentTarget);
		 var uuid           = $content_outer.attr('data-uuid');
		var viewer          = map_viewers [uuid].viewer;

		if (!viewer) {
			log.error ('handle_mouseenter_on_content: viewer null: no mapping for uuid = ' + uuid + '. aborting.');
			return;
		}

		var geometry = viewer.getGeometry ();

		if (!geometry) {
			log.error ('viewer.getGeometry() returned null ! aborting');
			return;
		}

		 
		 var msg_data = {
			        x : get_x(ev),
			        y : get_y(ev),
		         uuid : uuid,
		     geometry : geometry,
		      ev_type : "pointer-enter"
		 };
		
		send_data( 'pointer-event', msg_data);
	}	

	/** Receiver END */
	function handle_remote_pointer_moved ( x, y ) {
	
		if (!circlediv) {
			log.error ('stray event "handle_remote_pointer_moved" called - no circlediv assigned yet');
			return;
		}

		if ( typeof x !== 'undefined' ) {

			circlediv.css('left', x);
			circlediv.css('top', y);

			if (!circlediv.hasClass('pointer-show')){
				
				var data = {
				   state : "show"
				};
				stateupdatehandler(data);
			}
			
		}
	}	

	/** Receiver END */
	function handle_remote_pointer_clicked ( x, y, w, h ) {
		
		if ( typeof x !== 'undefined' ) {
			 var data = {
				 state : 'click',
					x : x,
					y : y,
					w : w,
				   	h : h	
			 };
			 stateupdatehandler(data);
		}	
	}
	
	/** Receiver END */
	function handle_remote_pointer_leave() {

		var data = {
		   state : "hide"
		};
		stateupdatehandler(data);	
	}

	/** Receiver END */
	function handle_remote_pointer_enter() {
 	
		var data = {
           state : "show"
         };	
		 stateupdatehandler (data);
	}


	/** 
	 * Register mouse evnets on Curr Div
	 **/
	function init_handlers (curr) {
		
		/*** Handler for mouse move on content **/
		 curr.on('mousemove', function (ev) {
			 handle_mousemove_on_content(ev);
		 });

		 /** Handler for mouse click on content **/
		 curr.on('click', function (ev) {
		     handle_mouseclick_on_content(ev);
		 });																 
	 
		 /** Handler for mouse click on content **/
		 curr.on('mouseleave', function (ev) {
		     handle_mouseleave_from_content(ev);
		 });

		 /** Handler for mouse enter on content **/
		 curr.on('mouseenter', function (ev) {
		 	 handle_mouseenter_on_content (ev);
		 });
	}
	
	/** 
	 * Remove mouse evnets on Curr Div
	 **/
	function remove_eventhandlers(curr) {
	
		 curr.off('mousemove', function (ev) {
			 handle_mousemove_on_content(ev);
		 });

		 curr.off('click', function (ev) {
		     handle_mouseclick_on_content(ev);
		 });	
	
		 curr.off('mouseleave', function (ev) {
		     handle_mouseleave_from_content(ev);
		 });
		
		 curr.off('mouseenter', function (ev) {
		 	handle_mouseenter_on_content (ev);
		 });
	}

	/**
	 * return the object so that class that  
	 * require pointer can use class methods
	 **/
	 return pointer;
});
