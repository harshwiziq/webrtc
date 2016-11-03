var obj = {
	allowed : {
		"av" : {
			"camera.mute" : {
				"users" : "*"
			},
			"camera.change-res" : {
				"users" : {
					"user1" : true,
					"user2" : true,
				}
			},
			"display.mute" : {
				"users" : "self"
			}
		},

		"whiteboard" : {
			"write" : {
				"users" : {
					"self"  : true
				}
			}
		}
	},

	denied : {
		"av" : {
			"camera.mute" : {
				"users" : "user1"
			},
			"camera.change-res" : {
				"users" : {
					"user2" : true
				}
			},
			"display.mute" : {
				"users" : "self"
			}
		},

		"whiteboard" : {
			"write" : {
				"users" : "user1"
			}
		}
	}

};

module.exports = obj;
