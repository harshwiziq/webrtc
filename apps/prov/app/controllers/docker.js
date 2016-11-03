var log = require('prov/app/common/log').child({ module : 'controllers/docker'});

var docker_controller = {};
var Docker;

docker_controller.init = function (config) {
    log.debug({ config: config }, 'docker_controller init');

    Docker = require('./../models/common').docker;
};

docker_controller.create_config = function (req, res, next) {
    var info = req.body;

    Docker.create_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

docker_controller.get_config = function (req, res, next) {
    var url = req.body.url;

    Docker.get_config(url)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

docker_controller.update_config = function (req, res, next) {
    var info = req.body;

    Docker.update_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

docker_controller.remove_config = function (req, res, next) {
    var url = req.body.url;

    Docker.remove_config(url)
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

module.exports = docker_controller;
