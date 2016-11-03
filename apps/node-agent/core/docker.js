var $               = require('jquery-deferred');
var fs              = require('jquery-deferred');
var Docker          = require('dockerode');
var moment          = require('moment');
var fs              = require('fs');
var config          = require('node-agent/common/config').docker;
var log             = require('node-agent/common/log').child ({ module : 'core/docker' });

var docker	= new Docker ();

function init () {
	var _d = $.Deferred ();

	fs.access (config.sess_info_dir, fs.W_OK, function (err) {
		if (err) {
			log.fatal ({ err : err, path : config.sess_info_dir }, 'sessions directory not writeable');
			return _d.reject (err);
		}

		return _d.resolve ();
	});

	return _d.promise ();
}

function start (sess_id, info) {
	var _d 		= $.Deferred();
	var image	= config.image;
	var port	= config.internal_port;
	var sess_dir = config.sess_dir;
	var sess_mount = config.sess_mount;
	var sess_info_dir = config.sess_info_dir;
	var sess_info_mount = config.sess_info_mount;

	var cmd = [];
	cmd.push ("/bin/sh");
	cmd.push ("-c");
	cmd.push ("cd " + sess_mount +"; node server.js " + sess_info_mount + sess_id );

	var opts = {
		Binds		: [ sess_dir + ":" + sess_mount,  sess_info_dir + ":" + sess_info_mount ],
		PortBindings : {
			"3179/tcp": [{}]
		},
		ExposedPorts: { 
			'3179/tcp': {}
		} ,
		name		: sess_id ,
	};

	if (info.labels){
		/*
		 * ensure all the values have a type string
		 * it says bool is not allowed, can't say if a number is */
	}
	opts.Labels = info.labels || {} ;
	/*
	 * class id is an additional label
	 * to what provisioning is sending
	 * added for the ease of finding a docker
	 * when on terminal i.e. via docker ps. */
	if (info.class_id)
		opts.Labels[info.class_id] = "class_id";

	if (info.docker && info.docker.sess_image)
		image = info.docker.sess_image;

	log.debug ({image: image}, 'using docker image');

	var dock = docker.run (image, cmd, process.stdout, opts,
	   	function (err, data, container) {		/* not called immediately if no error */
			if (err) {
		   		_d.reject(err);
				return;
		   	}
		});
	dock.on ('container',function (container) {
		var data = {
			sess_id  	: sess_id,
			container_id	: container.id
		};
		_d.resolve (data);
	});
	
	return _d.promise();
}

function stop (sess_id) {			// sess_id is same as container_name
	var _d = $.Deferred();
	var container = docker.getContainer (sess_id);
	
	container.stop (function (err, data) {
		if (err && err.statusCode !== 304){
				_d.reject (err);
				return;
		}
		// error code 304 means docker is already stopped. Hence we will just remove it.
		if (err && err.statusCode === 304) {
			remove (sess_id);
		}
		// else the container will be removed on receiving docker stop event
		
		log.debug ({err:err, data: data}, 'docker stop callback');
		_d.resolve({sess_id: sess_id});
	});

	return _d.promise();
}

function remove (id) {		// id can either be container_name or container_id
	var container = docker.getContainer(id);
	// 'if !container' is handled implicitely 
	container.remove (function (err,data) {
		log.debug({ err:err, data: data}, 'container remove callbak');
	});
}

function list (){
	var _d = $.Deferred(); 
	var _d_array = [];
	var dockers_info = [];
	var opts = { all: true };		 
	
	docker.listContainers (opts, function (err, containers) {
		if (err) {
			_d.reject (err);
			return ;
		}

		containers.forEach (function (container) {
			_d_array.push ( __inspect_session (container) );
	  	});

		$.when.apply ($, _d_array)
			.then (
				function () {
					/*
					 * Consolidate all arguments to a single array */
					var args = Array.prototype.slice.call(arguments);

					return _d.resolve ({
						server_ts : moment().toISOString(),
						sessions  : args
					});
				}
			);
	});

	return _d.promise ();
}

function __inspect_session (container) {
	var _d = $.Deferred ();
	var _c = docker.getContainer (container.Id);

	_c.inspect (function (err, container_data) {
		var sess_id, sess_file;
		var data_of_interest = {
			State : container_data.State,
			Name  : container_data.Name,
			Id    : container_data.Id,
		};

		try {
			if (!container_data.Volumes['/info'])
				throw 'likely not a session docker';

			sess_id   = container_data.Name.replace (/^\//g, '');
			sess_file = container_data.Volumes['/info'] + '/' + sess_id;
		}
		catch (e) {
			/*
			 * This is likely some other, non-session docker. Mark error and move on */
			return _d.resolve ({
				err    : e,
				id     : container.Id,
				docker : data_of_interest
			});
		}

		/*
		 * Get the session info from the "session.info" file */
		fs.readFile (sess_file, 'utf-8', function (__err, __sess_info) {
			var sessinfo = null;

			if (__err) {
				log.error ({ err : __err, sess_file : sess_file }, 'error reading session info file');
				return _d.resolve ({
					err       : __err.code ? __err.code : __err,
					id        : container.Id,
					docker    : data_of_interest,
					sess_info : null
				});
			}

			try { sessinfo = JSON.parse (__sess_info); }
			catch (e) {
				log.error ({ container : container.Id, err : e }, 'session info unparseable');
			}

			return _d.resolve ({
				err       : __err,
				id        : container.Id,
				docker    : data_of_interest,
				sess_info : sessinfo
			});

		});
	});

	return _d.promise ();
}

module.exports = {
	init : init,
	docker : docker,
	start : start ,
	stop  : stop,
	remove: remove,
	list  : list
};
