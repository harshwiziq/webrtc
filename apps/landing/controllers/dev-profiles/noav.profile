{
	"_id": "57484c933a5f787756c4d8f2",
	"class_id": "eternal01",
	"status": "locked",
	"__v": 0,
	"meta_info": {
		"creation_ts": "2016-05-27T13:33:07.756Z",
		"title": "Wiziq DEV Profile",
		"creator": {
			"name": null,
			"id": "333",
			"email": "akshit@wiziq.com"
		}
	},
	"profile": {
		"company_info": {
			"prov_server_name": "default",
			"name": "WizIQ Inc.",
			"logo_url": "/landing/public/images/wiziq-logo-new.png",
			"auth_type": "wiziq"
		}
	},
	"attendees": {
		"max_attendees": 1999,
		"explicit_anon": "anon-demo",
		"presenter_entry_before_time": true,
		"named": [
		{
			"id": "472696",
			"auth_via": "wiziq",
			"role": "wiziq-presenter"
		}
		]
	},
	"display_profile": {
		"name": "default",
		"structure": "katyayani",
		"layout": "katyayani",
		"theme": "katyayani"
	},
	"resources": [
		{
			"name": "whiteboard-v1",
			"display_name": "Whiteboard",
			"req_sess_info": true,
			"display_spec": {
				"widget": "tabs",
				"templates": ["main"],
				"css": ["canvas.min"]
			},
			"custom": {
				"consider_perms" : true
			}
		},
		{
			"name": "menu-sidepush-classic",
			"role": "menu",
			"display_name": "Menu",
			"req_sess_info": false,
			"display_spec": {
				"widget": "nav",
				"templates": [ "demo" ],
				"css": [ "jquery.mmenu.all" ]
			},
			"custom": {
				"sub_menu_vslide": true,
				"hlight_sel": true
			}
		},
		{
			"name": "tabs-v1",
			"role": "tab-controller",
			"display_name": "Application Controller",
			"req_sess_info": false,
			"display_spec": {
				"widget": "tabs",
				"templates": [ "tabs", "tabs-li", "tabs-tabpanel" ],
				"css": [ "tabs.min" ]
			},
			"custom": {}
		},
		{
			"name": "code-editor",
			"role": "code-editor",
			"display_name": "Editor",
			"display_spec": {
				"widget": "tabs",
				"templates": [ "code-editor" ],
				"css": [ "code-editor.min" ]
			},
			"custom": {}
		},
		{
			"name": "chat-box",
			"role": "chat",
			"display_name": "Chat",
			"display_spec": {
				"widget": "chat",
				"templates": [ "chat-v1", "message" ],
				"css": [ "chat-box.min" ]
			},
			"custom": {}
		},
		{
			"name": "att-list",
			"role": "attendees",
			"display_name": "People",
			"req_sess_info": false,
			"display_spec": {
				"widget": "attendees",
				"templates": [ "main", "user", "me" ],
				"css": [ "main.min" ]
			},
			"custom": {}
		},
		{
			"name": "content",
			"role": "content",
			"display_name": "Content",
			"req_sess_info": true,
			"display_spec": {
				"widget": "tabs",
				"templates": [ "player", "library", "library-item" ],
				"css": [ "content.min" ]
			},
			"custom": {}
		},
		{
			"name": "recording",
			"role": "recording",
			"display_name": "Recording",
			"req_sess_info": true,
			"display_spec": {
				"widget": "none",
				"templates": [ ],
				"css": [ "recording.min" ]
			},
			"custom": {
				"coder"    : "shubam",
				"co_coder" : "shardul"
			}
		}
	],
	"time_spec": {
		"starts": "2016-05-27T13:35:04.000Z",
		"duration": -1,
		"extendable": 240,
		"recurrence": {
			"repeat": 0,
			"end_date": null,
			"occurence": 0
		}
	},
	"sess_id": "cc39093d-a447-452a-9c2f-d3736dc4996a",
	"state": "started",
	"sess_host_url": "https://node-01.wiziq.com:443",
	"session_server": {
		"protocol": "https",
		"host": "node-01.wiziq.com",
		"port": 443,
		"ssl": true
	},
	"perms": {
		"wiziq-presenter": {
			"denied": {
				"layout": {
					"change": {
						"users": "user1"
					}
				}
			},
			"allowed": {
				"av-camera": {
					"disable": {
						"users": "*"
					}
				},
				"av-microphone": {
					"mute": {
						"users": "*"
					}
				},
				"content": {
					"share": {
						"users": "*"
					},
					"upload": {
						"users": "*"
					},
					"library": {
						"users": "*"
					}
				},
				"code-editor": {
					"create": {
						"users": "*"
					},
					"write": {
						"users": "*"
					}
				},
				"whiteboard": {
					"write": {
						"users": "*"
					}
				},
				"tab": {
					"close": {
						"users": "*"
					},
					"change": {
						"users": "*"
					}
				},
				"layout": {
					"change": {
						"users": "*"
					}
				}
			}
		},
		"default": {
			"denied": {
				"layout": {
					"change": {
						"users": "user1"
					}
				}
			},
			"allowed": {
				"av-camera": {
					"disable": {
						"users": "*"
					}
				},
				"av-microphone": {
					"mute": {
						"users": "*"
					}
				},
				"content": {
					"share": {
						"users": "*"
					},
					"upload": {
						"users": "*"
					},
					"library": {
						"users": "*"
					}
				},
				"code-editor": {
					"create": {
						"users": "*"
					},
					"write": {
						"users": "*"
					}
				},
				"whiteboard": {
					"write": {
						"users": "*"
					}
				},
				"tab": {
					"change": {
						"users": "self"
					},
					"close": {
						"users": "*"
					}
				},
				"layout": {
					"change": {
						"users": "*"
					}
				}
			}
		}
	}

}
