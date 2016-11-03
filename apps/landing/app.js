var express         = require('express');
var path            = require('path');
var favicon         = require('serve-favicon');
var cookieParser    = require('cookie-parser');
var bodyParser      = require('body-parser');
var session         = require('express-session');
var express_winston = require('express-winston');

var log             = require('landing/common/log');
var args            = require('common/args');
var proxy           = require('common/proxy');
var app_config      = require('common/config');
var config          = require('landing/config');
var vc_session_dev  = require('landing/routes/session-dev');
var vc_session_v1   = require('landing/routes/session-v1');
var server_time     = require('landing/routes/server-time');
var admin           = require('landing/routes/admin');
var auth_v1         = require('landing/routes/auth-v1');
var test            = require('landing/routes/test');

var sess = { cookie:
				{ },
				secret: '&^%Gbu45t;#tLa*',
				saveUninitialized: false,
				resave: true,
			};

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('trust proxy', true);
sess.cookie.secure = true;

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sess));

proxy.add_route ('/landing', 'http://localhost:' + app_config.app_port + '/landing');

app.use('/session/dev', vc_session_dev);
app.use('/session/v1', vc_session_v1);
app.use('/time', server_time);
app.use('/admin/', admin);
app.use('/test', test);

/*
 * Error handlers
 * --------------------
 * Development error handler - will print stacktrace
 */
app.use (function (req, res, next) {
	/*
	 * Catch 404's here */
	if (req.xhr)
		return res.status (404).send ('not found');

	return res.status(404).render ('global/katyayani/404', {
		title : 'this is a 4x4'
	});
});

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

module.exports = app;
