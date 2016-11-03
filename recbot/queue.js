var $       = require ('jquery-deferred');
var kue     = require ('kue');
var events  = require ('events');
var domain  = require ('domain');
var log     = require ('common/log-middleware').child ({ 'sub_module' : 'queue'});
var upload  = require ('upload');

var queue = kue.createQueue();

var __queue = {};
var total_jobs = 0;
var emitter = new events.EventEmitter ();

__queue.create_upload_job = function (srcdirpath, __config, __filename,  __job_type) {
	var d = $.Deferred ();
	
	total_jobs ++;

	if (!__job_type)
		__job_type = 'upload';

	var job = queue.create (__job_type, {
		srcdirpath : srcdirpath,
		config     : __config,
		filename   : __filename,
	});

	log.debug ({ id : job.id, type : __job_type, file : __filename}, 'adding job');
	
	job.on ('complete', function (data) {
		complete_job ();
		log.info ({job_id : job.id }, 'job complete ok');
		return d.resolve ();
	});

	job.attempts(5).save();

	job.on ('failed attempt', function (err, attempts) {
		log.error ({ job_id : job.id, err : JSON.stringify (err, null, 2), attempts : attempts }, 'Job failed. re-attempting.');
	});

	job.on ('failed', function (err) {
		complete_job ();
		log.error ({ job_id : job.id, err : JSON.stringify (err, null, 2) }, 'Job failed finally');
		return d.reject (err);
	});

	job.on ('error', function (err) {
		log.error ({ job_id : job.id, err : err }, 'job error');
	});

	return d.promise ();
};

__queue.emitter = emitter;

function complete_job () {
	total_jobs --;

	if (!total_jobs)
		emitter.emit ('no-pending-jobs');
}

function callback (promise, total_jobs) {
	log.info ("all jobs completed");

	return promise.resolve(total_jobs);
}

queue.process ('upload', 5, function (job, done) {
	var srcdirpath = job.data.srcdirpath;
	var config     = job.data.config;
	var filename   = job.data.filename;
	var job_id     = job.id;
	var _domain    = domain.create();
	
	_domain.on ('error', function (err) {
		done (err);
	});

	_domain.run (function () {
		upload.start_upload_process (srcdirpath, config, job_id, filename)
			.then (
				function () {
					done ();
				},
				function (err) {
					done (err);
				}
			);
	});
});

queue.process ('dummy', function (job, done) {
	var _domain    = domain.create();
	
	_domain.on ('error', function (err) {
		done (err);
	});

	_domain.run (function () {
		setTimeout (function () {
			log.info ('dummmy job processed');
			return done ();
		}, 1000);
	});
});

queue.watchStuckJobs (1000);

queue.on ('job enqueue', function (id, type) {
	log.info ({ id : id, type : type }, "job added in queue");
});

queue.on ('job complete', function (id, result) {
	kue.Job.get (id, function (err, job) {  	
		if (err) 
			return;

		job.remove (function (err) {
			if (err) { 
				log.error ({ job_id : job.id, err : JSON.stringify (err, null, 2) }, 'job remove fail');
				throw err;
			}

			log.info ({ job_id : job.id }, 'job remove ok');
		});
	});
});

module.exports = __queue;
