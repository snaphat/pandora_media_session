// ==UserScript==
// @name         Pandora Media Session Support
// @namespace    https://github.com/snaphat/pandora_media_session
// @version      0.4.2
// @description  Shows media session information from Pandora Radio.
// @author       Aaron Landwehr
// @icon         https://raw.githubusercontent.com/snaphat/pandora_media_session_packager/main/assets/pandora_64x64.png
// @match        *://*.pandora.com/*
// @grant        none
// ==/UserScript==
// Note: document-idle breaks this script for firefox.

"use strict";

/**
 * Determines if any audio elements on the page are currently playing.
 *
 * This function checks all audio elements in the document and returns a boolean indicating whether at least one audio
 * element is not paused (i.e., is playing).
 *
 * @returns {boolean} True if any audio element is playing, false otherwise.
 */
function isPlayingPageAudio() {
    return Array.from(document.querySelectorAll('audio')).some(audio => !audio.paused);
}

/**
 * Attaches a 'play' event listener to the stub audio element.
 *
 * When the stub audio attempts to play, this listener marks the stub audio element with a custom property indicating it
 * was the last source of audio played.
 *
 * @param {HTMLAudioElement} stubAudio - The stub audio element whose playback state will be modified.
 */
function addPlayEventListenerToStubAudio(stubAudio) {
    stubAudio.addEventListener("play", () => {
        stubAudio.playedLast = true; // Mark the stub audio as played last
    });
}

/**
 * Attaches a 'play' event listener to a given page audio element.
 *
 * When the 'play' event is emitted, this listener pauses the stub audio to ensure it does not interfere with the
 * playback of the page audio. This is a workaround for an issue in Chrome-based browsers where multiple active media
 * sessions in a single tab can stop the On-Screen Display (OSD) for media sessions from appearing. It also marks the
 * stub audio as not being the last played source.
 *
 * @param {HTMLAudioElement} pageAudio - The page audio element to which the play event listener is attached.
 * @param {HTMLAudioElement} stubAudio - The stub audio element whose playback state will be modified.
 */

function addPlayEventListenerToPageAudio(pageAudio, stubAudio) {
    pageAudio.addEventListener('play', () => {
        stubAudio.playedLast = false; // Mark the stub audio as not played last
        stubAudio.pause(); // Prevent the stub audio from playing simultaneously with the page audio.
    });
}

/**
 * Updates the playback state of the stub audio based on the attributes of a given element.
 *
 * This function checks the 'data-qa' attribute of the specified DOM element. If the attribute's value is 'play_button',
 * the stub audio attempts to play, provided no other audio on the page is currently playing. If any other audio is 
 * playing, or the 'data-qa' attribute value is not 'play_button', the stub audio is paused. This function also updates 
 * the browser's media session playback state to either "playing" or "paused" depending on the action taken. This 
 * dynamic control mechanism allows the stub audio's playback to be responsive to user interactions and changes within 
 * the DOM.
 *
 * @param {Element} element - The DOM element whose attributes are checked to determine the audio state.
 * @param {HTMLAudioElement} stubAudio - The stub audio element whose playback state will be modified.
 */

function updateStubAudioState(element, stubAudio) {
    // Play or pause the stub audio based on the 'data-qa' attribute value of the element
    if (element.getAttribute('data-qa') === 'play_button') {
        if (!isPlayingPageAudio()) {
            stubAudio.play(); // Play if no other audio is playing
        }
        navigator.mediaSession.playbackState = "playing";
    } else {
        stubAudio.pause();
        navigator.mediaSession.playbackState = "paused";
    }
}

/**
 * Retrieves the source URL of the first image within the first element of a given class.
 *
 * This function is designed to navigate through the DOM starting from the first element of the specified class. It then 
 * attempts to access the first child's first child assuming it's an image element and returns its source URL. If any of 
 * these elements are not found or the structure is different, it returns an empty string.
 *
 * @param {string} cls - The class name of the element from which the image source is to be extracted.
 * @returns {string} The source URL of the image if found, otherwise an empty string.
 */
function getArt(cls) {
    let e = document.getElementsByClassName(cls);
    return (e && e[0] && e[0].firstChild && e[0].firstChild.firstChild) ? e[0].firstChild.firstChild.src : "";
}

/**
 * Retrieves the text content from the first element of a given class.
 *
 * This function selects the first element with the specified class name and returns its text content. If the element is
 * not found, it returns an empty string. This is useful for extracting text from specific elements identified by their
 * class name.
 *
 * @param {string} cls - The class name of the element whose text content is to be retrieved.
 * @returns {string} The text content of the element if found, otherwise an empty string.
 */
function getText(cls) {
    let e = document.getElementsByClassName(cls);
    return e && e[0] ? e[0].textContent : "";
}

/**
 * Updates the media session metadata based on the currently playing music.
 *
 * This function extracts music information such as the title, artist, album, and artwork from the DOM elements
 * identified by specific class names. It then updates the media session's metadata with this information. If higher
 * quality artwork is available, it replaces the existing artwork URL with the higher resolution version.
 */
const updateMetadata = (function () {
    let isEvenCall = true;

    return function () {
        // Retrieve music information from the DOM
        let title = getText('Tuner__Audio__TrackDetail__title');
        let artist = getText('Tuner__Audio__TrackDetail__artist');
        let album = getText('nowPlayingTopInfo__current__albumName');
        let art = getArt('Tuner__Audio__TrackDetail__img');

        // Attempt to get higher quality artwork if available
        if (art) art = art.replace("90W", "500W").replace("90H", "500H");

        // Append a space to the title every other call to force browsers to update the metadata. This is a work-around 
        // for chromium based browsers which don't always update displayed metadata when the browser is not in focus.
        title += isEvenCall ? "" : " ";

        // Update the media session metadata
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: artist,
            album: album,
            artwork: [{ src: art, sizes: '500x500', type: 'image/jpeg' }],
        });

        // Toggle isEvenCall for the next invocation
        isEvenCall = !isEvenCall;
    };
})();

/**
 * Simulates a click event on the first element of a given class.
 *
 * This function creates a new 'click' MouseEvent and dispatches it on the first element found with the specified class
 * name. This can be used to programmatically trigger click events on elements that match the given class. The event
 * bubbles and is cancelable, mimicking the behavior of a standard user-initiated click event.
 *
 * @param {string} cls - The class name of the element on which to simulate the click event.
 */
function simulateClick(cls) {
    // Create a new click event
    let clickEvent = new MouseEvent('click', { view: null, bubbles: true, cancelable: true });

    // Get the first element with the specified class
    let e = document.getElementsByClassName(cls)[0];

    // Dispatch the event on the element if it exists
    if (e) e.dispatchEvent(clickEvent);
}

/**
 * Sets up media session action handlers to control audio playback.
 *
 * This function configures the action handlers for the browser's media session, enabling control over audio playback
 * through standard media controls such as play, pause, previous track, and next track. The play and pause actions are
 * linked to simulated click events on specific DOM elements representing these controls, allowing integration with
 * custom audio controls on the web page. Additionally, it directly controls the playback of the last played audio
 * element to synchronize the on-screen display (OSD) with user interactions. Handlers for previous and next tracks
 * trigger corresponding simulated clicks on relevant buttons.
 */
function setupMediaSessionEventHandlers(stubAudio) {
    // Set action handler for 'play' action
    navigator.mediaSession.setActionHandler('play', () => {
        simulateClick("PlayButton"); // Simulates a click on the Play button
        if (stubAudio.playedLast) stubAudio.play(); // Immediately play stubAudio so OSD updated immediately.
        // Note: pageAudio starts-stops-starts if we try to call its play() directly.
        navigator.mediaSession.playbackState = "playing"; // Updates the media session's playback state to 'playing'.
    });

    // Set action handler for 'pause' action
    navigator.mediaSession.setActionHandler('pause', () => {
        simulateClick("PlayButton"); // Simulates a click on the Pause button
        if (stubAudio.playedLast) stubAudio.pause(); // Immediately pause stubAudio so OSD updated immediately.
        navigator.mediaSession.playbackState = "paused"; // Updates the media session's playback state to 'paused'.
    });

    // Set action handler for 'previoustrack' (previous track or replay)
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        simulateClick("ReplayButton"); // Simulates a click on the Replay button (Station)
        simulateClick("Tuner__Control__SkipBack__Button"); // Simulates click on the Skip Back button (Playlist)
    });

    // Set action handler for 'nexttrack' (next track)
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        simulateClick("Tuner__Control__Skip__Button"); // Simulates a click on the Skip button (Station)
        simulateClick("Tuner__Control__SkipForward__Button"); // Simulates click on the Skip Forward button (Playlist)
    });
}

/**
 * Initializes the functionality for enhancing media session support.
 * 1. Creates and adds a stub audio element to the DOM. This element is used to maintain a consistent media session
 *    and to enable On-Screen Display (OSD) features in browsers like Firefox.
 * 2. Sets up a MutationObserver to monitor DOM changes for new audio elements and the removal of 'PlayButton' elements.
 *    It modifies the play functionality of added audio elements and adjusts the playback state of 'stubAudio when 
 *    'PlayButton' elements are removed.
 * 3. Attaches custom play listeners to all existing and dynamically added audio elements, managing playback via the 
 *    last audio element that was played, tracked by the 'lastPlayingAudio' variable.
 * 4. Periodically updates media metadata based on the state of the real audio elements.
 * 5. Configures media session event handlers for actions like play, pause, next track, and previous track, which also
 *    interact with the last played audio element to synchronize the media session's state.
 */
function initialize() {
    /**
     * Add a 'stub' audio element to the DOM. This stub audio is a small, silent audio file used to trick browsers like
     * Firefox into thinking there is always an audio element playing. This is necessary for enabling On-Screen Display
     * (OSD) features, as some browsers require an actual audio file to be playing. The audio file used is very short
     * and silent to be unobtrusive.
     */
    let stubAudio = document.createElement('audio');
    stubAudio.loop = true;
    stubAudio.volume = 0.1;
    stubAudio.src = "data:audio/ogg;base64,T2dnUwACAAAAAAAAAABsbAAAAAAAALBXT0MBHgF2b3JiaXMAAAAAARErAAAAAAAAIE4AAAAAAACZAU9nZ1MAAAAAAAAAAAAAbGwAAAEAAAC8MMvOCzv///////////+1A3ZvcmJpcysAAABYaXBoLk9yZyBsaWJWb3JiaXMgSSAyMDEyMDIwMyAoT21uaXByZXNlbnQpAAAAAAEFdm9yYmlzEkJDVgEAAAEADFIUISUZU0pjCJVSUikFHWNQW0cdY9Q5RiFkEFOISRmle08qlVhKyBFSWClFHVNMU0mVUpYpRR1jFFNIIVPWMWWhcxRLhkkJJWxNrnQWS+iZY5YxRh1jzlpKnWPWMUUdY1JSSaFzGDpmJWQUOkbF6GJ8MDqVokIovsfeUukthYpbir3XGlPrLYQYS2nBCGFz7bXV3EpqxRhjjDHGxeJTKILQkFUAAAEAAEAEAUJDVgEACgAAwlAMRVGA0JBVAEAGAIAAFEVxFMdxHEeSJMsCQkNWAQBAAAACAAAojuEokiNJkmRZlmVZlqZ5lqi5qi/7ri7rru3qug6EhqwEAMgAABiGIYfeScyQU5BJJilVzDkIofUOOeUUZNJSxphijFHOkFMMMQUxhtAphRDUTjmlDCIIQ0idZM4gSz3o4GLnOBAasiIAiAIAAIxBjCHGkHMMSgYhco5JyCBEzjkpnZRMSiittJZJCS2V1iLnnJROSialtBZSy6SU1kIrBQAABDgAAARYCIWGrAgAogAAEIOQUkgpxJRiTjGHlFKOKceQUsw5xZhyjDHoIFTMMcgchEgpxRhzTjnmIGQMKuYchAwyAQAAAQ4AAAEWQqEhKwKAOAEAgyRpmqVpomhpmih6pqiqoiiqquV5pumZpqp6oqmqpqq6rqmqrmx5nml6pqiqnimqqqmqrmuqquuKqmrLpqvatumqtuzKsm67sqzbnqrKtqm6sm6qrm27smzrrizbuuR5quqZput6pum6quvasuq6su2ZpuuKqivbpuvKsuvKtq3Ksq5rpum6oqvarqm6su3Krm27sqz7puvqturKuq7Ksu7btq77sq0Lu+i6tq7Krq6rsqzrsi3rtmzbQsnzVNUzTdf1TNN1Vde1bdV1bVszTdc1XVeWRdV1ZdWVdV11ZVv3TNN1TVeVZdNVZVmVZd12ZVeXRde1bVWWfV11ZV+Xbd33ZVnXfdN1dVuVZdtXZVn3ZV33hVm3fd1TVVs3XVfXTdfVfVvXfWG2bd8XXVfXVdnWhVWWdd/WfWWYdZ0wuq6uq7bs66os676u68Yw67owrLpt/K6tC8Or68ax676u3L6Patu+8Oq2Mby6bhy7sBu/7fvGsamqbZuuq+umK+u6bOu+b+u6cYyuq+uqLPu66sq+b+u68Ou+Lwyj6+q6Ksu6sNqyr8u6Lgy7rhvDatvC7tq6cMyyLgy37yvHrwtD1baF4dV1o6vbxm8Lw9I3dr4AAIABBwCAABPKQKEhKwKAOAEABiEIFWMQKsYghBBSCiGkVDEGIWMOSsYclBBKSSGU0irGIGSOScgckxBKaKmU0EoopaVQSkuhlNZSai2m1FoMobQUSmmtlNJaaim21FJsFWMQMuekZI5JKKW0VkppKXNMSsagpA5CKqWk0kpJrWXOScmgo9I5SKmk0lJJqbVQSmuhlNZKSrGl0kptrcUaSmktpNJaSam11FJtrbVaI8YgZIxByZyTUkpJqZTSWuaclA46KpmDkkopqZWSUqyYk9JBKCWDjEpJpbWSSiuhlNZKSrGFUlprrdWYUks1lJJaSanFUEprrbUaUys1hVBSC6W0FkpprbVWa2ottlBCa6GkFksqMbUWY22txRhKaa2kElspqcUWW42ttVhTSzWWkmJsrdXYSi051lprSi3W0lKMrbWYW0y5xVhrDSW0FkpprZTSWkqtxdZaraGU1koqsZWSWmyt1dhajDWU0mIpKbWQSmyttVhbbDWmlmJssdVYUosxxlhzS7XVlFqLrbVYSys1xhhrbjXlUgAAwIADAECACWWg0JCVAEAUAABgDGOMQWgUcsw5KY1SzjknJXMOQggpZc5BCCGlzjkIpbTUOQehlJRCKSmlFFsoJaXWWiwAAKDAAQAgwAZNicUBCg1ZCQBEAQAgxijFGITGIKUYg9AYoxRjECqlGHMOQqUUY85ByBhzzkEpGWPOQSclhBBCKaWEEEIopZQCAAAKHAAAAmzQlFgcoNCQFQFAFAAAYAxiDDGGIHRSOikRhExKJ6WREloLKWWWSoolxsxaia3E2EgJrYXWMmslxtJiRq3EWGIqAADswAEA7MBCKDRkJQCQBwBAGKMUY845ZxBizDkIITQIMeYchBAqxpxzDkIIFWPOOQchhM455yCEEELnnHMQQgihgxBCCKWU0kEIIYRSSukghBBCKaV0EEIIoZRSCgAAKnAAAAiwUWRzgpGgQkNWAgB5AACAMUo5JyWlRinGIKQUW6MUYxBSaq1iDEJKrcVYMQYhpdZi7CCk1FqMtXYQUmotxlpDSq3FWGvOIaXWYqw119RajLXm3HtqLcZac865AADcBQcAsAMbRTYnGAkqNGQlAJAHAEAgpBRjjDmHlGKMMeecQ0oxxphzzinGGHPOOecUY4w555xzjDHnnHPOOcaYc84555xzzjnnoIOQOeecc9BB6JxzzjkIIXTOOecchBAKAAAqcAAACLBRZHOCkaBCQ1YCAOEAAIAxlFJKKaWUUkqoo5RSSimllFICIaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKZVSSimllFJKKaWUUkoppQAg3woHAP8HG2dYSTorHA0uNGQlABAOAAAYwxiEjDknJaWGMQildE5KSSU1jEEopXMSUkopg9BaaqWk0lJKGYSUYgshlZRaCqW0VmspqbWUUigpxRpLSqml1jLnJKSSWkuttpg5B6Wk1lpqrcUQQkqxtdZSa7F1UlJJrbXWWm0tpJRaay3G1mJsJaWWWmupxdZaTKm1FltLLcbWYkutxdhiizHGGgsA4G5wAIBIsHGGlaSzwtHgQkNWAgAhAQAEMko555yDEEIIIVKKMeeggxBCCCFESjHmnIMQQgghhIwx5yCEEEIIoZSQMeYchBBCCCGEUjrnIIRQSgmllFJK5xyEEEIIpZRSSgkhhBBCKKWUUkopIYQQSimllFJKKSWEEEIopZRSSimlhBBCKKWUUkoppZQQQiillFJKKaWUEkIIoZRSSimllFJCCKWUUkoppZRSSighhFJKKaWUUkoJJZRSSimllFJKKSGUUkoppZRSSimlAACAAwcAgAAj6CSjyiJsNOHCAxAAAAACAAJMAIEBgoJRCAKEEQgAAAAAAAgA+AAASAqAiIho5gwOEBIUFhgaHB4gIiQAAAAAAAAAAAAAAAAET2dnUwAEM4EAAAAAAABsbAAAAgAAAP+KmWqDLgEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQGGDY8GQaXSYC4suK7ruq7ruq7ruq7ruq7ruq7ruq7ruq77+biui33f7+7u7goAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    stubAudio.playedLast = false; // set played last to false.

    // Attach a custom play event listener to stubAudio.
    addPlayEventListenerToStubAudio(stubAudio);

    // Set up a MutationObserver to monitor DOM changes for audio playback.
    let observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            // Process new audio elements added to the DOM
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'AUDIO') {
                    // Attach a custom play event listener to all new audio elements
                    addPlayEventListenerToPageAudio(node, stubAudio);
                }
            });

            // Check for removed 'PlayButton' elements to trigger an audio state update
            mutation.removedNodes.forEach(node => {
                if (node.nodeName === 'BUTTON' && node.classList.contains('PlayButton')) {
                    updateStubAudioState(node, stubAudio);
                }
            });
        });
    });

    // Start observing the document body for DOM changes
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    // Attach a custom play event listener to all existing audio elements
    document.querySelectorAll('audio').forEach(node => {
        addPlayEventListenerToPageAudio(node, stubAudio);
    });

    // Periodically updates media metadata at 1s interval (avoids flickering).
    setInterval(updateMetadata, 1000);

    // Sets up media session event handlers
    setupMediaSessionEventHandlers(stubAudio);
}

// This self-invoking function ensures that the initialization process starts at the right time in the document's
// loading phase.
(function () {
    /**
     * Checks if the document body is already available. If it is, it means the DOM is sufficiently loaded to run the
     * initialize function. If the document body isn't available yet, it adds an event listener for the
     * 'DOMContentLoaded' event. This event fires when the initial HTML document has been completely loaded and parsed,
     * without waiting for stylesheets, images, and subframes to finish loading.
     *
     * The initialize function is then executed either immediately (if the document body is available) or after the
     * 'DOMContentLoaded' event fires, ensuring that the initialization logic runs at the appropriate time.
     */
    document.body ? initialize() : document.addEventListener('DOMContentLoaded', initialize);
})();
