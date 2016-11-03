var $               = require("jquery-deferred");
var mylog           = require("./common/log").sub_module('resources');
var config          = require("./config");
var users           = require("./users");
var addr            = require("./addr");
var ev              = require("./events")('resources');

/*
 * Default resources to be loaded */
var def_resources = [
	{
		"name": "layout-ctrl",
		"custom": {
		},
	},
];

var list = {};
var res = {};

res.events = ev;

res.load = function (sess_info) {

	var _d        = $.Deferred ();
	var resources = def_resources.concat (sess_info.resources);
	var common    = sess_info.common;
	var counter   = resources.length;

	function mod_ok () {
		counter--;
		mylog.info ({ res: this }, 'module.init ok');
		if (!counter)
			finish();
	}

	function mod_err (err) {
		counter--;
		mylog.error ({ res: this, err: err }, 'module.init error');
		if (!counter)
			finish();
	}

	function finish () {
		_d.resolve ();
	}

	if (!resources) {
		mylog.error ({ sess_info : sess_info }, 'no resources defined');
		return;
	}

	for (var i = 0; i < resources.length; i++) {
		var r = resources[i];

		list[r.name] = {};

		/* Add additional utility handles */
		sess_info.handles = {};
		sess_info.handles.log = mylog.child({ res : r.name });
		sess_info.handles.coms = {
			broadcast_info : users.broadcast_info.bind (users, r.name, r.name),
			send_info      : users.send_info.bind (users),
			send_command   : users.send_command.bind (users, r.name)
		};
		sess_info.handles.user = {
			has_perms      : users.has_perms.bind (users)
		};

		try {
			list[r.name].handle = require('./resources/' + r.name + '/main.js');
			list[r.name].handle.init (r, common, sess_info.handles)
				.then (mod_ok.bind(r.name), mod_err.bind(r.name));
		}
		catch (e) {
			mod_err.call(r.name, e);
			delete list[r.name];
		}
	}

	return _d.promise ();
};

res.init_user = function (user, res_info_saved, log_handle) {
	var d_mod = null;

	for (var m in list) {
		if (list[m].handle.init_user) {

			d_mod = null;

			try {
				var last_info = null;

				if (res_info_saved[m] && res_info_saved[m].status === 'ok')
					last_info = res_info_saved[m].info;

				d_mod = list[m].handle.init_user (user, last_info, log_handle.child({ res : m }));
			}
			catch (e) {
				mylog.error ({ res: m, err: e }, 'init_user exception');
			}

			if (d_mod) {
				d_mod.then (
					publish_res_info.bind (d_mod, user, m, 'ok'),
					publish_res_info.bind (d_mod, user, m, 'error')
				);
			}
		}
	}
};

res.remove_user = function (vc_id) {
	
	for (var m in list) {
		if (list[m].handle.remove_user) {
			list[m].handle.remove_user(vc_id);
		}
	}
 
};

function publish_res_info (user, mod, status, info) {
	ev.emit ('resource-allocated', {
		vc_id : user.vc_id,
		mod   : mod,
		status: status,
		info  : info
	});
}

res.route_command = function (_d, conn, from, to, msg, log_) {

	if (!list[to]) {
		log_.error ({ from: from, to: to, msg: msg, method: 'route_command' }, 'to non-existent module');
		return _d.reject ('module "' + to + '" not found');
	}

	if (!list[to].handle.command) {
		log_.error ({ from: from, to: to, msg: msg, method: 'route_command' }, 'undefined "command" method');
		return _d.reject ('module "' + to + '": undefined "command" method');
	}

	var user = addr.user(from);

	if (!user) {
		log_.error ({ from: from, to: to, msg: msg, method: 'route_command' }, 'unacceptable from address');
		return _d.reject ('unacceptable "from" address');
	}

	list[to].handle.command (user, msg.command, msg.data)
		.then (
			_d.resolve.bind(_d),
			_d.reject.bind(_d)
		);
};

res.route_info = function (from, to, msg) {
	if (!list[to]) {
		mylog.error ({ from: from, to: to, msg: msg, method : 'route_info' }, 'to non-existent module');
		return;
	}

	if (!list[to].handle.info) {
		mylog.error ({ from: from, to: to, msg: msg, method : 'route-info' }, 'undefined info method');
		return;
	}

	var user = addr.user(from);

	if (!user) {
		mylog.error ({ from: from, to: to, msg: msg, method: 'route-info' }, 'unacceptable from address');
		return;
	}

	list[to].handle.info (user, msg.info_id, msg.info);
};

/*
 * Is called for a user-user message. Must return true or false, indicating whether 
 * this message should be relayed */
res.relay_info = function (from, to, msg) {

	var user = addr.user(from);
	var res  = addr.pop(to).split(':')[0];

	if (!list[res]) {
		mylog.error ({ res: res, from: from, to: to, msg: msg, method: 'relay-info' }, 'to non-existent module');
		return true;
	}

	if (!list[res].handle.relay_info) {
		mylog.error ({ res: res, from: from, to: to, msg: msg, method: 'relay-info' }, 'undefined relay_info method');
		return true;
	}

	if (!user) {
		mylog.error ({ from: from, to: to, msg: msg, method: 'relay-info' }, 'unacceptable from address');
		return true;
	}

	return list[res].handle.relay_info (user, to, msg.info_id, msg.info);

};

/*
 * Is called for a user-user message, waits for ack/nack from remote side. Must return true or false,
 * indicating whether this message should be relayed */
res.relay_command = function (_p, from, to, msg) {

	var user = addr.user(from);
	var res  = addr.pop(to).split(':')[0];

	if (!list[res]) {
		mylog.error ({ res: res, from: from, to: to, msg: msg, method: 'relay-command' }, 'to non-existent module');
		return true;
	}

	if (!list[res].handle.relay_command) {
		mylog.error ({ res: res, from: from, to: to, msg: msg, method: 'relay-command' }, 'undefined relay_command method');
		return true;
	}

	if (!user) {
		mylog.error ({ from: from, to: to, msg: msg, method: 'relay-command' }, 'unacceptable from address');
		return true;
	}

	return list[res].handle.relay_command (_p, user, to, msg.info_id, msg.info);

};

module.exports = res;
