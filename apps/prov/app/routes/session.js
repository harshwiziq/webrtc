var express = require('express');
var router = express.Router();
var session = require('./../controllers/session');

router.post('/status', session.set_status);

module.exports = router;
