define(function(require) {
	var $ = require('jquery');
	var log = require('log')('widget-nav', 'info');

	var nav = {};
	var attached = null;

	nav.attach = function (anchor, _module) {
		attached = _module;
		_module.resource.display_spec.anchor = $(anchor).find('.nav-inner')[0];

		/*
		 * TODO:
		 * 	If the _module has a template, then attach it under the anchor
		 */

		log.info('nav.attach ok for ' + _module.name);
		return null;
	};

	return nav;
});

