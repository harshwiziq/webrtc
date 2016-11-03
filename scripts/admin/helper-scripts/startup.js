var fs          = require ('fs');
var colors      = require ('colors');
var stdin       = process.stdin;
var stdout      = process.stdout;
var inputChunks = [];
var http_code   = 'xx';

stdin.resume();
stdin.setEncoding('utf8');

function start (file, callback) {

	if (!file) {
		console.error ('no input file specified');
		process.exit (1);
	}

	fs.readFile (file, {
			encoding : 'utf8',
			flag     : 'r'
		}, function (err, data) {

			if (err) {
				console.error ('in file "' + file + '" read error: ' + err);
				process.exit (1);
			}

			/*
			 * Check if the chunk is of the form /[ http-code.* ]/. If so, don't add
			 * that to the JSON as this the last line of status printed by the 
			 * parent shell script */
			if (data.match (/\[ http-code.*\]/)) {
				var _code = data.match(/\[ http-code: ([0-9]+) \]/g)[0];
				http_code = _code.replace(/\[ http-code: ([0-9]+) \]/g, "$1");
				data      = data.replace(/\[ http-code: ([0-9]+) \]/g, "");
			}

			var json = parse (data);

			if (http_code === '200')
				callback (json);

			print_http_code (http_code, data);
			process.exit (0);

		});
}

function parse (in_data) {
	var json;

	/*
	 * Parse the resulting JSON object */
	try {
		json = JSON.parse (in_data);
	}
	catch (err) {
		console.error ('parse error :' + err);
		console.error ('---- raw data dump ----');
		console.error (in_data);
		var dump = '/tmp/dump.' + process.pid + '.json';
		fs.writeFileSync (dump, in_data);
		console.error ('json data dumped in the following location : ' + dump);
		process.exit (1);
	}

	return json;
}

function print_http_code (code, __in_data) {
	switch (code) {
		case '200' :
			break;

		default:
			stdout.write(colors.red('--> ' + http_code + '\n'));
			stdout.write(colors.red(__in_data + '\n'));
	}
}

module.exports = start;
