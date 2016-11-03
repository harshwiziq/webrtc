define(function(require){
	var shapes = function (context, info) {
		this.workspace = context;
		this.log = this.workspace.log;
		this.anchor = this.workspace.anchor;
		this.current_shape = 'triangle';
		this.path = undefined;
	
		init_handlers.bind(this) ();
		return this;
	};

	function init_handlers () {
		/*
		 * Init the listeners for shape selection here
		 * And update the current shape accordingly */
	}

	function create_shape (name, point, number) {
		var path;
		switch (name) {
			case 'triangle':
				number = number || 10;
				path = new Path ([					
					new Point(point.x + number/2, point.y),
					new Point(point.x           , point.y - number),
					new Point(point.x + number  , point.y - number)
				]);
				break;
			case 'rectangle':

				break;			
			default:
				shapes.log.error ('no such shape:', name);
		}
		return path;
	}

	function resize_shape (name, path, point) {
		var new_width = Math.max (point.x, path.bounds.x) - Math.min (point.x, path.bounds.x);
		var new_height = Math.max (point.y, path.bounds.y) - Math.min (point.y, path.bounds.y);

		var scale_x = new_width / path.bounds.width;
		var scale_y = new_height / path.bounds.height;

		var prev_pos = new Point (path.bounds.x, path.bounds.y);

		path.scale (scale_x, scale_y);

		/*
		 * calculate new position */
		var new_pos = prev_pos + new Point (path.bounds.width / 2, path.bounds.height / 2);
//		path.position = new_pos;
	
	}

	shapes.prototype.mouse_move = function (ev) {
	};

	shapes.prototype.mouse_down = function (ev) {
		/*
		 * place a 0x0 shape? */
		this.path = create_shape (this.current_shape, ev.point);
		this.path.name = name;
		this.path.strokeColor = this.workspace.color();
		this.path.closed = true;
	};

	shapes.prototype.mouse_drag = function (ev) {
		/*
		 * resize the shape */
		resize_shape (this.current_shape, this.path, ev.point);
	};

	shapes.prototype.mouse_up = function (ev) {
		/*
		 * shape complete
		 * tell others */

		var info = {
			tool: 'shapes',
			evt: 'new-shape',
			name: this.path.name,
			data: this.path.exportJSON()
		};

		this.workspace.send_info('wb-event', info);
		this.path = undefined;
	};

	shapes.prototype.handle_remote_event = function (info) {
		switch (info.evt) {
			case 'new-shape':
				draw_new_shape (info);
				break;

			default:
				this.log.error ('unhandled event', info);
		}
		return this;
	};

	function draw_new_shape (info) {
		var path = new Path();
		path.importJSON (info.data);
		paper.view.draw();
	}

	return shapes;
});
