define(function(require){
	var _text;

	function create (mouse_ev) {
		var pt = mouse_ev.point;
		/*
		 * create a new text path */
		_text = new PointText (pt);
	}

	function key_down (ev) {
		/*
		 * edit the text */
		_text.content += ev.character;
	}

	function mouse_down (ev) {

	}

	function mouse_drag (ev) {

	}

	function mouse_up (ev) {

	}
	
	function mouse_move (ev) {

	}
	
	var text = {};
	text.create = create;
	text.key_down = key_down;
	text.mouse_move = mouse_move;
	text.mouse_down = mouse_down;
	text.mouse_drag = mouse_drag;
	text.mouse_up = mouse_up;

	return text;
});
