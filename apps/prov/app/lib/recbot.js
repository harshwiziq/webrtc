var promise = require('bluebird');
var log     = require('prov/app/common/log').child({ module: 'recbot' });

/*this path might change(make sure)*/
var vm      = require('recbot/prov/vm-controller');
var remote  = require('recbot/prov/remiote');
/*
 * Recbot resource provision module
 */

var recbot = {};

recbot.provision = function () {
	var _p = promise.pending();
	/*Dont know how i'll get this ... creating a function call for now*/
	var class_id = get_class_id ();

	/*config will be sent to createvm module with all required params*/
	var config = {
		/*VM info config*/
		location 				: 'southeastasia',
		resource_group_name 	: 'quicktestvm',
		class_id 				: class_id,

		/*VM user info*/
		admin_username : 'notadmin',
		admin_password : 'Pa$$w0rd'
	};
	/*
	 * Get the environment variables for azure login
	 */
	var env = get_env_params ();

	/*
	 * ASK wether to have seprate module for vm creation (as it is right now) 
	 * or copy everything here and have it as internal functionality of this module
	 */

	/*
	 * this will return a promise
	 */
	vm.createvm(env, config)
		.then(send_file.bind(null, 'path_to_file'),             _p.reject.bind(_p) )
		.then(execute_command.bind(null, 'command to execute'), _p.reject.bind(_p) )
		.then(_p.resolve.bind(_p),                              _p.reject.bind(_p) )
	;
	/*
	 * IMPORTANT
	 * what structure to return to provision module ?
	 * or What to do on success provisioning of recbot
	 */

	return _p.promise;
};

recbot.deprovision = function (_vm_name) {
	var _p = promise.pending();
	/*Delete the vm here and other related resources
	 * this call will be made after recbot sends a 'KILL_ME' rest call
	 * this call will require the class id of the bot or VM name of the recbot
	 * assuming VM name for now coz thats what recbot will know(might not remember what class he is in)
	 */

	/* getting env params fro vm operations*/
	var env = get_env_params();
	/* will also require resource_group
	 * hardcoded, till specified otherwise (get clarity over this)
	 */
	var resource_group = 'quicktestvm';

	vm.delete_vm (env, resource_group, _vm_name)
	.then (
		function (result) {
			_p.resolve(result);
		},
		function (err) {
			_p.reject(err);
		});

	return _p.promise;
};

function send_file (file_path, _vm_info, _pip_info) {
	var _p     = promise.pending();
	var config = make_remote_config (_pip_info.ipAddress, './', null);

	if(!config){
		_p.reject ('bad remote config');
		return _p.promise;
	}

	remote.send_file (file_path, config, function (err) {
		if (err)
			return _p.reject(err);
		return _p.resolve(_vm_info, _pip_config);
	});

	return _p.promise;
}

function execute_command (command, _vm_info, _pip_config) {
	var _p = promise.pending();
	var config = make_remote_config (_pip_info.ipAddress, null, command);

	if(!config){
		_p.reject ('bad remote config');
		return _p.promise;
	}

	remote.execute(config).then(
		function (result) {
			return _p.resolve(_vm_info, _pip_config);
		},
		function (err) {
			return _p.reject(err);
		}
	);

	return _p.promise;
}

function make_remote_config (host, remote_path, command) {
	/* ASK: what to hardcode and what not*/
	var config = {
		username 		: 'notadmin',
		password 		: 'Pa$$w0rd',
		readyTimeout 	: 99999
	};
	if (!host)
		return null;
	config.host = host;

	if (remote_path)
		config.path = remote_path;
	if (command)
		config.command = command;
	if (!path & !command)
		return null;

	return config;
}

function get_class_id () {
	/*do something here to get class id
	 * in order to generate resource names
	 * returning hardcoded value for now
	 */
	var class_id = 'testbot';

	return class_id;
}

function get_env_params () {
	/*
	 * get env params here for azure operations
	 * returning hardcoded value for now
	 */

	/*Environment Setup*/
	var env = {
		clientId       : '3a6fef4f-260f-4f22-bc0a-76103bdf808a',
		secret         : 'D2AWzBBBIgFLUmI8knhnp9vy7t8dSI5P9eJPtZRUKXw=',
		tenant         : '5cdf4c95-1f37-4ed0-a405-394586360a69',
		subscriptionId : '2fbd666a-5e12-4329-b180-8dee5a56c353',
	};

	return env;
}

module.export = recbot;
