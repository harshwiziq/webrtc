var promise   = require('bluebird');
var node_pool = require('prov/app/core/node-pool');
var node_if   = require('prov/app/core/node-if');
var log       = require('prov/app/common/log').child({ module: 'balancer' });

var lb = {};

lb.route = function (api, data) {
    var p = promise.pending();
    var __node = get_best_host ();

    if (!__node) {
        p.reject('No node in ready state.');
        return p.promise;
    }

	var host_url = __node.protocol + '://' + __node.host + ':' + __node.port;

    node_if.send (host_url, api, data)
		.then (
			function () {
				return p.resolve (data);
			},
			function (error) {
				log.error({ error: error }, 'routing failed');
				return p.reject(error);
			}
		);

    return p.promise;
};

var last_node = null;
function get_best_host () {
	var nodes = node_pool.get_active_nodes ();

	if (!nodes || !nodes.length)
		return null;

	/*
	 * For now, just do round robin */

	if (!last_node) {
		last_node = nodes[0].id;
		return nodes[0];
	}

	var new_node = null;

	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i].id == last_node) {
			new_node = nodes [ (i + 1) % nodes.length ];
			last_node = new_node.id;
			return new_node;
		}
	}

	/*
	 * Choose the first node here if nothing matched */
	last_node = nodes[0].id;
	return nodes[0];
}

function on_success(data) {
    this.resolve(data);
}

lb.route_direct = function (host, api, data) {
    var p = promise.pending();

    if (!host || !api) {
        data.error = 'Bad params. No host or api provided';
        p.reject(data.error);
        return p.promise;
    }

    node_if.send(host, api, data)
        .then (function () {
            return p.resolve();
        }).catch (function (error) {
            log.error({ error: error }, 'route direct failed');
            return p.reject(error);
        });

    return p.promise;
};

module.exports = lb;
