var kue          = require('kue');
var moment       = require('moment');
var promise      = require('bluebird');
var cache        = require('prov/app/common/cache').init('prov-queue');
var log          = require('prov/app/common/log').child({ module: 'q_controller' });
var config       = require('prov/app/config/config');
var prov_emitter = require('prov/app/lib/prov-emitter');

var q_controller = {};
var queue;

q_controller.init = function () {
    var p = promise.pending();

    var options = {
        prefix: 'q',
        jobEvents: false,
        redis: {
            port : config.redis.port,
            host : config.redis.host
        }
    };

    queue = kue.createQueue(options);

    queue.watchStuckJobs(5000);

    queue.on('error', on_error);
    queue.on('job enqueue', on_job_enqueue);
    queue.on('job complete', on_job_complete);
    queue.on('job failed', on_job_failed);
    queue.on('job failed attempt', on_job_failed_attempt);
    queue.on('job progress', on_job_progress);
    queue.on('job promotion', on_job_promotion);
    queue.on('job remove', on_job_remove);

    p.resolve();
    return p.promise;
};

q_controller.add_job = function (__config) {
    var p = promise.pending();

    var data = {
        title                : 'sess sched',
        class_id             : __config.class_id,
        start_time           : __config.start_time,
        provision_time       : __config.provision_time,
        estimated_start_time : __config.estimated_start_time,
    };

    var job = queue.create('session_schedule', data)
				.delay (moment (__config.provision_time).toDate())
				.save(function (err) {

					if (err) {
						log.error({ error: err, class_id: data.class_id }, 'class schedule failed');
						return p.reject(err);
					}

					data.id = job.id;
					cache.set (data.class_id, JSON.stringify(data));

					return p.resolve(data.class_id);
				});

    log.debug ({ job: job, info: data }, 'class scheduled');

    return p.promise;
};

/*
 * REST interface via the admin route */
q_controller.get_all = function (req, res, next) {

	var jobs = {
		active : [],
		inactive : []
	};

	get_jobs (jobs.active)
		.then (function () {
			return res.send({
				server_ts : moment().toISOString(),
				jobs      : jobs
			});
		})
		.catch (function (err) {
			res.status(500).send(err);
		});
};

function get_jobs (jobs) {
    var p = promise.pending();

	kue.Job.range (0, -1, 'asc', function (err, ids) {
		if (err)
			return p.reject (err);

		ids.forEach(function (id) {
			kue.Job.get (id, function (err, job) {
				jobs.push({
					id   : id,
					data : err ? err : job
				});

				if (jobs.length == ids.length) { 
					return p.resolve ();
				}
			});
		});
	});

    return p.promise;
}

/*
 * remove job from queue.
 * Params :
 *        1. class_id    : class_id of entry to be removed.
 *        2. is_sess_end : if it is end of session or not
 */
q_controller.remove_job = function (class_id, is_sess_end) {
    var p = promise.pending();

    cache.get(class_id)
        .then (remove_job.bind (null, is_sess_end))
        .then (function () {
            p.resolve();
        }).catch (function (error) {
            log.info({ error: error, class_id: class_id }, 'remove: not found in job queue');
            p.reject(error);
        });

    return p.promise;
};

q_controller.get_job = function (class_id) {
    var p = promise.pending();

    cache.get(class_id)
        .then (function (data) {
            var info = JSON.parse(data);
            p.resolve(info);
        }).catch (function (error) {
            log.error({ error: error, class_id: class_id }, 'get class id not found in queue');
            p.reject(error);
        });

    return p.promise;
};

q_controller.shutdown = function () {
    log.info('q_controller shutdown in progress');
    queue.shutdown(5000, function (err) {
        log.debug({ error: err || '' }, 'Q shutdown');
    });
};

function on_error(err) {
    log.error({ error: err }, 'queue on_error');
}

function on_job_enqueue(id, type) {
    log.debug({ id: id, type: type }, 'on job enqueue');
}

function on_job_complete (id, result) {
    log.debug({ id: id, result: result }, 'on job complete');
}

/* remove job from cache */
function remove_job (is_sess_end, obj) {
    var p = promise.pending();

    var data = JSON.parse(obj);

    var info = {
        class_id : data.class_id
    };

	if (is_sess_end)
		prov_emitter.emit('class delete', info);

    cache.invalidate(info.class_id);

    if (!data.id) {
        log.debug({ data: data }, 'job id not found');
        p.resolve();
        return p.promise;
    }

    kue.Job.get(data.id, function (err, job) {
        if (err) {
            return p.reject(err);
        }
        job.remove(function (err) {
            if (err) {
                log.error({ err: err, data: data }, 'q job remove error');
                return p.reject(err);
            }
            return p.resolve();
        });
    });

    return p.promise;
}

function on_job_remove (id, type) {
    log.debug({ id: id, type: type }, 'on job remove');
}

function on_job_promotion (id) {
    log.debug({ id: id }, 'on job promotion');
}

function on_job_progress (id, progress, data) {
    log.debug({ id: id, progress: progress, data: data }, 'on job progress');
}

function on_job_failed_attempt (id, error, doneAttempts) {
    log.warn({ id: id, err: error, doneAttempts: doneAttempts }, 'on job failed attempt');
}

function on_job_failed (id, error) {
    log.error({ id: id, err: error }, 'on job failed');
}


prov_emitter.on('session ended', function (info) {
    if (info.class_id) {
        cache.invalidate(info.class_id);
    }
});

module.exports = q_controller;

