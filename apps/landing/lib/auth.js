var url        = require('url');
var crypt      = require('common/crypt');
var app_config = require('common/config');
var config     = require('landing/models/config');

var auth = {};

auth.authenticate = function (req, res, next) {

	var log   = req.log;
	var query = url.parse (req.url).query || '';

	/*
	 * if the cookie 'wiziq_auth_landing' is set then 
	 *     1. Fetch from redis, using it's value as the key
	 *     2. If none, then the session expired --> redirect to auth gateway
	 *     3. Else set the value of user_info (redis value) into req.wiziq.user
	 *     4. Next
	 * Else check for 'wiziq_auth'.
	 * If absent then redirect to auth gateway.
	 * If present then:
	 *     1. Generate key (uuid)
	 *     1.1 Decode 'wiziq_auth' value
	 *     1.2 If unable to decode, then redirect to auth gateway
	 *     2. Store key <-> decoded wiziq_auth (which is, essentially, the user info) mapping in Redis
	 *           - with a timeout
	 *     3. Create cookie 'wiziq_auth_landing' and set it to 'key'
	 */

	/*
	 * For now, just implementing this:
	 *    1. If 'wiziq_auth' is not set --> redirect to (assuming local) auth gateway.
	 *    2. If set, then decode
	 *       2.1 If decode OK then --> set user_info in req.wiziq.user and next
	 *       2.2 If decode not-OK then --> show an auth error message
	 */

	var wiziq_auth = req.cookies.wiziq_auth;

	if (!wiziq_auth) {

		var original_url = url.format({
		    protocol: req.protocol,
		    host    : req.get('host'),
		    pathname: req.originalUrl
		  });

		res.cookie('wiziq_origin', original_url, {
			maxAge : 1000*60*60*24*7,    /* Expires in a long time */
			path   : '/',
			secure : true
		});

		var auth_via = req.query && req.query.auth_via;

		if (!auth_via)
			auth_via = 'anon';

		res.cookie('wiziq_auth_via', auth_via, {
			maxAge : 1000*60*60*24*7,    /* Expires in a long time */
			path   : '/',
			secure : false
		});

		res.set({ 'Referer' : original_url });
		redirect_to_auth (req, res, next, query);
		return;
	}

	var user_info;
	try {
		var _u = decodeURIComponent (crypt.decipher ('auth', wiziq_auth));
		user_info = JSON.parse (_u);
	}
	catch (e) {
		log.warn ({ cipher : wiziq_auth, module:'auth', error : e }, 'invalid cipher: decode error. redirecting back to auth');
		res.clearCookie ('wiziq_auth');
		redirect_to_auth (req, res, next, query);
		return;
	}

	req.wiziq = {
		user : user_info
	};

	next();
};

function redirect_to_auth (req, res, next, query) {

	/* Get the configured auth gateway address and redirect */
	var __default = {
		host     : 'localhost',
		protocol : 'http',
		port     : app_config.app_port
	};

	config.get('auth', __default)
		.then (
			function (auth_gw) {
				return res.redirect (auth_gw.protocol + '://' + auth_gw.host + ':' + auth_gw.port + '/auth/login?' + query);
			},
			function (err) {
				return next (err);
			}
		);
}

module.exports = auth;
