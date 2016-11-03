var express         = require('express');
var path            = require('path');
var admin           = require('api-backend/controllers/admin');
var log             = require('api-backend/common/log').child({ module : 'routes/admin' });
var router          = express.Router();

/* get provisioning profile */
router.get( '/profile/prov/', admin.get_provisioning_profile );
router.get( '/profile/prov/:name', admin.get_provisioning_profile );

/* add provisoning profile */
router.post( '/profile/prov', admin.add_provisioning_profile );

/* remove provisoning profile */
router.delete( '/profile/prov/:name', admin.remove_provisioning_profile );

/* get resource profile */
router.get( '/profile/resource/:name', admin.get_resource_profile );

/* add resource profile */
router.post( '/profile/resource', admin.add_resource_profile );

/* remove resource profile */
router.delete( '/profile/resource/:name', admin.remove_resource_profile );

/* get perms profile */
router.get( '/profile/perms/:role', admin.get_perms_profile );

/* add permissions profile */
router.post( '/profile/perms', admin.add_perms_profile );

/* remove provisioning profile */
router.delete( '/profile/perms/:role', admin.remove_perms_profile );

/* get display profile */
router.get( '/profile/display/:name', admin.get_display_profile );

/* add display profile */
router.post( '/profile/display', admin.add_display_profile );

/* remove display profile */
router.delete( '/profile/display/:name', admin.remove_display_profile );

/* get landing profile */
router.get( '/profile/landing', admin.get_landing_profile );
router.get( '/profile/landing/:name', admin.get_landing_profile );

/* add landing profile */
router.post( '/profile/landing', admin.add_landing_profile );

/* remove landing profile */
router.delete( '/profile/landing/:name', admin.remove_landing_profile );

/* get wiziq end pts */
router.get( '/wiziq-end-pts', admin.get_wiziq_end_pts );

/* add wiziq end pts */
router.post( '/wiziq-end-pts', admin.add_wiziq_end_pts );

/* remove wiziq end pts */
router.delete( '/wiziq-end-pts', admin.remove_wiziq_end_pts );

/* list all classes in the DB */
router.get( '/classes', admin.get_classes);

module.exports = router;

