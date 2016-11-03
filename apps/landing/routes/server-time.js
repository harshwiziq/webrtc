var express   = require('express');
var path      = require('path');
var moment    = require('moment');
var log       = require('landing/common/log');
var auth      = require('landing/lib/auth');
var router    = express.Router();

router.use (auth.authenticate);

router.get ('/server-time', function (req, res, next) {
	var time = moment().utc().toISOString();

	return res.status(200).send({
		server_time : time
	});
});


module.exports = router;

