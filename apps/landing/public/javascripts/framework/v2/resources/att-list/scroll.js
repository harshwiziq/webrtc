define(function(require){
	var $ = require('jquery');

	var scroll = {},
		last_scroll = 0,
		li_height = 1;

	scroll.start = function( $anchor){
		var temp = $anchor.find('li').height();
		li_height = temp ? temp : '72';
		$anchor.on('scroll', scroll_handler);
	};
	
	function scroll_handler( evt){
		var $el = $(this),
		scroll = $el.scrollTop(),
		round = last_scroll < scroll ? Math.ceil : Math.floor;

		if( last_scroll == scroll){		/* happens everytime but creates problems with last element */
			return;
		}
		last_scroll = round( scroll/li_height) * li_height;
		$el.scrollTop( last_scroll);
		last_scroll = $el.scrollTop(); /* added to remove problem scrolling last element due to view height */
	}

	return scroll;
});
