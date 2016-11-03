var $       = require('jquery-deferred');
var ioredis = require('ioredis');
var events  = require('events');
var mylog   = require('./log').sub_module('cache');

var redis = new ioredis({
	retryStrategy : function (times) {
		/* for now keep it at 10 seconds */
		return Math.min(times * 1000, 10000); 
	}
});

var cache   = {};
cache.connected = false;

redis.on('connect', function () {
	cache.connected = true;
	mylog.info('Connection to Redis Cache ok');
});

redis.on('error', function (err) {
	mylog.error('Connection to Redis Cache reported error: ' + err);
});

redis.on('close', function () {
	if (cache.connected) {
		cache.connected = false;
		mylog.warn('Connection to Redis Cache closed');
	}
});

redis.on('reconnecting', function () {
	mylog.info('Re-connecting to Redis Cache ...');
});

cache.init = function (namespace, expire) {
	return {

		redis : redis,

		set : function (key, value, ex) {
			var _p      = $.Deferred ();


			key = namespace + '::' + key;

			if (!cache.connected) {
				mylog.warn ({ key:key }, 'set key failed. Not connected.');
				
				if (!ex) {
					return false;
				}

				_p.reject ('not connected');
				return _p.promise();
			}

			mylog.debug ({key:key}, 'cache set');

			if (ex) {
				redis.set(key, value, 'EX', ex, function (err, val) {
					mylog.error('inside redis set callback');
					
					if (err || !val) {
						mylog.error ('cache set miss');
						return _p.reject (err);
					}

					mylog.error ({ key : key, val : val }, 'cache set hit with cb');
					return _p.resolve (val);
				});

				return _p.promise();
			}

			redis.set (key, value);

			if (expire)
				redis.expire (key, expire);

			return true;
		},

		get : function (key) {
			var _p      = $.Deferred ();

			key = namespace + '::' + key;

			if (!cache.connected) {
				mylog.warn ({key:key}, 'get key failed. Not connected.');
				_p.reject ('not connected');
				return _p.promise();
			}

			redis.get(key, function (err, val) {

				if (err || !val) {
					mylog.debug ({key:key}, 'cache miss');
					_p.reject (err);
					return _p.promise();
				}
				mylog.debug ({key: key}, 'cache hit');
				return _p.resolve (val);
			});

			return _p.promise();
		},

		invalidate : function (key) {
			key = namespace + '::' + key;
			mylog.warn ('cache:invalidating key: ' + key);
			redis.del (key);
		},

		keys: function () {
			var _p      = $.Deferred();

			if (!cache.connected) {
				mylog.warn ({ namespace : namespace }, 'getall keys failed. Not connected.');
				_p.reject ('not connected');
				return _p.promise();
			}

			redis.keys (namespace + "::*", function (err, val) {

				if (err) {
					mylog.error ({ namespace : namespace }, 'getall error - command "keys" failed.');
					_p.reject (err);
					return _p.promise();
				}

				var _keys = [];
				val.forEach(function (curr, index, arr) {
					_keys.push(curr.replace(/^.*::/g, ''));
				});

				return _p.resolve (_keys);
			});

			return _p.promise();
		}
	};
};

cache.invalidate = function () {
	mylog.warn ('cache.invalidate: flush all');
	redis.flushall();
};

module.exports = cache;
