var jwt           = require('jsonwebtoken');
var $             = require('jquery-deferred');
var os            = require('os');
var cache         = require('../common/cache').init('isa');
var map           = require('./token_map');
var log           = require('./log');
var secret        = require('../isa-config').secret;
var shared_secret = require('../isa-config').shared_secret;
var isa           = {};

isa.authenticate = function (req, res, next) {
	var token = req.headers['x-access-token'];

	if (!token) {
		return res.status(401).send({ 
			message: 'No token provided'
		});
	}

	cache.get(token)
		.then(
			function (val) {
				if (!val) {
					log.info({ msg : 'should never hapen' }, 'cache callback');
					
					return res.status(403).send({
						msg : 'forbidden'
					});
				}

				next();
			},
			function (err) {
				log.error({ err : err }, 'cache callback');

				if (err) {
					return res.status(500).send({
						err : err
					});
				}
				
				return res.status(403).send({
					msg   : 'forbidden'
				});
			}
	);
};

isa.create_token = function (req, res, next) {

	check_credential(req, function (err, data) {
		if (err) {
			return res.status(401).send({ 
				message: err
			});
		}

		var token;
		var from = data.svc;
		var id   = data.hostname;
		var map_obj = map.find(from, id);
		
		// if not found in map, then create a new token
		if (!map_obj) {
			log.info('not found in server map');
			
			//setting the state to 'none'
			map.add(data.svc, data.hostname, null, 'none', null);
			cache_miss(data);
			return;
		}
		
		token = map_obj.token;
		
		log.info( map_obj, 'token-map');

		/***********************************************************************************
		 * when a request is in the 'creating' state and new request comes. 			   *
		 * if this check is not put then that request will go and look inside cache while  *
		 * the operation of cache set is happening thus creating a race condition          *                                                              
		 ***********************************************************************************/
		
		if (map_obj.state === 'creating') {
			log.debug({ state : map_obj.state }, 'returning promise');
			map_obj.deferred.promise().then(cache_hit, fail);
			return;
		}
		
		// Happens when multiple requests hit in the 'created' state
		cache.get(token)
			.then(
				cache_hit.bind(null, token),
			   	cache_miss.bind(null, data)
			);
	});
		
	function cache_hit (token) {
		log.info ({ token : token }, 'cache_hit sending token');
		
		return res.status(200).send({
			token : token
		});
	}

	function fail(err) {
		log.error({ err : err }, 'request failed server error');
		
		return res.status(500).send({
			err : err
		});
	}

	function cache_miss(client_info, err) {

		if (err) {
			log.error({ err : err }, 'cache_miss');

			return res.status(500).send({
				err : err
			});
		}

		var map_obj = map.find(client_info.svc, client_info.hostname);
		var state   = map_obj.state;

		 /*************************
		 * 		State machine     *
		 *************************/	

		/* Entry is present is object map. Lookup in cache to see if it is still valid.
		 * Found - return token
		 * Not found. state creating ---> create @jwt callback -----> save_token() 
		 * 1. cache_save 2. map_save() ----->  resolve deferred. 
		 */

		switch (state) {
			case 'creating' :
				if (!map_obj.deferred) {
					log.error({ state : state, msg : 'deferred is undefined' }, 'should never happen');
				}

				log.debug({ state : state }, 'returning promise');
				map_obj.deferred.promise().then(cache_hit, fail);
				break;
			
			case 'none'    :
			case 'created' :
				log.debug({ state : state }, 'creating deferred & token');
				
				map_obj.state    = 'creating';
				map_obj.deferred = $.Deferred();

				token_creator(client_info, map_obj.deferred)
					.then(
						cache_hit,
						fail
					);
				break;
		}
	}

	function token_creator (client_info, _d) {
		jwt.sign(
			{ 
				client_id : client_info.hostname, 
				c_ts      : new Date().toString() 
			}, 
			secret, 
			{
				issuer    : os.hostname(), 
				expiresIn : 60 
			}, 
			function (token) {
				if (!token) {
					reject_all(client_info, _d, 'token signing failed :: should never happen');
					return;
				}
						
				log.debug({ token : token }, 'created new token and setting the cache');

				cache.set(token, JSON.stringify(client_info), 60)
					.then (
						resolve_all.bind(null, token, client_info, _d),
						reject_all.bind(null, client_info, _d)
					);
			}
		);

		return _d.promise();
	}

	function resolve_all (token, client_info, _d) {
		// Since entry added to cache update the map
		map.add(client_info.svc, client_info.hostname, token, 'created', _d);
		log.debug('resolving promise');

		_d.resolve(token);
		_d.deferred = null;
	}

	function reject_all (client_info, _d, err) {
		_d.reject(err);
		log.error('removing from map');
		map.remove(client_info.svc, client_info.hostname);
	}

};

cache.redis.on('connect', function () {
	log.debug({ msg : 'Success redis connection' }, 'connected to redis');
});

/* Local Methods  */

/* Verify the info sent by the client */
function check_credential (req, cb) {
	var token = req.headers.client_info;

	if (!token) {
		log.info({ msg : 'no client_info found' }, 'check_credential');
		return cb ('no client_info found');
	}

	jwt.verify(token, shared_secret, function (err, decoded) {
		if (err) {
			return cb(err);
		}

		cb (null, decoded);
	});
}

module.exports = isa;
