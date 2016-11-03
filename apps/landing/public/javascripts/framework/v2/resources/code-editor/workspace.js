define(function(require) {
	var $            = require('jquery');
	var log          = require('log')('editor-workspace', 'info');
	var events       = require('events');
	var emitter      = events.emitter("editor:connection", "editor:share.js");
	var session_type = {};
	var workspace    = {};
	var toolbar;
	var modelist;
	var f_handle_cached;
	var _allowed;
	var conn_handle;

	workspace.init = function (f_handle, tb) {
		f_handle_cached = f_handle;
		_allowed = f_handle_cached.perms.has_perm;
		toolbar = tb;
	};

	workspace.start = function (config, uuid, handle) {
		var anchor = handle; 
		var elem = $(anchor).find('.shared-code-editor').get(0);

		require(['./ace/ace'], function () {

			require(['./share'], function () {

				require(['./ace'], function () {
					
					var ace_cached    = ace;
					var editor_cached = ace_cached.edit(elem);

					if (!conn_handle) {
						conn_handle = Connection;
						send_control(conn_handle);
					}

					init_options(ace_cached, editor_cached, uuid, config)
						.then (init_session, start_error)
						.then (init_config, start_error)
						.then (set_keybinding, start_error)
						.then (
							function (ace_cached, editor_cached, uuid, config) {
								setTimeout(open_editor.bind(null, sharejs, config, uuid, ace_cached, editor_cached), 500);
							}
						);
				});
			});
		});
	};

	/*
	 * Support for multiple languages
	 */
	workspace.update_session = function (info) {
		var uuid   = info.uuid;
		var editor = info.editor;
		var ace    = info.ace;
		var doc    = info.doc;
		var mode_type    = info.mode; 
		var scroll_info  = get_scroll(editor);

		log.info({ uuid : uuid, language : mode_type }, 'updating session');
		filepath = "mode."+mode_type;
		mode_chosen = modelist.getModeForPath(filepath).mode;
		
		if (session_type[uuid][mode_type]) {
			editor.setSession(session_type[uuid][mode_type]);
		}
		else {
			session_type[uuid][mode_type] = ace.createEditSession("", mode_chosen);
			editor.setSession(session_type[uuid][mode_type]);
		}
		doc.detach_ace();
		doc.attach_ace(editor);
		update_scroll(uuid, scroll_info);
	};

	workspace.destroy = function ($tab_anchor, uuid, is_command) {
		var session = session_type[uuid];
		if (!session) {
			return log.error("cannot find session");
		}
		for (var mode in session) {
			session[mode].setUseWorker(false);
		}
		delete session_type[uuid];
	};

	workspace.receive_info = function (msg) {
		log.log(msg, "info received from session cluster");
		if (!msg.doc) {
			log.error("did not receive doc from session cluster");
			return;
		}
		emitter.emit("message", msg);

		//setTimeout(move_to_view.bind(null, msg), 250);
	};

	workspace.set_enabled = function (uuid, val) {
		var entry  = toolbar.get_editor(uuid);
		var editor = entry ? entry.editor : null;

		if (!editor) {
			return ;
		}
		editor.setReadOnly(!val);
		cursor_state(editor, val ? 'show' : 'hide');
	};

	/*
	 * Update the scroll position
	 * Convert the % scroll to scroll value
	 * Compare scroll value with max possible scroll value
	 */
	workspace.set_scroll = function (msg) {
		var uuid   = msg.uuid;
		var scroll = msg.scroll;
		var entry  = toolbar.get_editor(uuid);
		var editor = entry ? entry.editor : null;
		var val;

		try {
			if (typeof scroll.Left === "number") {
				var s_w = editor.renderer.scrollBarH.element.scrollWidth;
				var c_w = editor.renderer.scrollBarH.element.clientWidth;
				val = s_w * scroll.Left;
				if (val > s_w - c_w) {
					val = s_w - c_w;
				}
				no_evt_scroll(editor, { left : val });
			}

			if (typeof scroll.Top === "number") {
				var s_h = editor.renderer.scrollBarV.element.scrollHeight;
				var c_h = editor.renderer.scrollBarV.element.clientHeight;
				val = s_h * scroll.Top;
				if (val > s_h - c_h) {
					val = s_h - c_h;
				}
				no_evt_scroll(editor, { top : val });
			}

			toolbar.update_scroll_info(msg);
		}
		catch (err) {
			log.error (err, 'set_scroll');
		}
	};

	/*
	 * Local methods
	 */

	function send_control (conn) {
		conn.prototype.send = function (data) {
			var docName;
			if (data.doc) {
				docName = data.doc;
				if (docName === this.lastSentDoc) {
					delete data.doc;
				} else {
					this.lastSentDoc = docName;
				}
			}
			log.info(data, "data sent to session cluster");
			return f_handle_cached.send_info ('*', 'data-sync', data, 0);
		};
	}

	function open_editor (sharejs, config, uuid, ace_cached, editor) {
		var scroll_info = config.scroll_info;
		log.info({ padID : uuid, scroll_info : scroll_info }, "open editor");

		sharejs.open(uuid, 'text', "not_required", function(error, doc) {
				if (error){
					return log.error("Error in opening Doc ::"+error);
				}
				log.info({ snapshot : doc.snapshot }, "successfully attached ace and sharejs");
				toolbar.store_info(uuid, doc, editor, ace_cached, scroll_info);
				doc.attach_ace(editor);

				/*
				 * enable/disable editor based on perms */
				var val = _allowed ('write','control');
				workspace.set_enabled (uuid, val);

				if (scroll_info) {
					init_scroll(uuid);
					update_scroll(uuid, scroll_info);
				}
				scroll_events(session_type[uuid], uuid, editor);
			});
	}

	/*
	 * Necessary because some bug in horizontal scroll behaviour
	 */
	function init_scroll (uuid) {
		var editor = toolbar.get_editor(uuid).editor;
		editor.renderer.scrollToX(0);
		editor.session.$scrollLeft = 0;
		editor.renderer.scrollToY(0);
		editor.session.$scrollTop = 0;
	}

	function init_options (ace_cached, editor_cached, uuid, config) {
		var _d = $.Deferred();

		editor_cached.$blockScrolling = Infinity;
		editor_cached.setShowPrintMargin(false);  /* Should show vertical margin or not? */
		editor_cached.setReadOnly(true);
		cursor_state(editor_cached, 'hide');
		editor_cached.focus();

		require(['./ace/ext-language_tools'], function () {
			ace_cached.require("ace/ext/language_tools");
			editor_cached.setOptions({
				enableBasicAutocompletion: true,
				enableSnippets: true,
				enableLiveAutocompletion: false
			});
			log.info("editor options set");
			_d.resolve(ace_cached, editor_cached, uuid, config);
		});

		return _d.promise();
	}

	function cursor_state (editor, state) {
		try {
			switch(state) {
				case 'hide':
					editor.renderer.$cursorLayer.element.style.display = "none";
					return;
				case 'show':
					editor.renderer.$cursorLayer.element.style.display = "";
					return;
			}
		}
		catch(err) {
			log.error(err, "unable to hide cursor");
		}
	}

	function set_keybinding (ace_cached, editor_cached, uuid, config) {
		var _d = $.Deferred();

		var editor_outer = $(".code-editor-outer[data-uuid='" + uuid + "']");
		var save = editor_outer.find("a.file-save").get(0);
		editor_cached.commands.addCommand({
			name: "save",
			bindKey: { win: "Ctrl-S", mac: "Command-S" },
			exec: function () {
				save.click();
			}
		});

		var open_file = editor_outer.find("a.file-open").get(0);
		editor_cached.commands.addCommand({
			name: "open",
			bindKey: { win: "Ctrl-O", mac: "Command-O" },
			exec: function () {	
				open_file.click();
			}
		});

		_d.resolve(ace_cached, editor_cached, uuid, config);

		return _d.promise();
	}

	/*
	 * Set initial editor options based on info from session cluster
	 */
	function init_config (ace_cached, editor_cached, uuid, config) {
		var _d = $.Deferred();

		var size  = config.current_size;
		var theme = config.current_theme;

		log.info("Initialized Received theme :: "+theme);

		require(['./ace/theme-'+theme], function () {
			editor_cached.setTheme("ace/theme/"+theme);
			_d.resolve(ace_cached, editor_cached, uuid, config);
		});
		editor_cached.setFontSize(Number(size));

		return _d.promise();
	}

	/*
	 * Mode means the language used in the editor like javascript, html, css, java etc.
	 */
	function init_session (ace_cached, editor_cached, uuid, config) {
		var _d = $.Deferred();

		var mode_type = config.current_lang;
		var editor_outer = $(".code-editor-outer[data-uuid='" + uuid + "']");
		editor_outer.find("#mode").val(mode_type);

		require(['./ace/ext-modelist'], function () {
			log.info({ uuid : uuid, language : mode_type }, 'language set');
			modelist    = ace_cached.require("ace/ext/modelist");
			filepath    = "mode."+mode_type;
			mode_chosen = modelist.getModeForPath(filepath).mode;

			/*
			 * Created session for the language that has syntax checker beforehand 
			 * in order to load checker otherwise checker throws error  
			 */
			session_type[uuid] = {
				js   : ace_cached.createEditSession("", "ace/mode/javascript"),
				html : ace_cached.createEditSession("", "ace/mode/html"),
				css  : ace_cached.createEditSession("", "ace/mode/css")
			};

			if (session_type[uuid][mode_type]){
				editor_cached.setSession(session_type[uuid][mode_type]);
				return _d.resolve(ace_cached, editor_cached, uuid, config);
			}
			session_type[uuid][mode_type] = ace_cached.createEditSession("", mode_chosen);
			editor_cached.setSession(session_type[uuid][mode_type]);
			return _d.resolve(ace_cached, editor_cached, uuid, config);
		});

		return _d.promise();
	}

	function update_scroll (uuid, scroll_info) {
		var scroll = {};

		if (scroll_info.Left === 0 || scroll_info.Left) {
			scroll.Left = scroll_info.Left;
		}
		if (scroll_info.Top === 0 || scroll_info.Top) {
			scroll.Top = scroll_info.Top;
		}
		/*
		 * Wait for editor content to be loaded
		 * Otherwise scrollWidth comes out to be zero.
		 */
		setTimeout(
				workspace.set_scroll.bind(null, { uuid : uuid, scroll : scroll_info }), 
		250);
	}

	function scroll_events (session, uuid, editor) {
		/*
		 * Scroll-sync only if user has write permission
		 */
		for (var key in session) {
			session[key].on("changeScrollLeft", scroller.bind(null, editor, uuid, "Left"));
			session[key].on("changeScrollTop" , scroller.bind(null, editor, uuid, "Top" ));
		}
	}

	/*
	 * Calculate % scroll and send it to session cluster and other users
	 */
	var scroller = debounce (function (editor, uuid, type, scroll) {

		if (!_allowed ("write", "control")) 
			return;

		log.info({ uuid : uuid, type : type, scroll : scroll }, "scroll event received");
		var cur_pos = editor.getCursorPosition();
		var l_row   = editor.renderer.getLastVisibleRow() - 1;
		if (scroll < 0 || scroll ===-0 ) {
			scroll = 0;
		}
		if (type === "Top") {
			var s_h = editor.renderer.scrollBarV.element.scrollHeight;
			scroll = scroll/s_h;
		}
		else {
			var s_w = editor.renderer.scrollBarH.element.scrollWidth;
			scroll = scroll/s_w;
		}
		var data = {
			uuid      : uuid,
			broadcast : true,
			scroll    : {}
		};

		data.scroll[type] = scroll;

		toolbar.update_scroll_info (data);

		f_handle_cached.send_info ('*', 'scroll-info', data, 0);
	}, 250);

	function move_to_view (msg) {
		var uuid = msg.doc;
		var _val = toolbar.get_editor(uuid);
		var op   = msg.op;

		if (!_val || !op)
			return;

		op = op[op.length -1];
		cursor_to_view (_val, op);

	}

	function cursor_to_view (_val, op) {
		try {
			var editor = _val.editor;
			var pos    = off_to_pos(op.p);
			var scroll = {};
			var left   = editor.session.getScrollLeft();
			var text, c_w, row, col;

			for (var key in op) {
				if (key !== "p")
					text = op[key].split("\n");
				if (key === "d") {
					row    = pos.row;
					col    = pos.column;
				}
				if (key === "i") {
					row    = pos.row + text.length - 1;
					col    = (text.length === 1) ? pos.column : text[text.length - 1].length -1;
				}
			}

			scroll.left = (col * editor.renderer.layerConfig.characterWidth);

			/*
			 *  Move down the scroll */
			if (editor.renderer.getLastVisibleRow()-2 < row) {
				scroll.top = row * editor.renderer.lineHeight;
				no_evt_scroll(editor, scroll);
				return;
			}

			/*
			 * Move up the scroll */
			if (editor.renderer.getFirstVisibleRow() > row) {
				scroll.top = row * editor.renderer.lineHeight;
				no_evt_scroll(editor, scroll);
				return;
			}

			c_w = editor.renderer.scrollBarH.element.clientWidth;
			if (scroll.left < left || scroll.left > left + c_w)
				no_evt_scroll(editor, { left : scroll.left });
		}
		catch (err) {
			log.error(err, 'move_to_view');
		}
	}

	function get_scroll (editor) {
		var scroll = {};
		try {
			var s_w = editor.renderer.scrollBarH.element.scrollWidth;
			var s_h = editor.renderer.scrollBarV.element.scrollHeight;
			var scl_left = editor.session.getScrollLeft();
			var scl_top  = editor.session.getScrollTop();
			scroll.Top = scl_top/s_h;
			scroll.Left = scl_left/s_w;
		}
		catch (err) {
			log.error(err, 'get_scroll');
		}

		return scroll;
	}

	function no_evt_scroll (editor, scroll) {
		if (scroll.left === 0 || scroll.left) {
			editor.renderer.scrollToX(scroll.left);
			editor.session.$scrollLeft = scroll.left;
		}
		if (scroll.top === 0 || scroll.top) {
			editor.renderer.scrollToY(scroll.top);
			editor.session.$scrollTop = scroll.top;
		}
	}

	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}

	function start_error (err) {
		log.error(err, "Received error while starting workspace");
	}

	return workspace;
});
