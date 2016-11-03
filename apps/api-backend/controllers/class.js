var $            = require('jquery-deferred');
var hashes       = require('jshashes');
var helpers      = require('common/helpers');
var sched        = require('common/sched');
var app_config   = require('common/config');
var prov_if      = require('api-backend/models/provisioning-if');
var c_config     = require('api-backend/models/class-config');
var prov_profile = require('api-backend/models/provisioning-profile');
var mylog        = require('api-backend/common/log').child({ module : 'controllers/class'});

var controller = {};

function generate_class_id (start_time) {
	var seed_str = 'vc_id' + Date.now() + start_time;
	return new hashes.SHA1().hex(seed_str);
}

/* create a class
 * Current steps :
 * 1. Check if it is a valid class by checking the duration to be numeric.
 * 2. Generate job_id by using class parameters.
 * 3. Create class i.e. add to db
 */

controller.create = function (req, res, next) {
	mylog.info('Hello world ! we are here to create a class'+ req.body);
	var err;
	var class_config = req.body;

	err = validate_params (class_config);
	if (err)
		return send_error.bind (res, req, err );
	/* generate class id if not present already */
	if ( !class_config.class_id ) {
		class_config.class_id = generate_class_id ( class_config.time_spec.starts );
	}

	var config = {
		class_id  : class_config.class_id,
		time_spec : class_config.time_spec
	};

	var prov_name = extract_prov_name ( class_config );

	get_prov_server ( prov_name )
		.then ( prov_if.create.bind ( null, config ), reject )
		.then ( c_config.create.bind ( null, class_config ), reject )
		.then ( res.send.bind ( res ), send_error.bind ( res, req ) );

};

function reject ( err ) {
    mylog.error ( { err : err }, "Reject called ");
    var _d = $.Deferred();
    _d.reject ( err );
    return _d.promise();
}


function validate_params (__class) {
	var duration = __class.time_spec ? __class.time_spec.duration : null;

	if (!helpers.is_numeric (duration))
		return 'duration is not numeric';

	if (!__class.display_profile ||
		!__class.display_profile.name ||
		!__class.display_profile.structure ||
		!__class.display_profile.layout ||
		!__class.display_profile.theme
	   )
	   return 'insufficient display profile';

	return null;
}

function extract_prov_name ( class_config ) {
	/* find required provisioning server for this class.
	 * If no server found, get default provisioning server address */
	var prov_name = null;

	if (class_config.profile &&
		class_config.profile.company_info &&
		class_config.profile.company_info.prov_server_name) {
		prov_name = class_config.profile.company_info.prov_server_name;
	}

	return prov_name;
}

function get_prov_server ( name ) {
	var _d = $.Deferred();
	if ( !name )
		name = "default";

	prov_profile.get ( name )
		.then (
			function ( result ) {
				/* server address returned */
				mylog.debug ( { prov : result, name : name }, 'get provisioning server from db');
				_d.resolve ( get_prov_base_url ( result ) );
			},
			function ( err ) {
				var local = {
					address  : 'localhost',
					port     : app_config.app_port,
					protocol : 'http'
				};
				mylog.warn ({ err: err, name : name },    'get provisioning server from db failed');
				mylog.warn ({ prov: local }, 'defaulting to localhost');
				_d.resolve ( get_prov_base_url ( local ) );
			}

		);
	return _d.promise();
}

function get_prov_base_url ( prov_profile ) {
	var host_prefix = prov_profile.protocol + '://' + prov_profile.address + ( prov_profile.port ? ':' + prov_profile.port : '');
	return ( host_prefix + '/prov/' );
}

/* update info corresponding to a class.
 * IF it is some update regarding time, send it to provisioning
 * server as an UPDATE call (for time update) or DELETE call
 * (for class cancel/delete) & then update at backend on successful
 * response 
 * ELSE just update backend db.
 */   
controller.update = function (req, res, next) {

	var updated_config = req.body.updated_config;
	var config         = { class_id : req.body.class_id };

	c_config.get ( config )
		.then (
			function ( class_config ) {
				var prov_name = extract_prov_name ( class_config );
				get_prov_server ( prov_name )
					.then ( do_updates.bind ( null, req, res, updated_config, req.body.class_id ), send_error.bind ( res, req ) );
			},
			send_error.bind ( res, req )
		);

};


function do_updates ( req, res, config, class_id, prov_base_url ) {
	
	/* find key related to time_spec */
	if ( config.hasOwnProperty ( "time_spec" ) ) {	
		/* send an update call to provisioning server */
		prov_if.update ( class_id, config, prov_base_url )
			.then (
				/* delete from local db now */
				update_c_config.bind ( null, req, res, config, class_id ),
				/* fail */
				send_error.bind ( res, req )
			);			
	}
	else if ( config.hasOwnProperty ( "status" ) &&  config.status === "cancelled" ) {
		/* find key related to cancellation of class */
		/* send a delete call to provisioning server */
		prov_if.remove ( config )
			.then (
				/* delete from local db now */
				function ( result ) {
					update_c_config ( req, res, config, class_id );
				},
				/* fail */
				send_error.bind ( res, req )
			);			
	}
	else {
		/* if status is anything other than "created", DO NOT ALLOW UPDATE */
		/* CHECK STATUS BY FETCHING CLASS_INFO */
		c_config.get ( config )
			.then (
				function ( result ) {
					if ( result.status !== "created" ) 
						return res.status (500).send( { Error : 'Updation not allowed !'} );
					update_c_config ( req, res, config, class_id );
				},
				send_error.bind ( res, req )
			);
	}

}


function update_c_config ( req, res, updated_config, class_id ) {
	 c_config.update ( updated_config, class_id )
	 	.then (
			res.send.bind( res ),
			send_error.bind ( res, req )
		);
}


/* delete a scheduled class */
controller.remove = function (req, res, next) {
	/* Sequence of steps :
	 * 1. Find provisioning server name.
	 * 2. Fetch provisioning server info.
	 * 3. Send update info to provisioning.
	 * 4. Depending on response, update db info at backend or discard. 
	 */
	var class_id = req.class_id;
	var config   = { class_id : class_id };

	c_config.get ( config )
		.then (  
			function ( class_config ) {
				var prov_name = extract_prov_name ( class_config );
				get_prov_server ( prov_name )
					.then ( prov_if.remove.bind ( null, config ), reject )
					.then ( c_config.remove.bind ( null, config ), reject )
					.then ( res.send.bind ( res ), send_error.bind ( res, req ) );
			},
			send_error.bind ( res, req )
		);
};

/* get class_config. 
 * Class_id is sent for which we need to search class_config entry in db
 * and return it
 */ 
controller.get = function (req, res, next) {

	var class_id = req.class_id;
	var config = {  class_id : class_id };

	c_config.get ( config )
	.then (
		function ( result ) {
			mylog.info ( { Info : result }, 'class config returned to native API' );
			res.status( 200 ).send( result );
		},
		function ( err ) {
			mylog.error ( { Error : err }, 'Error in fetching class config' );
			res.status( 500 ).send( err );
		}

	);

};

controller.get_rec = function (req, res, next) {

	var class_id = req.class_id;
	/*
	 * For now create a dummy recording url
	 * Need to change it later
	 */
	var url = controller.dummy_rec(req); 

	mylog.info({ class_id : class_id, url : url }, 'recording url');

	return res.status(200).send(url);
};

controller.dummy_rec = function (req) {
	var class_id = req.class_id;
	return req.protocol + "://" + req.get('host') + "/backend/v1/class/" + class_id + "/recording/default";
};

controller.rec_template = function (req, res, next) {
	return res.status(200).render('recording.jade');
};

function send_error ( req, err ) {

    if ( ! err || err === {} ) {
	        this.send ( { Error : "Empty/undefined error" } );
	    }
    /* 'err' is custom error, always */
    var status = 500;
    mylog.error ( { Error_send_error : err } );
    if (  ! err.status )
        mylog.error ('no type set in error');
    else
        status = err.status;
    mylog.warn ({ status: status });

    this.status(status).send(err.message);

}


controller.validate_params   = validate_params;
controller.extract_prov_name = extract_prov_name;
controller.get_prov_server   = get_prov_server;
controller.reject            = reject;
controller.do_updates        = do_updates;

module.exports = controller;
