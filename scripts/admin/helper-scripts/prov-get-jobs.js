var sprintf     = require ('sprintf-js').sprintf;
var colors      = require ('colors');
var moment      = require ('moment');
var argv        = require ('minimist')(process.argv.slice(2));
var startup     = require ('./startup')(argv.in_file, print_pretty);
var stdin       = process.stdin;
var stdout      = process.stdout;

function print_pretty (json) {
	var fmt_active      = '%-9s';
	var fmt_seq         = '%-4s';
	var fmt_id          = '%-4s';
	var fmt_class_id    = '%-15s';
	var fmt_start_ts    = '%-28s';
	var fmt_prov_ts     = '%-28s';
	var fmt_state       = '%-10s';
	var fmt_duration    = '%-10s';
	var fmt_delay       = '%-10s';

	/*
	 * print table header */
	stdout.write (sprintf (
			fmt_active + fmt_seq + fmt_id + fmt_class_id + fmt_start_ts + fmt_prov_ts + fmt_state + fmt_duration + fmt_delay + '\n',
			'', 'SEQ', 'ID', 'CLASS ID', 'START TS', 'PROVISION TS', 'STATE', 'DURATION', 'DELAY'
		).bold);

	var server_time = json.server_ts;
	var jobs        = sort_and_filter (json.jobs.active);

	for (var i = 0; i < jobs.length; i++) {
		var color_status = jobs_status_color (jobs[i].id.state);

		stdout.write (color_status (sprintf (
			fmt_active + fmt_seq + fmt_id + fmt_class_id + fmt_start_ts + fmt_prov_ts + fmt_state + fmt_duration + fmt_delay + '\n',
			'active',
			i,
			jobs[i].id.id,
			jobs[i].id.data.class_id,
			__date (server_time, jobs[i].id.data.start_time),
			__date (server_time, jobs[i].id.data.provision_time),
			jobs[i].id.state,
			__duration (jobs[i].id.duration),
			__duration (jobs[i].id.delay)
		)));
	}
}

function jobs_status_color (status) {
	switch (status) {
		case 'complete':
			return colors.dim;
		default:
			return colors.reset;
	}
}

function ago (now, ago_time) {
	var m_now = moment (now);
	var m_ago = moment (ago_time);

	return m_ago.from(m_now);
}

function __date (server_now, d) {
	if (argv.utc)
		return d;

	if (argv.relative)
		return ago (server_now, d);

	return moment(d).format('MMM DD hh:mm:ss A YYYY');
}

function __duration (d) {
	if (!d)
		return '!';

	var duration = moment.duration (parseInt(d), 'seconds');

	return sprintf ('%02s:%02s:%02s', duration.hours(), duration.minutes(), duration.seconds());
}

function sort_and_filter (jobs) {
	var sort_func = sortby_start_time;

	if (argv.provision)
		sort_func = sortby_provision_time;

	jobs.sort (sort_func);

	return jobs;
}

function sortby_start_time (a, b) {
	var a_date = moment(a.id.data.start_time);
	var b_date = moment(b.id.data.start_time);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}

function sortby_provision_time (a, b) {
	var a_date = moment(a.id.data.provision_time);
	var b_date = moment(b.id.data.provision_time);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}
