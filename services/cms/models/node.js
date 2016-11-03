var mongoose	= require('mongoose')  ;

var schema = mongoose.Schema({
	name	: { type: String },
	owner 	: { type: String, required : true },
	path	: { type: String, required : true },
	store	: { type: String, required : true },
	url		: { type: String, required : true }, 
	type	: { type: String, required : true },
	size	: { type: Number, required : true } ,
	ctime	: { type : Date, default : Date.now },
	tags	: [String],
	thumbnail: { type: String },
	expiry	: { type: Number}
});

schema.index({ owner : 1, path : 1 }, { unique : true });
schema.index({ expiry : 1 }, { sparse : true });
module.exports = mongoose.model('node', schema);
