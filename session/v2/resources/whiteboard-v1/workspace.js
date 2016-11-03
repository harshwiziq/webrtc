	var paper = require('paper');
	var Pen = require ('./pen');
	var Scroll = require ('./scroll');

	var Workspace = function (info) {

		this.scope = new paper.PaperScope();

		var canvas = this.scope.createCanvas(20,20);
		this.scope.setup( canvas );

		this.uuid = info.uuid;	
		this.owner = info.owner;
		this.log = info.log;
		this.MAX_VIEW = {
			width: 3000,
			height: 3000
		};
		this.project = this.scope.project;
		this.controls = {};
		this.controls.pen = new Pen (this);
		this.controls.scroll = new Scroll (this);

		this.set_enabled (true);
		return this;
	};

	Workspace.prototype.set_enabled = function (val) {
		var self = this;
		self._enabled = !!val;
		return self;
	};
	
	Workspace.prototype.activate = function () {
		this.scope.activate();
		return this;
	};

	Workspace.prototype.get_snapshot = function (force) {
		/* this.scope.view.update();
		 * This only requests an update, if you want a
		 * force update you may want to use view.update(true) or view.draw() */
		var _was_updated = this.scope.view.update();
		this.log.info ({ "was view updated": _was_updated }, 'generating snapshot');
		/*
		 * TODO: (if need be)
		 * Snapshot generation can be avoided
		 * if view.update returns false,
		 * old snapshot can be used safely */
		var data = this.project.exportJSON();
		return data;
	};

	Workspace.prototype.handle_remote_event = function (info) {
		var ctrl = this.controls[ info.tool ];
		if (ctrl)
			ctrl.handle_remote_event (info);
					
		return this;
	};

	Workspace.prototype.fit_to_dimensions = function () {
		var self = this;
		/*
		 * Make sure the view is within the bounds */
		var point = new self.scope.Point (self.scope.view.center);
		var rect = self.scope.view.bounds;

		if (rect.x < 0) {
			point.x = self.scope.view.viewSize.width / 2;
		}
		else if (rect.x + rect.width > this.MAX_VIEW.width) {
				point.x = this.MAX_VIEW.width - (self.scope.view.viewSize.width / 2);
		}
		if (rect.y < 0) {
			point.y = self.scope.view.viewSize.height / 2;
		}
		else if (rect.y + rect.height > this.MAX_VIEW.height) {
			point.y = this.MAX_VIEW.height - (self.scope.view.viewSize.height / 2);
		}

		self.scope.view.center = point;
	};

	module.exports = Workspace;
