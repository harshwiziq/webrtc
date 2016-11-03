var log = require("./common/log").sub_module('protocol');
var config = require("./config");

var prot = {};
var seq = 1;

prot.parse = function (e) {

	var message = JSON.parse(e); 

	if (message.v !== 1)
		throw new Error ('illegal protocol');

	if ((message.type != 'req') && (message.type != 'info') && (message.type != 'ack') && (message.type != 'ping'))
		throw new Error ('illegal type');

	return message;
};

prot.command_pdu = function (from, to, command, data) {
	var m = {};

	if (!from || !to || !command) {
		log.error ({
			to: (to ? to : 'null'),
			from: (from ? from : 'null'),
			command: (command ? command : 'null'),
			data: (data ? data : 'null'),
		},'protocol.command_pdu: null arguments(s)');

		return null;
	}

	m.v     = 1;
	m.type  = 'req';
	m.seq   = seq++;

	m.to    = to;
	m.from  = from;

	m.msg  = {
		command : command,
		data    : data
	};

	return m;
};

prot.info_pdu = function (from, to, info_id, info) {
	var m = {};

	if (!to || !from || !info_id || !info) {
		log.error ({
			to: (to ? to : 'null'),
			from: (from ? from : 'null'),
			info_id: (info_id ? info_id : 'null'),
			info: (info ? info : 'null'),
		},'protocol.info_pdu: null arguments(s)');
		return null;
	}

	m.v     = 1;
	m.type  = 'info';
	m.seq   = seq++;

	m.to    = to;
	m.from  = from;

	m.msg  = {
		info_id : info_id,
		info    : info
	};

	return m;
};

prot.auth_pdu = function (from_user) {
	var m = {};

	m.v = 1;
	m.type = 'req';
	m.to = {};
	m.to.ep = { t : 'server' };
	m.to.res = 'auth';

	m.from = {
		ep : {
			t : 'user',
			i : from_user
		},
		res : 'framework'
	};

	m.msg = {};

	return m;
};

prot.ack_pdu = function (message, status, data, from) {
	var m = {};

	m.v = 1;
	m.type = 'ack';
	m.seq  = message.seq;

	m.to   = message.from;
	m.from = (from ? from : message.to);

	m.msg  = {
		status : status,
		data   : data
	};

	return m;
};

prot.print = function (m, dir) {
	var compact = true;

	if (m.type === 'info')
		print_info_pdu (compact, m, dir);
	else if (m.type === 'req')
		print_req_pdu (compact, m, dir);
	else if (m.type === 'ack')
		log.debug ('PDU:' + dir + ': v' + m.v + ' ' + m.type + '.' + m.seq + ' \"' + m.msg.status + '\"' + ' (' + m.from + ' -> ' + m.to + ')');
	else
		log.debug (compact ? '' : { m:m }, 'PDU:' + dir + ': v' + m.v + ' ' + m.type + '.' + m.seq + ' (' + m.from + ' -> ' + m.to + ')');
};

function print_info_pdu (compact, m, dir) {

	if (compact) {
		log.debug ('PDU:' + dir + ': v' + m.v + ' ' + m.type + '.' + m.seq + ' \"' + m.msg.info_id + '\"' + ' (' + m.from + ' -> ' + m.to + ')');
		return;
	}

	log.debug ({ m:m }, 'PDU:' + dir + ': v' + m.v + ' ' + m.type + '.' + m.seq + ' \"' + m.msg.info_id + '\"' + ' (' + m.from + ' -> ' + m.to + ')');
}

function print_req_pdu (compact, m, dir) {

	if (compact) {
		log.debug ('PDU:' + dir + ': v' + m.v + ' ' + m.type + '.' + m.seq + ' \"' + m.msg.command + '\"' + ' (' + m.from + ' -> ' + m.to + ')');
		return;
	}

	log.debug ({ m:m }, 'PDU:' + dir + ': v' + m.v + ' ' + m.type + '.' + m.seq + ' \"' + m.msg.command + '\"' + ' (' + m.from + ' -> ' + m.to + ')');
}

prot.make_addr = function (user, resource, instance) {
	if (!user) {
		log.error ('protocol.make_addr: null user');
		return null;
	}

	var _u = 'user:' + user;
	var _r = '';
	var _i = '';

	if (resource)
		_r = '.' + resource;

	if (instance)
		_i = ':' + instance;

	return _u + _r + _i;
};

prot.get_user_from_addr = function (addr) {
	/* Addresses should be of the form
	 * 		- 'user.<user-name>[.resource.<res-name>][.instance.<instance>] */

	var s = addr.split(':');
	if (s[0] != 'user')
		return null;

	return s[1];
};

module.exports = prot;
