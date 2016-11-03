var kue     = require ('kue');
var domain  = require ('domain');
var promise = require ('bluebird');
var log     = require ('prov/app/common/log').child({ module : 'resources/queue' });
var vm      = require ('prov/app/resources/azure');

var queue = kue.createQueue();

var __queue = {};

__queue.create_delete_job = function (__job_type, aggregate_create_vm) {
    var d = promise.pending ();

	var resource_config = aggregate_create_vm.resource_config;
	var __config = resource_config;

	/*
	 * Add a few things */
	__config.custom_config.vm_config.name = aggregate_create_vm.vm_info.name;

    if (!__job_type)
        __job_type = 'delete_vm';

    var job = queue.create (__job_type, {
	        config     : __config,
	    }).delay(6 * 60 * 60 * 1000);

	job.attempts(5).save();

	log.debug ({ id : job.id, type : __job_type, config : __config }, 'adding job');

	job.on ('complete', function (data) {
		log.info ({job_id : job.id }, 'job complete ok');
	});

    job.on ('failed attempt', function (err, attempts) {
	        log.error ({ job_id : job.id, err : JSON.stringify (err, null, 2), attempts : attempts }, 'Job failed. re-attempting.');
	    });

    job.on ('failed', function (err) {
	        log.error ({ job_id : job.id, err : JSON.stringify (err, null, 2) }, 'Job failed finally');
	    });

    job.on ('error', function (err) {
	        log.error ({ job_id : job.id, err : err }, 'job error');
	    });

	
	d.resolve (aggregate_create_vm);
    return d.promise;
};

queue.process ('delete_vm', 5, function (job, done) {
	var config     = job.data.config;
	var job_id     = job.id;
	var _domain    = domain.create();

	_domain.on ('error', function (err) {
		done (err);
	});

	_domain.run (function () {
		vm.delete_vm (config)
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

module.exports = __queue;
