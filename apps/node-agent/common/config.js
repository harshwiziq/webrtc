var path = require('path');
var log = require('node-agent/common/log');

var config = {};		

//  set static values 
config.node = {
	"state": 'free',                      // free | acquiring | acquired | releasing | error(for now) 
	"id"   : undefined,
	"url"  : undefined
};

config.prov = {
	"ip"       : undefined,
	"protocol" : undefined,
	"host"     : undefined,
	"port"     : undefined
};

// session directory 
var dir = path.resolve( process.cwd(), '../session/v2');

config.docker = {
	"image"           : 'avinashwiziq/wiziq-session:v3.0' ,
	"sess_mount"      : '/session' ,
	"internal_port"   : '3179' ,
	"sess_info_dir"   : '/tmp/vc-sessions/' ,
   	"sess_info_mount" : '/info/',
	"sess_dir"        : dir
};

// print initial config
log.debug ({ config : config}, 'initial configuration..defaults');

module.exports = config;
