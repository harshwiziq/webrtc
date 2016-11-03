var crypto       = require('crypto');
var key_selector = require('common/keys');

var algo   = 'aes-256-cbc';
var crypt  = {};

crypt.encipher = function (_selector, p) {
	if (!key_selector[_selector]) {
		throw 'no such key selector "' + _selector + '"';
	}

	var _iv = crypto.randomBytes(16).toString('hex');
	return __encipher (key_selector[_selector], _iv, p);
};

function __encipher (__key, _iv, p) {

	var key = new Buffer(__key, 'hex');
	var iv = new Buffer(_iv, 'hex');
	var cipher;
	var e;

	try {
		cipher = crypto.createCipheriv (algo, key, iv);
		e  = cipher.update (p, 'utf8', 'hex');
		e += cipher.final ('hex');
	}
	catch (err) {
		throw 'encryption failed';
	}

	return _iv + e;
}

crypt.decipher = function (_selector, cipher) {
	if (!key_selector[_selector]) {
		throw 'no such key selector "' + _selector + '"';
	}

	return __decipher (key_selector[_selector], cipher);
};

function __decipher (__key, cipher) {
	var dec = null;
	var key_hex = __key;

	try {
		var key = new Buffer (key_hex, 'hex');
		var iv  = new Buffer (cipher.substring(0, 32), 'hex');
		var aa_context_e = cipher.substring(32);

		var decipher = crypto.createDecipheriv (algo, key, iv);
		decipher.setAutoPadding(true);
		dec = decipher.update(aa_context_e, 'hex', 'ascii');
		dec += decipher.final('ascii');
	}
	catch (err) {
		throw 'decryption failed';
	}

	return dec;
}

module.exports = crypt;
