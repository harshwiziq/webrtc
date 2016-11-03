var $                = require('jquery-deferred');
var events           = require('events');
var log              = require('api-backend/common/log').child({ module : 'controllers/prov' });
var utility          = require('api-backend/common/utility');
var class_doc        = require('api-backend/models/class-config');
var display_doc      = require('api-backend/models/display-profile');
var perms_doc        = require('api-backend/models/perms-profile');
var resources_doc    = require('api-backend/models/resource-profile');
var default_config   = require('api-backend/common/default-config');

var controller = {};
controller.emitter = new events.EventEmitter ();

/* get class config.
 * This structure returned to provisioning server must contain elaborated and
 * complete class configuration.
 * Corresponding to display profile name, fill display profile structure.
 * Fetch all resources info which are needed in the class.
 */

controller.get = function (req, res, next) {

	var class_id = req.class_id;

	if (!class_id)
		return res.status(400).send('no class-id specified');

	var query = { class_id : class_id };
	
	class_doc.get (query)
		.then (
			function (class_raw) {

				var __class = class_raw.toObject();

				/*
				 * Fill in the display profile, resource profiles and others before
				 * sending it to the provisioning */

				$.when (get_res_profile (__class), get_display_profile (__class), get_perms_profile (__class))
					.then (
						function (resources, display_profile, perms) {
							
							/* 
							 * if object is undefined/null i.e. not a part of class config
							 * returned by db, make it as an empty object and then
							 * perform jQuery extend 
							 */   
							if (!__class.resources)
								__class.resources = {};
							
							if (!__class.display_profile)
								__class.display_profile = {};
							
							if (!__class.perms)
								__class.perms = {};

							$.extend ( __class.resources, resources );
							$.extend ( __class.display_profile, display_profile );
							$.extend ( __class.perms, perms );

							log.info ( { class_cooked : __class }, 'cooked class configuration (for _provisioning)');
							res.status( 200 ).send( __class );
							return;
						},
						function (err) {
							log.error({ Error : err }, 'Profile fetch error (for _provisioning)');
							res.status(500).send({Error : err});
						}
					);
			},
			function ( err ) {
				res.status( 500 ).send( err );
			}
		);

};

/*
 * TODO : May be, lock_class and update_class_status can be
 *        the same function as essentially, both are updating 
 *        class status
 */ 

/*----------------------------------------------------------* 
 * LOCK CLASS  :  
 *     Get class config                 ( ALLOWED )
 *     Create class                     ( ALLOWED )
 *     Update class 
 *             modify time spec         ( ALLOWED )
 *             cancel class             ( ALLOWED )
 *             any other update         ( NOT ALLOWED)
 *     Remove class                     ( ALLOWED )
 *-----------------------------------------------------------*/
controller.lock_class = function (req, res, next) {
	var class_id = req.body.class_id;
	var class_config = { status : "locked" };

	class_doc.update ( class_config, class_id )
		.then (
			function ( result ) {
				
				/* emit class status event, to be caught wherever needed 
				 * TODO : event name should be specific to client, fetched
				 *        from white labelling info of client
				 */
				
				controller.emitter.emit ('class_status', class_config.status, class_id);
				log.info ({class_id : class_id, status : class_config.status }, 'emitting event "class_status"');

				res.status( 200 ).send( result );
			},
			function ( err ) {
				res.status ( 500 ).send ( err );
			}
		);
};

/* class status update called by provisioning.
 * This consistancy has to be maintained as wizIQ needs
 * class status as well as we may need for native API 
 * in future */
controller.update_class_status = function (req, res, next) {
	var class_id = req.body.class_id;
	var updated_config = { 
		status        : req.body.status,
		status_detail : typeof req.body.err === 'string' ? req.body.err : JSON.stringify (req.body.err)
	};

	/* update db */
	class_doc.update (updated_config, class_id)
		.then (
			function (result) {
				/* emit class status event, to be caught wherever needed 
				 * TODO : event name should be specific to client, fetched
				 *        from white labelling info of client
				 */
				controller.emitter.emit ('class_status', updated_config.status, class_id);

				res.status (200).send (result);
			},
			function (err) {
				res.status (err.status).send (err.message);
			}
		);
};


/******************************************
 * Internals
 ******************************************/ 

function get_display_profile (__class) {
	var _d = $.Deferred();

	display_doc.get ( __class.display_profile.name )
		.then (
			function (result) {
				_d.resolve(result);
			},
			function (err) {
				log.warn ({ class_id : __class.class_id, err : err }, 'error geting display profile. falling back to default');
				_d.resolve(default_config.display_profile);
			}
		);

	return _d.promise();

}

function get_res_profile (__class) {
	var _d = $.Deferred();
	
	set_profile_name ( __class.resources);
 	
	resources_doc.get ( __class.resources )
		.then (
			function (result) {
				_d.resolve (result);
			},
			function (err) {
				log.warn ({ class_id : __class.class_id, err : err }, 'error geting resource profile. falling back to default');
				_d.resolve ( default_config.resources ( __class.resources ));
			}
		);

	return _d.promise();

}

function set_profile_name (__resources) {
	var _len     = __resources.length;
	var _default = 'default';

	for (var i = 0; i < _len; i++) {
		if (__resources[i].profile_name)
			continue;

		__resources[i].profile_name = _default;
	}
}

function get_perms_profile (__class) {
	var _d       = $.Deferred();
	var _default = 'default';
	var perms    = get_distinct_perms (__class, _default);

	if (perms && perms.Error) {
		_d.reject({ message : perms.Error }, 'Unable to fetch perms to be sent for lookup in perms_profile');
		return _d.promise();
	}
	
	log.info ({ Perms : perms }, 'distinct perms for class config');
	
	perms_doc.get_multiple (perms)
		.then (
			function (result) {
				var perms_map = create_perms_map (result, _default, __class.attendees.explicit_anon);
				_d.resolve (perms_map);
			},
			function (err) {
				_d.reject (err);
			}
		);	

	return _d.promise();
}

function get_distinct_perms (__class, __default) {
	
	var att_obj = __class.attendees;

	/* attendee object empty */
	if (!Object.keys(att_obj).length) {
		log.error ('Attendees object empty');
		return ({ Error : 'Attendees object empty' });
	}
	
	/* named attendees array empty */ 
	if (!att_obj.named.length) {
		log.error ('Named attendees array empty');
		return ({ Error : 'Named attendees array empty' });
	}	
	
	var attendees = att_obj.named;
	var len= attendees.length;
	var n = {};
	var distinct_perms = [];

	for (var i = 0; i < len; i++) {	
		if (!n [attendees [i].role]) {
			n [attendees[i].role] = true; 
			distinct_perms.push ({ "name" : attendees[i].role}); 
		}
	}
	
	/* if "explicit_anon" param of class_config is set,
	 * add an entry to "distinct_perms" for it's value,
	 * else add "default" perms profile 
	 */
	var anon;
	if (att_obj.explicit_anon) {
		anon = att_obj.explicit_anon;
	}
	else {
		anon = __default;
	}

	if (utility.is_entry_present ("name", anon ,distinct_perms)) {
		return distinct_perms;
	}

 	distinct_perms.push ({ "name" : anon });	

	return distinct_perms;
}

/* create a map corresponding to perms_array.
 * Depending on whether anon role is defined explicitly
 * or not, create the perms_map
 */
function create_perms_map (__perms_array, __default, __explicit_anon) {
	
	var _perms = {};
	
	for (var i = 0; i < __perms_array.length; i++) {
		_perms [__perms_array[i].name] = __perms_array[i].perms;
	}
	
	/* if anon defined explicitly && anon's value is not same as
	 * default value, replace specific key 
	 * with default before sending to provisioning server 
	*/
	if (__explicit_anon && __explicit_anon != __default) {
		_perms [__default] = _perms [__explicit_anon];
		delete _perms [__explicit_anon];	
	}

	return _perms;

}


module.exports = controller;
