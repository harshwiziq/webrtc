var express      = require('express');
var path         = require('path');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var log          = require('prov/app/common/log');
var config       = require('prov/app/config/config');
var main         = require('prov/app/main');

var _class       = require('prov/app/routes/class');
var sess_host    = require('prov/app/routes/sess-host');
var session      = require('prov/app/routes/session');
var admin        = require('prov/app/routes/admin');
var config_route = require('prov/app/routes/config');

var app  = express();
var port = config.prov.port || 7000;

app.set ('views', path.join(__dirname, 'views'));
app.set ('view engine', 'jade');
app.use (bodyParser.json());
app.use (bodyParser.urlencoded({ extended: false }));
app.use (cookieParser());
app.use (express.static(path.join(__dirname, 'public')));

/*
 * Routes */
app.all('/', function (req, res) {
	res.status(403).send('forbidden');
});
app.use('/v1/class',    _class);
app.use('/v1/config',   config_route);
app.use('/v1/sesshost', sess_host);
app.use('/v1/session',  session);
app.use('/v1/admin',    admin);

main.init()
	.then (
		function () {
			log.info ('provisioning initialization ok');
			app.listen(port);
		},
		function (error) {
			log.error ({ error: error }, 'provisioning initialization failed');
			process.exit(1);
		});

function error_handlers() {
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.send({ 'status':'error', 'message': err });
            log.warn({ 'status':'error', 'data': err }, 'app.js');
        });
    } else {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.send({ 'status':'error', 'message': err.message });
            log.warn({ 'status':'error', 'err': {} }, 'app.js');
        });
    }
}

module.exports = app;
