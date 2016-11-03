/* schema for wiziq-end-points */

var mongodb  = require( 'mongodb' );
var mongoose = require( 'mongoose' );

var Schema = mongoose.Schema;

var schema = new Schema (
	{
		status_url : { type : String, required : true, unique : true, index : true }
	}
);


module.exports = schema;
