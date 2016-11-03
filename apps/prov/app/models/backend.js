var promise = require('bluebird');
var mongoose = require('mongoose');
var db_error = require('../lib/db-error');
var log = require('prov/app/common/log').child({ module : 'models/backend' });

var Schema = mongoose.Schema;

var backend_schema = new Schema({
	config : {
		host     : { type : String, required:true },
		port     : { type : Number },
		protocol : { type : String, required:true },
	}
});

mongoose.Promise = promise;

/* virtuals */

/* validations */

/* pre save hooks */

/* methods */

/* statics */
backend_schema.statics.create = function (config) {
    var p = promise.pending();

    this.findOneAndUpdate({}, config, { upsert : true, new : true, overwrite : true }, function (err, data) {
        if (err)
            return on_error.call(p, 'create_config', err);

        return p.resolve (data);
    });

    return p.promise;
};

backend_schema.statics.get_config = function () {
    var p = promise.pending();

    this.findOne({})
        .exec()
		.then (
			function (docs) {
				return p.resolve(docs);
			},
			function (err) {
				return on_error.call (p, 'get_config', err);
			}
		);

    return p.promise;
};

backend_schema.statics.get_all = function () {
	return this.get_config();
};


backend_schema.statics.update_config = function (info) {
	return this.create_config(info);
};

backend_schema.statics.remove_config = function () {
    var p = promise.pending();

    this.findOneAndRemove({ }, function (err, data) {
        if (err) {
            log.debug({ err : err, data : data }, 'findOneAndRemove callback');
            return on_error.call(p, 'remove_config', err);
        }

        if (!data) {
            return p.reject(not_found());
        }

        return p.resolve(data);
    });

    return p.promise;
};

function on_error (function_cal, error) {
    log.error({ error: error }, funciton_call + ': error');
    var err = db_error.get_detail(error);
    return this.reject(err);
}

function not_found () {
    var error = {};
    error.code = 404;
    error.message = 'Not Found';
    return error;
}

module.exports = backend_schema;
