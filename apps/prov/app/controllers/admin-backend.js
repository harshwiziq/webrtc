var log            = require('prov/app/common/log').child({ module : 'controllers/backend'});
var backend_api    = require('prov/app/lib/backend-api');
var backend_config = require('prov/app/config/backend');

var backend_controller = {};

backend_controller.create_config = function (req, res, next) {
    var info = req.body;

	backend_config.update (info)
		.then (
			function (result) {
				log.info ({ input : info }, 'create backend config ok');
				return res.status (200).send ({ data : result });
			},
			function (error) {
				log.error ({ error: error, req_data: info }, 'create backend config failed');
				return res.status(error.code).send({ error : error.message });
			}
		);
};

backend_controller.get_config = function (req, res, next) {
	var config = null;

	try {
		config = backend_config.get ();
	}
	catch (e) {
		return res.status (500).send (e);
	}

	return res.status (200).send (config);
};

backend_controller.update_config = function (req, res, next) {
	return backend_controller.create_config (req, res, next);
};

backend_controller.remove_config = function (req, res, next) {

	backend_config.remove ()
		.then (
			function (result) {
				log.info ('remove backend config ok');
				return res.status (200).send ({ data : result });
			},
			function (error) {
				log.error ({ error: error }, 'remove backend config failed');
				return res.status(error.code).send({ error : error.message });
			}
		);
};

module.exports = backend_controller;
