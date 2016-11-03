var promise = require('bluebird');
var ioredis = require('ioredis');
var mylog   = require('common/log').sub_module('cache');

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

cache.init = function (namespace, expiry_global) {
	return {

		redis : redis,

              set : function (key, value, expiry) {
                  var _p = promise.pending();

                  key = namespace + '::' + key;

                  if (!cache.connected) {
                      mylog.warn ({ key:key }, 'set key failed. Not connected.');
                      _p.reject ('not connected');
                      return _p.promise;
                  }

                  redis.set (key, value, function (err, val) {
                      if (err) {
                          mylog.debug ({key:key}, 'cache set failed');
                          _p.reject (err);
                          return _p.promise;
                      }

                      var _e = expiry || expiry_global;
                      if (_e) {
                          redis.expire (key, _e);
                      }
                      mylog.debug ({ key:key, expiry:_e }, 'cache set');

                      _p.resolve(value);

                  });

                  return _p.promise;
              },

		get : function (key) {
			var _p      = promise.pending();

			key = namespace + '::' + key;

			if (!cache.connected) {
				mylog.warn ({key:key}, 'get key failed. Not connected.');
				_p.reject ('not connected');
				return _p.promise;
			}

			redis.get(key, function (err, val) {

				if (err || !val) {
					mylog.debug ({key:key}, 'cache miss');
					_p.reject (err);
					return _p.promise;
				}
				mylog.debug ({key: key}, 'cache hit');
				return _p.resolve (val);
			});

			return _p.promise;
		},

		mget : function (__keys) {
			var _p      = promise.pending();
			var key     = __keys.map (function (curr) {
								return namespace + '::' + curr;
							});

			if (!cache.connected) {
				mylog.warn ({key:key}, 'get key failed. Not connected.');
				_p.reject ('not connected');
				return _p.promise;
			}

			redis.mget(key, function (err, val) {

				if (err || !val) {
					mylog.debug ({key:key}, 'cache miss');
					_p.reject (err);
					return _p.promise;
				}
				return _p.resolve (val);
			});

			return _p.promise;
		},

		expire : function (key, expiry) {
			key = namespace + '::' + key;

			if (!cache.connected) {
				mylog.warn ({ key:key }, 'expire key failed. Not connected.');
				return;
			}

			redis.expire (key, expiry);
			return;
		},

		invalidate : function (key) {
			key = namespace + '::' + key;
			mylog.debug ('cache:invalidating key: ' + key);
			redis.del (key);
		},

		keys: function () {
			var _p      = promise.pending();

			if (!cache.connected) {
				mylog.warn ({ namespace : namespace }, 'getall keys failed. Not connected.');
				_p.reject ('not connected');
				return _p.promise;
			}

			redis.keys (namespace + "::*", function (err, val) {

				if (err) {
					mylog.error ({ namespace : namespace }, 'getall error - command "keys" failed.');
					_p.reject (err);
					return _p.promise;
				}

				var _keys = [];
				val.forEach(function (curr, index, arr) {
					_keys.push(curr.replace(/^.*::/g, ''));
				});

				return _p.resolve (_keys);
			});

			return _p.promise;
		},

		scan: function (__match) {
			var _p = promise.pending();
			var match = namespace + '::' + __match;

			if (!cache.connected) {
				mylog.warn ({ match : match }, 'scan keys failed. Not connected.');
				_p.reject ('not connected');
				return _p.promise();
			}

			var stream = redis.scanStream ({ match: match });
			var keys   = [];
			var regex  = new RegExp (namespace + '::', 'g');

			stream.on ('data', function (resultKeys) {
				if (resultKeys.length)
					keys = keys.concat (resultKeys.map (function (curr, index, arr) {
						return curr.replace(regex, '');
					}));
			});

			stream.on('end', function () {
				return _p.resolve (keys);
			});

			return _p.promise;
		}
	};
};

cache.invalidate = function () {
	mylog.debug ('cache.invalidate: flush all');
	redis.flushall();
};

module.exports = cache;
