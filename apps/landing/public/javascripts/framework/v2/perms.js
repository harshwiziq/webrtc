define (function(require) {
	var log      = require('log')('perms', 'info');
	var po       = require('./perms-override');
	var perm_obj = {};
	var perms    = {};
	var f_handle;

	perms.init = function (sess_config, framework) {
		perm_obj = sess_config.perms;
		f_handle = framework.handle('perms');

		if (!perm_obj || !perm_obj.allowed) {
			perm_obj = {};
			perm_obj.allowed = perm_obj.denied = {};
		}

		log.info({ perms : perm_obj }, 'permission set');
		po.init ({}, {
			log : log,
			f_handle : f_handle,
			perms_obj : perm_obj
		});
		return;
	};

	perms.api = {
		has_perm : has_permission,
		check_perm : check_permission
	};

	/*
	 * To be used by framework */
	perms.info = po.info;
	perms.start = po.start;
	perms.command = po.command;

	/*
	 * Local functions */

	function has_permission (res, op, to) {
		return check_permission (perm_obj, res, op, to);
	}

	function check_permission (_obj, res, op, to) {

		if (to === f_handle.identity.vc_id)
			to = 'self';

		/* Validating args*/
		if (!res || !op || typeof res!== 'string' || typeof op !== 'string') {
			log.error({ to : to, res : res, op : op }, 'invalid or null args');
			return false;
		}

		if (!to) {
			to = 'self';
		}

		log.info({ res : res, op : op, to : to }, 'variables set');
		
		if (!_obj || _obj === {}) {
			log.error ({ to : to, resource : res, operation : op }, 'no permission present');
			return false;
		}

		if (!_obj.allowed || _obj.allowed === {}) {
			log.error ({ perm_obj : _obj }, 'allowed object empty');
			return false;
		}

		if (check_perm (_obj.allowed, res, op, to)) {
			if (_obj.denied) {
				log.info('checking inside denied');
				return check_perm (_obj.denied, res, op, to) ? false : true;
			}

			return true;
		}

		log.info('not allowed');	
		return false;
	}

	/*
	 * traverses allowed and denied object */
	function check_perm (__obj, res, op, to) {
		var user_spec;

		if (!__obj[res]) {
			log.info ({ res : __obj[res] }, 'resource not found');
			return false;
		}

		if (!__obj[res][op]) {
			log.info ({ op : __obj[res][op] }, 'operation not found');
			return false;
		}

		user_spec = __obj[res][op].users;

		if (!user_spec) {
			log.info ({ user_spec : user_spec }, 'users not found');
			return false;
		}

		if (typeof user_spec === 'string'){
			switch (user_spec) {
				case "*":
				case to :
					return true;
				default : 
					log.info({ user_spec : user_spec }, 'user_spec value not found');
					return false;
			}
		}
		
		if (typeof user_spec === 'object') {
			return user_spec[to] ? true : false;
		}

		log.error ({ user_spec : user_spec }, 'incorrect user_spec type');
		return false;
	}

	return perms;
});
