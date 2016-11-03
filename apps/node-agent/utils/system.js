
var os = require('os');

var sys = {};

sys.get_config = function () {
	return {
		num_cpu		: os.cpus().length,
		total_mem 	: bytesToSize(os.totalmem())
	};
};

sys.get_load = function () {
	return os.loadavg();
};

sys.get_memory = function () {
	var totalmem	=  os.totalmem();
	mem_usage		= (totalmem - os.freemem())/totalmem *100;
	return {
		totalMem_B  : totalmem,
		freemem_B     : os.freemem(),
		totalmem 	: bytesToSize(totalmem),
		mem_usage 	: mem_usage.toFixed(1)
	};
};

sys.get_platform = function (){
	return os.platform();
};

sys.get_cpus = function (){
	return  os.cpus();
};
/**  Convert Bytes into GB **/
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) 
		return 'na';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i === 0) 
		return bytes + ' ' + sizes[i];
    return (bytes / Math.pow(1024, i)).toFixed(1);// + ' ' + sizes[i];
}
module.exports = sys;

