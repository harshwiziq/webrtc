/* this file manages all routes corresponding to calls from wiziq side */

var m              = require('moment');
var $              = require('jquery-deferred');
var events         = require('events');
var rest           = require('restler');
var helpers        = require('common/helpers');
var express        = require('express');
var class_template = require('api-backend/adaptors/wiziq/class-template');
var prov_if        = require('api-backend/models/provisioning-if');
var class_model    = require('api-backend/models/class-config');
var class_ctrl     = require('api-backend/controllers/class');
var user_ctrl      = require('api-backend/controllers/users');
var landing_model  = require('api-backend/models/landing-profile');
var perms_model    = require('api-backend/models/perms-profile');
var urls_model     = require('api-backend/models/urls');
var prov_ctrl      = require('api-backend/controllers/provisioning');
var end_pts_model  = require('api-backend/adaptors/wiziq/end-pts-model');
var cache          = require('api-backend/adaptors/wiziq/cache');
var utility        = require('api-backend/common/utility');
var log            = require('api-backend/common/log').child({ module : 'adaptors/wiziq/app'});

var app            = express.Router();
var emitter        = prov_ctrl.emitter;


app.param('classid',function(req, res, next, class_id) {
	req.class_id = class_id;
	next();
});


/*
 * CLASS SPECIFIC REQUESTS
 */

/* fetch class config */
app.get('/:classid/config', class_ctrl.get);

/* create a class and add it's info to db */
app.post('/:classid/config', create);

app.post('/config', create);

/* update a class, including cancelling the class because 
 * cancelling is effectively a status update
 */
app.put('/:classid/config', update);

/* remove/delete a class */
app.delete('/:classid/config', remove);

/*
 * ATTENDEE SPECIFIC REQUESTS
 */

/* add user_info to db (or) add user */
app.post('/:classid/user', add_user);

/* remove user_info from db (or) delete users */
app.delete('/:classid/user/:userid', remove_user);

/*
 * Methods
 */

function create (req, res, next) {
	var native_class;
	var wiziq_class_in = req.body;
	var class_id       = wiziq_class_in.ClassID;

	try {
		native_class = convert_to_native (wiziq_class_in, false);
		log.info({ native : native_class }, 'after converting to native');
	}
	catch (e) {
		return res.status(500).send({ Error : e });
	}

	var err;
	err = class_ctrl.validate_params (native_class);
	if (err) {
		log.error ({ Error : err }, 'error occured in validating params');
		return send_error (res, req, err);
	}

	var config = {
		class_id  : class_id,
		time_spec : native_class.time_spec,
		resources : native_class.resources
	};

	var prov_name = class_ctrl.extract_prov_name (native_class);

	class_model.create (native_class)
		.then (add_attendee.bind (null, wiziq_class_in),            send_error.bind (null, res, req))
		.then (class_ctrl.get_prov_server.bind (null, prov_name),   cleanup_send_error.bind (wiziq_class_in, res, req))
		.then (prov_if.create.bind (null, config),                  cleanup_send_error.bind (wiziq_class_in, res, req))
		.then (create_urls.bind (null, wiziq_class_in, true, req),  cleanup_send_error.bind (wiziq_class_in, res, req))
		.then (save_urls_to_cc.bind (null, class_id),               cleanup_send_error.bind (wiziq_class_in, res, req))
		.then (send_response.bind (null, req, res),                 cleanup_send_error.bind (wiziq_class_in, res, req))
		;
}


/*
 * add attendee only if attendee's role is present in
 * perms profile db, else send an error.
 * If anonymous role is explicitly defined, check for it as well.
 * Key - value pair in wiziq-class-config : 
 */  
function add_attendee (wiziq_class_in) {
	var _d = $.Deferred ();
	var user = new user_info (wiziq_class_in);
	
	/* 
	 * passing an array of roles to be searched in perms-profile.
	 * This is essentially done to inculcate the case in which a class
	 * has explicit "anonymous" role which is different from the "default"
	 * role
	 */ 
	var roles = [];
	roles.push ({ "name" : user.role });

	/* if "explicit_anon name" defined, add to array of roles to be searched
	 * before attendee addition 
	 */
	var anon = wiziq_class_in.ExplicitAnon;

	if (anon && !utility.is_entry_present ("name", anon, roles))
		roles.push ({ "name" : wiziq_class_in.ExplicitAnon });
	
	is_perms_role_present (roles)
		.then (class_model.add_user.bind (null, wiziq_class_in.ClassID, user), _d.reject.bind (_d))
		.then (_d.resolve.bind (_d),                                           _d.reject.bind (_d))
		;
	
	return _d.promise();
}

function is_perms_role_present (roles) {
	var _d = $.Deferred();

	perms_model.get_multiple (roles)
		.then (
			function (result) {
				_d.resolve();
			},
			function (err) {
				log.error ({ err:err }, 'Perms profile fetch error ( before add attendee )');
				_d.reject (err);
			}
		);
	
	return _d.promise();
}

function create_urls (wiziq_class_in, create_class, req) {
	var _d = $.Deferred ();
	var _user;
	var _class_id;	
	
	if (create_class) {
		_user     = new user_info (wiziq_class_in);
		_class_id = wiziq_class_in.ClassID;
	}
	else {
		_user     = wiziq_class_in.user;
		_class_id = wiziq_class_in.class_id;
	}

	if (_req_from (req) === 'wiziq-api') {
		_user.auth_via = 'wiziq-anon';
		_user.id = wiziq_class_in.PresenterEmail || (wiziq_class_in.CreatorID ? wiziq_class_in.CreatorID + "_" +  _user.id : _user.id);
	}

	landing_model.get ('default')
		.then (
			function (profile) {
				var urls = {};

				/* create anon_url for class creation request only */
				if (create_class) {
					urls.anon   = urls_model.create_anon (_class_id, profile[0]);
					urls.rec    = urls_model.create_rec (_class_id, profile[0], req);
				}
					
				var _display_name = _user.meta_info ? _user.meta_info.display_name : null;

				var att_url = urls_model.create_identified (_class_id, _user.auth_via, _user.id, _user.role, profile[0], _display_name);
				
				$.extend (urls, att_url);

				log.info({ urls : urls }, "url structure returned");
				_d.resolve (urls);
			},
			function (err) {
				_d.reject (err);
			}
		);

	return _d.promise ();
}

/*
 * save url info to class config.
 * This method has to finally go in controllers/class.js
 * but for now, it lies here.
 * TODO : When backend clean up is done, make sure this 
 * method finds its right place.
 */ 
function save_urls_to_cc (class_id, urls) {

	var d = $.Deferred ();
	var updated_config = {};
	
	updated_config.urls = {};
	/* save anon url only */
	updated_config.urls.anon = urls.anon;

	class_model.update (updated_config, class_id)
		.then (
			function (res) {
				d.resolve (urls);
			},
			function (err) {
				log.error ({Error : err, urls : updated_config.urls, class_id : class_id}, 'Landing urls db save error');
				d.reject (err);
			}
		);
		
	return d.promise();
}


/* Convert wiziq class config to native form. 
 *	   Parameters :
 *		1. wiziq_class_in : class_config info from wiziq
 *		2. update		 : boolean , if TRUE : call for update else call for create
 */		
function convert_to_native (wiziq_class_in, update) {
	
	log.info({ WizIQ_cc : wiziq_class_in }, 'Class config received from wiziq');
	var native_class = new class_template ();
	var err;

	if (!wiziq_class_in.ClassID) {
		err = 'no class_id';
		log.error ({ err:err, wiziq_class_in:wiziq_class_in }, 'conversion to native class format error');
		throw err;
	}

	if (!update && !wiziq_class_in.StartTime) {
		err = 'no start time';
		log.error ({ err:err, wiziq_class_in:wiziq_class_in }, 'conversion to native class format error');
		throw err;
	}

	if (!update && !wiziq_class_in.Duration) {
		err = 'no duration';
		log.error ({ err:err, wiziq_class_in:wiziq_class_in }, 'conversion to native class format error');
		throw err;
	}

	/*
	 * Cannot use class-template
	 * Because object should have only modified values
	 */
	if (update) {
		native_class = create_native(wiziq_class_in);
		return native_class;
	}

	/* fill class_config info */

	native_class.status                                = "created";
	native_class.class_id                              = wiziq_class_in.ClassID;
	native_class.time_spec.starts                      = m (new Date (wiziq_class_in.StartTime)).utc().toISOString();
	native_class.time_spec.duration                    = wiziq_class_in.Duration;
	native_class.time_spec.extendable                  = wiziq_class_in.ExtendedMinutes;
	native_class.meta_info.creator.name                = wiziq_class_in.CreatorName || null;
	native_class.meta_info.creator.id                  = wiziq_class_in.CreatorID;
	native_class.meta_info.creator.email               = wiziq_class_in.CreatorEmail;
	native_class.meta_info.creation_ts                 = m().toISOString();
	native_class.meta_info.title                       = wiziq_class_in.Title;	
	native_class.attendees.max_attendees               = wiziq_class_in.MaxUsers;
	native_class.attendees.explicit_anon               = wiziq_class_in.ExplicitAnon ? wiziq_class_in.ExplicitAnon : null;
	native_class.profile.company_info.name             = wiziq_class_in.CompanyName;
	native_class.profile.company_info.logoUrl          = wiziq_class_in.CompanyUrl;
	native_class.profile.company_info.auth_type        = wiziq_class_in.auth_via || 'anon';
	native_class.profile.company_info.prov_server_name = 'default';
	native_class.resources                             = add_resources (wiziq_class_in);

	return native_class;
}

function create_native (wiziq_class_in) {
	var native_class = {};

	check_unimplemented_params (wiziq_class_in);

	for (var key in wiziq_class_in) {

		/*
		 * since for a modify request, wizIQ sends us the
		 * entire class config JSON, there are null values 
		 * (which are not to be updated), we need not update
		 * those values
		 */
		if (wiziq_class_in [key] == null)
			continue;

		/* ..else */
		switch (key) {
			case 'ClassID':
				native_class.class_id                 = wiziq_class_in.ClassID;
				break;
			case 'Duration':
				native_class.time_spec                = native_class.time_spec || {};
				native_class.time_spec.duration       = wiziq_class_in.Duration;
				break;
			case 'Title':
				native_class.meta_info                = native_class.meta_info || {};
				native_class.meta_info.title          = wiziq_class_in.Title;
				break;
			case 'MaxUsers':
				native_class.attendees                = native_class.attendees || {};
				native_class.attendees.max_attendees  = wiziq_class_in.MaxUsers;
				break;
			case 'StartTime':
				native_class.time_spec                = native_class.time_spec || {};
				native_class.time_spec.starts         = m (new Date (wiziq_class_in.StartTime)).utc().toISOString();
				break;
			case 'RecordingReplay':
				native_class.resources = add_resources (wiziq_class_in);
				break;
		}
	}

	return native_class;
}

function error (err) {
	this.message = err.message;
	this.status  = err.status;
}

function check_unimplemented_params (wiziq_class_in) {
	var err = {};

	if (wiziq_class_in.PresenterEmail) {
		err.message = 'Modification of presenter-email is not yet supported';
		err.status  = 501;
		log.error({ err : err }, 'not yet implemented');
		throw new error (err);
	}
	if (wiziq_class_in.VCCultureName && (wiziq_class_in.VCCultureName).toLowerCase() !== 'en-us') {
		err.message = 'Modification of vc_culture_name is not yet supported';
		err.status  = 501;
		log.error({ err : err }, 'not yet implemented');
		throw new error (err);
	}
	if (wiziq_class_in.ReturnUrl) {
		err.message = 'Modification of return_url is not yet supported';
		err.status  = 501;
		log.error({ err : err }, 'not yet implemented');
		throw new error (err);
	}
	if (wiziq_class_in.StatusUrl) {
		err.message = 'Modification of status_url is not yet supported';
		err.status  = 501;
		log.error({ err : err }, 'not yet implemented');
		throw new error (err);
	}
}

function add_resources (wiziq_class_in) {
	var default_resource_list = [
		'menu-sidepush-classic',
		'av-tokbox-v2',
		'tabs-v1',
		'chat-box',
		'att-list',
		'content',
		'whiteboard-v1',
		'code-editor'
	];

	if (wiziq_class_in.RecordingReplay)
		default_resource_list.push ('recording');

	var res_arr = [];
	for (var i = 0; i < default_resource_list.length; i++)
		res_arr.push ({ name : default_resource_list[i] });

	return res_arr;
}

function user_info (wiziq_class_in) {
	return {
		id       : wiziq_class_in.PresenterID || wiziq_class_in.PresenterEmail,
		auth_via : wiziq_class_in.auth_via || 'anon',
		role     : 'wiziq-presenter', /* Need a better way of writing this, hard coding NOT GOOD */
		meta_info    : {
			display_name : wiziq_class_in.PresenterName
		}
	};
}

/* update call from wizIQ contains the entire class config
 * as in create call (discussed with wizIQ)
 */ 
function update (req, res, next) {
	var wiziq_class_in = req.body;
	var native_class;

	try {
		native_class = convert_to_native (wiziq_class_in, true);
		log.info({ native : native_class }, 'after converting to native');

		if (Object.keys(native_class).length <= 1) {
			var err = 'No params to update';
			throw err;
		}
	}
	catch (e) {
		return res.status(e.status || 500).send({ Error : e });
	}

	var updated_config = native_class;
	var config		   = { class_id : updated_config.class_id };
	
	class_model.get (config)
		.then (
			function (class_config) {
				var _status = class_config.status;

				if (_status !== "created") {
					var err = {
						message      : "Cannot modify class config if class state is other can created",
						class_status : _status,
						status       : 406
					};
					log.error(err);
					return send_error(res, req, err);
				}

				var prov_name = class_ctrl.extract_prov_name (class_config);
				var class_config_raw = class_config.toObject();
				for (var key in updated_config) {
					/* if key is not an object or an array, continue */
					if (typeof updated_config[key] !== "object" || Array.isArray (updated_config[key]) )
						continue;

					updated_config[key] = $.extend({}, class_config_raw[key], updated_config[key]);
				}
				class_ctrl.get_prov_server (prov_name)
					.then (class_ctrl.do_updates.bind (null, req, res, updated_config, req.class_id), send_error.bind (null, res, req));
			},
			send_error.bind (null, res, req)
		);

}

function remove (req, res, next) {
	class_ctrl.remove (req, res, next);
}

/*
 * this method is called whenever wizIQ calls for add_attendee.
 * It is a TEMPORARY method as we are not adding attendees to 
 * class config but just returning ANONYMOUS url as a response.
 * It is just because of a temporary need of a quick fix.
 */
function temp_add_user (req, res, next) {
	var class_id = req.body.class_id;
	 landing_model.get ('default')
	 	.then (
			function (profile) {
				var url = {};
				/* create anon_url */
				url.anon   = urls_model.create_anon (class_id, profile[0]);
				res.status(200).send(url);
			},
			function (err) {
				res.status(500).send(err);
			}
		);
}


/* 
 * add_user is allowed only if class_status is not "created"
 * as any status other than this means that attendee
 * addition is not allowed since provisioning has already 
 * fetched class_config from backend 
 */ 
function add_user (req, res, next) {
	var class_id = req.body.class_id;
	var user     = convert_user_to_native (req.body.user);

	if (!user.role)
		return res.status(400).send({message : 'attendee role not specified (found to be null)'});

	log.info ({user : user}, 'user info in native');

	var config   = {
		class_id : class_id,
		user     : user
	};

	/* 
	 * passing an array of roles to be searched in perms-profile.
	 * This is essentially done to inculcate the case in which a class
	 * has explicit "anonymous" role which is different from the "default"
	 * role
	 */ 
	var roles = [];
	roles.push ({ "name" : user.role });

	is_perms_role_present (roles)
		.then (check_class_status.bind (null, class_id),         send_error.bind (null, res, req))
		.then (class_model.add_user.bind (null, class_id, user), send_error.bind (null, res, req))
		.then (create_urls.bind (null, config, false, req),      send_error.bind (null, res, req))
		.then (send_response.bind (null, req, res),              remove_user_upon_error.bind (null, class_id, user.id, res, req))
	;
}

function convert_user_to_native (user) {
	var user_info = {
		id           : user.ID || user.Email,
		role         : null,
		auth_via     : user.auth_via,
		meta_info    : {
			display_name : user.ScreenName 
		}
	};

	log.info ({User : user}, 'user info in wiziq context');

	if (!user.Role) {
		return user_info;
	}

	switch (user.Role) {
		case "attendee" :
			user_info.role = "default";
			return user_info;
		case "presenter" :
			user_info.role = "wiziq-presenter";
			return user_info;
		default :
			log.error({ role : user.Role }, 'Unknown role from WizIQ');
			user_info.role = "default";
			return user_info;
	}
}

/*
 * check if class status is suitable for attendee addition
 */ 
function check_class_status (class_id) {
	var _d = $.Deferred();
	var config		   = { class_id : class_id };
	
	class_model.get (config)
		.then (
			function (class_config) {
				var wzq_status = get_wizIQ_class_status (class_config.status);
				if (wzq_status === 0 || wzq_status === 1)
					return _d.resolve ('OK');

				_d.reject ({ message : 'Attendee addition not allowed as class status is '+class_config.status, status :406});
			},
			function (err) {
				_d.reject ({ message : err.message + ' :No class found for attendee addition', status : err.status });
			}
		);	

	return _d.promise();	
}


/*
 * if create user fails, remove user from db
 */ 
function remove_user_upon_error (class_id, user_id, res, req, err) {
	
	if (!err)
		return;
	class_model.remove_user (class_id, user_id)
		.then (
			send_error.bind (null, res, req, err),
			send_error.bind (null, res, req, err)
		);

}

function remove_user (req, res, next) {
	user_ctrl.remove (req, res, next);
}

function cleanup_send_error (res, req, err) {
	/*
	 * This could be called in a sequence if any of the deferreds
	 * fail in the chain. */
	if (!err)
		return;

	var wiziq_class_in = this;
	var class_id = wiziq_class_in.ClassID;

	class_model.remove ({ class_id : class_id })
		.then (
			send_error.bind (null, res, req, err),
			send_error.bind (null, res, req, err)
		);
}

function send_error (res, req, err) {
	/*
	 * This could be called in a sequence if any of the deferreds
	 * fail in the chain. */
	if (!err)
		return;
	
	var status = err.status || 500;
	var err_msg = (typeof err === 'string' ? err : err.message);
	res.status(status).send({ error : err });
}

function send_response (req, res, data) {
	res.status(200).send(data);

}


/* status map between wizIQ and native API */
var status = {};

/********************************************
 * WizIQ status codes :
 * 	
 * 		Code	|	Value
 *   ___________|_____________
 *              |
 *      0       |  scheduled
 *      1       |  in-progress
 *      2       |  done
 *      3       |  expired
 *      4       |  deleted/cancelled
 *
 *********************************************/ 

set_wizIQ_class_status ('created',          0);
set_wizIQ_class_status ('locked',           0);
set_wizIQ_class_status ('provisioning',     0);
set_wizIQ_class_status ('waiting-to-start', 0);
set_wizIQ_class_status ('starting',         0);
set_wizIQ_class_status ('failed',           0);
set_wizIQ_class_status ('launch_failed',    0);

set_wizIQ_class_status ('active',           1);
set_wizIQ_class_status ('started',          1);

set_wizIQ_class_status ('completed',        2);

set_wizIQ_class_status ('expired',          3);

set_wizIQ_class_status ('deleted',          4);
set_wizIQ_class_status ('stopped',          4);

/* get wizIQ class status depending on class status in wizIQ class config */
function get_wizIQ_class_status (key) {
	return status [key];
}

function set_wizIQ_class_status (key, value) {
	status [key] = value;
}

/*
 * Class status info to be sent to wizIQ
 */

emitter.on ('class_status', function (status, class_id) {
	log.info ({ class_id : class_id, status : status }, 'attempting to send class status update to WizIQ');
	send_class_status (status, class_id);
});


function send_class_status (class_status, class_id) {
	
	var wzq_status_code = get_wizIQ_class_status (class_status);

	get_base_status_url ()
		.then (
			function (base_url) {
				var url = create_status_url (base_url, class_id, wzq_status_code);
				execute_request (url, class_id, class_status, wzq_status_code);			
			},
			function (err) {
				log.error ({ Error : err }, 'Could not fetch wiziq status url from db or cache');
			}
		);

}

function get_base_status_url () {
	
	var _d = $.Deferred ();

	/* if found in cache, return */
	var base_url = cache.get().status_url;
	
	if (base_url) {
		_d.resolve (base_url);
		return _d.promise();
	}

	log.debug ('not cached. attempting to get WizIQ endpoints from the db');

	/* check in db */
	end_pts_model.get ()
		.then (
			function (result) {
				_d.resolve (result[0].status_url);
			},
			function (err) {
				_d.reject (err);
			}
		);
		
	return _d.promise();
}

function create_status_url (base_url, class_id, status_code) {
	var url = base_url;

	url += '?classid=' + class_id;
	url += '&wrtc=1';
	url += '&status=' + status_code;

	log.info ({url : url}, 'complete wiziq status url to be hit');

	return url;	
}

function execute_request (url, class_id, class_status, status_code) {
	var d = rest.get ( url, {timeout : 5000} );

	d.on ( 'success', function (data, response) {
		
		log.info ({ info : {
			class_id          : class_id,  		 
			class_status      : class_status,
			class_status_code : status_code
		}}, 'Class status sent successfully to wizIQ');
	
	});

	d.on ( 'fail', function (data, response) {
		
		log.error ({ info : {
			class_id          : class_id,  		 
			class_status      : class_status,
			class_status_code : status_code,
			data              : data,
			statusCode        : response.statusCode,
			statusMessage     : response.statusMessage,
		}}, 'class status sending to wizIQ failed');
		
	});
	
	d.on ( 'error', function (err, response) {
		
		log.error ({ error : {
			class_id          : class_id,  		 
			class_status      : class_status,
			class_status_code : status_code,
			err               : err
		}}, 'class status sending to wizIQ error');
		
	});
	
	d.on ( 'timeout', function (ms) {
		
		log.error ({ error : {
			class_id          : class_id,  		 
			class_status      : class_status,
			class_status_code : status_code,
			ms                : ms
		}}, 'class status sending to wizIQ timeout');

	});

}

/*
 * Check if the request is from wiziq-api user
 * if yes set auth_via wiziq-anon
 */
function _req_from (req) {
	var base_url = req.baseUrl;
	base_url     = base_url.split('/');

	return base_url[base_url.length-1];
}

module.exports = app;

