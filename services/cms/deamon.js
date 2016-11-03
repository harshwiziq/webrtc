/* 
 *	get documents which are expired
 *	delete from store
 *	remove from local db
 *			__do that every <some> minutes
 * */

var config	= require('common/config') ,
	log		= require('common/log').child({ module : 'deamon'}) ,
	content	= require('core/content') ,
	nodes	= require('core/nodes') ;

setInterval( sweep, config.deamon.freq * 1000 * 60 );

function sweep(){
	nodes.get_expired( function( err, data){
		data = data || [];
		data.forEach( function( node){
			content.remove({
				uid : node.owner,
				path : node.path,
				store : node.store
			}, function( err, data){
				log.info({ err : err, data : data }, 'auto purge' );
			});
		});
	});
}
