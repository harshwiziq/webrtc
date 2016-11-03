var $ = require('jquery-deferred');
var OpenTok = require('opentok');

var av_tokbox = {};

var opentok;
var _session = {};
var sessionid = null;
var key;
var secret;
var init;
var users_handle;
var coms_handle;
var chromelocalextensionid;
var chromeextensionid;
var inlinechromeextinstall;
var log;

/* number of audio and video streams */
var max_videos;
var max_audios;

/* whether a/v allowed on start up */
var startup;

/*
 * maps maintaining users which have audio
 * and video ON respectively.
 * Each entry is a key value pair.
 *    Key   : vc_id,
 *    Value : 'granted' or 'committed'
 */
var videos = {};
var audios = {};

av_tokbox.init = function (myinfo, common, handles) {
	var _d = $.Deferred ();

	log = handles.log;
	users_handle = handles.user;
	coms_handle = handles.coms;

	log.debug ({ myinfo : myinfo }, 'init information');

	if (!myinfo || !myinfo.custom) {
		log.error ({ stack : new Error (), myinfo : myinfo }, 'incorrect init info');
		_d.reject ('bad init information');
		return _d.promise ();
	}

	key                    = myinfo.custom.apikey;
	secret                 = myinfo.custom.apisecret;
	chromelocalextensionid = myinfo.custom.chromelocalextensionid;
	chromeextensionid      = myinfo.custom.chromeextensionid;
	inlinechromeextinstall = myinfo.custom.inlinechromeextinstall;

	var limits = myinfo.config && myinfo.config.custom && myinfo.config.custom.limits;

	if (!limits) {
		limits = {
			max_videos : 5,
			max_audios : 20,
			startup    : 'all'
		};
	}

	/* set video and audio values */
	max_videos = limits.max_videos ;
	max_audios = limits.max_audios ;
	startup    = limits.startup ;

	try {
		opentok = new OpenTok(key, secret);
	}
	catch ( e ) {
		log.error({ err: e }, 'init error (OpenTok)');
	}

	var opt = {};
	opt.mediaMode = ( myinfo.custom.p2p ) ? 'relayed' : 'routed';
	/*
	 * create a room
	 */
	opentok.createSession (opt , function(err, session) {
		if ( err ) {
			log.error({ err: err}, 'init error (createSession)');
			return _d.reject('opentok session creation failed');
		}

		_session  = session;
		sessionid = session.sessionId;
		key       = key;
		secret    = secret;
		init      = true;

		log.info ({ limits : limits, tokbox_sess_id : session.sessionId }, 'init ok');

		return _d.resolve();
	});
	
	return _d.promise ();
};

/*
 * depending on start up and number of audio nd video streams working,
 * allow audio/video for a user
 */  
av_tokbox.init_user = function (user, prev_info, __log) {
	var _d = $.Deferred ();

	var on_startup = get_startup_config (user.vc_id, __log);

	save_av_config (on_startup, user.vc_id);

	__log.info ({audio : on_startup.audio, video : on_startup.video, vc_id : user.vc_id}, 'user start up info');	
	__log.info ({ Videos : videos, Audios : audios }, 'Video and audio maps respectively' );

	createToken (user,on_startup, __log, function (err, res) {
		return ( err ) ? _d.reject (err) : _d.resolve (res);
	});

	broadcast_av_status (user.vc_id, true, on_startup.audio, on_startup.video);
	return _d.promise ();
};

/* TODO : Handle that race condition where a user refreshes,
 *        his init_user may be called before remove_user
 */ 
av_tokbox.remove_user = function (vc_id) {

	if (videos [vc_id]) {
		delete videos [vc_id];
	}

	if (audios [vc_id]) {
		delete audios [vc_id];
	}

	broadcast_av_status (vc_id, false);
	return true;
};

av_tokbox.info = function (user, info_id, info) {

	var vc_id;

	switch (info_id) {

		case 'stream-property-changed' :
			vc_id = info.vc_id;
			var map   = (info.property === 'audio') ? audios : videos;
			update_structure (map, vc_id, info.is_set);
			broadcast_av_status (vc_id, false);
			break;

		case 'av-startup-confirm' :
			vc_id            = info.vc_id;
			var on_startup   = info.on_startup;
			var is_success   = (info.status === 'success') ? true : false;
			var is_broadcast = false;

			/*
			 * if no entry in audio or video map,
			 * then this is a new stream which has 
			 * been directly started by clicking on
			 * UI buttons
			 */
			if (is_success && !audios[vc_id] && !videos[vc_id])
				is_broadcast = true;

			if (on_startup.audio)
				update_structure (audios, vc_id, is_success);

			if (on_startup.video)
				update_structure (videos, vc_id, is_success);

			if (!is_success || is_broadcast) {
				/* broadcast av status */
				broadcast_av_status (vc_id, false);
			}
			break;


		default :
			log.error ({info_id : info_id}, 'Unknown info received. Ignoring ..');

	}

	log.info ({user : user, info_id : info_id, info : info, audios : audios, videos : videos}, 'av-tokbox info');
};

/*
 * before checking for conditions, check if user
 * is present in audio/video arrays and return start-up
 * info, else follow the usual route. This check takes
 * care of race conditions. eg: in browser refresh scenarios
 * A/V is packed to full limit and a user who had audio and/or
 * video controls refreshes his browser.  
 */ 
function get_startup_config (vc_id, __log) {

	var on_startup = {};
	var video_cntr = Object.keys(videos).length;
	var audio_cntr = Object.keys(audios).length;

	fetch_startup_config_locally (on_startup, vc_id);

	if (Object.keys(on_startup).length !== 0) {
		return on_startup;
 	}
	
	create_startup_config (vc_id, on_startup, video_cntr, audio_cntr, __log);

	return on_startup;
}

function fetch_startup_config_locally (on_startup, vc_id) {

	if (videos [vc_id]) {
		on_startup.video = true;
		on_startup.audio = true;
		return;
	}

	if (audios [vc_id]) {
		on_startup.video = false;
		on_startup.audio = true;
		return;
	}

	return;
}

function create_startup_config (vc_id, on_startup, video_cntr, audio_cntr, __log) {

	switch (startup) {

		case 'all':

			if (video_cntr < max_videos) {
				on_startup.video = true;
				on_startup.audio = true;
				break;
			}

			if (audio_cntr < max_audios) {
				on_startup.video = false;
				on_startup.audio = true;
				break;
			}

			on_startup.video = false;
			on_startup.audio = false;
			break;

		case 'none':
			on_startup.video = false;
			on_startup.audio = false;
			break;

		case 'with-perms':
			on_startup.video = get_startup_with_perms (vc_id, 'av-camera');
			on_startup.audio = get_startup_with_perms (vc_id, 'av-microphone');
			break;

		default:
			on_startup.video = false;
			on_startup.audio = false;
			break;

	}

	__log.info ({vc_id : vc_id, on_startup : on_startup, startup : startup}, 'startup config');

}

function get_startup_with_perms (vc_id, property) {
	var map       = (property === 'av-camera') ? videos : audios;	
	var threshold = (property === 'av-camera') ? max_videos : max_audios;	
	var cntr      = Object.keys(map).length;

	if (cntr >= threshold)
		return false;

	var bool = users_handle.has_perms (vc_id, property, 'startup', 'self') ? true : false;
	return bool;
}

/*
 * save necessary user A/V config.
 * Just mark that the resource has been
 * granted, do not commit it yet.
 */
function save_av_config (on_startup, vc_id) {

	/* if video is ON, audio will be ON */
	if (on_startup.video) {
		videos [vc_id] = 'granted';
		audios [vc_id] = 'granted';
		return;
	}

	if (on_startup.audio) {
		audios [vc_id] = 'granted';
		return;
	}

	return;
}

/*
 * createToken.
 * @params required
 * role - user role could be one of the following: 'moderator', 'publisher', 'subscriber'
 * expireTime - token expire time.
 * data - Optional connection data, may comprise of userid, username, etc. 1000 bytes max
 * @return : classid, sessionid, token, apikey, username, authid
 */
function createToken (user,on_startup, __log, cb) {
	/*
	 * SS We'd require the token when an authenticated user comes in anytime after class is scheduled.
	 * This could be before a class starts.
	 * Let's say one checks the cam and mic, token access is required for client side APIs.
	 */
	if ( !sessionid ) {
		var err = 'av-tokbox: sessionid not defined. check if init api is successful';
		__log.error ({ err: err }, 'createToken error');
		return cb(err, null);
	}

	var data = {
		vc_id      : user.vc_id,
		/* if video is primary or not */
		is_primary : users_handle.has_perms (user.vc_id, 'av-camera', 'primary-video', '*') ? true : false
	};

	var p = {
		role : 'moderator',
 		expireTime : getTokenExpiry(),
		data : JSON.stringify (data)
	};

	var tokenid;
	try {
		tokenid = opentok.generateToken(sessionid, p);
		__log.info ({ token_input : p, token : tokenid }, 'token created');
	} catch ( e ) {
		__log.error({ err : e }, 'token generation error');
		return cb(e, null);
	}

	var res = {
		sessionid : sessionid,
		token     : tokenid,
		key       : key,
		classid   : null,
		username  : user.vc_id,
		authid    : null,
		chromelocalextensionid : chromelocalextensionid,
		chromeextensionid : chromeextensionid,
		inlinechromeextinstall : inlinechromeextinstall,
		on_startup : on_startup   /* av config on startup */
	};

	return cb(null, res);
}

/*
 * broadcast info to all users regarding updation
 * in status of AV.
 * Params :
 *          1. vc_id   : id of user whose a/v updated
 *          2. is_init : av init or not 
 *          2. audio   : audio status (boolean)
 *          3. video   : video status (boolean)
 */
function broadcast_av_status (vc_id, is_init, audio, video) {
	var info_id = 'channel-status';
	var info = {};

	info.free_audio_channels = (max_audios - Object.keys(audios).length);
	info.free_video_channels = (max_videos - Object.keys(videos).length);
	info.attendee_id         = vc_id;
	/* set audio and video only if not user removal case */
	if (is_init) {
		info.audio = audio;
		info.video = video;
	}

	coms_handle.broadcast_info (info_id, info, null);
	return;
}

/*
 * update audio or video config in local structures.
 * Params :
 *          1. map    : audio or video map to be updated
 *          2. vc_id  : user's vc_id whose a/v to be updated
 *          3. is_add : boolean variable telling about the
 *                      operation to be perfomed
 *                      true  -> add to map
 *                      false -> remove from map
 */
function update_structure (map, vc_id, is_add) {

	/* if add to map */
	if (is_add) {
		/*
		 * mark status as "committed" since
		 * audio/video has already been started.
		 */
		map [vc_id] = 'committed';
		return;
	}

	/* ..else remove from map */
	if (map [vc_id]) {
		delete map [vc_id];
	}
	return;
}

var activeSessionTime = 1*60*60;
var getTokenExpiry = function getTokenExpiry() {
	return (new Date().getTime() / 1000) + activeSessionTime;
};


module.exports = av_tokbox;
