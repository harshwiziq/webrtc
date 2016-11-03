var $           = require("jquery-deferred");
var code_editor = {};
var log;
var coms;
var sess_info;
var map = {};
var editor_count = 1;
var editor_server = require('./server');
var emitter = require('./editor-events');

code_editor.init = function (myinfo, common, handles) {
	var _d = $.Deferred ();
	log = handles.log;
	coms = handles.coms;
	log.info (myinfo, 'initialize editor');
	init_editor();
	sess_info = myinfo.custom;
	_d.resolve();
	return _d.promise();
};

code_editor.init_user = function (user) {
	var _d = $.Deferred();
	log.info(user, 'user-received');
	log.info(sess_info, 'sess_info send to editor');
	sess_info.shared = doc_map_get_all(user);
	emitter.removeAllListeners(user.vc_id);
	emitter.emit('connection', user.vc_id, coms);
	_d.resolve(sess_info);
	return _d.promise();
};

code_editor.info = function (from, id, info) {
};

code_editor.command = function (vc_id, command, data) {
	var _d = $.Deferred ();

	log.info({ vc_id : vc_id, command : command, data : data }, 'code-editor command');

	switch (command) {
		case "get-title":
			var uuid = data;
			if (map[uuid]) {
				if (!map[uuid].title) {
					create_title(uuid);
				}
				return _d.resolve(map[uuid].title);
			}
			return _d.reject('found no such editor with id = '+ uuid);
		default :
			log.error({ vc_id : vc_id, command : command, data : data }, 'unknown command id');
	}

	return _d.promise();
};

code_editor.relay_info = function (from, to, id, info) {

	log.info(info, 'editor relay_info');

	switch (id) {
		case 'new-editor':
			return doc_map_add (from, to, info);

		case 'editor-destroyed':
			return doc_map_remove (from, to, info);
		case 'data-sync':
			/*
			 * Emit message event which will be listened by the session.js
			 */
			emitter.emit(from, info);
			return;
		case 'scroll-info':
			return doc_map_scroll_info(from, to, info);
		case 'mode-change':
			return doc_map_mode_change(from, to, info);
		case 'theme-change':
			return doc_map_theme_change(from, to, info);
		case 'size-change':
			return doc_map_size_change(from, to, info);
		case 'title-change':
			return doc_map_title_change(from, to, info);
		default :
			log.error ({ from: from, id: id, info: info }, 'unknown info id');
			return false;
	}

	return false;
};

function doc_map_add (from, to, info) {
	map[info.uuid] = {
		owner       : from,
		config      : info.config,
		creation_ts : Date.now()
	};

	if (!info.config.title) {
		create_title(info.uuid);
		info.config.title = map[info.uuid].title;
	}
	log.info ({ from: from, to: to, info: info }, 'new code-editor added to map');
	return true;
}

function doc_map_remove (from, to, info) {
	if (!map[info.uuid]) {
		log.error ({ from: from, to: to, info: info, method: 'editor_map_remove '}, 'non-existent uuid');
		return false;
	}

	log.info ({ from: from, to: to, info: info }, 'editor destroyed from map');
	delete map[info.uuid];

	/* No need to forward this to all, since everyone will know via the tab-controller anyways */
	return false;
}

function doc_map_scroll_info (from, to, info) {
	if (!map[info.uuid]) {
		log.error ({ from: from, to: to, info: info, method: 'editor_map_scroll_info '}, 'non-existent uuid');
		return false;
	}

	map[info.uuid].scroll_info = map[info.uuid].scroll_info || {};

	for (var type in info.scroll) {
		map[info.uuid].scroll_info[type] = info.scroll[type];
	}
	//map[info.uuid].scroll_info[info.type] = info.scroll;
	log.info ({ from: from, to: to, info: info }, 'editor scroll_info added to map');

	return info.broadcast;
}

function doc_map_mode_change (from, to, info) {
	if (!map[info.uuid]) {
		log.error ({ from: from, to: to, info: info, method: 'editor_map_mode_change '}, 'non-existent uuid');
		return false;
	}
	try {
		map[info.uuid].config.default.current_lang = info.mode;
	}
	catch(err) {
		log.error(err, 'mode-change');
	}
	log.info ({ from: from, to: to, info: info }, 'editor mode updated in map');
	return true;
}

function doc_map_theme_change (from, to, info) {
	if (!map[info.uuid]) {
		log.error ({ from: from, to: to, info: info, method: 'editor_map_theme_change '}, 'non-existent uuid');
		return false;
	}
	try {
		map[info.uuid].config[from] = map[info.uuid].config[from] || {};
		map[info.uuid].config[from].current_theme = info.theme;
	}
	catch (err) {
		log.error(err, 'theme-change');
	}
	log.info ({ from: from, to: to, info: info }, 'editor theme updated in map');
}

function doc_map_size_change (from, to, info) {
	if (!map[info.uuid]) {
		log.error ({ from: from, to: to, info: info, method: 'editor_map_size_change '}, 'non-existent uuid');
		return false;
	}
	try {
		if (info.broadcast) {
			map[info.uuid].config.default.current_size = info.size;
		}
		map[info.uuid].config[from] = map[info.uuid].config[from] || {};
		map[info.uuid].config[from].current_size = info.size;
	}
	catch (err) {
		log.error(err, 'size-change');
	}
	log.info ({ from: from, to: to, info: info }, 'editor size updated in map');

	return info.broadcast;
}

function doc_map_title_change (from, to, info) {
	if (!map[info.uuid]) {
		log.error ({ from: from, to: to, info: info, method: 'editor_map_title_change '}, 'non-existent uuid');
		return false;
	}
	try {
		map[info.uuid].title = info.title;
	}
	catch (err) {
		log.error(err, 'title-change');
	}
	log.info ({ from: from, to: to, info: info }, 'editor title added to map');
	return true;
}

function create_title (uuid) {
	map[uuid].title = 'code-editor (' + editor_count + ')';
	editor_count++;
}

function doc_map_get_all (user) {
	log.debug ({ map : map }, 'current open editors');
	return map;
}

function init_editor () {
	var options = {
		db   : { type : 'none' },
		log  : log, 
		auth : function (client, action) {
			if (action.name === 'submit op' && action.docName.match(/^readonly/)) {
				action.reject();
			} else {
				action.accept();
			}
		}
	};
	editor_server.attach (options);
}

module.exports = code_editor;
