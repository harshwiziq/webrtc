var rest	= require('restler');
var default_port = 3141 ;
var proxy = {};

proxy.add_route = function (key, value, proxy_port) {
	/*
	 * The proxy is assumed to run locally on a well known port
	 * (likey 3141), unless overridden by the argument */

	var url = 'http://localhost:' + (proxy_port ? proxy_port : default_port) + '/api/route/add';
	var d = rest.postJson (url, {
		key : key,
		value : value
	});

	d.on('success', function () {
		console.log ('proxy route added');
		return;
	});

	d.on('fail', function (data, response) {
		console.log ('route add failed');
		return;
	});

	d.on('error', function (err, response) {
		console.log ('route add failed');
		return;
	});

	d.on('timeout', function (ms) {
		console.log('route add failed (timeout)');
		return;
	});
};

module.exports = proxy ;
