var promise  = require('bluebird');
var mongoose = require('mongoose');
var db_error = require('../lib/db-error');
var log      = require('prov/app/common/log').child({ module : 'models/__node'});

var Schema = mongoose.Schema;

var __node = new Schema ({
    id            : { type : String, unique: true, required: true },
    protocol      : { type : String, required:true },
    host          : { type : String, required:true },
    port          : { type : Number },
    uri           : { type : String },
	last_modified : { type : Date, required: true, default : Date.now }
});

mongoose.Promise = promise;

/* virtuals */

/* validations */

/* pre save hooks */

/* methods */

/* statics */

__node.statics.create = function (config) {
    var p = promise.pending();

    this.findOneAndUpdate({ id : config.id }, config, { upsert : true, new : true }, function (err, data) {
        if (err) {
			log.error ({ err: err }, 'create failed');
            return on_error.call(p, err);
        }

        return on_success.call(p, data);
    });

    return p.promise;
};

__node.statics.get_config = function (id) {
    var p = promise.pending();
    var query = {};
    if (id) {
        query.id = id;
    }

    this.find(query)
        .exec()
        .then ( check_get_result.bind(p) )
        .catch ( on_error.bind(p) );

    return p.promise;
};

__node.statics.get_all = function () {
    var p = promise.pending();

    this.find({ })
        .select('-__v, -_id')
        .exec()
        .then ( function (data) {
            return p.resolve(data);
        }).catch (on_error.bind(p));

    return p.promise;
};

__node.statics.update_config = function (info) {
    var p = promise.pending();
    var opt = { new: true, upsert: false };

    this.findOneAndUpdate({ id: info.id }, { $set : info }, opt)
        .exec()
        .then ( check_update_result.bind(p) )
        .catch ( on_error.bind(p) );

    return p.promise;
};

__node.statics.remove = function (id) {

    var p = promise.pending();

    this.findOneAndRemove({ id : id }, function (err, data) {
        if (err) {
            log.debug({ err : err, data : data }, 'findOneAndRemove callback');
            return on_error.call(p, err);
        }

        if (!data) {
            return p.reject(not_found());
        }

        return p.resolve(data);

    });

    return p.promise;
};

function on_success (data) {
    return this.resolve(data);
}

function on_error (error) {
    var err = db_error.get_detail(error);
    return this.reject(err);
}

function check_get_result (data) {
    return (!data || Object.keys(data).length === 0) ? this.reject(not_found()) : this.resolve(data);
}

function check_update_result (data) {
    return (!data) ? this.reject(not_found()) : this.resolve(data);
}

function not_found () {
    var error = {};
    error.code = 404;
    error.message = 'Not Found';
    return error;
}


module.exports = __node;

