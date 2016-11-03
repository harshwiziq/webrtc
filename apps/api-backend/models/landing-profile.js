/* landing profile CRUD operations */

var mylog         = require('api-backend/common/log').child({ module : 'models/landing-profile' });
var config_model  = require('api-backend/common/config-model');
var $             = require('jquery-deferred');

var model = {};

/* get landing profile */
model.get = function (name) {
	var d = $.Deferred();
	var query = {};

	if (name)
		query.name = name;

	config_model.landing_profile.find (query, function (err, profile) {

		if (err) {
			mylog.error ({ name : name, err : err }, 'landing profile get error ');
			return d.reject ({ message : 'landing profile : ' + err, status : 500 });
		}

		/* if returned profile empty */
		if (! profile || ! profile.length) {
			return d.reject ({ message : 'landing profile "' + name + '" not found', status : 404 });
		}

		d.resolve (profile);
	});

	return d.promise();
};

/* add landing profile to db */
model.add = function (landing_profile) {
	var d = $.Deferred();
	var model = config_model.landing_profile;

	model.findOneAndUpdate (
		{ name : landing_profile.name },
		landing_profile,
		{ upsert:true, new: true },
		function (err, doc) {
			if (err) {
				mylog.error ({ err : err, landing_profile : landing_profile }, 'landing profile save error');
				return d.reject ({ message : err, status : 500 });
			}

			mylog.info ({ landing_profile_doc : landing_profile }, 'landing profile_doc saved ok');
			d.resolve (landing_profile);
		}
	);

	return d.promise();
};


model.remove = function (profile_name) {
	var d = $.Deferred();

	config_model.landing_profile.remove ({ name : profile_name }, function (err, done) {
		if (err) {
			mylog.error ({ err : err }, 'landing_profile remove error');
			return d.reject ({ message : err, status : 500 });
		}

		if (done && done.result && done.result.n) {
   			mylog.info ({ profile_name : profile_name }, 'landing profile removed ok');
			return d.resolve (profile_name);
		}

		mylog.error ({ Error :'No entry present in db' });
		d.reject ({ message : 'Remove unsuccessful', status : 404 });
	});

	return d.promise();
};

module.exports = model;

