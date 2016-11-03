var crypto = require('crypto');

var algo   = 'aes-256-cbc';
var crypt  = {};
var __key  = '3e5fefb1e4ec381bc4b0d9e5f4b8a1176cf91e59e73d94283b17f6ebcf1f85f3';

crypt.encipher = function (p) {
		var _iv = crypto.randomBytes(16).toString('hex');
		return crypt.__encipher (_iv, p);
};

crypt.__encipher = function (_iv, p) {
		var key = new Buffer(__key, 'hex');
		var iv = new Buffer(_iv, 'hex');
		var cipher = crypto.createCipheriv(algo, key, iv);
		var e  = cipher.update (p, 'utf8', 'hex');
		e += cipher.final ('hex');

		return _iv + e;
};

crypt.decipher = function (e) {
		var dec = null;
	    var key_hex = __key;

		var key = new Buffer(key_hex, 'hex');
		var iv  = new Buffer(e.substring(0, 32), 'hex');
		var aa_context_e = e.substring(32);

		var decipher = crypto.createDecipheriv (algo, key, iv);
		decipher.setAutoPadding(true);
		dec = decipher.update(aa_context_e, 'hex', 'ascii');
		dec += decipher.final('ascii');

		return dec;
};

module.exports = crypt;
