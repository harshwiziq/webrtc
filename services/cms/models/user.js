var mongoose	= require('mongoose')  ,
	log			= require('common/log') ;

var schema = mongoose.Schema({
	uid 	: { type : String, unique : true },
	quota	: { type : Number, default : 1000 } , //config.user.quota 
	nodes 	: [ mongoose.Schema.Types.ObjectId]
});

schema.methods.remove_node = function( id){
	/* extra code, not being used */
	var arr = this.nodes ,
		len = arr.length ;
	while( len--){
		if( arr[len].equals( id) ){
			log.info({ id: arr[len]}, 'removed from user.nodes');
			delete arr[len];
			return true;
		}
	}	
	return false;
};

module.exports = mongoose.model('user', schema);
