var promise = require('bluebird');
var config_map = require('prov/app/lib/config-map');
var models = require('prov/app/models/common');
var log = require('prov/app/common/log').child({ module : 'config_controller' });
var config = require('prov/app/config/config');

var config_controller = {};
var resource = config.prov.db.resources || ['resource', 'sess_host', 'landing', 'backend', 'prov', 'logserver', 'docker', 'git'];
var config = [];

config_controller.init = function () {
    log.info({ resource: resource }, 'loading resource info');
    var p = promise.pending();

    var query = [];
    for ( var r = 0; r < resource.length ; r++ ) {
        var db_model = get_model(resource[r]);
		log.debug ({ r:r, res:resource[r]}, 'pushing db_model for ');
        query.push(db_model.get_all());
    }

    promise.all(query)
        .then (function (res) {
            handle_config(res);
            p.resolve();
        }).catch (function (error) {
            log.error({ error: error }, 'db all config docs error !');
            p.reject(error);
        });

    return p.promise;
};

config_controller.get_config = function (resource_name) {
    return is_valid(resource_name) ? config_map.get(resource_name) : null;
};

config_controller.set_config = function (resource_name, data) {
    save_config(resource_name, data);
};

function is_valid (resource_name) {
    return resource.indexOf(resource_name) === -1 ? false : true;
}

function get_model (name) {
    switch (name) {
        case 'resource' : return models.resource;
        case 'sess_host' : return models.sess_host;
        case 'landing' : return models.landing;
        case 'backend' : return models.backend;
        case 'prov' : return models.prov;
        case 'logserver' : return models.logserver;
        case 'docker' : return models.docker;
        case 'git' : return models.git;
        default: break;
    }
}

function handle_config (res) {
    if (res && res instanceof Array && res.length !==0) {
        for ( var i = 0; i < res.length; i++ ) {
            save_config(resource[i], res[i]);
        }
    }
}

function save_config (name, data) {
    config_map.add(name, data);
}


module.exports = config_controller;
