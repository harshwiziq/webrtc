var $        = require( 'jquery-deferred' );
var moment   = require( 'moment' );
var rest     = require( 'restler' );
var mylog    = require( 'api-backend/common/log' ).child ( { module : 'models/provisioning-interface'} );

var prov_if = {};

prov_if.create = function ( class_config, prov_base_url ) {

	var _d = $.Deferred();
	/*
	 * There could be multiple provisioning servers, and the
	 * logic to decide which one to choose is not formalized
	 * at the moment. For now, the code assumes that the
	 * provisioning server is running locally */

	var url = prov_base_url + 'v1/class/'+class_config.class_id+'/config';
	var d = rest.postJson ( url, class_config, { timeout : 5000 } );

	d.on ( 'success', _d.resolve );

	d.on ( 'fail', function (data, response) {

		mylog.error ({ info : {
			prov          : url,
			class_id      : class_config.class_id,
			data          : data,
			statusCode    : response && response.statusCode || 'no-response',
			statusMessage : response && response.statusMessage || 'no-response',
		}}, 'post failed');

		_d.reject (
			{
				"message" : (response && response.statusMessage) ? response.statusMessage : 'post failed', 
				"status"  : (response && response.statusCode) ? response.statusCode : 404 
			} 
		);

	});

	d.on ( 'error', function (err, response) {

		mylog.error ({ info : {
			prov     : url,
			class_id : class_config.class_id,
			err      : err,
		}}, 'post error');

		_d.reject (
			{                     
				"message" : (response && response.statusMessage) ? response.statusMessage : 'post error',
				"status"  : (response && response.statusCode) ? response.statusCode : 500
			}
		);

	});

	d.on ( 'timeout', function (ms) {

		mylog.error ({ info : {
			prov     : url,
			class_id : class_config.class_id,
			ms       : ms
		}}, 'post timeout');

		_d.reject (
			{                     
				"message" : 'post timeout',
				"status"  : 408
			}      
		);

	});

	return _d.promise();
};

prov_if.update = function ( class_id, class_config, prov_base_url ) {

	var _d = $.Deferred();
	var url = prov_base_url + 'v1/class/'+class_id+'/config';
	var d = rest.putJson ( url, class_config, { timeout : 5000 } );

	d.on ( 'success', _d.resolve );

	d.on ( 'fail', function (data, response) {

		mylog.error ({ info : {
			class_id : class_id,
			data : data,
			statusCode : response.statusCode,
			statusMessage : response.statusMessage,
		}}, 'update failed');

		_d.reject (
			{                     
				message : response.statusMessage ? response.statusMessage : 'update failed',
				status  : response.statusCode ? response.statusCode : 404
			}      
		);

	});

	d.on ( 'error', function (err, response) {

		mylog.error ({ info : {
			class_id : class_id,
			err : err
		}}, 'update error');

		_d.reject (
			{                     
				message : response.statusMessage ? response.statusMessage : 'update error',
				status  : response.statusCode ? response.statusCode : 500
			}      
		);

	});

	d.on ( 'timeout', function (ms) {

		mylog.error ({ info : {
			class_id : class_id,
			ms : ms
		}}, 'update timeout');

		_d.reject (
			{                     
				message : 'update timeout',
				status  : 408
			}      
		);

	});

	return _d.promise();


};


prov_if.remove = function ( class_config, prov_base_url ) {

	var _d = $.Deferred();
	var url = prov_base_url + 'v1/class/'+class_config.class_id+'/config';
	var d = rest.del ( url, { data: class_config, timeout : 5000 } );

	d.on ( 'success', _d.resolve );

	d.on ( 'fail', function (data, response) {

		mylog.error ({ info : {
			class_id : class_config.class_id,
			data : data,
			statusCode : response.statusCode,
			statusMessage : response.statusMessage,
		}}, 'delete failed');

		_d.reject (
			{
				message : response.statusMessage ? response.statusMessage : 'delete failed',
				status  : response.statusCode ? response.statusCode : 404
			}      
		);

	});

	d.on ( 'error', function (err, response) {

		mylog.error ({ info : {
			class_id : class_config.class_id,
			err : err
		}}, 'delete error');

		_d.reject (
			{                     
				message : response.statusMessage ? response.statusMessage : 'delete error',
				status  : response.statusCode ? response.statusCode : 500
			}
		);

	});

	d.on ( 'timeout', function (ms) {

		mylog.error ({ info : {
			class_id : class_config.class_id,
			ms : ms
		}}, 'delete timeout');

		_d.reject (
			{                     
				message : 'delete timeout',
				status  : 408
			}      
		);
	});

	return _d.promise();


};


module.exports = prov_if;
