/*
 * To avoid the ../../ mess */
require('app-module-path').addPath(__dirname);

var express         = require('express');
var path            = require('path');
var favicon         = require('serve-favicon');
var e_logger        = require('express-bunyan-logger');

var log             = require('common/log').log;
var args            = require('common/args');
var tracker         = require('common/tracker');
var proxy           = require('common/proxy');
var app_config      = require('common/config');
var config          = require('common/config');

if (args.get('landing'))
	var landing = require('landing/app');
if (args.get('backend'))
	var api = require('api-backend/app');
if (args.get('prov'))
	var prov = require('prov/app');
if (args.get('auth'))
	var auth = require('auth/app');
if (args.get('agent'))
	var agent = require('node-agent/app');

log.info ('Starting main app');
proxy.add_route ('/favicon.ico', 'http://localhost:' + app_config.app_port + '/favicon.ico');
proxy.add_route ('/stylesheets', 'http://localhost:' + app_config.app_port + '/stylesheets');
proxy.add_route ('/images', 'http://localhost:' + app_config.app_port + '/images');

var app = express();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/* Load middlewares */
app.use(favicon(__dirname + '/public/favicon.ico'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(tracker);
app.set('trust proxy', true);
app.use('/stylesheets', express.static(__dirname + '/public/stylesheets'));

/* Add all static paths for sub-modules here */
if (args.get('landing'))
	app.use('/landing', express.static(__dirname + '/landing/public'));
if (args.get('auth'))
	app.use('/auth', express.static(__dirname + '/auth/public'));

app.use(e_logger({
	genReqId: function (req) { return req.req_id; },
	format: "HTTP :incoming :status-code :method :url :remote-address",
	excludes : [ 'req' , 'res', 'req-headers', 'res-headers', 'user-agent',
					'body', 'short-body', 'response-hrtime', 'http-version',
					'incoming', 'remote-address', 'method', 'url', 'status-code', 'ip'
	],
	levelFn : function (status, err, meta) {
		if (meta.url === '/agent/node/v1/health')
			return 'debug';

		if (status >= 300)
			return 'warn';
	},
	logger:log
}));

/* Load routes */
if (args.get('landing'))
	app.use('/landing/', landing);
if (args.get('backend'))
	app.use('/backend/', api);
if (args.get('prov'))
	app.use('/prov/', prov);
if (args.get('auth'))
	app.use('/auth/', auth);
if (args.get('agent'))
	app.use('/agent/', agent);

app.use(e_logger.errorLogger({
	showStack : true
}));

/*
 * Error handlers
 * --------------------
 * Development error handler - will print stacktrace
 */
function format_message (err) {
	var main_msg = '';
	var detail  = (typeof err === "string" ? err : err.message);
	var status  = err.status || 500;
	var code    = err.code || '';

	switch (err.status) {
		case 404 :
			main_msg = 'For Some Reason The Page You Requested Could Not Be Found On Our Server';
			break;
		case 500 : /* Fall through */
		default :
			main_msg = 'For Some Reason We Could Not Process This Request. Please Try Again Later';
			break;
	}

	if (app.get('env') === 'development')
		return {
			message : main_msg,
			detail  : detail,
			status  : status,
			code    : code
		};
	/*
	 * Production env */
	return {
		message : main_msg,
		detail  : '',
		status  : status,
		code    : code
	};
}

/*
 * IMPORTANT : this one should likely be taken out, since the 
 * errors should primarily be handled by the individual applications
 * themselves. */
app.use(function(__err, req, res, next) {
	var err = format_message (__err);
	res.status(err.status);

	if (req.xhr)
		return res.send(__err);

	if (err.status === 404)
		res.render ('global/katyayani/404', err);
	else
		res.render('error', err);

	return;
});

app.listen (config.app_port);
module.exports = app;
