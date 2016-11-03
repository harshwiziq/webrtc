var docker_monitor  = require('wiziq-node-docker');
var log             = require('./common/log').child ({'sub-module' : 'proxy-docker-monitor'});
var route_cache     = require('./route-cache');

var key;
var value;

function dockermonitor () {

	docker_monitor ({

		onContainerUp: function (container) {

			if (!container.Ports || !container.Ports.length) {
				log.warn ({ container : container }, 'docker start : incomplete parameters. ignoring');
				return;
			}

			key = '/session/' + container.Name;
			value = 'localhost:' + container.Ports[0].PublicPort + '/';

			if (route_cache.exists (key)) {
				log.warn({ key : key, oldvalue : route_cache.get(key), newvalue : value }, "register : route exists. going to overwrite.");
				route_cache.remove_route (key);
			}

			route_cache.add_route (key, value, Date.now());

			log.info ({ key : key, value : value }, 'route added');
		},

		onContainerDown: function (container) {
			log.info(container, "docker-stop-info");
			key = '/session/' + container.Name;

			if (!route_cache.exists(key)) {
				log.warn({ key : key },"route not found");
				return;
			}

			route_cache.remove_route (key);
			log.info ({ key : key }, 'route removed');
		},

		onContainerError: function (err, msg){
			log.error(err, msg);
			process.exit(1);
		}

	});
}

dockermonitor();