var crypt          = require ( 'common/crypt' );
var log            = require ( 'auth/common/log' ).child({ 'sub-module' : 'auth/encode' } );

var exports = module.exports = {};

function create_identity ( User, auth_via )
{
	if (!User.id)
		throw 'cannot create identity : no id';
	if (!auth_via)
		throw 'cannot create identity : no auth_via';
	if (!User.displayName)
		throw 'cannot create identity : no displayName';

	identity.vc_auth_ts     = new Date().toISOString();
	identity.auth_via       = auth_via;
	identity.id             = User.id;
	identity.displayName    = User.displayName.trim ();
	identity.name           = User.name || null;
	identity.nickname       = User.nickname || null;
	identity.birthday       = User.birthday || null;
	identity.anniversary    = User.anniversary || null;
	identity.gender         = User.gender || null;
	identity.utcOffset      = null; /* not sure how we'll get this */
	identity.emails         = User.emails && User.emails.length ? User.emails : null;
	identity.photos         = User.photos && User.photos.length ? User.photos : null;
	identity.addresses      = User.addresses && User.addresses.length ? User.addresses : null;
	identity.phoneNumbers   = User.phoneNumbers && User.phoneNumbers.length ? User.phoneNumbers : null;

	/* set primary attribute , if not set already */
	setPrimaryAttribute(identity.emails);
	setPrimaryAttribute(identity.photos);
	setPrimaryAttribute(identity.addresses);
	setPrimaryAttribute(identity.phoneNumbers);

	return encrypt ( identity );
}


function encrypt ( identity ) {
	var MAX_SIZE_COOKIE = 4096;
	var auth_string = encodeURIComponent (JSON.stringify ( identity ));

	if (Buffer.byteLength( auth_string ) > MAX_SIZE_COOKIE) {
		auth_string = "error: size_limit_exceeded";
	}

	log.info( {Info : identity},'Auth identity module');

	auth_string = crypt.encipher ('auth', auth_string);
	return auth_string;
}



/* explicitly setting primary attribute for composite array type values
 * setting only the first entry as the primary one */
function setPrimaryAttribute ( variable )
{
	if( variable === null )
		return;
	
	if( variable.length >= 1 )
		{
			for(var i = 0; i < variable.length; i++)
			{
				/* only if primary parameter is not present, set it as true for first array entry */ 
				if ( i === 0 )
					{
						if ( !variable[i].primary ) {
							variable[i].primary = true;
						}							
					}
					else variable[i].primary = false;
			} 
		}
}

/*
 * The identity is based (partially) off the specifications here:
 * Portable Contacts 1.0 Draft C
 * http://portablecontacts.net/draft-spec.html#schema
 */
var identity = {
	vc_id       : '--none-yet--',                   /* Assigned by the session controller */
	vc_auth_ts  : '--none-yet--',
	auth_via    : '--none-yet--',
	id          : '--random-default-id',
	displayName : 'buddha is smiling',
	name        : '--none-yet--',
	nickname    : '--none-yet--',
	birthday    : '--none-yet--',
	anniversary : '--none-yet--',
	gender      : '--none-yet--',
	utcOffset   : '--none-yet--',
	emails      : [
		{
			value   : '--random@email.com--',
			type    : '--none-yet',    /* work, home or other */
			primary : true
		},
	],
	phoneNumbers: [
		{
			value   : '--none-yet',
			type    : '--none-yet',    /* work, home or other */
			primary : true
		},
	],
	photos      : [
		{
			value   : '--none-yet',
			type    : '--none-yet',    /* work, home or other */
			primary : true
		},
	],
	addresses   : [
		{
			formatted     : '--none-yet',
			streetAddress : '--none-yet',
			locality      : '--none-yet',
			region        : '--none-yet',
			postalCode    : '--none-yet',
			country       : '--none-yet',
		},
	],

};

exports.create_identity = create_identity;
