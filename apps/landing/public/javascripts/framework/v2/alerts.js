define(function(require) {
	var $           = require('jquery');
	var log         = require('log')('alert', 'info');
	var alert       = {};
	var counter     = 0;
	var _alert_str  = 'alert-';

	/*
	 * Alerts options: (All are mandatory)
	 * 1) level (alert-success, alert-info, alert-warning, alert-danger)
	 * 2) dismiss allow, deny (whether or not to show close alert button)
	 * 3) duration (time in sec after which alert gets auto dismissed)
	 * 4) model (alert html)
	 */
	alert.open = function (options) {
		var level   = options.level;
		var dismiss = options.dismiss;
		var mark_up = options.model;

		if (!level || !mark_up) {
			return log.error({ level : level, dismiss : dismiss, mark_up : mark_up }, 'Options missing');
		}

		log.info({ options : options }, 'options received');

		var $div = $('<div></div>');
		$div.attr('id', _alert_str + (++counter));
		$div.addClass('alert');

		set_level ($div, options);
		handle_dismiss ($div, options);

		auto_dismiss ($div, options);

		$div.append (mark_up);

		add_refresh($div, options);
		$('body').append($div);

		return $div.attr('id');
	};

	alert.close = function (alert_id) {
		alert_id = "#"+alert_id;
		$(alert_id).alert('close');
	};

	/*
	 * Local functions
	 */
	function set_level ($div, options) {
		var level   = options.level;
		switch (level) {
			case 'alert-success':
			case 'alert-warning':
			case 'alert-info'   :
			case 'alert-danger' :
				$div.addClass (level);
				break;
			default:
				log.error({ level : level }, 'incorrect level received');
		}
	}

	function add_refresh ($div, options) {
		var refresh  = options.refresh;

		if (refresh)
			$div.append ('<a class="refresh" href="javascript:void(0)" onclick="location.reload(false)">Reload Page</a>');
	}

	function handle_dismiss ($div, options) {
		if (options.dismiss) {
			$div.append (
				'<button type="button" class="close" data-dismiss="alert" aria-label="Close">' + 
				'<span aria-hidden="true">&times;</span>' +
				'</button>'
			);

			return;
		}
	}

	function auto_dismiss ($div, options) {

		if (!options.auto_dismiss)
			return;

		$div.addClass('auto-dismiss');
		setTimeout (alert.close.bind(null, $div.attr('id')), 5000);
	}

	return alert;
});
