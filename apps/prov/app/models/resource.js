var promise = require('bluebird');
var mongoose = require('mongoose');
var db_error = require('../lib/db-error');
var log = require('prov/app/common/log').child({ module : 'models/resource'});

var Schema = mongoose.Schema;

var resource = new Schema({
    name   : { type : String, unique: true, required: true },
    custom : { type : Object }
});

mongoose.Promise = promise;

resource.statics.create = function (config) {
    var p = promise.pending();

    log.debug({ config : config }, 'resource create config');

	if (!config.name) {
		log.error ({ config : config }, 'no name specified');
		p.reject ('resource has no name');
		return p.promise;
	}

    this.findOneAndUpdate({ name : config.name }, config, { upsert : true, new : true })
		.then (
			p.resolve.bind (p),
			function (error) {
				var err = db_error.get_detail (error);
				p.reject (err);
				log.error ({ err : err, config : config }, 'db create failed');
			}
		);

    return p.promise;
};

resource.statics.get = function (name) {
    var p = promise.pending();

    this.findOne ({ name: name })
        .exec()
		.then (
			function (data) {
				return p.resolve (data);
			},
			function (error) {
				var err = db_error.get_detail (error);
				p.reject (err);
				log.error ({ err : err, resource : name }, 'db get failed');
			}
		);

    return p.promise;
};

resource.statics.get_all = function () {
    var p = promise.pending();

    this.find({ })
        .select('-__v, -_id')
        .exec()
		.then (
			p.resolve.bind (p),
			function (error) {
				var err = db_error.get_detail (error);
				return p.reject (err);
			}
		);

    return p.promise;
};


resource.statics.update = function (config) {
	return resource.create (config);
};

resource.statics.remove = function (name) {

    var p = promise.pending();

    this.findOneAndRemove ({ name : name }, function (err, data) {

        if (err) {
			var error = db_error.get_detail (err);
			log.error ({ err : error, resource : name }, 'db remove error');
			return p.reject (error);
        }

        if (!data) {
			log.error ({ resource : name }, 'db remove : no data');
			return p.reject ({
				code : 404,
				message : 'resource not found'
			});
        }

        return p.resolve (data);
    });

    return p.promise;

};

module.exports = resource;



