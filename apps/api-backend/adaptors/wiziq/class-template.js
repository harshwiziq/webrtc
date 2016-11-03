/*
 * Template structure used by the WizIQ path for class creation
 */

/* attendee structure */
function _attendee () {
	return {
		id        : 'xahaha', 
		auth_via  : 'none', 
		role      : 'presenter', 
		meta_info :  { } 
	};
}

function resource () { 
	return {
		name            : 'av',
		profile_name    : null,	
		role            : 'av', 
		display_name    : 'audio-video', 
		req_sess_info   : false, 
		display_spec    : {
			widget       : 'sss', 
			templates    : [], 
			css          : [] 
		},
		custom          : { } 
	};
}

function class_config () {

	return {
		class_id : '--this-is-not-the-class-id--',   
		time_spec : {

			starts : null,
			duration : 0, 
			recurrence : {
				repeat    : 0, 
				/* weekly, daily, monthly, yearly, forever, never (all these will be codes ) */
				occurence : 0, 
				end_date  : null,
			},
			extendable : 0, 

		},
		/* created, queued, in-progress, cancelled, completed, failed, expired (all codes starting from 0) */
		status : 'frozen', 
		resources : [ new resource() ],
		/*
		 * Framework , version , displays etc ( can be per session as well
		 * may be part of 'profile' property )
		 */
		display_profile : {
			name      : 'default', 
			structure : 'classic-1', 
			layout    : 'classic-1', 
			theme     : 'sujits-vision' 

		},
		attendees : {

			max_attendees : 0,
		  	explicit_anon : null,
			named : [],
			presenter_entry_before_time : { type : Boolean }

		},
		profile : {

			/* white labelling info etc */
			company_info : {

				prov_server_name : 'default', 
				name             : 'WizIQ Inc.', 
				logo_url         : '/landing/public/images/wiziq-logo-new.png', 
				auth_type        : 'anon' 

			},
			class_profile : { } 

		},
		meta_info : {

			creator    : {  
				name  : null,
				id    : null,
				email : null
			},	
			creation_ts : null,
			title       : 'WizIQ Class Structure Template' 

		},
		perms : {},
		urls  : {}
	};
}

module.exports = class_config;
