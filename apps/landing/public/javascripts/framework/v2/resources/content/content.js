define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var log         = require('log')('content', 'info');
	var events      = require('events');
	var framework   = require('framework');
	var pointer		= require('./pointer');
	var player      = require('./player');
	var library     = require('./library');
	var upload      = require('./upload');

	var content = {};
	var f_handle = framework.handle ('content');
	var _allowed = f_handle.perms.has_perm;

	content.init = function (display_spec, custom, perms, mod_name) {
		var _d = $.Deferred();
		/*
		 * Since this resource is dependent on tab-controller
		 * resource will register itself to tab controller
		 */
		var _module = register_info(mod_name);
		log.info({ register_info : _module }, 'content register info');
		f_handle.tabs.register(_module);

		if (!library.init (display_spec, custom, perms, f_handle)) {
			_d.reject ('content library init failed');
			return _d.promise ();
		}

		if (!upload.init (display_spec, custom, perms, f_handle)) {
			_d.reject ('content upload init failed');
			return _d.promise ();
		}

		if (!player.init (display_spec, custom, perms, f_handle)) {
			_d.reject ('content player init failed');
			return _d.promise ();
		}

		/*initialize pointer*/
		pointer.init (f_handle);

		events.bind ('framework:perms', handle_perm_evt, 'content');

		_d.resolve();
		return _d.promise();
	};

	content.info = function (from, info_id, info, _instance) {

		switch (info_id) {
			case 'new-content' :
				var options = {
					uuid              : info.uuid,
					owner             : info.owner,
					is_remote_command : true,
				};	
				return handle_remote_new_content (options, info.doc_info, info.scroll_info);

			case 'navigate-to' :
				return handle_remote_page_navigation (info);

			case 'scroll-to' :
				return handle_remote_page_scroll (info);

			case 'pointer-event' :
				return pointer.info( info );

			default :
				log.error ('received unknown info_id (' + info_id + '). Ignoring.');
				return;
		}
	};

	var d_started = $.Deferred ();
	content.start = function (sess_info) {
		log.info ('sess_info = ', sess_info);

		for (var uuid in sess_info.shared) {
			var me    = f_handle.identity.vc_id;
			var owner = sess_info.shared[uuid].owner;

			/*
			 * If this content was originally shared by me, then create a library 'behind'
			 * the content first */
			if (owner === me) {
				content.create({
					uuid         : uuid,
					startup      : true
				});
			}

			var info = sess_info.shared[uuid];

			handle_remote_new_content ({
				uuid              : uuid,
				owner             : owner,
				startup           : true,
			}, info.doc_info, info.scroll_info, info.pointer);
		}

		d_started.resolve();
		return;
	};

	content.create = function (options) {
		if (!_allowed ('write','control'))
			return ;

		var handle = f_handle.tabs.create (options);

		var uuid = handle.uuid;

		if (!uuid)
			log.error ('create called, but no UUID specified');

		return library.start (handle);
	};

	content.destroy = function ($tab_anchor, uuid, is_command) {
		log.info ('content.destroy: $tab_anchor', $tab_anchor, 'uuid = ' + uuid);
		player.destroy ($tab_anchor, uuid, is_command);
		library.destroy ($tab_anchor, uuid, is_command);
		pointer.destroy ($tab_anchor, uuid, is_command);		
	};

	/*
	 * Called by the framework when a tab gets shown */
	content.now_showing = function (res) {
		player.now_showing ({
			$tab_anchor : res.handle.anchor,
			id          : res.handle.id,
			uuid        : res.handle.uuid
		});
		pointer.nowshowing(res.handle.uuid);
	};

	/*
	 * Called by the framework when a tab gets hidden */
	content.now_hidden = function (res) {
		player.now_hidden ({
			$tab_anchor : res.handle.anchor,
			id          : res.handle.id,
			uuid        : res.handle.uuid
		});
	};

	function handle_remote_new_content (info, doc_info, scroll_info, pointer_info) {
		var options = {
			uuid : info.uuid,
			owner : info.owner,
			startup : info.startup || false,
			is_remote_command : info.is_remote_command
		};

		var tab = f_handle.tabs.get_by_uuid (info.uuid) || {};
		var handle = tab.handle;
		if (!handle)                 // when does this happen?
			handle = f_handle.tabs.create (options);


		/* reusing the options variable ... */
		options = {
			mode              : 'fullview',
			scroll_info       : scroll_info,
		};

		/*
		 * If you can change tabs
		 * they will change for everyone
		 *
		 * if a new permission for remote-sync-tabs
		 * is to be added, it should be checked here
		 */
		f_handle.tabs.sync_remote ({
			uuid  : info.uuid,
			quiet : true
		});

		player.start (handle, doc_info, options)
			.then (
				function (data) {
					/** register pointer */
					pointer.register (data.viewer, info.uuid, info.is_remote_command);
					if (pointer_info) {
						log.info ('got pointer_info', pointer_info);
						pointer.info (pointer_info);
					}
				},
				function (err) {
					log.error ('unable to start player for ', doc_info, ' - reason : ', err);
				}
			);
	}

	function handle_remote_page_navigation (info) {

		var tab = f_handle.tabs.get_by_uuid (info.uuid) || {};
		var handle = tab.handle; 
		if (!handle) {
			log.error ('rx remote navigation for non-existent tab : uuid = ' + info.uuid);
			return;
		}

		player.navigate (info.uuid, handle.anchor, info);
	}

	function handle_remote_page_scroll (info) {

		var tab = f_handle.tabs.get_by_uuid (info.uuid) || {};
		var handle = tab.handle;
		if (!handle) {
			log.error ('rx remote scroll for non-existent tab : uuid = ' + info.uuid);
			return;
		}

		player.scroll_to (info.uuid, handle.anchor, info);
	}

	/*
	 * Info needed by tab-controller in order to register this resource
	 */
	function register_info(mod_name) {
		
		/* 
		 * Handles needed by tab-controller 
		 */
		var handle = {
			create       : content.create,
			destroy      : content.destroy,
			now_showing  : content.now_showing,
			now_hidden   : content.now_hidden
		};

		/* 
		 * Options currently tells whether resource should be added to dropdown or not 
		 */
		var options = {
			display_name: 'Content',
			add_to_dropdown : true
		};

		return {
			name    : mod_name,
			handle  : handle,
			options : options
		};
	}

	function handle_perm_evt (evt, data) {
		if (evt !== 'override')
			return;

		if (data.key === 'write' && data.subkey === 'control') {
			d_started.then( mark_shared_all (data.val) );
		}
	}

	function mark_shared_all (val) {
		var uuid;
		var value = val ? 'yes' : 'no';
		var list = $('ul.nav.nav-tabs li[data-mod-name="content"]');

		list.each(function (index) {
			var li = $(this);

			if (li.hasClass ('tab-is-shared')){
				uuid = li.attr('data-tab-uuid');
				player.set_enabled (val, uuid);
			}
		});

		if (!val) {
			var $active = $('#widget-tabs ul.nav li.active');
			uuid = f_handle.tabs.get_active ();

			if (!$active.hasClass ('tab-is-shared')) {

				/*
				 * If current tab is not shared,
				 * move to session_wide_active_tab */
				var sync_remote = false;
				f_handle.tabs.show ({ uuid : uuid }, sync_remote);
			}
		}
	}

	return content;

});
