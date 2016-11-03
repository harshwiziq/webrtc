var $ = require('jquery-deferred') ;
var Workspace = require ('./workspace');
var log;

var wb = {};
var uuid_active;

wb.init = function (info, common, handles) {
	var _d = $.Deferred();

	log = handles.log;
	_d.resolve ();
	return _d.promise();
};

var sess_info = {};
wb.init_user = function (user) {
	var _d = $.Deferred();

	/*
	 * Snapshots should be available in cache
	 *
	 * Regenerate if:
	 *   Either the tab is currently active
	 *   Or the snapshot is not available in the cache */
	Object.keys(sess_info).forEach (function (uuid){
		if (!sess_info[ uuid ].snap || uuid === uuid_active) {
			sess_info[ uuid ].snap = boards[ uuid ].get_snapshot();
		}
		sess_info[ uuid ].center = {
			x : boards[ uuid ].scope.view.center.x,
			y : boards[ uuid ].scope.view.center.y
		};
	});

	_d.resolve ({ 
		boards: sess_info
	});

	return _d.promise();
};

wb.command = function (vc_id, command, data) {

};

wb.info = function (from, id, info) {

};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *         Each whiteboard tab/instance has
 *            a server side equivalent
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var boards = {};

wb.relay_info = function (from, to, id, info) {
	/*
	 * Return false if the message
	 * is not to be broadcasted */

	switch (id) {
		case 'new-whiteboard':
			boards[ info.uuid ] = new Workspace({
				log: log,
				uuid: info.uuid,
				owner: info.owner
			});
			
			sess_info[ info.uuid ] = {
				meta : {
					uuid : info.uuid,
					owner: info.owner,
					title: info.title
				},
				snap: undefined,
				center: undefined
			};

			uuid_active = info.uuid;
			return true;

		case 'gone-whiteboard':
			if(boards[ info.uuid ])
			   boards[ info.uuid ].scope.remove();

			delete sess_info[ info.uuid ]; 
			delete boards[ info.uuid ]; 
			return false;

		case 'wb-event':
			if (boards[ info.uuid ]) {
				if (uuid_active != info.uuid) {
					/*
					 * tab was changed */
					log.info ('activating project with uuid:', info.uuid);
					var prev_uuid = uuid_active;
					uuid_active = info.uuid;

					/*
					 * save the snapshot of the prev tab */
					if (boards[ prev_uuid ])
						sess_info[ prev_uuid ].snap = boards[ prev_uuid ].get_snapshot();

					/*
					 * remove the snapshot of the new tab */
					delete sess_info[ uuid_active ].snap;
					boards[ uuid_active ].activate ();

					/*
					 * This method generates a snapshot each time a tab is changed
					 * And will create problems when tab changes are detected quite
					 * frequently, for eg. if 2 people are writing on different tabs
					 * shouldn't be a problem for now, because we don't allow that yet */
				}
				boards[ info.uuid ].handle_remote_event (info);
			}
			return true;

		case 'whiteboard-title':
			try {
				sess_info[ info.uuid ].meta.title = info.title;
				return true;
			}
			catch (e) {
				log.error (e, 'exception in whiteboard-set-title, Ignoring');
			}
			return false;

		default:
			log.error ({from: from, id: id, info: info}, 'unknown info id');
			return false;
	}

	return false;
};

var wb_count = 1;
wb.command = function (vc_id, command, data) {
	var _d = $.Deferred ();

	switch (command) {
		case 'get-title':
			var uuid = data;
			if (sess_info[ uuid ]) {
				if (!sess_info[ uuid ].meta.title) {
				   sess_info[ uuid ].meta.title = 'board (' + wb_count + ')';
				   wb_count++;
				}
				_d.resolve (sess_info[ uuid ].meta.title);
			}
			else {
				_d.reject ('found no board with uuid:', uuid);
			}
			break;

		default:
			log.error ({vc_id: vc_id, command: command, data: data}, 'unknown info id');
	}

	return _d.promise();
};

module.exports = wb;
