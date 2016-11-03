/* schema for landing-server-profile */

var mongodb  = require('mongodb');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema (
	{
		name         : { type : String, unique : true, required : true, index : true },
		address      : { type : String },
		protocol     : { type : String },
		port         : { type : Number }
	}
);

module.exports = schema;

