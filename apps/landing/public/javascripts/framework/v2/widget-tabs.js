define(function(require) {
	var $          = require('jquery');
	var controller = require('tab-controller');
	var log        = require('log')('widget-tabs', 'info');

	var tabs = {};
	var tab_count = 0;
	var attached = null;

	/*
	 * 2 kinds of modules will attempt to attach themselves here:
	 *     1. The tab-controller (should be only one)
	 *     2. The tab-users
	 * For the 2nd type, we do not return any anchor, since they'll
	 * need to call additional functions to get their tabs */
	tabs.attach = function (anchor, _module) {

		if (_module.resource.role && _module.resource.role === 'tab-controller') {
			/*
			 * This module is a tab-controller */
			if (attached) {
				log.error ('Can\'t attach _module:', _module.name, ':', attached.name, 'already attached');
				return 'already attached';
			}
			attached = _module;
			err = controller.register_controller (_module);
			if (err)
				return err;

			_module.resource.display_spec.anchor = $(anchor).find('.tab-inner')[0];

			/* All is well */
			log.info('tabs.attach ok for tab-controller = ' + _module.name);
			return null;
		}

		log.info('Not registering tab if not controller' + _module.name);
		return null;
	};

	return tabs;
});

