
var status_codes = {
	'ALREADY_ACQUIRED' : 'Already in acquired state',
	'BUSY'             : 'Busy',
	'IN_ERROR'         : 'In Error State',
	'OUT_OF_SERVICE'   : 'Out of Service',
	'UNKNOWN_ERROR'    : 'Unknown state error',
	'BAD_REQUEST'      : 'Validation failed, missing params',
	'PROCESSING'       : 'Found valid, now processing',
	'SERVER_ERROR'     : 'Internal server error',
	'NOT_YET_IMPLEMENTED' : 'yet to be implemented'
};

function get_status_code (code, data) {                                // data is any additional info to be passed
	return { code : code, msg : status_codes[code], data: data };
}

module.exports.get = get_status_code;

