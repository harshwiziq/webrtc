var url = require('url');
var log = require('auth/common/log');

controller = {};

/* show login page */
controller.show = function (req, res, next) {
	var authvia = req.cookies.wiziq_auth_via;
	var query   = url.parse (req.url).query;
	
	if (!authvia || authvia === 'anon') {

		res.cookie('wiziq_auth_via', 'anon', {
			maxAge : 60*60,
			path   : '/',
			secure : true
		});

		return res.render('login.mat-design.jade', { user: req.user });
	}

	switch (authvia) {
		case 'wiziq':
			log.debug ('redirecting to auth wiziq');
			res.redirect ('auth/wiziq?' + query);
			break;

		case 'google':
			res.redirect ('auth/google?' + query);
			break;

		case 'facebook':
			res.redirect ('auth/fb?' + query);
			break;

		case 'private':
			log.debug ('redirecting to auth private');
			res.redirect ('auth/private?' + query);
			break;
		case 'wiziq-anon':
			log.debug ('redirecting to auth wiziq-anon');
			res.redirect ('auth/wiziq-anon?' + query);
			break;

		default:
			res.cookie('wiziq_auth_via', 'anon', {
				maxAge : 60*60,
				path   : '/',
				secure : true
			});

			return res.render('login.mat-design.jade', { user: req.user });
	}
};

module.exports = controller;
