/* generic utility methods */
var log    = require('api-backend/common/log').child({ module : 'common/utility' });


var utility = {};

/* 
 * this method takes 2 arrays as arguments and returns
 * the elements which are not in both but in one of 
 * the arrays
 */ 
utility.get_dissimiliar_elements = function (large, small) {
	var dissimiliar = [];
	var l_len = large.length;
	var s_len = small.length;

	for (var i = 0; i < l_len; i++) { 
		for (var j = 0; j < s_len; j++) { 
			
			if (large[i].name === small[j].name)
				break;

			if ((large[i].name !== small[j].name) && (j === s_len-1)) {
				dissimiliar.push ({ "name" : large[i].name });
			}
		}
	}

	return dissimiliar;
};

/* this method checks if an array of key value pairs
 * contains a specific key value pair
 */
utility.is_entry_present = function (key, value, arr) {
    for (var i = 0; i <arr.length; i++) {
	        if (arr[i][key] === value) {
			            return true;
			        }
	    }
    return false;
};


module.exports = utility;
