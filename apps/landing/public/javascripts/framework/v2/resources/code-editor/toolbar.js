define(function(require) {
	var log        = require('log')('editor-toolbar', 'info');
	var alert_msg  = require('./alert-msg');
	var editor_map = {};
	var toolbar    = {};
	var f_handle_cached;
	var workspace;
	var _allowed;

	toolbar.init = function (f_handle, ws) {
		f_handle_cached = f_handle;
		_allowed = f_handle_cached.perms.has_perm;
		workspace = ws;
	};

	toolbar.store_info = function (uuid, doc, editor, ace, scroll) {
		editor_map[uuid] = {
			doc    : doc,
			editor : editor,
			ace    : ace,
			scroll : scroll || {}
		};

		/*
		 * Disable Undo-Redo when no write permission
		 */
		if (_allowed ('write','control')) {
			editor_map[uuid].editor.off("input", undo_redo_state);
			editor_map[uuid].editor.on("input", undo_redo_state);
		}
		log.log({ editor : uuid }, 'added to editor map');
	};

	toolbar.set_handlers = function (uuid, handle) {
		var anchor = handle;
		$.event.props.push( "dataTransfer" );
		$(anchor).find('li.editor-icon').on('click', 'a.editor-theme', handler.theme);
		$(anchor).find('li.editor-icon').on('click', 'a.editor-font-size', handler.size);
		$(anchor).find('.shared-code-editor').append('<h1> Loading... </h1>');
		$(anchor).find('a.file-save').on('click', handler.f_save);
		$(anchor).find('.shared-code-editor').on('dragover', handler.drag);
		$(anchor).find('.shared-code-editor').on('drop', handler.drop);
		$(anchor).find('li.editor-icon').on('hidden.bs.dropdown', handler.close_dd);
		$(anchor).find('li.editor-icon').on('shown.bs.dropdown', handler.open_dd);
		
		$(anchor).find('li.editor-icon').on('click', 'a.editor-mode', handler.mode);
		/*
		 * Enable file upload, Undo-Redo when has write permission
		 */
		$(anchor).find('a.undo').on('click', handler.un_redo);
		$(anchor).find('a.redo').on('click', handler.un_redo);
		$(anchor).find('a.file-open').on('click', handler.f_open);
		$(anchor).find('input.file-open').on('change', handler.f_select);
		$(anchor).find('input.file-open').attr('accept', '.js, .html, .css');

		var val = _allowed ('write', 'control');
		toolbar.set_enabled (uuid, val);
	};

	toolbar.set_enabled = function (uuid, val) {
		var tab = f_handle_cached.tabs.get_by_uuid (uuid) || {};
		var handle = tab.handle || {};
		var anchor = handle.anchor;

		var $anc = $(anchor).find (".code-editor-outer[data-uuid='" + uuid + "']");

		if (val) {
			$anc.find('a.editor-mode').closest('li.editor-icon').removeClass("disabled");
			$anc.find('a.editor-mode').closest('li.editor-icon').find('a.dropdown-toggle').attr('data-toggle', 'dropdown');
			$anc.find('a.file-open').closest('li.editor-icon').removeClass('disabled');

			if (editor_map[uuid]) {
				editor_map[uuid].editor.off("input", undo_redo_state);
				editor_map[uuid].editor.on("input", undo_redo_state);
			}
		}
		else {
			$anc.find('a.editor-mode').closest('li.editor-icon').addClass("disabled");
			$anc.find('a.editor-mode').closest('li.editor-icon').find('a.dropdown-toggle').attr('data-toggle', '');
			$anc.find('a.file-open').closest('li.editor-icon').addClass('disabled');

			if (editor_map[uuid]) {
				editor_map[uuid].editor.off("input", undo_redo_state);
			}
		}
	};

	toolbar.destroy = function ($tab_anchor, uuid, is_command) {
		var $editor_outer = $tab_anchor.find('.code-editor-outer');
		log.log({ editor : uuid, broadcast : is_command }, 'destroy editor');

		if (!$editor_outer || !$editor_outer.length)
			return;

		var tab_id = $editor_outer.attr('data-uuid');

		if (!tab_id)
			log.error ('destroy () : unable to find UUID for', $tab_anchor);

		if (tab_id !== uuid)
			log.error ({ uuid : uuid, tab_id : tab_id }, "trying to destroy wrong tab");

		$tab_anchor.find('.code-editor-outer').empty();
		$tab_anchor.find('.code-editor-outer').remove();
		
		/*
		 * is_command = false means user action
		 * is_command = true means remote action
		 */
		if (is_command)
			return;

		/*
		 * inform framework  
		 */
		f_handle_cached.send_info ('*', 'editor-destroyed', { uuid : uuid }, 0);
	};

	toolbar.now_showing = function (options) {
		var uuid = options.uuid;
		var map_entry  = editor_map[uuid];
		if (!map_entry) {
			return;
		}
		map_entry.editor.resize();
		map_entry.editor.focus();
		/*
		 * Wait for editor content to be loaded
		 * Otherwise scrollWidth and scrollHeight comes out to be zero.
		 */
		setTimeout(
				workspace.set_scroll.bind(null, { uuid : uuid, scroll : map_entry.scroll }),
		250);
	};

	toolbar.get_editor = function (uuid) {
		return editor_map[uuid];
	};

	toolbar.update_mode = function (msg) {
		var uuid  = msg.uuid;
		var mode  = msg.mode;
		var _val  = editor_map[uuid];
		_val.uuid = uuid;
		_val.mode = mode;
		workspace.update_session(_val);
	};

	toolbar.update_size = function (msg) {
		var uuid   = msg.uuid;
		var size   = msg.size;
		var _val   = editor_map[uuid];
		var editor = _val.editor;
		delete msg.broadcast;
		set_size(editor, msg);
	};

	toolbar.update_title = function (msg) {
		log.info (msg, 'update_title');
		f_handle_cached.tabs.set_title(msg);
		f_handle_cached.tabs.set_tooltip(msg);
	};

	toolbar.update_scroll_info = function (msg) {
		var uuid = msg.uuid;
		if (typeof msg.scroll.Left === "number") {
			editor_map[uuid].scroll.Left = msg.scroll.Left;
		}
		if (typeof msg.scroll.Top === "number") {
			editor_map[uuid].scroll.Top = msg.scroll.Top;
		}
	};

	/*
	 * Get Specific instance of Editor
	 */
	function get_map_entry (ev) {
		var editor_main = $(ev.currentTarget).closest('.code-editor-outer');
		var uuid = editor_main.attr('data-uuid');
		var editor = editor_map[uuid];
		editor.uuid = uuid;
		return editor;
	}
	/*
	 * Event handlers
	 */
	var handler = {
		mode     : mode_change,
		theme    : theme_change,
		size     : size_change,
		un_redo  : un_redo,
		f_select : f_select,
		f_open   : f_open,
		f_save   : f_save,
		drag     : drag_over,
		drop     : drop,
		close_dd : close_dropdown,
		open_dd  : open_dropdown
	};

	function theme_change (ev) {
		var _val = get_map_entry(ev);
		var type = $(ev.currentTarget).attr("value"); 
		log.info({ type : type }, 'selected theme');
		require (['./ace/theme-'+ type], function () {
			var editor = _val.editor; 
			var data = {
				uuid  : _val.uuid,
				theme : type 
			};
			editor.setTheme("ace/theme/"+ type);
			/*
			 * Store current theme at session cluster
			 */
			f_handle_cached.send_info ('*', 'theme-change', data, 0);
			editor.focus();
		});
	}

	function mode_change (ev) {
		if (!_allowed ('write','control'))
			return ;

		var _val = get_map_entry(ev);
		var mode = $(ev.currentTarget).attr("value");
		var data = {
			uuid : _val.uuid,
			mode : mode 
		};
		_val.mode = mode;
		workspace.update_session(_val);
		f_handle_cached.send_info ('*', 'mode-change', data, 0);
		_val.editor.focus();
	}

	function set_size (editor, info) {
		var size = info.size;
		log.info("changed font size to ::"+ size);
		editor.setFontSize(Number(size));

		/*
		 * Store size info at session cluster
		 */
		f_handle_cached.send_info ('*', 'size-change', info, 0);
	}

	function size_change (ev) {
		var map_entry = get_map_entry(ev); 
		var editor = map_entry.editor;
		var uuid = map_entry.uuid;
		var size = ev.currentTarget.text;
		var s_data = {
			uuid : uuid,
			size : size
		};

		if (_allowed ('write','control')) {
			s_data.broadcast = true;
		}

		set_size(editor, s_data);

		editor.focus();

		/*
		 * Check permission to write
		 */
		if (!_allowed ('write','control')) {
			return;
		}

		/*
		 * Update the scroll at other users end
		 * Both horizontal and vertical scroll
		 */
		/*var scroll = editor.renderer.getFirstVisibleRow();
		var data = {
			uuid   : map_entry.uuid,
			type   : "Top",
			scroll : scroll
		};
		f_handle_cached.send_info ('*', 'scroll-info', data, 0);
		scroll = editor.session.getScrollLeft();
		data = {
			uuid   : map_entry.uuid,
			type   : "Left",
			scroll : scroll
		};
		f_handle_cached.send_info ('*', 'scroll-info', data, 0);*/
	}

	function un_redo (ev) {
		if (!_allowed ('write','control'))
			return ;

		var editor = get_map_entry(ev).editor;
		var op = ev.currentTarget.innerText;
		var um = editor.getSession().getUndoManager();
		switch (op) {
			case "Undo" :
				if (um.$undoStack.length === 0) {
					return;
				}
				um.undo();
				break;
			case "Redo" :
				if (um.$redoStack.length === 0) {
					return;
				}
				um.redo();
				break;
		}
		editor.centerSelection();
		editor.focus();
	}

	function undo_redo_state (ev, editor) {
		log.log('change state undo-redo');
		var um = editor.getSession().getUndoManager();
		var ace_main = editor.container;
		var editor_main = $(ace_main).closest('.code-editor-outer');
		var $undo = editor_main.find('a.undo').closest('li.editor-icon');
		var $redo = editor_main.find('a.redo').closest('li.editor-icon');
		um.hasUndo() ? $undo.removeClass('disabled') : $undo.addClass('disabled');
		um.hasRedo() ? $redo.removeClass('disabled') : $redo.addClass('disabled');
	}

	function f_save (ev) {
		var _val   = get_map_entry(ev);
		var editor = _val.editor;
		var uuid   = _val.uuid;
		var code   = editor.getSession().getValue();
		var mode   = editor.session.$modeId;
		var title  = f_handle_cached.tabs.get_title({ uuid : uuid });
		var type, name = "work";

		if (title) {
			name = get_name(title);
		}
		mode = get_type(mode);

		switch (mode) {
			case "javascript":
				type = 'js'; 
				break;
			default:
				type = mode;
		}

		require(['./FileSaver'], function () {
			var blob = new Blob([code], { type:"text/plain;charset=utf-8" });
			log.info("Filetype to save as ::"+ type);
			saveAs(blob, name + "." + type);
			editor.focus();
		});
	}

	function get_name (title) {
		var name = title;

		try {
			name = title.split(".");

			if (name.length > 1) {
				name.pop();
				name = name.join(".");
			}
			return name;
		}
		catch (err) {
			log.error(err, 'get_name');
		}

		return name;
	}

	function get_file_type (name) {
		try {
			name = name.split(".");
			name = name.pop();
			return name;
		}
		catch (err) {
			log.error(err, 'get_file_type');
		}
	}

	function get_type (mode) {
		try {
			mode = mode.split("/");
			mode = mode[mode.length - 1];
		}
		catch (err) {
			log.error(err, 'get_type');
		}

		return mode;
	}

	function f_open (ev) {
		if (!_allowed ('write','control'))
			return false;

		var _val   = get_map_entry(ev);
		var editor = _val.editor;
		var code   = editor.session.getValue();

		/*
		 * Show alert   */
		if (code !== "") {
			var msg = alert_msg.upload;
			var opt = show_confirm_alert(msg);
			if (!opt) {
				editor.focus();
				return;
			}
		}

		$(ev.currentTarget).next().click();
	}

	function show_confirm_alert (text) {
		return window.confirm(text);
	}

	/*
	 * Update title, scroll and mode
	 */
	function f_select (ev) {
		if (!_allowed ('write','control'))
			return false;

		var _val   = get_map_entry(ev);
		var file   = ev.target.files[0];
		var reader = new FileReader();
		if (!file) {
			editor.focus();
			return;
		}

		reader.onload = function (f) {
			load_file(f, _val, file);
		};
		reader.readAsText(file);
	}

	function load_file (f, info, file) {
		var uuid   = info.uuid;
		var editor = info.editor;
		var f_name = file.name;
		var f_size = file.size/1024; /* in KB */
		var code = f.target.result;

		if (f_size > 50) {
			alert(alert_msg.file_size);
			editor.focus();
			return;
		}
		var data = {
			uuid      : uuid,
			broadcast : true,
			scroll    : {
				"Top"  : 0,
				"Left" : 0
			}
		};
		set_tab_title(uuid, f_name);

		info.mode = get_file_type(f_name);
		workspace.update_session(info);
		f_handle_cached.send_info ('*', 'mode-change', { uuid : info.uuid, mode : info.mode }, 0);

		editor.getSession().setValue(code);

		workspace.set_scroll(data);
		f_handle_cached.send_info ('*', 'scroll-info', data, 0);

		editor.focus();
	}

	/*
	 * Set the title of tab
	 * Also update other users tab title
	 */
	function set_tab_title (uuid, f_name) {
		var info = {
			uuid   : uuid,
			title  : f_name
		};
		toolbar.update_title(info);

		f_handle_cached.send_info ('*', 'title-change', info, 0);
	}

	function drag_over (evt) {
		if (!_allowed ('write','control'))
			return false;

		evt.stopPropagation();
		evt.preventDefault ();
		evt.dataTransfer.dropEffect = "copy";
	}	

	function drop (evt) {
		if (!_allowed ('write','control'))
			return false;

		var _val = get_map_entry(evt);
		var editor = _val.editor;
		var code   = editor.session.getValue();
		evt.stopPropagation();
		evt.preventDefault ();

		/*
		 *  To handle non file drag drop  */
		if (evt.dataTransfer.files.length === 0)
			return;

		/*
		 * Show alert   */
		if (code !== "") {
			var msg = alert_msg.upload;
			var opt = show_confirm_alert(msg);
			if (!opt) {
				editor.focus();
				return;
			}
		}
		var file = evt.dataTransfer.files[0];
		var reader = new FileReader();
		reader.onload = function (f) {
			load_file(f, _val, file);
		};
		reader.readAsText(file);
	}

	function open_dropdown (ev) {
		var anchor = $(ev.currentTarget);
		anchor.addClass('enabled');
	}

	function close_dropdown (ev) {
		var anchor = $(ev.currentTarget);
		anchor.removeClass('enabled');
	}

	return toolbar;
});
