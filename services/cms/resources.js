var $		= require('jquery-deferred')  ,
	rest	= require('restler') ,
	deamon	= require('./deamon') ,
	log		= require('common/log') , 
	db		= require('models/db') ;

var res = {}  ;

res.init = function(){
	//var _d = $.Deferred();
	/* 
	 * add proxy route
	 * connect mongo
	 * connect redis 
	 * init stores 
	 * check if local db is ok(i.e. consistant)  _maybe_ 
	 * do things that are meant to be done at startup.. */

	db.init().then(	// __a hacky way, will be removed soon..	
		function(){},
		function(){
			process.exit(1);
		}
	);

	//	__find a good way to know all required promises have resolved and that too without making the inits sequential
	
	return add_route('/cms', 'http://localhost:7099/');

	//return _d.promise();
};

/* 
 * we would want to do smth before shutdown */
res.release = function(){

};

var default_port = 3141 ;
function add_route (key, value, proxy_port) {
	var _d = $.Deferred();

	/*
	 * The proxy is assumed to run locally on a well known port
	 * (likey 3141), unless overridden by the argument */

	var url = 'http://localhost:' + (proxy_port ? proxy_port : default_port) + '/api/route/add';
	var d = rest.postJson (url, {
		key : key,
		value : value
	});

	d.on('success', function () {
		log.info ({ key: key, value: value }, 'proxy route added');
		return _d.resolve();
	});

	d.on('fail', function (data, response) {
		log.error ({ data: data, response: response }, 'route add failed');
		return _d.reject('failed: ' + response);
	});

	d.on('error', function (err, response) {
		log.error ({ err: err, response: response }, 'route add failed');
		return _d.reject(err);
	});

	d.on('timeout', function (ms) {
		log.error ('route add failed (timeout)');
		return _d.reject('timeout');
	});

	return _d.promise();
}

module.exports = res ;
