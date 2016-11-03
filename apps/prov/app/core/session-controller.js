var promise      = require('bluebird');
var moment       = require('moment');
var kue          = require('kue');
var uuid         = require('node-uuid');
var cache        = require('prov/app/common/cache').init('prov-class-config');
var log          = require('prov/app/common/log').child( { module: 'session-controller' });
var backend_api  = require('prov/app/lib/backend-api');
var session      = require('prov/app/lib/session');
var resources    = require('prov/app/resources/controller');
var lb           = require('prov/app/lib/balancer');
var prov_emitter = require('prov/app/lib/prov-emitter');

var controller = {};
var queue;

controller.init = function () {
	queue = kue.createQueue ({ jobEvents: false });

	queue.process ('session_schedule', 1000, function (job, done) {
		var class_id = job.data.class_id;
		var sess_id  = generate_sess_id (class_id);

		log.info ('*---------- class kue fired --------------------*');
		log.info ('* class id              : ' + job.data.class_id);
		log.info ('* configured start time : ' + moment (job.data.start_time).utc().toISOString());
		log.info ('* provision time        : ' + moment (job.data.provision_time).utc().toISOString());
		log.info ('* estimated start time  : ' + moment (job.data.estimated_start_time).utc().toISOString());
		log.info ('* start time difference : ' + moment.duration (moment (job.data.estimated_start_time).diff (job.data.start_time)).asSeconds() + ' secs');
		log.info ('*-----------------------------------------------*');

		log.debug ({
			class_id : class_id,
			sess_id  : sess_id }, 'starting session provisioning');

		start_session (sess_id, job.data)
			.then (
				function () { done (); },
				function () { done (); }
			)
			.catch (function (e) {
				log.error ({ err : e }, 'unhandled exception caught at start_session');
				return p.reject (e);
			})
		;
	});
};

function generate_sess_id (class_id) {
    return class_id + '-' + moment().format ('YYMMDD.HHmmss.SSS');
}

function start_session (sess_id, data) {
	var class_id = data.class_id;

    var p = promise.pending();

    backend_api.lock_class_config (class_id)
        .then ( backend_api.get_class_config.bind (null, class_id),           fail.bind (p, 'lock class', class_id))
        .then ( update_times.bind (null, data),                               fail.bind (p, 'get class conf', class_id))
        .then ( session.save_class_conf.bind (null, 'provisioning', sess_id), fail.bind (p, 'update times', class_id))
        .then ( resources.provision,                                          fail.bind (p, 'save sess conf (provisioning)', class_id, sess_id))
        .then ( session.prepare_sess_conf.bind (null, sess_id),               fail.bind (p, 'resource provisioning', class_id, sess_id))
        .then ( session.save_sess_conf.bind (null),                           fail.bind (p, 'prepare sess conf', class_id, sess_id))
        .then ( lb.route.bind (null, 'start_session'),                        fail.bind (p, 'save sess conf', class_id, sess_id))
        .then (
			/*
			 * Everything succeeded */
			function (sess_conf) {
				log.info ({ class_id : class_id, sess_id : sess_id }, 'provisioning ok. moving to "starting" state');

				session.update_class_state (class_id, 'starting')
					.then (
						p.resolve.bind (p),
						fail.bind (p, 'update class state (starting)', class_id, sess_id)
					);
			},
			fail.bind (p, 'lb route', class_id, sess_id)
		)
		.catch (function (e) {
			log.error ({ err : e }, 'unhandled exception in provision/recording');
			return p.reject (e);
		})
	;

    return p.promise;
}

function update_times (data, class_config) {
	var p = promise.pending();

	class_config.time_spec.provision_time       = moment (data.provision_time).toISOString();
	class_config.time_spec.estimated_start_time = moment (data.estimated_start_time).toISOString();

	p.resolve (class_config);

	return p.promise;
}

function fail (msg, class_id, sess_id, err) {
    log.error({ class_id: class_id, sess_id: sess_id, error: err }, 'start_session failed at ' + msg);

    session.internal_fail (class_id, sess_id, err);

	/* 
	 * update the status on the backend. Dont' care (for now), if the status
	 * doesn't really get updated there */
    backend_api.set_class_status (class_id, 'launch_failed', 'stage (' + msg + ') : ' + err)
        .catch (function (__err) {
            log.error ({
                class_id : class_id,
                state    : state,
                err      : __err
                }, 'failed to update backend on launch_failed'
            );
        });
    this.reject(err);
}

prov_emitter.on('class delete', function (info) {
    log.debug({ info: info }, 'class delete request');

    var class_id = info.class_id;

    cache.get (class_id)
    .then (function (data) {

        var info = JSON.parse(data);

        stop_session (info);

    }).catch (function (error) {
        log.debug({ error: error, class_id: class_id }, 'class config cache miss');
    });

});

function stop_session (info) {

    if (!info.sess_host_url || !info.sess_id) {
        log.debug('session id or session host url not found in cache');
        return;
    }

    var data = {
        sess_id: info.sess_id
    };

    lb.route_direct(info.sess_host_url, 'stop_session', data)
        .then (function () {
        }).catch (function (err) {
            log.error({ err: err, class_id: info.class_id, sess_id: info.sess_id }, 'stop session failed');
        });
}

module.exports = controller;
