var passport          = require( 'passport' );
var google_strategy   = require( 'passport-google-oauth2' ).Strategy;
var encode_google     = require( 'auth/social_auth/encode' );
var express           = require( 'express' );
var app               = express.Router();
var log               = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/google' });
var $                 = require( 'jquery-deferred' );
var cache             = require( 'auth/social_auth/cache' );

/*
 * google strategy to be used for google_auth
 */
function passport_use_google_strategy ( req, res ) {

	var _d = $.Deferred();
	
	passport.use(new google_strategy({
			clientID: req.user_credentials.client_id,
			clientSecret: req.user_credentials.client_secret,
			callbackURL: req.user_credentials.callback_url,
			passReqToCallback   : true
		},
		function(request,accessToken, refreshToken, profile, done) {
			process.nextTick(function () {
				return done(null, profile);
			});
		}	
	));

	_d.resolve();
	return _d.promise();
}

/* Passport session setup.
 * To support persistent login sessions, Passport needs to be able to
 * serialize users into and deserialize users out of the session.  Typically,
 * this will be as simple as storing the user ID when serializing, and finding
 * the user by ID when deserializing.  However, since this example does not
 * have a database of user records, the complete Google profile is
 * serialized and deserialized.
 */  
passport.serializeUser ( function ( user, done ) {
		done(null, user);
		});

passport.deserializeUser ( function ( obj, done ) {
		done(null, obj);
		});

app.get('/account', ensure_authenticated, function (req, res, next) {

	/* fill in the mandatories */
	fill_in_mandatories (req.user);

	/*
	 * The rest will be taken care of by the next middleware */
	req.auth_via = 'google';
	return next ();
});

function fill_in_mandatories (user) {
	if (user.displayName)
		return;

	if (user.emails && user.emails.length) {
		user.displayName = user.emails[0].value;
		return;
	}

	/* Else we fallback oon ID */
	user.displayName = user.id;
}

/* GET /
 * Use passport.authenticate() as route middleware to authenticate the
 * request.  The first step in Google authentication will involve
 * redirecting the user to google.com.  After authorization, Google
 * will redirect the user back to this application at /auth/auth/google/callback
 */
app.get('/',
	   	fetch_data_from_cache,
	   	passport_init, 
		passport.authenticate('google', 
							  { scope: [
								'https://www.googleapis.com/auth/plus.login',
								'https://www.googleapis.com/auth/plus.profile.emails.read']
							  })
	   );

/* middleware to send request to passport module */
function passport_init (req, res, next) {
	
	passport_use_google_strategy ( req, res )
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

	cache.get ('google')
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



/* GET google/callback
 * Use passport.authenticate() as route middleware to authenticate the
 * request.  If authentication fails, the user will be redirected back to the
 * login page.  Otherwise, the primary route function function will be called,
 * which, in this example, will redirect the user to the home page.
 */  
app.get('/callback',
		passport.authenticate( 'google', {
			successRedirect: '/auth/auth/google/account',
			failureRedirect: '/auth/login',
		})
	   );

/* Simple route middleware to ensure user is authenticated.
 * Use this route middleware on any resource that needs to be protected.  If
 * the request is authenticated (typically via a persistent login session),
 * the request will proceed.  Otherwise, the user will be redirected to the
 * login page.
 */   
function ensure_authenticated ( req, res, next ) {

	if (req.isAuthenticated ()) { 
		return next();
	}

   	return res.render('error_auth.jade');
}

module.exports = app;
