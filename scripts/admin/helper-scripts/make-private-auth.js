require('../../../apps/node_modules/app-module-path').addPath(__dirname + '/../../../apps');
var crypt  = require ('common/crypt');
var moment = require ('moment');

if (process.argv.length < 4) {
	console.log ('Usage : node ' + process.argv[1] + ' <id> <display-name>');
	process.exit (-1);
}

var id = process.argv [2];
var display_name = process.argv [3];
var d = moment().toISOString();

var str = {
	ts      : d, 
	name    : id,
	display : display_name
};

var cipher = crypt.encipher ('private_url', JSON.stringify(str, null, 2));
console.log ('e=' + cipher);
