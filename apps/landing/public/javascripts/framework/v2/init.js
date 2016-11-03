requirejs.config({

	/*
	 * Disable the load timeout */
	waitSeconds : 0,

	baseUrl: '/landing/javascripts/framework/v2',
	paths: {
		/* the left side is the module ID,
		 * the right side is the path to
		 * the jQuery file, relative to baseUrl.
		 * Also, the path should NOT include
		 * the '.js' file extension. */
		jquery:        '/landing/javascripts/ext/jquery-1.11.3.min',
		jade:          '/landing/javascripts/ext/jade-runtime',
		modernizer:    '/landing/javascripts/ext/modernizr.custom',
		jquery_mmenu:  '/landing/javascripts/ext/jquery.mmenu.min.all',
		dom_ready:     '/landing/javascripts/ext/domReady',
        remodal:       '/landing/javascripts/ext/remodal.min',
        scrollbar:     '/landing/javascripts/ext/perfect-scrollbar.jquery.min',
        wheel:         '/landing/javascripts/ext/jquery.mousewheel',
        sbar:          '/landing/javascripts/ext/jquery.jscrollpane.min',
        bootstrap:     '/landing/javascripts/ext/bootstrap.3.3.5.min',
		moment:        '/landing/javascripts/ext/moment.min',
	},
	'shim' : {
		'jquery_mmenu'    : [ 'jquery' ],
		'bootstrap'       : [ 'jquery' ],
		'sbar'            : [ 'jquery', 'wheel' ],
		'wheel'           : [ 'jquery' ]
	}
});

define(function(require) {
	var $       = require('jquery');
	var core    = require('core');
	var blanket = require('blanket');
	var log     = require('log')('init', 'info');

	/*
	 * Initialize the Core
	 */
	core.init ()
		.then (
			function () {
				log.info ('init ok');
			},
			function (err) {
				log.error ('fatal : ' + err);
				blanket.show_error ('fatal: ' + err);
			}
		);
});
