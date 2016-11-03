define(function(require){
	var pen = function (context, info) {
		this.workspace = context;
		this.log = this.workspace.log;
		this._paths = {};
		return this;
	};

	pen.prototype.select = function () {
		/*
		 * unselect prev tool (if any) */
		var val = this.workspace._tool.active;
		if (val)
			this.workspace.controls[ val ].unselect ();

		this.workspace._tool.active = 'pen';
		this.workspace.anchor.find('.wb-canvas').addClass('cursor-to-pen');
	};

	pen.prototype.unselect = function () {
		this.workspace.anchor.find('.wb-canvas').removeClass('cursor-to-pen');
	};

	pen.prototype.mouse_down = function (ev) {
		/*
		 * Is it right click? */
		if (ev.event.button === 2)
			return this;

		this.workspace.scroll_lock = true;
		var info = {
			evt : 'mouse-down',
			tool: 'pen',
			uid : this.workspace.uid
		};

		info.x = ev.point.x;
		info.y = ev.point.y;
		info.color = ev.modifiers.shift ? '#e19526' : this.workspace.color();
		info.stroke_width = (this.workspace.stroke === 'highlighter') ? 10 : 
		                    (this.workspace.stroke === 'brush') ? 4 : 1.5;
		info.opacity      = (this.workspace.stroke === 'highlighter') ? 0.5 : 1;
		info.stroke_cap   = 'round';

		initiate.bind(this) (info);

		this.workspace.send_info ('wb-event', info);
		return this;
	};

	pen.prototype.mouse_drag = function (ev) {
	
		var info = {
			evt : 'mouse-drag',
			tool: 'pen',
			uid : this.workspace.uid
		};

		info.x = ev.point.x;
		info.y = ev.point.y;

		follow.bind(this) (info);

		this.workspace.send_info('wb-event', info);
		return this;
	};

	pen.prototype.mouse_up = function (ev) {
		this.workspace.scroll_lock = false;
		var info = {
			evt : 'mouse-up',
			tool: 'pen',
			uid : this.workspace.uid
		};
		
		info.x = ev.point.x;
		info.y = ev.point.y;

		finish.bind(this) (info);
		this.workspace.send_info('wb-event', info);
		return this;
	};

	pen.prototype.mouse_move = function (ev) {
		return this;
	};


	pen.prototype.handle_remote_event = function (info) {

		switch (info.evt) {
			case 'mouse-down' :
				initiate.bind(this) (info);
				break;

			case 'mouse-drag' :
				follow.bind(this) (info);
				/*
				 * Update the view, or it will be updated at mouse move on canvas */	
				this.workspace.scope.view.update();
				break;

			case 'mouse-up' :
				finish.bind(this) (info);
				break;

			default : 
				this.log.error ('unhandled event', info);
		}

		return this;
	};

	function initiate (info) {
		var self = this;
		self.workspace.activate();
		var uid = info.uid;
		var path;
		/*
		 * Init a new path */
		self._paths [uid]= new self.workspace.scope.Path ();

		path = self._paths[ uid ];
		path.strokeColor = info.color;
		path.opacity     = info.opacity;
		path.strokeWidth = info.stroke_width;
		path.strokeCap   = info.stroke_cap;

		path.add( new self.workspace.scope.Point( info.x, info.y ));
	}

	function follow (info) {
		var self = this;
		var path = self._paths[ info.uid ];

		if (!path) {
			self.log.error ('path follow: path not found', info);
			return;
		}

		path.add( new self.workspace.scope.Point( info.x, info.y ));
	}

	function finish (info) {
		var self = this;
		var path = self._paths[ info.uid ];
		var point = new self.workspace.scope.Point( info.x, info.y);

		if (path) {
			if (path.segments.length < 2) {
				// draw a dot
				point.x-=0.5;
			}
			path.add (point);
			path.simplify(info.tolerance);
			delete self._paths[ info.uid ];
			self.workspace.scope.view.update();
			/*
			 * bring the last action to view */
			this.workspace.bring_to_view (point);		// decide the location
		}
	}
	
	return pen;
});
