var express         = require('express');
var path            = require('path');
var provisioning    = require('api-backend/controllers/provisioning');
var log             = require('api-backend/common/log').child({ module : 'routes/provisioning' });
var router          = express.Router();

router.param('classid',function( req, res, next, class_id ){
    req.class_id = class_id;
    next();
});

/* ---------------------------------------------------------------------------
 * | fetch class config.
 * | NOTE : this get class config has a different route as compared to the other
 * | get class config method for class. This is because it is internally called 
 * | from Provisioning server whereas the other one is called from native API.
 * | Authentication way here is ISAuth while it is OAuth in the other route.
 * | Ensure that end points have different URIs.
 * ----------------------------------------------------------------------------
 */ 
router.get( '/:classid/config', provisioning.get );

/* ----------------------------------------------------------------------------
 * | lock class upon request from provisioning server.
 * | This is needed because we can not allow the user to
 * | update class config whenever he wants to. Now, it can
 * | always be discussed/chnaged what all parameters we
 * | want to be allowed to be updated even after locking.
 * ---------------------------------------------------------------------------- 
 */
router.post( '/:classid/lock', provisioning.lock_class );

/* class status returned by provisioning server */

router.post ( '/:classid/status', provisioning.update_class_status );


module.exports = router;

