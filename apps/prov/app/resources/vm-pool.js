var promise    = require('bluebird');
var moment     = require('moment');
var log        = require('prov/app/common/log').child({ module : 'resources/vm-pool' });
var cache      = require('prov/app/common/cache').init('prov-recbot-pool');
var vm         = require('prov/app/resources/azure');

var pool = {};

pool.add_vm = function (resource_config) {
	var p = promise.pending ();

	var class_id = resource_config.class_config.class_id;
	var sess_id  = resource_config.class_config.sess_id;

	var data = {
		class_id : class_id,
		sess_id  : sess_id,
		status   : 'creating',
		creation: {
			start_ts : moment().toISOString()
		}
	};

	cache.set (sess_id, JSON.stringify (data))
		.then (
			p.resolve.bind (p, resource_config),
			p.reject.bind (p)
		);

	return p.promise;
};

pool.update_vm = function (what, aggregate_create_vm) {
	var p = promise.pending ();

	var resource_config = aggregate_create_vm.resource_config;
	var class_id = resource_config.class_config.class_id;
	var sess_id  = resource_config.class_config.sess_id;

	cache.get (sess_id).then (
		function (_cached) {
			var val = JSON.parse (_cached);

			switch (what) {

				case 'vm-info' :
					val.status             = 'created';
					val.creation.create_ts = moment().toISOString();
					val.vm_info            = aggregate_create_vm;
					break;

				case 'bot-up' :
					val.status             = 'running';
					val.creation.up_ts     = moment().toISOString();
					break;

				default :
					log.error ({ what : what }, 'update_vm failed. unrecognized "what" parameter');
					return p.reject ('unknown update parameter');
			}

			cache.set (sess_id, JSON.stringify (val))
				.then (
					p.resolve.bind (p, aggregate_create_vm),
					function (err) {
						log.error ({ err : err, what : what, data : aggregate_create_vm, sess_id : sess_id, class_id : class_id }, 'update failed. cache error');
						return p.reject (err);
					}
				);
		},
		function (err) {
			log.error ({ err : err, what : what, data : aggregate_create_vm, sess_id : sess_id, class_id : class_id }, 'update failed. cache error');
			return p.reject (err);
		}
		);


	return p.promise;
};

pool.mark_error = function (resource_config, err) {
	var sess_id  = resource_config.class_config.sess_id;

	cache.get (sess_id).then (
		function (_cached) {
			var val = JSON.parse (_cached);

			val.status = 'error';
			val.error_detail = err;

			cache.set (sess_id, JSON.stringify (val));
			cache.expire (sess_id, 60*60*24); /* Keep the key around for 24 hours */
		},
		function (err) { /* what can we do here ? */ }
	);

	/* no promise */
};

pool.get_all = function (options) {
	var p = promise.pending ();

	cache.scan ('*').then (
		function (keys) {
			cache.mget (keys).then (
				function (data) {
					p.resolve (
						data.map (function (curr, index) {
							var __curr = JSON.parse (curr);
							var name = '-', ip = '-', dns = '-';

							if (__curr.vm_info) {
								name = __curr.vm_info.vm_info.name;

								if (__curr.vm_info.pip_info) {
									ip  = __curr.vm_info.pip_info.ipAddress;
									dns = __curr.vm_info.pip_info.dnsSettings;
								}
							}

							return {
								class_id : __curr.class_id,
								sess_id  : __curr.sess_id,
								status   : __curr.status,
								ts       : __curr.creation,
								name     : name,
								ip       : ip,
								dns      : dns
							};
						})
					);
				},
				p.reject.bind (p)
			);
		},
		p.reject.bind (p)
	);

	return p.promise;
};

module.exports = pool;
