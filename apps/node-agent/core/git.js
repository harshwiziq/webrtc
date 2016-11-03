
var //git 	= require('simple-git') ,
	shell	= require('shelljs') ,
	config	= require('common/config').git ,
	log 	= require('common/log') ;

function init (info, cb) {
	var git = require('simple-git')( config.landing);				// method chaining is supported

	cb = cb || function(){};
	info = info || {};
	info.url = config.url; // just for now

	git.init (function (err,data) {
		log.info ({ err: err, data: data}, 'init');
	})
	.addRemote (config.remote, info.url, function (err,data) {
		log.info ({ err: err, data: data}, 'add remote');
		shell.echo('/session').to('.git/info/sparse-checkout');
	})
	.addConfig ('core.sparseCheckout', true, function (err, data) {
		log.info({ err: err, data: data}, 'add config');
	})
	.pull (/*config.remote, info.url,*/function (err,data){		// this might fail
		log.info ({ err: err, data: data}, 'pull');
		cb (err,data);
	});
}	

module.exports = init;



/*---------------- extra code ---------------

/*	git.init ()
	.addRemote (config.remote, config.url, function (err,data) {
		shell.echo('/session').to('.git/info/sparse-checkout');
	})
	.addConfig ('core.sparseCheckout', true)
	.pull (config.remote, config.url, function (err,data){
		cb (err,data);
	});




/*
	cd  
	git init
	git remote add -f <repo url>
	git config core.sparseCheckout true
	echo session >> .git/info/sparse-checkout
	git pull https://Pawan-Bishnoi@bitbucket.org/wiziq/pawan.git				// may not be needed here
	// ___will be done before session start as well using commit hash


/*	shell.exec('git init',cb);
	shell.exec('git remote add -f ' + config.origin + ' '+ config.url, cb);
	shell.exec('git config core.sparseCheckout true', cb);
	shell.echo('/session').to('.git/info/sparse-checkout', cb); */
	
