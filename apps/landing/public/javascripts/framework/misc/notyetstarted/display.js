define(function(require) {
	var $      = require('jquery');
	var moment = require('moment');
	var log    = require('log')('display', 'info');
	var server = require('server');
	var xhr    = require('xhr');

	var display = {};
	var scheduled_time = $('span.scheduled_time');
	var duration       = $('td.duration');
	var secondary      = $('h2.secondary');
	var countdown      = $('.countdown');
	var clock_offset   = $('td.clock_offset');
	var server_time    = $('td.server_time');
	var local_time     = $('td.local_time');
	var loading        = $('.loading');
	var timer;

	display.fill = function () {
		scheduled_time.html (server.start_time_local ());
		duration.html (server.class_duration ());

		display.update ();
		timer = setInterval (display.update, 1000);
	};

	display.update = function () {
		var reload_after = 1;

		secondary.html (server.time_to_start ());
		local_time.html (moment().utc().format ('MMMM Do YYYY, h:mm:ss a') + ' UTC');
		countdown.html (server.time_to_start_hhmmss ());
		clock_offset.html (server.clock_offset () + ' secs');
		server_time.html (server.time ());

		if (server.time_before_start_m ().asSeconds() <= 0) {

			secondary.html ('just about now');
			loading.css('display', 'inline-block');
			countdown.css('display', 'none');

			server.stop ();
			clearInterval (timer);

			check_status_and_load_class (1);
		}
	};

	/*
	 * Iteratively call the get_status until the class starts. The following
	 * is not really a good method, as it makes recursive calls. Need to improve
	 * this. */
	function check_status_and_load_class (try_count) {
		var reload_after;

		get_status (try_count)
			.then (
				function (res) {

					console.log ('state = ' + res.response_data.state);

					if (res.response_data.state !== 'started')
						return check_status_and_load_class (try_count + 1);

					/*
					 * The class has started. Reload this page */
					clearInterval (timer);
					setTimeout (function () { location.reload(); }, 1000);
				},
				function (err) {
					return check_status_and_load_class (try_count + 1);
				}
			);
	}

	function get_status (try_count) {
		/* Get a random # between 1 and twice the try count */
		var reload_after = Math.floor((Math.random() * (2 * try_count)) + 1);
		var _d = $.Deferred ();

		setTimeout (
			function () {
				xhr.get (location.pathname + '/status' + location.search)
					.then (
						_d.resolve.bind (_d),
						_d.reject.bind (_d)
					);
			},
			reload_after * 1000
		);

		return _d.promise ();
	}

	return display;
});

