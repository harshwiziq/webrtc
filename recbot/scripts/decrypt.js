var moment = require ('moment');
var crypt  = require('./crypt');

var key = process.argv[2];

if (!key) {
	console.log ('Usage : node ' + process.argv[1] + ' <key>');
	process.exit (-1);
}

var cipher = crypt.decipher (key);
console.log ('cipher => ' + cipher);
