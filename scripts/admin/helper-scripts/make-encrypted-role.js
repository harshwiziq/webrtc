require('../../../apps/node_modules/app-module-path').addPath(__dirname + '/../../../apps');
var crypt  = require ('common/crypt');
var moment = require ('moment');

if (process.argv.length < 4) {
	console.log ('Usage : node ' + process.argv[1] + ' <id> <role>');
	process.exit (-1);
}

var id = process.argv [2];
var role = process.argv [3];
var d = moment().toISOString();

var str = {
	ts   : d, 
	id   : id,
	role : role
};

var cipher = crypt.encipher ('role_key', JSON.stringify(str, null, 2));
console.log ('u=' + cipher);
