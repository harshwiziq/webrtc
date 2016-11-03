var url             = require('url');
var __log           = require("./common/log");
var log             = require("./common/log").sub_module('connection');
var events          = require('./events')('connection');
var cc              = require('./cc');

var sock_id = 1;
var list = {};

function set_user (vc_id) {
	var conn_id = this.c.id;

	if (!list[conn_id]) {
		log.error ({conn_id : conn_id}, 'unknown');
		return false;
	}

	this.c.vc_id = vc_id;
	return true;
}

function show_conn (c, comment) {
	if (!c)
		c = this.c;

	if (comment)
		comment = ' (' + comment +') ';

	log.debug (comment + '# ' + c.id + '/' + (c.state ? c.state : '-') + ' ' + c.addr + ':' + c.port + ' (user: ' + (c.vc_id ? c.vc_id : '-') + ')');
}

function send_command (from, to, command, data) {
	return cc.send_command (this.c.sock, from, to, command, data);
}

function send_info (from, to, info_id, info) {
	cc.send_info (this.c.sock, from, to, info_id, info);
}

var connection = {};

var msg_route;
connection.init = function () {
	/*
	 * A hack to resolve the circular dependencies. TODO: clean
	 * this up. */
	msg_route = require ('./msg-route');
};

connection.route_req = function (sock, from, to, msg) {
	return msg_route.route_req (sock.conn_handle, from, to, msg);
};

connection.route_info = function (sock, from, to, msg) {
	/*
	 * A hack to resolve the circular dependencies. TODO: clean
	 * this up. */
	return msg_route.route_info (sock.conn_handle, from, to, msg);
};

connection.events = events;
connection.error  = function (sock, err) {
	var c = sock.conn_handle.c;
	log.warn ({ conn_id : c.id, vc_id : c.vc_id, err : err }, 'socket error: TODO handle it');
};

connection.closed  = function (sock) {
	/*
	 * Called by cc to inform of a socket closing */
	var c = sock.conn_handle.c;

	log.info ({ conn_id : c.id, vc_id : c.vc_id }, 'closed: removing connection');
	events.emit ('closed', c.vc_id);

	/*
	 * It's possible that due to various race conditions that this
	 * has already been closed and therefore not in this list */
	if (list[c.id])
		delete list[c.id];
};

function close () {
	var sock = this.c.sock;

	sock.close (function (err) {
		/*
		 * Ignore the error, as due to a race condition
		 * this socket may have already been closed */
	});
}

connection.new_connection = function (sock) {

	var location = url.parse (sock.upgradeReq.url, true);
	var c = {
		id       : sock_id,
		sock     : sock,
		location : location.path,
		addr     : sock.upgradeReq.connection.remoteAddress,
		port     : sock.upgradeReq.connection.remotePort,
		state    : 'connected',
		log      : __log.child({ 'conn #' : sock_id })
	};

	sock_id ++;

	show_conn(c, 'new');

	if (list[c.id])
		c.log.error ({conn_id : c.id}, 'new: possibly over-writing connection info');

	list[c.id] = c;

	var handle =  {
		c            : c,
		send_info    : send_info,
		send_command : send_command,
		show_conn    : show_conn,
		set_user     : set_user,
		close        : close,
		log_handle   : function () { return this.c.log; },
	};

	sock.conn_handle = handle;

	return handle;
};

module.exports = connection;
