define(function (require) {
	var $            = require('jquery');
	var log          = require('log')('av-screenshare', 'info');
	var layout       = require('./layout');
	var remodal      = require('remodal');
	var menu         = require('./menu');
	var tokbox       = require('./tokbox');
    var utils        = require('./utils');

	var screenshare = {};
	var f_handle_cached;
	var custom_config_cached;
	var publisher;
	var my_container;

	screenshare.init = function (f_handle, custom) {
		f_handle_cached = f_handle;
		custom_config_cached = custom;

		$('div#av-modal .remodal-confirm').click(close_modal);

		/* Screenshare menu handler */
		menu.screenshare.set_handler(start);

		return null;
	};

	screenshare.stop = screen_publishing;

	function start () {
		var d = $.Deferred ();

		if (screen_publishing()) {
			d.resolve('Screen Sharing stopped');
			return d.promise();
		}

		var res = utils.detect_browser ();

        if (res && res.browser && res.browser === 'firefox') {
            ff_screenshare (res)
                .then(
                    function () {
                        return d.resolve ();
                    },
                    function (err) {
                        log.error ('err: ', err);
                        return d.reject (err);
                    }
                );
            return d.promise ();
        }

		/*
		 * Here we should check if the browser is really chrome
		 */
		tokbox.registerScreenSharingExtension('chrome', custom_config_cached.chromeextensionid);

		check_capability()
			.then(
				screenshare_supported.bind (null, d, 'chrome'),
				screenshare_not_supported.bind(null, d)
			);

		return d.promise ();
	}

	function screen_publishing (reason) {
		if (publisher) {
			log.info('Stopping screen share');
			publisher.destroy();
			publisher.emit('streamDestroyed', { reason : reason || "User stopped screen share"});
			return true;
		}
		return false;
	}

	function check_capability () {
		var d = $.Deferred();

		tokbox.checkScreenSharingCapability (function (res) {

			if ( !res.supported || res.extensionRegistered === false ) {
				return d.reject('screensharing not supported');
			}

			if ( res.extensionInstalled === false ) {
				return d.resolve(false);
			}

			return d.resolve(true);
		});

		return d.promise();
	}

	function really_start () {
        var d = $.Deferred();
		var i_am = f_handle_cached.identity.vc_id;

		my_container = layout.get_container ('screenshare-local');
		
		if (!my_container) {
			f_handle_cached.notify.alert('Screenshare Error', 'Ran out of free containers', 'danger', {
				non_dismissable : false,
				button : { }
			});
			d.reject ('ran out of free containers !');
			return d.promise();
		}

		my_container.set_meta ({
			identity  : f_handle_cached.identity,
			has_video : true,
			has_audio : false
		});

		/* OT destroys the div upon mediastream destruction, so create a child under it,
		 * and pass */
		$(my_container.div()).append('<div id="av-ot-screenshare-wrap"></div>');
		var div = $('div#av-ot-screenshare-wrap');

		tokbox.init_publisher (i_am, null, div[0], {
				videoSource : 'screen'
			}).then(
					function (na, _publisher) {
						publisher = _publisher;
						set_handlers();
						tokbox.publish (publisher);
						layout.reveal_video(my_container);
						/* set container attr that the stream is local */
						my_container.set_attribute ('stream_type', 'local');
						return d.resolve();
					},
					function (err) {
						f_handle_cached.alerts.open ({
							level : 'alert-warning',
							dismiss : true,
							auto_dismiss : true,
							model : 'Screenshare : ' + err
						});

						$(my_container.div()).find('div#av-ot-screenshare-wrap').remove();
						layout.giveup_container(my_container);
						my_container = null;
						log.error ('screenshare: failed to initialize publisher: ', err);
						return d.reject(err);
					}
			);

        return d.promise();
	}

	function ff_screenshare (res) {
        var d = $.Deferred ();
        log.info ('res: ', JSON.stringify(res));

        if (res.version < 38) {
            alert ('older firefox version running. Update to latest version for screenshare');
            d.reject ('older firefox version running');
            return d.promise ();
        }

        /* TODO check url subdomain wiziq.com
         * if not reject
         */

		check_capability()
			.then(
				screenshare_supported.bind(null, d, 'firefox'),
				screenshare_not_supported.bind(null, d)
			);

        return d.promise ();
    }

	function screenshare_supported(d, browser, extension_installed) {
		/*
		 * If the extension is not installed then
		 * prompt the user to install. */
		log.info('extension_installed : ' + extension_installed);
		if (!extension_installed) {
			prompt_for_installation (browser);
			return d.reject('Extension needs to be installed');
		}

		really_start ()
			.then(
				function () {
					log.info ('screenshare started');
					return d.resolve ();
				},
				function (err) {
					return d.reject (err);
				}
			);
		return d.promise();
	}

	function screenshare_not_supported (d, err) {
		f_handle_cached.notify.alert('Screenshare Error', err, 'danger', {
			non_dismissable : true,
			button : { }
		});
		return d.reject(err);
	}

    function ff_screen_addon_path () {
        return 'https://addons.mozilla.org/en-US/firefox/addon/screenshare-wiziq-vc/';
    }


    function chrome_screen_ext () {
        return 'https://chrome.google.com/webstore/detail/' + custom_config_cached.chromeextensionid;
    }

	/*
	 * Handle the modal */
	var modal;
	function prompt_for_installation (browser) {
        var href;

        switch (browser) {
            case 'firefox':
                href = ff_screen_addon_path();
                break;
            case 'chrome':
                href = chrome_screen_ext();
                break;
            default:
                break;
        }

		modal = $('[data-remodal-id=browser-extension-download]').remodal({ closeOnConfirm : false });

		$("a[href='chromeSSExtPath']").attr('href', href);
		modal.open();
	}

	function close_modal () {
		modal.close ();
	}

	function set_handlers () {
		tokbox.set_pub_handlers ({
			'accessAllowed'        : accessAllowed,
			'accessDenied'         : accessDenied,
			'accessDialogOpened'   : accessDialogOpened,
			'accessDialogClosed'   : accessDialogClosed,
			'destroyed'            : destroyed,
			'mediaStopped'         : mediaStopped,
			'streamCreated'        : streamCreated,
			'streamDestroyed'      : streamDestroyed,
		});
	}

	/*
	 * ___________ Handlers ____________
	 *
	 */

	function accessAllowed (ev) {
		/* All is well - do nothing */
		log.info('ss accessAllowed');
	}
	function accessDenied (ev) {
		log.error ('it seems, access to local media was denied by the user. TODO: Show a modal error here.');
	}
	function accessDialogOpened (ev) {
		/* All is well - do nothing */
		log.info('ss accessDialogOpened');
	}
	function accessDialogClosed (ev) {
		/* All is well - do nothing */
		log.info('ss accessDialogClosed');
	}
	function destroyed (ev) {
		log.info ('publisher element destroyed: reason: ' + ev.reason);
	}
	function mediaStopped (ev) {
		/* All is well - do nothing */
		log.info('mediaStopped');
	}
	function streamCreated (ev) {
		/*
		 * Change state to enabled
		 */
		var ss_nav = $('#widget-nav li#nav-screenshare');

		if (!ss_nav.hasClass('enabled')) {
			ss_nav.addClass('enabled');
		}

		/*
		 * Update tooltip
		 */
		var tool_tip = ss_nav.find('.tooltip-content');
		tool_tip.text('Stop Screenshare');

		log.info ('ss streamCreated: ev = ', ev);
		var stream = ev.stream;
		layout.reveal_video (my_container);
	}
	function streamDestroyed (ev) {
		/*
		 * Change state to default
		 */
		var ss_nav = $('#widget-nav li#nav-screenshare');

		if (ss_nav.hasClass('enabled')) {
			ss_nav.removeClass('enabled');
		}

		/*
		 * Update tooltip
		 */
		var tool_tip = ss_nav.find('.tooltip-content');
		tool_tip.text('Screenshare');

		log.info ('streamDestroyed: ev = ', ev);
		layout.giveup_container (my_container, ev.reason);
		publisher = null;
	}

	return screenshare;

});
