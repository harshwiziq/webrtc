var promise = require('bluebird');
var mongoose = require('mongoose');
mongoose.Promise = promise;
var db_error = require('../lib/db-error');
var log = require('prov/app/common/log').child({ module : 'models/logserver'});

var Schema = mongoose.Schema;

var logserver_schema = new Schema({
    name     : { type : String, unique: true, required: true },
    protocol : { type : String, required:true },
    host     : { type : String, required:true },
    port     : { type : Number, required:true },
    role     : { type : String, required:true },
    weight   : { type : String },
    uri      : { type : String }
});

/* virtuals */

/* validations */

/* pre save hooks */

/* methods */

/* statics */
logserver_schema.statics.create_config = function (config) {
    log.debug({ config: config }, 'logserver create config');

    var p = promise.pending();

    this.create(config)
        .then ( on_success.bind(p) )
        .catch ( on_error.bind(p) );

    return p.promise;
};

logserver_schema.statics.get_config = function (name) {
    log.debug({ name: name }, 'logserver get config');

    var p = promise.pending();

    this.find({ name: name })
        .exec()
        .then ( check_get_result.bind(p) )
        .catch ( on_error.bind(p) );

    return p.promise;
};

logserver_schema.statics.get_all = function () {
    var p = promise.pending();

    this.find({ })
        .select('-__v, -_id')
        .exec()
        .then (function (data) {
            return p.resolve(data);
        }).catch (on_error.bind(p));

    return p.promise;
};

logserver_schema.statics.update_config = function (info) {
    log.debug({ info: info }, 'update logserver config');

    var p = promise.pending();
    var opt = { new: true, upsert: false };

    this.findOneAndUpdate({ name: info.name }, { $set : info }, opt)
        .exec()
        .then ( check_update_result.bind(p) )
        .catch ( on_error.bind(p) );

    return p.promise;
};

logserver_schema.statics.remove_config = function (name) {
    log.debug({ name: name }, 'logserver remove config');

    var p = promise.pending();

    this.remove({ name: name })
        .exec()
        .then ( check_removed_result.bind(p) )
        .catch ( on_error.bind(p) );

    return p.promise;
};

function on_success (data) {
    log.debug({ data: data }, 'on_success handler');
    return this.resolve(data);
}

function on_error (error) {
    log.error({ error: error }, 'on_error handler');
    var err = db_error.get_detail(error);
    return this.reject(err);
}

function check_get_result (data) {
    return (!data || Object.keys(data).length === 0) ? this.reject(not_found()) : this.resolve(data);
}

function check_update_result (data) {
    return (!data) ? this.reject(not_found()) : this.resolve(data);
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

module.exports = logserver_schema;


