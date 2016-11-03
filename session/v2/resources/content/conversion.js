var $     = require ('jquery-deferred');
var rest  = require ('restler');
var crypt = require ('../../crypt');

var view_api;
var api_token;
var thumbnails_dimensions = "300x300";
var content_info = {};
var log;
var conversion = {};

/*
 * Initalize method
 */ 
conversion.init = function (startupInfo, log_) {
	try {
		api_token = crypt.decipher (startupInfo.custom.api_token_encrypted, 'boxview');
	}
	catch (e) {
		log_.error ({ err : e, cipher: startupInfo.custom.api_token_encrypted, method : 'conversion.init' }, 'API Key Decryption failed');
		return false;
	}

	view_api = startupInfo.custom.view_api;

	log = log_.child({ 'sub-module' : 'conversion' });

	return true;
};

/*
 * Method used to start the conversion process using box api 
 * param info.
 * 	mandatory fileds are file_url and file_name.
 *
 */
conversion.start = function(info){
	var _df = $.Deferred();

	if (!info.url || !info.path) {
		log.error({url : info.url, path: info.path }, 'Content conversion');
		_d.reject ('some mandatory parameters not specified');
		return _d.promise ();
	}

	conversion_start(info)
		.then(
			conversion_success.bind(_df),
			conversion_failure.bind(_df),
			conversion_inprogress.bind(_df)
		);
	return _df.promise();
};
/*Method call to initiate the conversion process.
 *
 * this method calls the box api using restler.
 */
function conversion_start (info)
{
	var _d = $.Deferred();
	var _r = rest.post (view_api + 'documents', {
		headers : { 
			Authorization : api_token, 
			'Content-Type':'application/json'
		},
		data    : JSON.stringify ({ url	: info.url, name : info.path, thumbnails : thumbnails_dimensions })
	});

	_r.on ('complete', function (data, response) {

		if (!response) {
			/*
			 * Saw a crash where this was the case. Sad but true ... */
			log.error ({ data : data }, 'start conversion - null respnose');
			return _d.reject ('null response from conversion server');
		}

		if (response.statusCode === 429) {
			/*
			 * The conversion server is indicating that things are in progress */
			var err_obj = {
				retry_after : response.headers['retry-after'],
				status_code : response.statusCode,
				file_name   : info.path
			};

			log.error ({ data: data, headers : response.headers, response_code : response.statusCode, file_name : info.path }, 'conversion retry later');
			return _d.reject(err_obj);
		}

		/* Check for other non 2xx responses - likely a superfluous check */
		if (Math.trunc(response.statusCode/100) !== 2) {
			log.error ({ data: data, headers : response.headers, response_code : response.statusCode, file_name : info.path }, 'conversion error');
			return _d.reject (response.statusCode);
		}

		/* If we come here, the only possibility of the responseCode is '200' */

		if (data.type !== 'document') {
			log.error ({ data: data, headers : response.headers, response_code : response.statusCode, file_name : info.path }, 'conversion error [ data.type != "document" ]');
			/*
			 * Shouldn't we send the actual error here ? */
			return _d.reject (response.statusCode);
		}

		if (data.status === 'error') {
			log.error ({ data: data, headers : response.headers, response_code : response.statusCode, file_name : info.path }, 'conversion error [ data.status == "error" ]');
			return _d.reject ('conversion status error');
		}

		if (data.status !== 'done') {
			log.info ({ data: data, headers : response.headers, response_code : response.statusCode, file_name : info.path }, 'conversion ok [ data.status = "' + data.status + '"]');
			return _d.notify (data);
		}

		_d.resolve (data);
		log.info ({ data: data, status_code : response.statusCode, info: info }, 'conversion ok');

	});

	_r.on ('error', function (err, response) {
		log.error ({ err: err }, 'conversion request error');
	});

	_r.on ('timeout', function (ms) {
		log.error ({ ms: ms }, 'conversion request timeout');
		_d.reject (ms);
	});

	return _d.promise();
}
/* 	When conversion is in processing state, 
 *	we again call api method to get status of conversion.
 */
function getstatus_ontimeinterval (id) {
	get_conversion_status (id)
	.then(
		conversion_success.bind(this),
		conversion_failure.bind(this),
		conversion_inprogress.bind(this)
	);
}

/* 
 * Method called when content is in progress state.
 */
function conversion_inprogress (data) {

	setTimeout( getstatus_ontimeinterval.bind(this), 6000, data.id);

}

/*
 *  Method called after specific time interval to get the status to conversion
 */
function get_conversion_status(docID)
{
	var _d = $.Deferred();

	var _r = rest.get ( view_api+'documents/'+docID, {
		headers :{Authorization: api_token, 'Content-Type':'application/json'},
	});

	_r.on('complete', function (data,response) {

		log.info ({ name: data.name, progress: data.status, id: data.id, status_code : response.statusCode },  ' Conversion progress....');
		if ( data.id !== undefined ){

			if ( data.status === 'done' ){
				_d.resolve(data);
			} 
			else if ( data.status === 'error' ){
				_d.reject(data);
			} 
			else {
				_d.notify(data);
			}				
		}
		else{
			_d.reject(data);
		}
	});

	_r.on ('error', function (err, response) {
		log.error ({ err: err }, 'get conversion status error');
	});

	_r.on ('timeout', function (ms) {
		log.error ({ ms: ms }, 'get conversion status timeout');
		_d.reject (ms);
	});
	return _d.promise();
}

/*
 * Method called on successfull conversion
 */
function conversion_success(result)
{
	this.resolve ( result );

}

/* 
 * Method will called when conversion failed.
 */
function conversion_failure(err)
{
	this.reject(err);
}


module.exports= conversion;

