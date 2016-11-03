define(function(require) {
	var $              = require('jquery');
	var cc             = require('cc');
	var lc             = require('layout-controller');
	var identity       = require('identity');
	var events         = require('events');
	var notify         = require('notify');
	var remodal        = require('remodal');
	var perms          = require('perms');
	var alerts         = require('alerts');
	var attendees      = require('attendees');
	var tab_controller = require('tab-controller');
	var log            = require('log')('framework', 'info');

	var framework     = {};
	var modules       = {};
	var role_map      = {};
	var menu_handle   = {};
	var __sess_config = {};
	var progress_ev   = events.emitter ('framework-progress', 'framework');

	framework.init = function (sess_config) {
		var _d = $.Deferred();

		__sess_config = sess_config;
		log.log ('init called with ', sess_config);

		tab_controller.init (sess_config, framework);
		perms.init (sess_config, framework);
		lc.init (sess_config, framework);
		lc.probe_layout ();

		_d.resolve (sess_config);

		return _d.promise ();
	};

	framework.init_modules = function (_module) {
		var err = '';
		var _d = $.Deferred();

		_module.init_ok = false;

		if (modules[_module.name]) {
			log.error ('Duplicate module for init: ' + _module.name);
			_d.reject('Duplicate module' + _module.name);

			return _d.promise ();
		}

		/*
		 * Check for role duplication */
		if (_module.resource.role) {
			var role = _module.resource.role;
			if (role_map[role]) {
				log.error ('a module is already registered with role "' + role + '" (' + role_map[role].name + '). failing init for "' + _module.name + '"');
				_d.reject ('role "' + role + '" already registered');
				return _d.promise();
			}
		}

		log.info ('inserting module - ' + _module.name + ' ...');

		if ((err = lc.attach_module (_module)) !== null) {
			log.error ('Failed to attach module ' + _module.name);
			_d.reject (err);
			return _d.promise ();
		}

		var _d_mod = _module.handle.init (
			_module.resource.display_spec,
			_module.resource.custom,
			_module.resource.perms,
			_module.name
		);

		/*
		 * Check for incorrectly written modules */
		if (!is_promise (_d_mod)) {
			log.error ('init may have failed for \"' + _module.name + '\" : err = did not return promise');
			progress_ev.emit ('init ' + _module.name + 'maybe failed');

			_d.reject(err);
			return _d.promise();
		}

		_d_mod.then (
			function() {
				modules[_module.name] = _module;
				set_role (_module);
				progress_ev.emit ('init ' + _module.name + ' ok');

				_module.init_ok = true;
				_d.resolve (_module);
			},
			function (err) {
				log.error ('init failed for \"' + _module.name + '\" : err = ' + err);
				progress_ev.emit ('init ' + _module.name + ' failed');

				_d.reject(err);
				return;
			}
		);

		return _d.promise();
	};

	start_internal_module = function (module_info, info_req) {
		var name = module_info.name;
		var info = module_info.info;

		switch (name) {
			case 'layout-ctrl':
				lc.handle_resource_init (info);
				return true;
		}

		return false;
	};

	start_module = function (module_info, info_req) {
		var name = module_info.name;
		var _module = modules[name];

		log.info ('module_info ', module_info, 'name = ', name);

		if (!_module) {
			/* We have recieved resource information for a resource which we did not
			 * load. Indicates a configuration issue. Flag it. Someone should notice */
			log.error ('module \"' + name + '\" was never loaded, yet recieved resource information. Misconfigured class. Ignoring.');
			return;
		}

		/*
		 * Do not start a module whose init has failed */
		if (!_module.init_ok) {
			log.info ('not starting module "' + name + '", because it\'s init failed');
			return;
		}

		if (!_module.handle.start) {
			log.error ('module \"' + name + '\": \"start\" method undefined');
			return;
		}

		if (!module_info || !module_info.info) {
			/* Modules which do not have any server side counterparts do not require this */
			if (info_req) {
				log.error ('module \"' + name + '\": resource info not defined');
				return;
			}
		}

		if (info_req && module_info.status !== 'ok') {
			log.error ('module \"' + name + '\": resource status (from server) not ok (' + module_info.status + '). not starting resource.');
			return;
		}

		log.info ('starting module \"' + name + '\" ...');

		try { 
			_module.handle.start (module_info.info);
			progress_ev.emit ('start ' + name + ' ok');
		}
		catch (e) {
			log.error ('module \"' + name + '\": start err = ' + e);
			progress_ev.emit ('start ' + name + ' failed. err = ' + e);
		}
	};

	/*
	 * Do any work which needs to be done, once all the modules
	 * have finished their inits. */
	framework.post_init = function (sess_info) {
		var _d = $.Deferred ();

		lc.post_init ();

		_d.resolve (sess_info);
		return _d.promise ();
	};

	var _d_start;
	framework.wait_for_start = function () {
		_d_start = $.Deferred ();

		log.info ('waiting for go-ahead from session cluster ...');
		progress_ev.emit ('waiting for session cluster ...');

		/*
		 * Nothing to be done here, except when we recieve the 
		 * message from the session controller. We trigger this
		 * promise then. */

		return _d_start.promise ();
	};

	function started (sess_info) {
		log.info ('class started : ', sess_info);
		progress_ev.emit ('session cluster responded with session info');

		perms.start (sess_info.perms);
		attendees.fill_users (sess_info.attendees);
		tab_controller.set_active (sess_info.tab_controller);

		/* Start modules which do not require any server side session info */
		for (var mod in modules) {

			/*
			 * If the 'req_sess_info' is undefined, assume it requires
			 * server side session_info */
			if (typeof modules[mod].resource.req_sess_info === 'undefined' ||
				   modules[mod].resource.req_sess_info === true)
				continue;

			start_module ({
				name : mod,
				status : 'ok',
				info : null
			}, false);
		}

		_d_start.resolve (sess_info);
	}

	$('#widget-nav li#signout').on ('click', end_class_popup);
	$('[data-remodal-id="signout-confirm"] button.remodal-confirm').on('click', end_class);

	function end_class_popup () {
		var modal = $('[data-remodal-id="signout-confirm"]').remodal({ closeOnConfirm : false });
		modal.open();
	}

	function end_class () {
		log.info ('end_class');
		for (var mod in modules) {
			if (!modules[mod] || !modules[mod].handle || !modules[mod].handle.stop)
				continue;

			modules[mod].handle.stop ();
		}

		/* Hardcoded for now - eventually should come from the white labelling
		 * information */

		setTimeout (function () {
			delete_cookie ('wiziq_auth', '/');
			delete_cookie ('wiziq_origin', '/');
			delete_cookie ('wiziq_auth_via', '/');
			location.replace ('https://live.wiziq.com/aliveext/endsession.aspx?sessionId=' +
							  __sess_config.class_id + '&userName=' +
							  identity.id + '&userType=' +
							  __sess_config.role + '&conf='
							 );
		}, 500);
	}

	function delete_cookie( name, path, domain ) {
			document.cookie = name + "=" + ((path) ? ";path="+path:"")+
						((domain)?";domain="+domain:"") +
						";expires=Thu, 01 Jan 1970 00:00:01 GMT";
	}


	/*
	 * Called by the CC module to deliver an incoming req.
	 * Should return a promise. */

	framework.rx_req = function (message) {
		var _m          = message.to.split(':');
		var module_name = _m[0];
		var instance    = _m[1];
		var _d = $.Deferred ();
		var _module = null;

		if (module_name === 'framework') {
			log.error ('rx_req: framework directed requests not implemented yet');
			_d.reject ();
			return _d.promise ();
		}

		if (module_name === 'perms') {
			/*
			 * -TODO    (do it properly)
			 * perm override case */
			return perms.command (message.msg.command, message.msg.data);
		}

		/*
		 * It is likely that the message is addressed from a 'role' rather than
		 * the actual resource name. Try that first, and then the latter. */
		_module = role_map[module_name];
		if (!_module) {
			if (!modules[module_name]) {
				log.error ('rx_req for unknown module "' + module_name + '". rejecting.', message);
				_d.reject ('module (' + module_name + ') not registered');
				return _d.promise ();
			}
			_module = modules[module_name];
		}

		if (!_module.handle.remote_req) {
			log.error ('no remote_req handler defined for module "' + module_name + '" (' + _module.name + ').rejecting remote req', message);
			_d.reject ('module (' + module_name + ') not capable of handling remote req');
			return _d.promise ();
		}

		var maybe_d = _module.handle.remote_req (message.msg.command, message.msg.data, instance);

		if (!is_promise (maybe_d)) {
			_d.reject ('remote_req handler not returning a promise');
			return _d.promise ();
		}

		/* OK, maybe it is a promise after all */
		maybe_d.then (
				_d.resolve.bind(_d),
				_d.reject.bind(_d)
			);

		return _d.promise ();
	};

	framework.rx_info = function (from, to, id, data) {
		var _s = to.split(':');
		var _to = _s[0];

		switch (_to) {
			case 'framework' :
				switch (id) {

					case 'session-terminate': 
						end_class (); 
						break;

					case 'session-info': 
						started (data); 
						break;

					case 'resource-init':
						/*
						 * Perhaps, this resource info is for an internal module
						 * like layout-ctrl etc. Try that first - if that doesn't succeed
						 * then try the loadable modules */
						if (!start_internal_module (data, true))
							start_module (data, true);

						break;

					case 'new-johnny':
						attendees.user_join( data);
						break;

					case 'johnny-go-went-gone':
						attendees.user_leave( data);
						break;

					case 'perms-override':
						perms.info (data);
						break;

					default :
						log.error ('handler for info \"' + id + '\" NOT IMPLEMENTED (to: ' + to + ')');
				}
				break;

			case 'tab-controller' :
				tab_controller.info (from, to, id, data);
				break;

			case 'layout-ctrl' :
				lc.info (from, to, id, data);
				break;

			default :
				deliver_info (from, to, id, data);
		}
	};

	framework.handle = function (module_name) {
		var handle = {
			identity       : identity,
			attendees      : attendees.api,
			perms          : perms.api,
			alerts         : alerts,
			tabs           : new tab_controller.api(module_name),
			module_name    : module_name,
			send_command   : send_command,
			send_info      : send_info,
			template       : template,
			notify         : notify,
			menu           : {
				module_name : module_name,
				add         : menu_add,
				remove      : menu_remove,
				handler     : menu_handler,
			}
		};

		return handle;
	};

	/*---------------------------------------------
	 * Internal functions
	 *--------------------------------------------*/


	function menu_add (display, path) {
		if (!menu_handle.add) {
			log.error ('No registered menu resource: ' + this.module_name + '.menu.add() failed');
			return false;
		}

		var uid = uniq_id (path);

		/* 'path' is of the form "a.b.c", where "c" is to be added under
		 * "a"->"b". Implies, that "a" & "b" must exist. */
		if (!create_menu_map(uid, this.module_name, display, path))
			return false;

		if (!create_menu_reverse_map(uid, this.module_name, display, path))
			return false;

		return menu_handle.add (display, get_path(this.module_name, path), uid);
	}

	var __seed = 1;
	var menu_map = {};
	var menu_rmap = {};
	function uniq_id (path) {
		var _s = path.split('.');
		__seed++;
		return 'menu-' + _s[_s.length -1] + '-' + __seed;
	}

	function get_path (_m_name, path) {
		var _m = menu_map[_m_name].submenu;
		var _s = path.split('.');
		var _path = '';

		for (var i = 0; i < _s.length - 1; i++) {
			_path += _m[_s[i]].uid;

			if (i < _s.length - 2)
				_path += '.';

			_m = _m[_s[i]].submenu;
		}

		return _path;
	}

	function create_menu_map (uid, _m_name, display, path) {
		if (!menu_map[_m_name])
			menu_map[_m_name] = {
					module  : _m_name,
					submenu : {},
					handler : null,
				};

		var _m = menu_map[_m_name].submenu;
		var _s = path.split('.');

		for (var i = 0; i < _s.length; i++) {

			if (i == (_s.length - 1)) {
				_m[_s[i]] = {
					display : display,
					uid     : uid,
					submenu : {}
				};
				return true;
			}

			if (!_m[_s[i]]) {
				log.error ('create_menu_map: error: parent node \"' + _s[i] + '\" not defined for menu path \"' + path + '\", module (' + _m_name + ')');
				return false;
			}

			_m = _m[_s[i]].submenu;
		}

		/* Should never return from here */
		return false;
	}

	function create_menu_reverse_map (uniq_id, _m_name, display, path) {
		if (menu_rmap[uniq_id]) {
			log.error ('create_menu_reverse_map: internal error: duplicate uniq_id \"' + uniq_id + '\"');
			dump_all_uids ();
			return false;
		}

		menu_rmap[uniq_id] = {
			module_name : _m_name,
			path        : path
		};

		return true;
	}

	function dump_all_uids () {
		for (var key in menu_rmap) {
			log.info ('uid: ' + menu_rmap[key] + '[' + menu_rmap[key].module_name + '] - ' + menu_rmap[key].path);
		}
	}

	function menu_remove (display, path) {
		/* TODO
		if (!menu_handle.set_handler) {
			log.error ('No registered menu resource: ' + this.module_name + '.menu.remove() failed');
			return;
		}

		return menu_handle.remove (menu_callback.bind(this, f));
		*/
	}

	function menu_handler (f) {
		if (!menu_map[this.module_name]) {
			log.error ('menu_handler: error: no menu registered for \"' + this.module_name + '\"');
			return false;
		}

		menu_map[this.module_name].handler = f;

		return true;
	}

	function make_addresses (user, mod, from_instance) {
		var addr = {};
		var module_suffix = '.' + mod + ':' + (from_instance? from_instance: '0');

		/*
		 * if user is null or empty, the intended recipient is
		 * the server counterpart of the module. */

		addr.to   = (!user || user.length === 0) ?  '' : 'user:' + user + '.';
		addr.to   = addr.to + mod;
		addr.from = 'user:' + identity.vc_id + module_suffix;

		return addr;
	}

	/*
	 * returns a promise
	 */
	function send_command (user, command, data, from_instance) {
		var _d    = $.Deferred ();
		var _module  = modules[this.module_name];
		var role = _module ? (_module.resource ? _module.resource.role : null ) : null;
		var addrs = make_addresses (user, role ? role : this.module_name, from_instance);

		cc.send_command (addrs.from, addrs.to, command, data)
			.then (
				_d.resolve.bind(_d),
				_d.reject.bind(_d)
			);


		return _d.promise();
	}

	function template (name) {
		if (!_templates[this.module_name] || !_templates[this.module_name][name])
			return null;

		/* jslint evil: true */
		var _t = new Function('locals', 'return ' + _templates[this.module_name][name]);

		return _t();
	}

	function send_info (user, info_id, data, from_instance) {

		var addrs = make_addresses (user, this.module_name, from_instance);
		cc.send_info (addrs.from, addrs.to, info_id, data);

		return;
	}

	function set_role (_module) {
		var role = _module.resource.role;

		if (!role)
			return;

		role_map[role] = _module;

		switch (role) {
			case 'menu':
				set_role_menu (_module);
				break;

			case 'av': break;
			case 'chat': break;
			case 'app': break;
			case 'attendees': break;
			case 'recording': break;

			case 'tab-controller':
				tab_controller.flush_pending_registrations ();
				break;

			case 'content':
			case 'whitelabeling':
				break;
			case 'code-editor':
				break;

			default:
				log.error ('unknown role \"' + role + '\" for module \"' + _module.name + '\"');
		}

		return;
	}

	function set_role_menu (_module) {
		/*
		 * Test for various required methods */

		if (!_module.handle.menu_add) {
			log.error ('Undefined method \"menu_add\" for \"' + _module.name + '\" (role=menu)');
			return;
		}

		if (!_module.handle.menu_remove) {
			log.error ('Undefined method \"menu_remove\" for \"' + _module.name + '\" (role=menu)');
			return;
		}

		if (!_module.handle.menu_set_handler) {
			log.error ('Undefined method \"menu_set_handler\" for \"' + _module.name + '\" (role=menu)');
			return;
		}

		menu_handle.add = _module.handle.menu_add;
		menu_handle.remove = _module.handle.menu_remove;
		_module.handle.menu_set_handler(menu_callback);

		return;
	}

	function menu_callback (menu_uid) {

		if (!menu_rmap[menu_uid]) {
			log.error ('menu_callback with nonexistent uid: ' + menu_uid);
			return;
		}

		var module_name = menu_rmap[menu_uid].module_name;
		var path = menu_rmap[menu_uid].path;
		var f = menu_map[module_name].handler;

		try {
			f(path);
		}
		catch (e) {
			log.error ('menu_callback: exception in module \"' + module_name + '\", handling \"' + path + '\"');
		}
	}

	function deliver_info (from, to, id, data) {
		/*
		 * The module maybe be addressed as <module-name>[:<instance>]. Strip the instance
		 */
		var _s = to.split(':');
		var _to = _s[0];
		var _instance = _s[1];

		if (!modules[_to]) {
			log.error ('deliver_info: unknown module \"' + _to + '("' + to + '")\"');
			return;
		}

		try {
			modules[_to].handle.info (from, id, data, _instance);
		}
		catch (e) {
			log.error ('deliver_info: \"' + _to + '\" err = ' + e);
		}
	}

	/*
	 * A hacky way to determine if a value is a promise */
	function is_promise (value) {

		if (!value || !value.then)
			return false;

		if (typeof value.then !== "function")
			return false;

		return true;
		/*
		 * Save this for another day
		var promiseThenSrc = String($.Deferred().then);
		var valueThenSrc = String(value.then);
		return promiseThenSrc === valueThenSrc;
		*/
	}

	return framework;
});
