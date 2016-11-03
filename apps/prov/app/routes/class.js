var express = require('express');
var router = express.Router();
var _class = require('./../controllers/class');

router.post('/:class_id/config', _class.createconfig);
router.get('/:class_id/config', _class.getconfig);
router.put('/:class_id/config', _class.updateconfig);
router.delete('/:class_id/config', _class.removeconfig);

module.exports = router;
