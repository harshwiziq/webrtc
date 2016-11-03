	var shapes = function (context, info) {
		this.workspace = context;
		this.log = this.workspace.log;
		return this;
	};

	shapes.prototype.handle_remote_event = function (info) {
		switch (info.evt) {
			case 'new-shape':
				draw_new_shape.bind(this) (info);
				break;

			default:
				this.log.error ('unhandled event', info);
		}
		return this;
	};

	function draw_new_shape (info) {
		var paper = this.workspace.scope;
		var path = new paper.Path();
		path.importJSON (info.data);
	}

	module.exports = shapes;
