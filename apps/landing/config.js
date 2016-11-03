var fs  = require('fs');
var path= require('path');
var log = require('landing/common/log');
var app_config = require('common/config');
var config = {};

config.port = app_config.app_port;

/*
 * Path related configs
 */
config.top   = __dirname;
config.session_server = { default_port : 3179 };

module.exports = config;
