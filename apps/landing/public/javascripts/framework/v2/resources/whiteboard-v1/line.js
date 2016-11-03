define(function(require){
	var line = {};

	function mouse_down (ev) {
		_path = new Path ();
		_path.strokeColor = 'black';
		_path.strokeWidth = 2;
		_path.strokeCap   = 'round';

		_path.shadowColor  = 'grey';
		_path.shadowBlur   = 2;
		_path.shadowOffset = new Point (0, 0);

		_path.add (ev.point);
	}

	function mouse_drag (ev) {

	}

	function mouse_up (ev) {
		_path.add(ev.point);
		paper.view.draw();
	}

	function mouse_move (ev) {
	}

	line.mouse_move = mouse_move;
	line.mouse_down = mouse_down;
	line.mouse_drag = mouse_drag;
	line.mouse_up = mouse_up;

	return line;
});
