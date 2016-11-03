var $               = require("jquery-deferred");
var mylog           = require("./common/log").sub_module('users');
var config          = require("./config");
var addr            = require("./addr");
var names           = require("./names");
var perms           = require("./perms");

var list_passive = {};
var list_active = {};
var users = {};
var map = {};

/*
 * If max_attendees is zero, this value is treated as impliying potentially 
 * unlimited number of attendees. We set this as the default */
var max_attendees = 0;
var curr_attendees = 0;

users.init = function (sess_info) {
	if (sess_info.attendees && sess_info.attendees.max_attendees)
		max_attendees = sess_info.attendees.max_attendees;

	mylog.info ({ max_attendees : max_attendees }, 'setting max attendees');
};

users.can_admit = function (log_) {
	if (!max_attendees)
		return true;

	return curr_attendees < max_attendees;
};

function add_to_map (user_key, user_info) {

	/*
	 * Already exists */
	if (map[user_key])
		return map[user_key];

	/*
	 * Looks like a first time user */
	map[user_key] = {
		info : user_info,
		internal : {
			resources : {},
		}
	};

	map[user_key].info.history  = [];
	map[user_key].info.perms    = null;
	map[user_key].info.vc_id    = random_id (user_info);
	map[user_key].info.nickname = names ();

	return map[user_key];
}

users.add_user = function (user_info, conn) {

	/*
	 * Passive join */
	var user_key = make_key (user_info);
	var entry    = add_to_map (user_key, user_info).info;
	var vc_id    = entry.vc_id;
	var log      = conn.log_handle().child({ vc_id : vc_id });

	if (!entry.perms) {
		/*
		 * must be a new user */
		perms.set_perms (entry);
	}

	if (list_passive[vc_id]) {
		/*
		 * Just a sanity check - this user shouldn't already exist in the
		 * passive list - if he does our logic is inconsistent somewhere.
		 * Flag it */
		log.error ({ vc_id : vc_id, entry : list_passive[vc_id].user }, 'user already exists in the passive list. overwriting');
	}

	/*
	 * If the user is in the active list, then it's likely that this user refreshed the
	 * browser and we didn't recieve the 'close' socket event. Eject the older entry of
	 * this user from the active list */
	if (is_active(vc_id))
		eject_user (log, vc_id);

	/* Add a join time to the history of the user */
	entry.history.push ({
		'joined' : (new Date()).toISOString()
	});

	list_passive[vc_id] = {
		user       : entry,
		user_key   : user_key,
		conn       : conn,
		state      : 'waiting',
		log_handle : log,
	};

	curr_attendees++;

	log.info ({ module : 'users', info : entry, attendees : curr_attendees }, 'user added');
	return entry;
};

users.remove_user = function (vc_id) {
	var list = null;

	/* 
	 * The user can either be in the active or the passive list */
	if (list_passive[vc_id])
		list = list_passive;

	if (list_active[vc_id])
		list = list_active;

	if (!list) {
		/*
		 * This shouldn't happen - indicates a bug somewhere */
		mylog.error ({ vc_id: vc_id }, 'remove user error : not found');
		return false;
	}

	var entry = list[vc_id].user;
	var log = list[vc_id].log_handle;

	/* Add a leaving time to the history of the user */
	entry.history.push ({
		'removed' : (new Date()).toISOString()
	});

	delete list[vc_id];
	curr_attendees--;

	log.info ({ module: 'users', attendees : curr_attendees }, 'user removed');

	/*
	 * Broadcast to all informing them of this */
	users.broadcast_info ('controller', 'framework', 'johnny-go-went-gone', vc_id, vc_id);
	return true;
};

users.activate = function (vc_id) {

	if (list_active[vc_id]) {
		/* Could happen due to race conditions */
		mylog.error ({ vc_id: vc_id }, 'activate: user already in active list');
		return;
	}

	if (!list_passive[vc_id]) {
		/* Could happen, if the user is removed before he is able to join. May
		 * happen due to disconnection or voluntary action */
		mylog.warn ({ vc_id: vc_id }, 'activate: user not in passive list');
		return;
	}

	list_active[vc_id]       = list_passive[vc_id];
	list_active[vc_id].state = 'in-session';

	delete list_passive[vc_id];

	/*
	 * Broadcast to all the addition of a new user */
	users.broadcast_info ('controller', 'framework', 'new-johnny', users.get_publishable_info (vc_id), vc_id);
};

users.has_perms = function (vc_id, resource, operation, owner) {
	var _u = list_active [vc_id];

	if (!_u) {
		mylog.warn ({ vc_id : vc_id }, 'has_perms : user not in active list');
		return false;
	}

	return perms.has_perms (_u.user, resource, operation, owner);
};

users.change_perm = function (msg) {
	var to_vc_id = msg.vc_id;
	var _u = list_active [to_vc_id];

	if (!_u) {
		mylog.warn ({ to_vc_id : to_vc_id }, 'change_perm : user not in active list');
		return false;
	}

	var res = perms.change_perm (_u.user, msg);
	if (!res)
		return false;

	return true;
};

function is_active (vc_id) {
	if (list_active[vc_id])
		return true;
	return false;
}

function eject_user (log, vc_id) {
	/*
	 * Ejection means:
	 *     1. Close the user socket
	 *     2. Inform others of user exit
	 */

	if (!list_active[vc_id]) {
		log.error ({ vc_id : vc_id, method : 'eject_user' }, 'not active');
		return;
	}

	var conn = list_active[vc_id].conn;
	conn.close ();

	users.remove_user (vc_id);
}

users.get_resources = function (vc_id) {

	if (!list_active[vc_id]) {
		/* Shouldn't happen - indicates a bug */
		mylog.error ({ vc_id: vc_id }, 'get_resources: user not in active list');
		return {};
	}

	var user_key = list_active[vc_id].user_key;
	var resources = map[user_key].internal.resources;

	return resources;
};

users.get_log_handle = function (vc_id) {

	if (!list_active[vc_id]) {
		/* Shouldn't happen - indicates a bug */
		mylog.error ({ vc_id: vc_id }, 'get_resources: user not in active list');
		return mylog;
	}

	return list_active[vc_id].log_handle;
};

users.set_resource_info = function (vc_id, mod, status, info) {

	if (!list_active[vc_id]) {
		/* Shouldn't happen - indicates a bug */
		mylog.error ({ vc_id: vc_id }, 'set_resource_info: user not in active list');
		return ;
	}

	var user_key = list_active[vc_id].user_key;
	var resources = map[user_key].internal.resources;

	if (!resources[mod])
		resources[mod] = {};

	resources[mod].status = status;
	resources[mod].info   = info;
	resources[mod].name   = mod;

	users.send_info (vc_id, 'user-controller', 'framework', 'resource-init', resources[mod]);
	return ;
};

users.passive_attendees = function () {
	return list_passive;
};

users.get_attendance_snapshot = function () {
	/* Send all the users info */
	return map;
};

/*
 * Used to forward a pre-formed user-to-user command */
users.relay_command = function (from, to, message) {
	var _d = $.Deferred ();
	var vc_id = addr.user(to);
	var _u = list_active[vc_id];

	if (!_u) {
		/* Could happen due to early disconnection etc */
		mylog.warn ({ from:from, to:to, pdu:message }, 'relay_command: user not in active list');
		_d.reject ('user not in active list');
		return _d.promise ();
	}

	var conn = _u.conn;
	conn.send_command (from, to, message.command, message.data)
		.then(
				function (data) {
					return _d.resolve (data);
				},
				function (err) {
					return _d.reject (err);
				}
			 );

	return _d.promise ();
};

users.send_command = function (from, to_vc_id, command_id, data) {
	var _d = $.Deferred ();
	var _u = list_active[to_vc_id];

	if (!_u) {
		/* Could happen due to early disconnection etc */
		mylog.warn ({ to_vc_id: to_vc_id, from:from, command:command_id, data: data }, 'send_command: user not in active list');
		_d.reject ('user not in active list');
		return _d.promise ();
	}

	var conn = _u.conn;
	return conn.send_command (from, addr.prepend (from, 'user', to_vc_id), command_id, data);
};

users.send_info = function (vc_id, from, to, info_id, info) {
	var _u = list_active[vc_id];

	if (!_u) {
		/* Could happen due to early disconnection etc */
		mylog.warn ({ vc_id: vc_id, from:from, to:to, info_id:info_id, info:info }, 'send_info: user not in active list');
		return;
	}

	var conn = _u.conn;
	conn.send_info (from, addr.prepend(to, 'user', vc_id), info_id, info);
};

users.relay_info = function (from, to, message, log_) {

	var from_vc_id = addr.user(from);

	/* If the 'to' is a vc_id then just send the message to that user. If it 
	 * is '*' send to all, except the sender of the message */

	if (addr.inspect_top(to).instance == '*')
		return users.broadcast_info (from, addr.pop(to), message.info_id, message.info, from_vc_id);
};

users.broadcast_info = function (from, to, info_id, info, except) {
	var list = [];

	for (var u in list_active) {
		var _active = list_active[u];
		var _user   = _active.user;
		var _conn   = _active.conn;

		if (except)
			if (_user.vc_id == except)
				continue;

		var _to = addr.prepend (to, 'user', _user.vc_id);
		_conn.send_info (from, _to, info_id, info);
	}
};

users.get_publishable_info = function (vc_id, exclude) {

	if (vc_id) {
		if (!list_active[vc_id]) {
			return {
				vc_id : vc_id,
				displayName : '--error-inactive--',
			};
		}
		return [ publishable_info(list_active[vc_id].user) ];
	}

	var info = [];
	for (var id in list_active)
		if (id != exclude)
			info.push (publishable_info (list_active[id].user));

	return info;
};

function publishable_info (user_info) {
	/* Return the full thing for now - eventually some infromtaion coudl be held back 
	 * from a privacy point of view */
	return user_info;
}

var seed = 1;
function random_id (user_info) {
	var str = '';
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for( var i=0; i < 5; i++ )
	str += possible.charAt(Math.floor(Math.random() * possible.length));

	seed++;
	return user_info.id.slice (0, 4) + '-' + str + seed;
}

function make_key (user_info) {
	return user_info.id + ':' + user_info.displayName;
}

module.exports = users;
