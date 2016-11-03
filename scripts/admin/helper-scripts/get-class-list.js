var sprintf     = require ('sprintf-js').sprintf;
var colors      = require ('colors');
var moment      = require ('moment');
var argv        = require ('minimist')(process.argv.slice(2));
var startup     = require ('./startup')(argv.in_file, print_pretty);
var stdin       = process.stdin;
var stdout      = process.stdout;

function print_pretty (json) {
	var fmt_seq         = '%-4s';
	var fmt_class_id    = '%-15s';
	var fmt_creation_ts = '%-28s';
	var fmt_start_ts    = '%-28s';
	var fmt_status      = '%-32s';
	var fmt_detail      = '%-32s';

	/*
	 * print table header */
	stdout.write (sprintf (fmt_seq + fmt_class_id + fmt_creation_ts + fmt_start_ts + fmt_status + fmt_detail + '\n', 'SEQ', 'CLASS ID', 'CREATION TS', 'START TS', 'STATUS', 'DETAIL').bold);

	var server_time = json.server_ts;
	var classes     = sort_and_filter (json.classes);

	for (var i = 0; i < classes.length; i++) {
		var color_status = class_status_color (classes[i].status);

		stdout.write (color_status (sprintf (fmt_seq + fmt_class_id + fmt_creation_ts + fmt_start_ts + fmt_status + fmt_detail + '\n', 
							   i + 1,
							   classes[i].class_id,
							   __date (server_time, classes[i].meta_info.creation_ts),
							   __date (server_time, classes[i].time_spec.starts),
							   classes[i].status,
							   classes[i].status_detail ? classes[i].status_detail : '-'
							  )));
	}
}

function class_status_color (status) {
	switch (status) {
		case 'created':
		case 'active':
		case 'started':
		case 'locked':
			return colors.green;

		case 'stopped':
		case 'failed':
		case 'launch_failed':
			return colors.red;

		case 'completed':
		case 'expired':
		case 'deleted':
			return colors.dim;
	}
	return colors.reset;
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

function sort_and_filter (classes) {
	var sort_func = sort_creation_date;

	if (argv.start)
		sort_func = sort_start_date;

	classes.sort (sort_func);

	return classes;
}

function sort_creation_date (a, b) {
	var a_date = moment(a.meta_info.creation_ts);
	var b_date = moment(b.meta_info.creation_ts);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}

function sort_start_date (a, b) {
	var a_date = moment(a.time_spec.starts);
	var b_date = moment(b.time_spec.starts);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}
