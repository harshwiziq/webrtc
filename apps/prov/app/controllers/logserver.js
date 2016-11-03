var log = require('prov/app/common/log').child({ module : 'controllers/logserver'});

var logserver_controller = {};
var Logserver;

logserver_controller.init = function (config) {
    log.debug({ config: config }, 'logserver_controller init');
    Logserver = require('./../models/common').logserver;
};

logserver_controller.create_config = function (req, res, next) {
    var info = req.body;

    Logserver.create_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

logserver_controller.get_config = function (req, res, next) {
    var name = req.body.name || 'logserver';

    Logserver.get_config(name)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

logserver_controller.update_config = function (req, res, next) {
    var info = req.body;

    Logserver.update_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

logserver_controller.remove_config = function (req, res, next) {
    var name = req.body.name;

    Logserver.remove_config(name)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

function on_success (res, data) {
    log.debug({ data: data }, 'on_success handler');
    return res.status(200).send({ data : data });
}

function on_fail (res, error) {
    log.error({ error: error }, 'on_fail handler');
    return res.status(error.code).send({ error : error.message });
}

module.exports = logserver_controller;
