var express           = require( 'express' );
var $                 = require( 'jquery-deferred' );
var app               = express.Router();
var log               = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/anon' });
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

	if (!display_name) {
		return res.status (400).send ('no display name');
	}

	req.user = {
		id          : hash (display_name),
		displayName : display_name
	};

	/*
	 * The rest will be taken care of by the next middleware */
	log.info ({ user : req.user }, 'auth anonymous user');

	req.auth_via = req.query.auth_via || 'anon';
	return next ();

});

module.exports = app;
