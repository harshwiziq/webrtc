/**
 *
 * OnMouseDown -
 * 		if !hittest
 * 			init selection_rectangle
 *
 * 		else
 * 			pick rectangle
 *
 * OnMouseDrag -
 * 		if !picked_selection_rectangle
 * 			resize rectangle
 *
 * 		else
 * 			resize selection_rectangle
 **/

define(function(require){

	var transform = {};
	var hitOptions = {
		segments: true,
		stroke: true,
		fill: true,
		tolerance: 5
	};
	var rectangle;
	var state;
	var current_path;
	var current_segment;
	var resize_rectangle;

	function mouse_down (ev) {
		current_path = current_segment = null;
		resize_rectangle = false;
		var hitResult = paper.project.hitTest (ev.point, hitOptions);

		if (!hitResult) {
			if (rectangle) {
				state = 'initial';
				rectangle.remove();
				paper.project.activeLayer.selected = false;
				rectangle = null;
				return ;
			}

			state = 'selecting';
			rectangle = new Path.Rectangle(ev.point, new Size(10,12));
			rectangle.name = 'selection rectangle';
			return ;
		}

		var path = hitResult.item;
		if (path.name === 'selection rectangle') {
			/*
			 * the rectangle itself was hit */
			current_path = rectangle;
			if (hitResult.segment.index === 3) {
				resize_rectangle = true;
			}
			return;
		}		
		else {
			/*
			 * must be some path */
			current_path = path;

			if (hitResult.type === 'segment') {
				current_segment = hitResult.segment;
				return;
			}

			if (hitResult.type === 'stroke') {
				current_segment = path.insert (hitResult.location.index + 1 , ev.point );
				return;
			}

		}
	}
	
	function mouse_drag (ev) {
		if (state === 'selecting') {
			/*
			 * assumed drag towards bottom right
			 * handle all other cases here */
			rectangle.bounds.bottomRight = ev.point;
			return;
		}
		if (current_path && current_path.name === 'selection rectangle') {
			/*if (resize_rectangle) {
				// resize all with rectangle
				var _scaling = rectangle.scaling;
				_scaling.x = (rectangle.bounds.x + ev.delta.x) / rectangle.bounds.x;
				_scaling.y = (rectangle.bounds.y + ev.delta.y) / rectangle.bounds.y;
				rectangle.bounds.x += ev.delta.x;
				rectangle.bounds.y += ev.delta.y;
				rectangle.setScaling( _scaling );
				rectangle.paths.forEach (function(item) {
					item.setScaling ( _scaling );
				});
				
				return;
			}*/
			// move all with rectangle
			//rectangle.position = rectangle.position.add (ev.delta);
			rectangle.position.add (ev.delta);
			rectangle.paths.forEach (function(item) {
				item.position = item.position.add (ev.delta);
			});
			return;
		}

		/*
		 * change the path */
		if (current_segment) {
			current_segment.point.x += ev.delta.x;	
			current_segment.point.y += ev.delta.y;	
			
			// resize selection rectangle
		}
	}

	function mouse_up (ev) {
		if (state === 'selecting') {
			state = 'selected';
			rectangle.selected = true;
			rectangle.paths = paper.project.getItems ({ inside: rectangle.toShape(false).bounds });
			rectangle.paths.forEach (function(item) {
				item.selected = true;
			});
		}
	}

	function mouse_move (ev) {
		paper.project.activeLayer.selected = false;
		if (ev.item) {
			ev.item.selected = true;
		}
		if (rectangle) {
			rectangle.selected = true;
			rectangle.paths.forEach (function(item) {
				item.selected = true;
			});
		}
	}

	transform.mouse_move = mouse_move;
	transform.mouse_down = mouse_down;
	transform.mouse_drag = mouse_drag;
	transform.mouse_up = mouse_up;

	return transform;
});
