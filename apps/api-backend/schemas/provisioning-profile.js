/* schema for provisioning-server-profile */

var mongodb  = require('mongodb');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema (
	{
		name         : { type : String, unique : true, required : true, index : true },
		protocol     : { type : String },
		address      : { type : String },
		port         : { type : Number }
	}
);

module.exports = schema;

