/* creation of all models is done here. 
 * Necessarily done to avoid using same file at different places 
 * ( common/db.js ) when it can be used only once
 */

var class_schema                    = require('common/class-config-schema');
var display_profile_schema          = require('api-backend/schemas/display-profile');
var perms_profile_schema            = require('api-backend/schemas/perms-profile');
var provisioning_profile_schema     = require('api-backend/schemas/provisioning-profile');
var resource_profile_schema         = require('api-backend/schemas/resource-profile');
var landing_profile_schema          = require('api-backend/schemas/landing-profile');
var wiziq_end_pts_schema            = require('api-backend/adaptors/wiziq/end-pts-schema');
var db                              = require('api-backend/common/db');
var mylog                           = require('api-backend/common/log').child({ module : 'common/config-model' });

var config_model = {};
var db_conn = db.conn;

/*
 * Initialize */
db.emitter.on ( 'db-connected', function () {
	config_model.class_config          = db_conn.model ('class_config', class_schema);
	config_model.display_profile       = db_conn.model ('display_profile', display_profile_schema);
	config_model.perms_profile         = db_conn.model ('perms_profile', perms_profile_schema);
	config_model.provisioning_profile  = db_conn.model ('provisioning_profile', provisioning_profile_schema);
	config_model.resource_profile      = db_conn.model ('resource_profile', resource_profile_schema);
	config_model.landing_profile       = db_conn.model ('landing_profile', landing_profile_schema);
	config_model.wiziq_end_pts         = db_conn.model ('wiziq_end_pts', wiziq_end_pts_schema);
});

module.exports = config_model;
