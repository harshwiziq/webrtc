require('../../../apps/node_modules/app-module-path').addPath(__dirname + '/../../../apps');
var crypt  = require ('common/crypt');
var moment = require ('moment');

/*
 * Check for arguments 
 */
var argv = process.argv;
if (argv.length  < 3) {
	console.log ('Usage : node ' + argv[1] + '<selector> <cipher>');
	process.exit (-1);
}

var selector = argv[2];
var cipher   = argv[3];

var clear_text;
try {
	clear_text = crypt.decipher (selector, cipher);
}
catch (e) {
	console.error ('decode error : ' + e);
	process.exit (-1);
}

console.log (clear_text);
process.exit (0);
