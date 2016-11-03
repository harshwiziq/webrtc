/* schema for display-profile */

var mongodb  = require('mongodb');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema (
	{
		name      : { type : String, required : true, unique : true, index : true },
		structure : { type : String, default : 'classic-1' },
		layout    : { type : String, default : 'classic-1' },
		theme     : { type : String, default : 'sujits-vision' }
	}
);


module.exports = schema;
