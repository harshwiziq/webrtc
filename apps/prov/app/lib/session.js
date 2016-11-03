var moment            = require('moment');
var promise           = require('bluebird');
var cache_cconf       = require('prov/app/common/cache').init('prov-class-config');
var cache_csess       = require('prov/app/common/cache').init('prov-sess-config');
var resources         = require('prov/app/resources/controller');
var config            = require('prov/app/config/config');
var config_controller = require('prov/app/lib/config-controller');
var backend_api       = require('prov/app/lib//backend-api');
var log               = require('prov/app/common/log').child({ module: 'lib/session' });
var prov_emitter      = require('./prov-emitter');

var session = {};

function check_class_config (conf) {
    if (!conf ||
		!conf.resources ||
		 conf.resources.length === 0 ||
		!conf.attendees ||
		!conf.attendees.max_attendees
	   )
		   return false;

    return true;
}

session.save_class_conf = function (state, sess_id, class_conf) {
	var class_id = class_conf.class_id;

    var p = promise.pending();

    class_conf.sess_id = sess_id;
    class_conf.state   = state;

    cache_cconf.set (class_id, JSON.stringify (class_conf))
		.then (
			function () {
				p.resolve (class_conf);
			},
			function (error) {
				p.reject (error);
			});

	/* 
	 * update the status on the backend. Dont' care (for now), if the status
	 * doesn't really get updated there */
    backend_api.set_class_status (class_id, state, null)
        .catch (function (err) {
            log.error ({
                class_id : class_id,
                state    : state,
                err      : err
                }, 'class state change notify to backend failed'
            );
        });

    return p.promise;
};

session.update_class_state = function (class_id, state) {
	var p = promise.pending();

    cache_cconf.get (class_id)
		.then (
			function (__data) {
				var class_config = JSON.parse (__data);
				class_config.state = state;
				cache_cconf.set (class_id, JSON.stringify(class_config));
				return p.resolve (class_config);
			},
			function (err) {
				return p.reject (err);
			}
		);
	
	/* 
	 * update the status on the backend. Dont' care (for now), if the status
	 * doesn't really get updated there */
    backend_api.set_class_status (class_id, state, null)
        .catch (function (err) {
            log.error ({
                class_id : class_id,
                state    : state,
                err      : err
                }, 'class state change notify to backend failed'
            );
        });

	return p.promise;
};

session.prepare_sess_conf = function (sess_id, provisioining_result) {
    var p            = promise.pending();
	var class_conf   = provisioining_result.class_conf;
	var resource_arr = provisioining_result.resource_arr;

    if (!check_class_config (class_conf)) {
        p.reject ('invalid class config, no resource or attendee info present');
        return p.promise;
    }

    var sess_conf = {
		sess_id       : sess_id,
		class_id      : class_conf.class_id,
		start_time    : class_conf.time_spec.estimated_start_time,
		duration      : class_conf.time_spec.duration,
		attendees     : class_conf.attendees,
		resources     : resource_arr,
		perms         : class_conf.perms
	};

    sess_conf.common = {};

    sess_conf.git    = resources.get ('git');
    sess_conf.docker = resources.get ('docker');

    p.resolve (sess_conf);
    return p.promise;
};

session.save_sess_conf = function (sess_conf) {
    var p = promise.pending();

    var sess_id = sess_conf.sess_id;

    var data = {
        sess_id   : sess_id,
        class_id  : sess_conf.class_id,
        resources : session.get_resource_name_list (sess_conf)
    };

    cache_csess.set (sess_id, JSON.stringify (data))
		.then (
			function () { return p.resolve (sess_conf); },
			function (err) { return p.reject (err); }
		);

    return p.promise;
};


session.get_resource_name_list = function (sess_config) {
    var res_name = [];

    if (!sess_config || !sess_config.resources || sess_config.resources.length === 0) {
        return null;
    }

    for ( var i = 0; i < sess_config.resources.length; i++ ) {
        if (sess_config.resources[i].name) {
            res_name.push(sess_config.resources[i].name);
        }
    }

    return res_name;
};

session.get_class_conf = function (class_id) {
    var p = promise.pending();

    if (!class_id) {
        log.error ('null class_id for');
        p.reject('null class_id');
        return p.promise;
    }

    cache_cconf.get (class_id)
        .then (function (data) {
            var class_conf = JSON.parse(data);
            p.resolve(class_conf);
        }).catch (function (err) {
            log.debug({ err: err, class_id : class_id }, 'Get class config cache failed');
            p.reject(err);
        });

    return p.promise;

};

session.get_all_classes = function (req, res, next) {

    cache_cconf.scan ('*')
        .then (function (classes) {

			promise.map (classes, function (class_id) {
				return session.get_class_conf (class_id);
			})
			.then (function () {
				var data = Array.prototype.slice.call(arguments);

				return res.send ({
					server_ts : moment().toISOString(),
					classes   : data[0]
				});
			});

        }).catch (function (err) {
            log.debug({ err: err, class_id : class_id }, 'Get all classes (from cache) failed');
            return res.status(500).send(err);
        });
};

/*
 * state = 'starting'|'started'|'failed'|'stopping'|'stopped'|'not found'
 *          'active'|'completed'|'expired';
 *
 * Flush the class config and other data (except session keys and secrets) to
 * log which can be processed later.
 */
session.on_state_change = function (addr, sess_id, state, info) {
    var p = promise.pending();

    cache_csess.get (sess_id)
        .then (function (data) {

            var sess_conf = JSON.parse(data);
            var class_id = sess_conf.class_id;

            cache_cconf.get (class_id)
				.then (function (__data) {
					var class_conf = JSON.parse (__data);
					class_state_change (addr, sess_id, state, class_conf, info);
				})
				.catch (function (err) {
					log.debug({ sess_id: sess_id, state: state, err: err }, 'error: class get from cache');
					return p.reject (class_id + ': could not find config in cache');
				});

        }).catch (function (err) {
            log.debug({ sess_id: sess_id, state: state, err: err }, 'error: session get from cache');
			return p.reject (sess_id + ': could not find session in cache');
        });

		return p.promise;
};

session.internal_fail = function (class_id, sess_id, err) {
    var state = 'launch_failed';
    cleanup (class_id, sess_id, state, err);
};


function class_state_change (sess_host, sess_id, state, class_conf, info) {

    var curr_state = class_conf.state;
	log.info ({ class_id : class_conf.class_id }, 'class state change "' + curr_state + '" --> "' + state + '"');

    class_conf.state = state;

    switch (state) {
        case 'waiting-to-start':
            on_session_waiting_to_start (class_conf, sess_host, info);
            break;

        case 'started':
			class_conf.time_spec.actual_start_time = info.actual_start_time;
			cache_cconf.set (class_conf.class_id, JSON.stringify (class_conf));
            break;

        case 'active':
            break;

        case 'stopping':
            break;

        case 'stopped':
            on_session_end (class_conf);
            break;

        case 'completed':
            on_session_end (class_conf);
            break;

        case 'failed':
            on_session_end (class_conf);
            break;

        case 'expired':
            on_session_end (class_conf);
            break;

        default:
            log.warn({ sess_id: sess_id, current_state: curr_state, new_state: state }, 'invalid state');
            return;
    }

	/* 
	 * update the status on the backend. Dont' care (for now), if the status
	 * doesn't really get updated there */
    backend_api.set_class_status (class_conf.class_id, state, null, info)
        .catch (function (err) {
            log.error ({
                class_id : class_conf.class_id,
                state    : state,
                err      : err
                }, 'class state change notify to backend failed'
            );
        });
}


function on_session_waiting_to_start (class_conf, sess_host, info) {
    class_conf.sess_host_url  = sess_host.protocol + '://' + sess_host.host;
    class_conf.sess_host_url += sess_host.port ? ':' + sess_host.port : '';

    class_conf.session_server = {
		protocol : sess_host.protocol,
		host     : sess_host.host,
		port     : sess_host.port,
		ssl      : sess_host.protocol.trim() === 'https' ? true : false
	};
	class_conf.docker = info.docker;

    cache_cconf.set (class_conf.class_id, JSON.stringify (class_conf));
}

function on_session_end (class_conf) {
    var class_id = class_conf.class_id;
    var sess_id = class_conf.sess_id;
    var state = class_conf.state;

    cleanup(class_id, sess_id, state);

    log.debug({ class_id: class_id, state: state, conf: class_conf }, 'class dump');
}

function cleanup (class_id, sess_id, state, err) {

    cache_csess.invalidate (sess_id);
    cache_cconf.invalidate (class_id);

    var info = {
        sess_id  : sess_id,
        class_id : class_id
    };

    prov_emitter.emit('session ended', info);
}

module.exports = session;
