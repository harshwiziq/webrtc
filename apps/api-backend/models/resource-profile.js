/* resource profile related CRUD operations */

var $             = require( 'jquery-deferred' );
var mylog         = require( 'api-backend/common/log' ).child( { module : 'models/resource-profile' } );
var config_model  = require( 'api-backend/common/config-model' );
var utility       = require( 'api-backend/common/utility' );

var model = {};

/* find all docs which have the resource name as defined in resource_array 
 * Resource array : [ { name : "av" } ]
 */ 
model.get = function (resource_array) {
	var d = $.Deferred();

	config_model.resource_profile.find ({ $or : resource_array }, function (err, resources) {

		if (err) {
			mylog.error ({ resource_array : resource_array, err : err }, 'resources get error ');
			return d.reject ({ message : err, status : 500 });
		}
		
		if (!resources.length)
			return d.reject ({ message : 'resources not found', status : 404 });
		
		/* if fewer resources are returned as compared to the number in resource_array */
		if (resources.length < resource_array.length) {
			
			var absent_resources = get_absent_resources (resource_array, resources);
			
			mylog.error ({ Absent_resources : absent_resources }, 'resources fetch error');
			var e = {
				info                   : 'All resources could not be fetched',
				resources_absent_in_db : absent_resources
			};
			return d.reject ({ message : e, status : 500 });
		}

		mylog.debug ({ resource_array : resource_array, resources : resources }, 'resources returned from db');
		d.resolve (resources);
	});

	return d.promise();
};


function get_absent_resources (resource_array,resources) {
   	var resources_fetched = [];
	for (i = 0; i < resources.length; i++) {
		resources_fetched.push ({ "name" : resources [i].name });
	}
	mylog.debug ({resources_fetched : resources_fetched},'resources array fetched from db');
	var absent_resources = utility.get_dissimiliar_elements (resource_array, resources_fetched);
	return absent_resources;

}

model.add = function (profile) {
	var d = $.Deferred();
	var model = config_model.resource_profile;

	model.findOneAndUpdate (
		{ name : profile.name },
		profile,
		{ upsert:true, new: true },
		function (err, doc) {
			if ( err ) {
				mylog.error ({ err : err, resource_profile : profile }, 'resource_profile save error');
				return d.reject ({ message : err, status : 500 });
			}

			mylog.info ({ resource_profile_doc : profile }, 'resouce_profile_doc saved ok');
			d.resolve (profile);
		}
	);

	return d.promise();
};


model.remove = function (profile_name) {
	var d = $.Deferred();

	config_model.resouce_profile.remove ({ name : profile_name }, function (err, done) {
		if (err) {
			mylog.error ({ err : err }, 'resource profile remove error' );
			return d.reject ({ message : err, status : 500 });
		}

		if (done && done.result && done.result.n) {
   			mylog.info ({ profile_name : profile_name }, 'resource profile removed ok');
			return d.resolve (profile_name);
		}

		mylog.error ({ Error :'No entry present in db' });
		d.reject ({ message : 'Remove unsuccessful', status : 404 });
	});

	return d.promise();
};

/* get all entries in resources doc */
model.get_all = function () {

	var _d = $.Deferred();
	resource_profile_model.find({}, function(err, resources) {
		if (err) {
			log.error ({ err: err }, 'find error in db (get_all)');
			return _d.reject(err);
		}
		_d.resolve(resources);
	});
	return _d.promise();

};

module.exports = model;


