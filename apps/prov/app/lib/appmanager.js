var db = require('prov/app/lib/db');
var models = require('prov/app/models/common');
var config_controller = require('prov/app/lib/config-controller');

var resources = require('prov/app/controllers/resources');
var sess_host_controller = require('prov/app/controllers/sess-host');
var landing_controller = require('prov/app/controllers/admin-landing');
var prov_controller = require('prov/app/controllers/prov');
var logserver_controller = require('prov/app/controllers/logserver');
var docker_controller = require('prov/app/controllers/docker');
var git_controller = require('prov/app/controllers/git');

var log = require('prov/app/common/log').child({ module : 'appmanager' });

var app = {};

db.emitter.on('db-connected', function () {
    //models.init();

    config_controller.init()
		.then (function () {
			//backend_controller.init(config_controller.get_config('backend'));

			//landing_controller.init(config_controller.get_config('landing'));

			prov_controller.init(config_controller.get_config('prov'));

			logserver_controller.init(config_controller.get_config('logserver'));

			docker_controller.init(config_controller.get_config('docker'));

			git_controller.init(config_controller.get_config('git'));

			resources.init(config_controller.get_config('resource'));

			sess_host_controller.init(config_controller.get_config('sess_host'));
		}).catch (function (error) {
			log.error({ error: error }, 'appmanager init error');
		});
});


module.exports = app;
