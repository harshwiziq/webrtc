var moment = require ('moment');
var crypt  = require('./crypt');

var login_id = process.argv[2];

if (!login_id) {
	console.log ('Usage : node ' + process.argv[1] + ' <login-id>');
	process.exit (-1);
}

var d = moment().toISOString();

var str = {
	ts: d, 
	name: login_id
};

var cipher = crypt.encipher (JSON.stringify(str, null, 2));
console.log ('cipher => ' + cipher);
