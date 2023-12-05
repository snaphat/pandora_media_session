// ==UserScript==
// @name         Pandora Media Session Support
// @namespace    https://github.com/snaphat/pandora_media_session
// @version      0.3.9
// @description  Shows media session information from Pandora Radio.
// @author       Aaron Landwehr
// @icon         https://raw.githubusercontent.com/snaphat/pandora_media_session_packager/main/assets/pandora_64x64.png
// @match        *://*.pandora.com/*
// @grant        none
// ==/UserScript==
// Note: document-idle breaks this script for firefox.

(function () {
    'use strict';

    // Add event listener.
    window.addEventListener('load', function () { setTimeout(lazyTimer, 500); });
    function lazyTimer() {
        updateMetadata();
        setTimeout(lazyTimer, 100);
    }

    function updateMetadata() {
        // Retrieve audio element.
        var elements = document.getElementsByTagName('audio');
        var audio = elements.length > 0 ? elements[0] : null;
        if(audio == null) return;

        // Retrieve music information.
        var title = getText('Tuner__Audio__TrackDetail__title');
        var artist = getText('Tuner__Audio__TrackDetail__artist');
        var album = getText('nowPlayingTopInfo__current__albumName');
        var art = getArt('Tuner__Audio__TrackDetail__img');

        // Get higher quality artwork if possible.
        if (art) {
            art = art.replace("90W", "500W").replace("90H", "500H");
        }

        // Populate metadata.
        var metadata = navigator.mediaSession.metadata;
        if (!metadata || (
            metadata.title != title || metadata.artist != artist ||
            metadata.album != album || metadata.art != art)) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: album,
                artwork: [{ src: art, sizes: '500x500', type: 'image/jpeg' }]
            });
        }
        // Check status of playback and correct media-session info.
        if (audio) {
            var e = document.getElementsByClassName("PlayButton");
            if (e && e[0]) {
                e = e[0].getAttribute('data-qa');
                if (e == "pause_button") {
                    navigator.mediaSession.playbackState = "playing";
                } else if (e == "play_button") {
                    navigator.mediaSession.playbackState = "paused";
                }
            }
        }
    }

    // Some helper.
    function getArt(cls) {
        var e = document.getElementsByClassName(cls);
        return (e && e[0] && e[0].firstChild && e[0].firstChild.firstChild) ? e[0].firstChild.firstChild.src : "";
    }

    // Some helper.
    function getText(cls) {
        var e = document.getElementsByClassName(cls);
        return e && e[0] ? e[0].textContent : "";
    }

    // Simulate clicks because using the JS Pandora object methods and spacebar keys are unreliable.
    function simulateClick(cls) {
        var clickEvent = new MouseEvent('click', {
            view: null,
            bubbles: true,
            cancelable: true
        });
        let e = document.getElementsByClassName(cls)[0];
        if (e) {
            e.dispatchEvent(clickEvent);
        }
    };

    // Play
    navigator.mediaSession.setActionHandler('play', async function () {
        simulateClick("PlayButton"); // Everywhere button.
    });

    // Pause
    navigator.mediaSession.setActionHandler('pause', function () {
        simulateClick("PlayButton"); // Everywhere button.
    });

    // Prev Track, replay.
    navigator.mediaSession.setActionHandler('previoustrack', function () {
        simulateClick("ReplayButton"); // Station button.
        simulateClick("Tuner__Control__SkipBack__Button"); // playlist button.
    });

    // Next Track.
    navigator.mediaSession.setActionHandler('nexttrack', function () {
        simulateClick("Tuner__Control__Skip__Button"); // Station button.
        simulateClick("Tuner__Control__SkipForward__Button"); // playlist button.
    });
})();
