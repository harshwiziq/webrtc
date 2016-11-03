var emitter = require('events');
var util = require('util');
var log = require('prov/app/common/log').child({ module: 'prov ev emitter' });

function Prov_emitter() {
    emitter.call(this);
}

util.inherits(Prov_emitter, emitter);

var prov_emitter = new Prov_emitter();

prov_emitter.on('error', function (err) {
    log.warn({ err: err }, 'whoops! there was an error');
});

module.exports = prov_emitter;

