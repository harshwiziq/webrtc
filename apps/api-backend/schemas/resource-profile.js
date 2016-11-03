/* schema for resource-profile */

var mongodb  = require('mongodb');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema (
	{
		name          : { type : String, required : true },
		profile_name  : { type : String, required : true },
		role          : { type : String, required : true },
		display_name  : { type : String },
		req_sess_info : { type : Boolean, default : false },
		display_spec  : { 
			widget       : { type : String },
			templates    : { type : Array },
			css          : { type : Array },
		},	
		custom        : {
			av : {
	   			startup       : { type : String }, /* could be 'none', 'all', 'with-perms' */
			 	max_videos    : { type : Number, min : 1 }, /* positive integral value */
				max_audios    : { type : Number, min : 1 } /* positive integral value */
			}
		}
	} 
);

schema.index({ profile_name: 1, name: 1 }, { unique: true });

module.exports = schema;

