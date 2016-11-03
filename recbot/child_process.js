var $      = require ('jquery-deferred');
var log    = require ('common/log-middleware').child ({ 'sub_module' : 'child process' });
var spawn  = require ('child_process').spawn;
var exec   = require ('child_process').exec;

var child = {};

child.spawn = function (process_name, args, options) {
	var d = $.Deferred ();

	var process = spawn ('sh', [args], options);

	var process_info = {
		process_name : process_name,
		process_id   : process.pid
	};

	/*
	 *      * Monitoring the child process */
	process.on ('exit', function (code) {
		d.reject (code);
	});

	d.resolve (process_info);

	process.on ('error', function (err) {
		log.error ('Error : ' + process_name + ' : ' + err);
	});

	process.stdout.on ('data', function (_data) {
		var data = _data.toString ('utf8', 0);
		log.info (process_name + ' : ' + data);
	});

	process.stderr.on ('data', function (_data) {
		var data = _data.toString ('utf8', 0);
		log.info (process_name + ' : ' + data);
	});

	return d.promise ();
};

child.exec = function (command, package_name) {
	var d = $.Deferred();
	
	log.info ("Checking package", package_name);

	var process = exec (command, function (err, stdout, stderr) {

		switch (package_name) {
			case 'xvfb' :
				if (err.code == 127) {
					d.reject (package_name + ' not found');
					break;
				}

				log.info (package_name + " is available");
				d.resolve();
				break;

			default :
				if (!stdout) {
					d.reject (package_name + ' not found');
					break;
				}

				log.info (package_name + " is available");
				d.resolve();
				break;
		}
	});

	return d.promise ();
};

module.exports = child;
