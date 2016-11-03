define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var modernizer  = require('modernizer');
	var log         = require('log')('tabs-v1', 'info');
	var events      = require('events');
	var framework   = require('framework');
	var bootstrap   = require('bootstrap');

	var tabs = {};
	var f_handle = framework.handle ('tabs-v1');
	var _allowed = f_handle.perms.has_perm;
	var anchor, dropdown_menu, ul_top, content_top;
	var li_template, tabpanel_template;
	var apps = {};

	tabs.init = function (display_spec, custom, perms) {
		var _d = $.Deferred();

		anchor = display_spec.anchor;
		var template = f_handle.template("tabs");
		li_template = f_handle.template("tabs-li");
		tabpanel_template = f_handle.template("tabs-tabpanel");

		if (!template || !li_template || !tabpanel_template) {
			_d.reject ('tabs-v1: one or more templates not found');
			return _d.promise ();
		}

		$(anchor).append (template ());
		dropdown_menu = $(anchor).find('ul.dropdown-menu');
		ul_top        = $(anchor).find('ul.nav.nav-tabs');
		content_top   = $(anchor).find('div.tab-content');

		init_handlers ();

		events.bind ('framework:perms', handle_perm_evt, 'tabs');
		_d.resolve();
		return _d.promise();
	};

	/*
	 * Any resource, acting as a 'tab-contrller', must provide this
	 * method to the framework, so that other users of the tabs
	 * can register themselves to this resource. */
	tabs.register = function (mod_name, methods, options) {

		apps[mod_name] = {
			methods : methods
		};

		/* Add the module in the dropdown menu only if options says so */
		if (options.add_to_dropdown) {
			log.info(' added to dropdown');
			add_to_dropdown_menu (mod_name, options);
		}

		/*
		 * For now hiding the dropdown menu if empty
		 */
		if (($(dropdown_menu).find('li')).length === 0 ) {
			log.info('dropdown empty');
			disable_dropdown();
		}

		return null;
	};

	tabs.start = function (sess_info) {
	};

	var id_seed = 0;
	tabs.create = function (module_name, options) {
		var id = module_name + id_seed;
		var display_name = (options.display_name ? options.display_name : module_name + '(' + id_seed + ')');

		id_seed++;

		/*
		 * Create the li element and if this is supposed to be an active tab, 
		 * remove the active class from the existing ones */
		if (options.active) {
			ul_top.find('li.active').removeClass('active');
			content_top.find('div.active').removeClass('active');
		}

		/*
		 * managed in set_enabled */
		options.disable_close = false;

		ul_top.append (li_template({
			id : id,
			display_name : display_name,
			uuid : options.uuid,
			owner : options.owner,
			disable_close : options.disable_close,
			module_name : module_name,
			active : options.active
		}));

		/*
		 * Create the tab element */
		content_top.append (tabpanel_template({
			id : id,
			uuid : options.uuid,
			active : options.active
		}));

		var res = {
			anchor    : content_top.find('div.tab-pane#' + id)[0],
			id        : id,
			uuid      : options.uuid,
			owner     : options.owner
		};

		ul_top.find('li a#' + id).tab('show');

		if (!_allowed ('write','control'))
			ul_top.find ('li[role=presentation] .tab-name a.tab-name').addClass ('disabled');

		return res;
	};

	tabs.destroy = function (info,command) {
		/*
		 * it can be a command from framework
		 * or a user action */
		var uuid = info.uuid;

		destroy_tab (info,command);
	};

	tabs.set_enabled = function (val) {
		var method;
		method = val ? 'removeClass' : 'addClass';

		/*
		 * enable/disable 'new menu' */
		ul_top.find ('li.add .tab-dropdown a.dropdown-toggle') [method] ('disabled');

		/*
		 * manage styling */
		ul_top.find ('li[role=presentation]') [method] ('disabled');

		/*
		 * allow/block tab change */
		ul_top.find ('li[role=presentation] .tab-name a.tab-name') [method] ('disabled');
	};

	tabs.sync_remote = function (options) {
		var uuid = options.uuid;

		var li = ul_top.find('li[data-tab-uuid=' + uuid + ']');
		li.addClass('tab-is-shared');
	};

	tabs.set_tooltip = function (res, options) {
		if (!options.html)
			return false;

		var uuid = res.handle.uuid;
		var li   = ul_top.find ('li[data-tab-uuid="' + uuid + '"]');
		var div  = li.find ('div.tooltip-content');

		div.append (options.html);
		div.addClass ('active');
	};

	tabs.is_active = function (res) {

		var uuid = res.handle.uuid;
		var li   = ul_top.find ('li[data-tab-uuid="' + uuid + '"]');

		if (li.hasClass('active'))
			return true;

		return false;
	};

	tabs.set_title = function (res, title) {

		var uuid = res.handle.uuid;

		if (title) {
			ul_top.find ('li[data-tab-uuid="' + uuid + '"] a[role="tab"]').html(title);
			ul_top.find ('li[data-tab-uuid="' + uuid + '"]').attr('title', title);
		}

		return;
	};

	tabs.get_title = function (res) {

		var uuid  = res.handle.uuid;
		var title = ul_top.find ('li[data-tab-uuid="' + uuid + '"] a[role="tab"]').html();

		return title;
	};

	tabs.show = function (options, is_command) {
		var uuid = options.uuid;
		var $tab = $('li[data-tab-uuid="' + uuid + '"]');

		if ($tab.hasClass('active'))
			return;

		if (!$tab || !$tab.length) {
			var $li = ul_top.find('li.add');
			$li.find('a[data-toggle="tab"]').trigger('click');
			return;
		}
		$('li[data-tab-uuid="' + uuid + '"] a').data('iscommand', is_command);
		$('li[data-tab-uuid="' + uuid + '"] a').tab('show');

		/*
		 * and do the stuff we were doing at the listeners 
		 * --- we shouldn't need this here as this should get called
		 *  in the "shown" event 
		var is_command = true;
		f_handle.tabs.now_showing ({ uuid : uuid }, is_command);
	    */
	};

	function init_handlers () {

		/*
		 * Menu for new tab handler */
		dropdown_menu.on('click', 'a.tab-menu', function (ev) {
			var target = $(ev.currentTarget).attr('href');
			var mod_name = target.replace(/^#tab-menu-/g, '');

			if (apps[mod_name] && apps[mod_name].methods)
				apps[mod_name].methods.create();

			ev.preventDefault();
		});

		/*
		 * Tab close handler */
		ul_top.on('click', 'a.tab-close', function (ev) {
			var li = $(ev.currentTarget).closest ('li');
			var uuid = li.attr('data-tab-uuid');

			/*
			 * you can somehow see
			 * the close icon doesn't
			 * mean you can close the tab */
			var tab = f_handle.tabs.get_by_uuid (uuid) || {};
			if (_allowed ('write', 'control', tab.owner))
				destroy_tab ({ uuid: uuid });

			return true;
		});

		/*
		 * Handle tab shown */
		ul_top.on('shown.bs.tab', 'a[data-toggle="tab"]', function (ev) {
			var uuid = $(ev.target).closest('li').attr('data-tab-uuid');
			var iscommand = $(ev.target).data('iscommand');
			/*
			 * Inform the framework */
			f_handle.tabs.now_showing ({ uuid : uuid }, iscommand);
			$(ev.target).data('iscommand', false);
		});

		/*
		 * Handle tab hiding */
		ul_top.on('hidden.bs.tab', 'a[data-toggle="tab"]', function (ev) {
			var uuid = $(ev.target).closest('li').attr('data-tab-uuid');
			/*
			 * Inform the framework */
			f_handle.tabs.now_hidden ({ uuid : uuid });
		});

		/*
		 * Handle disabled tabs */
		ul_top.on ('click', '.tab-name a.tab-name', function (ev) {
			if ($(this).hasClass ('disabled'))
				return false;
		});

		/*
		 * Handle disabled dropdown */
		ul_top.on ('click', '.tab-dropdown a.dropdown-toggle', function (ev) {
			if ($(this).hasClass ('disabled'))
				return false;
		});
	}

	function destroy_tab (info,is_command) {
		var uuid = info.uuid;
		var li   = ul_top.find('li[data-tab-uuid=' + uuid + ']');

		var mod_name = li.attr('data-mod-name');
		var tab_id   = li.find('a.tab-name').attr('aria-controls');

		var $anchor = content_top.find('div#' + tab_id + '.tab-pane');

		if( !is_command ) {
			var session_wide_active_tab = f_handle.tabs.get_active ();
			info.uuid_next = (session_wide_active_tab == uuid) ? get_active_next (li) : session_wide_active_tab;
		}

		tabs.show ({uuid: info.uuid_next}, is_command);

		li.remove();

		/*
		 * For some reason, this only works if a sufficient timeout if 
		 * provided. It doesn't seem to work on smaller timeouts as well.
		 * I am not sure what the reason is, at this time. */
		setTimeout (function () {

			/*
			 * Call module specific destroy */
			if (apps[mod_name] && apps[mod_name].methods)
				apps[mod_name].methods.destroy ($anchor, uuid, is_command);

			$anchor.empty();
			$anchor.remove();
		}, 1000);

		/*
		 * Inform the framework */
		f_handle.tabs.destroyed (info, is_command);

		return;
	}

	function get_active_next (li) {
		/*
		 * find a shared tab */

		var next = li.next();
		/*
		 * towards right */
		while (next.length && !next.hasClass('tab-is-shared'))
			next = next.next();

		if (!next || !next.length)
			next = li.prev ();
		
		/*
		 * towards left? */
		while (!next.hasClass('tab-is-shared') && !next.hasClass('add'))
			next = next.prev();

		if(next.hasClass('add')) {
			/*
			 * No shared tab found
			 * show the nearest local tab */
			next = li.next();

			if(!next.length)
				next = li.prev();
		}

		return next.attr('data-tab-uuid');
	}

	function add_to_dropdown_menu (mod_name, options) {
		var name = options.display_name || mod_name;

		$(dropdown_menu).prevAll('a.dropdown-toggle').prop('disabled', false);
		$(dropdown_menu).prevAll('a.dropdown-toggle').removeClass("read-only");

		dropdown_menu.append('<li>' + 
		                        '<a class="tab-menu" href="#tab-menu-' + mod_name + '">' + name + '</a>' +
		                     '</li>');
	}

	function disable_dropdown () {
		$(dropdown_menu).prevAll('a.dropdown-toggle').prop('disabled', true);
		$(dropdown_menu).prevAll('a.dropdown-toggle').addClass("read-only");
	}

	function handle_perm_evt (evt, data) {
		if (evt !== 'override')
			return;

		if (data.key === 'write' && data.subkey === 'control')
			tabs.set_enabled (data.val);

		return;
	}

	return tabs;

});
