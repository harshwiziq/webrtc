var log		= require('common/log').child({ module : 'controllers/core-v1'}) ,
	content = require('core/content')  ;

var core = {};

core.add = function( req, res, next){
	/* parse body and get values */

	var info = {};
	info.path	= req.body.path ,
	info.uid	= req.email  ,
	info.store	= req.store  ,
	info.type	= req.body.type ,
	info.name	= req.body.name ,	// _optional
	info.size	= req.body.size ;	// _optional for now, not being used yet


	if( !info.path || !info.type ){
		res.send({ status : 'error', data : 'some fields are required..please consult api docs'});
		return;
	}

	log.info({ info : info }, 'add');
	
	content.upload( info, function( err, urls){
		if( err){
			res.send({ status : 'error', data : err});
			return ;
		}
		res.send({ status : 'success', data : urls})
	});
};

core.added = function( req, res, next){
	var info = req.body;
	info.uid = req.email;
	info.store = req.store;

	log.info({ info : info}, 'added');

	content.added( info,function( err, data){
		if(err){
			res.send({ status : 'error', data : err});
			return ;
		}
		res.send({ status : 'success', data : data});
	});
};

core.list = function( req, res, next){
	var info	= {} ;
	info.uid	= req.email;
	info.store	= req.store;
	info.path	= req.query.path;
	
	log.info({ info : info}, 'list');

	content.list( info, function( err, list){
		if( err){
			res.send({ status : 'error', data : err});
			return;
		}
		res.send({ status : 'success', data : list});
	});
};

core.remove = function( req, res, next){
	var info = {};
	info.uid = req.email;
	info.store = req.store;
	info.path = req.query.path;
	
	log.info({ info : info}, 'remove');

	content.remove( info, function( err, message){
		if( err){
			res.send({ status : 'error', data : err});
			return;
		}
		res.send({ status: 'success', data: message});
	});
}

core.update = function( req, res, next){
	res.send({ status: 'error', data: 'not_implemented_yet'});
}

module.exports = core;
