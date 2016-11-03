var sprintf     = require ('sprintf-js').sprintf;
var colors      = require ('colors');
var moment      = require ('moment');
var argv        = require ('minimist')(process.argv.slice(2));
var startup     = require ('./startup')(argv.in_file, print_pretty);
var stdin       = process.stdin;
var stdout      = process.stdout;

var map_cached_vms = {};
var field_s = argv.fs ? ' |' : '';

function print_pretty (json) {
	var fmt_seq         = '%-4s'  + field_s;
	var fmt_class_id    = '%-15s' + field_s;
	var fmt_sess_id     = '%-30s' + field_s;
	var fmt_vmname      = '%-28s' + field_s;
	var fmt_state       = '%-10s' + field_s;
	var fmt_ip          = '%-18s' + field_s;
	var fmt_start_ts     = argv.relative ? '%-16s' + field_s : (argv.utc ? '%-32s' + field_s : '%-26s' + field_s);
	var fmt_up_ts        = argv.relative ? '%-16s' + field_s : (argv.utc ? '%-32s' + field_s : '%-26s' + field_s);

	json.cached.forEach (function (curr, index) {
		var vm_name = curr.name === '-' ? '-' + guid () : curr.name;
		map_cached_vms [ vm_name ] = curr;
	});

	/* Just a check */
	if (Object.keys (map_cached_vms).length != json.cached.length) {
		stdout.write (colors.red ('code bug ! map length not equal to array length. do not trust the output\n'));
		stdout.write (colors.reset (JSON.stringify (map_cached_vms, null, 2)));
		process.exit (1);
	}

	/*
	 * print table header */
	stdout.write (sprintf (
			fmt_seq + fmt_class_id + fmt_sess_id + fmt_vmname + fmt_state + fmt_ip + fmt_start_ts + fmt_up_ts + '\n',
			'SEQ', 'CLASS ID', 'SESS ID', 'STATUS', 'STATE', 'IP', 'START', 'UP'
		).bold);

	var server_time = json.server_ts;
	var color_status;
	var start_ts, up_ts;

	/*
	 * First print all the lines from Azure */
	for (var i = 0; i < json.azure.length; i++) {
		var name     = json.azure[i].name;
		var state    = json.azure[i].state;
		var oink     = map_cached_vms [ name ];
		var class_id = oink ? map_cached_vms [name].class_id : '!';
		var sess_id  = oink ? map_cached_vms [name].sess_id : '!';
		var ip       = oink ? map_cached_vms [name].ip : '!';

		start_ts = oink ? __date (server_time, map_cached_vms [name].ts.start_ts) : '!';
		up_ts    = oink ? __date (server_time, map_cached_vms [name].ts.up_ts) : '!';

		color_status = jobs_status_color (state, oink);

		stdout.write (color_status (sprintf (
			fmt_seq + fmt_class_id + fmt_sess_id + fmt_vmname + fmt_state + fmt_ip + fmt_start_ts + fmt_up_ts + '\n',
			i + 1,
			class_id,
			sess_id,
			name,
			state,
			ip,
			start_ts,
			up_ts
		)));

		delete map_cached_vms [name];
	}

	if (argv.nostale)
		return;

	/*
	 * Now print all the other remaining lines */
	var header = false;
	var arr = sort_map (map_cached_vms);

	//for (var key in map_cached_vms) {
	for (var j = 0; j < arr.length; j++) {
		var data = arr[j];
		start_ts = data.ts.start_ts ? __date (server_time, data.ts.start_ts) : '!';
		up_ts    = data.ts.up_ts    ? __date (server_time, data.ts.up_ts) : '!';

		i++;

		if (!header) {
			stdout.write ('\n(stale entries)\n\n'.dim);
			header = true;
		}

		color_status = jobs_status_color2 (data.status, true);

		stdout.write (color_status (sprintf (
			fmt_seq + fmt_class_id + fmt_sess_id + fmt_vmname + fmt_state + fmt_ip + fmt_start_ts + fmt_up_ts + '\n',
			i,
			data.class_id,
			data.sess_id,
			data.name,
			data.status,
			data.ip,
			start_ts,
			up_ts
		)));
	}
}

function jobs_status_color (status, oink) {
	if (!oink)
		return colors.red;

	switch (status) {
		case 'Succeeded':
			return colors.green;
		default:
			return colors.red;
	}
}

function jobs_status_color2 (status, oink) {
	if (!oink)
		return colors.red;

	switch (status) {
		case 'running':
			return colors.green;
		case 'created':
			return colors.dim;
		case 'creating':
			return colors.red;
		default:
			return colors.red;
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

function guid() {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function sort_map (map) {
	var keys = Object.keys (map);
	var arr = keys.map (function (curr, index) {
				return map [ curr ];
			});

	var sort_func = sort_by_start_ts;

	if (argv.start)
		sort_func = sort_by_up_ts;

	arr.sort (sort_func);

	return arr;
}

function sort_by_start_ts (a, b) {
	var a_date = moment(a.ts.start_ts);
	var b_date = moment(b.ts.start_ts);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}

function sort_by_up_ts (a, b) {
	var a_date = moment(a.ts.up_ts);
	var b_date = moment(b.ts.up_ts);
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}
