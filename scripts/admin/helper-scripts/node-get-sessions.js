var sprintf     = require ('sprintf-js').sprintf;
var colors      = require ('colors');
var moment      = require ('moment');
var argv        = require ('minimist')(process.argv.slice(2));
var startup     = require ('./startup')(argv.in_file, print_pretty);
var stdin       = process.stdin;
var stdout      = process.stdout;

function print_pretty (json) {
	var fmt_seq          = '%-4s|';
	var fmt_container_id = '%-14s|';
	var fmt_sess_id      = '%-32s|';
	var fmt_start        = argv.relative ? '%-16s|' : (argv.utc ? '%-32s|' : '%-26s|');
	var fmt_finish       = argv.relative ? '%-16s|' : (argv.utc ? '%-32s|' : '%-26s|');
	var fmt_state        = '%-20s|';
	var fmt_duration     = '%-16s|';
	var fmt_error        = '%-10s|';

	/*
	 * print table header */
	stdout.write (sprintf (
			fmt_seq + fmt_container_id + fmt_sess_id + fmt_start + fmt_finish + fmt_state + fmt_duration + fmt_error + '\n',
			'SEQ', 'CONTAINER', 'SESS ID', 'START', 'FINISH', 'STATE', 'DURATION', 'ERROR'
		).bold);

	var server_time = json.server_ts;
	var sessions    = sort_and_filter (json.sessions);

	for (var i = 0; i < sessions.length; i++) {
		var color_status = jobs_status_color (sessions[i]);
		var sess_id      = sessions[i].sess_info ? sessions[i].docker.Name.replace(/^\//g, '') : '!' + sessions[i].docker.Name;
		var state        = __get_state (sessions[i].docker.State);
		var __duration   = get_duration (sessions[i]);

		stdout.write (color_status (sprintf (
			fmt_seq + fmt_container_id + fmt_sess_id + fmt_start + fmt_finish + fmt_state + fmt_duration + fmt_error + '\n',
			i,
			sessions[i].docker.Id.replace(/^(.{12}).*$/g, "$1"),
			sess_id,
			__date (server_time, sessions[i].docker.State.StartedAt),
			get_finish_time (__duration, server_time, sessions[i].docker.State),
			state,
			__duration.humanized,
			sessions[i].docker.State.Error.length ? sessions[i].docker.State.Error : (
				sessions[i].err ? (
					typeof sessions[i].err === 'string' ? sessions[i].err : JSON.stringify (sessions[i].err)
				) : '.'
			)
		)));
	}
}

function get_finish_time (__duration, server_time, state) {
	if (!state.Running)
		return __date (server_time, state.FinishedAt);

	var _finish = moment (state.StartedAt).add (__duration.ideal);

	return __date (server_time, _finish.toISOString()) + '*';
}

function __get_state (_state) {
	if (_state.Running)
		return 'RUNNING';

	if (_state.OOMKilled)
		return 'OOM-KILLED';

	if (_state.Restarting)
		return 'RESTARTING';

	if (_state.Dead)
		return 'DEAD';

	if (_state.Error.length)
		return 'ERROR';

	return 'EXITED (' + _state.ExitCode + ')';
}

function get_duration_old (session) {
	if (!session.sess_info)
		return {
			humanized : '-'
		};

	var d = parseInt (session.sess_info.duration);
	var d1 = moment.duration (d, 'minutes');
	var s1 = d1.humanize();

	if (session.docker.State.Running)
		return {
			humanized : s1,
			ideal     : d1,
			actual    : actual_duration
		};

	var actual_duration = moment.duration (moment(session.docker.State.FinishedAt).diff(moment (session.docker.State.StartedAt)));
	var s2 = actual_duration.humanize ();

	return {
		humanized : s1 + '/' + s2,
		ideal     : d1,
		actual    : actual_duration
	};
}

function get_duration (session) {
	if (!session.sess_info)
		return {
			humanized : '-'
		};

	var d = parseInt (session.sess_info.duration);
	var d1 = moment.duration (d, 'minutes');

	if (session.docker.State.Running)
		return {
			humanized : __format_duration_dhm (d1),
			ideal     : d1,
			actual    : actual_duration
		};

	var actual_duration = moment.duration (moment(session.docker.State.FinishedAt).diff(moment (session.docker.State.StartedAt)));

	return {
		humanized : __format_duration_dhm (d1) + '/' + __format_duration_dhm (actual_duration),
		ideal     : d1,
		actual    : actual_duration
	};
}

function __format_duration_dhm (d) {
	var days  = d.days ();
	var hours = d.hours ();
	var mins  = d.minutes ();
	var s1 = (days ? days + 'd' : '') + (hours ? hours + 'h' : '') + (mins ? mins + 'm' : '');

	return s1;
}

function jobs_status_color (session) {
	if (session.docker.State.Running) {

		if (!session.sess_info)
			return colors.red;

		return colors.green;
	}

	if (!session.sess_info)
		return colors.dim;

	return colors.reset;
}

function ago (now, ago_time) {
	var m_now = moment (now);
	var m_ago = moment (ago_time);

	return m_ago.from(m_now);
}

function __date (server_now, d) {
	if (argv.relative)
		return ago (server_now, d);

	if (argv.utc)
		return d;

	return moment(d).format('MMM DD hh:mm:ss A YYYY');
}

function __duration (d) {
	if (!d)
		return '!';

	var duration = moment.duration (parseInt(d), 'seconds');

	return sprintf ('%02s:%02s:%02s', duration.hours(), duration.minutes(), duration.seconds());
}

function sort_and_filter (arr) {
	if (argv.finish)
		arr.sort (__sort.bind(null, __finish_time));
	else
		arr.sort (__sort.bind(null, __start_time));

	return arr;
}

function __start_time (a) {
	return a.docker.State.StartedAt;
}

function __finish_time (a) {
	return a.docker.State.FinishedAt;
}

function __sort (__get_time, a, b) {
	var a_date = moment (__get_time (a));
	var b_date = moment (__get_time (b));
	var reverse = argv.reverse ? -1 : 1;

	if (a_date.isBefore (b_date))
		return -1 * reverse;

	if (a_date.isAfter (b_date))
		return 1 * reverse;

	return 0;
}
