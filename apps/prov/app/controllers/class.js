var moment       = require('moment');
var log          = require('prov/app/common/log').child({ module: 'class_controller' });
var q_controller = require('prov/app/lib/q-controller');
var class_sched  = require('prov/app/lib/class-sched');
var sess         = require('prov/app/lib/session');
var resources    = require('prov/app/resources/controller');

var _class = {};


function validate_create_class_config (info) {
    if (!info.class_id ||
        !info.time_spec.starts ||
        !class_sched.validate_time(info.time_spec.starts)
       ) {
           return false;
       }
    return true;
}

_class.createconfig = function (req, res, next) {
    log.debug({ data: req.body }, 'create class config');
    var info = req.body;

    if (!validate_create_class_config (info)) {
		log.error({ error: 'invalid parameter(s)', class_id: req.body.class_id }, 'create class config error');
        return res.status(400).send({ error: 'Invalid classid or date parameter.' });
    }

    var start_time   = req.body.time_spec.starts;
	var advance_time = resources.estimate_provisioning_time (info);
	var __times      = class_sched.get_prov_time (start_time, advance_time);
    var config       = {
        class_id             : req.body.class_id,
        start_time           : start_time,
        provision_time       : __times.provision_time,
        estimated_start_time : __times.start_time,
    };

	log.info ({
		class_id             : req.body.class_id,
		provisioning_time    : moment.duration (moment(__times.provision_time).diff(moment())).asSeconds() + ' secs from now',
		estimated_start_time : moment.duration (moment(__times.start_time).diff(moment())).asSeconds() + ' secs from now',
	}, 'estimated times (relative)');

	q_controller.add_job (config)
		.then (
			function () {
				return res.status(200).send({ status: 'success', data: config });
			},
			function (error) {
				log.error({ error: error, class_id: req.body.class_id }, 'create class config error');
				return res.status(500).send({ status: 'create config failed for classid: ', data: req.body.class_id });
			}
		);
};

_class.getconfig = function (req, res, next) {

    if (!req.params.class_id) 
        return res.status(400).send('bad request : no class-id');

    var class_id = req.params.class_id;

    sess.get_class_conf (class_id)
        .then (function (data) {
            log.debug({ class_id : class_id }, 'get class config');

            return res.status(200).send(data);
        }).catch (function () {
            log.debug({ class_id : class_id }, 'Not found in cache');

            q_controller.get_job (class_id)
				.then (function (info) {

					var config = {};
					config.class_id  = info.class_id;
					config.state     = 'scheduled';
					config.time_spec = {
						starts               : info.start_time,
						provision_time       : info.provision_time,
						estimated_start_time : info.estimated_start_time
					};

					return res.status(200).send(config);

				}).catch (function () {
					return res.status(404).send('Not found');
				});
        });
};

/*
 * since we are only allowing time update info to be
 * sent to provisioning for an update, straightaway
 * update cache (invalide + add) for new time spec.
 * No need to check whether something invalid has come
 * since that has been taken care by backend
 * ( trusting backend :D ).
 * TODO : create an update method in q_controller
 */
_class.updateconfig = function (req, res, next) {

	log.debug({ data: req.body }, 'update class config');
    var info = req.body;

    var start_time   = req.body.time_spec.starts;
	var advance_time = resources.estimate_provisioning_time (info);
	var __times      = class_sched.get_prov_time (start_time, advance_time);
    var config       = {
        class_id          : req.body.class_id,
        start_time        : __times.start_time,
        provision_time    : __times.provision_time,
        start_time_orig   : start_time
    };

	q_controller.get_job (config.class_id)
		.then (function (info) {
			if (info.start_time === config.start_time) {
				log.info ('Not a call for start time update. No updation needed. Just send 200 OK');
				return res.status(200).send({ status: 'success', data: config });
			}
			update_queue (config, res);
		}).
		catch (function (error){
			send_error (res, class_id, error);
		});
};

function update_queue (config, res) {
	q_controller.remove_job(config.class_id, false)
		.then (q_controller.add_job.bind (null, config), send_error.bind (null, res, config.class_id))
        .then (function () {
            return res.status(200).send({ status: 'success', data: config });
        }).catch (function (error) {
			send_error (res, config.class_id, error);
        });
}

function send_error (res, class_id, error) {
	log.error({ error: error, class_id: class_id }, 'update class config error');
	return res.status(500).send({ status: 'update config failed for classid: ', data: class_id });
}


_class.removeconfig = function (req, res, next) {
    if (!req.params.class_id) {
        return res.status(400).send('Bad Request');
    }

    var class_id = req.params.class_id;

    q_controller.remove_job(class_id, true)
        .then (function () {
            return res.status(200).send({ status: 'success', data: req.body.class_id });
        }).catch( function (error) {
            log.error({ error: error, class_id: req.body.class_id }, 'delete_class_config');
            return res.status(404).send({ status: 'failed', data: req.body.class_id });
        });
};

module.exports = _class;
