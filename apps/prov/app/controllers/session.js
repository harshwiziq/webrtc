var promise   = require('bluebird');
var log       = require('prov/app/common/log').child({ module : 'controllers/session'});
var session   = require('prov/app/lib/session');
var node_pool = require('prov/app/core/node-pool');

var session_controller = {};

session_controller.set_status = function (req, res) {
    var info = req.body;

    if (!info || !info.sess_id || !info.state || !info.hostid) {
		log.error ({ info : info }, 'bad request : one of "sess_id", or "state" or "hostid" missing');
        return res.status(400).send('Bad Request');
    }

    var node_info = node_pool.get_ready_node_info (info.hostid);

    if (!node_info)
        return res.status (400).send ('node info not found');

	var addr = {
		protocol : node_info.protocol,
		host     : node_info.host,
		port     : node_info.port
	};

    session.on_state_change (addr, info.sess_id, info.state, info)
		.then (function () {
			return res.status(200).send('OK');
		})
		.catch (function (err) {
			return res.status(500).send(err);
		});
};

module.exports = session_controller;
