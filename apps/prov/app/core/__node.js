var promise        = require ('bluebird');
var log            = require('prov/app/common/log').child({ module: 'core/__node' });
var config         = require('prov/app/config/config');
var config_control = require('prov/app/lib/config-controller');
var node_if        = require('prov/app/core/node-if');
var prov_config    = require('prov/app/config/prov');

function host (info) {
    this.id = info.id;
    this.protocol = info.protocol;
    this.host = info.host;
    this.port = info.port;
    this.host_url = this.protocol + '://' + this.host;
    this.state = 'offline';
    this.error = 'none';
    this.ping_path = config.api.sess_host.ping_path;
    this.ping_interval = config.nodes.health.ping_interval;
    this.ping_max_missed = config.nodes.health.max_missed;
    this.ping_missed = 0;
    this.timer_id = null;
    this.host_spec = {};
    this.num_sessions = 0;
    this.sessions = new Set();
}

host.prototype.change_state = function (new_state, error) {
    var current_state = this.state;
    var transition = true;

	if (error)
		log.error ({ old_state: current_state, new_state: new_state, error : error }, 'node "' + this.id + '" state transition');
	else
		log.info ({ old_state: current_state, new_state: new_state }, 'node "' + this.id + '" state transition');

    this.error = 'none';
    if (error) {
        this.error = error;
    }

    switch (new_state) {
        case 'offline'   : break;
        case 'acquiring' : this.state = new_state; this.acquire(); break;
        case 'acquired'  : this.state = new_state; break;
        case 'ready'     : this.state = new_state; this.on_ready(); break;
        case 'failed'    : this.state = new_state; this.on_failed() ; break;
        case 'released'  : this.state = new_state; break;
        default          : break;
    }

    if (!transition) {
        log.warn({ old_state: current_state, new_state: new_state }, 'invalid state transition');
    }
};

host.prototype.set_ready = function (info) {
    this.set_spec(info);

    switch (this.state) {
        case 'ready' :
            log.debug({ id : this.id }, 'already in ready state');
            this.ping_missed = 0;
            return;
        case 'released' :
            log.info({ id : this.id }, 'in released state');
            return;
        default:
            break;
    }

    this.change_state('ready');
    log.info ({ id: this.id }, 'node is ready and active');
};


host.prototype.set_spec = function (spec) {
    this.host_spec = spec; // filter
};

host.prototype.add_session = function (sess_id) {
    if (sess_id) {
        this.sessions.add(sess_id);
    }
};

host.prototype.remove_session = function (sess_id) {
    if (this.sessions.has(sess_id)) {
        this.sessions.delete(sess_id);
    }
};

host.prototype.get_num_session = function () {
    return this.sessions.size;
};

host.prototype.release = function () {
	var p = promise.pending ();

    log.debug ({ id: this.id }, 'attempting to release node');

    this.delete_hb_timer ();

	var __this = this;
    node_if.send (this.host_url, 'release')
		.then (
			function (response) {
				__this.change_state ('released');
				p.resolve (__this);
			},
			function (err) {
				__this.change_state ('failed', 'on release : ' + err);
				p.reject (err);
			}
		);
	
	return p.promise;
};

host.prototype.on_ready = function () {
    this.ping_missed = 0;
    this.start_ping();
};

host.prototype.on_failed = function () {
    this.stop_ping();
};

host.prototype.start_ping = function () {
    log.debug({ id: this.id }, 'start health');
    this.timer_id = setInterval(this.send_ping.bind(this), this.ping_interval);
};

host.prototype.send_ping = function () {
    log.info();
    node_if.send(this.host_url, 'ping')
        .then (health_ok.bind(this))
        .catch (on_hb_miss.bind(this));
};

function health_ok () {
    this.ping_missed = 0;
}

function on_hb_miss (err) {
    log.warn({ err: err, id: this.id }, 'send ping failed');
    if (++this.ping_missed === this.ping_max_missed) {
        this.change_state('failed', 'heartbeat missed');
    }
}

host.prototype.stop_ping = function () {
    this.delete_hb_timer();
};


host.prototype.delete_hb_timer = function () {
    if (this.timer_id) {
        clearInterval(this.timer_id);
    }
};

host.prototype.acquire = function () {
	var p = promise.pending ();

    this.state = 'acquiring';

    var data = {};

    data.git       = this.to_json (config_control.get_config ('git'));
    data.docker    = this.to_json (config_control.get_config ('docker'));
    data.logserver = this.to_json (config_control.get_config ('logserver'));
    data.prov      = prov_config.get ();

    if (!data.prov)
        return this.handle_acquire_failure (p, 'provisioning configuration not set');

    data.host = {
        id            : this.id,
        host_url      : this.host_url,
        ping_interval : this.ping_interval
    };

	var __this = this;
    node_if.send (this.host_url, 'acquire', data)
        .then (
			function (response) {
				/*
				 * Node Acquire OK */
				log.info ({
					id   : __this.id,
					host : __this.host,
					url  : __this.host_url,
				}, 'node acquire ok');

				__this.change_state('acquired');
				return p.resolve (response);
			},
			function (err) {
				__this.handle_acquire_failure (p, err);
			});

		return p.promise;
};

host.prototype.to_json = function (data) {
    return (data instanceof Array && data.length ===1) ? data[0] : data;
};

host.prototype.handle_acquire_failure = function (p, error) {
    log.error ({
		id   : this.id,
		host : this.host,
		url  : this.host_url,
		error: error
	}, 'node acquire error');

    if (!error || !error.code || error.type) {
        error = (error.type && error.code) ? error.type + error.code : error;
        this.change_state('failed', 'on acquire : ' + error);
    }

	return p.reject (error);
};

function on_acquire_success () {
    log.info ({
		id   : this.id,
		host : this.host,
		url  : this.host_url,
	}, 'node acquire ok');

    this.change_state('acquired');
}

module.exports = host;
