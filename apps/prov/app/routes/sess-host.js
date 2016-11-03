var express   = require('express');
var router    = express.Router();
var node_pool = require('prov/app/controllers/node-pool');

router.post ('/ready',      node_pool.mark_ready);
router.get  ('/status',     node_pool.get_status);
router.get  ('/status/:id', node_pool.get_status);

module.exports = router;
