/* this module contains the actual encryption and decryption
 * logic that will be used in Auth module
 */ 
encryption = {};

encryption.decrypt = function (log, msg) {
	/* For now the mesage is not encrypted */
	log.info ({ Info: 'cipher decrypt', cipher : msg });
	/*return decodeURIComponent (msg);*/
	return msg;
	
};


encryption.encrypt = function (log, msg) {
	/* no encryption as of now, sending the same msg bck. 
	 * Actual encryption will be added here, whenever done
	 */
	//log.info ({ Info: 'cipher encrypt', cipher : msg });
	return msg;
}

module.exports = encryption;

