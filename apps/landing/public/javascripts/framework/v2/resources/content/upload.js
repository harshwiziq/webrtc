define(function(require) {
	var $           = require('jquery');
	var events      = require('events');
	window.jade     = require('jade');
	var identity    = require('identity');
	var log         = require('log')('upload', 'info');

	var upload = {};
	var f_handle_cached;
	var _allowed;
	var emitter = events.emitter ('content:upload', 'upload');

	upload.init = function (display_spec, custom, perms, f_handle) {
		f_handle_cached = f_handle;
		_allowed = f_handle.perms.has_perm;
		init_handlers ();
		return true;
	};

	/*
	 * This is called upon the creation of a new tab */
	upload.prepare = function (initial_data) {
		var working_data = {};
		working_data.handle       = initial_data.handle;
		working_data.anchor       = initial_data.anchor;
		working_data.email        = initial_data.email;
		working_data.upload_span  = working_data.anchor.find ('.content-upload-label');
		working_data.upload_input = working_data.anchor.find ('.content-upload-input');
		working_data.error_span   = working_data.anchor.find ('.content-upload-error');
		working_data.status_span  = working_data.anchor.find ('.content-upload-status');
		working_data.progress     = working_data.anchor.find ('.progress');
		working_data.busy         = working_data.anchor.find ('.content-conversion-busy');

		working_data.upload_span.on('click', function (ev) {
			working_data.upload_input.trigger('click');
		});

		working_data.upload_input.on('click', function (ev) {
			if (!_allowed('write','control'))
				return false;

			clear_error (working_data);
			update_status (working_data, '');
			working_data.upload_input.val(null);
		});

		working_data.upload_input.on('change', function (ev) {
			var files = $(ev.currentTarget)[0].files;
			if (!files || files.length === 0)
				return;

			disable_input (working_data);
			init_progress_bar (working_data.progress);
			update_status (working_data, 'Requesting ...');

			working_data.file = files[0];

			get_presigned_url (working_data)
				.then (upload_start.bind(working_data),                 handle_error.bind('Request Failed', working_data))
				.then (upload_complete.bind(working_data),              handle_error.bind('Upload Failed', working_data))
				.then (start_conversion.bind(working_data),             handle_error.bind('Upload Failed', working_data))
				.then (inform_library.bind(working_data, initial_data), handle_error.bind('Conversion Failed', working_data))
				.then (finish.bind(working_data),                       handle_error.bind('Post Conversion Failed', working_data));
		});

		/*
		 * Show only specific filetypes in the dialog box
		 */
		working_data.upload_input.attr("accept", ".pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt");
	};

	function update_status (working_data, text) {
		working_data.status_span.html(text);
	}

	function handle_error (working_data, err) {

		enable_input (working_data);

		/*
		 * If, say, the 'get_presigned_url' fails, this handler will be called in 
		 * a cascade, but thankfully with null error parametes the subsequent times */
		if (!err)
			return;

		if (this)
			update_status (working_data, this);

		if (err && err.error_message)
			err = err.error_message;

		vanish_progress_bar (working_data.progress, err);
		mark_error (working_data, err);
	}

	function finish () {
		var working_data = this;
		enable_input (working_data);
		update_status (working_data, '');
	}

	function disable_input (working_data) {
		working_data.upload_input.prop('disabled', true);
	}

	function enable_input (working_data) {
		working_data.upload_input.prop('disabled', false);
	}

	function mark_error (working_data, err) {
		var error_span = working_data.error_span;
		var err_str = (typeof err === 'object' ? 'Server Error' : err);

		log.error ('mark_error : err = ', err);
		error_span.html (err_str);
		error_span.css('display', 'block');
	}

	function clear_error (working_data) {
		working_data.error_span.html ('');
		working_data.error_span.css('display', 'none');
	}

	function upload_start (presigned_response) {
		/*
		 * 'this' is the working_data */

		var _d = $.Deferred ();
		var working_data = this;
		var file_obj = working_data.file;

		log.info ('upload_start : presigned_response = ', presigned_response);

		var xhr = new XMLHttpRequest();
		xhr.open ("PUT", presigned_response.upload_url);
		xhr.setRequestHeader('x-amz-acl', 'public-read');
		xhr.upload.addEventListener ("progress", update_progress.bind (null, working_data));
		xhr.onload = function() {
			if (xhr.status !== 200) {
				_d.reject ('upload failed with status code ' + xhr.status);
				vanish_progress_bar (working_data.progress, xhr.status);
				return;
			}

			_d.resolve (presigned_response, file_obj);
			vanish_progress_bar (working_data.progress, null);
		};
		xhr.onerror = function(err) {
			log.error ('upload_start: err = ', err);
			update_status (working_data, 'Upload Failed');
			_d.reject(err);
		};
		xhr.send(file_obj);
		update_status (working_data, 'Uploading ...');

		return _d.promise ();
	}

	function init_progress_bar (progress) {
		progress.find('.progress-bar').removeClass('progress-bar-danger');
		progress.find('.progress-bar').removeClass('progress-bar-success');
		progress.find('.progress-bar').css('width', '0%');
		progress.fadeIn(500);
	}
	function vanish_progress_bar (progress, err) {
		progress.find('.progress-bar').addClass('progress-bar-' + (err ? 'danger' : 'success'));
		progress.find('.progress-bar').removeClass('progress-bar-' + (err ? 'success' : 'danger'));
		progress.fadeOut(500);
	}

	function update_progress (working_data, evt) {
		if (evt.lengthComputable === true){
			var percentage_upload = (evt.loaded/evt.total)*100;
			working_data.progress.find('.progress-bar').css('width', parseInt (evt.loaded / evt.total * 100, 10) + '%');
		}
	}

	function upload_complete (presigned_response, file_obj) {

		/*
		 * 'this' is the working_data */

		var _d = $.Deferred ();
		var working_data = this;
		update_status (working_data, 'Finalizing upload ...');

		var key = 'upload_complete';
		var value = {
			name            : file_obj.name,
			path            : '/vctemp/'+ encodeURIComponent(file_obj.name),		// WBRTC-138
			type            : file_obj.type,
			size            : file_obj.size,
			url             : presigned_response.access_url,
			user_id         : working_data.email,
			vc_id           : f_handle_cached.identity.vc_id,
			u_name          : f_handle_cached.identity.id,
			removeafter     : 3600,
			tags            : 'content, pdf'
		};

		working_data.busy.css('display', 'block');
		f_handle_cached.send_command (null, key, value, 0)
			.then (
				function (upload_response) {
					_d.resolve (presigned_response, upload_response);
				},
				function (err) {
					_d.reject (err);
					update_status (working_data, 'Upload Complete Info Error.');
				}
			);

		return _d.promise ();
	}

	function start_conversion (presigned_response, upload_response) {

		/*
		 * 'this' is the working data */

		var _d = $.Deferred ();
		var working_data = this;
		update_status (working_data, 'Processing ...');

		var key = 'start-conversion';
		var value = {
			name         	: upload_response.name,
			path	        : '/' + encodeURIComponent (upload_response.name),
			type		    : upload_response.type,
			size      	    : upload_response.size,
			url             : presigned_response.access_url,
			user_id		    : working_data.email,
			vc_id 		    : f_handle_cached.identity.vc_id,
			u_name 		    : f_handle_cached.identity.id,
			tags		    : 'content, pdf'
		};

		working_data.busy.css('display', 'block');
		f_handle_cached.send_command (null, key, value, 0)
			.then (
				function (conversion_response) {
					_d.resolve (presigned_response, conversion_response);
					update_status (working_data, 'Conversion Finished');
				},
				function (err) {
					_d.reject (err);
					update_status (working_data, 'Conversion Failed');
				}
			)
			.always (
				function () {
					working_data.busy.css('display', 'none');
				}
			);

		return _d.promise ();
	}

	function inform_library (initial_data, presigned_response, conversion_response) {
		var _d = $.Deferred ();

		log.info ('inform_library : ', initial_data, presigned_response, conversion_response);
		emitter.emit ('content-added', {
			handle        : initial_data.handle,
			data          : conversion_response,
			/*
			name          : conversion_response.name,
			type          : conversion_response.type,
			created_at    : conversion_response.created_at,
			id            : conversion_response.id,
			raw_file_url  : data.access_url,
			conv_url      : conversion_response.url,
			thumbnail     : conversion_response.thumbnail
		   */
		});

		_d.resolve ();

		return _d.promise ();
	}

	function init_handlers () {
	}

	function get_presigned_url (working_data) {
		var file = working_data.file;
		var key = 'get-tmp-url';
		var val = {
			path      : '/vctemp/' + encodeURIComponent (file.name),
			name      : file.name,
			type      : file.type ? file.type : file.name.replace(/^.*\./g, ''),
			user_id   : working_data.email
		};

		log.info ('get_presigned_url: sending ', val);

		/*
		 * Send command to the session side couternpart */
		return f_handle_cached.send_command (null, key, val, 0);
	}

	return upload;

});
