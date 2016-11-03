var crypt = require('../crypt');

var cipher = process.argv[2];
var key = process.argv[3];

if (!cipher || !key) {
	console.log ('Usage : node ' + process.argv[1] + ' <cipher> <key-id>');
	process.exit (-1);
}

var plain_text = crypt.decipher (cipher, key);
console.log ('plain_text = ' + plain_text);
