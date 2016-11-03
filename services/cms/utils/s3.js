var $      	= require('jquery-deferred') ,
	aws     = require('aws-sdk') ,
	log		= require('common/log') ,
	config	= require('common/config') ;

var s3 = {};

var AWS_ACCESS_KEY	= config.s3.key ,
	AWS_SECRET_KEY	= config.s3.secret ,
	BUCKET_NAME		= config.s3.bucket ,
	KEY_NAME		= config.s3.dir ;

var CONTENT_URL = 'https://' + BUCKET_NAME + '.s3.amazonaws.com/' + KEY_NAME;
var EXPIRE_TIMESTAMP = 2000;

aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});
var _s3 = new aws.S3();

s3.get_upload_url = function(info){
	var	unique_name = '/' + info.uid + info.path;		// the physical name i.e. name in storage (s3)

	var _d 		= $.Deferred() ,
		params	= {
			Bucket: BUCKET_NAME,
			Key: KEY_NAME + unique_name,	
			Expires: EXPIRE_TIMESTAMP,
			ContentType: info.type,
			ACL: 'public-read'
		} ;

	_s3.getSignedUrl('putObject', params, function(err, data){
			if(err){
				_d.reject(err);
			}
			else{
				_d.resolve({
					upload_url	: data,
					access_url	: encodeURI( CONTENT_URL+ unique_name ),
					filename	: info.name
				});
			}
		});
	return _d.promise();
};

s3.remove = function(info){
	var _d = $.Deferred();
	_d.resolve('delete code not tested');
	return _d.promise();					// for now just don't touch s3
	/* 
	 * a good link, shows how to delete files as well as folders
	 *	http://stackoverflow.com/questions/20207063/how-can-i-delete-folder-on-s3-with-node-js
	 */
	var unique_name = '/' + info.uid + info.path;				// _we should have some checks here

	var _d		= $.Deferred() ,
		params	= {	Bucket : BUCKET_NAME } ;

	params.Delete = { Objects : [] }  ;
	params.Delete.Objects.push( KEY_NAME + unique_name);

	_s3.deleteObjects( params, function( err, data){
		if( err){
			_d.reject('node delete failed');
			return;
		}
		_d.resolve('node deleted successfully');
	});

	return _d.promise();
};

module.exports = s3;

