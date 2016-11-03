define(function(require){
	var mod_name = "lets-chat";						/* the name of this module */
	
	var $ 			= require('jquery'),
		events 		= require('events'),
		scrollbar   = require('sbar'),
		log 		= require('log')( mod_name, 'info'),
		framework 	= require('framework'),
		moment 		= require('./moment.min'),
		store 		= require('./store'),
		mod_message	= require('./message');

	var	f_handle 	= framework.handle('chat-box'),
		emitter 	= null,
		anchor 		= {},
		scroll_lock = false,
		my_info 	= {},
		msgTemplate = {},
		rooms 		= {
						main : {			/* leaving scope for pvt chat */
							id 			: null,
							joined 		: false,
							lastMessageId: 0
						}					
					  },
		users 		= {
						me : null
					  },
		connection  = {
						connected : false	
					  },
		socket 		= {},
		$messages 	= {};		/* will store the anchor of the message list */
		
	var chat_box = {};
	/*
	 * create connection
	 * join room
	 * and do your stuff
	 */


	chat_box.init = function (display_spec, custom, perms) {
			var _d = $.Deferred();

			init_linkify();	
			if (!Date.now) {						/* polyfill for Date.now.. check if it works or not */
			  Date.now = function now() {
				  log.log ('Date.now is not available, adding polyfill!');
			      return new Date().getTime();
			    };
			}

			emitter = events.emitter ("chat", mod_name);
			anchor = display_spec.anchor;
			var templates = display_spec.templates;
			var template  = f_handle.template (templates[0] );
			msgTemplate   = f_handle.template (templates[1] );

			if (!template || !msgTemplate) {
				_d.reject ('chat-box: some template not found' );
			}

			var $room = template();
			$(anchor).append ($room);
			
			$messages = $('.lcb-messages');				// get once, use everytime

			$('.lcb-entry-button').on('click', sendMessage);
			$('.lcb-entry-input').on('keypress',sendMessage);
			add_scrollbar ();

			/* 
			 * disable the message text area, until the socket connection is established  */
		 	$('.lcb-entry-input').attr("placeholder","Connecting To Chat...").prop('disabled', true);

			events.bind('framework:layout', handle_layout_change, 'chat-box');
			$(window).on('resize', scrollbar_reinitialize);

			$('#widget-nav li#chat a').on('click', handle_visibility);
			$('.lcb-close a').on('click', handle_visibility);

			/* Set the audio volume level fot message notification */
			$('.lcb-room-chat audio').prop('volume', 0.05);

			/*
			 * Subscribe to AV container events, as we require to change our layouts according to them */
			events.bind ('av:containers', handle_av_events, 'chat-box');

			_d.resolve();
			return _d.promise();
	};
	chat_box.start = function (sess_info) {
		if (!sess_info) {
			log.error ('no session info !');
			return;
		}

		my_info = sess_info;
		store.server_url = sess_info.root_url;
		store.auth_token = sess_info.token;

		/* 
		 * request the emoticons beforehand 
		 *	-- to avoid unneccessary delay while showing 1st message  */
		require('./client').getEmotes();

		/* 
		 * now make the ws connection */
		connect(sess_info)
		.then(
			function (sock) {
				socket = sock;
				rooms.main.id = my_info.room_id;
				
				socket.on('connect', function() {
					emitter.emit('chat:connection', data = { 'status' : 'ok'});
					connection.connected = true; 
					log.info ('socket connection','OK');

					who_am_i();
					join_room(rooms.main.id);
				});
				socket.on('reconnect',function() {
					emitter.emit('chat:connection', data = { 'status' : 'ok'});
					/* rejoin all rooms where joined is true, main room for now */
					rejoinRoom (rooms.main.id);
					log.info ('reconnected','OK');
				});
				socket.on('error', function (err) {
					emitter.emit('chat:connection', data = { 'status' : 'not-ok', 'reason' : err});
					log.error ({ 'socket connection': 'not-OK', 'server': sess_info.root_url, 'error': err });
				});
				
				socket.on('messages:new', function (msg) { 
					log.log ('new message', msg);  
					emitter.emit('chat:new-message', data = { 'from': msg.owner.id });
					append_message (msg); 
				});

				socket.on('messages:typing', function (data) {
					log.log ('typing notif', data); 
					typing_handler (data.owner, data.room); 
				});

				socket.on('files:new', function (file) {
//					addFile( file);
				});
				
				socket.on('disconnect', function () {
					log.info ({ 'socket connection': 'disconnected' });
					connection.connected = false;
				});
			});
	};

	/*
	 * private methods
	 */

	function init_linkify(){				/* used to handle hyperlinks in the message */
			var linkify	  = require('./linkify');
			linkify();
			link_html = require('./linkify-html');
			link_html(window.linkify);
	}
	function connect( sess_info ){
		var _d = $.Deferred();
		
		log.log('requesting web socket connection');
		require([sess_info.root_url + '/socket.io/socket.io.js'],function( io){

			var sock = io.connect(
				sess_info.root_url,{
					reconnection 		 : true, 	/* defaults to true */
					reconnectionDelay 	 : 500,		/* defaults to 1000 */
					reconnectionDelayMax : 1000,	/* defaults to 5000 */
					timeout 			 : 10000, 	/* defaults to 20000 */
					query 				 : 'token=' + sess_info.token
				});
			_d.resolve( sock);
		});
		return _d.promise();
	}

	function who_am_i(){
		socket.emit('account:whoami',function(user){
			users.me = user;
		});
	}

	function rejoinRoom( room_id){
		join_room( room_id, true);
	}

	function join_room( room_id, rejoin ){
		if( !rejoin && rooms.main.joined){
			/* it is duplicate call from connect (after a reconnect) */
			return ;
		}
		log.log('connecting to', room_id);
		//check if socket is null
		socket.emit('rooms:join', { roomId : room_id, password : ''}, function(resRoom){
			rooms.main.joined = true;
			var room = resRoom; 											
			log.info('connected ', room);

			$('.lcb-entry').removeClass('disabled');
			$('.lcb-entry-input').attr("placeholder","Say something ...").prop('disabled', false);
			$('.lcb-entry-input').focus(function () {
				$('.lcb-entry-input').attr("placeholder", "");
			});
			$('.lcb-entry-input').blur(function () {
				$('.lcb-entry-input').attr("placeholder","Say something ...");
			});

			get_messages(room_id, rejoin? rooms.main.lastMessageId : 0 );
		});
	}

	function get_messages( room_id, since ){
		socket.emit('messages:list',{
			room 		: room_id,
			since_id 	: since,
			take		: 10,
			expand		: 'owner, room',
			reverse		: true			/* tells about the order of the messages */
		},function ( messages){
			log.info('Chat history (last few):', messages);

			scroll_lock = false;
			for (var i= messages.length-1; i>=0; i--)
				append_message (messages[i], true);

			/*
			 * We add the scroll handler once all the messages are done, since
			 * otherwise, it would result in spurious events */
			$('.lcb-messages-container').on('scroll', scrollHandler );

		});
	}

	function sendMessage(e){
		if(e.type === 'keypress' && e.keyCode !== 13 || e.altKey){
			tell_typing.notify();
			return;
		}
		if(e.type === 'keypress' && e.keyCode === 13 && e.shiftKey){
			tell_typing.notify();
			/*
			 * shift+enter let u send multi line messages
			 * 	this is what sets the paste option
			 * 	on receive handle them differently (use pre tag)
			 */
			return;
		}
		e.preventDefault();


		var $textarea = $('.lcb-entry-input');
		var m = $textarea.val();
		if( !m )
			return;

		if( $.trim( m)){
			send_message( m);
		}
		tell_typing.clear();
		$textarea.val('');
	}

	function send_message( message ){
		var packet = {
			'room': my_info.room_id, 
			'text': message 
		};

		log.log ('sent message', packet);
		socket.emit ('messages:create', packet);
	}

	var lastMessageOwner = {};
	function append_message( messageObj, history ){
		if(!history){
			typing.remove( messageObj.owner);
		}
		rooms.main.lastMessageId = messageObj.id;	// in case of reconn. , we fetch from here onwards

		messageObj.paste=  /\n/i.test(messageObj.text);							// if shift+enter i.e. multi line message
		messageObj.fragment = lastMessageOwner === messageObj.owner.id;			// if fragment
		messageObj.time = moment(messageObj.posted).fromNow();
		messageObj.classs = (messageObj.owner.id === users.me.id)? "lcb-message-own" : "lcb-message swatch-" + color_manager.my_color( messageObj.owner.id );
		if (messageObj.fragment)
			messageObj.classs += " lcb-fragment";

		if( !messageObj.fragment){
			lastMessageOwner = messageObj.owner.id;
		}

		var $message = msgTemplate( messageObj);

		format_message( $message, function( html){
			/*
			 * Turn the scroll handler off while appending a message
			 * since appending automatically generates a scroll event
			 * causing spurious calculations */
			$('.lcb-messages-container').off('scroll', scrollHandler );

			$messages.append(/*'<li>' +*/ html);

			scrollbar_reinitialize ();
			if ( scroll_lock === false || messageObj.owner.id === users.me.id )
				scroll_to_bottom ();

			if (!is_visible())
				increment_unread_count ();

			/*
			 * Turn the scroll handler on now */
			$('.lcb-messages-container').on('scroll', scrollHandler );
			$('.lcb-room-chat audio').get(0).play();
		});

	}

	function format_message( html, cb){				/* here we get a HTML string, which is diff to manipulate */
		var text = $(html).find('.lcb-message-text').html();
		mod_message.format( text, function( res){
			if( res){
				res  = window.linkifyHtml ? window.linkifyHtml( res, {}) : res;
				html = html.replace(text, res);
			}
			cb( html);
		});
	}

	/* different colors for different users */
	var color_manager = {
		colors 			: [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
		index  			: 0, 
		get_next_color 	: function(){
									var temp = this.index;
									this.index = (++this.index) % this.colors.length;
									return this.colors[ temp ];	
						  },
		colorOf 		: {},			/* map of userid : color */
		my_color 		: function( id){
								var color = this.colorOf[id];
								if( !color){
									color = this.colorOf[ id] = this.get_next_color();
								}	
								return color;
						  }
	};

	/*
	 * typing notification related */	
	var tell_typing = {
				timer : null,
				timeout : 5000,					/* typing evt once sent will be valid till 'timeout' then we need to send again */
				notify: function() {
							if (!this.timer) {
								this.timer = setTimeout (function() { this.timer = null; }.bind(this), this.timeout );
								this.emit();	/* emit_on_socket */
							}
						},
				emit : function() {
					var packet = {
						room : my_info.room_id, 
						time : Date.now()
					};
					socket.emit ('messages:typing', packet); // Date.now polyfill added for IE8
				},
				clear : function(){
					clearTimeout (this.timer);
					this.timer = null;
				}
		};

  	/* 
	 * typing event receive events 	*/
	var typing = require('./notif');
	function typing_handler(user, room){
		if( user.id === users.me.id){
			return;
		}
		typing.someone(user);
	}

	/* 
	 * auto-scroll related */

	function scrollHandler (ev) {
		var scrolled = $('.lcb-messages-container').data('jsp').getPercentScrolledY();

		if (scrolled == 1)
			scroll_lock = false;
		else
			scroll_lock = true;
	}

	function scroll_to_bottom ($messages) {
		/* update perfect scrollbar */
		$('.lcb-messages-container').data('jsp').scrollToBottom();
	}

	var current_layout;

	function handle_layout_change (ev, data) {
		/* Just note the current layout for now */
		current_layout = ev;

		/*
		 * In the default layout, force the visiblity of chat to be true */
		am_i_visible = (ev === 'av-default') ? false : true;
		toggle_visibility ();

		if (am_i_visible)
			scrollbar_reinitialize ();

		/* set timeout as 400 (twice of animation time of layout change) */
		manage_scrollbar (400);
		return;
	}

	var unread_msgs = 0;
	function increment_unread_count () {
		unread_msgs++;

		$('#widget-nav li#chat .counter span').html(unread_msgs);
		$('#widget-nav li#chat .counter').css('display', 'block');
		$('#widget-nav li#chat a').addClass('background-success');
	}

	function reset_unread_count () {
		unread_msgs = 0;

		$('#widget-nav li#chat .counter span').html(unread_msgs);
		$('#widget-nav li#chat .counter').css('display', 'none');
		$('#widget-nav li#chat a').removeClass('background-success');
	}

	/* This variable indicates the visibility of the chat widget in av-fullscreen
	 * layout _ONLY_. True initially */
	var am_i_visible = true;

	function handle_visibility (ev) {
		if (current_layout && 
			(current_layout === 'av-fullscreen' || current_layout === 'av-tiled')) {
			/* Just toggle */

			toggle_visibility ();
		}

		/*
		 * Set the focus to the textarea */
		if (am_i_visible)
			$('#widget-chat textarea').focus();

		ev.preventDefault();
		return;
	}

	function is_visible () {
		return am_i_visible;
	}

	function toggle_visibility (visible) {
		if (visible)
			am_i_visible = visible;

		if (!am_i_visible) {
			if (!$('body').hasClass('chat-visible'))
				$('body').addClass('chat-visible');

			if (!$('#widget-nav li#chat').hasClass('enabled'))
				$('#widget-nav li#chat').addClass('enabled');

			am_i_visible = true;
			reset_unread_count ();
			scrollbar_reinitialize ();
			scroll_to_bottom ();
		}
		else {
			if ($('body').hasClass('chat-visible'))
				$('body').removeClass('chat-visible');

			if ($('#widget-nav li#chat').hasClass('enabled'))
				$('#widget-nav li#chat').removeClass('enabled');

			am_i_visible = false;
		}
	}

	var secondary_video_count = 0;
	function handle_av_events (ev, data) {

		/*
		 * We just need to keep a track of the secondary videos
		 * to adjust our layout */
		if (data.visible_conts > 1) {
			if (!$(anchor).hasClass('squeeze')) {
				$(anchor).addClass('squeeze');
				scrollbar_reinitialize ();
			}

			return;
		}

		$(anchor).removeClass('squeeze');
	}

	function add_scrollbar () {
		$('.lcb-messages-container').jScrollPane();
	}

	function scrollbar_reinitialize () {
		$('.lcb-messages-container').data('jsp').reinitialise ();
	}
	/*
	 * this method manages the scrollbar's positioni
	 * as and when needed.
	 * Parameter(s) :
	 *         1. timeout : time (in milliseconds)
	 */
	function manage_scrollbar (timeout) {
		if (scroll_lock) {
			log.info ('Scroll locked. No scrollbar management needed.');
			return;
		}

		scroll_to_bottom ();
	}

	return chat_box;
});
