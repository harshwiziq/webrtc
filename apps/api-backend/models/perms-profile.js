/* perms-profile CRUD operations */

var mylog         = require('api-backend/common/log').child({ module : 'models/perms-profile' });
var config_model  = require('api-backend/common/config-model');
var $             = require('jquery-deferred');

var model = {};

model.get = function (name) {
	var d = $.Deferred();

	config_model.perms_profile.findOne ({ "name" : name }, function (err, perms_profile) {

		if (err) {
			mylog.error ({ name: name, err : err }, 'perms profile get error ');
			return d.reject ({ message : err, status : 500 });
		}

		/* if returned profile empty */
		if (!perms_profile) {
			return d.reject ({ message : 'Perms profile not found for ' + name, status : 404 });
		}
		
		mylog.info ({ Profile : perms_profile }, 'Perms profile fetched from db');
		d.resolve (perms_profile);
	});

	return d.promise();
};

/* find all docs which have the perms name as defined in perms_array. 
 * perms_array : [ { name : "presenter" } ]
 **/
model.get_multiple = function (perms_array) {
    var d = $.Deferred();

    config_model.perms_profile.find ({ $or : perms_array }).lean().exec( function (err, perms) {
	
	        if (err) {
				mylog.error ({ perms : perms_array, err : err }, 'perms get error ');
				return d.reject ({ message : err, status : 500 });
			}
	
			if (!perms.length) {
				mylog.error ({ perms : perms_array }, 'perms get returned empty');
				return d.reject ({ message : 'perms not found', status : 404 });
			}
			
			/* if fewer perms are returned as compared to the number in perms_array */
			if (perms.length < perms_array.length) {
				
				var absent_perms = get_absent_perms (perms_array, perms);

				mylog.error ({ perms_array: perms_array, absent_perms : absent_perms }, 'Perms fetch error');
				var e = { 
					info               : 'all perms could not be fetched',
					perms_absent_in_db : absent_perms
				};
				return d.reject ({ message : e, status : 500 });
			}
			
	        d.resolve (perms);
	    });

    return d.promise();
};


function get_absent_perms (perms_array, perms) {
	/*
	 * Find perms which are absent in perms_array */
	var absent = perms_array.filter (function (curr, index, arr) {
		for (var i = 0; i < perms.length; i++) {
			if (perms[i].name == curr.name)
				return true;
		}

		mylog.debug ({ perm : curr.name }, 'not found in db');
		return false;
	});

	return absent;
}

model.add = function (profile) {
	var d = $.Deferred();
	var model = config_model.perms_profile;

	model.findOneAndUpdate (
		{ name : profile.name },
		profile,
		{ upsert:true, new: true },
		function (err, doc) {
			if (err) {
				mylog.error ({ err : err, perms_profile : profile }, 'perms profile save error');
				return d.reject ({ message : err, status : 500 });
			}

			mylog.info ({ perms_profile_doc : profile }, 'perms_profile_doc saved ok');
			d.resolve (profile);
		}
	);

	return d.promise();
};


model.remove = function (name) {
	var d = $.Deferred();

	config_model.perms_profile.remove ({ name : name }, function ( err, done ) {
		if (err) {
			mylog.error ({ err : err }, 'perms_profile remove error');
			return d.reject ({ message : err, status : 500 });
		}

		if (done && done.result && done.result.n) {
   			mylog.info ({ name : name }, 'perms profile removed ok');
			return d.resolve (name);
		}

		mylog.error ({ Error :'No entry present in db' });
		d.reject ({ message : 'Remove unsuccessful', status : 404 });
	});

	return d.promise();
};

module.exports = model;

