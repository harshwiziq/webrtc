var $             = require ('jquery-deferred');
var homedir       = require ('homedir');
var mkdirp        = require ('mkdirp');
var fs            = require ('fs');
var fse           = require ('fs-extra');
var azure_storage = require ('azure-storage'); 
var ffmpeg        = require ('fluent-ffmpeg');
var log           = require ('common/log-middleware').child ({ 'sub_module' : 'azure-upload'});

var dir_upload = homedir() + '/upload/';

var upload         = {};
var _metainfo      = [];
var files_uploaded = [];

upload.make_directory = function () {
	var d = $.Deferred ();

	mkdirp (dir_upload, function (err) {
		if (err) {
			d.reject (err);		   
			return d.promise ();
		}

		log.info (dir_upload + " directory made successfully");
		d.resolve ();
	});

	return d.promise ();
};

upload.start_upload_process = function (srcdirpath, config, job_id, filename) {
	var d = $.Deferred ();
	
	upload.finally_upload (dir_upload, config, job_id, filename)
		.then ( get_videoinfo,                                                    __error.bind (d, 'finally_upload'      ) )
		.then ( remove_files_uploaded.bind (null, dir_upload, job_id, filename),  __error.bind (d, 'get_videoinfo_fail'  ) )
		.then ( d.resolve.bind (d),                           		              __error.bind (d, 'remove_files_fail'   ) );

	return d.promise ();
};

upload.make_metainfo_file = function (__config, filelist) {
	var d = $.Deferred ();

	var json_config = [];

	json_config.push (__config);

	if (filelist.length) {
		var metadata = {
			videos_metadata : {
				filelist       : filelist,
				filesuploaded  : files_uploaded,
				files_metadata : _metainfo	
			}
		};

		json_config.push (metadata);
	}

	fs.writeFile ('/tmp/metadata.json', JSON.stringify (json_config, null, 2), 'utf-8', function (err) {
		if (err) {
			log.error ({err : err}, 'recording metadata file for session ' + __config.class_config.sess_id + ' create error');
			return d.resolve ();
		}

		log.info ({ config : json_config }, 'metadata file successfully created');
		return d.resolve ('/tmp/', __config, null, 'metadata.json');
	});

	return d.promise ();
};

function __error (str, job, err) {
	log.error ('error : ' + 'job ===>' + job + ' : ' + str + ' : ' + err);
	this.reject (err);
}

function copy_files (job_id, srcdirpath, filename) {
	var d = $.Deferred ();

	fse.copy (srcdirpath + filename, dir_upload + filename, function (err) {

		if (err && err.code !== 'ENOENT') 
			return d.reject ({ job_id : job_id, file : filename } , err);

		log.info ({ job_id : job_id, file : filename }, "file copy ok");
		return d.resolve (job_id, filename);	
	});

	return d.promise ();
}

upload.finally_upload = function (path, config, job_id, filename) {
	var d = $.Deferred ();

	var blob_info   = config.custom_config.store.custom_info;
	var session_id  = config.class_config.sess_id;
	var blobname    = session_id + '/' ;

	var blobService = azure_storage.createBlobService (blob_info.azure_strg_name, blob_info.azure_strg_key);
	
	log.info ({ job_id : job_id, file : filename }, 'uploading starts .....');

	blobService.createBlockBlobFromLocalFile (blob_info.container_id, blobname + filename, path + filename, function (err, result) {

		if (err) {
			return d.reject ({ job_id : job_id, file : filename }, err);
		}

		files_uploaded.push (filename);
		log.info ({ job_id : job_id, file : filename }, 'blob upload ok');

		return d.resolve (job_id, filename);
	});

	return d.promise ();
};

function get_videoinfo (job_id, filename) {
	var d = $.Deferred ();

	ffmpeg.ffprobe (dir_upload + filename, function (err, data) {

		if (err) {
			log.error ({ job_id : job_id, file : filename }, "error while getting file info");
			return d.resolve ();
		}

		if (!data) {
			log.info ({ job_id : job_id, file : filename }, "no file data");
			return d.resolve ();
		}

		log.info ({ job_id : job_id, file : filename }, 'get fileinfo ok');

		_metainfo.push   
		({
			'fileinfo'    : {
				filename   : filename,
				filesize   : data.format.size,
			},
			'video_info' : {
				codec_name : data.streams[0].codec_name,
				codec_type : data.streams[0].codec_type,
				width      : data.streams[0].width,
				height     : data.streams[0].height,
			},
			'audio_info' : {
				codec_name : data.streams[1].codec_name,
				codec_type : data.streams[1].codec_type,
				sample_rate: data.streams[1].sample_rate,
				channels   : data.streams[1].channels,
			}				
		});		

		   d.resolve (job_id, filename);
	});

	return d.promise ();
}

function remove_files_uploaded (path, job_id, filename) {
	var d = $.Deferred ();

	fs.unlink (path + filename, function (err) {

		if (err && err.code !== 'ENOENT')
			return d.reject ({ job_id : job_id, file : filename }, err);

		log.info ({ job_id : job_id, path : path, file : filename }, 'file remove ok');
		return d.resolve (job_id, filename);
	});

	return d.promise ();	
}

module.exports = upload ;
