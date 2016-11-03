var $ 	 	   = require ('jquery-deferred');
var fs 	 	   = require ('fs');
var moment     = require ('moment');
var mkdirp     = require ('mkdirp');
var log    	   = require ('common/log-middleware').child ({ 'sub_module' : 'setup' });
var crypt      = require ('common/crypt');
var bot        = require ('bot');
var upload     = require ('upload');
var child      = require ('./child_process');

var recbot_setup = {};

recbot_setup.setup = function () {
	var d = $.Deferred ();

	read_config_file ()
		.then ( self_check_packages,                          d.reject.bind(d, 'read_config_file'         ) ) 
		.then ( make_directory.bind (null, 'recordings'),     d.reject.bind(d, 'self_check_packages'      ) ) 
		.then ( make_directory.bind (null, 'upload'),         d.reject.bind(d, 'make_directory_recording' ) ) 
		.then ( start_fb,                                     d.reject.bind(d, 'make_directory_upload'    ) ) 
		.then ( join_class,                                   d.reject.bind(d, 'start_framebuffer'        ) ) 
		.then ( d.resolve.bind(d),                            d.reject.bind(d, 'join_class'               ) ); 

	return d.promise ();
};

function read_config_file () {
	var d = $.Deferred ();

	log.debug ("reading config file");

	fs.readFile ('/tmp/config.json','utf8', function (err, data) {
		if (err)
			return d.reject (err);

		var config = JSON.parse (data);
		return d.resolve (config);		
	});

	return d.promise ();	
}

function self_check_packages (config) {
	var d = $.Deferred ();

	log.debug ("entered self check");

	child.exec ('Xvfb -version', 'xvfb')
		.then ( child.exec.bind (null, 'google-chrome -version', 'google-chrome'),   d.reject.bind (d))
		.then ( child.exec.bind (null, 'ffmpeg -version', 'ffmpeg'),                 d.reject.bind (d))
		.then ( d.resolve.bind  (d, config),                                         d.reject.bind (d));

	return d.promise ();	
}

function make_directory (module, config) {
	var d = $.Deferred ();
	var __module;

	log.debug ("making directory", module);

	switch (module) {
		case 'recordings' : __module = bot; break;
		case 'upload' : __module = upload; break;
		default :
			d.reject ('incorrect module name');
			return d.promise ();
	}

	__module.make_directory ().then (
		d.resolve.bind (d, config),
		d.reject.bind (d)
	);

	return d.promise ();
}


function start_fb (config) {
	var d = $.Deferred ();

	log.debug ("starting frame buffer");
	
	var start_fb = bot.start_fb ()
		.then (
			function (data) {
				d.resolve (config);
			},
			function (err) {
				d.reject ('starting framebuffer + : ' +  err);
			}
		);

	return d.promise();
}

function join_class (config) {
	var d = $.Deferred ();

	log.debug ("joining class");

	var url = create_landing_url (config);
	log.info ('landing url --> ' + url);

	return bot.join_class (url, config);
}

function create_landing_url (config) {
	var now = moment().toISOString();

	var str = {
		ts      : now,
		name    : config.custom_config.login_id,
		display : 'Recorder'
	}; 

	var cipher    = crypt.encipher ('private_url', JSON.stringify (str, null, 2));
	var class_url = config.class_config.urls.anon + '?profile=noav&auth_via=private&e=' + cipher + '&av_publish=false';
		
	return class_url;
}

module.exports = recbot_setup;
