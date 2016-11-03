var $               = require('jquery-deferred');

var layout = {};
var log;
var coms;
var layout_state = {
	from:   null,
	layout: null
};

layout.init = function (myinfo, common, handles) {
	var _d = $.Deferred ();

	log  = handles.log;
	coms = handles.coms;

	_d.resolve ();

	return _d.promise ();
};

layout.init_user = function (user) {
	var _d = $.Deferred ();

	log.info (layout_state, 'current stored layout information');
	_d.resolve (layout_state);

	return _d.promise ();
};

layout.command = function (vc_id, command, data) {
	var _d = $.Deferred ();

	_d.reject ('no commands supported by layout-ctrl');

	return _d.promise ();
};

layout.info = function (from, id, info) {
	log.warn ('no info supported by layout-ctrl');
};

layout.relay_info = function (from, to, id, info) {

	switch (id) {

		case 'layout-changed':
			layout_state = {
				from : from,
				layout : info.layout
			};

			return true;

		default :
			log.error ({ from: from, id: id, info: info }, 'unknown info id');
			return false;
	}

	return false;
};

module.exports = layout;
