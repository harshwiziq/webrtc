var crypt = require('../crypt');

var plain_text = process.argv[2];
var key = process.argv[3];

if (!plain_text || !key) {
	console.log ('Usage : node ' + process.argv[1] + ' <plain-text-string> <key-id>');
	process.exit (-1);
}

var cipher = crypt.encipher (plain_text, key);
console.log ('cipher = ' + cipher);
