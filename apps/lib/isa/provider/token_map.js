var log = require('./log');
var token_map = {};
var m = {};

m.add = function (from, id, token, state, _d) {
	token_map[from + '_' + id] = { 
		token    : token, 
		state    : state, 
		deferred : _d 
	};

	log.debug(token_map[from+'_'+id], 'added to provider token map');
};

m.find = function (from, id) {
	return token_map[from + '_' + id];
};

m.remove = function (from, id) {
	log.debug(token_map[from+'_'+id], 'removed from provider token map');
	delete token_map[from + '_' + id];
};

module.exports = m;
