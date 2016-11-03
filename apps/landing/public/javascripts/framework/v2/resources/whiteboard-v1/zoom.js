define(function(require){
	var zoom = function () {
		this.min = 0.3;
		this.max = 2.0;
	};

	function get_zoom (zoom, delta) {
		if (delta < 0) {
			if (zoom > this.max)
				return null;

			return zoom += 0.1; 
		}

		if( zoom < this.min )
			return null;

		return zoom -= 0.1;
	}

	function get_center (old_zoom, new_zoom, delta, center, point) {
		var beta = old_zoom / new_zoom;
		var pc = point.subtract (center);
		var offset = point.subtract( pc.multiply(beta) ).subtract(center);

		return paper.view.center.add(offset);
	}

	zoom.prototype.wheel_event = function (ev) {
		var self = this;
		var delta = ev.originalEvent.deltaY;
		var old_zoom = paper.view.zoom;
		var new_zoom = get_zoom.bind(self) (old_zoom, delta);
		var old_center, new_center, view_pos;
			
		if (new_zoom) {
			old_center = paper.view.center;
			mouse_pos = new paper.Point (ev.originalEvent.offsetX, ev.originalEvent.offsetY);
			view_pos = paper.view.viewToProject (mouse_pos);
			new_center = get_center (old_zoom, new_zoom, delta, old_center, view_pos);

			paper.view.setZoom (new_zoom);
			paper.view.setCenter (new_center);
		}

		ev.preventDefault();
	};

	function mouse_down (ev) {
	}

	function mouse_drag (ev) {
	}

	function mouse_up (ev) {
	}
	
	function mouse_move (ev) {
	}

	return zoom;
});
