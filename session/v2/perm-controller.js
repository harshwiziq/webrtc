var users = require ('./users');
var addr  = require ('./addr');
var po = {};

po.relay_command = function (_p, from, to, msg, log_) {
	var log  = log_.child ({ module : 'perms-controller' });
	var from_vc_id = addr.user(from);

	/* ----------------------------------- *
	 *
	 * Must return true,
	 * if the command is to be relayed
	 *
	 * ----------------------------------- */

	if (msg.command === 'override') {
		var res = on_po_received (from_vc_id, to, msg, log);

		if (res)
			_p.then (
				on_po_success.bind (null, log),
				on_po_failed .bind (null, log)
		   	);

		return res;
	}

	return false;
};

function on_po_received (from_vc_id, to, msg, log) {
	/*
	 * Is po (perm override) allowed */

	var to_vc_id = msg.data.vc_id;

	if (!to_vc_id) {
		log.warn ('perms override fail: need a target vc_id', msg);
		return false;
	}

	if (!users.has_perms(from_vc_id, 'perms', 'grant', '*')) {
		log.warn ('perms override fail: not allowed!', { msg: msg, from: from_vc_id });
		return false;
	}

	return true;
}

function on_po_success (log, data) {
	log.debug ('on_po_success data:: ', data);

	users.change_perm (data);

	log.debug ('perm ' + data.key + '-' + data.subkey + ' ' + (data.val ? 'set ' : 'reset ') + 'for ' + data.vc_id);
	users.broadcast_info ('controller', 'framework', 'perms-override', data);
}

function on_po_failed (log, response, data) {
	log.debug ('on_po_failed response:: ', response);
	log.debug ('on_po_failed data:: ', data);
}

module.exports = po;
