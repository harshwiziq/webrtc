
var express = require('express')  ,
	session	= require('node-agent/controllers/session-v1')  ;

var router = express.Router()  ;

// used by provisioning
router.post ('/', session.start);
router.get ('/', session.list);
router.delete ('/:sess_id', session.stop);

// used by session (inside docker)
router.post ('/event', session.event);
//router.get ('/info/:sess_id', session.info);

module.exports = router;
