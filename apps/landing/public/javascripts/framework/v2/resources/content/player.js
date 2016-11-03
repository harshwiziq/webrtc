define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var log         = require('log')('content-player', 'info');
	var framework   = require('framework');
	var croco       = require('./crocodoc.viewer.min');
	var pointer		= require('./pointer');

	var player = {};
	var f_handle_cached;
	var _allowed;
	var viewer_list = {};
	/*
	 * Use a hardcoded URI for now */
	var default_content_uri = "https://boxcontent.s3.amazonaws.com/9a99bc2a1dde42698e1e6bab105193ab";

	player.init = function (display_spec, custom, perms, f_handle) {
		f_handle_cached = f_handle;
		_allowed = f_handle.perms.has_perm;
		init_handlers ();

		Crocodoc.addPlugin('resizeChromeFix', function (scope) {

			/*
			 * NOTE : this code is a fix for an anamolous behavior in Chrome
			 * which causes the pages to appear very tiny. This got introduced 
			 * in the Chrome version 51.0.2704.84 (64-bit). Hopefully, this 
			 * would eventually be fixed by Chrome people, but till then here's
			 * a worka around. We should take this out once it is fixed in 
			 * Chrome */

		    var viewerConfig = scope.getConfig(),
		        layout;

		    return {
				init : function (config) {
					var api = scope.getConfig().api;

					api.resizeForChrome = function () {
						var layout = viewerConfig.currentLayout;
						layout.handleResize ({
							clientWidth: layout.$viewport[0].clientWidth,
							clientHeight: layout.$viewport[0].clientHeight,
							offsetWidth: layout.$viewport[0].offsetWidth,
							offsetHeight: layout.$viewport[0].offsetHeight,
						});
						return;
					};
				}
			};
		});

		Crocodoc.addPlugin('scrolltooffset', function (scope) {
		    var viewerConfig = scope.getConfig(),
		        layout;

		    return {
				init : function (config) {
					var api = scope.getConfig().api;

					api.getZoom = function () {
						var layout = viewerConfig.currentLayout;
						var zoom = layout.state.zoomState.zoom;
						return zoom;
					};

					api.getGeometry = function () {
						var layout = viewerConfig.currentLayout;

						if (!layout.calculateCurrentPage) {
							/*
							 * This document has no page information - like a plain text or javascript file 
							 * etc ... bad HACK! */
							return {
								page_width     : layout.$viewport.find('table.crocodoc-text').width(),
								viewport_width : layout.$viewport.find('table.crocodoc-text').width()
							};
						}

						var page_num = layout.calculateCurrentPage ();
						return {
							page_width     : layout.state.pages[page_num - 1].width,
							viewport_width : layout.state.viewportDimensions.clientWidth
						};
					};

					api.scrollToOffset = function (left, top, remote_zoom) {
						var layout = viewerConfig.currentLayout;
						var local_zoom = layout.state.zoomState.zoom;
						log.info ('scrollToOffset: ', left, top, remote_zoom, local_zoom);
						layout.scrollToOffset (left * local_zoom / remote_zoom, top * local_zoom / remote_zoom);
					};
				}
			};
		});

		return true;
	};

	player.start = function (handle, doc_info, options) {
		var $anchor = $(handle.anchor);
		var viewer;
		var anchor_id = $anchor.attr('id');
		var _d = $.Deferred ();

		tab_set_mode($anchor, 'loading');
		player.destroy ($anchor);
		$anchor.find('.content-player-outer').remove();

		/*
		 * keep it a no, this is handled in player.set_enabled */
		options.shared = 'no';

		/*
		 * Load the player template */
		var template = f_handle_cached.template('player');
		$anchor.append(template({ 
			uuid              : handle.uuid,
			content_uri       : doc_info.url,
			shared            : options.shared
		}));

		f_handle_cached.tabs.set_title ({
			uuid  : handle.uuid,
			title : doc_info.name
		});

		var content_area = $anchor.find('.content-area');

		viewer = Crocodoc.createViewer (content_area, { 
			url: doc_info.url,
			enableDragging : false,
			plugins : {
				resizeChromeFix : {
				},
				scrolltooffset : {
				},
			}
		});

		viewer.load();
		viewer_list[handle.uuid] = {
			viewer_handle : viewer,
			doc_info      : doc_info,
			active        : f_handle_cached.tabs.is_active (handle.uuid)
		};

		viewer.on('asseterror', function (ev) {
			log.error ('content asseterror  = ', ev);
			_d.reject (ev);
		});

		viewer.on('fail', function (ev) {
			log.error ('content failed to load  = ', ev);
			_d.reject (ev);
		});

		viewer.on('ready', function (ev) {
			log.info ('viewer ready : data = ', ev.data);

			try {
				/*
				 * This will sometimes throw an exception. Catch it and move on */
				viewer.setLayout(Crocodoc.LAYOUT_VERTICAL_SINGLE_COLUMN);
			}
			catch (e) {
			}

			var mode = options.mode ? options.mode : 'fullview';
			tab_set_mode($anchor, mode);

			viewer.resizeForChrome ();

			/* Set page/scroll position */
			if (options.scroll_info)
				scroll_to_position (viewer, options.scroll_info, handle.uuid, $anchor);

			/* Disable scrolling if specified  ..handled in player.set_enabled
			if (options.disable_scrolling)
				$anchor.find('.crocodoc-viewport').css('overflow', 'hidden'); */

			var val = f_handle_cached.perms.has_perm ('write','control');
			player.set_enabled (val, handle.uuid);

			current_page = ev.data.page;
			var data = {
				current_page 	: current_page,
				total_pages	    : ev.data.numPages,
				viewer          : viewer
			};

			_d.resolve (data);
		});

		viewer.on('resize', function (ev) {
			log.info ('resize ', ev);
		});

		viewer.on('pagefocus', function (ev) {
			handle_page_focus ($anchor, ev);
		});

		viewer.on('scrollstart', function (ev) {
			log.info ('scrollstart : left = ' + ev.data.scrollLeft + ', top = ' + ev.data.scrollTop);
		});

		viewer.on('scrollend', function (ev) {
			log.info ('scrollend : left = ' + ev.data.scrollLeft + ', top = ' + ev.data.scrollTop);
			handle_continuous_scroll.call ($anchor, $anchor.find('.content-player-outer'), viewer, ev);
		});

		return _d.promise ();
	};

	player.now_showing = function (options) {
		var uuid = options.uuid;

		if (!uuid)
			return log.error ('now_showing : no uuid in options', options);

		/* If there is no player instance in this tab, then bail out */
		if (!viewer_list[uuid])
			return;

		log.info ('now_showing : ', options, viewer_list);

		/* If there are pending scrolls for this player, do them now */
		var _v = viewer_list[uuid];
		if (_v.pending_navigation) {
			log.info ('finishing pending navigation for ' + uuid, _v.pending_navigation);
			_v.viewer_handle.scrollTo (_v.pending_navigation.page);
			delete _v.pending_navigation;
		}

		if (_v.pending_scroll_to) {
			log.info ('finishing pending scroll_to for ' + uuid, _v.pending_scroll_to);
			_v.viewer_handle.scrollToOffset (_v.pending_scroll_to.scroll_to.scrollLeft, _v.pending_scroll_to.scroll_to.scrollTop, _v.pending_scroll_to.zoom);
			delete _v.pending_scroll_to;
		}
	};

	player.now_hidden = function (options) {
		log.info ('now_hidden : ', options, viewer_list);
	};

	player.destroy = function ($tab_anchor, uuid, is_command) {
		var $player = $tab_anchor.find('.content-player-outer');

		if ($player.length === 0)
			return;

		destroy_viewer (uuid, $tab_anchor, false);

		if (is_command)
			return;

		/*
		 * It must be a user action 
		 * decide wether to tell the framework */
		var tab = f_handle_cached.tabs.get_by_uuid (uuid) || {};
		var me  = f_handle_cached.identity;
		var is_shared = $('li[data-tab-uuid=' + uuid + ']').hasClass('tab-is-shared');

		if (tab.owner === me.id && !is_shared)
			return;

		/*
		 * inform framework in all other cases */
		f_handle_cached.send_info ('*', 'content-destroyed', { uuid : uuid }, 0);
	};

	player.navigate = function (uuid, anchor, info) {
		var viewer = get_viewer (uuid);

		if (f_handle_cached.tabs.is_active (uuid)) {
			log.info ('navigate to : ' + info.page, info);
			viewer.scrollTo (info.page);
			return;
		}

		/* Else the tab is hidden right now. Store the navigation information
		 * for now, and this will be applied when the tab comes in view again */

		log.info ('pennding navigation for ' + uuid);
		viewer_list[uuid].pending_navigation = info;
	};

	var sync_lock = false;
	player.scroll_to = function (uuid, anchor, info) {
		sync_lock = true;
		var viewer = get_viewer (uuid);

		if (f_handle_cached.tabs.is_active (uuid)) {
			log.info ('scroll to : left = ' + info.scroll_to.scrollLeft + ', top = ' + info.scroll_to.scrollTop);
			viewer.scrollToOffset (info.scroll_to.scrollLeft, info.scroll_to.scrollTop, info.zoom);
		}

		/* Else the tab is hidden right now. Store the navigation information
		 * for now, and this will be applied when the tab comes in view again */

		log.info ('pennding scroll_to for ' + uuid);
		viewer_list[uuid].pending_scroll_to = info;
	};

	player.set_enabled = function (val, uuid, options) {
		if (!uuid)
			return ;

		var tab = f_handle_cached.tabs.get_by_uuid (uuid) || {};
		var handle = tab.handle;
		var anchor = handle && handle.anchor;
		var $anchor = $(anchor);

		if (!val) {
			/*
			 * If preview was open, it will remain as is */
		}

		$anchor.find('.crocodoc-viewport')
		.css('overflow', val ? 'scroll' : 'hidden');

		$anchor.find('.content-menu').css ('display', val ? "" : "none");

		if (tab.owner !== f_handle_cached.identity.vc_id) {
			$anchor.find('li.content-library').css ('display', "none");
		}
	};

	function get_viewer (uuid) {

		if (!viewer_list[uuid])
			/* This may be possible if the viewer just got deleted */
			return;

		var viewer = viewer_list[uuid].viewer_handle;

		if (!viewer) {
			log.error ('no viewer found for "' + uuid + '"');
			return null;
		}

		return viewer;
	}

	function init_handlers () {

		/*
		 * Handler for page navigation
		 */
		$('#widget-tabs').on('click', '.content-player-outer .content-menu ul li.content-page-nav', function (ev) {
			handle_page_navigation (ev);
		});

		/*
		 * Handlers for layout change
		 */
		$('#widget-tabs').on('click', '.content-player-outer .content-menu ul li.content-layout-toggle', function (ev) {
			handle_layout_change (ev);
		});

		/*
		 * Handlers for share
		 */
		$('#widget-tabs').on('click', '.content-player-outer .content-preview-menu ul li.content-share', function (ev) {
			handle_share (ev);
		});

		/*
		 * Handlers for preview moode
		 */
		$('#widget-tabs').on('click', '.content-player-outer .content-preview-menu ul li.content-preview-close', function (ev) {
			handle_preview_close (ev);
		});

		/*
		 * Handler to show library in the fullview
		 */
		$('#widget-tabs').on('click', '.content-player-outer .content-menu ul li.content-library', function (ev) {
			handle_show_library (ev);
		});
	}

	/*
	 * ----------------------------
	 * Page Navigation Handling
	 * ----------------------------
	 */
	function handle_page_navigation (ev) {
		var curr = $(ev.currentTarget);
		var uuid = curr.closest('.content-player-outer').attr('data-uuid');
		var viewer = get_viewer (uuid);

		if (!viewer)
			return;

		var dir = curr.attr('data-nav-direction');
		dir = (dir === 'next' ? Crocodoc.SCROLL_NEXT : Crocodoc.SCROLL_PREVIOUS);
		viewer.scrollTo (dir);

		/*
		 * This will eventually trigger "handle_page_focus" below */
	}

	function handle_page_focus ($tab_anchor, ev) {
		var $content_outer = $tab_anchor.find('.content-player-outer');
		var current_page = ev.data.page;

		//if ($content_outer.attr('data-is-shared') === 'yes') {
		if (_allowed ('write','control')) {
			var uuid = $tab_anchor.attr('data-tab-uuid');

			var msg_data = {
				uuid : uuid,
				page : current_page
			};

			f_handle_cached.send_info ('*', 'navigate-to', msg_data, 0);
		}
	}

	/*
	 * ----------------------------
	 * Continuous scroll
	 * ----------------------------
	 */
	function handle_continuous_scroll ($content_outer, viewer, ev) {
		var $tab_anchor = this;

		//if ($content_outer.attr('data-is-shared') === 'yes') {
		if (_allowed ('write','control') && !sync_lock) {
			var uuid = $tab_anchor.attr('data-tab-uuid');

			var msg_data = {
				uuid : uuid,
				scroll_to : ev.data,
				zoom : viewer.getZoom()
			};

			f_handle_cached.send_info ('*', 'scroll-to', msg_data, 0);
		}
		sync_lock = false;
	}

	/*
	 * ----------------------------
	 * Layout change
	 * ----------------------------
	 */
	var layouts = [
		{ layout : Crocodoc.LAYOUT_VERTICAL_SINGLE_COLUMN, tooltip : 'Vertical, Single Column, Scrollable' },
		{ layout : Crocodoc.LAYOUT_HORIZONTAL,             tooltip : 'Horizontal, Single Row, Scrollable' },
		{ layout : Crocodoc.LAYOUT_PRESENTATION,           tooltip : 'Presentation, One page at a time' },
		{ layout : Crocodoc.LAYOUT_PRESENTATION_TWO_PAGE,  tooltip : 'Presentation, Two pages at a time' }
	];
	var curr_layout_index = 0;

	function handle_layout_change (ev) {
		var curr = $(ev.currentTarget);
		var uuid = curr.closest('.content-player-outer').attr('data-uuid');
		var viewer = get_viewer (uuid);

		if (!viewer)
			return;

		curr_layout_index = (curr_layout_index + 1) % (layouts.length);
		viewer.setLayout (layouts[curr_layout_index].layout);

		/* Change tooltip */
		$(ev.currentTarget).find('span.tooltip-text').html(layouts[curr_layout_index].tooltip);

		/* If this is shared then do remote sync */
	}

	/*
	 * ----------------------------
	 * Preview Close
	 * ----------------------------
	 */
	function handle_preview_close (ev) {
		if (!_allowed ('write','control'))
			return;

		var curr = $(ev.currentTarget);
		var uuid = curr.closest('.content-player-outer').attr('data-uuid');
		var $tab_anchor = curr.closest('.tab-pane');
		var li = $('ul.nav.nav-tabs li[data-tab-uuid=' + uuid + ']');

		destroy_viewer (uuid, $tab_anchor , true);
		
		/*
		 * Check if the tab is shared and if it is
		 * 1) Make the tab unshared
		 * 2) Close the remote tabs on other users
		 * 3) Send info to session cluster that content destroyed so after refresh not show again
		 */
		if (li && li.hasClass('tab-is-shared')) {
			li.removeClass('tab-is-shared');
			f_handle_cached.tabs.destroyed({ uuid : uuid, preview_close : true });
			f_handle_cached.send_info ('*', 'content-destroyed', { uuid : uuid }, 0); 
		}
	}

	/*
	 * ----------------------------
	 * Show library
	 * ----------------------------
	 */
	function handle_show_library (ev) {
		if (!_allowed ('write','control'))
			return;

		var curr = $(ev.currentTarget);
		var $tab_anchor = curr.closest('.tab-pane');

		tab_set_mode ($tab_anchor, 'fullview-with-library');
	}

	/*
	 * ----------------------------
	 * Share
	 * ----------------------------
	 */
	function handle_share (ev) {
		if (!_allowed ('write','control'))
			return;

		var curr           = $(ev.currentTarget);
		var $tab_anchor    = curr.closest('.tab-pane');
		var uuid           = curr.closest('.content-player-outer').attr('data-uuid');
		var $content_outer = curr.closest('.content-player-outer');
		var viewer         = get_viewer (uuid);

		/*
		 * Send a open tab message to all participants */
		var msg_data = {
			uuid         : uuid,
			owner        : f_handle_cached.identity.vc_id,
			doc_info     : viewer_list[uuid].doc_info
		};
		
		/** Register Pointer */
		pointer.register (viewer, uuid, false);

		f_handle_cached.send_info ('*', 'new-content', msg_data, 0);

		/*
		 * Instruct the framework to keep this tab in sync with it's remote counterparts */
		f_handle_cached.tabs.sync_remote ({ uuid : uuid });

		tab_set_mode ($tab_anchor, 'fullview');
	}

	function destroy_viewer (uuid, $tab_anchor, change_mode) {
		var viewer = get_viewer (uuid);

		if (!viewer)
			return;

		try {
			viewer.destroy();
		}
		catch(e) {
			/* just continue - can't do much here */
			log.info ('crocodoc destroy viewer exception ', e);
		}

		$tab_anchor.find('.content-player-outer').empty();
		$tab_anchor.find('.content-player-outer').remove();

		delete viewer_list[uuid];

		if (change_mode)
			tab_set_mode ($tab_anchor, null);
	}

	var modes = { 
		'loading'               : true,
		'preview'               : true,
		'fullview'              : true,
		'fullview-with-library' : true
			/* and an un-named default view */
	};

	function tab_set_mode ($tab_anchor, mode) {
		if (mode)
			$tab_anchor.addClass('content-' + mode);

		/* Remove other classes */
		for (var _mode in modes) {
			if (_mode != mode)
				$tab_anchor.removeClass('content-' + _mode);
		}
	}

	function scroll_to_position (viewer, info, uuid, anchor) {

		try {
			log.info ('scroll info', info);

			switch (info.type) {
				case 'page':
					player.navigate (uuid, anchor, info.data);
					break;

				case 'scroll_to':
					player.scroll_to (uuid, anchor, info.data);
					break;
			}
		}
		catch (e) {
			/* Ignore - some documents result in scroll errors */
			log.info ('unable to scroll [' + url + ']: reason : ', e);
		}
	}

	return player;

});
