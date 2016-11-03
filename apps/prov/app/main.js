var promise       = require('bluebird');
var proxy         = require('common/proxy');
var app_config    = require('common/config');
var q_controller  = require('prov/app/lib/q-controller');
var s_controller  = require('prov/app/core/session-controller');
var process       = require('prov/app/lib/process');
var log           = require('prov/app/common/log').child({ module: 'main' });
var backend       = require('prov/app/config/backend');
var landing       = require('prov/app/config/landing');
var prov          = require('prov/app/config/prov');
var node_pool_m   = require('prov/app/config/node-pool');
var node_pool     = require('prov/app/core/node-pool');
var resources     = require('prov/app/resources/controller');
var db            = require('prov/app/lib/db');

var models = require('prov/app/models/common');

var app = {};

var app_port = app_config.app_port;

app.init = function init () {
    var p = promise.pending();

	db.emitter.on('db-error', function (err) {
		return p.reject (err);
	});

	db.emitter.on('db-connected', function () {

		proxy.add_route ('/prov', 'http://localhost:' + app_config.app_port + '/prov');

		models.init ();

		q_controller.init()
			.then ( backend.init,                          __error_out.bind ('q-controller',    p) )
			.then ( landing.init,                          __error_out.bind ('backend',         p) )
			.then ( prov.init,                             __error_out.bind ('landing',         p) )
			.then ( node_pool_m.update_cache,              __error_out.bind ('prov',            p) )
			.then ( node_pool.init,                        __error_out.bind ('pool cache',      p) )
			.then ( resources.init,                        __error_out.bind ('node pool',       p) )
			.then ( s_controller.init,                     __error_out.bind ('resources',       p) )
			.then ( p.resolve.bind (p),                    __error_out.bind ('sess controller', p));
	});

    return p.promise;
};

function __error_out (p, err) {
	log.error ({ err : err }, this + ' init failed');
	p.reject (err);
	return;
}

module.exports = app;
