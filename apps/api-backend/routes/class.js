var express         = require('express');
var _class          = require('api-backend/controllers/class');
var _users          = require('api-backend/controllers/users');
var log             = require('api-backend/common/log').child({ module : 'routes/class-config' });
var router          = express.Router();

router.param('classid',function( req, res, next, class_id ){
    req.class_id = class_id;
    next();
});

/***********CLASS SPECIFIC REQUESTS ************************/

/* fetch class config */
router.get( '/:classid/config', _class.get );

/* create a class and add it's info to db */
router.post( '/:classid/config', _class.create );
/* if no class id specified for class creation */
router.post( '/config', _class.create );

/* update a class, including cancelling the class because 
 * cancelling is effectively a status update for us only */ 
router.put( '/:classid/config', _class.update );

/* remove/delete a class */
router.delete( '/:classid/config', _class.remove );


/***********ATTENDEE SPECIFIC REQUESTS*********************/

/* add user_info to db (or) add user */
router.post( '/:classid/user', _users.add );

/* remove user_info from db (or) delete users */
router.delete( '/:classid/user/:userid', _users.remove );

/*************** RECORDING ******************************/

/* get rec page url */
router.get( '/:classid/recording', _class.get_rec );

/* show rec page  */
router.get( '/:classid/recording/default', _class.rec_template );


module.exports = router;

