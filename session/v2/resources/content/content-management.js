var $		= require('jquery-deferred');
var content_api = require('./content-api');
var content = {};
var log;
/*
 * Initialization
 */ 
content.init = function (info, log_){
	log = log_;
	content_api.init(info, log_);
};
/*
 * Method to verify content is already uploaded
 */
content.get_content_info = function (info) {
	var _d = $.Deferred();

	content_api.get_content_info (info)
		.then(
			_d.resolve.bind (_d),
			_d.reject.bind (_d)
		);
	return _d.promise();
};
/*
 *	Method make request to api to get temporary url for upload
 */ 
content.get_presigned_url = function(info){
	var _d = $.Deferred();

	content_api.get_presigned_url (info)
		.then(
			_d.resolve.bind (_d),
			_d.reject.bind (_d)
		);
	return _d.promise();
};
/*
 *	Method to get all content against userid
 *
 */ 
content.get_past_content_list = function( info){
	var _d = $.Deferred();

	content_api.get_past_content_list(info)
		.then(
			_d.resolve.bind (_d),
			_d.reject.bind (_d)
		);

	return _d.promise();
};
/*
 *	Method to add user content to content library.
 */
content.addinfo_to_contentserver = function (info) {
	var _d = $.Deferred();

	content_api.addinfo_to_contentserver (info)
		.then(
			_d.resolve.bind (_d),
			_d.reject.bind (_d)
		);
	return _d.promise();
};
module.exports = content;
