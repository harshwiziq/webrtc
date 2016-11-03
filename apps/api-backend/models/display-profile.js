/* display profile CRUD operations */

var mylog         = require('api-backend/common/log').child({ module : 'models/display-profile' });
var config_model  = require('api-backend/common/config-model');
var $             = require('jquery-deferred');

var model = {};

model.get = function (profile_name) {
	var d = $.Deferred();

	config_model.display_profile.findOne ({ "name" : profile_name }, function (err, profile) {

		if (err) {
			mylog.error ({ err : err }, 'display profile get error ');
			return d.reject ({ message : err, status : 500 });
		}

		/* if returned profile empty */
		if (! profile) {
			return d.reject ({ message : 'no such display profile', status : 404 });
		}

		mylog.info ({ Info : profile }, 'Display profile fetched from db ');
		d.resolve (profile);
	});

	return d.promise();
};

model.add = function (profile) {
	var d = $.Deferred();
	var model = config_model.display_profile;

	model.findOneAndUpdate (
		{ name : profile.name },
		profile,
		{ upsert:true, new: true },
		function (err, doc) {
			if (err) {
				mylog.error ({ err : err, display_profile : profile }, 'display profile save error');
				return d.reject ({ message : err, status : 500 });
			}

			mylog.info ({ display_profile_doc : profile }, 'display profile_doc saved ok');
			d.resolve (profile);
		}
	);

	return d.promise();
};


model.remove = function (profile_name) {
	var d = $.Deferred();

	config_model.display_profile.remove ({ name : profile_name }, function (err, done) {
		if ( err ) {
			mylog.error ({ err : err }, 'display_profile remove error');
			return d.reject ({ message : err, status : 500 });
		}

		if (done && done.result && done.result.n) {
   			mylog.info ({ profile_name : profile_name }, 'display profile removed ok');
			return d.resolve (profile_name);
		}

		mylog.error ({ Error :'No entry present in db' });
		d.reject ({ message : 'Remove unsuccessful', status : 404 });
	});

	return d.promise();
};

module.exports = model;


