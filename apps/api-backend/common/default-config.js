var log    = require('api-backend/common/log' ).child({ module : 'common/default-config' });
var config = {};


/* default values for different profiles */

config.display_profile = {
	name      : 'default',
	structure : 'katyayani',
	layout    : 'katyayani',
	theme     : 'katyayani'
};

var resource_map = {

	'menu-sidepush-classic' : {
		name: 'menu-sidepush-classic',
		role: 'menu',
		display_name : 'Menu',
		req_sess_info : false,
		display_spec: { widget: "nav", templates: [ 'demo' ], css: [ 'jquery.mmenu.all' ] },
		custom: {
			sub_menu_vslide: true,
			hlight_sel: true,
		},
	},
	'av-tokbox-v2' : {
		name: 'av-tokbox-v2',
		role: 'av',
		display_name : 'Audio/Video',
		display_spec: { widget: 'av', templates: [ 'av-tokbox', 'container' ], css: [ 'katyayani.min' ] },
		req_sess_info : true,
		custom: {
			limits : {
				startup       : 'with-perms',
				max_videos    : 5,
				max_audios    : 20
			},
			random_string : 'welcome',
			screenshare : true,
			debug_controls : false,
			chromeextensionid : "cofnnopnhjmpoomoholnofbneelimjdm",
		},
	},
	'tabs-v1' : {
		name: 'tabs-v1',
		role: 'tab-controller',
		display_name : 'Application Controller',
		req_sess_info : false,
		display_spec: { widget: "tabs", templates: [ "tabs", "tabs-li", "tabs-tabpanel" ], css: [ "tabs.min" ] },
		custom: {
		},
	},
	'chat-box' : {
		name: 'chat-box',
		role: 'chat',
		display_name : 'Chat',
		req_sess_info : true,
		display_spec: { widget: 'chat', templates: [ "chat-v1","message" ], css: [ 'chat-box.min']  },
		custom: {
		},
	},
	'att-list' : {
		name: 'att-list',
		role: 'attendees',
		display_name : 'People',
		req_sess_info : false,
		display_spec: { widget: 'attendees', templates: [ "main", "user", "me" ], css: [ 'main.min'] },
		custom: {
		},
	},
	'whiteboard-v1' : {
		name: "whiteboard-v1",
		display_name: "Whiteboard",
		req_sess_info: true,
		display_spec: {
			widget: "tabs",
			templates: [ "main" ],
			css: [ "canvas.min" ]
		}
	},
	'code-editor' : {
		name: "code-editor",
		role: "code-editor",
		req_sess_info : true,
		display_name: "Editor",
		display_spec: {
			widget: "tabs",
			templates: [ "code-editor" ],
			css: [ "code-editor.min" ]
		},
		custom: {}
	},
	'content' : {
		name: 'content',
		role: 'content',
		display_name : 'Content',
		req_sess_info : true,
		display_spec: { widget: 'tabs', templates: [ "player", "library", "library-item" ], css: [ 'content.min' ] },
		custom: {
		},
	},
	'recording' : {
		name: 'recording',
		role: 'recording',
		display_name : 'Recording',
		req_sess_info : true,
		display_spec: { widget: 'nav', templates: [ ], css: [ 'recording.min' ] },
		custom: {
		},
	}
};

config.resources = function (in_array) {
	var out_array = [];

	for (var i = 0; i < in_array.length; i++) {
		var name = in_array [i].name;
		var __res = resource_map [ name ];

		if (!__res) {
			log.error ('unrecognized resource "' + name + '"');
			continue;
		}

		out_array.push ( resource_map [ name ]);
	}

	return out_array;
};

module.exports = config;
