var Docker = require('dockerode');
//var docker = new Docker();	// if you wanna use it somewhere else
var docker = require('node-agent/core/docker').docker;
var trackedEvents = ['create', 'restart', 'start', 'destroy', 'die', 'kill', 'stop'];

function init (handler, cb) {
	docker.getEvents( function (err, data) {
		if (err) {
			return cb(err);  // otherwise cb never gets called. its OK na?
		}

		// get all containers
		// send their state like cb(null, state, true) where true tells it is history
		data.on('data', function (chunk) {
			try {
				var lines = chunk.toString().split('/n');
				lines.forEach(function (line) {
					try {
						if (line.trim()) {
							process (JSON.parse(line), handler);
						}
					}
					catch (e) {
						handler(e);
					}
				});
			}
			catch (e) {
				handler(e);
			}
		});
	
	});
}


/* 
 * private methods */

function process (event, handler) {
	if (trackedEvents.indexOf(event.status) != -1) {
		handler(null, event);
	}
}


//not being used yet
function get_container_name (names) {		// didn't get the logic, give some time
	for (var i = 0; i < names.length; i++) {
		var nameElements = names[i].split('/');
		if (nameElements.length === 2) {
			return nameElements[1];
		}
	}
}

module.exports = init;
