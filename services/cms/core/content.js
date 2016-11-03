
var log 		= require('common/log').child({ module : 'core/content'}) ,
	nodes		= require('core/nodes')  ,
	storage_if	= require('core/storage-if')  ;

var content = {};

content.upload = function( info, cb){

	storage_if.call( 'get_upload_url', info, function( err, urls){	
		log.info({ 
			err: err, 
			urls: urls 
		}, 'get upload url');
		
		if( cb){
			 err ? cb( err) :	cb( null, urls);
		}
		/* no need to store it, we keep our server stateless */
	});
};

/* -----------------------------------------------------------------------------*
 |  NOTE : for duplicate file upload requests we just overwrite the old ones	|
 |			S3 automatically deletes prev file when we upload a duplicate file	*----------------------------------*
 |			and we(in the local db) just replace the access urls etc. whenever they say duplicate content is added |
 * ----------------------------------------------------------------------------------------------------------------*/

content.added = function( info, cb){	// info <-- uid, name, path, store, url, type, size, tags, thumbnail, removeafter
	
	info.owner = info.uid;
	info.expiry = info.removeafter ? Date.now() + info.removeafter*1000 : info.removeafter;

	nodes.get_node( info, function( node){
		log.debug({ node: node}, 'node exists check returned');
		if(node){
			nodes.replace( info, function( err, data){
				cb( err, data);
			});
		}
		else{
			nodes.add( info,function( err, data){
				cb( err, data);		//	__iska error is important
			});
		}
	});
};

content.list = function(info , cb){			// info ==> uid path store
	/*
	 * different methods will be called 
	 * depending on which filter is to be used 
	 */
	if( info.path){
		nodes.get_by_path( info , cb);	
	}
	else{
		nodes.get( info.uid, cb);	
	}
};

content.remove = function( info, cb){		// info ==> uid path store
	/* 
	 *  check: if present, can delete etc.
	 *	delete from store
	 *	and remove from db ( 'users' as well as 'nodes' )
	 */
	nodes.get_node( info, function( node){
		if( !node){
			cb('NODE_RM_ERROR: Does not exist');
			return;
		}
		// some info needed for delete will be added to 'info', here
		storage_if.call( 'remove', info, function(err, msg){
			if( err){
				cb(err);
				return;
			}
			log.debug('message from st_if::'+ msg); 	// remove the arg as well with this stmt.
			nodes.remove( info, cb);
		});
	});
};

module.exports = content;
