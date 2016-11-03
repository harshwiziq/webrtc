var mongodb  = require('mongodb');
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/* resource schema */
var resource = new Schema (
	{
		name         : { type : String, required : true },
		profile_name : { type : String }        
	},
	{ _id : false }
);

resource.index({ profile_name: 1, name: 1});

/* attendee schema */
var _attendee = new Schema ( {

	id        : { type : String, required : true, index : true }, /* could be email id as well */
	auth_via  : { type : String, required : true },
	role      : { type : String, required : true },
	meta_info : { type : Object }

}, { _id : false } );

var Schema = mongoose.Schema;

var schema = new Schema ({

	class_id : { type : String, required : true, unique : true, index : true },
	time_spec : {

		starts : Date,
		duration : Number,
		recurrence : {
			repeat    : { type : Number },
			/* weekly, daily, monthly, yearly, forever, never (all these will be codes ) */
			occurence : { type : Number , default : 1 },
			end_date  : { type  : Date }
		},
		extendable : { type : Number }

	},
	/* queued, in-progress, cancelled, completed, failed, expired, locked  */
	status        : {type : String },
	status_detail : {type : String },
	resources : [ resource ],  /* all the resources to be loaded initially */
	/*
	 * Framework , version , displays etc ( can be per session as well
	 * may be part of 'profile' property )
	 */
	display_profile : {
		name      : { type : String, required : true },
		/*structure : { type : String, default : 'classic-1' },
		layout    : { type : String, default : 'classic-1' },
		theme     : { type : String, default : 'sujits-vision' }*/
	},	
	attendees : {

		max_attendees : { type : Number },
		explicit_anon : { type : String },
		named : [ _attendee ],
		presenter_entry_before_time : { type : Boolean }

	},
	profile : {

		/* white labelling info etc */
		company_info : {

			prov_server_name    : { type : String },
			name                : { type : String },
			logo_url            : { type : String },
			auth_type           : { type : String }

		},
		class_profile : { type : Object } /* initial resource set-up */

	},
	perms : { type : Object },
	urls  : { type : Object },
	meta_info : {

		creator     : {  
			name  : { type : String },
			id    : { type : String },
			email : { type : String }
		},
  		creation_ts : { type : Date },   /* time stamp in ISO */
		title       : { type : String }	 /* title of the class */

	}

});

module.exports = schema;
