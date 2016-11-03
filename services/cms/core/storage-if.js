
var log	= require('common/log').child({ module : 'core/storage-if'})  ,
	s3	= require('utils/s3')  ;
	/* require all others here */

var _if = {};

_if.call = function( method, info, cb){
	var _s = {};
	switch( info.store){
		case 's3':
			_s = s3;
			break;
		
		default:
			cb( 'ARGS_ERR: store name not valid');
			return ;	
	}

	var _m = {};
	switch( method){
		case 'get_upload_url':
		case 'remove':
			break;
		default:	
			cb( 'INTERNAL_ERR: method name not valid');
			return;
	}
	_s[method]( info)
	.then( cb.bind( null,null), cb) ;
};

module.exports = _if;
