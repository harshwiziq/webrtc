var express        = require('express');
var router         = express.Router();
var sso_config     = require('auth/controllers/sso_config');


/*
 * Configure sso (google, fb, wiziq) */
router.get ('/sso', sso_config.get_all);
router.post ('/sso/add', sso_config.add);
router.post ('/sso/remove', sso_config.remove);

module.exports = router;

