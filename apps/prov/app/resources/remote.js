var scp    = require('scp2');
var client = require('ssh2').Client;
var promise= require('bluebird');
var log    = require('prov/app/common/log').child({ module : 'resources/remote' });

var remote = {};


remote.send_file = function (file, configure) {
	/*
	 * remote directory need to be already created
	 * can't copy to non-exixtent direcotries i.e doesn't create them
	 */
	var _d = promise.pending ();

	scp.scp(file, configure, function (err){
		if (err) {
			log.error('file transfer error :', err);
			return _d.reject(err);
		}
		log.info('file transfer success');
		return _d.resolve('file transfer ok');
	});

	return _d.promise;
};

remote.execute = function (config, resource_config) {
	/*
	 * Remove remote output prints
	 * Check for stream close to ensure command execute completion
	 * No error scenario as of now (fatal). do R&D
	 */
	var _d       = promise.pending ();
	var sess_id  = resource_config.class_config.sess_id;
	var class_id = resource_config.class_config.class_id;

	var connection = new client();
	/*
	 * Sometimes the "ready" callback below gets fired multiple times. A hack to
	 * prevent that. */
	connection.wiziq_remote = false;

	connection.on ('ready', function() {

		if (connection.wiziq_remote)
			/*
			 * Just return silently */
			return;

		log.info ({ remote : config }, 'remote host ready for command');
		connection.wiziq_remote = true;

		connection.exec (config.command, function (err, stream) {

			if (err) {
				log.error ({error : err}, 'remote connction error');
				return _d.reject(err);
			}

			stream.on ('close', function (code, signal) {

				log.info ({ sess_id : sess_id, class_id : class_id, code : code, signal : signal }, 'remote stream closed');
				connection.end();
				return _d.resolve ('execute ok');

			}).on('data', function(data) {

				log.info ({ sess_id : sess_id, class_id : class_id }, 'remote stout --> ' + data);

			}).stderr.on('data', function(data) {

				log.error ({ sess_id : sess_id, class_id : class_id }, 'remote stderr --> ' + data);
			});
		});

	}).connect(config);

	return _d.promise;
};


module.exports = remote;
