var fs = require('fs');
var promise = require('bluebird');

var sess = {};

sess.load = function (file, callback) {
    var d = promise.pending();
    fs.readFile (file, function (err, data) {
        if (err) {
            return d.reject(err);
        }

        try {
            sess.config = JSON.parse (data);
        } catch (e) {
            return d.reject(e);
        }

        return d.resolve(sess.config);
    });
    return d.promise;
};

sess.config = {};

module.exports = sess;
