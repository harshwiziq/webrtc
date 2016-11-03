var express = require('express');
var app = express();
var body_parser = require('body-parser');
var port = 3000;
var isa = require('./provider/isa');

app.use(body_parser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
	    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.get('/isa/auth', isa.create_token);

app.use('/api', isa.authenticate);

app.get('/api/', function (req, res) {
	res.json({ message: 'Welcome to the coolest API on earth!' });
});

app.get('/api/users', function (req, res) {
	res.json({ message: 'u will get the users soon' });
});

app.listen(port);
console.log('server started on port:'+port);
