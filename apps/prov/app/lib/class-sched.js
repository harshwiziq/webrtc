var moment = require('moment');
var config = require('prov/app/config/config');
var log = require('prov/app/common/log').child({ module: 'class-sched' });

var class_sched = {};

var sched_advance = config.prov.session.sched_advance || 600000;
var sched_delay = config.prov.session.sched_delay || 5;
var past_time_interval = 120;

/* ------------------------------------------------------------------
 *
 * validate time: checks if time arg is in ISOString format
 * some buffer is kept for allowing elapsed time.
 * Reject timestamp which exceeds this buffer interval
 *
 * ----------------------------------------------------------------*/

class_sched.validate_time = function (start_time_iso) {
    var start_time = moment(start_time_iso);

    if (!start_time.isValid()) {
        log.error({ start_time: start_time_iso }, 'incorrect format');
        return false;
    }

    var diff = moment.duration(start_time.diff (moment())).asMilliseconds();

    if (diff < 0 && Math.abs(diff) > past_time_interval*1000) {
        log.error({
			diff      : diff,
			past_time : past_time_interval * 100,
			start_time: start_time_iso,
			curr_time : moment().utc()
		}, 'incorrect time in past');
        return false;
    }

    return true;
};

/* ------------------------------------------------------------------
 *
 * sched_advance: session provisioning should start before a
 * configurable time interval. Default is 10 mins/600 secs
 *
 * sched_delay: for sessions that are to be started within
 * sched_advance interval, provisioning is not started immediately,
 * but after this time interval. Default is 5 seconds
 * This is done to provide time to API Backend to prepare
 * class data
 *
 * ----------------------------------------------------------------*/

class_sched.get_prov_time = function (start_time_iso, advance_time) {
    var prov_time, start_time;
	var __times = {};

    var _start_ = moment(start_time_iso);
    var diff    = _start_.diff(moment());

    if ((diff > 0 && diff < advance_time) || diff < 0) {
		/*
		 * The class start time is either in the past or is too near and we don't have enough
		 * time to provision (advance_time) things. Postpone the class in the future to allow
		 * us to provision for it properly. Start provisioning now. */
        start_time = moment().add (advance_time, 'milliseconds').utc().toISOString();
		return {
			start_time     : start_time,
			provision_time : moment ()
		};
    }

	prov_time = moment (start_time_iso).subtract (advance_time, 'milliseconds').utc().toISOString();

	return {
		start_time     : _start_,
		provision_time : prov_time
	};
};

module.exports = class_sched;
