define(function(require) {
	var $           = require('jquery');
	var events      = require('events');
	var moment      = require('moment');
	var scrollbar   = require('scrollbar');
	window.jade     = require('jade');
	var log         = require('log')('library', 'info');
	var upload      = require('./upload');
	var player      = require('./player');

	var library = {};
	var f_handle_cached;
	var _allowed;
	var viewer_list = {};
	var map = {};

	events.bind ('content:upload', handle_new_content, 'library');

	library.init = function (display_spec, custom, perms, f_handle) {
		f_handle_cached = f_handle;
		_allowed = f_handle.perms.has_perm;
		init_handlers ();
		return true;
	};

	/*
	 * Called upon creation of a new tab */
	library.start = function (handle) {
		var anchor = handle.anchor;
		var anchor_id = $(anchor).attr('id');
		var _d = $.Deferred ();

		/*
		 * Get my identity. We will be showing "name" in content lib
		 * and using "id@auth_via.com" at the content server as user id.
		 */ 
		var emails   = f_handle_cached.identity.emails;
		var id       = f_handle_cached.identity.id;
		var auth_via = f_handle_cached.identity.auth_via;
		var email    = emails && emails[0].value;	
		var name     = f_handle_cached.identity.displayName || email || 'unknown';
		
		switch (auth_via) {
			case 'anon':
				email = 'test@wiziq.com';
				break;
			default:
				email = id + '@' + auth_via + '.com';
				break;
		}

		name  = (auth_via !== 'anon') ? name : 'Public';
		log.info ({name: name, email:email}, 'content user info being used');

		/*
		 * Load the library template */

		var template = f_handle_cached.template ('library');
		$(anchor).append (template ({ 
			tab_anchor_id : anchor_id,
			uuid          : handle.uuid,
			email         : name
		}));

		upload.prepare ({
			handle     : handle,
			anchor     : $(anchor).find('.content-lib-upload'),
			email      : email
		});

		var $lib_main = $(anchor).find('.content-lib-main');

		add_scrollbar ($lib_main);
		populate_library (email, $lib_main);
		map[handle.uuid] = {
			handle    : handle,
			$lib_main : $lib_main
		};

		_d.resolve ();
		return _d.promise ();
	};

	library.destroy = function ($tab_anchor) {
		var $lib_outer = $tab_anchor.find('.content-lib-outer');

		if (!$lib_outer || !$lib_outer.length)
			return;

		var uuid = $lib_outer.attr('data-uuid');
		if (!uuid)
			log.error ('destroy () : unable to find UUID for', $tab_anchor);

		if (uuid)
			delete map[uuid];

		$tab_anchor.find('.content-lib-outer').empty();
	};

	function populate_library (email, $lib_main) {

		get_content (email)
			.then (
				__populate.bind ($lib_main), handle_error.bind($lib_main)
			)
			.then(
				finish.bind ($lib_main)
			);
	}

	function finish () {
		var $lib_main = this;
		$lib_main.find('span.busy').fadeOut();
	}
	function handle_error (err) {

		/* show in all open libraries */
		for (var uuid in map) {
			var $lib_main = map[uuid].$lib_main;

			$lib_main.find ('.busy').css('display', 'none');
			$lib_main.find ('.content-lib-error').css('display', 'inline').html(err);
		}
	}

	function get_content (email) {
		var key = 'get-content';
		var val = { user_id : email };

		return f_handle_cached.send_command (null, key, val, 0);
	}

	var content_list = {};
	function __populate (content_arr) {
		var $lib_main = this;

		content_arr.data = sort_library (content_arr.data);

		for (var i = 0; i < content_arr.data.length; i++) {
			var info = content_arr.data[i];
			if (info.path.startsWith ('/vctemp/') ){
				continue;
			}
			add_to_lib ($lib_main, info);
			content_list[info.url] = info;
		}
	}

	/*
	 * Sort the content in increasing order of their creation time
	 */
	function sort_library (content_arr) {
		try {
			content_arr.sort(function (first, second) {
				var t_first  = moment(first.ctime);
				var t_second = moment(second.ctime);
				var duration = moment.duration(t_first.diff(t_second));
				return duration;
			});

			log.log('library sorted');
		}
		catch (err) {
			log.error({ err : err }, 'library sort failed');
		}

		return content_arr;
	}

	function add_to_lib ($lib_main, info) {
		var template     = f_handle_cached.template('library-item');
		var library_item = template (info);

		/*
		 * The info must look like this:
		 *     __v: 0
		 *     _id: "56dada11117a43a0fda531bb"
		 *     ctime: "2016-03-05T13:07:29.821Z"
		 *     dir: "/"
		 *     name: "gpM4Y2_1457183205532_aSes_1.pdf" (MANDATORY)
		 *     owner: "arvind@authorgen.com"
		 *     size: 379345
		 *     tags: Array[1]
		 *     type: "application/pdf" (MANDATORY)
		 *     url: "https://boxcontent.s3.amazonaws.com/bad5990bee174609a36993f621e9d7ff" (MANDATORY)
		 *     thumbnail : ...
		 */

		$lib_main.find('.content-lib-items ul').prepend(library_item);
	}

	function init_handlers () {
		$('#widget-tabs').on('click', 'div.content-item-thumbnail', show_preview);
	}

	function show_preview (ev) {
		if (!_allowed ('write','control'))
			return;

		/* Get the parent tab */
		var $lib_main     = $(ev.currentTarget).closest('.content-lib-main');
		var uuid          = $(ev.currentTarget).closest('.content-lib-outer').attr('data-uuid');
		var tab_anchor_id = $lib_main.attr('data-tab-anchor-id');
		var tab           = $lib_main.closest('#' + tab_anchor_id)[0];

		/* Get the content url */
		var url = $(ev.currentTarget).find('a.content-preview-trigger').attr('data-content-url');

		if (!content_list[url]) {
			log.error ('no file details found against this url: ', url);
			return false;
		}

		player.start (map[uuid].handle, content_list[url], { 
			mode      : 'preview'
	   	});
	}

	function handle_new_content (ev, data) {
		switch (ev) {

			case 'content-added' : 
				var handle = data.handle;
				var file_info = data.data;

				/* add to all open libraries */
				for (var uuid in map) {
					var $lib_main = map[uuid].$lib_main;

					add_to_lib ($lib_main, file_info);
					content_list[file_info.url] = file_info;
				}

				player.start (handle, file_info, { 
					//show_library_icon : true,
					mode              : 'preview'
				});
				break;

			default :
				log.error ('unknown event "' + ev + '". possibly a bug in the code. ignoring.');
		}
	}

	function add_scrollbar ($lib_main) {
		var $lib_contents = $lib_main.find('.content-lib-items');

		$lib_contents.perfectScrollbar ();
		$lib_contents.resize (function (ev) {
			$lib_contents.perfectScrollbar ('update');
		});
	}

	return library;

});
