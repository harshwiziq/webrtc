define(function(require) {
	var $            = require('jquery');
	var events       = require('events');
	var log          = require('log')('av-container-pool', 'info');
	var av_container = require('./container');

	var pool = {};
	var anchor;
	var container_tpl;
	var used = {};
	var emitter = events.emitter('av:containers', 'av:container-pool.js');

	pool.init = function (f_handle, display_spec, custom, perms) {
		container_tpl = f_handle.template('container');
		anchor = display_spec.anchor;
		/*probe (anchor);*/
		return true;
	};

	pool.alloc_container = function (type, mode, meta_info) {

		var container =  create_container (type);

		container.set_type (type);
		container.set_mode (mode);
		container.set_meta (meta_info);
		container.change_state ('connected');
		
		var id = container.div().id;
		used [id] = container;

		/*
		 * Emit an event informing anyone who needs to know that a container has been allocated */
		emitter.emit ('allocated', {
			type          : type,
			mode          : mode,
			visible_conts : pool.get_num_visible_containers (), /* num of visible containers */
			meta          : meta_info
		});

		log.info ('allocated container #' + id + ', type (' + type + '), mode (' + mode + ')');

		return container;
	};

	pool.giveup_container = function (container) {
		var id = container.id();
		var type = container.get_type();

		if (!used[id]) {
			log.error ('attempt to giveup non-used container (id = #' + id + ')');
			return;
		}

		delete used[id];
		/* 
		 * commenting following line since it is useless.
		 * not using this 'count' anywhere other than creating new containers.
		 * WBRTC-440 issue fixed by this.
		 * may be, will remove this counter finally 
		 */
		/* count--; */

		/*
		 * Emit an event informing anyone who needs to know that a container has been de-allocated */
		emitter.emit ('de-allocated', {
			type          : container.type,
			mode          : container.mode,
			visible_conts : pool.get_num_visible_containers (), /* num of visible containers */
		});

		container.giveup ();
	};

	pool.get_containers_by_type = function (type) {
		var arr = [];

		for (var c in used) {
			var container = used[c];

			if (container.get_type () == type)
				arr.push(container);
		}

		return arr;
	};

	pool.get_containers_by_mode = function (mode) {
		var arr = [];

		for (var c in used) {
			var container = used[c];

			if (container.get_mode () == mode)
				arr.push(container);
		}

		return arr;
	};

	pool.free_count = function (type) {
		return 0;
	};

	pool.get_container_by_id = function (pool, id) {
		if (pool != 'used' && 'pool' !== 'available')
			throw 'pool.get_container_by_id: invalid argument (pool = ' + pool + ')';

		if (pool === 'used')
			return used[id];
	};

	pool.get_used_list = function () {
		var arr = [];
		for (var c in used)
			arr.push(used[c]);
		return arr;
	};

	/* 
	 * return number of containers of a specific type
	 * in the used list 
	 */  
	pool.get_containers_by_type = function (type) {
		var arr = [];
		
		for (var c in used) {
			var container = used[c];
			
			if (container.get_type () == type)
				arr.push(container);
		}
		
		return arr;
	};

	/*
	 * get all containers which are visible
	 */
	pool.get_num_visible_containers = function () {
		return ( pool.get_used_list().length -
		 pool.get_containers_by_type('audio-only').length -
		 pool.get_containers_by_type('null').length
		);
	};

	function probe (anchor) {

		$.each( $('#av-containers .av-container'), function (index, div) {
			var id = $(div).attr('id');
			var __pool = free_video;

			/* We want to allocate and reserve exactly one container for screenshare */
			if (!Object.keys(free_screenshare).length)
				__pool = free_screenshare;

			__pool[id] = new av_container(div);

			log.info ('probe_layout: adding container "#' + id + '" to av pool');
		});
	}
	
	/* counter to assign unique ids to each container */
	var count = 0;
	
	/* create container dynamically */
	function create_container (type) {
		
		if (!container_tpl)
			return 'container template not found';
	
		count++;	
		var id = 'av-container-' + count;
		var $cont = container_tpl ({cont_id : id}); 	
		$('#av-containers').append( $cont );
		
		var _div = $ ('#'+id)[0];

		return new av_container (_div);
	}

	return pool;
});
