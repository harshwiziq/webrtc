var log = require('api-backend/common/log').child ({ 'sub-module' : 'cache' });
var $   = require('jquery-deferred');

/*
 * local storage structure to store all wiziq
 * end-points fetched from mongodb
 */ 
var end_pts = {}; 

/*
 * get value from local structure
 */ 
function get () {
	return end_pts;
}

/*
 * store end_pts locally
 */ 
function add (end_pts_obj) {
	end_pts = end_pts_obj;
}

/*
 * invalidate local storage if deleted from  
 * database
 */
function invalidate (credential_obj) {
	end_pts = {}; 
}

var cache = {};
cache.get = get;
cache.invalidate = invalidate;
cache.add = add;
module.exports = cache;
