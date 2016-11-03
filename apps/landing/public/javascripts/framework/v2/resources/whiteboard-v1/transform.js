define(function(require){
	var values = {
		paths: 5,
		minPoints: 5,
		maxPoints: 15,
		minRadius: 30,
		maxRadius: 90
	};

	var hitOptions = {
		segments: true,
		stroke: true,
		fill: true,
		tolerance: 5
	};

	var selectionRectangle = null;
	var selectionRectangleScale=null;
	var selectionRectangleScaleNormalized=null;
	var selectionRectangleRotation=null;

	var segment, path, selectionRectangleSegment;
	var movePath = false;

	function initSelectionRectangle(path) {
		if(selectionRectangle!=null)
			selectionRectangle.remove();
		var reset = path.rotation===0 && path.scaling.x==1 && path.scaling.y==1;
		var bounds;
		if(reset)
		{
				console.log('reset');
				bounds = path.bounds;
				path.pInitialBounds = path.bounds;
			}
		else
		{
				console.log('no reset');
				bounds = path.pInitialBounds;
			}
		console.log('bounds: ' + bounds);
		b = bounds.clone().expand(10,10);
		
		selectionRectangle = new Path.Rectangle(b);
		selectionRectangle.pivot = selectionRectangle.position;
		selectionRectangle.insert(2, new Point(b.center.x, b.top));
		selectionRectangle.insert(2, new Point(b.center.x, b.top-25));
		selectionRectangle.insert(2, new Point(b.center.x, b.top));
		if(!reset)
		{
				selectionRectangle.position = path.bounds.center;
				selectionRectangle.rotation = path.rotation;
				selectionRectangle.scaling = path.scaling;
			}

		selectionRectangle.strokeWidth = 1;
		selectionRectangle.strokeColor = 'blue';
		selectionRectangle.name = "selection rectangle";
		selectionRectangle.selected = true;
		selectionRectangle.ppath = path;
		selectionRectangle.ppath.pivot = selectionRectangle.pivot;
	}
	function onMouseDown(event) {
		segment = path = null;
		var hitResult = paper.project.hitTest(event.point, hitOptions);
		if (!hitResult) {
			if(selectionRectangle!=null)
				selectionRectangle.remove();
			return;
		}

		if (event.modifiers.shift) {
				if (hitResult.type == 'segment') {
							hitResult.segment.remove();
						}
				return;
			}

		if (hitResult) {
				console.log(hitResult);
				path = hitResult.item;
				
				if (hitResult.type == 'segment') {
							if(selectionRectangle!=null && path.name == "selection rectangle")
							{
											console.log('selectionRectangle');
											if(hitResult.segment.index >= 2 && hitResult.segment.index <= 4)
											{
																console.log('rotation');
																selectionRectangleRotation = 0;
															}
											else
											{
																console.log('scale');
																selectionRectangleScale = event.point.subtract(selectionRectangle.bounds.center).length/path.scaling.x;
															}
										}
							else
								segment = hitResult.segment;
						} else if (hitResult.type == 'stroke' && path!=selectionRectangle) {
									var location = hitResult.location;
									segment = path.insert(location.index + 1, event.point);
									path.smooth();
								}
				if((selectionRectangle==null || selectionRectangle.ppath!=path) && selectionRectangle!=path)
				{
							initSelectionRectangle(path);
						}
			}
		else
		{
				if(selectionRectangle!=null)
					selectionRectangle.remove();
			}
		movePath = hitResult.type == 'fill';
		if (movePath)
			paper.project.activeLayer.addChild(hitResult.item);
	}

	function onMouseMove(event) {
		paper.project.activeLayer.selected = false;
		if (event.item)
		{
				event.item.selected = true;
			}
		if(selectionRectangle)
			selectionRectangle.selected = true;
	}

	function onMouseDrag(event) {
		if (selectionRectangleScale!=null)
		{
				ratio = event.point.subtract(selectionRectangle.bounds.center).length/selectionRectangleScale;
				scaling = new Point(ratio, ratio);
				selectionRectangle.scaling = scaling;
				selectionRectangle.ppath.scaling = scaling;
				console.log('scaling: '+selectionRectangle.ppath);
				return;
			}
		else if(selectionRectangleRotation!=null)
		{
				console.log('rotation: '+selectionRectangle.ppath);
				rotation = event.point.subtract(selectionRectangle.pivot).angle + 90;
				selectionRectangle.ppath.rotation = rotation;
				selectionRectangle.rotation = rotation;
				return;
			}
		if (segment) {
				segment.point.x += event.delta.x;
				segment.point.y += event.delta.y;
				path.smooth();
				initSelectionRectangle(path);
			} else if (path) {
					if (path!=selectionRectangle)
					{
								path.position.x += event.delta.x;
								path.position.y += event.delta.y;
								selectionRectangle.position.x += event.delta.x;
								selectionRectangle.position.y += event.delta.y;
							}
					else
					{
								selectionRectangle.position.x += event.delta.x;
								selectionRectangle.position.y += event.delta.y;
								selectionRectangle.ppath.position.x += event.delta.x;
								selectionRectangle.ppath.position.y += event.delta.y;
							}
				}
	}

	function onMouseUp(event) {
		selectionRectangleScale = null;
		selectionRectangleRotation = null;
	}



	/*
	 * expose required methods */
	var trans= {};
	trans.mouse_move = onMouseMove;
	trans.mouse_down = onMouseDown;
	trans.mouse_drag = onMouseDrag;
	trans.mouse_up = onMouseUp;
	return trans;
});
