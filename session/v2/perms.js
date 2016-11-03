var log   = require("./common/log").sub_module('perms');

var configured_people;
var configured_perms;
var perms = {};

perms.init = function (sess_info) {
	configured_people = sess_info.attendees.named;
	configured_perms  = sess_info.perms;

	if (!configured_perms.default) {
		/*
		 * Deny everything */
		configured_perms.default = {
			denied : {
				'*' /* Resource */ : {
					'*' /* Feature */ : { '*' : true } }
			}
		};
	}
};

perms.set_perms = function (user_info) {

	if (user_info.role_override) {
		user_info.perms = get_perms (user_info.role_override);
		return;
	}

	/*
	 * Else find if the user is one of configured people in the class
	 * with a pre-defined role */
	for (var i = 0; i < configured_people.length; i++) {
		var __p = configured_people[i];

		if (__p.id == user_info.id &&
		   __p.auth_via == user_info.auth_via) {
			   user_info.perms = get_perms (__p.role);
			   return;
		   }
	}

	user_info.perms = get_perms ('default');
	return;
};

function get_perms (role) {

	if (!configured_perms [ role ]) {
		log.warn ('"' + role + '" : no such role. returning default');
		return configured_perms.default;
	}

	return configured_perms [ role ];
}

perms.change_perm = function (user_info, data) {
	var __perms = user_info.perms;

	try {
		if (!__perms.cloned) {
			/*
			 * user.perms is a reference to the role object by default
			 * hence changing it will change the perms for all users with this role
			 * so we must create a copy of the perms object and then change it */
			__perms = user_info.perms = JSON.parse (JSON.stringify (__perms));
			__perms.cloned = true;
		}

		__perms.allowed [data.key] = __perms.allowed [data.key] || {};
		__perms.allowed [data.key] [data.subkey] = __perms.allowed [data.key] [data.subkey] || {};
		__perms.allowed [data.key] [data.subkey].users = (data.val) ? "*" : "";
	}
	catch (e) {
		log.warn ('can not set override: ', {__perms : __perms});
	}
	return true;
};

perms.has_perms = function (user_info, resource, operation, owner) {
	var __perms = user_info.perms;

	if (owner !== 'self' && owner !== '*') {
		log.error ({ owner : owner }, 'has_perms : unsupported value of "owner". return false');
		return false;
	}

	return __has_perms (__perms, resource, operation, owner);
};

function __has_perms (__perms, resource, operation, owner) {

	if (!__perms.allowed)
		return false;

	if (matches (__perms.denied, resource, operation, owner))
		return false;

	return matches (__perms.allowed, resource, operation, owner);
}

function matches (__perm__, resource, operation, owner) {
	var __determinant = __perm__[resource] || __perm__['*'];
	if (!__determinant)
		return false;

	__determinant = __determinant [ operation ] || __determinant [ '*' ];
	if (!__determinant)
		return false;

	if (__determinant.users === '*')
		return true;

	return __determinant.users == owner;
}

module.exports = perms;
