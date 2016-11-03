var $       = require ('jquery-deferred');
var homedir = require ('homedir');
var mkdirp  = require ('mkdirp');
var spawn   = require ('child_process').spawn;
var log     = require ('common/log-middleware').child ({ 'sub_module' : 'bot' });
var child   = require ('./child_process');

var bot = {};
var dir_recordings  = homedir() + '/recordings/';
var path_to_scripts = homedir() + '/recbot/scripts/'; 

bot.dir_recordings = dir_recordings;

bot.start_fb = function () {
	var d = $.Deferred ();

	var xvfb = child.spawn ('xvfb', path_to_scripts + 'start-xvfb.sh',
		{ 
			cwd : dir_recordings,
			env : {
				DISPLAY : 0,
				SCREEN  : 0
			},
			detached : true
		}).then (
			function (process_info) {
				log.info ({ 'process_info' : process_info }, 'spawned framebuffer process');
				d.resolve ();
			},
			function (err) {
				d.reject (err);
			}
		);

		return d.promise ();
};

bot.join_class = function (class_url, config) {
	var d = $.Deferred ();

	var join = child.spawn ('join class', path_to_scripts + 'join-class.sh',
		{
			cwd : dir_recordings,
			env : {
				__DISPLAY: 0,
				SCREEN   : 0,
				URL      : class_url,
			},
		}).then (
			function (process_info) {
				log.info ({ 'process_info' : process_info }, 'spawned join class process');
				d.resolve (config);		
			},
			function (err) {
				d.reject (err);
			}
		);

		return d.promise ();
};

bot.start_recording = function (count) {
	var d = $.Deferred ();
	var str = ""  + count;
	var pad = "000";
	var ans = pad.substring (0, pad.length - str.length) + str;

	var filename = 'capture_' + ans + '%03d.mkv';

	var start = child.spawn ('ffmpeg', path_to_scripts + 'start-ffmpeg.sh',
		{
			cwd : dir_recordings,
			env : {
				FILENAME : filename, 
			},
			detached : true
		}).then (
			function (process_info) {
				log.info ({ 'process_info' : process_info }, 'ffmpeg process started');
				d.resolve (process_info);
			},
			function (err) {
				d.reject (err);
			}
		);

		return d.promise ();
};

bot.make_directory = function () {
	var d = $.Deferred ();

	mkdirp (dir_recordings, function (err) {
		if (err) {
			d.reject (err);		   
			return d.promise ();
		}

		log.info (dir_recordings + " directory made successfully");
		d.resolve ();
	});

	return d.promise ();
};

module.exports = bot;
