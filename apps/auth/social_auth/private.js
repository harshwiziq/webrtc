var express           = require( 'express' );
var $                 = require( 'jquery-deferred' );
var app               = express.Router();
var log               = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/private' });
var crypt             = require( 'common/crypt');

var identity = {
	vc_id       : '--none-yet--',                   /* Assigned by the session controller */
	vc_auth_ts  : '--none-yet--',
	auth_via    : '--none-yet--',
	id          : '--random-default-id',
	displayName : 'buddha is smiling',
	name        : null,
	nickname    : null,
	birthday    : null,
	anniversary : null,
	gender      : null,
	utcOffset   : null,
	emails      : null,
	phoneNumbers: null,
	photos      : null,
	addresses   : null

};

function validate (e) {
	var _d = null;
	var d;

	try {
		_d = crypt.decipher ('private_url', e);
		d = JSON.parse (_d);
	}
	catch (err) {
		log.error ({ e : e }, 'decrypt or JSON parse failed');
		return null;
	}

	return d;
}

app.get ('/', function (req, res, next) {
	var origin = req.cookies.wiziq_origin;
	var decrypted = null;

	if (!req.query.e) 
		return res.status (400).send ('no e : malformed request');

	if (!(decrypted = validate (req.query.e)))
		return res.status (400).send ('non-decryptable e : malformed request');

	req.user = {
		id          : decrypted.name,
		displayName : decrypted.display
	};

	/*
	 * The rest will be taken care of by the next middleware */
	req.auth_via = 'private';
	return next ();

});

function create_identity ( User, auth_via ) {
	identity.vc_auth_ts     = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
	identity.auth_via       = auth_via;
	identity.id             = User.id;
	identity.displayName    = User.displayName.trim();

	/* encrypt identity and return */
	var MAX_SIZE_COOKIE = 4096;
	var auth_string = JSON.stringify ( identity );

	log.info (" auth_string "+ auth_string);

	/* for now there is no encryption, but whenever we add encryption code
	 *      * we will need to encrypt the message here.
	 *           */

	return auth_string;
}

module.exports = app;
