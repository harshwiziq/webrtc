var keys = {

	/*
	 * *** IMPORTANT ***
	 *   The "auth" key is used in by the session cluster to decode. This key is duplicated
	 *   in the file "session/v2/crypt.js". Make sure the 2 keys are exactly the same
	 */
	auth        : 'FCBD40FACCDA1E108839DD3D28E99B07AEB27B5BC0B99B8C6A1864F5A21137B2',

	/*
	 * Private URL encode key */
	private_url : '3e5fefb1e4ec381bc4b0d9e5f4b8a1176cf91e59e73d94283b17f6ebcf1f85f3',

	/*
	 * *** IMPORTANT ***
	 *   The "role_key" key is used in by the session cluster to decode. This key is duplicated
	 *   in the file "session/v2/crypt.js". Make sure the 2 keys are exactly the same
	 */
	role_key    : '95E738C8FE389AF70EAC100179AAA0C1303EAC785A96251EC8646EA230704E4B'
};

module.exports = keys;
