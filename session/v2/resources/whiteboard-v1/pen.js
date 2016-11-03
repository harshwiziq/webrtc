
	var pen = function (context, info) {
		this.workspace = context;
		this.log = this.workspace.log;
		this._paths = {};
		return this;
	};

	pen.prototype.select = function () {
	};

	pen.prototype.handle_remote_event = function (info) {

		switch (info.evt) {
			case 'mouse-down' :
				initiate.bind(this) (info);
				break;

			case 'mouse-drag' :
				follow.bind(this) (info);
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
		}
	}
	
	module.exports = pen;
