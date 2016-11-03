var express   = require('express');
var path      = require('path');
var log       = require('landing/common/log');
var session   = require('landing/controllers/session-v1');
var browser   = require('landing/lib/browser');
var auth      = require('landing/lib/auth');
var router    = express.Router();

/* 
 * We need the session configuration for auth (to send the auth->via options,
 * so we pre-load the session config here */
router.use (auth.authenticate);
router.use (browser.check_compatibility);
router.use ('/:class_id', session.load_and_cache_config);

router.get ('/:class_id/', session.load_page);
router.get ('/:class_id/status', session.status);
router.get ('/:class_id/load', session.load_config);

module.exports = router;

