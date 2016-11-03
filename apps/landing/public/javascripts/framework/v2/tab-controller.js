define(function(require) {
	var $          = require('jquery');
	var log        = require('log')('tab-controller', 'info');

	var m = {};
	var controller = null;
	var f_handle_cached;
	var controller_initizlied = false;
	var pending_list = {};
	var active_list = {};

	m.init = function (sess_config, _framework) {
		f_handle_cached = _framework.handle('tab-controller');
	};

	/*
	 * This method just registers the controller */
	m.register_controller = function (_module) {
		var err = null;

		/* 
		 * Check to see if the module has all the mandatory 
		 * methods */
		err = check_controller_methods (_module);
		if (err)
			return err;

		controller = _module;
		return null;
	};

	/*
	 * Called by the framework, immediately after the successfull
	 * init of the resource acting as the tab-controller */
	m.flush_pending_registrations = function () {

		controller_initizlied = true;

		/* Register all the pending modules */
		for (var mod_name in pending_list) {

			register (pending_list[mod_name]);
			/*
			 * We ignore the errors - just print a message and that's that */
			active_list[mod_name] = pending_list[mod_name];
			delete pending_list[mod_name];
		}
	};

	var session_wide_active_tab;
	m.set_active = function (sess_info) {
		session_wide_active_tab = sess_info.uuid || null;
	};

	function get_active (sess_info) {
		return session_wide_active_tab;
	}

	m.info = function (from, to, info_id, info) {
		var is_remote_command;

		switch (info_id) {

			case 'tab-destroyed':
				is_remote_command = true;
				controller.handle.destroy (info, is_remote_command);
				break;

			case 'tab-now-showing':
				is_remote_command = true;
				controller.handle.show (info, is_remote_command);
				break;

			default :
				log.error ('unknown info_id (' + info_id + ') recieved. ignoring.');
				return;
		}
	};

	m.api = function (mod_name) {
		return {
			module_name : mod_name,
			/*
			 * Generally called by the client resources */
			create      : create,
			set_title   : set_title,
			get_title   : get_title,
			get_by_uuid : get_by_uuid,
			sync_remote : sync_remote,
			set_tooltip : set_tooltip,
			is_active   : is_active,
			register    : register,
			show        : show,

			/*
			 * Generally called by the tab-controller resource */
			destroyed   : destroyed,
			get_active  : get_active,
			now_showing : now_showing,
			now_hidden  : now_hidden,

			/*
			 * implement later 
			 destroy : destroy,
			 enable : enable,
			 disable : disable,
			 save : save,
			 */
		};
	};

	var uuid_array = {};
	function get_by_uuid (uuid) {
		return uuid_array[uuid];
	}

	function show (info, sync_remote) {
		var is_remote_command = !sync_remote;
		if (!controller || !controller.handle) {
			log.error ('can not show tab as no controller was found!', info);
			return;
		}

		controller.handle.show (info, is_remote_command);
	}

	/*
	 * Any resource that is dependent on tabs must register itself before initialize
	 */
	function register (_module) {

		/* 
		 * Check to see if the module has all the mandatory 
		 * methods */
		err = check_methods (_module);
		if (err)
			return err;

		/*
		 * If no controller has been registered so far, then just
		 * add it in the pending list and leave */
		if (!controller || !controller_initizlied) {
			pending_list[_module.name] = _module;
			log.info ('registeration of "' + _module.name + '" pending until a controller registers');
			return;
		}

		var methods = {
			create  : _module.handle.create,
			destroy : _module.handle.destroy,
		};
		var err = controller.handle.register (_module.name, methods, _module.options);

		if (err)
			return err;

		active_list[_module.name] = _module;
		return null;
	}

	function create (options) {
		var mod_name = this.module_name;
		log.info ('options create = ', options);

		if (!controller) {
			log.error ('create: no registerd controller', options);
			return;
		}

		/*
		 * uuid and owner are what a tab WILL have */
		if (!options)
			options = {};
		/*
		 * If the caller provided a uuid,then do not override */
		if (!options.uuid)
			options.uuid = uuid();

		/* 
		 * should never happen in case of remote content */
		if (!options.owner) {
			/*
			 * every resource will need this owner thing
			 * so it seems logical to keep this check in the framework itself */
			log.info ({ module: mod_name },'no owner set, assuming mine');
			options.owner = f_handle_cached.identity.vc_id;
		}

		options.active = true;
		if (options.startup) {
			if (session_wide_active_tab != options.uuid)
				options.active = false;
		}

		log.info ('options = ', options);
		var res = controller.handle.create (mod_name, options);

		/* Ensure that "res" contains the required fields */
		if ((typeof res.id === 'undefined') ||
			(typeof res.anchor === 'undefined')) {
			log.error ('create: improper return value ', res);
		}

		uuid_array [ options.uuid ] = {
			handle      : res,
			sync_remote : false,
			module      : mod_name,
			owner       : options.owner
		};

		if (options.startup && options.active)
			now_showing ({uuid: options.uuid});

		return res;
	}

	function set_title (options) {
		var uuid = options.uuid;

		if (!uuid) {
			log.error ('set_title : no uuid', options);
			return;
		}

		if (!uuid_array[uuid]) {
			log.error ('set_title: no tab for uuid "' + uuid + '" (' + this.module_name + '). likley programmatic error.');
			return false;
		}

		return controller.handle.set_title (uuid_array[uuid], options.title);
	}

	function get_title (options) {
		var uuid = options.uuid;

		if (!uuid) {
			log.error ('get_title : no uuid', options);
			return;
		}

		if (!uuid_array[uuid]) {
			log.error ('get_title: no tab for uuid "' + uuid + '" (' + this.module_name + '). likley programmatic error.');
			return false;
		}

		return controller.handle.get_title (uuid_array[uuid]);
	}

	function destroyed (info, is_remote_command) {
		var uuid = info.uuid;

		if (uuid_array[uuid]) {
			if (!is_remote_command && uuid_array[uuid].sync_remote)
				f_handle_cached.send_info ('*', 'tab-destroyed', { uuid: uuid, uuid_next : info.uuid_next }, 0);

			if (!info.preview_close)
				delete uuid_array[uuid];
		}
	}

	function now_showing (options, is_remote_command) {
		var uuid = options.uuid;

		if (uuid_array[uuid]) {
			if (!is_remote_command && uuid_array[uuid].sync_remote) {
				f_handle_cached.send_info ('*', 'tab-now-showing', { uuid : uuid }, 0);
				session_wide_active_tab = uuid;
			}

			var mod = uuid_array[uuid].module;
			if (active_list[mod].handle.now_showing)
				active_list[mod].handle.now_showing (get_by_uuid (uuid));
		}
	}

	function now_hidden (options) {
		var uuid = options.uuid;

		log.info ('now_hidden', options, uuid_array, active_list);
		if (uuid_array[uuid]) {
			var mod = uuid_array[uuid].module;
			if (active_list[mod].handle.now_hidden)
				active_list[mod].handle.now_hidden (get_by_uuid (uuid));
		}
	}

	function sync_remote (options) {
		var uuid = options.uuid;
		var mod_name = this.module_name;

		if (!uuid) {
			log.error ('sync_remote: null uuid (' + mod_name + '). likley programmatic error.');
			return false;
		}

		if (!uuid_array[uuid]) {
			log.error ('sync_remote: no tab for uuid "' + uuid + '" (' + mod_name + '). likley programmatic error.');
			return false;
		}

		uuid_array[uuid].sync_remote = true;
		/*
		 * Just inform the tab controller resource. The actual messages for sharing 
		 * will still be handled by that module */
		controller.handle.sync_remote (options);

		if (!options.quiet)
			now_showing ({ uuid : uuid });
	}

	function set_tooltip (options) {
		var uuid = options.uuid;

		if (!uuid) {
			log.error ('set_tooltip: null uuid (' + this.module_name + '). likley programmatic error.');
			return false;
		}

		if (!uuid_array[uuid]) {
			log.error ('set_tooltip: no tab for uuid "' + uuid + '" (' + this.module_name + '). likley programmatic error.');
			return false;
		}

		controller.handle.set_tooltip (uuid_array[uuid], options);
	}

	function is_active (uuid) {
		if (!uuid) {
			log.error ('is_active: null uuid (' + this.module_name + '). likley programmatic error.');
			return false;
		}

		if (!uuid_array[uuid]) {
			log.error ('is_active: no tab for uuid "' + uuid + '" (' + this.module_name + '). likley programmatic error.');
			return false;
		}

		return controller.handle.is_active (uuid_array[uuid]);
	}

	function check_controller_methods (_module) {

		try {
			__check(_module.name, 'register',    _module.handle.register);
			__check(_module.name, 'create',      _module.handle.create);
			__check(_module.name, 'destroy',     _module.handle.destroy);
			__check(_module.name, 'sync_remote', _module.handle.sync_remote);
			__check(_module.name, 'set_tooltip', _module.handle.set_tooltip);
			__check(_module.name, 'show',        _module.handle.show);
			__check(_module.name, 'is_active',   _module.handle.is_active);
		}
		catch (err) {
			log.error (err);
			return err;
		}

		return null;
	}

	function check_methods (_module) {

		try {
			__check(_module.name, 'create', _module.handle.create);
			__check(_module.name, 'destroy', _module.handle.destroy);
		}
		catch (err) {
			log.error (err);
			return err;
		}

		return null;
	}

	function __check (mod_name, method_name, method) {

		if (typeof method === 'undefined') {
			var err = 'undefined "' + method_name + '" method for "' + mod_name + '", required by tab-controller';
			throw err;
		}
	}

	function uuid () {
		var d = new Date().getTime();
		if (window.performance && typeof window.performance.now === "function") {
			d += performance.now(); //use high-precision timer if available
		}

		var _u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});

		return _u;
	}

	return m;
});

