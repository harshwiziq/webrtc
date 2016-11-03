var log         = require('prov/app/common/log').child({ module : 'controllers/prov'});
var prov_config = require('prov/app/config/prov');

var prov_controller = {};

prov_controller.create_config = function (req, res, next) {
    var info = req.body;

	prov_config.update (info)
		.then (
			function (result) {
				return res.status (200).send ({ data : result });
			},
			function (error) {
				log.error ({ error: error, req_data: info }, 'create prov config failed');
				return res.status(error.code).send({ error : error.message });
			}
		);
};

prov_controller.get_config = function (req, res, next) {
	var config = null;

	try {
		config = prov_config.get ();
	}
	catch (e) {
		return res.status (500).send (e);
	}

	return res.status (200).send (config);
};

prov_controller.update_config = function (req, res, next) {
	return prov_controller.create_config (req, res, next);
};

prov_controller.remove_config = function (req, res, next) {

	prov_config.remove ()
		.then (
			function (result) {
				log.info ('remove prov config ok');
				return res.status (200).send ({ data : result });
			},
			function (error) {
				log.error ({ error: error }, 'remove prov config failed');
				return res.status(error.code).send({ error : error.message });
			}
		);
};

module.exports = prov_controller;
