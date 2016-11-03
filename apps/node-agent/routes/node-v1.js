
var express = require('express')  ,
	node	= require('node-agent/controllers/node-v1')  ;

var router = express.Router()  ;

router.get		('/health', node.health);
router.post		('/', node.acquire);
router.put		('/', node.update);
router.delete	('/', node.renounce);

module.exports = router;
