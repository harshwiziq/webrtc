
var express = require('express')  ,
	core    = require('controllers/core-v1')  ;

var router = express.Router()  ;

router.param('email',function( req, res, next, email){
	if( !email){
		res.send({ 'status':'error', 'data':'ARGS_ERR: email required'});
		return;
	}

  	if( !(email.endsWith('@wiziq.com') || 
		  email.endsWith('@wiziq-anon.com') ||
		  email.endsWith('@gmail.com') || 
		  email.endsWith('@google.com') || 
		  email.endsWith('@facebook.com') || 
		  email.endsWith('@authorgen.com')) ){

		res.send({ 'status':'error', 'data':'AUTH_ERR: not authorized'});
		return;
	}


	req.email = email;
	req.store = 's3';
	next();
});

router.post('/user/:email/add', core.add);			//____create content
router.post('/user/:email/added', core.added);
	
router.get('/user/:email/list', core.list);			//____retrieve content

router.post('/user/:email/update', core.update);		//____update content			<--not allowed--

router.delete('/user/:email/remove', core.remove);		//____delete content			<--not implemented yet--


/*
 *  _polyfill for endswith, in case it is not there 
 */

if (!String.prototype.endsWith) {
	//log.info('endswith polyfill used');
	String.prototype.endsWith = function(searchString, position) {
		var subjectString = this.toString();
		if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
			position = subjectString.length;
		}
		position -= searchString.length;
		var lastIndex = subjectString.indexOf(searchString, position);
		return lastIndex !== -1 && lastIndex === position;
	};
}

module.exports = router;
