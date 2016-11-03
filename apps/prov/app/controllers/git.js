var log = require('prov/app/common/log').child({ module : 'controllers/git'});

var git_controller = {};
var Git;

git_controller.init = function (config) {
    log.debug({ config: config }, 'git_controller init');
    Git = require('./../models/common').git;
};

git_controller.create_config = function (req, res, next) {
    var info = req.body;

    Git.create_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

git_controller.get_config = function (req, res, next) {
    var branch = req.body.branch;

    Git.get_config(branch)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

git_controller.update_config = function (req, res, next) {
    var info = req.body;

    Git.update_config(info)
        .then (on_success.bind(null, res))
        .catch (on_fail.bind(null, res));
};

git_controller.remove_config = function (req, res, next) {
    var branch = req.body.branch;

    Git.remove_config(branch)
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

module.exports = git_controller;
