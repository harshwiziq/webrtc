var log      = require('auth/common/log').child ({ 'sub-module' : 'cache' });
var $        = require('jquery-deferred');

/*
 * local storage structure to store all user entries
 * fetched from mongodb in the beginning
 */ 
var credentials = {}; 

/*
 * get value from local structure corresponding to auth_type
 * and profile_name
 */ 
function get ( auth_type ) {

	var _d = $.Deferred();

	/* if credentials object empty */
	if ( Object.keys(credentials).length === 0 ) {
		return _d.reject( { Error : 'Credentials undefined' } );
	}
	
	/* 
	 * profile_name will be provided by params or url or some other way,
	 * this flow has not been defined yet.
	 * For now, just setting profile_name as "default" and fetching
	 * corresponding entry 
	 */	
	var profile_name = 'default';
	var _user_credentials = credentials[[ profile_name, auth_type ]];
	
	/* if no user in db corresponding to profile_name
	 * and auth_type 
	 */
	if (!_user_credentials) {
		return _d.reject('No entry found for '+profile_name);
	}
	
	log.info({Info : _user_credentials },'user successfully fetched');

	_d.resolve(_user_credentials);

	return _d.promise();
}

/*
 * add entry in local structure corresponding
 * to credential_obj*/
function add ( credential_obj ) {
	/*
	 * creating a map corresponding to user data fetched
	 * from db
	 */ 
	credentials[[ credential_obj.profile_name, credential_obj.auth_type ]] = credential_obj;
	log.info({Info : credentials[[ credential_obj.profile_name, credential_obj.auth_type ]]},'Added successfully');

}

/*
 * invalidate a value in local storage if deleted from  
 * database*/
function invalidate ( credential_obj ) {
	
	delete credentials[[ credential_obj.profile_name, credential_obj.auth_type ]]; 
	log.info('Deleted successfully');

}

var cache = {};
cache.get = get;
cache.invalidate = invalidate;
cache.add = add;
module.exports = cache;
