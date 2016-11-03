var auth_stale_age = 24*60*60*1000; /* 6 hours */
var crypto = require('crypto');

var algo = 'aes-256-cbc';
var keys = {
		s3: '384e5f70576c30684e5f6933346729736f426a35743e3063423548303770a87d',
};

var crypt = {};

crypt.encipher = function (p, key_id) {
		var _iv = crypto.randomBytes(16).toString('hex');
		return crypt.__encipher (_iv, p, key_id);
};

crypt.__encipher = function (_iv, p, key_id) {
		var _key = keys[key_id];
		var e = '';

		if (!_key)
			throw 'unknown key id';

		var iv = new Buffer(_iv, 'hex');
		var key = new Buffer(_key, 'hex');
		var cipher = crypto.createCipheriv(algo, key, iv);
		e  = cipher.update (p, 'utf8', 'hex');
		e += cipher.final ('hex');

		return _iv + e;
};


crypt.decipher = function (e, key_id) {
		var dec = null;
		var key_hex = keys[key_id];

		if (!key_hex)
			throw 'unknown key id';

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
