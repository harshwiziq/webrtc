var rest = require('restler');
var os  = require('os');
var jwt  = require('jsonwebtoken');
var secret = 'this_is_secret';
var r = [];
var requestor = {
	svc : 'prov',
	svc_id : '1',
	provider : 'api-b',
	os : os.type(),
	hostname : os.hostname(),
	n_address : os.networkInterfaces()
};

var token = jwt.sign(requestor, secret);
//var map = require('./token_map');
//map.add('prov1', 'api-b', 'token1', 'state');
//var token = jwt.sign({ client_id : requestor.svc_id, c_ts : new Date().toUTCString() }, secret, { issuer : 'API-B', expiresIn : 60 });

function make_request() {
	for (var i =0; i<5; i++) {
		//r[i] = rest.get('http://localhost:3000/api/users', { headers : { 'x-access-token' : token }});
		r[i] = rest.get('http://localhost:3000/isa/auth', { headers : { 'client_info' : token }});
		
		r[i].on('success', success);

		r[i].on('fail', fail);

		r[i].on('timeout', timeout);
	}
}

//setInterval(make_request, 5000); 
make_request();

function success(data, response) {
		console.log('got response ::: '+ JSON.stringify(data));
		console.log('res code :::'+response.statusCode);
}

function fail (data, response) {
		console.log('request failed');
		console.log(JSON.stringify(data));
}

function timeout (ms) {
		console.log('request timed out');
}
