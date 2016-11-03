var $               = require("jquery-deferred");
var rest            = require("restler");
var mylog           = require("./common/log").sub_module('controller');
var auth            = require("./auth");
var resources       = require("./resources");
var class_          = require("./class");
var protocol        = require("./protocol");
var users           = require("./users");
var addr            = require("./addr");
var perm_ctrl       = require("./perm-controller");
var connection      = require('./connection');
var tab_controller  = require('./tab-controller');
var agent           = require('./agent');

connection.events.on ('closed', function (vc_id) {
	handle_user_remove (vc_id);
});

class_.events.on ('active', function () {
	var list = users.passive_attendees ();

	for (var u in list)
		actually_join_user (list[u].user);
});

class_.events.on ('terminate', function (sess_id) {
	/*
	 * broadcast info session-terminated */

	mylog.debug('broadcasting session-terminate');
 	users.broadcast_info ('controller', 'framework', 'session-terminate', {});

	/*
	 * send active list to node-agent */
	mylog.info ('on a timeout of 60 seconds to perform the last few deeds');
	setTimeout (function () {
			last_few_deeds (sess_id);
		}, 60000);

});

/* 
 * send necessary info to node_agent and 
 * head for the other world 
 */ 
function last_few_deeds (sess_id) {
	var _r = agent.send_event (sess_id, 'terminate', { attendance : users.get_attendance_snapshot () });

	_r.on('success', function (data, response) {
		mylog.info ({ res : data }, 'send terminate ok');
		nirvana ();
	});

	_r.on('fail', function (data, response) {
		mylog.error ({ res : data }, 'send terminate failed');
		nirvana ();
	});

	_r.on('error', function (err, response) {
		mylog.error({ err : err }, 'send terminate error');
		nirvana ();
	});

	_r.on('timeout', function (ms) {
		mylog.error({ timeout : ms }, 'send terminate timeout');
		nirvana ();
	});
}

function nirvana () {

	mylog.info ('Will become one with the "benign, but indifferent universe" in 10 seconds');

	setTimeout(function () {
		mylog.info ('I am naught, therefore I think not');
		process.exit(0);
	}, 10000);
}

resources.events.on ('resource-allocated', function (data) {
	var vc_id  = data.vc_id;
	var mod    = data.mod;
	var status = data.status;
	var info   = data.info;

	users.set_resource_info (vc_id, mod, status, info);
});

controller = {};
controller.init = function (sess_info) {
	users.init (sess_info);
	class_.init (sess_info);
};

controller.process_req = function (conn, from, to, msg) {
	var _d = $.Deferred ();
	var log_ = conn.c.log;
	var log  = log_.child ({ module : 'controller' });

	/*
	 * format of addresses (from/to):
	 * 		resourceA[:instanceA][resourceB[:instanceB]] ... */

	var _to = addr.inspect_top(to);

	switch (_to.resource) {

		case 'controller' :

			handle_controller_req (_d, conn, from, to, msg, log);
			break;

		case 'user' :
			/* Handle inter-user communication */

			handle_user_to_user_req (_d, conn, from, to, msg, log_);
			break;

		default :
			log.error ({ 
				pdu : msg,
				from : from,
				to : to,
			}, 'illegal to.resource');
			_d.reject ('illegal to.reource', 'controller');
			return _d.promise ();
	}

	return _d.promise ();
};

controller.process_info = function (conn, from, to, msg) {
	var log_ = conn.c.log;
	var log  = log_.child ({ module : 'controller' });

	/*
	 * format of addresses (from/to):
	 * 		resourceA[:instanceA][resourceB[:instanceB]] ... */

	var _to = addr.inspect_top(to);

	switch (_to.resource) {

		case 'controller' :

			log.error ({ from:from, to:to, pdu:msg }, 'info addressed to controller: NOT IMPLEMENTED YET');
			break;

		case 'user' :
			/* Handle inter-user communication */

			handle_user_to_user_info (conn, from, to, msg, log_);
			break;

		default :
			log.error ({ 
				pdu : msg,
				from : from,
				to : to,
			}, 'illegal to.resource');
			return;
	}
};

function handle_controller_req (_d, conn, from, to, msg, log_) {
	to = addr.pop(to);
	var _to = addr.inspect_top(to);

	switch (_to.resource) {

		case 'auth' :
			handle_new_user (_d, conn, from, msg, log_);
			break;

		default :
			/*
			 * This is most likely a resource */
			return resources.route_command (_d, conn, from, to, msg, log_);
	}
}

function handle_new_user (_d, conn, from, msg, log_) {

	var in_user_info = null;

	/*
	 * 'auth' is the first PDU we get when a new user 
	 *  connects. */

	if (class_.ended()) {
		return _d.reject ('Class has ended'); 
	}

	if (!users.can_admit (log_))
		return _d.reject ('class already packed to full quorum');

	try {
		in_user_info = auth.process (log_, msg);
	}
	catch (err) {
		return _d.reject ({ code : 'auth-failed', msg : err });
	}

	var user_info = users.add_user (in_user_info, conn);

	if (!conn.set_user (user_info.vc_id)) {
		users.remove_user (user_info.vc_id);
		return _d.reject ('unable to assign user to connection', 'auth');
	}

	/*
	 * Send Ack */
	_d.resolve (user_info);

	if (class_.started()) {
		process.nextTick (actually_join_user.bind(null, user_info));
	}
}

function handle_user_to_user_req (_d, conn, from, to, msg, log_) {
	/* 
	 * 1. Check perms
	 * 2. Give the message to the resource and get approval
	 * 3. Forward the message 
	 * 4. Wait for reply
	 * 5. Resolve so that ACK goes back */

	var __d = $.Deferred ();
	var _p = __d.promise ();
	var relay = false;
	var to_module = addr.pop(to).split(':')[0];

	switch (to_module) {

		case 'perms':
			relay = perm_ctrl.relay_command (_p, from, to, msg, log_);
			break;

		default:
			relay = resources.relay_command (_p, from, to, msg);
	}

	if (relay) {
		users.relay_command (from, to, msg)
		.then (
				function (response) {
					 _d.resolve (response);
					__d.resolve (response);
				},
				function (err) {
					log_.warn ({ err: err, from:from, to:to, m:msg }, 'relay command failed');
					 _d.reject (err);
					__d.reject (err);
				}
			  );
	}
	else {
		 _d.reject ('blocked by sess_server counterpart');
		__d.reject ('blocked by sess_server counterpart');
		log_.debug ('relay blocked by server counterpart', msg);
	}
}

function handle_user_to_user_info (conn, from, to, msg, log_) {
	/* 
	 * 1. Check perms
	 * 2. Give the message to the resource and get approval
	 * 3. Forward the message */

	var relay = false;
	var to_module = addr.pop(to).split(':')[0];

	switch (to_module) {

		case 'tab-controller':
			relay = tab_controller.relay_info (from, to, msg, log_);
			break;

		default :
			relay = resources.relay_info (from, to, msg);
	}

	if (relay)
		users.relay_info (from, to, msg, log_);
}

function actually_join_user (user) {

	users.activate (user.vc_id);

	var sess_info = {
		perms : user.perms,
		attendees : users.get_publishable_info (null, user.vc_id),
		tab_controller : tab_controller.get_active_tab ()
	};

	users.send_info (user.vc_id, 'controller', 'framework', 'session-info', sess_info);

	/*
	 * Set the ball rolling for resources init for the specific user. The per-resource
	 * information will be sent as and when it is allocated by the resources */
	resources.init_user (user, users.get_resources(user.vc_id), users.get_log_handle (user.vc_id));
}

function handle_user_remove (vc_id) {
	users.remove_user (vc_id);
	resources.remove_user (vc_id);
}

module.exports = controller;
