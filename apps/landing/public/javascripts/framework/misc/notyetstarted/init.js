requirejs.config({

	/*
	 * Disable the load timeout */
	waitSeconds : 0,

	baseUrl: '/landing/javascripts/framework/misc/notyetstarted',
	paths: {
		/* the left side is the module ID,
		 * the right side is the path to
		 * the jQuery file, relative to baseUrl.
		 * Also, the path should NOT include
		 * the '.js' file extension. */
		jquery:        '/landing/javascripts/ext/jquery-1.11.3.min',
		moment:        '/landing/javascripts/ext/moment.min',
		jade:          '/landing/javascripts/ext/jade-runtime',
		modernizer:    '/landing/javascripts/ext/modernizr.custom',
		dom_ready:     '/landing/javascripts/ext/domReady',
	},
	'shim' : {}
});

define(function(require) {
	var $       = require('jquery');
	var log     = require('log')('init', 'info');
	var display = require('display');
	var server  = require('server');

	server.init ();
	display.fill ();
});
