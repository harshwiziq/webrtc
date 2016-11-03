var $        = require( 'jquery-deferred' );
var mongoose = require( 'mongoose' );
var log      = require( 'auth/common/log' ).child ({ 'sub-module' : 'auth-db' });
var cache    = require( 'auth/social_auth/cache' );
var db       = require( 'auth/common/db');

var Credential;
var Schema;
var user_schema;

db.conn.once ( 'open', function ( callback ) {
	create_schema_model ()
		.then( 
			  function done () {
				  fill_cache_from_db ();
			  },
			  function fail( err ) {
				  log.error({ err: err},'Error while creating schema model');
			  }
        );
});


/* For now connect to db and then create a schema there, if not present already,
 * this was done just to check addition of entries to db via code.*/

function create_schema_model () {
	
	var _d = $.Deferred();

	if( !Schema ){
		Schema = mongoose.Schema;
	}

	if( !user_schema ){
		user_schema = new Schema({
			profile_name      : { type : String, required : true },
			auth_type         : { type : String, required : true },
			client_id         : { type : String, required : true },
			client_secret     : { type : String, required : true },
			callback_url      : { type : String, required : true },
			authorization_url : { type : String },
			token_url         : { type : String },
			profile_url       : { type : String }
		});

		user_schema.index({ profile_name: 1, auth_type: 1}, { unique: true });
	}

	if (!Credential) {
		Credential = db.conn.model('Credential', user_schema);
	}

	var cred = new Credential({
		profile_name  : 'akshit.me',
		auth_type     : 'google',
		client_id     : '794373405384-6u7bipelrp33kh8samdgsks0migb561d.apps.googleusercontent.com',                                            
		client_secret : 't4xiO3YLbpDUEIz1PI8AA2wJ',
		callback_url  : 'https://akshit.me/auth/auth/google/callback'
	});

	/* This is done to search for any entry with same combination of profile_name
	   and authtype add only if not present. this avoids duplicacy */

	Credential.findOne({ 'profile_name' : cred.profile_name , 'auth_type' : cred.auth_type }, function (err, olduser) {

	    if (err) {
			log.error ({ err : err, cred : cred }, 'add error');
			_d.reject(err);
			return;	
		}		       
	   
		if (olduser) {
			log.warn ({ cred : cred }, 'duplicate entry');
			_d.resolve();
			return;
		}
		/*
		 * All ij well. Add the entry */
		cred.save(function (err, done) {	
  			if (err) {
				log.error ({ err: err, cred : cred }, 'save error');
				_d.reject(err);
				return;
			}
			
			log.info({Info : cred},'Credentials saved successfully to db');
			_d.resolve();
		});
	});

	return _d.promise();	
}

/*
 * get all credentials from wiziq_auth db
 */
function get_all () {

	var _d = $.Deferred();
	Credential.find({}, function(err, users) {
		if (err) {
			log.error ({ err: err }, 'find error in db (get_all)');
			return _d.reject(err);
		}
		_d.resolve(users);
	});
	return _d.promise();

}

/*
 * get all credentials from wiziq_auth db and 
 * store them locally in cache
 */ 
function fill_cache_from_db () {

	Credential.find({}, function(err, users) {
		if (err) {
			log.error ({ err: err }, 'find error in db (get_all)');
			return;
		}
		users.forEach(function(user) {
		        cache.add(user);
		});

	});

}

/* Search for any entry with same combination of profile_name
 * and authtype add only if not present. this avoids duplicacy
 */

function add (credential_obj)
{
	var _d = $.Deferred();

	if (!credential_obj) {
		_d.reject ('invalid input');
		return _d.promise();
	}

	var _cred = {
		profile_name       : credential_obj.profile_name,
		auth_type          : credential_obj.auth_type,
		client_id          : credential_obj.client_id,
		client_secret      : credential_obj.client_secret,
		callback_url       : credential_obj.callback_url,
		authorization_url  : credential_obj.authorization_url,
		token_url          : credential_obj.token_url,
		profile_url        : credential_obj.profile_url
	};


	var cred = new Credential(_cred);
	
	Credential.findOne({ 'profile_name' : credential_obj.profile_name, 'auth_type' : credential_obj.auth_type }, function (err, olduser) {

		if (err) {
			log.error ({ err : err, cred : _cred }, 'add error');
			return _d.reject(err);
		}

		if (olduser) {
			log.warn ({ cred : _cred }, 'duplicate entry');
			return _d.reject('duplicate entry');
		}

		/*
		 * All ij well. Add the entry */
		cred.save(function (err, done) {

			if (err) {
				log.error ({ err: err, cred : _cred }, 'save error');
				return _d.reject (err);
			}

			_d.resolve(done);
		});
	});

   return _d.promise();
}

/*
 * Remove entry from db corresponding to some specific profile_name 
 * and auth_type 
 */ 
function remove (credential_obj) {
	var _d = $.Deferred();

	if (!credential_obj) {
		_d.reject ('invalid input');
		return _d.promise();
	}

	/* This is done to search for any entry with same combination of profile_name
	   and authtype, remove if  present. this avoids duplicacy*/

	Credential.findOne({ 'profile_name' : credential_obj.profile_name, 'auth_type' : credential_obj.auth_type }, function (err, olduser) {
		if (err) {
			log.error ({ err : err, cred : credential_obj }, 'remove: find error');
			return _d.reject(err);
		}

		if (!olduser) {
			log.warn ({ cred : credential_obj }, 'remove: entry not found');
			return _d.reject ('not found');
		}

		var query = Credential.remove({ 'profile_name' : credential_obj.profile_name, 'auth_type' : credential_obj.auth_type }, function (err, results) {
			if (err) {
				log.error ({ err : err, cred : credential_obj }, 'remove error');
				return _d.reject(err);
			}

			return _d.resolve(results);
		});

	});

	return _d.promise();
}

module.exports = {
	add     : add,
	remove  : remove,
	get_all : get_all
};
