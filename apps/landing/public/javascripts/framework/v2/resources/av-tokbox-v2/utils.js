define(function(require) {
    var log = require('log')('av-utils', 'info');

    var utils = {};

    /*
     * Extract browser version out of the provided user agent string.
     *
     * @param {!string} uastring userAgent string.
     * @param {!string} expr Regular expression used as match criteria.
     * @param {!number} pos position in the version string to be returned.
     * @return {!number} browser version.
     */
    function extractVersion(uastring, expr, pos) {
        var match = uastring.match(expr);
        return match && match.length >= pos && parseInt(match[pos], 10);
    }


    /**
     * Browser detector.
     *
     * @return {object} result containing browser, version and minVersion
     *     properties.
     */
    utils.detect_browser = function() {
        var result = {};
        result.browser = null;
        result.version = null;
        result.minVersion = null;

        if (typeof window === 'undefined' || !window.navigator) {
            result.browser = 'Not a browser.';
            return result;
        }

        if (navigator.mozGetUserMedia) {
            result.browser = 'firefox';
            result.version = extractVersion(navigator.userAgent,
                    /Firefox\/([0-9]+)\./, 1);
            result.minVersion = 31;
            return result;
        }

        if (navigator.webkitGetUserMedia) {
            /* Chrome, Chromium, Webview, Opera, all fall in this */
            if (window.webkitRTCPeerConnection) {
                result.browser = 'chrome';
                result.version = extractVersion(navigator.userAgent,
                        /Chrom(e|ium)\/([0-9]+)\./, 2);
                result.minVersion = 38;
            } else {
                /* Safari or unknown webkit-based
                 * for the time being Safari has support for MediaStreams but not webRTC
                 */
                if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
                    result.browser = 'safari';
                    result.version = extractVersion(navigator.userAgent,
                            /AppleWebKit\/([0-9]+)\./, 1);
                    result.minVersion = 602;

                } else {
                    /* unknown webkit-based browser */
                    result.browser = 'Unsupported webkit-based browser ' +
                        'with GUM support but no WebRTC support.';
                    return result;
                }
            }

        } else if (navigator.mediaDevices &&
                navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
                    result.browser = 'edge';
                    result.version = extractVersion(navigator.userAgent,
                            /Edge\/(\d+).(\d+)$/, 2);
                    result.minVersion = 10547;
                } else {
                    /* Default fallthrough: not supported.*/
                    result.browser = 'Not a supported browser.';
                    return result;
                }

        if (result.version < result.minVersion) {
            log.info('Browser: ' + result.browser + ' Version: ' + result.version +
                    ' < minimum supported version: ' + result.minVersion +
                    '\n some things might not work!');
        }

        return result;
    };

    return utils;
});

