var bunyan = require('bunyan');

var log = bunyan.createLogger ({
	name 	: 'isa-client',
	streams : [
		{
			stream : process.stdout,
			level  : 'debug'
		}
	]
});

module.exports = log;

