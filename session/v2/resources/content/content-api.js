var $           = require('jquery-deferred');
var rest        = require('restler');
var api_url;
var content_api = {};
var log;
/*
 *	Initialize method
 */ 
content_api.init = function (info, log_){
	log = log_.child ({ 'resource-section' : 'content-api' });
	api_url = info.custom.content_server;
};

/*
 *	Method to get temporary url to upload content.
 */ 
content_api.get_presigned_url  = function (info) {
	var _d =  $.Deferred();
	var data = {
		name : info.name,
		path : info.path,
		type : info.type,
		size : info.size
	};

	if (!info.user_id || !info.path || !info.type) {
		_d.reject ('some mandatory parameters not specified');
		return _d.promise ();
	}

	var request_url = api_url + "content/v1/user/" + info.user_id + "/add";

	log.debug ({ info: data }, 'in get_presigned_url');

	var _r = rest.post (request_url,{
		headers : {'Content-Type':'application/json'},
		data    : JSON.stringify(data) 
	});

	_r.on ('complete', function(result, response) {

		log.info ({ result: result }, 'post complete');
		/** temporary handling of one content server issue**/
		if( result.status === undefined){
			_d.reject (result);
		}

		if (result.status === 'error') {
			_d.reject(result);
		} else {
			_d.resolve(result);
		}
	});

	_r.on ('error', function (err, response) {
		log.error ({ err: err }, 'post error');
		_d.reject (err);
	});

	_r.on ('timeout', function (ms) {
		log.error ({ ms: ms }, 'post timedout');
		_d.reject (ms);
	});

	return _d.promise();
};
/*
 *	Method to get all content of user.
 */ 
content_api.get_past_content_list = function ( info ) {
	var _d = $.Deferred();

	if ( !info.user_id ) {
		_d.reject ('Mandatory parameter user_id not specified');
		return _d.promise ();
	}

	var request_url = api_url + "content/v1/user/" + info.user_id + "/list";
	var _r = rest.get(request_url, {/* No Body */});

	_r.on('complete',function(data,response) {
		log.info( { url : request_url, data : data }, 'get content complete');

		if (data.status === 'error')
			return _d.reject(data);

		return _d.resolve(data);
	});

	_r.on ('error', function (err, response) {
		log.error ({ url: request_url, err: err }, 'get content error');
		_d.reject (err);
	});

	_r.on ('timeout', function (ms) {
		log.error ({ url: request_url, ms: ms }, 'get content timedout');
		_d.reject (ms);
	});

	return _d.promise();
};
/*
 *	Method to update the status of content after conversion
 */ 
content_api.addinfo_to_contentserver = function(info){
	var _d =  $.Deferred();

	if (!info.user_id || !info.path || !info.type || !info.name || !info.size || !info.url) {
		_d.reject ('some mandatory parameters not specified');
		return _d.promise ();
	}

	var data = {	
		path 	    : info.path, 
		name        : info.name,
		type 	    : info.type,
		size 	    : Number(info.size),
		url  	    : info.url,
		thumbnail   : info.thumbnail,
		removeafter : info.removeafter,
		tags 	    : info.tags
	};

	var request_url = api_url+"content/v1/user/"+ info.user_id+"/added";
	var _r = rest.post(request_url,{
		headers : {'Content-Type':'application/json'},
		data    : JSON.stringify(data)
	});
	_r.on('complete',function(result, response){
		log.info( { result : result }, 'post complete.');
		if(result.status === 'error'){
			_d.reject(result);
		}else{
			_d.resolve(result);
		}
	});

	_r.on ('error', function (err, response) {
		log.error ({ err: err }, 'post error');
		_d.reject (err);
	});

	_r.on ('timeout', function (ms) {
		log.error ({ ms: ms }, 'post timedout');
		_d.reject (ms);
	});

	return _d.promise();
};

/*
 *	Method to delete file from storage
 */ 

content_api.remove_content = function ( info ) {
	var _d = $.Deferred();

	if ( !info.user_id || !info.file_name) {
		_d.reject ('Mandatory parameter not specified');
		return _d.promise ();
	}
	var data = {
		file_name : info.file_name,
		dir	  : ''
	};

	var request_url = api_url+"content/v1/user/"+ info.user_id+"/remove";
	var _r = rest.delete(request_url,{
		data    : JSON.stringify(data)
	});

	_r.on('complete',function(data,response){
		log.info( { data : data }, 'post complete.');
		if(data.status === 'error'){
			_d.reject(data);
		}else{
			_d.resolve(data);
		}
	});

	_r.on ('error', function (err, response) {
		log.error ({ err: err }, 'post error');
		_d.reject (err);
	});

	_r.on ('timeout', function (ms) {
		log.error ({ ms: ms }, 'post timedout');
		_d.reject (ms);
	});
	return _d.promise();
};
module.exports = content_api;
