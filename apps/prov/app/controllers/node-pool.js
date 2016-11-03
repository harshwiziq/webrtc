var log         = require('prov/app/common/log').child({ module : 'controllers/node-pool'});
var __pool      = require('prov/app/core/node-pool');

var pool = {};
var Sess_host;

pool.init = function (req, res, next) {
	/*
	 * Gets called only as a result of the REST API to re=initialize all nodes */
	__pool.init ().then (
		function (result) {
			return res.status (200).send (result);
		},
		function (err) {
			return res.status (500).send (err);
		}
	);
};

pool.add = function (req, res, next) {
    var info = req.body;

	if (!info.id || !info.id.length)
		return res.status (400).send ('no id specified');

    __pool.add (info)
		.then (
			function (result) {
				res.status (200).send (result);
			},
			function (err) {
				res.status (500).send (err);
			}
		);
};

pool.get_config = function (req, res, next) {
    var id = req.params.id;

	return res.status (200).send (
		__pool.get_all_nodes ()
	);
};

pool.update_config = function (req, res, next) {
	return pool.add (req, res, next);
};

pool.remove_config = function (req, res, next) {
    var id = req.params.id;

	if (!id || !id.length)
		return res.status (400).send ('no id specified');

    __pool.remove (id)
		.then (
			function (result) {
				res.status (200).send (result);
			},
			function (err) {
				res.status (500).send (err);
			}
		);
};

pool.mark_ready = function (req, res, next) {
    var info = req.body;

    if (!info.hostid)
        return res.status(400).send('no hostid: bad request');

	if (!__pool.mark_ready (info.hostid, info)) {
		return res.status (500).send ('internal error');
	}

    return res.status(200).send('ok');
};

pool.get_status = function (req, res, next) {
    var id = req.params.id;
	var data;

	return res.status (200).send (
		__pool.get_node_status (id)
	);

};

module.exports = pool;
