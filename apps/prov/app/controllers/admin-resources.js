var log              = require('prov/app/common/log').child({ module : 'controllers/resources'});
var controller       = require('prov/app/resources/controller');

var resource = {};

resource.create_config = function (req, res, next) {
    var info = req.body;

	controller.update (info)
		.then (
			function (result) {
				return res.status (200).send (result);
			},
			function (error) {
				return res.status (500).send (error);
			}
		);
};

resource.custom_action = function (req, res, next) {
    var name = req.params.name;
	var data = req.body;

	controller.custom_action (name, data)
		.then (
			function (result) {
				return res.status (200).send (result);
			},
			function (error) {
				return res.status (500).send (error);
			}
		);
};

resource.get_config = function (req, res, next) {
	var r_name = req.params.name;
	var config = null;
	var method = 'get';

	if (!r_name)
		method = 'get_all';

	config = controller[method] (r_name);
	if (!config)
		return res.status (500).send ('no config for ' + r_name);

	return res.status (200).send (config);
};

resource.get_variant = function (req, res, next) {
	var r_name = req.params.name;
	var attrib = req.params.attrib;

	controller.get_variant (r_name, attrib, req.query)
		.then (
			function (data) { return res.status (200).send (data); },
			function (err)  { return res.status (500).send (err); }
		);
};

resource.update_config = function (req, res, next) {
	return resource.create_config (req, res, next);
};

resource.remove_config = function (req, res, next) {

	controller.remove ()
		.then (
			function (result) {
				return res.status (200).send (result);
			},
			function (error) {
				return res.status (500).send (error);
			}
		);
};

module.exports = resource;
