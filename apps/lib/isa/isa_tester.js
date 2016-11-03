var rest = require('./client/restler_client');
var isa  = require('./client/isa_client').init('http://localhost:3000/isa/auth', 'prov', '#1', 'api-b');
var log  = require('./client/log');
//var _r   = isa.init('http://localhost:3000/isa/auth', 'prov', 'api-b');
var r = [];

isa.on('success', function (data, response) {
	console.log('get token success');
	setTimeout(make_request, 5000);
	//setInterval(make_request, 5000);
	make_request();
});
isa.on('fail', fail);

function make_request() {
	for (var i=0;i<10;i++) {
		r[i] = rest.post('api-b', 'http://localhost:3000/api/users', { data : { id : '12345'}});

		r[i].on('success', success);
		r[i].on('fail', fail);
		r[i].on('timeout', timeout);
	}
}

//setInterval(make_request, 5000);

function success(data, response) {
	console.log('got response ::: '+ JSON.stringify(data));
	log.error('res code :::'+response.statusCode);
}

function fail (data, response) {
	console.log('request failed');
	log.error('res code :::'+response.statusCode);
	console.log(JSON.stringify(data));
}

function timeout (ms) {
	console.log('request timed out:::'+ms);
}
