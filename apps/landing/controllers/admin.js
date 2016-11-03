var $         = require('jquery-deferred');
var cache     = require('common/cache').init('landing-admin', 4*60*60*1000);
var path      = require('path');
var async     = require('async');
var config    = require('landing/models/config');
var log       = require('landing/common/log').child({ "module" : "landing/admin" });

controller = {};

controller.get_config = function (req, res, next) {

	config.get ()
		.then (
			function (r) {
				res.status(200).send(r);
			},
			function (r) {
				res.status(500).send(r);
			}
		);
};

controller.set_config = function (req, res, next) {

	var _config = req.body;

	config.set (this, _config)
		.then (
			function (r) {
				res.status(200).send(r);
			},
			function (r) {
				res.status(500).send(r);
			}
		);
};

module.exports = controller;
