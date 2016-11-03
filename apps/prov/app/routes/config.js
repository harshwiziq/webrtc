var express   = require('express');
var router    = express.Router();
var landing   = require('prov/app/controllers/admin-landing');
var backend   = require('prov/app/controllers/admin-backend');
var prov      = require('prov/app/controllers/admin-prov');
var resource  = require('prov/app/controllers/admin-resources');
var node_pool = require('prov/app/controllers/node-pool');
var logserver = require('prov/app/controllers/logserver');
var git       = require('prov/app/controllers/git');
var docker    = require('prov/app/controllers/docker');

/* base_uri: /prov/v1/config/ */

router.get('/resource', resource.get_config);
router.get('/resource/:name', resource.get_config);
router.get('/resource/:name/variant/:attrib', resource.get_variant);
router.post('/resource', resource.create_config);
router.post('/resource/:name/action', resource.custom_action);
router.put('/resource/:name', resource.update_config);
router.delete('/resource/:name', resource.remove_config);

router.get('/landing', landing.get_config);
router.post('/landing', landing.create_config);
router.put('/landing', landing.update_config);
router.delete('/landing', landing.remove_config);

router.get('/backend', backend.get_config);
router.post('/backend', backend.create_config);
router.put('/backend', backend.update_config);
router.delete('/backend', backend.remove_config);

router.get('/prov', prov.get_config);
router.get('/prov/:name', prov.get_config);
router.post('/prov', prov.create_config);
router.put('/prov', prov.update_config);
router.delete('/prov/:name', prov.remove_config);
router.delete('/prov/', prov.remove_config);

router.get   ('/nodes',    node_pool.get_config);
router.get   ('/node/:id', node_pool.get_config);
router.post  ('/node/',    node_pool.add);
router.post  ('/node/re-init',    node_pool.init);
router.put   ('/node/:id', node_pool.update_config);
router.delete('/node/:id', node_pool.remove_config);

router.get('/logserver', logserver.get_config);
router.post('/logserver', logserver.create_config);
router.put('/logserver', logserver.update_config);
router.delete('/logserver', logserver.remove_config);

router.get('/git/:id', git.get_config);
router.post('/git', git.create_config);
router.put('/git/:id', git.update_config);
router.delete('/git/:id', git.remove_config);

router.get('/docker', docker.get_config);
router.post('/docker', docker.create_config);
router.put('/docker', docker.update_config);
router.delete('/docker', docker.remove_config);

module.exports = router;
