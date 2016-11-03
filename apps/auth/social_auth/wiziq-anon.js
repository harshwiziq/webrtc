var express           = require( 'express' );
var $                 = require( 'jquery-deferred' );
var app               = express.Router();
var log               = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/wiziq-anon' });
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

function hash ( display_name ) {

	var d = new Date().getTime();
	var name = display_name.replace(/\s+/g,"");
	d += name;
	d += process.hrtime ()[1];

	var hash = 0, i, chr;

	for (i = 0; i < d.length; i++) {

		chr   = d.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0;

	}

	return name + '_' + Math.abs(hash).toString();
}

app.get ('/', function (req, res, next) {
	var display_name = decodeURIComponent (req.query.display_name);

	if (!display_name || !req.query.display_name) {
		log.error({ display_name : display_name, query : req.query.display_name }, 'no display name');
		return res.status (400).send ('no display name');
	}

	var encrypted_user_info = req.query.u;
	var secure_user_info;

	if (encrypted_user_info) {
		try {
			secure_user_info = crypt.decipher('role_key', encrypted_user_info);
			secure_user_info = JSON.parse(secure_user_info);
			log.info ({ secure_user_info : secure_user_info }, 'deciphered info at wiziq-anon');
		}
		catch (err) {
			log.error({ encrypted : encrypted_role_info, err : err }, 'load_config decryption error');

		}
	}
	try {
		req.user = {
			id          : secure_user_info ? secure_user_info.id.toString() : hash (display_name),
			displayName : display_name
		};
	}
	catch (err) {
		log.error({ Error : err }, 'Secure user info exception caught.');
	}

	/*
	 * The rest will be taken care of by the next middleware */
	log.info ({ user : req.user }, 'auth wiziq-anon user');

	req.auth_via = 'wiziq-anon';
	return next ();

});

module.exports = app;
