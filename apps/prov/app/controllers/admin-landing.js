var log = require('prov/app/common/log').child({ module : 'controllers/landing'});

var landing_controller = {};
var Landing;

landing_controller.init = function (config) {
    log.debug({ config: config }, 'landing_controller init');
    Landing = require('./../models/common').landing;
};

landing_controller.create_config = function (req, res, next) {
    var info = req.body;

    Landing.create_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

landing_controller.get_config = function (req, res, next) {
    var name = req.body.name || 'landing';

    Landing.get_config(name)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

landing_controller.update_config = function (req, res, next) {
    var info = req.body;

    Landing.update_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

landing_controller.remove_config = function (req, res, next) {
    var name = req.body.name;

    Landing.remove_config(name)
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

module.exports = landing_controller;
