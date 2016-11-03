var $               = require("jquery-deferred");
var rest            = require("restler");
var netroute        = require("netroute");
var mylog           = require("./common/log").sub_module('agent');

var agent   = {};
var gateway = netroute.getGateway ();

agent.send_event = function (sess_id, evt_name, data) {
	var url = 'http://' + gateway + ':2178/agent/session/v1/event';

	/*
	 * Let the caller handle the events */
	var payload = {
		header : {
			sess_id  : sess_id,
			evt_name : evt_name
		},
		data : data
	};

	mylog.debug ({ payload : payload, url : url }, 'sending event to upstream agent');
	return rest.postJson (url, payload);
};

module.exports = agent;
