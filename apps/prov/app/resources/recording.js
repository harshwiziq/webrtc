var promise    = require('bluebird');
var moment     = require('moment');
var fs         = require('fs');
var azure      = require('azure-storage');
var kue        = require ('kue');
var log        = require('prov/app/common/log').child({ module : 'resources/recording' });
var app_config = require('common/config');
var schema     = require('prov/app/models/resource');
var db         = require('prov/app/lib/db');
var vm         = require('prov/app/resources/azure');
var pool       = require('prov/app/resources/vm-pool');
var remote     = require('prov/app/resources/remote');
var queue      = require('prov/app/resources/queue');
var _proto     = require('prov/app/resources/prototype');
var prov       = require('prov/app/config/prov');
var exec       = require ('child_process').exec;

/*
 * The schema for "recording" is as follows:
 *     {
 *         storage_type : 'azure',
 *         acc_config : {
 *             client_id : 'xxx',
 *             secret_id : 'xxx',
 *             tenant_id : 'xxx',
 *             subscription_id : 'xxx',
 *             container_id : 'xxx'
 *         },
 *         vm_config : {
 *             location : 'xxx',
 *             resource_group_name : 'xxx'
 *             user : 'xx',
 *             password : 'xxx',
 *             os : {
 *                publisher : 
 *                offer :
 *                sku :
 *                os_type :
 *             },
 *             storage : {
 *                 type : 'standard-lrs'
 *             },
 *             vm_network : {
 *                dns : [ of ip addresses ],
 *             }
 *         },
 *         "store" : {
 *             "type" : "azure-blob",
 *             "custom_info" {
 *                 "azure_strg_name" : "some account name",
 *                 "azure_strg_key"  : "some account key",
 *                 "container_id"   : "Azure container id",
 *             }
 *         },
 *         "wiziq_endpoints" : {
 *             "status_url" : "WizIQ URL for status"
 *         },
 *     }
 */

function recording (name) {
	if (!name)
		throw 'resource with unspecified name';

	this.name   = name;
	this.cached = null;
	this.conn   = db.conn;

	this.init = function () {
		var p = promise.pending();

		/*
		 * This method is guarenteed to be called after the db connection
		 * has succeeded. Therefore, we should be getting the model without
		 * any error. */
		var model = this.conn.model('resource', schema);

		if (!model)
			return p.reject ('resource model not ready yet');

		var __this = this;

		model.get (this.name)
		.then (
			function (config) {
				/*
				 * If there's no config, "findOne" should return a null */
				if (!config || !Object.keys (config).length) {
					log.warn ('null or empty config for resource ' + __this.name);
					return p.reject ('resource null or empty');
				}

				create_container (config)
					.then ( zip_recbot, __error.bind(p, __this) )
					.then (	
						function (response) {
							__this.cached = config.toObject ();
							return p.resolve (config);
						},
						function (err) {
							log.error ({ err : err }, 'resource "' + __this.name + '" : zip_recbot init failed');
							return p.reject (err);
						});
			},
			function (err) {
				log.error ({ err : err }, 'resource "' + __this.name + '" init failed');
				return p.reject (err);
			}
		);

		return p.promise;
	};

	function __error (__this, err) {
		log.error ({ err : err }, 'resource "' + __this.name + '" : create_container init failed');
		this.reject();
	}

	function create_container (config) {
		var p = promise.pending();
		var blob;

		/*
		 * Create the container if it does not exist. Return OK if already exits.
		 * return error if could not create */

		var blob_config = config.custom.store.custom_info;
		try {
			blob = azure.createBlobService (blob_config.azure_strg_name, blob_config.azure_strg_key);
		} catch (e) {
			log.error ({ err : e, blob_config : blob_config }, 'create blob service error');
			p.reject (e);
			return p.promise;
		}

		blob.createContainerIfNotExists (blob_config.container_id, function (err, result) {
			if (err) {
				log.error ({ err : err, blob : blob_config }, 'create container error');
				return p.reject (err);
			}

			if (!result.created) 
				log.info ('azure blob container "' + blob_config.container_id + '" already exists');
			else
				log.info ('azure blob container "' + blob_config.container_id + '" created');

			return p.resolve ();
		});

		return p.promise;
	}

	function zip_recbot () {
		/*
		 * do zip of recbot here and store in /tmp */
		var p = promise.pending();

		var command = 'tar -czf /tmp/recbot.tar.gz ~/vc/recbot/';
		exec (command, function (err, stdout, stderr) {
			if (err) {
				return p.reject(err);
			}

			log.info({command : command}, 'recbot zip ok');
			return p.resolve('zip ok');
		});

		return p.promise;
	}

	this.create = function (conf) {
		var p     = promise.pending();
		var model = this.conn.model('resource', schema);

		if (!model)
			return p.reject ('resource model not ready yet');

		var __this = this;

		model.create (conf)
			.then (
				function (config) {
					if (!__this.cached ||
						config.custom.store.custom_info.container_id != __this.cached.custom.store.custom_info.container_id) {
							create_container (config)
							.then (
								function () {
									__this.cached = config;
									return p.resolve (config);
								},
								function (err) {
									log.error ({ err : err }, 'update resource "' + __this.name + '": create_container failed');
									return p.reject (err);
								}
							);

							return;
						}

						__this.cached = config.toObject ();
						return p.resolve (config);
				},
				function (err) {
					log.error ({ err : err }, 'update resource "' + __this.name + '" configuration failed');
					return p.reject (err);
				}
		);

		return p.promise;
	};

	this.remove = function (conf) {
		var p     = promise.pending();
		var model = this.conn.model('resource', schema);

		if (!model)
			return p.reject ('resource model not ready yet');

		var __this = this;

		model.remove_config (conf)
		.then (
			function (config) {
				__this.cached = null;
				return p.resolve (config);
			},
			function (err) {
				return p.reject (err);
			}
		);

		return p.promise;
	};

	this.update = function (conf) {
		return this.create (conf);
	};

	/*
	 * The format for "data" is :
	 *     {
	 *         action : <string>,
	 *         data   : Object
	 *      }
	 */
	this.custom_action = function (data) {
		var p     = promise.pending();

		if (!data.action) {
			p.reject ('illformed request');
			return p.promise;
		}

		switch (data.action) {
			case 'kill' :
				delete_vms (this.cached, data.data)
					.then (
						p.resolve.bind(p),  
						p.reject.bind(p) 
					);
				break;
		}

		return p.promise;
	};

	this.get = function () {
		return this.cached;
	};

	this.get_variant = function (attrib, options) {
		var p = promise.pending();

		if (!this.cached) {
			p.reject ('no config found for resource "' + this.name + '"');
			return p.promise;
		}

		switch (attrib) {
			case 'bots' :
				list_bots (this.cached.custom, options).then (
					p.resolve.bind (p),
					p.reject.bind (p)
				);
				break;

			default :
				p.reject ('unknown attribute');
		}

		return p.promise;
	};

	/*
	 * Return in miliseconds */
	this.estimate_provisioning_time = function (resource_info, class_config) {
		/*
		 * As of now, this is about 4 minutes. We return 7 minutes, just to be safe */

		return 7*60*1000;
	};

	this.map_vm = {};
	this.provision = function (resource_info, class_config) {
		var p = promise.pending();

		if (!this.cached) {
			p.reject ('no config found for resource "' + this.name + '"');
			return p.promise;
		}

		var __data  = JSON.parse(JSON.stringify (this.cached));
		var path    = {
			script : app_config.app_dir_top + '../recbot/scripts/install-recbot-prerequisites.sh',
			config : '/tmp/' + class_config.sess_id + '.json',
			recbot : '/tmp/recbot.tar.gz',
		};

		/*
		 * This is the login id with which the recbot will try to enter the class */
		__data.custom.login_id    = create_login_id (class_config.class_id);
		__data.custom.prov_config = prov.get();

		var resource_config = {
			custom_config : __data.custom,
			class_config  : class_config,
		};


		pool.add_vm (resource_config)
			.then (vm.create_vm,                                                                                  __error.bind(p, resource_config) )
			.then (queue.create_delete_job.bind (null, 'delete_vm'),                                              __error.bind(p, resource_config) )
			.then (create_config_json.bind      (null, path.config),                                              __error.bind(p, resource_config) )
			.then (pool.update_vm.bind          (null, 'vm-info'),                                                __error.bind(p, resource_config) )
			.then (send_file.bind               (null, path.script, null),                                        __error.bind(p, resource_config) )
			.then (send_file.bind               (null, path.recbot, null),                                        __error.bind(p, resource_config) )
			.then (send_file.bind               (null, path.config, '/tmp/config.json'),                          __error.bind(p, resource_config) )
			.then (execute_command.bind         (null, './install-recbot-prerequisites.sh'),                      __error.bind(p, resource_config) )
			.then (pool.update_vm.bind          (null, 'bot-up'),                                                 __error.bind(p, resource_config) )
			.then (delete_config_json.bind      (null, path.config),                                              __error.bind(p, resource_config) )
			.then (p.resolve.bind               (p, __data),                                                      __error.bind(p, resource_config) )
		;

		return p.promise;
	};
}

function __error (resource_config, err) {
	pool.mark_error (resource_config, err);

	return this.reject (err);
}

function create_login_id (class_id) {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
	}

	return class_id + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
}

function create_config_json (file_path, aggregate_create_vm) {
	/* verify this function's values and execution success */
	var _p = promise.pending();

	var resource_config = aggregate_create_vm.resource_config;
	var json_config = resource_config;

	/*
	 * Add a few things */
	json_config.custom_config.vm_config.name = aggregate_create_vm.vm_info.name;

	log.info('creating recording config for class', resource_config.class_config.class_id);

	fs.writeFile (file_path, JSON.stringify (json_config, null, 2), 'utf-8', function (err) {
		if (err) {
			log.error ({err : err}, 'recbot config file for session ' + resource_config.class_config.sess_id + ' create error');
			return _p.reject(err);
		}

		return _p.resolve (aggregate_create_vm);
	});

	return _p.promise;
}

function delete_config_json (path_to_config, _info) {
	/* verify this function's values and execution success */
	var _p              = promise.pending();
	var resource_config = _info.resource_config;

	log.info ({ path : path_to_config }, 'deleting temp session config file');

	fs.unlink (path_to_config, function (err) {

		if (err) {
			log.error ({err : err}, 'recbot config file for session ' + resource_config.class_config.sess_id + ' delete error');
			return _p.reject(err);
		}

		return _p.resolve ('recbot config file delete ok');
	});

	return _p.promise;
}

function send_file (file_path, remote_path, _info) {
	var _p              = promise.pending();
	var resource_config = _info.resource_config;

	if (!resource_config || !_info || !_info.pip_info) {
		_p.reject ('null resource_config or _info');
		return _p.promise;
	}

	var __remote_path = remote_path ? remote_path : './';
	var custom_config = resource_config.custom_config;
	var class_config  = resource_config.class_config;

	log.info ({ path : file_path }, 'sending to recbot');

	var remote_config = make_remote_config (custom_config, _info.pip_info.ipAddress, __remote_path, null);
	
	if (!remote_config) {
		_p.reject ('bad remote config');
		return _p.promise;
	}

	remote.send_file (file_path, remote_config)
		.then(
			function (result) {
				return _p.resolve(_info);
			},
			function (err) {
				log.error ({ err : err }, 'error sending to recbot');
				return _p.reject(err);
			}
		);

	return _p.promise;
}

function execute_command (command, _info) {
	var _p              = promise.pending();
	var resource_config = _info.resource_config;
	var custom_config   = resource_config.custom_config;
	var class_config    = resource_config.class_config;

	log.info('executing command :', command, 'on remote vm');

	var remote_config = make_remote_config (custom_config, _info.pip_info.ipAddress, null, command);

	if(!remote_config){
		_p.reject ('bad remote config');
		return _p.promise;
	}

	remote.execute (remote_config, resource_config)
		.then (
			function (result) {
				return _p.resolve (_info);
			},
			function (err) {
				return _p.reject (err);
			}
		);

	return _p.promise;
}

function make_remote_config (custom_config, host, remote_path, command) {
	/* ASK: what to hardcode and what not*/
	if (!custom_config || !custom_config.vm_config)
		return null;

	var config = {
		username 		: custom_config.vm_config.user,
		password 		: custom_config.vm_config.password,
		readyTimeout 	: 99999
	};
	if (!host)
		return null;
	if (!remote_path && !command)
		return null;

	config.host = host;

	if (remote_path)
		config.path = remote_path;
	if (command)
		config.command = command;

	return config;
}

function list_bots (custom_config, options) {
	var _p = promise.pending ();
	var p1 = vm.list_all (custom_config, options);
	var p2 = pool.get_all (options);

	promise.all ([ p1, p2 ]).then (
		function (__arr) {
			_p.resolve ({
				azure     : __arr[0],
				cached    : __arr[1],
				server_ts : moment().toISOString()
			});
		}
	)
	.catch (_p.reject.bind (_p));

	return _p.promise;
}

function delete_vms (cached, vms) {
	var p = promise.pending();
	var response = [];
	var count = vms.length;

	if (!count) {
		p.resolve (response);
		return p.promise;
	}

	function done (status, data) {
		var index = this;

		response.push ({
			name   : vms[index],
			status : status,
			err    : (status === 'ok' ? null : data)
		});
		count --;

		if (!count)
			return p.resolve (response);
	}

	for (var i = 0; i < vms.length; i++) {
		var __data = {
			custom_config : JSON.parse(JSON.stringify (cached)).custom
		};

		__data.custom_config.vm_config.name = vms[i];

		vm.delete_vm (__data)
			.then (
				done.bind(i, 'ok'),
				done.bind(i, 'error')
			);
	}

	return p.promise;
}

module.exports = recording;
