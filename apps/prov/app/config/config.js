var app_config = require('common/config');

var config = {};

config.rest_timeout = 5000;

config.prov = {
    port: 7000,
    db : {
        resources: ['resource', 'sess_host', 'landing', 'backend', 'prov', 'logserver', 'docker', 'git']
    },
    session: {
        sched_advance : 600000,
        sched_delay : 5,
        cache_expire : 86400 /* 24 hours in seconds */
    }
};

config.mongo = {
    server: 'mongodb://localhost/prov-v1'
};

config.redis = {
    host: '127.0.0.1',
    port: 6379
};

config.backend = {
    protocol: 'https://',
    host:  'localhost',
    port:  443,
    api_base: '/backend/provisioning/',
};

config.landing = {
    protocol: 'https://',
    host: 'localhost',
    port: 443,
};

config.nodes = {
    health: {
        ping_interval: 10000,
        ping_timeout: 5000,
        max_missed: 3
    },
};

config.git = {
    branch: 'https://bitbucket.org/wiziq/vc',
    hash: 'some_hash_will_be_here',
    creds: {
        userid: 'userid',
        passwd: 'password'
    }
};

config.docker = {
    image: 'avinashwiziq/wiziq-session:2.2',
};

config.api = {
    sess_host: {
        ping_path: '/agent/node/v1/health',
    },
};

module.exports = config;
