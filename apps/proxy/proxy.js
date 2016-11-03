var fs         = require('fs');
var log        = require('./common/log').child ({ 'sub-module' : 'proxy-core'});
var log_stdout = require('./common/args').logs;

var level = 'debug';

if (!log_stdout){
	level = 'error';
}

var dev_pair = {
	key  : 'certificates/dev-key.pem',
	cert : 'certificates/dev-cert.pem',
};

var wiziq_pair = {
	key  : 'certificates/wiziq-certs/private_key.pem',
	cert : 'certificates/wiziq-certs/certificate_file.crt'
};
var use_wiziq_pair = true;

/*
 * Check for WizIQ certificates else fallback on the dev (self signed) certificates */

try {
	fs.accessSync (wiziq_pair.key, fs.R_OK);
	fs.accessSync (wiziq_pair.cert, fs.R_OK);
}
catch (e) {
	log.warn ({ pair : wiziq_pair }, 'WizIQ Certificate not found. Using self-signed certificate instead');
	use_wiziq_pair = false;
}

if (use_wiziq_pair)
	log.info ({ pair : wiziq_pair }, 'WizIQ Certificate found');

use_wiziq_pair ? create_proxy (wiziq_pair) : create_proxy (dev_pair);

var _proxy;
var proxy = function () {
	return _proxy;
};

function create_proxy (pair) {
	_proxy = new require('redbird') ({
		port   : 80,
		ssl    : {
			port    : 443,
			key     : pair.key,
			cert    : pair.cert
		},
		bunyan : {
			name    : "redbird",
			stream  : process.stdout,
			level   : level
		}
	});

	log.info ('proxy instantiated');

}

module.exports = proxy;
