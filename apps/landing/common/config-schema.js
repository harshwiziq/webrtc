var mongodb  = require('mongodb');
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/* resource schema */
var config_schema = new Schema (
	{
		backend : { 
			protocol : { type : String, required : true  },
			host     : { type : String, required : true  },
			port     : { type : Number, required : true  },
		},
		auth : { 
			protocol : { type : String, required : true  },
			host     : { type : String, required : true  },
			port     : { type : Number, required : true  },
		}
	},
	{ _id : true }
);

module.exports = config_schema;
