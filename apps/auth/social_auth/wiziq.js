var passport          = require( 'passport' );
var wiziq_strategy    = require( 'auth/social_auth/wiziq-strategy' ).Strategy;
var express           = require( 'express' );
var app               = express.Router();
var log               = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/wiziq' });
var $                 = require( 'jquery-deferred' );
var encode_wiziq      = require( 'auth/social_auth/encode');
var cache             = require( 'auth/social_auth/cache' );


/* wizIQ strategy to be used for wizIQ_auth */
function passport_use_wiziq_strategy ( req, res ) {

	var _d = $.Deferred();

	passport.use(new wiziq_strategy({
			profileURL : req.user_credentials.profile_url,
			authorizationURL : req.user_credentials.authorization_url,
			tokenURL : req.user_credentials.token_url,
			clientID: req.user_credentials.client_id,
			clientSecret: req.user_credentials.client_secret,
			callbackURL: req.user_credentials.callback_url,
		},
		function(accessToken, refreshToken, params, profile, cb) {
			log.info({ profile : profile }, "passport verify callback");
			log.info(accessToken, "accessToken received");
			cb( null, profile );
		}
	));

	_d.resolve();
	return _d.promise();
}

app.get('/callback',
		passport.authenticate('wiziq', { 
			successRedirect: '/auth/auth/wiziq/account',
			failureRedirect: '/login' 
		})
	   );

app.get('/account', ensure_authenticated, function(req, res, next) {
	/* fill in the mandatories */
	fill_in_mandatories (req.user);

	/*
	 * The rest will be taken care of by the next middleware */
	req.auth_via = 'wiziq';
	return next ();
}
);

function fill_in_mandatories (user) {
    if (user.displayName)
        return;

    if (user.emails && user.emails.length) {
	        user.displayName = user.emails[0].value;
	        return;
	    }

    /* Else we fallback oon ID */
    user.displayName = user.wizIQId;
}



app.get('/',
	    fetch_data_from_cache,
		passport_init,
		passport.authenticate('wiziq')
);

/* middleware to send request to passport module */
function passport_init (req, res, next) {

    passport_use_wiziq_strategy ( req, res )
		.then(
			next,
			function fail( err ) {
				log.error (err,'Passport google strategy error');
				return res.render('error_auth.jade');
			}
		);
}

/* middleware to fetch data from cache */
function fetch_data_from_cache ( req, res, next) {
	cache.get ('wiziq')
		.then (
			function( _user_credentials ){
				req.user_credentials = _user_credentials;
				next();
			},
			function fail (err) {
				log.error (err, 'Cache get error');
				return res.render('error_auth.jade');
			}
		);
}

function ensure_authenticated ( req, res, next ) {

	log.info({ req : req.isAuthenticated() }, 'ensure middleware');

	if (req.isAuthenticated ()) { 
		return next();
	}

	return res.render('error_auth.jade');
}

module.exports = app;
