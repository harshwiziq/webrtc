var $         = require('jquery-deferred');
var moment    = require('moment');
var cache     = require('common/cache').init('vc-sess-config', 4*60*60*1000);
var crypt     = require('common/crypt');
var path      = require('path');
var async     = require('async');
var backend   = require('landing/controllers/backend-if');
var log       = require('landing/common/log');
var templates = require('landing/controllers/templates');

controller = {};
controller.load_and_cache_config = function (req, res, next) {

	var class_id = req.params.class_id;

	cache.get(class_id)
		.then(
			function (sess_config) {

				/* Cache hit */

				if (!req.wiziq)
					req.wiziq = {};

				req.wiziq.sess_config = JSON.parse(sess_config);
				log.debug ({ class_id : class_id, sess_config : req.wiziq.sess_config }, 'session config (cached)');
				return next();
			},

			function () {

				/* Cache miss */

				backend.get_config (class_id, function (err, sess_config, backend_response) {

					if (err) {
						/*
						 * This block caters to the scenario where the backend has the information
						 * about a class, but provisioning does not. Send more debug information to
						 * browser */

						/*
						 * If this is an XHR request it is likely to get the status 
						 * of the page. next () */
						if (req.xhr)
							return next ();

						if (!backend_response) {
							return next ({
								message : err,
								status  : 404,
								code    : 'NOCLASSCONFIG'
							});
						}

						return res.render ('framework/misc/class-not-found-debug', {
							backend_config : backend_response,
							err            : err
						});
					}

					log.debug ({ class_id : class_id, sess_config : sess_config }, 'session_config for class (from provisioning)');

					/*
					 * If the class is not yet started then return a notyetstarted type of page instead */
					if (not_yet_started (sess_config)) {

						/*
						 * If this is an XHR request it is likely to get the status 
						 * of the page. next () */
						if (req.xhr) {
							req.wiziq = { sess_config : sess_config };
							return next ();
						}

						return res.render('framework/misc/notyetstarted', {
							backend_config : backend_response,
							sess_config    : sess_config,
							server_time    : (new Date()).toISOString()
						});
					}

					var expire_after = calculate_key_expiry (sess_config);
					cache.set (class_id, JSON.stringify(sess_config), expire_after);

					if (!req.wiziq)
						req.wiziq = {};

					req.wiziq.sess_config = sess_config;
					return next();
				});
			}
		);
};

controller.load_page = function (req, res, next) {

	var class_id = req.params.class_id;
	var _log = req.log.child ({ class_id : class_id });

	/*---------------------------------------
	 *
	 * Things to do:
	 * 		- load the session configuration
	 * 		  from the core backend (already done 
	 * 		  in 'load_and_cache_...'
	 *
	 * 		- load the templates
	 * 			+ render the page
	 *
	 * 		- connect to provision server
	 * 			+ get the session instance information
	 *
	 *--------------------------------------*/

	sess_config = req.wiziq.sess_config;
	var css = [];

	if (!sess_config)
		return next({
			status : 404,
			code   : 'NOSESSCONFIG',
			message: 'null sess_config for Class ID "' + class_id + '"'
		}, req, res);

	var _templates = templates.load (_log, __dirname + '/../views/framework/templates', sess_config);

	/*
	 * Get a list of all CSS files to be loaded */
	for (var r = 0; r < sess_config.resources.length; r++ ) {
		if (sess_config.resources[r].display_spec.css) {
			css.push ({
				resource: sess_config.resources[r].name,
				css:      sess_config.resources[r].display_spec.css
			});
		}
	}

	var profile = sess_config.display_profile;

	_log.info ('loading structure ' + profile.structure + ', layout ' + profile.layout + ', theme ' + profile.theme);

	res.render ('framework/' + profile.structure + '/vc-frame', { 
		title      : sess_config.meta_info.title,
		layout     : profile.layout,
		theme      : profile.theme,
		_templates : JSON.stringify(_templates),
		identity   : JSON.stringify(req.wiziq.user),
		photo      : req.wiziq.user.photos ? req.wiziq.user.photos[0].value : null,
		name       : req.wiziq.user.displayName,
		role       : 'attendee',
		styles     : css,
		unoptimized: req.wiziq.debug
	});
};

controller.status = function (req, res, next) {

	if (!req.wiziq || !req.wiziq.sess_config)
		return res.status (200).send ({
			state : 'unknown'
		});

	var sess_config = req.wiziq.sess_config;

	res.status(200).send({
		state : sess_config.state
	});
};

controller.load_config = function (req, res, next) {
	if (!req.wiziq || !req.wiziq.sess_config)
		return res.status(404).send({
			status : 404,
			code   : 'NOSESSCONFIG',
			message: 'null sess_config for Class ID "' + class_id + '"'
		}, req, res);

	var encrypted_role_info = req.query.u;
	var secure_user_info = null;
	var auth_via = req.query.auth_via;      /* Needed for wiziq-api users  */
	
	log.info({ auth_via : auth_via }, "auth_via from query");

	if (encrypted_role_info) {
		try {
			secure_user_info = crypt.decipher('role_key', encrypted_role_info);
			secure_user_info = JSON.parse(secure_user_info);
			log.info ({ secure_user_info : secure_user_info }, 'deciphered role info');
		}
		catch (err) {
			log.error({ encrypted : encrypted_role_info, err : err }, 'load_config decryption error');
		}
	}

	var sess_config_pruned = prune (req.wiziq.sess_config, req.wiziq.user, secure_user_info, auth_via);

	return res.status(200).send (sess_config_pruned);
};

function set_my_perms (sess_config, user, secure_user_info, auth_via) {
	var perms_obj = sess_config.perms && sess_config.perms.default || {};
	var attendees = (sess_config.attendees && sess_config.attendees.named) || [];
	var role      = "default-anon";

	if ( secure_user_info &&
		 secure_user_info.role &&
			(user.id === secure_user_info.id ||
			 auth_via === 'wiziq-anon' ||
			 user.id === '*')
	   ) {

		role = secure_user_info.role;
		if (sess_config.perms && sess_config.perms[role])
			perms_obj = sess_config.perms[role];

		sess_config.perms = perms_obj;
		sess_config.role  = role;
		return;
	}

	for (var i = 0; i < attendees.length; i++) {
		if (attendees[i].id === user.id && attendees[i].auth_via === user.auth_via) {
			role = attendees[i].role;

			if (sess_config.perms && sess_config.perms[role])
				perms_obj = sess_config.perms[role];

			break;
		}
	}

	sess_config.perms = perms_obj;
	sess_config.role  = role;
}

function prune (sess_config, user, data, auth_via) {
	/*
	 * send only the necessary things
	 *     - less data on network
	 *     - better security          */

	/*
	 *  extract the info required */
	set_my_perms (sess_config, user, data, auth_via);

	/*
	 * delete chunks and add required info */
	delete sess_config.__v;
	delete sess_config._id;
	delete sess_config.attendees;

	return sess_config;
}

function not_yet_started (sess_config) {
	if (sess_config.state !== 'started')
		return true;

	return false;

	/*
	 * We possibly dont' need all this logic 
	var now = moment();
	var start_time;

	if (sess_config.time_spec.provision_time)
		start_time = moment (sess_config.time_spec.provision_time);
	else
		start_time = moment (sess_config.time_spec.starts);

	var time_left = moment.duration (start_time.diff(now));

	if (time_left.asSeconds() > 0)
		return true;

	return false;
   */
}

function calculate_key_expiry (sess_config) {
	/*
	 * For an eternally running class, the cache expiry should essentially serve the purpose
	 * resonding fast to the joinee, who would usually join, say within a few minutes of
	 * each other. Maybe setting the cache for 5 minutes should suffice. */
	if (sess_config.time_spec.duration === -1)
		return 5*60;

	var start_m  = moment (sess_config.time_spec.starts);
	var duration = moment.duration (sess_config.time_spec.duration, 'minutes');
	var end_m    = start_m.add (duration);
	var expiry   = moment.duration (end_m.diff (moment()));

	return Math.round (expiry.asSeconds ());
}

module.exports = controller;
