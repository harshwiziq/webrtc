define (function(require){
	var $ = require ('jquery');
	var events = require ('events');

	var log;
	var f_handle;
	var perms_obj;
	var po = {};
	var perms_ev = events.emitter ('framework:perms', 'permsO');
	var _allowed;
	var att_api;

	po.init = function (info, handles) {
		log = handles.log;
		f_handle = handles.f_handle;
		att_api  = f_handle.attendees;
		_allowed = f_handle.perms.has_perm;
		perms_obj = handles.perms_obj || {};

		events.bind('framework:attendees', handle_events, 'permsO');
	};

	po.start = function (_obj) {
		/*
		 * Check all the dynamic perms and let people know
		 * dynamic perms are perms which can change at the runtime */

		var dperms = [
			{ key: "perms"  , subkey: "grant"   , val: false  },
			{ key: "write"  , subkey: "control" , val: false  }
		];

		/*
		 * dynamic perms will most likely be of the form (hai/ya nhi hai) is/isn't */
		dperms.forEach (function (_perm) {
			/*
			 * make sure dperms exists in the perms_obj */
			perms_obj.allowed [_perm.key] = perms_obj.allowed [_perm.key] || {};
			perms_obj.allowed [_perm.key] [_perm.subkey] = perms_obj.allowed [_perm.key] [_perm.subkey] || {};
			perms_obj.allowed [_perm.key] [_perm.subkey].users = perms_obj.allowed [_perm.key] [_perm.subkey].users || "";

			_perm.val = f_handle.perms.check_perm (_obj, _perm.key, _perm.subkey);

			change_perm (_perm);
		});
	};

	po.command = function (command, data) {
		var _d = $.Deferred();
		/*
		 * data ==> vc_id, key, subkey, val */

		var vc_id = data.vc_id;
		var for_me = f_handle.identity.am_i (vc_id);
	
		if (!for_me) {
			log.warn ('PO: received '+ command +', but I am not the target, rejecting!', data);
			_d.reject ('i am not the target');
		}
		else {
			var is_immutable = f_handle.perms.has_perm ('perm', 'immutable', '*');
			if (is_immutable)
				return _d.reject ('my permissions are immutable');

			change_perm (data);
			_d.resolve (data);
		}

		return _d.promise ();
	};

	po.info = function (data) {
		var vc_id = data.vc_id;
		var for_me = f_handle.identity.am_i (vc_id);
	
		if (!for_me) {
			if (data.key === 'write' && data.subkey === 'control')
				att_api.set_meta (vc_id, 'write-control', data.val);
		}
		else {
			/*
			 * Ignore */
			log.log ('perm override info: ' + data.key + '-' + data.subkey + ' ' + (data.val ? 'given to ' : 'taken from ') + 'me!');
		}
	};

	function handle_events (ev, data) {
		if (ev === 'perms') {
			var vc_id  = data.vc_id;
			var key = data.key;
			var val = data.value;
			var for_me = f_handle.identity.am_i (vc_id);

			if (!for_me) {
				request_remote_override (vc_id, key, val)
				.then (
					function () { 
						att_api.set_meta (vc_id, key, val);
					},
					function () {
						att_api.set_meta (vc_id, key, !val);
					}
				);
			}
			else {
				/*
				 * If this is from me it should come
				 * via po.info (i.e. framework) and not
				 * via some event in attendee namespace */
				log.warn ('coming via wrong path!', {data: data, ev: ev});
			}
		}
	}

	function request_remote_override (vc_id, control, val) {
		var _d = $.Deferred ();
		if (!_allowed ('perms', 'grant', vc_id)) {
			_d.reject ('op. not allowed!');
			return _d.promise ();
		}

		var msg = {
			vc_id : vc_id,
			val : !!val		
		};

		switch (control) {
			case 'write-control':
				msg.key = 'write';
				msg.subkey = 'control';
				break;

			default:
				log.error ('request remote override called for unsupported control', control);
		}
		return f_handle.send_command (vc_id, 'override', msg);
	}

	function change_perm (_perm) {

		try {
			/*
			 * change the permission object in use */
			perms_obj.allowed [_perm.key] [_perm.subkey].users = (_perm.val) ? "*" : "";

			/*
			 * let people know */
			perms_ev.emit ('override', _perm);

		} catch (e) {
			log.error ('change perms',e);
			return false;
		}

		return true;
	}

	return po;
});
