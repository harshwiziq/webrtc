define (function(require) {
	var Pen = require ('./pen');
	var Line = require('./line'); 
	var Scroll = require('./scroll');
	var Zoom = require('./zoom');
	var Transform = require('./transform'); 
	var tinycolorpicker = require('./jquery.tinycolorpicker.vc');

	var Workspace = function (info, $anchor) {
		var $canvas = $anchor.find('.wb-canvas');

		this.uid = info.vc_id;
		this.log = info.log;
		this.uuid = info.uuid;	
		this.owner = info.owner;
		this.anchor = $anchor;	
		this.upstream = info.upstream; // this comm. will eventually happen via events
		this.scroll_lock = false;

		this.MAX_VIEW = {
			// when changing these, change the css as well
			width : 3000,
			height: 3000
		};
		
		this.scope = new paper.PaperScope();
		this.scope.setup( $canvas[0] );
		this.project = this.scope.project;

		init_handlers.bind(this) ($anchor);

		this.controls = {};
		this.controls.pen = new Pen(this);
		this.controls.scroll = new Scroll(this);
		this._tool = {
			selected : "pen",
			active   : undefined
		};
		this.controls.pen.select ();
		this.colors = {
			'pen': '#5c6274',
			//'brush': '#e19526',
			//'highlighter': '#e19526'
		};
		this.color (this.colors.pen);
		this.stroke = 'pen';
		this.zoom = 1.0;

		this.tool = new this.scope.Tool();
		//this.tool.onMouseMove = mouse_move.bind(this);
		this.tool.onMouseDown = mouse_down.bind(this);
		this.tool.onMouseDrag = mouse_drag.bind(this);
		this.tool.onMouseUp = mouse_up.bind(this);
		this.tool.onKeyDown = key_down.bind(this);
		this.tool.onKeyUp = key_up.bind(this);
		this.set_enabled(true);

		return this;
	};

	Workspace.prototype.set_enabled = function (val) {
		var self = this;
		var $toolbar = self.anchor.find ('.wb-controls-area');

		if (val) {
			/*
			 * Show the toolbar */
			$toolbar.css ('display','block');
			/*
			 * Change the current tool to pen */
			this._tool.selected = 'pen';
			this.controls.pen.select ();
			self._enabled = true;
			return self;
		}

		/*
		 * Hide the toolbar */
		$toolbar.css ('display','none');
		/*
		 * Set the current tool to scroll */
		this._tool.selected = 'scroll';
		this.controls.scroll.select ();
		self._enabled = false;
		return self;
	};
	
	Workspace.prototype.activate = function () {
		this.scope.activate ();
		this.scope.View.updateFocus ();
		return this;
	};

	Workspace.prototype.load_snapshot = function (data) {
		this.project.importJSON(data);
		return this;
	};

	Workspace.prototype.handle_remote_event = function (info) {
		var ctrl = this.controls[ info.tool ];
		if (ctrl)
			ctrl.handle_remote_event (info);
					
		return this;
	};

	Workspace.prototype.color = function (val) {
		var self = this;
		if (val) {
			if (self.picker) {
				self._color = val;
				self.picker.setColor (val);
			}
		}
		return self._color; 
	};

	Workspace.prototype.send_info = function (evt_name, data) {
		data.uuid = this.uuid;
		this.upstream.send_info (evt_name, data);	
	};

	Workspace.prototype.bring_to_view = function (point) {
		if (this.scroll_lock)
			return ;

		var rect = this.scope.view.bounds;
		if (!rect.contains(point)) {
			this.scope.view.center = point;
			this.fit_to_dimensions ();
		}
	};

	Workspace.prototype.fit_to_dimensions = function () {
		/*
		 * Make sure the view is within the bounds */
		var point = new this.scope.Point (this.scope.view.center);
		var rect = this.scope.view.bounds;

		if (rect.x < 0) {
			point.x = this.scope.view.viewSize.width / 2;
		}
		else if (rect.x + rect.width > this.MAX_VIEW.width) {
				point.x = this.MAX_VIEW.width - (this.scope.view.viewSize.width / 2);
		}
		if (rect.y < 0) {
			point.y = this.scope.view.viewSize.height / 2;
		}
		else if (rect.y + rect.height > this.MAX_VIEW.height) {
			point.y = this.MAX_VIEW.height - (this.scope.view.viewSize.height / 2);
		}

		this.scope.view.center = point;
	};
	/*
	 * always bind scope when calling the methods below
	 */

	function init_handlers ($anchor) {
		var self = this;
		var $canvas = $anchor.find('.wb-canvas');
		var $color = $anchor.find('.colorpicker');
		
		/*
		 * tinycolorpicker init */
		$color.tinycolorpicker();
		self.picker = $color.data('plugin_tinycolorpicker');

		/*
		 * zoom in/out using mouse wheel */
		var zoom = new Zoom();
		$canvas.on("wheel", function (ev) {
			//zoom.event (ev);
		});

		/*
		 * Color change handler */
		$color.bind('change', function(){
			if (!self._enabled)
				return ;

			var val = self.picker.colorRGB;
			self.color (val);
		});

		/*
		 * Stroke select handler */
		$anchor.on('click', '.wb-outer a.stroke',function(ev) {
			if (!self._enabled)
				return ;

			var $li = $(this).closest('li');
			var name = $li.attr('data-name');
			self._tool.selected = 'pen';
			self.controls.pen.select();

			switch (name) {
				case 'pen':
					self.stroke = 'pen';
					break;

				case 'brush':
					self.stroke = 'brush';
					break;

				case 'highlighter':
					self.stroke = 'highlighter';
					break;

				default:
					log.error ('stroke selection needs fixing');
			}
			//self.color (self.colors[ self.stroke ]);
		});

		$anchor.on('click', '.wb-outer a.hand',function(ev) {
			if (!self._enabled)
				return ;

			self._tool.selected = 'scroll';
			self.controls.scroll.select();
		});
	}

	function key_down (ev) {
		var self = this;
		if(ev.key === 'shift') {
			this.controls.scroll.select ();
		}
	}

	function key_up (ev) {
		var self = this;
		if (ev.key === 'shift') {
			_d_mouse_up.then (function () {
				var val = self._tool.selected;
				self.controls[val].select ();
			});
		}
	}

	var _d_mouse_up = $.Deferred();
	_d_mouse_up.resolve ();
	function mouse_down (ev) {
		/*
		 * Mouse is down */
		_d_mouse_up = $.Deferred();

		var val = this._tool.active;

		if (this._enabled || val === 'scroll')
			this.controls[ val ].mouse_down (ev);
	}

	function mouse_drag (ev) {
		var val = this._tool.active;

		if (this._enabled || val === 'scroll')
			this.controls[ val ].mouse_drag (ev);
	}

	function mouse_up (ev) {
		var val = this._tool.active;

		if (this._enabled || val === 'scroll')
			this.controls[ val ].mouse_up (ev);

		/*
		 * Released mouse */
		_d_mouse_up.resolve();
	}

	return Workspace;
});
