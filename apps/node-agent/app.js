/*--------------------------------*
 *   _node_administrator_         *
 *--------------------------------*/

var express	    = require('express') ,
	bodyParser  = require('body-parser') ,
	node        = require('node-agent/routes/node-v1') ,
	session	    = require('node-agent/routes/session-v1') ,
	session_ctrl= require('node-agent/controllers/session-v1') ,
	log         = require('node-agent/common/log')  ,
	config      = require('node-agent/controllers/config')  ,
	node_ctrlr  = require('node-agent/controllers/node-v1') ,
	proxy       = require('common/proxy')  ,
    app_config  = require('common/config');

var app 	= express() ;

app.use( bodyParser.json() );

proxy.add_route('/agent','http://localhost:' + app_config.app_port + '/agent');

app.use('/node/v1', node);

app.use('/session/v1', session);

app.use(function (err, req, res, next) {
	if (err) {
		req.log.error (err, 'caught error');
		res.status (400).send ({ error:err });
	}
});

config.get_cache_obj().redis.on('connect', init);

function init () {
	/* 
	 * It can be a node/node-agent restart
	 * try to load config from redis cache */
	session_ctrl.init ()
		.then (
			function () {
				config.load_cache (function (err,info) {
					if (!err && info) {
						log.debug({info: info}, 'got info from cache');
						// get acquired again
						node_ctrlr.init (info);	
					}
				});	
			},
			function (err) {
				log.fatal ({ err : err }, 'init error');
				log.fatal ('* --------------------------------------------------------- *');
				log.fatal ('*                                                           *');
				log.fatal ('*        NODE INITIALIZATION FAILED. ABORTING...            *');
				log.fatal ('*                                                           *');
				log.fatal ('* --------------------------------------------------------- *');
				process.exit (1);
			}
		);
}

module.exports = app;
