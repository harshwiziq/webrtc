var config = {};

config.app_port = 2178;
config.app_dir_top = __dirname + '/../';
/*
 * LOG/fluentd config here
 */
config.log = {
	tag : 'vc.apps',
	type : 'forward',
	/* Rishikesh is where all the log streams meet */
	rishikesh_host : 'localhost',
	rishikesh_port : '24224',
};

/*
 * API-BACKEND config here
 */
config.api = {};
config.api.mongo = 'mongodb://localhost/backend';

/*
 * PROVISIONING config here
 */
config.prov = {};
config.prov.mongo = 'mongodb://localhost/prov';

/*
 * LANDING config here
 */
config.landing = {};
config.landing.mongo = 'mongodb://localhost/landing';

module.exports = config;
