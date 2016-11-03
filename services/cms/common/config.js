var log = require('common/log');
var crypt = require('common/crypt');

//require('mongoose').set('debug', true);			// <---to see the query details

var config = {};
var s3_acces_key_encrypted = '35d087d66e247bed98e0c5cbb0941ffbcb1bb8060d2f3b4d1c8c7b4a1235fb4a1044a8d8d9466060879930af6f67326a';
var s3_secret_key_encrypted = 'c3c982a90733ba16070266d706f930a71995e52f215f10deb4f3a15445bfe3e8841f4a602e74dd81bbc56a7083eb055d05fa0828126b576364f2d63310448071';

config.mongo = 'mongodb://localhost/cms';

try {
	config.s3 = {
		key 	: crypt.decipher(s3_acces_key_encrypted, 's3'),
		secret 	: crypt.decipher(s3_secret_key_encrypted, 's3'),
		bucket	: 'boxcontent',
		dir		: 'vc-test'
	};
}
catch (e) {
	log.error ('unable to decipher keys. exiting.');
	process.exit (-1);
}

config.deamon = {};
config.deamon.freq = 10;	// time in minutes //

module.exports = config ;
