var $         = require('jquery-deferred');
var fs        = require('fs');
var args      = require('common/args');
var log       = require('landing/common/log').child({ "module" : "landing/sessin-dev" });

controller = {};
controller.load_and_cache_config = function (req, res, next) {

	var class_id       = req.params.class_id;
	var class_profile  = req.query.profile;
	var session_server = args.get('sess-host');
	var port           = args.get('sess-port') || 443;
	var ssl            = args.get('ssl') || true;
	var proto          = ssl ? "https" : "http";

	if (!session_server)
		return next({
			status : 404,
			code   : 'NOSESSSERVERDEFINED',
			message: 'no session server defined (use --sess-host)'
		}, req, res);

	get_config (class_id, class_profile, function (err, sess_config) {

		if (err)
			return next(err, req, res);

		/*
		 * Fill in the session server information
		 *     (NOTE: the sess_host_url portion is redundant and needs to be removed
		 *     once it is removed from the landing/public/javascripts/framework/v2/cc.js) */

		sess_config.sess_host_url = proto + '://' + session_server + ':' + port;
		sess_config.session_server = {
			"protocol": args.get('sess-proto') || "https",
			"host"    : session_server,
			"port"    : args.get('sess-port') || 443,
			"ssl"     : args.get('ssl') || true
		};

		/*
		 * This is a dev setup so make the sess_id the same as the class id */
		sess_config.sess_id  = class_id;
		sess_config.class_id = class_id;

		if (!req.wiziq)
			req.wiziq = {};

		req.wiziq.sess_config = sess_config;
		req.wiziq.debug       = req.query.debug;
		return next();
	});
};

function get_config (class_id, profile, callback) {
	var sess_config;
	profile = profile || "wiziq";
	profile = __dirname + '/dev-profiles/' + profile + '.profile';

	fs.readFile (profile, 'utf8', function (err, data) {
		if (err) {
			log.error ({ err : err, file : profile }, 'error reading profile file');
			return callback (err, null);
		}

		try {
			sess_config = JSON.parse (data);
		}
		catch (e) {
			log.error ({ err : e, file : profile }, 'parse error in profile file');
			return callback ('profile "' + profile + '" parse error: ' + e, null);
		}

		callback (null, sess_config);
	});
}

module.exports = controller;
