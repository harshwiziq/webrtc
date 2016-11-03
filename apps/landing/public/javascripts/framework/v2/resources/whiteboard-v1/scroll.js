define(function(require){
	var scroll = function (context, info){
		this.workspace = context;
		this.log = this.workspace.log;
		return this;
	};

	scroll.prototype.select = function () {
		/*
		 * unselect prev tool */
		var val = this.workspace._tool.active;
		if (val)
			this.workspace.controls[ val ].unselect ();

		this.workspace._tool.active = 'scroll';
		this.workspace.anchor.find('.wb-canvas').addClass('cursor-to-grab');
	};

	scroll.prototype.unselect = function () {
		this.workspace.anchor.find('.wb-canvas').removeClass('cursor-to-grab');
	};

	scroll.prototype.mouse_down = function (ev) {
	};

	scroll.prototype.mouse_drag = function (ev) {
		var pt = new this.workspace.scope.Point( -ev.delta.x , -ev.delta.y );
		this.workspace.scope.view.scrollBy(pt);	
	};

	scroll.prototype.mouse_up = function (ev) {
		var info = {
			evt: 'mouse-up',
			tool: 'scroll'
		};
		info.x = this.workspace.scope.view.center.x;
		info.y = this.workspace.scope.view.center.y;

		if (this.workspace._enabled)
			this.workspace.send_info ('wb-event', info);
		this.workspace.fit_to_dimensions ();
	};
	
	scroll.prototype.mouse_move = function (ev) {
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
		//this.workspace.bring_to_view (new paper.Point (info.x, info.y));
		if (this.workspace.scroll_lock)
			return ;

		var point = new this.workspace.scope.Point (info.x, info.y);
		this.workspace.scope.view.center = point;
		this.workspace.fit_to_dimensions();
	}

	return scroll;
});
