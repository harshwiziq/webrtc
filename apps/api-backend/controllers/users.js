var $            = require('jquery-deferred');
var c_config     = require('api-backend/models/class-config');
var mylog        = require('api-backend/common/log').child({ module : 'controllers/users'});

var controller = {};

/* add users to db corresponding to class_id.
 * Request body contains 2 parameters :
 *           1. class_id
 *           2. array of user objects  
 * For now, just implementing considering per user.
 * Discussion needed on scenario of MULTIPLE addition !         
 */  
controller.add = function (req, res, next) {

	c_config.add_user (req.body.class_id, req.body.user)
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			res.status(err.status ? err.status : 500).send(err.message ? err.message : "Internal server error");
		}
	);

};

/* remove users from db corresponding to class_id.
 * Request body contains 2 parameters :
 *           1. class_id
 *           2. array of user_ids to be deleted
 * For now, just implementing considering per user.
 * Discussion needed on scenario of MULTIPLE deletion !            
 */           
controller.remove = function (req, res, next) {
	c_config.remove_user (req.class_id, req.params.userid) 
	.then (
		function (result) {
			res.status(200).send(result);
		},
		function (err) {
			err.message = err.message ? err.message : "Internal server error";
			res.status(err.status ? err.status : 500).send({ error : err });
		}
	);

};

module.exports = controller;

