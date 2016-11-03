var log = require('prov/app/common/log').child({ module: 'session host pool' });
var host = require('prov/app/lib/host');

var sess_host_pool = {};

var host_list = [];
var next = 0;

sess_host_pool.init = function (hosts) {
    if (hosts && hosts instanceof Array && hosts.length !== 0) {
        for (var i = 0; i < hosts.length; i++) {
            if (hosts[i].id) {
                this.add_host(hosts[i].id, hosts[i]);
            }
        }
        return;
    }

    if (hosts && hosts.id) {
        this.add_host(hosts);
    }
};

sess_host_pool.add_host = function (hostid, host_info) {
    if (hostid && host_info) {

        var data = this.get_host_info(hostid);

        if (data)
            log.warn ({ hostid: hostid, host_info: data }, 'host already acquired. reacquiring');

        log.debug({ hostid: hostid, host_info: host_info }, 'adding host to pool');

        var _host = new host(host_info);
        host_list.push(_host);
        _host.acquire();
    }
};

sess_host_pool.get_host_info = function (hostid) {
    if (host_list.length === 0) {
        log.debug ('No host in pool');
        return null;
    }

    for (var i = 0; i < host_list.length; i++ ) {
        if (host_list[i].hostid === hostid) {
            return host_list[i];
        }
    }
    return null;
};

sess_host_pool.get_all = function () {
    return host_list;
};

sess_host_pool.remove_host = function (hostid) {
    log.debug({ hostid: hostid, pool_size: host_list.length }, 'remove host from pool');
    if (host_list.length === 0) {
        return false;
    }

    for (var i = 0; i < host_list.length; i++) {
        if (host_list[i].hostid === hostid) {
            host_list[i].remove();
            host_list.splice(i, 1);
            log.debug({ hostid: hostid, pool_size: host_list.length }, 'removed host from pool');
            break;
        }
    }
};

sess_host_pool.size = function () {
    return host_list.length;
};

sess_host_pool.get_host = function () {
    var pool_size = host_list.length;
    var host_url;

    if (pool_size === 0) {
        log.error('no configured session hosts');
        return null;
    }

    for (var i = 0; i < pool_size; i++, next++) {
        if (next === pool_size) {
            next = 0;
        }
        if (host_list[next].state === 'ready') {
            log.debug({ hostid: host_list[next].hostid }, 'found a ready node');
            host_url = host_list[next].host_url;
            next++;
            return host_url;
        }
    }

    log.warn({pool_size: pool_size}, 'NO host in ready state');
    return null;
};

sess_host_pool.set_host_ready = function (hostid, info) {
    var __host = this.get_host_info(hostid);
    if (!__host) {
        log.warn({ hostid: hostid }, 'No session host info present');
        return;
    }

    __host.set_ready(info);
};

sess_host_pool.next_but = function (hostid) {

};

sess_host_pool.is_registered_host = function (hostid) {

};

sess_host_pool.set_host_state = function (hostid, state) {

};

sess_host_pool.add_session = function (hostid, session_id) {

};

sess_host_pool.remove_session = function (hostid, session_id) {

};

sess_host_pool.get_num_sessions = function (hostid) {

};

module.exports = sess_host_pool;
