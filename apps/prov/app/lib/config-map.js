var config = {};
var log = require('prov/app/common/log').child({ module : 'config_map' });

var config_map = new Map();

config.add = function (resource, info) {
    if (resource && info) {
        config_map.set(resource, info);
    }
};

config.get = function (resource) {
    return resource && config_map.has(resource) ? config_map.get(resource) : null;
};

config.remove = function (resource) {
    if (resource) {
        if (config_map.has(resource)) {
            config_map.delete(resource);
            return;
        }
        log.error({ resource: resource } , 'not found in config map');
    }
};

module.exports = config;
