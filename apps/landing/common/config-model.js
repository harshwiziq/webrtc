var config_schema = require( 'landing/common/config-schema' );
var db            = require( 'landing/common/db' );
var mylog         = require( 'landing/common/log' ).child( { module : 'common/config-model' } );

var config_model = {};
var db_conn = db.conn;

/*
 * Initialize */
db.emitter.on ( 'db-connected', function () {
	config_model.model = db_conn.model ( 'config', config_schema );
});

module.exports = config_model;
