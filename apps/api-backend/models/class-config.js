var $              = require('jquery-deferred');
var hashes         = require('jshashes');
var log            = require('api-backend/common/log').child({ module : 'models/class-config' });
var config_model   = require('api-backend/common/config-model');
var args           = require('common/args');

var config = {};

function generate_class_id () {
	var seed_str = 'vc_id' + Date.now();
	return new hashes.SHA1().hex(seed_str);
}

/* add class_config info to db.
 * On success, return ANONYMOUS url.
 * On error, send the error */
config.create = function (class_config) {
	var d = $.Deferred();
	var class_doc = new config_model.class_config (class_config);

	class_doc.save (function (err, doc) {
		if (err) {
			if (err.code === 11000) {
				log.error ({ err : err, class_config : class_config }, 'duplicate class-id error');
				return d.reject ({ message : 'duplicate class-id error', status : 409 });
			}
			
			log.error ({ err : err, class_config : class_config }, 'class config save error');
			return d.reject ({ message : err, status : 500 });
		}

		log.debug ({ results : doc }, 'class config saved ok');
		return d.resolve (doc);
	});

	return d.promise();
};

config.remove = function (__config) {
	var d = $.Deferred();
	
	config_model.class_config.remove ({ class_id : __config.class_id }, function (err, done) {
		if (err) {
			log.error ({ err : err, class_id : __config.class_id }, 'class config remove error');
			return d.reject ({ message : err, status : 500 });
		}
		
		if (done && done.result && done.result.n) {
			log.info ({ class_id : __config.class_id }, 'class config removed ok');
			return d.resolve (__config.class_id);
		}

		log.error ({ class_id : __config.class_id }, 'no document deleted');
		d.reject ({ message : 'no document removed', status : 404 });
	});
	
	return d.promise();
};

/* update class_config info */
config.update = function (class_config, class_id){
	var d = $.Deferred();

	config_model.class_config.findOneAndUpdate(

		{ "class_id": class_id },
		{ "$set": class_config }, 
		{ "new": true },
		function(err , res) {
			if (err) {
				log.error ({ err: err}, 'class config update error');
				return d.reject ({ message : err, status : 500 });
			}	

			d.resolve (res);
		}
	);
	return d.promise();
};


config.get = function (__config) {
	var d = $.Deferred();
	config_model.class_config.findOne ({ "class_id" : __config.class_id }, function (err, class_doc) {

		if (err) {
			log.error ({ err : err }, 'class get by id error');
			return d.reject ({ message : err, status : 500 });
		}

		/* if class_doc empty */
		if (!class_doc) {
			return d.reject ({ message : 'no such class', status : 404 });
		}

		log.info ({ class_config : class_doc }, "class_config db get");
		d.resolve (class_doc);
	});

	return d.promise();
};

/*
 * Attendees related routines 
 */

/* add_user to class_config info in db.
 * Update : used "$addToSet" instead of "$push" to avoid duplicate
 * addition.
 */ 
config.add_user = function (class_id, user) {
	var d = $.Deferred();
	var cc = { class_id : class_id };
	var model = config_model.class_config;

	model.update (
		{ class_id  : class_id, 'attendees.named.id': { $ne : user.id }},
		{ $addToSet : { "attendees.named" : user } },
		{ upsert    : false },
		function (err, result) {
			if (err) {
				log.error ({ class_id:class_id, user:user, err:err }, 'add user error');
				return d.reject ({ message : err, status : 500 });
			}
			
			if (result && result.nModified) {
				log.info ({ user_data : result, class_id : class_id }, 'user added successfully');
				return d.resolve (user);
			}
			
			log.error ({ Error :'User addition unsuccessful as user already exists' });
			d.reject ({ message : 'user addition unsuccessful as user already exists', status : 409 });
		}
	);

	return d.promise();
};


config.remove_user = function (class_id, user_id) {	
	var d = $.Deferred();
	var model = config_model.class_config;
	
	model.update(
	  { class_id: class_id },
	  { $pull : { "attendees.named" : { id : user_id } } },
	  function (err, result) {
	  	if (err) {
			log.error ({ err : err}, 'Error occured in removing user from db');
			return d.reject ({ message : err, status : 500});
		}

		if (result && result.nModified) {
			log.info ({ user_data : result }, 'user removed successfully');
			return d.resolve ({ user : user_id, message : "Deleted" });
		}

  		log.error ( { Error :'No entry present in db' } );
		d.reject ( { message : 'Remove unsuccessful', status : 404 } );
	  }
	);

	return d.promise();
};

module.exports = config;
