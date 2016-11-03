var minimist  = require('minimist');
var log = require('landing/common/log').child({ "module" : "args" });

var _argv = minimist(process.argv.slice(2));

var args = {};

log.debug ({ args : _argv}, 'command line arguments');

var all = [ 'backend', 'auth', 'landing', 'prov', 'agent' ];
args.get = function (key) {
	if (all.indexOf(key) != -1 && _argv.all)
		return true;

	return _argv[key];
};

module.exports = args;
