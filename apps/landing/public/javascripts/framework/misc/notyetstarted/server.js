define(function(require) {
	var moment = require('moment');
	var log    = require('./log')('server', 'info');
	var xhr    = require('./xhr');

	var server = {};
	var server_sync_local_time;
	var start_time;
	var start_m;
	var class_duration;
	var clock_offset;
	var timer;

	server.init = function () {
		/*
		 * NOTE: "sess_config" and "server_time" are embedded in the JADE template */
		server_sync_local_time = moment ();
		start_time             = (
			sess_config.time_spec.estimated_start_time ||
			sess_config.time_spec.provision_time ||
			sess_config.time_spec.starts
		);
		start_m                = moment (start_time).local ();
		class_duration         = sess_config.time_spec.duration * 60;
		clock_offset           = calc_clock_offset (server_time, server_sync_local_time);

		timer = setInterval (server.update_offset, 10*60*1000);
	};

	server.start_time_local = function () {
		return start_m.format('dddd, MMMM Do YYYY, h:mm:ss a');
	};

	server.class_duration = function () {
		return moment.duration(class_duration, 'seconds').humanize();
	};

	server.time_to_start = function () {
		return moment (start_time).subtract (clock_offset).fromNow ();
	};

	server.clock_offset = function () {
		return moment (clock_offset).unix ();
	};

	server.time = function () {
		var last_sync            = moment.duration (moment().diff (server_sync_local_time));
		var last_server_time     = moment (server_time);
		var probable_server_time = last_server_time.add (last_sync);

		return probable_server_time.utc().format ('MMMM Do YYYY, h:mm:ss a') + ' UTC';
	};

	server.time_before_start_m = function () {
		var now = moment ().add (clock_offset);
		return moment.duration (start_m.diff (now));
	};

	server.time_to_start_hhmmss_old = function () {
		var duration = server.time_before_start_m ();
		var time_str = '';

		if (duration.asSeconds() > 0) {
			var seconds = pad(duration.seconds(), 2);
			time_str = seconds + time_str;
		}

		if (duration.asMinutes() > 0) {
			var minutes = pad(duration.minutes(), 2);
			time_str = minutes + ':' + time_str;
		}

		if (duration.asHours() > 0) {
			var hours = pad(duration.hours(), 2);
			time_str = hours + ':' + time_str;
		}

		if (duration.asDays() > 1) {
			var days = pad(duration.days(), 0);
			time_str = days +' days, ' + time_str;
		}

		return time_str;
	};

	server.time_to_start_hhmmss = function () {
		var duration = server.time_before_start_m ();
		var time_str = '';

		var seconds = pad(Math.abs(duration.seconds()), 2);
		time_str = seconds + time_str;

		var minutes = pad(Math.abs(duration.minutes()), 2);
		time_str = minutes + ':' + time_str;

		var hours = pad(Math.abs(duration.hours()), 2);
		time_str = hours + ':' + time_str;

		if (Math.abs(duration.days()) > 0) {
			var days = pad(Math.abs(duration.days()), 0);
			time_str = days +' days, ' + time_str;
		}

		if (duration.asSeconds() < 0)
			time_str = '-' + time_str;

		return time_str;
	};

	server.update_offset = function () {
		var t0 = moment ();

		xhr.get ('/landing/time/server-time')
			.then(
				function (data) {
					var t1 = moment ();
					log.info ('data = ', data);
					server_time = data.response_data.server_time;
					start_m     = moment (start_time).local ();

					var mid = (t0.valueOf() + t1.valueOf())/2;
					server_sync_local_time = moment (mid);
					clock_offset = calc_clock_offset (server_time, server_sync_local_time);
					log.info ('clock sync : offset ' + (2* clock_offset.valueOf ()) + ', synced on ' + server_sync_local_time.utc ().toISOString () + ', server time ' + server_time);
				}
			);
	};

	server.stop = function () {
		clearInterval (timer);
	};

	function calc_clock_offset (server_time, last_sync_time) {
		return moment (server_time).diff (last_sync_time);
	}

	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}

	return server;
});
