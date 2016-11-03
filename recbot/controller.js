var $          = require ('jquery-deferred');
var fs         = require ('fs');
var fse        = require ('fs-extra');
var request    = require ('request');
var kill       = require ('tree-kill');
var is_running = require ('is-running');
var homedir    = require ('homedir');
var log        = require ('common/log-middleware').child ({ 'sub_module' : 'controller'});
var bot        = require ('bot');
var queue      = require ('queue');
var upload     = require ('upload');

var controller = {};
var filelist   = [];
var ffmpeg_pid;
var filename;
var __config, __res;

var count            = 0;
var pending_jobs     = 0;
var srcdirpath       = homedir() + '/recordings/';
var destdirpath      = homedir() + '/upload/';
var state            = 'stopped';
var class_in_session = true;
var poll_interval    = 10 * 1000;

queue.emitter.on ('no-pending-jobs', function () {
	pending_jobs = 0;

	log.info ('received no-pending_jobs');

	if (state !== 'ended')
		return;

	log.info ('received no-pending_jobs - moving forward');

	upload.make_metainfo_file (__config, filelist)
		.then ( upload.finally_upload               )
		.then ( send_killme.bind (null, __config)   )
		.then ( function () {
			log.info ("this should be the end of our woes");
		});
});

controller.start = function (req, res, next, config) {
	__config = config;

	if (state == 'recording')
		return res.status(200).send ('recording already happening');

	bot.start_recording (count)
		.then (
			function (_info) {
				state      = 'recording';
				ffmpeg_pid = _info.process_id;
				res.status(200).send ('recording started');
			},
			function (err) {
				res.status (500).send ('error while starting recording');
			}
		);
};

controller.stop = function (req, res, next, config) {
	count ++;

	if (state == 'stopped')
		return res.status(200).send ('recording iss already stopped');

	stop_process ()
		.then (
			function () {
				state = 'stopped';
				res.status(200).send ('recording stopped');
			},
			function () {
				res.status(500).send ('Error while stopping the recording process');
			}
		);
};

controller.end = function (req, res, next, config) {
	check_upload_process (config)
		.then ( end_class,                      __reject.bind (null, res, 'check_upload_process') )
		.then ( __resolve.bind (null, res),     __reject.bind (null, res, 'set_class_state'     ) )
	;
};

function end_class () {
	var d = $.Deferred();

	class_in_session = false;

	d.resolve();
	return d.promise();
}

setInterval(poll_recordings, poll_interval);

function poll_recordings () {

	get_recordings ()
		.then (get_file_info)
		.then (get_file_to_exclude)
		.then (move_file_for_upload)
		.then (create_upload_jobs)
	;
}

function get_recordings() {
	var d = $.Deferred();

	fs.readdir (srcdirpath, function (err, files) {
		if (err) { 
			log.error ({dir : srcdirpath, err : err}, 'error reading directory');
			return d.reject(err);
		}
		log.debug({files : files}, 'file list');
		return d.resolve(files);
	});

	return d.promise();
}

function get_file_info (files) {
	var d = $.Deferred();
	var how_many_done = 0;
	var file_stats = {};
	var total_files= files.length;

	if (!files || !files.length){
		d.resolve(file_stats);
		log.debug('no recordings found');
		return d.promise();
	}

	for (var i = 0 ; i < files.length ; i++) {
		var file_path = srcdirpath + files[i];
		fs.stat(file_path, __set_stats.bind(null, files[i]));
	}

	function __set_stats (file, err, stats) {
		how_many_done ++;

		if (err)
			log.error ({file : file ,err : err}, 'error reading file stats');
		if (!err)
			file_stats[file] = stats;
		if (how_many_done == files.length)
			return d.resolve(file_stats, total_files);
	}

	return d.promise();
}

function get_file_to_exclude (file_stats, total_files) {
	var d = $.Deferred();
	
	var file_to_exclude = null;
	var latest_modified = null;

	for (var file in file_stats) {
		if (!file_to_exclude)
			file_to_exclude = file;
		if (!latest_modified) {
			latest_modified = file_stats[file].mtime.toISOString();
			continue;
		}
		if (file_stats[file].mtime.toISOString() > latest_modified) {
			file_to_exclude = file;
			latest_modified = file_stats[file].mtime.toISOString();
		}
	}

	d.resolve(file_stats, file_to_exclude, total_files);
	return d.promise();
}

function move_file_for_upload (file_stats, file_to_exclude, total_files) {
	var d = $.Deferred();
	var how_many_done   = 1;
	var files_to_upload = [];

	if(!class_in_session) {
		file_to_exclude = null;
		how_many_done   = 0;
	}

	for (var file in file_stats) {
		var source = srcdirpath  + file;
		var dest   = destdirpath + file;	

		if (file !== file_to_exclude) {
			fse.move(source, dest, __move.bind(null, file));
		}
	}

	function __move (file, err) {
		how_many_done ++;

		if (err) {
			log.error({file : file, src : src, dest : dest}, 'error moving file');
		}
		if (!err) {
			log.debug({file : file}, 'moved mentione file');
			files_to_upload.push(file);
		}
		if (how_many_done == total_files) {
			d.resolve(files_to_upload);
		}
	}

	return d.promise();
}

function create_upload_jobs (files_to_upload) {
	var d = $.Deferred();

	for (var i = 0 ; i < files_to_upload.length ; i++) {
		filelist.push(files_to_upload[i]);
		queue.create_upload_job (srcdirpath, __config, files_to_upload[i]);
	}

	if (!class_in_session)
		state    = 'ended';

	log.info({files : files_to_upload}, 'files queued for uploading');
	d.resolve();
	return d.promise();
}


function add_dummy_job (config) {
	return queue.create_upload_job (null, null, null, 'dummy');
}

function __resolve (res) {
	res.status(200).send ('recording end ok');
}

function __reject (res, str) {
	log.error ("error : process : " + str);
	res.status(500).send ('error in ' + str);
}

function __error (str, err) {
	log.error ('error : ' + str + ' : ' + err);
	this.reject ();
}

function check_upload_process (config) {
	var d = $.Deferred ();

	if (is_running (ffmpeg_pid)) {

		stop_process ()
			.then ( d.resolve.bind (d, config),                                           __error.bind (d, 'end : check_upload_process : stop_process') );
	}
	else {
		d.resolve (config);
	}

	return d.promise ();
}

function stop_process () {
	var d = $.Deferred ();

   	log.debug ({ pid : ffmpeg_pid }, 'attempting to kill ffmpeg');

	kill (ffmpeg_pid, 'SIGINT', function (err) {
		if (err) {
			log.error ("error while stopping the process ===> ", ffmpeg_pid);
			return d.reject (err);
		}

		log.info ({ pid : ffmpeg_pid }, 'ffmpeg stop ok');
		return d.resolve ();
	});

	return d.promise ();
}

function send_killme (config) {
	var d = $.Deferred ();

	log.info ({ config : config }, 'sending killme message to provisioning');

	var prov = config.custom_config.prov_config;
	var url  = prov.protocol + "://" + prov.host + ":" + prov.port + "/prov/v1/config/resource/recording/action"; 

	var data = {
		action  : 'kill',
		data    : config,
	};

	request.post ({
		uri            : url,
		strictSSL      : false,
		'Content-Type' : 'application/json',
		json           : data
	});
	
	d.resolve ();

	return d.promise ();
}

module.exports = controller ;
