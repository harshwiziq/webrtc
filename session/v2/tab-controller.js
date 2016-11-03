var $               = require("jquery-deferred");
var mylog           = require("./common/log").sub_module('tab-controller');
var addr            = require("./addr");

var controller = {};
var now_showing = {};

controller.get_active_tab = function () {
	mylog.debug ({ now_showing : now_showing }, 'get active tab for session');
	return now_showing;
};

/*
 * Intercept and keep a track of the active tab for the session */
controller.relay_info = function (from, to, msg, log_) {

	if (msg.info_id === 'tab-destroyed')
		return true;

	now_showing = {
		owner : addr.user(from),
		uuid  : msg.info.uuid
	};

	return true;
};

module.exports = controller;
