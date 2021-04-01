// ==UserScript==
// @name         Pandora MediaSession Support
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Implements the MediaSession API for Pandora.
// @author       Aaron Landwehr
// @match        https://www.pandora.com/*
// @grant        None
// ==/UserScript==

(function () {
    'use strict';

    // Add small almost empty audio file so windows since we don't have access to Pandora's actual audio stream directly.
    let audio = document.createElement('audio');
    audio.src = "data:audio/x-wav;base64,UklGRooWAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YWYWAAAAAAAAAAAAAAAAAAAAAA";
    audio.loop = true;
    audio.play();
    navigator.mediaSession.playbackState = "playing";

    function simulatePlayPauseClick() {
        var clickEvent = new MouseEvent('click', {
            view: null,
            bubbles: true,
            cancelable: true
        });
        document.getElementsByClassName("PlayButton")[0].dispatchEvent(clickEvent);
    };

    function updateMetadata() {
        let track = playlist[0];

        console.log('Playing ' + track.title + ' track...');
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: track.artwork
        });
    }

    /* Play & Pause */
    navigator.mediaSession.setActionHandler('play', async function () {
        console.log('> User clicked "Play" icon.');
        //Pandora.playTrack();
        //Pandora.playOrPauseTrack();
        //document.dispatchEvent(new KeyboardEvent('keydown',{'keyCode':32,'which':32}));
        simulatePlayPauseClick(); // Simulate clicks because using the JS object and spacebar are unreliable.
        audio.loop = true;
        audio.currentTime = 0;
        audio.play();
        navigator.mediaSession.playbackState = "playing";
    });

    navigator.mediaSession.setActionHandler('pause', function () {
        console.log('> User clicked "Pause" icon.');
        audio.currentTime = 0;
        //Pandora.pauseMusic();
        // Pandora.playOrPauseTrack();
        //document.dispatchEvent(new KeyboardEvent('keydown',{'keyCode':32,'which':32}));
        simulatePlayPauseClick(); // Simulate clicks because using the JS object and spacebar are unreliable.
        navigator.mediaSession.playbackState = "paused";
    });
})();
