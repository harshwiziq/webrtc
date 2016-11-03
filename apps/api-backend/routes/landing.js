var express         = require('express');
var landing         = require('api-backend/controllers/landing');
var log             = require('api-backend/common/log').child({ module : 'routes/landing' });
var router          = express.Router();

router.param('classid',function( req, res, next, class_id ){
    req.class_id = class_id;
    next();
});


router.get( '/class/:classid/profile/prov', landing.get );

module.exports = router;
