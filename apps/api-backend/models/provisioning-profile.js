/* provisioning profile CRUD operations */

var mylog         = require('api-backend/common/log').child({ module : 'models/provisioning-profile' });
var config_model  = require('api-backend/common/config-model');
var $             = require('jquery-deferred');

var model = {};

/* get provisioning profile */
model.get = function (prov_name) {
	var d = $.Deferred();
	config_model.provisioning_profile.findOne ({ "name" : prov_name }, function (err, profile) {

		if (err) {
			mylog.error ({ err : err }, 'provisioning profile get error ');
			return d.reject ({ message : err, status : 500 });
		}

		/* if returned profile empty */
		if (! profile) {
			mylog.error ({ Prov_name : prov_name, profile : profile }, "No entry in db");
			return d.reject ({ message : 'no such provisioning server', status : 404 });
		}

		d.resolve (profile);
	});

	return d.promise();
};

model.get_all = function () {
	var d = $.Deferred();
	config_model.provisioning_profile.find ({}, function (err, profile) {

		if (err) {
			mylog.error ({ err : err }, 'provisioning profile get_all error ');
			return d.reject ({ message : err, status : 500 });
		}

		/* if returned profile empty */
		if (!profile || (profile && !profile.length)) {
			return d.reject ({ message : 'no such provisioning server', status : 404 });
		}

		d.resolve (profile);
	});

	return d.promise();
};

/* add provisioning profile to db */
model.add = function (prov_profile) {
	var d = $.Deferred();
 	var model = config_model.provisioning_profile;

	model.findOneAndUpdate (
		{ name : prov_profile.name },
	   	prov_profile,
		{ upsert:true, new: true },
	   	function (err, doc) {
			if (err) {
				mylog.error ({ err : err, prov_profile : prov_profile }, 'provisioning profile save error');
				return d.reject ({ message : err, status : 500 });
			}
			
			mylog.info ({ prov_profile_doc : prov_profile }, 'provisioning profile_doc saved ok');
			d.resolve (prov_profile);			
	 	}
	);

	return d.promise();
};

model.remove = function (profile_name) {
	var d = $.Deferred();

	config_model.provisioning_profile.remove ({ name : profile_name }, function ( err, done ) {
		if (err) {
			mylog.error ({ err : err }, 'provisioning_profile remove error');
			return d.reject ({ message : err, status : 500 });
		}

		if (done && done.result && done.result.n) {
   			mylog.info ({ profile_name : profile_name }, 'provisioning profile removed ok');
			return d.resolve (profile_name);
		}

		mylog.error ({ Error :'No entry present in db' });
		d.reject ({ message : 'Remove unsuccessful', status : 404 });
	});

	return d.promise();
};

module.exports = model;

