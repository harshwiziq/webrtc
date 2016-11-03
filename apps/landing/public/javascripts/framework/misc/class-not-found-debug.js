var start_time;
var duration;
var timer;

$(document).ready(main);

function main () {
	start_time = moment.utc (backend_config.class_config.time_spec.starts).local ();
	duration   = backend_config.class_config.time_spec.duration * 60;
	fill_stuff();
}

function fill_stuff () {
	$('.starts').html(start_time.fromNow ());
	$('.scheduled_time').html(start_time.format('dddd, MMMM Do YYYY, h:mm:ss a'));
	$('td.duration').html(moment.duration(duration, 'seconds').humanize() + ' (' + duration + ' secs)');
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
