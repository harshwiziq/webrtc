var express   = require('express');
var path      = require('path');
var log       = require('landing/common/log');
var admin     = require('landing/controllers/admin');
var router    = express.Router();

/* 
 * TODO : This is without authorization - implement ! */

router.get  ('/config', admin.get_config);
router.post ('/config/backend', admin.set_config.bind('backend'));
router.post ('/config/auth', admin.set_config.bind('auth'));

module.exports = router;

