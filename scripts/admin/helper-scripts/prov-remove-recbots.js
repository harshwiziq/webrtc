var req   = require ('request');
var argv  = require ('minimist')(process.argv.slice(2));

var vms = [];
var host = argv.host || 'localhost:2178';

for (var i = 0; i < argv._.length; i++)
	vms.push (argv._[i]);

var payload = {
	action : 'kill',
	data   : vms
};

console.log ('form data = '+ JSON.stringify (payload, null, 2));

req.post ({
		url : host + '/prov/v1/config/resource/recording/action',
		body : payload,
		json: true,
		timeout : 60*60*1000
	},
	function (err, http_response, body) {
		console.log ('err = ' + err);
		console.log ('http_response = ' + JSON.stringify(http_response, null, 1));
		console.log ('body = ' + body);
		process.exit (0);
	});
