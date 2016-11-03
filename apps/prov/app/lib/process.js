var log = require('prov/app/common/log').child({ module  : 'process' });
var db = require('prov/app/lib/db');
var q = require('./q-controller.js');

process.once('SIGINT', function () {
    cleanup();
});

process.once('SIGTERM', function () {
    cleanup();
});

process.once('SIGHUP', function () {
});

function cleanup () {
    q.shutdown();
    db.conn.close(function (error) {
		if (error)
			log.error ({ error : error }, 'db connection close error. exiting anyways.');

		/*
		 * More cleanup steps required : TODO */
		process.exit(0);
	});
}
