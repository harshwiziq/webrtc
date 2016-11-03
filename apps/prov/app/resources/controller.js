var fs      = require('fs');
var promise = require('bluebird');
var _p      = require('prov/app/resources/prototype');
var log     = require('prov/app/common/log').child ({ module : 'resources/controller' });

/*
 * Hard coded list of resources that this provisioning recognizes */
var resources = [ 'git', 'logserver', 'av-tokbox-v2', 'chat-box', 'content', 'recording', 'code-editor', 'whiteboard-v1' ];

var controller = {};

controller.init = function () {
	var p = promise.pending ();
	var p_arr = [];
	var counter = 0;

	function ok () {
		counter--;

		if (!counter)
			return p.resolve ();
	}

	function fail (err) {
		counter--;

		if (!counter)
			return p.resolve ();
	}

	for (var i = 0; i < resources.length; i++) {
		var res      = resources[i];
		var __handle = load_module (res);

		if (!__handle)
			continue;

		if (!has_requisites (res, __handle))
			continue;

		map_add (res, __handle);

		/*
		 * Now call the resources "init" method */
		counter ++;
		__handle.init ()
			.then (ok.bind (res), fail.bind (res));
	}

	return p.promise;
};

controller.update = function (config) {
	var p = promise.pending ();

	if (!config.name) {
		log.error ({ input : config }, 'update : resource name not specified');
		p.reject ('resource name not specified');
		return p.promise;
	}

	if (!(__handle = map_get_handle (config.name))) {
		log.error ({ config : config }, 'update : resource name not registered with provisioning');
		p.reject ('unknown resource');
		return p.promise;
	}

	__handle.update (config)
		.then (
			p.resolve.bind (p),
			p.reject.bind (p)
		);

	return p.promise;
};

controller.custom_action = function (name, data) {
	var p = promise.pending ();

	if (!(__handle = map_get_handle (name))) {
		log.error ({ resource : name }, 'custom_action : resource name not registered with provisioning');
		p.reject ('unknown resource');
		return p.promise;
	}

	if (!__handle.custom_action) {
		log.error ({ resource : name }, 'custom_action : does not suppport "custom_action"');
		p.reject ('action not supported');
		return p.promise;
	}

	__handle.custom_action (data)
		.then (
			p.resolve.bind (p),
			p.reject.bind (p)
		);

	return p.promise;
};

controller.get = function (res) {

	if (!(__handle = map_get_handle (res))) {
		log.warn ({ resource : res }, 'get : resource name not registered with provisioning');
		return null;
	}

	return __handle.get ();
};

controller.get_variant = function (res, attrib, options) {
	var _p = promise.pending ();

	if (!(__handle = map_get_handle (res))) {
		log.warn ({ resource : res }, 'get_variant : resource name not registered with provisioning');
		_p.reject ('no such resource');
		return _p.promise;
	}

	if (!__handle.get_variant) {
		log.warn ({ resource : res }, 'get_variant : does not support this function');
		_p.reject ('resource does not support this method');
		return _p.promise;
	}

	__handle.get_variant (attrib, options)
		.then (
			function (data) { return _p.resolve (data); },
			function (err)  { return _p.reject  (err); }
		);

	return _p.promise;
};

controller.get_all = function () {
	var arr = [];

	for (var res in map) {
		var __handle = map [ res ].handle;
		arr.push ( {
			name   : res,
			config : handle.get () 
		});
	}

	return arr;
};

/*
 * Return a value in miliseconds */
controller.estimate_provisioning_time = function (class_conf) {
	/*
	 * We want the provisioning to, at a minimum, always start around 10s 
	 * before the actual time. Setting the minimum value here allows for
	 * the downstream code logic to compensate for it, meaning the provisioning
	 * will start at least 10s before the class duration if possible. If not,
	 * the class will be postponed by 10s. */
	var estimate = 10000;
	var __handle;

	/*
	 * Iterate over all resources and get the concurrent allocation time 
	 * estimate */
	var _res = class_conf.resources;

	if (!_res)
		return ;

	for (var i = 0; i < _res.length; i++) {
		var r_name   = _res[i].name;

		__handle = null;
		if (!(__handle = map_get_handle (r_name)))
			continue;

		if (__handle.estimate_provisioning_time)
			estimate += __handle.estimate_provisioning_time (_res[i], class_conf);
	}

	return estimate;
};

controller.provision = function (class_conf) {
	var p            = promise.pending ();
	var __handle     = null;
	var resource_arr = [];
	var counter      = 0;

	function __done (r_config, resource_info) {
		counter--;
		/*
		 * Add the resource config as a part of the resource_info */
		resource_info.config = r_config;
		resource_arr.push ( resource_info );

		log.info ({ class_id : class_conf.class_id }, 'provisioning ok for ' + resource_info.name);

		if (!counter)
			return p.resolve ({
				class_conf   : class_conf,
				resource_arr : resource_arr
			});
	}

	function __error (r_config, err) {
		counter--;

		log.error ({ err : err }, 'error provisioning for "' + this + '"');

		if (!counter)
			return p.resolve ({
				class_conf   : class_conf,
				resource_arr : resource_arr
			});
	}

	/*
	 * Fill in the resource specific information */
    for (var r = 0; r < class_conf.resources.length; r++) {
		var r_config = class_conf.resources[r];
		var r_name   = r_config.name;

		/*
		 * Many resources listed in the class do not require
		 * any provisioning/cluster side support or configuration.
		 * Skip them */
		if (!r_config.req_sess_info)
			continue;

		if (!r_name) {
			log.error ({ class_id: class_conf.class_id, res : class_conf.resources[r] }, 'resource with no name in class conf. skipping');
			continue;
		}

		__handle = null;
		if (!(__handle = map_get_handle (r_name))) {
			log.warn ({ resource : res }, 'provision : resource name not registered with provisioning. skipping');
			continue;
		}

		counter++;
		__handle.provision (r_config, class_conf)
			.then ( 
				   __done.bind  (r_name, r_config),
				   __error.bind (r_name, r_config)
				  );
	}

	return p.promise;
};

function has_requisites (res, __handle) {
	var methods = [ 'init', 'create', 'update', 'get', 'remove', 'provision' ];

	for (var i = 0; i < methods.length; i++) {
		if (!__handle[methods [i]]) {
			log.error ('method "' + methods [i] + '" missing from resource "' + res + '". moving on');
			return false;
		}
	}

	return true;
}

var map = {};
function map_add (res, __handle) {
	map [ res ] = {
		handle : __handle,
		__name : res
	};
}

function map_get_handle (res) {
	if (!map [ res ])
		return null;

	return map [ res ].handle;
}

function dump_map (context) {
	Object.keys (map).forEach (function (curr) {
		log.debug ({ 
			__name : map [curr].__name, 
			internal_name : map [curr].handle.name,
			provisioning : map [curr].handle.provision.toString() }, context + ' key = ' + curr);
	});
}

function load_module (res) {
	var __handle = null;
	var __module_path = 'prov/app/resources/' + res;
	var s = null, obj = null;

	try {
		s = fs.statSync (__dirname + '/' + res + '.js');
	}
	catch (e) {
		/*
		 * Load the default prototype if the resource specific module is not available */
		__module_path = 'prov/app/resources/prototype';
	}

	try {
		obj = require (__module_path);
		__handle = new obj (res);
	}
	catch (e) {
		log.error ('module load error for resource ' + res + ' : ' + e);
		return null;
	}

	log.info ('module ' + __module_path + ' loaded for resource ' + res);
	return __handle;
}

module.exports = controller;
