var sprintf     = require ('sprintf-js').sprintf;
var colors      = require ('colors');
var moment      = require ('moment');
var argv        = require ('minimist')(process.argv.slice(2));
var startup     = require ('./startup')(argv.in_file, print_pretty);
var stdin       = process.stdin;
var stdout      = process.stdout;

var field_s = argv.fs ? ' |' : '';

function print_pretty (json) {
	var fmt_seq         = '%-4s'  + field_s;
	var fmt_class_id    = '%-15s' + field_s;
	var fmt_sess_id     = '%-30s' + field_s;
	var fmt_status      = '%-10s' + field_s;
	var fmt_state       = '%-10s' + field_s;
	var fmt_node        = '%-14s' + field_s;
	var fmt_start_ts    = argv.relative ? '%-16s' + field_s : (argv.utc ? '%-32s' + field_s : '%-26s' + field_s);

	/*
	 * print table header */
	stdout.write (sprintf (
			fmt_seq + fmt_class_id + fmt_sess_id + fmt_status + fmt_state + fmt_node + fmt_start_ts + '\n',
			'SEQ', 'CLASS ID', 'SESS ID', 'STATUS', 'STATE', 'NODE', 'START'
		).bold);

	var server_time = json.server_ts;
	var classes     = sort_and_filter (json.classes);

	for (var i = 0; i < classes.length; i++) {
		var color_status = jobs_status_color (classes[i].state);
		var start_time = '-';

		if (classes[i].time_spec && classes[i].time_spec.starts)
			start_time = __date (server_time, classes[i].time_spec.starts);


		stdout.write (color_status (sprintf (
			fmt_seq + fmt_class_id + fmt_sess_id + fmt_status + fmt_state + fmt_node + fmt_start_ts + '\n',
			i,
			classes[i].class_id,
			classes[i].sess_id,
			classes[i].status,
			classes[i].state,
			classes[i].session_server ? classes[i].session_server.host : '!',
			start_time
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

function sort_and_filter (classes) {

	sort_func = sort_start_date;

	classes.sort (sort_func);

	return classes;
}

function sort_start_date (a, b) {
	if (!a.time_spec || !b.time_spec)
		return -1 * reverse;

	var a_date = moment(a.time_spec.starts);
	var b_date = moment(b.time_spec.starts);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}
