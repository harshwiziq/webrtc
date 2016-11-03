var log                  = require('api-backend/common/log').child({ module : 'controllers/landing' });
var c_config             = require('api-backend/models/class-config');
var c_controller         = require('api-backend/controllers/class');
var provisioning_profile = require('api-backend/models/provisioning-profile');


var controller = {};

controller.get = function (req, res, next) {
	var class_id = req.class_id;
	var config   = {class_id : class_id};

	c_config.get (config)
		.then (
			function (cc) {
				var prov_name = c_controller.extract_prov_name (cc) || 'default';
				provisioning_profile.get (prov_name)
					.then (
						function (result) {

							res.status(200).send({
								class_config : cc,
								prov_profile : result
							});
						},
						function (err) {
							res.status(err.status).send(err.message);
						}
					);
			},
			function (err) {
				res.status(err.status).send(err.message);
			}
		);
};

function get_default_prov_server (res) {
	provisioning_profile.get ('default')
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err){
			res.status(err.status).send(err.message);
		}
	);
}

module.exports = controller;
