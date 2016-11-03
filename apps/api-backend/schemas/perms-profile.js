/* schema for roles-perms */

var mongodb  = require('mongodb');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema (
	{
		name   : { type : String, unique : true, required : true, index : true },
		perms  : { type : Object }
	}
);


module.exports = schema;

