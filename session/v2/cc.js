var WebSocketServer = require('ws').Server;
var $               = require("jquery-deferred");
var log             = require("./common/log").sub_module('cc');
var config          = require("./config");
var protocol        = require("./protocol");

var wss;

var cc = {};
var upstream;

cc.init = function (server, route, sess_config) {

	upstream = route;
	/*
	 * Init the server socket. Only one for now. */
	var wss = new WebSocketServer({ 
		server: server,
		verifyClient : verify
	});

	wss.on('connection', function (ws) {

		/* Add connection to list */
		ws.pending_acks = {};
		upstream.new_connection (ws);

		ws.on ('message', function (message) {
			handle_incoming (ws, message);
		});

		ws.on ('error', function (err) {
			upstream.error (ws, err);
		});

		ws.on ('close', function (err) {
			upstream.closed (ws);

			/* Fire any deferred's waiting on acks on this socket */
			for (var d in ws.pending_acks) {
				ws.pending_acks[d].reject('connection closed');
				delete ws.pending_acks[d];
			}
		});
	});
};

cc.send_command = function (sock, from, to, command, data) {
	var _d = $.Deferred ();

	var m = protocol.command_pdu (from, to, command, data);
	if (!m) {
		_d.reject('cc.send_command : protocol.command_pdu error');
		return _d.promise();
	}

	sock.pending_acks[m.seq.toString()] = _d;
	sock.send (JSON.stringify(m), function (err) {
		if (err) {
			log.error ({ err:err, to:to, info_id:info_id }, 'send command socket error');
			delete sock.pending_acks[m.seq.toString()];
			return _d.reject('cc.send_command: ' + err);
		}

		/* Wait for the ACK from the other end */
		protocol.print(m, 'TX');
		return;
	});

	return _d.promise ();
};

cc.send_info = function (sock, from, to, info_id, info) {
	var m = protocol.info_pdu (from, to, info_id, info);

	if (!m)
		return;

	sock.send (JSON.stringify(m), function (err) {
		if (err)
			log.error ({ err:err, to:to, info_id:info_id }, 'send info socket error');
	});
	protocol.print(m, 'TX');
};

function verify (info, callback) {
	callback (true, 0, null);
}

function handle_incoming (ws, message) {
	var m;

	try {
		m = protocol.parse (message);
	 }
	catch (e) {
		log.error ( { pdu:message, err: e.message }, 'protocol parse error');
		return;
	}

	switch (m.type) {

		case 'ping':
			handle_ping (ws, m);
			break;

		case 'req':
			protocol.print(m, 'RX');
			upstream.route_req (ws, m.from, m.to, m.msg)
				.then (
					function (data) {
						ack (ws, m, data);
					},
					function (data) {
						nack (ws, m, data);
					}
				);

			break;

		case 'info':
			protocol.print(m, 'RX');
			upstream.route_info (ws, m.from, m.to, m.msg);
			break;

		case 'ack':
			protocol.print(m, 'RX');
			process_ack (ws, m);
			break;
	}
}

function process_ack (ws, message) {
	var seq = message.seq.toString();
	var msg = message.msg;
	var conn_handle = ws.conn_handle;

	if (!ws.pending_acks[seq]) {
		log.error ({ pdu : message, seq : seq }, 'orphan ack');
		return;
	}

	switch (msg.status) {
		case 'ok':
			ws.pending_acks[seq].resolve(msg.data);
			break;

		case 'not-ok':
		case 'error':
			ws.pending_acks[seq].reject(msg.data);
			break;

		default :
			log.error ({ pdu : message, seq : seq }, 'illegal ack status');
			ws.pending_acks[seq].reject(msg.data);
			break;
	}

	delete ws.pending_acks[seq];
}

function handle_ping (ws, m) {
	m.type = 'pong';
	ws.send(JSON.stringify(m), function (err) {
		if (err)
			log.error ({ err: err, 'conn #' : ws.conn_handle.c.id, m: m}, 'pong failure');
	});
}

function ack (sock, _m, data) {
	return __ack (sock, _m, 'ok', data /* 'from' implicit from the original message */);
}

function nack (sock, _m, data) {
	return __ack (sock, _m, 'not-ok', data /* 'from' implicit from the original message */);
}

function __ack (sock, _m, status, data, from) {
	var m = protocol.ack_pdu (_m, status, data, from);

	sock.send(JSON.stringify(m), function (err) {
		if (err) {
			log.warn ({ err:err, m:_m, status: status, data: data, from:from }, 'send ack socket error');
			return;
		}

		protocol.print(m, 'TX');
	});
}

module.exports = cc;
