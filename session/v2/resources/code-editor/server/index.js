var Model, attach, connect, create, createDb, createModel, http, websocket, log;

connect = require('connect');

http = require('http');

Model = require('./model');

createDb = require('./db');

websocket = require('./websocket');

module.exports = create = function(options, model) {
	if (model === null) {
	  model = createModel(options);
	}
	return attach(connect(), options, model);
};

create.createModel = createModel = function(options) {
	var db, dbOptions;
	dbOptions = options !== null ? options.db : void 0;
	db = createDb(dbOptions);
	return new Model(db, options);
};

create.attach = attach = function(options, model) {
	var createAgent, _ref;
	if (!model) {
	  model = createModel(options);
	}
	if (!options) {
	  options = {};
	}
	if (options.log) {
		log = options.log;
	}
	if (!(_ref = options.staticpath)) {
	  options.staticpath = '/share';
	}
	//server.model = model;
	process.on('exit', function() {
	  return model.closeDb();
	});
	createAgent = require('./useragent')(model, options);
	websocket.attach(createAgent, options);
	return;
};
