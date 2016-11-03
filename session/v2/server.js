var server          = require('http').createServer();
var moment          = require('moment');
var url             = require('url');
var WebSocketServer = require('ws').Server;
var netroute        = require("netroute");
var express         = require('express');
var app             = express();
var log             = require("./common/log");
var config          = require("./config");
var sess_info       = require("./session-info");
var cc              = require("./cc");
var controller      = require("./controller");
var perms           = require("./perms");
var connection      = require("./connection");
var port            = config.session_server.default_port;

var gateway = netroute.getGateway ();

function start () {
	var file = process.argv[2];

	if (!file) {
		log.error ('no session configuration file specified. aborting');
		process.exit(1);
	}

	sess_info.load (file, function (err, data) {
		if (err) {
			log.error ('sess_info.load: err = ' + err);
			return;
		}

		log.info ('*---------------- Session Server Cluster -------------*');
		log.info ('*');
		log.info ('*    CLASS     :  ' + data.class_id);
		log.info ('*    SESSION   :  ' + data.sess_id);
		log.info ('*    STARTS IN :  ' + start_time (data.start_time));
		log.info ('*    DURATION  :  ' + (data.duration === -1 ? 'infinite' : moment.duration (data.duration, 'minutes').humanize()));
		log.info ('*    GATEWAY   :  ' + gateway);
		log.info ('*    PORT      :  ' + port);
		log.info ('*');
		log.info ('*---------------- Session Info Dump Start ------------*');
		log.info ('');
		log.info ({ sess_info : data }, 'session info dump');
		log.info ('');
		log.info ('*---------------- Session Info Dump End --------------*');

		controller.init (data);
		perms.init (data);
		connection.init ();
		cc.init (server, connection, data);
	});
}

function start_time (_start) {
	var from_now = moment(_start).diff (moment ());

	if (from_now < 0)
		from_now = 0;

	return moment.utc(from_now).format('HH:mm:ss.SSS') + ' (' + moment.duration (from_now).humanize() + ')';
}

server.on('request', app);
server.listen(port, function () {
});

start ();
