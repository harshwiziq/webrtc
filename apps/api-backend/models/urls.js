var crypt  = require('common/crypt');
var keys   = require('common/keys');
var _class = require('api-backend/controllers/class');
var log    = require('api-backend/common/log').child({ module : 'models/urls' });
var mod    = {};

mod.create_anon = function (class_id, landing_profile) {
	var url;

	url  = landing_profile.protocol + '://';
	url += landing_profile.address;
	url += (landing_profile.port ? ':' + landing_profile.port : '');
	url += '/landing/session/v1/';
	url += class_id;

	return url;
};

mod.create_rec = function (class_id, landing_profile, req) {
	var url = _class.dummy_rec(req);
	log.info({ rec_url : url }, "Recording URL");
	return url;
};

mod.create_identified = function (class_id, auth_via, user_id, role, landing_profile, display_name) {
	var url;
	
	if (auth_via === "wiziq" || auth_via === "google" || auth_via === "facebook") 
		return ({ named : mod.create_user_url (class_id, auth_via, user_id, role, landing_profile) });

	return ({ partial : mod.create_user_url (class_id, auth_via, user_id, role, landing_profile, true, display_name) });
};

mod.create_user_url = function (class_id, auth_via, user_id, role, landing_profile, named, display_name) {
	var url;

	url  = mod.create_anon (class_id, landing_profile);
	url += '?auth_via=' + auth_via;
	url += '&id=' + user_id;
	if (named)
		url += '&display_name=' + display_name;

	/*
	 * If the user has a role then encrypt it
	 */
	if (role) {
		var selector = 'role_key';
		var data = {
			id   : user_id,
			role : role
		};
		data = JSON.stringify(data);
		var encrypt = crypt.encipher(selector, data);
		url += '&u=' + encrypt;
	}

	return url;
};


module.exports = mod;

