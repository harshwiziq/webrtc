var express          = require( 'express' );
var router           = express.Router();
var log              = require( 'auth/common/log' ).child({ 'sub-module' : 'routes/social' });
var encode           = require( 'auth/social_auth/encode' );
var anon_auth        = require( 'auth/social_auth/anon' );
var fb_auth          = require( 'auth/social_auth/fb' );
var google_auth      = require( 'auth/social_auth/google' );
var wiziq_auth       = require( 'auth/social_auth/wiziq' );
var private_auth     = require( 'auth/social_auth/private' );
var wiziq_anon_auth  = require( 'auth/social_auth/wiziq-anon' );

router.use (function (req, res, next) {
	var origin = req.cookies.wiziq_origin;

	if (!origin) {
		log.error ({ cookies : req.cookies }, 'cannot determine the origin of the auth request. aborting');
		return res.status (400).send ('bad request : indeterminate origin');
	}

	req.wiziq_origin = origin;
	next ();
});

/* different routes for authentication */
router.use ( '/anon',    anon_auth,    send_identity );
router.use ( '/google',  google_auth,  send_identity );
router.use ( '/fb',      fb_auth,      send_identity );
router.use ( '/wiziq',   wiziq_auth,   send_identity );
router.use ( '/private', private_auth, send_identity );
router.use ( '/wiziq-anon', wiziq_anon_auth, send_identity );

function send_identity (req, res, next) {

	if (!req.auth_via) {
		log.error ('no auth-via');
		log.error (req.user, 'req.user = ');
		/*
		 * This should'nt happen */
		return res.status (500).send ('internal error : no auth-via');
	}

	var identity =  encode.create_identity (req.user, req.auth_via);

	res.cookie('wiziq_auth' , identity, {
		maxAge : 1000*60*60    /* expires in an hour */ 
	});

	/* decoding of origin required to get pure origin url */ 	
	return res.redirect (decodeURIComponent (req.wiziq_origin));
}

module.exports = router;





