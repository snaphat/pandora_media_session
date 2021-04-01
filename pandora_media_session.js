// ==UserScript==
// @name         Pandora MediaSession Support
// @version      0.2
// @description  Implements the MediaSession API for Pandora.
// @author       Aaron Landwehr
// @match        https://www.pandora.com/*
// @grant        None
// @run-at      document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Add small almost empty blank audio file so windows since we don't have access to Pandora's actual audio stream directly.
    // This is necessary because the OSD won't work without a file (a completely empty file doesn't work either).
    let audio = document.createElement('audio');
    audio.src = "data:audio/x-wav;base64,UklGRooWAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YWYWAAAAAAAAAAAAAAAAAAAAAA";
    audio.loop = true;
    audio.play();
    navigator.mediaSession.playbackState = "playing";


    window.addEventListener('load', function () { setTimeout(lazyTimer, 500); });

    function lazyTimer() {
        updateMetadata();
        setTimeout(lazyTimer, 5000);
    }

    function updateMetadata() {
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
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: artist,
            album: album,
            artwork: [{ src: art, sizes: '128x128', type: 'image/jpeg' }]
        });

        // Check status of playback and correct media-session info if necessary.
        var e = document.getElementsByClassName("PlayButton");
        if (e && e[0]) {
            if (e[0].getAttribute('data-qa') == "pause_button") {
                audio.play();
                navigator.mediaSession.playbackState = "playing";
            } else {
                audio.pause();
                navigator.mediaSession.playbackState = "paused";
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
        audio.currentTime = 0;
        audio.play();
        simulateClick("PlayButton"); // Everywhere button.
        setTimeout(updateMetadata, 500);
        navigator.mediaSession.playbackState = "playing";
    });

    // Pause
    navigator.mediaSession.setActionHandler('pause', function () {
        audio.currentTime = 0;
        audio.pause();
        simulateClick("PlayButton"); // Everywhere button.
        setTimeout(updateMetadata, 500);
        navigator.mediaSession.playbackState = "paused";
    });

    // Prev Track, replay.
    navigator.mediaSession.setActionHandler('previoustrack', function () {
        audio.currentTime = 0;
        audio.play();
        simulateClick("ReplayButton"); // Station button.
        simulateClick("Tuner__Control__SkipBack__Button"); // playlist button.
        setTimeout(updateMetadata, 500);
        navigator.mediaSession.playbackState = "playing";
    });

    // Next Track.
    navigator.mediaSession.setActionHandler('nexttrack', function () {
        audio.currentTime = 0;
        audio.play();
        simulateClick("Tuner__Control__Skip__Button"); // Station button.
        simulateClick("Tuner__Control__SkipForward__Button"); // playlist button.
        setTimeout(updateMetadata, 500);
        navigator.mediaSession.playbackState = "playing";
    });
})();
