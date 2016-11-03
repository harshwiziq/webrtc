var $      = require('jquery-deferred');
var fs     = require('fs');
var mkdirp = require('mkdirp');
var log    = require('node-agent/common/log');
var config = require('node-agent/common/config').docker;

var filesys = {};

filesys.init = function () {
	var _d = $.Deferred ();

	mkdirp (config.sess_info_dir, function (err){
		if (err) {
			log.error ({ err : err }, 'directory creation failed');
			return _d.reject (err);
		}

		return _d.resolve ();
	});

	return _d.promise ();
};

filesys.write_sess_info = function (name, text, cb) {
	/*
	 * mkdirp can recursively create directories 
	 * this should work even when sess_info_dir = '/tmp/dir1/dir2/dir3 */
	mkdirp (config.sess_info_dir, function (err){
		if (err) {
			log.error ({ err : err }, 'directory creation failed');
			return cb (err);
		}
		
		fs.writeFile (config.sess_info_dir + name, text, cb);
	});
};

filesys.remove_sess_file = function (name,cb) {
	if (!cb || typeof cb != 'function'){ 
		cb = function(err){
			if (err)
				log.warn ({err: err, sess_id: name}, 'error deleting session info');	
		};
	}

	fs.unlink (config.sess_info_dir+name, cb);
};

module.exports = filesys;



