var express  = require('express');
var router   = express.Router();
var q        = require('./../lib/q-controller');
var sessions = require('./../lib/session');

router.get('/q', q.get_all);
router.get('/sessions', sessions.get_all_classes);

module.exports = router;
