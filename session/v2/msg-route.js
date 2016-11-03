var WebSocketServer = require('ws').Server;
var $               = require("jquery-deferred");
var log             = require("./common/log").sub_module('msg-route');
var config          = require("./config");
var addr            = require("./addr");
var controller      = require("./controller");
var resources       = require("./resources");

route = {};
route.route_req = function (conn, from, to, msg) {

	var _d = $.Deferred ();
	/*
	 * format of addresses (from/to):
	 * 		resourceA[:instanceA][resourceB[:instanceB]] ... */

	var _to = addr.inspect_top (to);

	switch (_to.resource) {
		case 'controller' :
			/* Fall through */
		case 'user' :
			controller.process_req (conn, from, to, msg)
				.then (
					_d.resolve.bind(_d),
					_d.reject.bind(_d)
				);
			break;

		default:
			var log_ = conn.c.log;
			resources.route_command (_d, conn, from, to, msg, log_);
	}

	return _d.promise ();
};

route.route_info = function (conn, from, to, msg) {
	/*
	 * format of addresses (from/to):
	 * 		resourceA[:instanceA][resourceB[:instanceB]] ... */

	var _to = addr.inspect_top (to);

	switch (_to.resource) {
		case 'user' :
			/* Fall through */
		case 'controller' :
			controller.process_info (conn, from, to, msg);
			return;

		default:
			resources.route_info (from, to, msg);
			return;
	}

};

module.exports = route;
