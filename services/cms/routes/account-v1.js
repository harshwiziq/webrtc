

var express = require('express')  ,
	account = require('controllers/account-v1');


var router = express.Router();

router.post('/login', account.login);

router.get('/:user_id', account.get);

router.post('/create', account.add);

router.put('/upgrade', account.upgrade);


module.exports = router;
