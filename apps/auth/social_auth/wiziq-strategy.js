var util                 = require( 'util' );
var OAuth2Strategy       = require( 'passport-oauth2' );
var InternalOAuthError   = require( 'passport-oauth2' ).InternalOAuthError;
var log                  = require( 'auth/common/log' ).child({ 'sub-module' : 'auth/wiziq-strategy' });

function Strategy ( options, verify ) {
	options = options || {};
	log.debug ({ Strategy_options : options }, 'options from wiziq_pp strategy');
	this.profile_url = options.profileURL ? options.profileURL : "";
	log.debug({ profile_url : this.profile_url }, 'profile url set');
	options.authorizationURL = options.authorizationURL /*|| 'http://auth.wiztest.authordm.com/External/Account/GetExternalLogin'*/;
	options.tokenURL = options.tokenURL /*|| 'http://auth.wiztest.authordm.com/api/account/authorize'*/;

	OAuth2Strategy.call ( this, options, verify );
	this.name = 'wiziq';
}

util.inherits ( Strategy, OAuth2Strategy );

Strategy.prototype.userProfile = function ( accessToken, done ) {

	log.info({ token : accessToken }, 'Access token');
	log.debug({ Profile_url_on_get : this.profile_url }, 'Profile url get');

	this._oauth2.useAuthorizationHeaderforGET ( true ); 
	this._oauth2.get ( this.profile_url /*|| 'http://auth.wiztest.authordm.com/api/account/UserInfo'*/, accessToken, function ( err, body, res ) {
		if ( err ) { 
			log.error ( { getfail : err }, 'get profile failed' );
			return done ( new InternalOAuthError ( 'failed to fetch user profile', err ) ); 
		}

		try {
			var json = JSON.parse ( body );

			var profile          = { provider : 'wiziq' };

			profile.id           = typeof json.wizIQId === 'number' ? json.wizIQId.toString() : json.wizIQId;
			/*
			 * profile.displayName updated to fix WBRTC-271 issue  
			 */ 
			profile.displayName  = json.name || json.displayName;
			profile.name         = json.name;

			if ( json.birthday )
				profile.birthday = json.dob;

			if ( json.email ){
				profile.emails   = [];
				profile.emails[0] = {
					value : json.email,
					primary : true
				};
			}

			if ( json.gender )
				profile.gender = json.gender;

			var photo = json.largeUserImagePath || json.mediumUserImagePath ||json.smallUserImagePath;
			
			if ( photo ) {
				profile.photos = [];
				profile.photos[0] = {
					value : photo,
					primary : true
				};
			}

			if ( json.address ) {
				profile.addresses   = [];
				profile.emails[0]   = {
					value : json.address,
					primary : true
				};
			}

			profile.phoneNumbers = [];
			
			if ( json.mobilePhone ) {
				profile.phoneNumbers.push (
					{
						value : json.mobilePhone,
						type  : 'other' 
					}
				);
			}

			if ( json.homePhone ) {
				profile.phoneNumbers.push (
					{
						value : json.homePhone,
						type  : 'home'
					}
				);
			}

			if ( json.workPhone ) {
				profile.phoneNumbers.push (
					{
						value : json.workPhone,
						type  : 'work'
					}
				);
			}

			profile._raw = body;
			profile._json = json;

			log.info ( { Profile : profile }, 'PROFILE' );
			done ( null, profile );
		} catch ( e ) {
			done ( e );
		}
	});
};

exports = module.exports = Strategy;

exports.Strategy = Strategy;
