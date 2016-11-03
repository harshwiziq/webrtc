var mongoose	= require('mongoose')  ,
	log			= require('common/log').child({ module : 'core/nodes'}) ,
	Node		= require('models/node') , 
	User		= require('models/user')  ;

var nodes = {};

nodes.add = function( info, cb){
	var	_ack	= ack.bind(null, cb);
		
	get_user({ uid : info.owner} , function( user){
		if( !user){
			_ack('USER_ERROR : ' + info.owner +' not found');
			return;
		}
		
		var node = new Node( info);
		node.save( function( err, node){
			if( err){
				_ack('IO_ERROR : could not save node');
				return;
			}
			user.nodes.push( node._id);
			//__change quota etc.
			user.save( function( err, user){
				log.debug({ user: user, node: node}, 'in new node save');
				if( err){
					_ack('IO_ERROR : could not save user');	
				}
				_ack(null, node);
			});
		});
	});	//get_user end
};

nodes.replace = function( info, cb){
	// __just update the local db as it(the prev value) is already gone from the remote store, so no need to delete

	get_node( info, function( node){
		/* 
		 * uid + path is being used as unique key and hence none of them can be updated 
		 * they are same because otherwise the node would not have been found, which means a method like $.extend() can be used here
		 */
//		Object.assign( node, info);
		node.url = info.url;
		node.type = info.type;
		node.size = info.size;	
		node.ctime = new Date();	
		node.tags = info.tags;
		node.thumbnail = info.thumbnail;

		node.save( function( err, node){
			cb( err, node);
		});				
	}); //get_node end
};

nodes.get_node = get_node;

nodes.get = function( id, cb){			//there should be a similar method in user schema as well,  name being user.toJSON	
	Node.find({ 	
		'owner'	: id
	}, function( err, nodes){
		if( err){
			cb(err);
			return;
		}
		cb( null, nodes);
	});
};

nodes.get_by_path = function( info, cb){
	Node.find({ 
		'owner' : info.uid, 
		'path' : new RegExp( '^' + info.path,'i')			//  '^' tells it is a "starts with" query rather than just 'contains'
	}, function( err, nodes){
		if( err){
			cb && cb(err);
			return;
		}
		cb && cb( null, nodes);
	});
};

nodes.remove = remove_node ;

/* -----------------
 *  private methods
 * ----------------- */

function remove_node( _node, cb){			
	_node.owner = _node.owner || _node.uid;
	Node.findOne({
		'owner' : _node.owner ,
		'path'	: _node.path
	}, function( err, node){
		if( !err && !node){	
			log.warn({ 'sanity_check' : 'should never happen, check outside if node exists'});
			cb && cb('NODE_ERROR: does not exist');
			return;
		}
		
		if( err){
			cb && cb( err);
			return;
		}
		log.debug({ id: node._id}, 'removing node');
		User.update({ 'uid' : _node.owner }, { $pullAll : { nodes : [ node._id] } }, function( err, data){
			log.debug({ err : err, data : data}, 'user update');
		});
		
		node.remove( function( err, data){
			cb && cb( err, data);
		});
	});
}

function ack( cb, err, data){
	log.info({ err: err, data: data}, ' ack');
	if( cb){
		cb( err, data);
	}
	return ;
}

function get_node( _node, cb){
	_node.owner = _node.owner || _node.uid;
	Node.findOne({ 
			'owner'	: _node.owner, 
			'path'	: _node.path 
	}, function( err, node){
			log.debug('get node done');
			if( err){
				log.warn('db_error_in get_node');
			}	
			cb && cb( node);
	});
}

function get_user( info, cb){
	User.findOne({ 
		'uid'	: info.uid
	}, 'quota nodes'
	 , function( err, user){
			log.debug('get user done');
			if( !err && !user){								//__special case, __temporary, until auth is implemented
				add_user( info, cb);			
				return ;
			}
			if( err){
				cb && cb(null);
				return;
			}
			cb( user);
	});
}

function add_user( info, cb){			/* will be handled differently */
	var user = new User(info);
	user.save( function( err, user){
		log.debug({ err: err, user: user}, ' added user');
		if(err){
			cb && cb(null);
			return;
		}
		cb && cb( user);
	});
};

nodes.get_expired = function get_expired( cb){
	Node.find({ expiry : { $lt : Date.now()}}, cb).hint({ expiry : 1 });		// hint tells it to use the index
};

module.exports = nodes;
