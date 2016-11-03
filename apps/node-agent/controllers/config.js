var log     = require('node-agent/common/log');
var config  = require('node-agent/common/config');
var cache   = require('common/cache').init('agent', 4*60*60*1000);

var config_ctrl = {};

config_ctrl.set_cache = function (info) {
	// add to cache (with a timestamp) 
	info.timestamp = Date.now();		
	cache.set('config', JSON.stringify(info));
};

config_ctrl.load_cache = function (cb) {
	cb = cb || function(){};	// in case there is no cb
	// read info from cache
	cache.get ("config")
		.then(
			function (info) {
				try{ 
					info = JSON.parse (info);
					cb (null,info);
				}
				catch (e) {
					cb.bind(null, e);
				}		
			},
			cb.bind(null,'no config in cache')
		);
};

config_ctrl.init = function (info) {
	/*
	 * Meant to be called on node is acquired or when server is (re)started 
	 */
	log.debug(info, 'config.init');
	config.prov = info.prov;
	
	config.node.id = info.node.id;	            // merge this to info
	config.node.url = info.node.host_url;
	
	if (info.docker && info.docker.sess_image) {
		config.docker.image = info.docker.sess_image;
		// other docker info
	}
	log.info ({ config : config},'config now becomes');
};

config_ctrl.set_node_state = function (state) {
	log.info ({state: state}, 'set_node_state');
	config.node.state = state;
};
config_ctrl.get_node_state = function () {
	return config.node.state;	
};

config_ctrl.get_cache_obj = function() {
	return 	cache;
};

module.exports = config_ctrl;

