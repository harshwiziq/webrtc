define(function(require) {
	var $           = require('jquery');
	window.jade     = require('jade');
	var log         = require('log')('webpage', 'info');
	var framework   = require('framework');

	var webpage = {};
	var f_handle = framework.handle ('webpage');
	var anchor, dropdown_menu;
	var apps = {};

	webpage.init = function (display_spec, custom, perms) {
		var _d = $.Deferred();

		$('#widget-tabs').on('click', '.ask-url button[type="submit"]', function (ev) {
			var div_parent = $(ev.currentTarget).closest('.ask-url');
			var url = div_parent.find('input[type="text"]').val();
			var anchor = div_parent.parent()[0];

			attach_iframe (anchor, url);
		});

		_d.resolve();
		return _d.promise();
	};

	webpage.start = function (sess_info) {
		return;
	};

	webpage.create = function () {
		var options = {};

		var handle = f_handle.tabs.create (options);

		$(handle.anchor).append(
			'<iframe src="https://www.wiziq.com">No iFrame Support</iframe>'
		);

		return;
	};

	function attach_iframe (anchor, url) {
		is_available (url, function (result, _url) {
			if (!result) {
				log.error ('url "' + _url + '" not available from within the app');
			}

			$(anchor).append(
				'<iframe src="' + url + '">-blah-</iframe>'
			);
		}, 10000);

	}

	function is_available (url, callback, timeout) {

		if (!timeout) 
			timeout = 5000;

		var timer = setTimeout (function() {
			ifr.remove();
			callback(false,url);
		},timeout);

		var ifr = $('<iframe></iframe>');
		ifr.hide();
		$('body').append(ifr);

		ifr.on('load',function() {
			if (timer) clearTimeout(timer);
			var result;
			try {
				var doc=ifr[0].contentDocument.location.href;
				result=true;
				log.info ('load ok !');
			} catch(ex) {
				result=false;
				log.info ('load failed !', ifr);
			}
			ifr.remove();
			callback(result,url);
		});
		ifr.attr('src',url);
	}

	return webpage;

});
