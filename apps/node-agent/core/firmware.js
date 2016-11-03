var shell		= require('shelljs')  ,
	log			= require('common/log')  ,
	config		= require('common/config').git  ;

//init();
function init () {
	/* 2 directories:
	 * 	-- /landing
	 * 	-- /.firmware */
	shell.mkdir (config.landing);
	shell.cd (config.landing);
	
	var dir = shell.pwd();
	log.info('pwd is :: ' + dir);
	cb (null, 'ok');	
}


module.exports = init;
