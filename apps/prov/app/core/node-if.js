var promise = require('bluebird');
var log     = require('prov/app/common/log').child({ module: 'sess_host_api' });
var librest = require('prov/app/lib/librest');

var sess_host_api = {};

sess_host_api.send = function (host, api, data) {
    var p = promise.pending();

    if (!host || !api) {
        log.error ({ host : host, api: api }, 'Bad request');
        p.reject ('Bad request');
        return p.promise;
    }

    var api_path;
    var method;

    switch (api) {
        case 'acquire' :
            api_path = '/agent/node/v1';
            method = 'POST';
            break;

        case 'release' :
            api_path = '/agent/node/v1';
            method = 'DELETE';
            break;

        case 'update' :
            api_path = '/agent/node/v1';
            method = 'PUT';
            break;

        case 'ping' :
            api_path = '/agent/node/v1/health';
            method = 'GET';
            break;

        case 'start_session' :
            api_path = '/agent/session/v1';
            method = 'POST';
            break;

        case 'stop_session' :
            api_path = '/agent/session/v1/' + data.sess_id;
            method = 'DELETE';
            break;

        default:
            log.warn({ api: api }, 'not found');
            p.reject('API not found');
            return p.promise;
    }

    var url = host + api_path;

    librest.request (url, method, data)
        .then (function (res) {
            p.resolve (res);
        }).catch (function (err) {
            p.reject (err);
        });

    return p.promise;
};

module.exports = sess_host_api;
