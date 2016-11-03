function is_cookie_enabled () {
	var cookieEnabled=(navigator.cookieEnabled)? true : false;

	//if not IE4+ nor NS6+
	if (typeof navigator.cookieEnabled=="undefined" && !cookieEnabled){ 
		document.cookie="testcookie";
		cookieEnabled=(document.cookie.indexOf("testcookie")!=-1)? true : false;
	}

	return cookieEnabled;
}

function get_cookie ( name ) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

function show_error (heading, detail) {
	$('.blanket-error span.heading').html(heading);
	$('.blanket-error span.detail').html(detail);
	$('.blanket-error').css('display', 'block');
}

/*
 * set handlers */
function set_handlers () {
	$('a.anon').on('click', function () {
		$('.login-body').css('display', 'none');
		$('.anon-container').css('display', 'block');
		$('form#anon-form input').trigger('input');
	});

	$('a.title-icon').on('click', function () {
		$('.login-body').css('display', 'block');
		$('.anon-container').css('display', 'none');
	});

	/*
	 * Handle keyboard input in the input box */
	$('form#anon-form input').on('input', function (event) {

		var __input = $('form#anon-form input').val().trim();
		if (!__input) {
			$('form#anon-form').removeClass('has-char');
			$('form#anon-form button').prop('disabled', true);
			return;
		}

		$('form#anon-form').addClass('has-char');
		$('form#anon-form button').prop('disabled', false);

		/* Handle 'return' key in the input box */
		if (event.keyCode == 13) {
			$('form#anon-form button').click();
		}
	});
}

function do_it_all () {
	if ( !is_cookie_enabled() ) {
		show_error ('Cookie error', 'This site requires cookies to be enabled to function properly. Please enable and try again');
		throw 'no cookies enabled';
	}

	if ( !get_cookie('wiziq_origin') ) {
		show_error ('Cookie error', 'Can\'t seem to know where you came from. Enable your cookies, go back and try again');
		throw 'no cookies enabled';
	}

	set_handlers ();

	$('form#anon-form button').on('click', handle_anon_submit);
}

function handle_anon_submit () {
	$('form#anon-form input').prop('disabled', true);

	var display_name = encodeURIComponent ($('form#anon-form input').val().trim());

	var query = window.search ? window.search + '&' : '?';
	query    += 'display_name=' + display_name;

	window.location.href = '/auth/auth/anon' + query;
	return false;
}

/*
 *  The identity is based (partially) off the specifications here:
 *  Portable Contacts 1.0 Draft C
 *  http://portablecontacts.net/draft-spec.html#schema
 */
var identity = {
	vc_id       : '--none-yet--',                   /* Assigned by the session controller */
	vc_auth_ts  : '--none-yet--',
	auth_via    : '--none-yet--',
	id          : '--random-default-id',
	displayName : 'buddha is smiling',
	name        : null,
	nickname    : null,
	birthday    : null,
	anniversary : null,
	gender      : null,
	utcOffset   : null,
	emails      : null,
	phoneNumbers: null,
	photos      : null,
	addresses   : null

};

$(document).ready (do_it_all);
