var EventEmitter = require('events').EventEmitter;
var mongodb = require('../../../../common/mongodb');
var mongo_url = 'mongodb://localhost:27017/impact_v2?maxPoolSize=10';

function deep_clone(obj) {
		var tmp = JSON.stringify(obj);
		return JSON.parse(tmp);
}

function insert_reports (collection) {
	var reports = [
		{
			id : 'mycogen-acre-bonus',
			name : 'Mycogen Acre Bonus',
			company : 'Dow',
			subscriptions : {
				timeofday : '',
				state : 'disabled'
			}
		},
		{
			id : 'das-seed-am',
			name : 'DAS Seed Customer Tab',
			company : 'Dow',
			subscriptions : {
				timeofday : '',
				state : 'enabled'
			}
		},
	];

	collection.insertMany(reports, function (err, results) {
		if (err)
			return log.error ('insertMany failed : ' + err);

		log.info ('insertMany - ok :', results.result);

		create_index ();
	});
}

function create_index () {
	mongodb.db().createIndex ('reports', 'id', { unique: true}, function (err, results) {
		if (err)
			return log.error ('create-index : err = ' + err);
		log.info ('create-index - ok : ', results);
		process.exit(0);
	});
}

function create_new_collection () {
	/* Create a reports collection */
	mongodb.db().createCollection ('reports', function (err, collection){
		if (err)
			return log.error ('err = ' + err);

		insert_reports (collection);
	});
}

mongodb._connect (mongo_url);
mongodb.emitter.on ('impact.mongo.connected', function () {

	if (mongodb.reports()) {

		mongodb.reports().drop (function (err, reply) {
			if (err && (err != 'MongoError: ns not found'))
				return log.error ('db \"reports\" dropped - err = ' + err);

			log.info ('db \"reports\" dropped - ok');
			create_new_collection ();
		});
	}
	else
		create_new_collection ();
});
