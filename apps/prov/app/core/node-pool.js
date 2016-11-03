var promise     = require ('bluebird');
var pool_config = require ('prov/app/config/node-pool');
var __node      = require ('prov/app/core/__node');
var log         = require('prov/app/common/log').child({ module : 'core/node-pool'});

var pool        = {};
var map_pending = {};
var map_ready   = {};
var map_failed  = {};

pool.init = function () {
	var p = promise.pending ();
	var nodes;

	try {
		nodes = pool_config.get_all ();
	}
	catch (e) {
		log.error ({ err : e }, 'get node pool config failed');
		p.reject (e);
		return p.promise;
	}

	acquire_nodes (nodes)
		.then (
			p.resolve.bind (p),
			p.reject.bind (p)
		);

	return p.promise;
};

pool.add = function (node_info) {
	var p = promise.pending ();
	var n = new __node (node_info);

	log.debug ({ node : node_info }, 'attempting to acquire node');

	n.acquire ()
		.then (
			function () {
				/*
				 * Add it in the config */
				pool_config.add (node_info)
					.then (
						function () {
							add_to_pending (n);
							return p.resolve (node_info);
						},
						function (err) {
							/* This is tricky. The node is added but the DB update failed.
							 * return qualified success */
							log.error ({ err : err }, 'pool config add error');
							node_info.warning = 'while the node is active, the db update failed. manual intervention required';
							return p.resolve (node_info);
						});
			},
			function (err) {
				add_to_failed (n);
				return p.reject (err);
			}
		);

	return p.promise;
};

pool.remove = function (id) {
	var p        = promise.pending ();
	var node_obj = pool.get_node_info (id);

	if (!node_obj) {
		p.reject ('no such node');
		return p.promise;
	}

	node_obj.release ()
		.then  (function () { /* DO nothing */ })
		.error (function (err) {
			log.error ({ err : err }, 'node release error. proceeding to remove from configuration anyway');
		})
		.finally (
			function () {
				pool_config.remove (id)
					.then (
						function () {
							remove_node (id);
							return p.resolve (node_obj);
						},
						function (err) {
							log.error ({ err : err }, 'node remove error, though node is released. manual interventtion required');
							return p.reject (err);
						}
					);
			}
		)
		;

	return p.promise;
};

pool.get_ready_node_info = function (id) {
	return map_ready [id];
};

pool.get_node_info = function (id) {

	if (map_ready [id])
		return map_ready [id];

	if (map_pending [id])
		return map_pending [id];

	if (map_failed [id])
		return map_failed [id];

	return null;
};

pool.get_all_nodes = function () {
	var result = {
		active : [],
		pending : [],
		failed : []
	};

	/*
	 * Push all the active nodes */
	Object.keys (map_ready).forEach(function (id) {
		result.active.push ({
			id       : id,
			host     : map_ready[id].host,
			protocol : map_ready[id].protocol,
			port     : map_ready[id].port
		});
	});

	/*
	 * Push all the pending nodes */
	Object.keys (map_pending).forEach(function (id) {
		result.pending.push ({
			id       : id,
			host     : map_pending[id].host,
			protocol : map_pending[id].protocol,
			port     : map_pending[id].port
		});
	});

	/*
	 * Push all the failed nodes */
	Object.keys (map_failed).forEach(function (id) {
		result.failed.push ({
			id       : id,
			host     : map_failed[id].host,
			protocol : map_failed[id].protocol,
			port     : map_failed[id].port
		});
	});

	return result;
};

function reduce (curr, index, arr) {
	return {
		id       : curr.id,
		host     : curr.host,
		protocol : curr.protocol,
		port     : curr.port
	};
}

pool.get_node_status = function (id) {
	var arr = [];

	Object.keys (map_ready).forEach (function (__id) {
		if (!id || id == __id)
			arr.push (distort (map_ready [ __id ]));
	});

	return arr;
};

function distort (node_obj) {
	/*
	 * Just return some selected members, nothing fancy */
	return {
		id : node_obj.id,
		protocol        : node_obj.protocol,
		host            : node_obj.host,
		port            : node_obj.port,
		state           : node_obj.state,
		error           : node_obj.error,
		ping_path       : node_obj.ping_path,
		ping_interval   : node_obj.ping_interval,
		ping_max_missed : node_obj.max_missed,
		ping_missed     : node_obj.ping_missed,
		host_spec       : node_obj.host_spec,
		num_sessions    : node_obj.num_sessions,
		sessions        : node_obj.sessions
	};
}

pool.get_active_nodes = function () {
	var arr = [];

	/*
	 * This method needs to return an array */

	Object.keys (map_ready).forEach(function (curr) {
		arr.push (map_ready [ curr ]);
	});

	return arr;
};

pool.mark_ready = function (node_id, info) {
	var node_obj = null;

	node_obj = add_to_ready (node_id);
	if (!node_obj) {
		log.error ({ info: info }, 'error in marking node ready : node not in pending list');
		return false;
	}

	node_obj.set_ready (info);

	return true;
};

function acquire_nodes (nodes) {
	var p = promise.pending ();
	var counter = nodes.length;
	var p_arr = [], p_nodes = [];

	function ok (node_info) {
		counter --;
		p_nodes.push (node_info);
		if (!counter)
			return p.resolve (p_nodes);
	}

	function fail (__node, err) {
		counter --;
		p_nodes.push ({ node : __node, error : err });
		if (!counter)
			return p.resolve (p_nodes);
	}

	if (!nodes.length) {
		log.warn ('no configured nodes found');
		p.resolve ();
		return p.promise;
	}

	nodes.forEach (function (curr, index, arr) {
		pool.add (curr)
			.then ( ok, fail.bind(curr));
	});

	return p.promise;
}

function add_to_pending (node_obj) {
	if (map_failed [ node_obj.id ])
		delete map_failed [ node_obj.id ];

	map_pending [ node_obj.id ] = node_obj;
}

function add_to_failed (n) {
	map_failed [ n.id ] = n;
}

function add_to_ready (node_id) {
	if (!map_pending [ node_id ]) {
		return null;
	}

	var node_obj          = map_pending [ node_id ];
	map_ready [ node_id ] = node_obj;

	delete map_pending [ node_id ];

	return node_obj;
}

function remove_node (node_id) {
	if (map_ready [ node_id ])
		delete map_ready [ node_id ];
}

module.exports = pool;
