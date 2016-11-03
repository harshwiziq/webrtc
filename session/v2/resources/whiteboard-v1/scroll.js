
	var scroll = function (context, info){
		this.workspace = context;
		this.log = this.workspace.log;
		return this;
	};


	scroll.prototype.handle_remote_event = function (info) {
		switch (info.evt) {
			case 'mouse-up':
				handle_remote_scroll.bind(this) (info);
				break;
			default:
				this.log.error ('unhandled event', info);
		}
	};

	function handle_remote_scroll (info) {
		var point = new this.workspace.scope.Point (info.x, info.y);
		this.workspace.scope.view.center = point;
		this.workspace.fit_to_dimensions();
	}

	module.exports = scroll;
