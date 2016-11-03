define(function(require){
	var $ = require('jquery');

	var _cache 		 = {},
		element		 = {},
		my_namespace = '_att_skin';

	element.handle = function (vc_id, key) { /* can add an is_class option for key */
		var $li = _cache[vc_id];

		if (!$li)
			$li = _cache[vc_id] = $('#' + vc_id + my_namespace);

		if (!key)
			return $li;

		return $li.find('[data-id=' + key + ']');	
	};

	element.forget = function( vc_id){
		_cache[vc_id] = undefined;
	};
	
	return element;
});
