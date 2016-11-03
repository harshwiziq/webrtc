// Generated by CoffeeScript 1.4.0
  var EventEmitter, Model, isArray, queue, types,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  EventEmitter = require('events').EventEmitter;

  queue = require('./syncqueue');

  types = require('../types');

  isArray = function(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
  };

  module.exports = Model = function(db, options) {
    var add, awaitingGetSnapshot, docs, getOps, getOpsInternal, load, makeOpQueue, model, refreshReapingTimeout, tryWriteSnapshot, _ref, _ref1, _ref2, _ref3, _ref4;
    if (!(this instanceof Model)) {
      return new Model(db, options);
    }
    model = this;
    if (options == null) {
      options = {};
    }
    docs = {};
    awaitingGetSnapshot = {};
    if ((_ref = options.reapTime) == null) {
      options.reapTime = 3000;
    }
    if ((_ref1 = options.numCachedOps) == null) {
      options.numCachedOps = 10;
    }
    if ((_ref2 = options.forceReaping) == null) {
      options.forceReaping = false;
    }
    if ((_ref3 = options.opsBeforeCommit) == null) {
      options.opsBeforeCommit = 20;
    }
    if ((_ref4 = options.maximumAge) == null) {
      options.maximumAge = 40;
    }
    makeOpQueue = function(docName, doc) {
      return queue(function(opData, callback) {
        if (!(opData.v >= 0)) {
          return callback('Version missing');
        }
        if (opData.v > doc.v) {
          return callback('Op at future version');
        }
        if (opData.v + options.maximumAge < doc.v) {
          return callback('Op too old');
        }
        opData.meta || (opData.meta = {});
        opData.meta.ts = Date.now();
        return getOps(docName, opData.v, doc.v, function(error, ops) {
          var oldOp, snapshot, writeOp, _i, _len, _ref5;
          if (error) {
            return callback(error);
          }
          if (doc.v - opData.v !== ops.length) {
            console.error("Could not get old ops in model for document " + docName);
            console.error("Expected ops " + opData.v + " to " + doc.v + " and got " + ops.length + " ops");
            return callback('Internal error');
          }
          if (ops.length > 0) {
            try {
              for (_i = 0, _len = ops.length; _i < _len; _i++) {
                oldOp = ops[_i];
                if (oldOp.meta.source && opData.dupIfSource && (_ref5 = oldOp.meta.source, __indexOf.call(opData.dupIfSource, _ref5) >= 0)) {
                  return callback('Op already submitted');
                }
                opData.op = doc.type.transform(opData.op, oldOp.op, 'left');
                opData.v++;
              }
            } catch (error) {
              console.error(error.stack);
              return callback(error.message);
            }
          }
          try {
            snapshot = doc.type.apply(doc.snapshot, opData.op);
          } catch (error) {
            console.error(error.stack);
            return callback(error.message);
          }
          if (opData.v !== doc.v) {
            console.error("Version mismatch detected in model. File a ticket - this is a bug.");
            console.error("Expecting " + opData.v + " == " + doc.v);
            return callback('Internal error');
          }
          writeOp = (db != null ? db.writeOp : void 0) || function(docName, newOpData, callback) {
            return callback();
          };
          return writeOp(docName, opData, function(error) {
            var oldSnapshot, _ref6;
            if (error) {
              console.warn("Error writing ops to database: " + error);
              return callback(error);
            }
            if ((_ref6 = options.stats) != null) {
              if (typeof _ref6.writeOp === "function") {
                _ref6.writeOp();
              }
            }
            oldSnapshot = doc.snapshot;
            doc.v = opData.v + 1;
            doc.snapshot = snapshot;
            doc.ops.push(opData);
            if (db && doc.ops.length > options.numCachedOps) {
              doc.ops.shift();
            }
            model.emit('applyOp', docName, opData, snapshot, oldSnapshot);
            doc.eventEmitter.emit('op', opData, snapshot, oldSnapshot);
            callback(null, opData.v);
            if (!doc.snapshotWriteLock && doc.committedVersion + options.opsBeforeCommit <= doc.v) {
              return tryWriteSnapshot(docName, function(error) {
                if (error) {
                  return console.warn("Error writing snapshot " + error + ". This is nonfatal");
                }
              });
            }
          });
        });
      });
    };
    add = function(docName, error, data, committedVersion, ops, dbMeta) {
      var callback, callbacks, doc, _i, _j, _k, _len, _len1, _len2;
      callbacks = awaitingGetSnapshot[docName];
      delete awaitingGetSnapshot[docName];
      if (error) {
        if (callbacks) {
          for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
            callback = callbacks[_i];
            callback(error);
          }
        }
      } else if (docs[docName]) {
        doc = docs[docName];
        if (callbacks) {
          for (_j = 0, _len1 = callbacks.length; _j < _len1; _j++) {
            callback = callbacks[_j];
            callback('Document already exists');
          }
        }
      } else {
        doc = docs[docName] = {
          snapshot: data.snapshot,
          v: data.v,
          type: data.type,
          meta: data.meta,
          ops: ops || [],
          eventEmitter: new EventEmitter,
          reapTimer: null,
          committedVersion: committedVersion != null ? committedVersion : data.v,
          snapshotWriteLock: false,
          dbMeta: dbMeta
        };
        doc.eventEmitter.setMaxListeners(0);
        doc.opQueue = makeOpQueue(docName, doc);
        refreshReapingTimeout(docName);
        model.emit('add', docName, data);
        if (callbacks) {
          for (_k = 0, _len2 = callbacks.length; _k < _len2; _k++) {
            callback = callbacks[_k];
            callback(null, doc);
          }
        }
      }
      return doc;
    };
    getOpsInternal = function(docName, start, end, callback) {
      if (!db) {
        return typeof callback === "function" ? callback('Document does not exist') : void 0;
      }
      return db.getOps(docName, start, end, function(error, ops) {
        var op, v, _i, _len;
        if (error) {
          return typeof callback === "function" ? callback(error) : void 0;
        }
        v = start;
        for (_i = 0, _len = ops.length; _i < _len; _i++) {
          op = ops[_i];
          op.v = v++;
        }
        return typeof callback === "function" ? callback(null, ops) : void 0;
      });
    };
    load = function(docName, callback) {
      var callbacks, _ref5, _ref6;
      if (docs[docName]) {
        if ((_ref5 = options.stats) != null) {
          if (typeof _ref5.cacheHit === "function") {
            _ref5.cacheHit('getSnapshot');
          }
        }
        return callback(null, docs[docName]);
      }
      if (!db) {
        return callback('Document does not exist');
      }
      callbacks = awaitingGetSnapshot[docName];
      if (callbacks) {
        return callbacks.push(callback);
      }
      if ((_ref6 = options.stats) != null) {
        if (typeof _ref6.cacheMiss === "function") {
          _ref6.cacheMiss('getSnapshot');
        }
      }
      awaitingGetSnapshot[docName] = [callback];
      return db.getSnapshot(docName, function(error, data, dbMeta) {
        var committedVersion, type;
        if (error) {
          return add(docName, error);
        }
        type = types[data.type];
        if (!type) {
          console.warn("Type '" + data.type + "' missing");
          return callback("Type not found");
        }
        data.type = type;
        committedVersion = data.v;
        return getOpsInternal(docName, data.v, null, function(error, ops) {
          var op, _i, _len;
          if (error) {
            return callback(error);
          }
          if (ops.length > 0) {
            console.log("Catchup " + docName + " " + data.v + " -> " + (data.v + ops.length));
            try {
              for (_i = 0, _len = ops.length; _i < _len; _i++) {
                op = ops[_i];
                data.snapshot = type.apply(data.snapshot, op.op);
                data.v++;
              }
            } catch (e) {
              console.error("Op data invalid for " + docName + ": " + e.stack);
              return callback('Op data invalid');
            }
          }
          model.emit('load', docName, data);
          return add(docName, error, data, committedVersion, ops, dbMeta);
        });
      });
    };
    refreshReapingTimeout = function(docName) {
      var doc;
      doc = docs[docName];
      if (!doc) {
        return;
      }
      return process.nextTick(function() {
        var reapTimer;
        if (doc === docs[docName] && doc.eventEmitter.listeners('op').length === 0 && (db || options.forceReaping) && doc.opQueue.busy === false) {
          clearTimeout(doc.reapTimer);
          return doc.reapTimer = reapTimer = setTimeout(function() {
            return tryWriteSnapshot(docName, function() {
              if (docs[docName].reapTimer === reapTimer && doc.opQueue.busy === false) {
                return delete docs[docName];
              }
            });
          }, options.reapTime);
        }
      });
    };
    tryWriteSnapshot = function(docName, callback) {
      var data, doc, writeSnapshot, _ref5;
      if (!db) {
        return typeof callback === "function" ? callback() : void 0;
      }
      doc = docs[docName];
      if (!doc) {
        return typeof callback === "function" ? callback() : void 0;
      }
      if (doc.committedVersion === doc.v) {
        return typeof callback === "function" ? callback() : void 0;
      }
      if (doc.snapshotWriteLock) {
        return typeof callback === "function" ? callback('Another snapshot write is in progress') : void 0;
      }
      doc.snapshotWriteLock = true;
      if ((_ref5 = options.stats) != null) {
        if (typeof _ref5.writeSnapshot === "function") {
          _ref5.writeSnapshot();
        }
      }
      writeSnapshot = (db != null ? db.writeSnapshot : void 0) || function(docName, docData, dbMeta, callback) {
        return callback();
      };
      data = {
        v: doc.v,
        meta: doc.meta,
        snapshot: doc.snapshot,
        type: doc.type.name
      };
      return writeSnapshot(docName, data, doc.dbMeta, function(error, dbMeta) {
        doc.snapshotWriteLock = false;
        doc.committedVersion = data.v;
        doc.dbMeta = dbMeta;
        return typeof callback === "function" ? callback(error) : void 0;
      });
    };
    this.create = function(docName, type, meta, callback) {
      var data, done, _ref5;
      if (typeof meta === 'function') {
        _ref5 = [{}, meta], meta = _ref5[0], callback = _ref5[1];
      }
      if (docName.match(/\//)) {
        return typeof callback === "function" ? callback('Invalid document name') : void 0;
      }
      if (docs[docName]) {
        return typeof callback === "function" ? callback('Document already exists') : void 0;
      }
      if (typeof type === 'string') {
        type = types[type];
      }
      if (!type) {
        return typeof callback === "function" ? callback('Type not found') : void 0;
      }
      data = {
        snapshot: type.create(),
        type: type.name,
        meta: meta || {},
        v: 0
      };
      done = function(error, dbMeta) {
        if (error) {
          return typeof callback === "function" ? callback(error) : void 0;
        }
        data.type = type;
        add(docName, null, data, 0, [], dbMeta);
        model.emit('create', docName, data);
        return typeof callback === "function" ? callback() : void 0;
      };
      if (db) {
        return db.create(docName, data, done);
      } else {
        return done();
      }
    };
    this["delete"] = function(docName, callback) {
      var doc, done;
      doc = docs[docName];
      if (doc) {
        clearTimeout(doc.reapTimer);
        delete docs[docName];
      }
      done = function(error) {
        if (!error) {
          model.emit('delete', docName);
        }
        return typeof callback === "function" ? callback(error) : void 0;
      };
      if (db) {
        return db["delete"](docName, doc != null ? doc.dbMeta : void 0, done);
      } else {
        return done((!doc ? 'Document does not exist' : void 0));
      }
    };
    this.getOps = getOps = function(docName, start, end, callback) {
      var base, ops, version, _ref5, _ref6, _ref7, _ref8;
      if (!(start >= 0)) {
        throw new Error('start must be 0+');
      }
      if (typeof end === 'function') {
        _ref5 = [null, end], end = _ref5[0], callback = _ref5[1];
      }
      ops = (_ref6 = docs[docName]) != null ? _ref6.ops : void 0;
      if (ops) {
        version = docs[docName].v;
        if (end == null) {
          end = version;
        }
        start = Math.min(start, end);
        if (start === end) {
          return callback(null, []);
        }
        base = version - ops.length;
        if (start >= base || db === null) {
          refreshReapingTimeout(docName);
          if ((_ref7 = options.stats) != null) {
            _ref7.cacheHit('getOps');
          }
          return callback(null, ops.slice(start - base, end - base));
        }
      }
      if ((_ref8 = options.stats) != null) {
        _ref8.cacheMiss('getOps');
      }
      return getOpsInternal(docName, start, end, callback);
    };
    this.getSnapshot = function(docName, callback) {
      return load(docName, function(error, doc) {
        return callback(error, doc ? {
          v: doc.v,
          type: doc.type,
          snapshot: doc.snapshot,
          meta: doc.meta
        } : void 0);
      });
    };
    this.getVersion = function(docName, callback) {
      return load(docName, function(error, doc) {
        return callback(error, doc != null ? doc.v : void 0);
      });
    };
    this.applyOp = function(docName, opData, callback) {
      return load(docName, function(error, doc) {
        if (error) {
          return callback(error);
        }
        return process.nextTick(function() {
          return doc.opQueue(opData, function(error, newVersion) {
            refreshReapingTimeout(docName);
            return typeof callback === "function" ? callback(error, newVersion) : void 0;
          });
        });
      });
    };
    this.applyMetaOp = function(docName, metaOpData, callback) {
      var path, value, _ref5;
      _ref5 = metaOpData.meta, path = _ref5.path, value = _ref5.value;
      if (!isArray(path)) {
        return typeof callback === "function" ? callback("path should be an array") : void 0;
      }
      return load(docName, function(error, doc) {
        var applied;
        if (error != null) {
          return typeof callback === "function" ? callback(error) : void 0;
        } else {
          applied = false;
          switch (path[0]) {
            case 'shout':
              doc.eventEmitter.emit('op', metaOpData);
              applied = true;
          }
          if (applied) {
            model.emit('applyMetaOp', docName, path, value);
          }
          return typeof callback === "function" ? callback(null, doc.v) : void 0;
        }
      });
    };
    this.listen = function(docName, version, listener, callback) {
      var _ref5;
      if (typeof version === 'function') {
        _ref5 = [null, version, listener], version = _ref5[0], listener = _ref5[1], callback = _ref5[2];
      }
      return load(docName, function(error, doc) {
        if (error) {
          return typeof callback === "function" ? callback(error) : void 0;
        }
        clearTimeout(doc.reapTimer);
        if (version != null) {
          return getOps(docName, version, null, function(error, data) {
            var op, _i, _len, _results;
            if (error) {
              return typeof callback === "function" ? callback(error) : void 0;
            }
            doc.eventEmitter.on('op', listener);
            if (typeof callback === "function") {
              callback(null, version);
            }
            _results = [];
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              op = data[_i];
              listener(op);
              if (__indexOf.call(doc.eventEmitter.listeners('op'), listener) < 0) {
                break;
              } else {
                _results.push(void 0);
              }
            }
            return _results;
          });
        } else {
          doc.eventEmitter.on('op', listener);
          return typeof callback === "function" ? callback(null, doc.v) : void 0;
        }
      });
    };
    this.removeListener = function(docName, listener) {
      var doc;
      if (!(doc = docs[docName])) {
        return;
      }
      doc.eventEmitter.removeListener('op', listener);
      return refreshReapingTimeout(docName);
    };
    this.flush = function(callback) {
      var doc, docName, pendingWrites;
      if (!db) {
        return typeof callback === "function" ? callback() : void 0;
      }
      pendingWrites = 0;
      for (docName in docs) {
        doc = docs[docName];
        if (doc.committedVersion < doc.v) {
          pendingWrites++;
          tryWriteSnapshot(docName, function() {
            return process.nextTick(function() {
              pendingWrites--;
              if (pendingWrites === 0) {
                return typeof callback === "function" ? callback() : void 0;
              }
            });
          });
        }
      }
      if (pendingWrites === 0) {
        return typeof callback === "function" ? callback() : void 0;
      }
    };
    this.closeDb = function() {
      if (db != null) {
        if (typeof db.close === "function") {
          db.close();
        }
      }
      return db = null;
    };
  };

  Model.prototype = new EventEmitter;

