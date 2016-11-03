/* wizIQ end points CRUD operations.
 * This db will have a single entry
 */

var mylog        = require('api-backend/common/log').child({ module : 'adaptors/wiziq/end-pts-model' });
var config_model = require('api-backend/common/config-model');
var $            = require('jquery-deferred');

var model = {};

model.get = function () {
	var d = $.Deferred();
	config_model.wiziq_end_pts.find ({}, function (err, end_pts) {

		if (err) {
			mylog.error ({ err : err}, 'wiziq end points get error');
			return d.reject ({ message : err, status : 500 });
		}

		/* if returned end_pts structure empty */
		if (!end_pts || (end_pts && !end_pts.length)) {
			return d.reject ({ message : 'No entry for wiziq-end-pts found in db', status : 404 });
		}

		mylog.info ({Info : end_pts}, 'WizIQ end pts fetched from db');
		d.resolve (end_pts);
	});

	return d.promise();
};

/* add wiziq_end_pts to db */
model.add = function (end_pts) {
	var d = $.Deferred();
 	var model = config_model.wiziq_end_pts;

	model.findOneAndUpdate (
		{},
	   	end_pts,
		{upsert:true, new: true},
	   	function (err, doc) {
			if (err) {
				mylog.error ({ err : err, wiziq_end_pts : end_pts }, 'wiziq end points save error');
				return d.reject ({ message : err, status : 500 });
			}
			
			mylog.info ({ wiziq_end_points_doc : end_pts }, 'wiziq end points saved ok');
			d.resolve (end_pts);			
	 	}
	);

	return d.promise();
};

model.remove = function () {
	var d = $.Deferred();

	config_model.wiziq_end_pts.remove ({}, function (err, done) {
		if (err) {
			mylog.error ({ err : err }, 'wiziq end points remove error');
			return d.reject ({message : err, status : 500});
		}

		if (done && done.result && done.result.n) {
   			mylog.info ('wiziq end points removed ok');
			return d.resolve ({ message : 'wiziq end points removed successfully' });
		}

		mylog.error ('No wiziq end point entry present in db to be removed');
		d.reject ({ message : 'Remove unsuccessful', status : 404 });
	});

	return d.promise();
};

module.exports = model;

