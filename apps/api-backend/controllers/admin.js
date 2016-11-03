/* this will be populated more upon addition of functionality via ADMIN  
 * interface at API-BACKEND.
 */ 

var moment               = require('moment');
var perms_profile        = require('api-backend/models/perms-profile');
var resource_profile     = require('api-backend/models/resource-profile');
var provisioning_profile = require('api-backend/models/provisioning-profile');
var display_profile      = require('api-backend/models/display-profile');
var landing_profile      = require('api-backend/models/landing-profile');
var wiziq_end_pts        = require('api-backend/adaptors/wiziq/end-pts-model');
var wiziq_end_pts_cache  = require('api-backend/adaptors/wiziq/cache');
var config_model         = require('api-backend/common/config-model');

var controller = {};

/****************** provisioning profile related admin APIs **************/

controller.add_provisioning_profile = function (req, res, next) {
	var profile = req.body;
	provisioning_profile.add (profile)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

controller.remove_provisioning_profile = function (req, res, next) {
	var profile_name = req.params.name;
	provisioning_profile.remove (profile_name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);
};

controller.get_provisioning_profile = function (req, res, next) {
	var profile_name = req.params.name;
	var d;

	if (profile_name)
		d = provisioning_profile.get (profile_name);
	else
		d = provisioning_profile.get_all ();

	d.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);
};

/***************** resource profile related admin APIs *********i**************/

controller.add_resource_profile = function (req, res, next) {
	var profile = req.body;
	resource_profile.add (profile)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);

};

controller.remove_resource_profile = function (req, res, next) {
	var resource = req.params.name;
	resource_profile.remove (resource)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);
};

controller.get_resource_profile = function (req, res, next) {
	/*TODO : get profile name from request. Following is a bug */
	var resource_array = req.name;
	/* in get req we can have only 1 name, how to get
	 * entire array via GET call ? */
	resource_profile.get (resource_array)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);

};

/*************** perms profile related admin APIs **********************/
controller.add_perms_profile = function (req, res, next) {
	var profile = req.body;
	perms_profile.add (profile)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);
};

controller.remove_perms_profile = function (req, res, next) {
	var name = req.params.role;
	perms_profile.remove (name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);
};

controller.get_perms_profile = function (req, res, next) {
	var name = req.params.role;
	perms_profile.get (name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) { 
			res.status(err.status).send(err.message);
		}
	);
};

/*************** display profile related admin APIs **********************/
controller.add_display_profile = function (req, res, next) {
	var profile = req.body;
	display_profile.add (profile)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

controller.remove_display_profile = function (req, res, next) {
	var name = req.params.name;
	display_profile.remove (name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

controller.get_display_profile = function (req, res, next) {
	var name = req.params.name;
	display_profile.get (name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

/****************** landing profile related admin APIs **************/

controller.add_landing_profile = function (req, res, next) {
	var profile = req.body;
	landing_profile.add (profile)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

controller.remove_landing_profile = function (req, res, next) {
	var profile_name = req.params.name;
	landing_profile.remove (profile_name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

controller.get_landing_profile = function (req, res, next) {
	var profile_name = req.params.name;
	landing_profile.get (profile_name)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status).send(err.message);
		}
	);
};

/*************** wiziq end points related admin APIs **********************/

/*
 * TODO : May be manage wizIQ end points in adaptor itself. 
 *        Discussion needed 
 */

controller.add_wiziq_end_pts = function (req, res, next) {
    var end_pts = req.body;
    wiziq_end_pts.add (end_pts)
		.then (
			function (result) {
				wiziq_end_pts_cache.add (end_pts);
				res.status(200).send(result);
			},
			function (err) {
				res.status(err.status).send(err.message);
			}
		);
};

controller.remove_wiziq_end_pts = function (req, res, next) {
    wiziq_end_pts.remove ()
		.then (
			function (result) {
				wiziq_end_pts_cache.invalidate();
				res.status(200).send(result);
			},
			function (err) {
				res.status(err.status).send(err.message);
			}
		);
};

controller.get_wiziq_end_pts = function (req, res, next) {
    wiziq_end_pts.get ()
    	.then (
	        function (result) {
				res.status(200).send(result);
			},
			function (err) {
				res.status(err.status).send(err.message);
			}
		);
};

/*************** Class listing related admin APIs **********************/

controller.get_classes = function (req, res, next) {
	config_model.class_config.find ({ /* all classes */ }, function (err, classes) {

		if (err)
			return res.status(500).send(err);

		/*
		 * Add server time to the data */
		var data = {
			server_ts : moment().toISOString(),
			classes   : classes
		};

		return res.status(200).send(JSON.stringify(data));
	});

};

module.exports = controller;
