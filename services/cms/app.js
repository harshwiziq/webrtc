/*--------------------------------*
 *  _content_management_server_   *
 *--------------------------------*/
require('app-module-path').addPath( __dirname);		/* to avoid '../'s in require stmts */

var express		= require('express') ,
	bodyParser	= require('body-parser') ,
	core 	  	= require('routes/core-v1')  ,
	account	  	= require('routes/account-v1')  ,
	resources 	= require('resources')  ,
	log 	  	= require('common/log')  ;

var app 	= express()  ,
	_port 	= '7099'  ;

app.use( bodyParser.json() );

app.use( log.req_logger);		// added 1st

app.use('/user/v1', account);

app.use('/content/v1', core);

app.use( log.err_logger);		// added last

app.use( function(err, req, res, next) {
	res.status( err.status || 500);
	res.send({ 'status':'error', 'data': err });
	log.warn({ 'status':'error', 'data': err }, 'app.js');
});

resources.init()
.then(
	start,
	exit
);

function start(){
	log.info('**************************');
	log.info('Started, listening on: '+ _port);
	log.info('**************************');
	app.listen(_port);
}

function exit( msg){
	log.error({'exit message ' : msg },' Exiting app');
	process.exit(1);
}


/* maybe call resource.release on shutdown */
