var rest      = require('restler');
var $         = require('jquery-deferred');
var async     = require('async');
var config    = require('landing/models/config');
var log       = require('landing/common/log').child({ module : 'landing/prov-if'});


/*
 * This is a interface to the actual backend. Going forward
 * the backend may reside on a different location and the
 * communication to it will be be controlled by this module.
 *
 * For now, we code the backend right here.
 *
 */

controller = {};
controller.get_sess_info = function (prov_profile, class_id) {
    var _d = $.Deferred();
    var timeout = 5000;
    var headers = { 'Content-Type':'application/json' };
	var url     = 'https://' + prov_profile.address + '/prov/v1/class/'+ class_id + '/config';
    var r;

	r = rest.get (url, { timeout : timeout, headers : headers });

    r.on('success', function (data, response) {
        _d.resolve(data);
    });

    r.on('fail', function (data, response) {
        log.error ({ prov: prov_profile, url: url, data: data }, 'provisioning server returned failure "' + data + '"');
        return data ? _d.reject(data) : _d.reject('failed');
    });

    r.on('error', function (err, response) {
        log.error ({ prov: prov_profile, url: url, err: err }, 'connect to provisioning error');
        _d.reject(err);
    });

    r.on('timeout', function (ms) {
        log.error ({ prov: prov_profile, url: url, ms: ms }, 'connect to provisioning timeout');
        _d.reject('timeout');
    });

    return _d.promise();
};

module.exports = controller;
