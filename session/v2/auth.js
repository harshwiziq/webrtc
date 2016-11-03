var crypt           = require("./crypt");
var log             = require("./common/log").sub_module('auth');

auth = {};
auth.process = function (log_, msg) {
	var user_info = null, role = null;
	var log  = log_.child ({ module : 'auth' });
	var __identity = null, __role = null;

	/*
	 * Decrypt and Parse the authentication and role information */
	try {
		__identity = decodeURIComponent (crypt.decipher (msg.data.e_identity, 'auth'));
		user_info  = JSON.parse (__identity);

		if (msg.data.e_role) {
			__role = crypt.decipher (msg.data.e_role, 'role_key');
			role   = JSON.parse (__role);
		}
	}
	catch (e) {
		log.error ({ err : e, data : msg.data }, 'auth: caught decode or parse error');
		throw 'auth decode or parse error';
	}

	var auth_via = user_info.auth_via;

	log.info ({ user_info : user_info, role_override : role, auth_via : auth_via }, 'decrypted user_info');

	if (role) {
		if ( (user_info.id != role.id) && auth_via !== 'wiziq-anon')
			throw 'user id does not match the registered attendee name';

		user_info.role_override = role.role;
	}

	return user_info;
};

module.exports = auth;
