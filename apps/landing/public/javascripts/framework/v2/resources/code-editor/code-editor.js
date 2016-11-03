define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var log         = require('log')('code-editor', 'info');
	var events      = require('events');
	var framework   = require('framework');
	var toolbar     = require('./toolbar');
	var workspace   = require('./workspace');

	var f_handle    = framework.handle ('code-editor');
	var _allowed    = f_handle.perms.has_perm;
	var editor         = {};
	var default_config = {};
	var template;

	editor.init = function (display_spec, custom, perms, mod_name) {
		var _d = $.Deferred();
		/*
		 * Since this resource is dependent on tab-controller
		 * resource will register itself to tab controller
		 */
		var _module = register_info(mod_name);
		log.info({ register_info : _module }, 'editor register info');

		f_handle.tabs.register(_module);

		var templates = display_spec.templates;
		template  = f_handle.template (templates[0] );

		events.bind ('framework:perms', handle_perm_evt, mod_name);
		_d.resolve();
		return _d.promise();
	};

	var d_started = $.Deferred ();
	editor.start = function (sess_info) {
		/*
		 * Store the required info 
		 */
		log.info ('editor sess_info', sess_info);

		default_config = {
			languages     : sess_info.languages,
			themes        : sess_info.themes,
			current_lang  : sess_info.current_lang,
			current_theme : sess_info.current_theme,
			current_size  : sess_info.current_size
		};

		/*
		 * Handle editors that are already open but page was refreshed
		 */
		for (var uuid in sess_info.shared) {
			var config      = sess_info.shared[uuid].config;
			var i_am        = f_handle.identity.vc_id;
			var owner       = sess_info.shared[uuid].owner;
			var scroll_info = sess_info.shared[uuid].scroll_info || null;
			var title       = sess_info.shared[uuid].title || null;
			var is_owner    = owner === i_am ? true : false;

			handle_remote_editor({
				uuid         : uuid,
				config       : config,
				scroll_info  : scroll_info,
				title        : title,
				owner        : owner,
				startup      : true
			});
		}
		d_started.resolve ();
	};

	editor.info = function (from, info_id, info, _instance) {
		switch (info_id) {
			case 'new-editor' :
				log.info(info, 'new-editor');
				var options = {
					uuid      : info.uuid,
					owner     : info.owner,
					config    : info.config,
					title     : info.config.title,
					broadcast : false
				};
				return handle_remote_editor (options);
			case 'data-sync' :
				log.info(info, 'data-sync');
				workspace.receive_info(info);
				return;
			case 'scroll-info' :
				log.info(info, 'scroll-info');
				workspace.set_scroll(info);
				return;
			case 'mode-change' :
				log.info(info, 'mode-change');
				toolbar.update_mode(info);
				return;
			case 'size-change' :
				toolbar.update_size(info);
				return;
			case 'title-change' :
				toolbar.update_title(info);
				return;
			default :
				log.error ('received unknown info_id (' + info_id + '). Ignoring.');
				return;
		}
	};

	editor.create = function (options, is_command) {

		if (!_allowed ('write','control') && !is_command)
			return ;

		var handle = f_handle.tabs.create (options);
		var uuid = handle.uuid;
		var anchor = handle.anchor;
		var ace_config = default_config;

		if (!uuid)
			log.error ('create called, but no UUID specified');

		/*
		 * Create the template
		 */
		if (options && options.config) {
			log.info(options.config, 'editor config received remotely');
			ace_config = options.config.default;
			ace_config.scroll_info = options.scroll_info || null;
			ace_config.title = options.title || null;

			var i_am = f_handle.identity.vc_id;
			if (options.config[i_am])
				$.extend(ace_config, options.config[i_am]);
		}

		ace_config.uuid = uuid;
		var ace_editor = template(ace_config);
		$(anchor).append(ace_editor);

		var $editor_outer = $(anchor).find(".code-editor-outer[data-uuid='" + uuid + "']");
		/*
		 * Initialise handlers
		 */
		toolbar.init(f_handle, workspace);
		toolbar.set_handlers(uuid, $editor_outer);
		/*
		 * open up the workspace
		 */
		workspace.init(f_handle, toolbar);
		workspace.start(ace_config, uuid, $editor_outer);
		/*
		 * Broadcast this info
		 * only if no options specified or if broadcast option is set to true
		 */
		if (!options || (options && options.broadcast)) {
			broadcast_info(uuid, ace_config);
		}

		set_tab_title(uuid, ace_config);
		return; 
	};

	editor.destroy = function ($tab_anchor, uuid, is_command) {
		log.log('destroy editor');
		workspace.destroy($tab_anchor, uuid, is_command);
		toolbar.destroy($tab_anchor, uuid, is_command);
	};

	editor.now_showing = function (res) {
		log.info('now_showing editor');
		toolbar.now_showing({
			$tab_anchor : res.handle.anchor,
			id          : res.handle.id,
			uuid        : res.handle.uuid
		});
	};

	editor.now_hidden = function () {
		log.info('now_hidden editor');
	};

	/*
	 * Open remote editors
	 */
	function broadcast_info (uuid, config) {
		/*
		 * Send a open tab message to all participants */
		var msg_data = {
			uuid         : uuid,
			owner        : f_handle.identity.vc_id,
			config       : {
				default : config
			}
		};

		log.info(msg_data, 'broadcast info');
		f_handle.send_info ('*', 'new-editor', msg_data, 0);
		/*
		 * Instruct the framework to keep this tab in sync with it's remote counterparts */
		f_handle.tabs.sync_remote ({ uuid : uuid });
	}

	/*
	 * Handle remote new editor
	 */
	function handle_remote_editor (info) {
		var options = info;
		var tab = f_handle.tabs.get_by_uuid (info.uuid) || {};
		var handle = tab.handle;

		if (!handle)  {
			var is_command = true;
			editor.create(options, is_command);
		}

		f_handle.tabs.sync_remote ({
			uuid  : info.uuid,
			quiet : true
		});
	}

	function handle_perm_evt (evt, data) {
		if (evt !== 'override')
			return;

		var uuid, li;
		if (data.key === 'write' && data.subkey === 'control') {

			d_started.then (function () {
				/*
				 * enable/disable all the editors */
				var list = $('ul.nav.nav-tabs li[data-mod-name="code-editor"]');
				list.each (function (index){
					li = $(this);
					uuid = li.attr ('data-tab-uuid');
					toolbar.set_enabled (uuid, data.val);
					workspace.set_enabled (uuid, data.val);
				});
			});
		}
	}

	/*
	 * Info needed by tab-controller in order to register this resource
	 */
	function register_info(mod_name) {
		
		/* 
		 * Handles needed by tab-controller 
		 */
		var handle = {
			create       : editor.create,
			destroy      : editor.destroy,
			now_showing  : editor.now_showing,
			now_hidden   : editor.now_hidden
		};

		/* 
		 * Options currently tells whether resource should be added to dropdown or not 
		 */
		var options = {
			display_name : 'Code-Editor',
			add_to_dropdown : true
		};

		return {
			name    : mod_name,
			handle  : handle,
			options : options
		};
	}

	function set_tab_title (uuid, config) {
		var title = config.title;
		if (title) {
			return toolbar.update_title({
				uuid  : uuid,
				title : title
			});
		}
		toolbar.update_title({ uuid : uuid, title : "code-editor ( )" });
		f_handle.send_command (null, 'get-title', uuid, 0)
			.then ( function (uuid, title) {
				toolbar.update_title({ uuid : uuid, title : title });
				return;
			}.bind(null, uuid), fail );
	}

	function fail (err) {
		log.error(err, 'get_tab_title');
		return;
	}

	return editor;
});
