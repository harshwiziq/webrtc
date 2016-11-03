var bunyan = require('bunyan');

var log = bunyan.createLogger ({
	name 	: 'isa-provider',
	streams : [
		{
			stream : process.stdout,
			level  : 'debug'
		}
	]
});

module.exports = log;

