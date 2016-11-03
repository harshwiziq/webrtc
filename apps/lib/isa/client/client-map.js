var log       = require('./log');
var token_map = {};
var m         = {};

m.add = function (to, token, url) {
	token_map[to] = { 
		token : token, 
		url   : url 
	};

	log.debug(token_map[to], 'added to token map');
};

m.find = function (to) {
	return token_map[to];
};

m.remove = function (to) {
	log.debug(token_map[to], 'removed from token map');
	delete token_map[to];
};

module.exports = m;
