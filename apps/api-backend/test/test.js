var moment = require( 'moment' );
var rest   = require( 'restler' );
var mylog  = require( './common/log' ).child ( { module : 'test/test'} );

start();

function start ( class_config ) {
	
	class_config.class_id = moment().toISOString()+"vc";
	class_config.time_spec.starts = moment.toISOString();
	

	var url = 'https://localhost/backend/v1/class/'+class_config.class_id+'/config';
	var d = rest.postJson ( url, class_config );
	d.on ( 'success', mylog.info ( 'Request sent successfully' ) );

	d.on ( 'fail', function (data, response) {
		mylog.error ({ info : {
			class_id : class_config.class_id,
			data : data,
			statusCode : response.statusCode,
			statusMessage : response.statusMessage,
		}}, 'post failed');
	});

	d.on ( 'error', function (err, response) {
		mylog.error ({ info : {
			class_id : class_config.class_id,
			err : err,
		}}, 'post error');
	});

	d.on ( 'timeout', function (ms) {
		mylog.error ({ info : {
			class_id : class_config.class_id,
			ms : ms
		}}, 'post timeout');
	});


}

var class_config = {
	class_id : "",
	time_spec : {
		duration : 20,
		starts: ""
	},
	resources :[{ name : "av" }],
	display_profile : { name : "default1" },
	profile : {
		company_info : {
			name : "wiziq",
			auth_type : "anon"	
		}
	}
};
