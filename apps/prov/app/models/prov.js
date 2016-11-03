var promise  = require('bluebird');
var mongoose = require('mongoose');
var db_error = require('prov/app/lib/db-error');
var log      = require('prov/app/common/log').child ({ module : 'models/prov'});

var Schema = mongoose.Schema;

/* virtuals*/
var prov_schema = new Schema({
	config : {
		host     : { type : String, required:true },
		port     : { type : Number },
		protocol : { type : String, required:true },
	}
});

mongoose.Promise = promise;

/* virtuals*/

/* validations */

/* pre save hooks */

/* methods */

/* statics */
prov_schema.statics.create = function (config) {
    var p = promise.pending();

    this.findOneAndUpdate({}, config, { upsert : true, new : true }, function (err, data) {
        if (err) {
            return on_error.call(p, err);
        }
        return on_success.call(p, 'create config', data.config);
    });

    return p.promise;
};

prov_schema.statics.get_config = function () {
    var p = promise.pending();

    this.findOne({})
        .exec()
        .then (function (docs) {
            on_success.call(p, 'get config', docs);
        }).catch (on_error.bind(p));

    return p.promise;
};

prov_schema.statics.get_all = function () {
	return this.get_config();
};

prov_schema.statics.update_config = function (info) {
	return this.create_config (info);
};

prov_schema.statics.remove_config = function (name) {
    log.debug({ name: name }, 'prov remove config');

    var p = promise.pending();

    this.remove({ name: name })
        .exec()
        .then (check_removed_result.bind(p))
        .catch (on_error.bind(p));

    return p.promise;
};

function on_success (msg, data) {
    return this.resolve(data);
}

function on_error (error) {
    log.error({ error: error }, 'on_error handler');
    var err = db_error.get_detail(error);
    return this.reject(err);
}

function check_removed_result (data) {
    log.debug({ data: data }, 'check_removed_result');
    if (data && data.result && data.result.n) {
        return this.resolve('delete ok');
    }
    return this.reject(not_found());
}

function not_found () {
    var error = {};
    error.code = 404;
    error.message = 'Not Found';
    return error;
}

module.exports = prov_schema;



