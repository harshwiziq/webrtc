define(function(require) {
	var my_name    = 'whiteboard-v1';

	var $          = require('jquery') ,
	    log        = require('log')(my_name, 'info') ,
	    events     = require('events') ,
	    framework  = require('framework') ,
	    _paper     = require('./paper-core') ,
	    Workspace  = require('./workspace') ;

	var wb = {} ,
	    f_handle = framework.handle (my_name) ,
	    _allowed = f_handle.perms.has_perm;
	    templates = [];

	wb.init = function (display_spec, custom, perms) {
		var _d = $.Deferred();
		var _compile = function(name) {
			templates.push( f_handle.template(name) );
		};

		/*
		 * Collect the templates */
		display_spec.templates.forEach (_compile);

		if (templates.length < 1)
			return _d.reject('wrong info from backend').promise();

		/*
		 * show your interest in tabs */
		f_handle.tabs.register ({
			name : my_name,
			handle : wb,
			options : {
				add_to_dropdown : true,
				display_name: 'Whiteboard'
			}
		});

		events.bind ('framework:perms', handle_perm_evt, my_name);
		_d.resolve();
		return _d.promise();
	};

	var d_started = $.Deferred ();
	wb.start = function (sess_info) {
		var boards = sess_info.boards;
		var startup = true;

		Object.keys(boards).forEach (function(uuid) {
			/*
			 * lay the canvases
			 * and load the snapshot
			 * and recreate the diff paths */
			var board = boards[ uuid ];

			handle_remote_new_content (board.meta, startup);

			var workspace = map[ uuid ];

			if (board.snap)
				workspace.load_snapshot (board.snap);
			if (board.center)
				workspace.scope.view.center = new workspace.scope.Point(board.center);
		});
		d_started.resolve();
	};

	wb.info = function (from, info_id, info, _instance) {

		switch (info_id) {
			case 'new-whiteboard' :
				log.info (info, 'new-whiteboard');
				return handle_remote_new_content (info);

			case 'wb-event' :
				return handle_remote_event (info);	

			case 'wb-set-enable':
				return handle_remote_set_enable (info);

			case 'whiteboard-title':
				return set_tab_title (info.uuid, info.title);

			default :
				log.error ('received unknown info_id (' + info_id + '). Ignoring.');
				return;
		}
	};


	var map = {};
	/*
	 * methods required for tabs */
	wb.create = function (options) {

		if(!_allowed('write', 'control')) {
			/*
			 * Is the user really allowed 
			 * to create whiteboards
			 * Or he just manipulated DOM */
			return;
		}

		var handle = f_handle.tabs.create (options);
		var uuid = handle.uuid;

		var $anchor = $(handle.anchor);
		$anchor.append (templates[0]({
			uuid: uuid
		}));

		var info = {
			uuid: uuid,
			owner: f_handle.identity.vc_id,
			vc_id: f_handle.identity.vc_id
		};

		info.log = log;
		info.upstream = {
			send_info: send_info
		};
		map[ uuid ] = new Workspace (info, $anchor);
		delete info.upstream;
		delete info.log;

		f_handle.send_info ('*', 'new-whiteboard', info, 0);

		uuid_active = uuid;
		/*
		 * If you have permissions
		 * for tab change or tab create
		 * then your tabs will be synced
		 * otherwise this shouldn't have any effect */
		f_handle.tabs.sync_remote ({
			uuid: uuid,
		});

		set_tab_title (uuid);

		if (!_allowed ('write','control')){
			map[ uuid ].set_enabled (false);
		}

		f_handle.send_command (null, 'get-title', uuid, 0)
		.then( function (title) {
			set_tab_title (uuid, title);

			/*
			 * This should be a part of set_tab_title
			 * clean it! */
			var data = {
				uuid: uuid,
				title: title
			};
			f_handle.send_info ('*', 'whiteboard-title', data, 0);
		});
	};

	wb.destroy = function ($tab_anchor, uuid, is_command) {
		if (map[ uuid ])
			map[ uuid ].scope.remove ();

		delete map[ uuid ];

		if (!is_command)
			f_handle.send_info('*','gone-whiteboard', {uuid: uuid}, 0);
	};

	var uuid_active;
	var center_set = {};
	wb.now_showing = function (res) {
		/*
		 * Handled the case where session_wide_active tab 
		 * is one of the whiteboards (on startup)
		 * with the help of a deferred */
		d_started.then (function (){
			var wspace = map[ res.handle.uuid ];
			wspace.activate ();
			uuid_active = res.handle.uuid;

			/* * *
			 *
			 * On startup and on resize =>
			 *     The currently visible tab scales itself to current
			 *     window size but for other tabs we need to manually
			 *     fire the window resize event when they come to view
			 *
			 * * */
			if(!center_set[ uuid_active ]) {
				/*
				 * On startup we receive the center of view
				 * which we need to set after window resize gets fired */

				var point = new wspace.scope.Point(wspace.scope.view.center);
				center_set[ uuid_active ] = true;

				setTimeout(function (pt) {
					wspace.scope.view.center = pt;
					wspace.fit_to_dimensions();
				}.bind(wspace,point), 100);
			}
			fire_window_resize_event ();
		});
	};

	wb.now_hidden = function (res) {
	
	};

	/*
	 * private methods */

	function fire_window_resize_event () {
		var evt = window.document.createEvent ('UIEvents');
		evt.initUIEvent('resize', true, false, window, 0);
		window.dispatchEvent(evt);
	}
	function handle_remote_new_content (info, startup) {
		var options = {
			uuid: info.uuid,
			owner: info.owner,
			startup: startup || false
		};

		var tab = f_handle.tabs.get_by_uuid (info.uuid) || {};
		var handle = tab.handle;
		if (!handle)
			handle = f_handle.tabs.create (options);

		var uuid = handle.uuid;
		var $anchor = $(handle.anchor);
		$anchor.append (templates[0]({
			uuid: uuid
		}));

		options.vc_id = f_handle.identity.vc_id;
		options.log = log;
		options.upstream = {};
		options.upstream.send_info = send_info;
		map[ uuid ] = new Workspace (options, $anchor);

		f_handle.tabs.sync_remote ({
			uuid: uuid,
			quiet: true
		});

		set_tab_title (uuid, info.title);

		if (!_allowed ('write','control')){
			map[ uuid ].set_enabled (false);
		}
	}

	function set_tab_title (uuid, name) {
		name = name || 'board';

		f_handle.tabs.set_title ({
			uuid: uuid,
			title: name
		});
	}

	function handle_remote_event (info) {
		map[ info.uuid ].handle_remote_event(info);	
	}

	function handle_remote_set_enable (info) {
		map[ info.uuid ].set_enabled (info.val);
	}

	function handle_perm_evt (evt, data) {
		if (evt !== 'override')
			return;

		if (data.key === 'write' && data.subkey === 'control') {

			d_started.then (function () {
				/*
				 * enable/disable all the whiteboards */
				Object.keys(map).forEach (function (uuid) {
					handle_remote_set_enable ({
						uuid: uuid,
						val : data.val
					});
				});
				/*
				 * add to/remove from dropdown menu */
			});
		}
	}

	function send_info (evt_name, data) {
		f_handle.send_info ('*', evt_name, data, 0);	
	}

	return wb;
});
