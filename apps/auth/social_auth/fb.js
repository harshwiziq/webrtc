var $                 = require( 'jquery-deferred' );
var passport          = require( 'passport' );
var facebook_strategy = require( 'passport-facebook' ).Strategy;
var encode_fb         = require( './encode.js' );
var express           = require( 'express' );
var app               = express.Router();
var log               = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/fb' });
var login             = require( 'auth/routes/login' );
var cache             = require( 'auth/social_auth/cache' );

/*
 * facebook strategy to be used for fb_auth
 */
function passport_use_facebook_strategy ( req, res )
{
	var _d = $.Deferred();

	passport.use(new facebook_strategy({
			clientID: req.user_credentials.client_id,
			clientSecret: req.user_credentials.client_secret,
			callbackURL: req.user_credentials.callback_url,
			profileFields: ['id', 'displayName', 'name', 'birthday', 'photos', 'emails', 'gender']

		},
		function(accessToken, refreshToken, profile, done) {
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
passport.serializeUser ( function( user, done ) {
		done(null, user);
		});

passport.deserializeUser ( function( obj, done ) {
		done(null, obj);
		});


app.get( '/account', ensure_authenticated, function( req, res, next ){
	/* fill in the mandatories */
	fill_in_mandatories (req.user);

	/*
	 * The rest will be taken care of by the next middleware */
	req.auth_via = 'facebook';
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
 * request.  The first step in facebook authentication will involve
 * redirecting the user to facebook.com.  After authorization, facebook
 * will redirect the user back to this application at /auth/auth/fb/callback
 */ 
app.get('/',
	    fetch_data_from_cache,
		passport_init,
	   	passport.authenticate('facebook',
							  function (req,res){}
							 )
	   );
/* middleware to send request to passport module */
function passport_init (req, res, next) {

    passport_use_facebook_strategy ( req, res )
        .then(
		    next,
		    function fail( err ) {
				log.error (err,'Passport facebook strategy error');
				return res.render('error_auth.jade');
			}
	     );
}

/* middleware to fetch data from cache */
function fetch_data_from_cache ( req, res, next ) {

    cache.get ('facebook')
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


/* GET fb/callback
 * Use passport.authenticate() as route middleware to authenticate the
 * request.  If authentication fails, the user will be redirected back to the
 * login page.  Otherwise, the primary route function function will be called,
 * which, in this example, will redirect the user to the home page.
 */   
app.get('/callback',
		passport.authenticate( 'facebook', {
			successRedirect: '/auth/auth/fb/account',
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
	if (req.isAuthenticated()) { 
		return next(); 
	}

	return res.render('error_auth.jade');
}


module.exports = app;


