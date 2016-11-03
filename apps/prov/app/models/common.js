var backend   = require('prov/app/models/backend');
var landing   = require('prov/app/models/landing');
var prov      = require('prov/app/models/prov');
var __node    = require('prov/app/models/__node');
var logserver = require('prov/app/models/logserver');
var git       = require('prov/app/models/git');
var docker    = require('prov/app/models/docker');
var resource  = require('prov/app/models/resource');

var db = require('prov/app/lib/db');
var models = {};

var conn = db.conn;

models.init = function () {
    models.backend   = conn.model('backend', backend);
    models.landing   = conn.model('landing', landing);
    models.resource  = conn.model('resource', resource);
    models.prov      = conn.model('prov', prov);
    models.sess_host = conn.model('node', __node);
    models.logserver = conn.model('logserver', logserver);
    models.git       = conn.model('git', git);
    models.docker    = conn.model('docker', docker);
};

module.exports = models;

