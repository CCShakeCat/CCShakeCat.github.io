// === Custom Audio/Video Enhancements with Submit and Status ===
const customAudioInput = document.getElementById('customAudioInput');
const customAudioBox = document.getElementById('customAudioBox');
const loadAudioBtn = document.getElementById('loadAudioBtn');
const audioStatus = document.getElementById('audioStatus');
const mediaPreview = document.getElementById('mediaPreview');
const hurryAudio = document.getElementById('hurryAudio');

let customAudio = null;           // For raw audio
let youTubeVideoID = null;        // For YouTube
let youTubePlayer = null;         // YouTube iframe API player object
let spotifyURL = null;            // For Spotify embed
let mediaType = null;             // 'audio', 'youtube', or 'spotify'

let isTimerRunning = false;
let isInHurryUp = false;
let hurryTriggered = false;

let currentPlaybackRate = 1;

// Helper: Extract YouTube video ID
function extractYouTubeID(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

loadAudioBtn.onclick = () => {
  const url = customAudioInput.value.trim();
  audioStatus.textContent = "";
  youTubeVideoID = null;
  spotifyURL = null;
  mediaType = null;

  if (!url) {
    audioStatus.textContent = "Audio URL invalid. Please try again.";
    mediaPreview.innerHTML = "";
    if (customAudio) {
      customAudio.pause();
      customAudio.remove();
      customAudio = null;
    }
    return;
  }

  // Clear previous media preview and audio
  mediaPreview.innerHTML = "";
  if (customAudio) {
    customAudio.pause();
    customAudio.remove();
    customAudio = null;
  }
  if (youTubePlayer) {
    youTubePlayer.destroy();
    youTubePlayer = null;
  }

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = extractYouTubeID(url);
    if (!id) {
      audioStatus.textContent = "Youtube URL invalid. Please try again.";
      return;
    }
    youTubeVideoID = id;
    mediaType = 'youtube';
    audioStatus.textContent = "Your YouTube video loaded and ready to play with the timer!";
    return;
  }

  if (url.includes("spotify.com")) {
    spotifyURL = url.replace("/track/", "/embed/track/");
    mediaType = 'spotify';
    audioStatus.textContent = "Your Spotify track loaded and ready to play with the timer!";
    return;
  }

  // Raw audio
  customAudio = new Audio(url);
  customAudio.volume = 0.8;
  customAudio.autoplay = false;
  customAudio.preload = "metadata";
  customAudio.loop = false;
  customAudio.controls = false;
  mediaType = 'audio';

  customAudio.addEventListener("loadedmetadata", () => {
    if (customAudio.duration < 10) {
      customAudio.loop = true;
    }
    audioStatus.textContent = `Audio loaded! Duration: ${customAudio.duration.toFixed(2)}s`;
  });

  customAudio.addEventListener("error", () => {
    audioStatus.textContent = "Your audio failed to load. This may be due to an invalid URL.";
  });

  customAudio.load();
};

// === YouTube Iframe API setup ===
function onYouTubeIframeAPIReady() {
  if (!youTubeVideoID) return;
  if (youTubePlayer) {
    youTubePlayer.destroy();
    youTubePlayer = null;
  }
  mediaPreview.innerHTML = `<div id="youtubePlayerDiv"></div>`;
  youTubePlayer = new YT.Player('youtubePlayerDiv', {
    videoId: youTubeVideoID,
    playerVars: {
      autoplay: 1,
      controls: 1,
      loop: 1,
      playlist: youTubeVideoID,
      modestbranding: 1,
      disablekb: 1,
    },
    events: {
      'onReady': (event) => {
        event.target.setPlaybackRate(currentPlaybackRate);
        if (isTimerRunning) event.target.playVideo();
      }
    }
  });
}

// Load YouTube API script once
if (!window.YT) {
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

// === Volume fade helper ===
function fadeVolume(audioElem, targetVolume, duration) {
  return new Promise((resolve) => {
    if (!audioElem) { resolve(); return; }
    const startVolume = audioElem.volume;
    const volumeChange = targetVolume - startVolume;
    const startTime = performance.now();

    function step() {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) {
        audioElem.volume = targetVolume;
        resolve();
        return;
      }
      audioElem.volume = startVolume + (volumeChange * (elapsed / duration));
      requestAnimationFrame(step);
    }
    step();
  });
}

// === Playback rate display helper ===
function updatePlaybackRateDisplay(rate) {
  let display = document.getElementById('playbackRateDisplay');
  if (!display) {
    display = document.createElement('div');
    display.id = 'playbackRateDisplay';
    display.style.fontWeight = 'bold';
    display.style.marginTop = '10px';
    document.body.appendChild(display);
  }
  if (rate <= 0) display.textContent = '';
  else if (rate === 1) display.textContent = 'Playback speed: Normal (1x)';
  else display.textContent = `Playback speed: ${rate.toFixed(2)}x`;
}

// === Audio/Video Control Functions ===
function onTimerStart() {
  isTimerRunning = true;
  isInHurryUp = false;
  hurryTriggered = false;
  currentPlaybackRate = 1;

  mediaPreview.innerHTML = "";

  if (mediaType === 'audio' && customAudio) {
    customAudio.currentTime = 0;
    customAudio.playbackRate = currentPlaybackRate;
    customAudio.controls = true;
    mediaPreview.appendChild(customAudio);
    fadeVolume(customAudio, 0.8, 500).then(() => customAudio.play());
  }
  else if (mediaType === 'youtube' && youTubeVideoID) {
    onYouTubeIframeAPIReady();
  }
  else if (mediaType === 'spotify' && spotifyURL) {
    mediaPreview.innerHTML = `<iframe style="border-radius:12px" src="${spotifyURL}" width="300" height="80" frameBorder="0" allowtransparency="true" allow="encrypted-media" allow="autoplay" allowfullscreen></iframe>`;
  }
  updatePlaybackRateDisplay(currentPlaybackRate);
  customAudioBox.style.display = "none";
}

function onTimerStop() {
  isTimerRunning = false;

  if (mediaType === 'audio' && customAudio) {
    fadeVolume(customAudio, 0, 500).then(() => customAudio.pause());
  } else if (mediaType === 'youtube' && youTubePlayer) {
    youTubePlayer.pauseVideo();
  }
  customAudioBox.style.display = "";
  updatePlaybackRateDisplay(0);

  // Stop Hurry loop + remove breathing
  if (hurryAudio) { hurryAudio.loop=false; hurryAudio.pause(); hurryAudio.currentTime=0; }
  document.body.classList.remove('hurry');
}

function onTimerReset() {
  isTimerRunning = false;
  isInHurryUp = false;
  hurryTriggered = false;
  currentPlaybackRate = 1;

  if (customAudio) {
    fadeVolume(customAudio, 0, 500).then(() => {
      customAudio.pause();
      customAudio.currentTime = 0;
      customAudio.playbackRate = 1;
    });
  }
  if (youTubePlayer) {
    youTubePlayer.stopVideo();
    youTubePlayer.seekTo(0);
    youTubePlayer.setPlaybackRate(1);
  }
  mediaPreview.innerHTML = "";
  updatePlaybackRateDisplay(0);
  customAudioBox.style.display = "";

  // Stop Hurry loop + remove breathing
  if (hurryAudio) { hurryAudio.loop=false; hurryAudio.pause(); hurryAudio.currentTime=0; }
  document.body.classList.remove('hurry');
}

// === Hurry Up Handler (SLW: loop sfx, red breathing) ===
function triggerHurryUp() {
  if (isInHurryUp) return;
  isInHurryUp = true;

  // Pause current media and loop the hurry sound until timer ends
  if (mediaType === 'audio' && customAudio) {
    fadeVolume(customAudio, 0, 500).then(() => {
      customAudio.pause();
      hurryAudio.loop = true;
      hurryAudio.currentTime = 0;
      hurryAudio.play();
    });
  }
  else if (mediaType === 'youtube' && youTubePlayer) {
    youTubePlayer.pauseVideo();
    hurryAudio.loop = true;
    hurryAudio.currentTime = 0;
    hurryAudio.play();
  }
  else {
    hurryAudio.loop = true;
    hurryAudio.currentTime = 0;
    hurryAudio.play();
  }
}

// === Timer Logic ===
let running = false;
let smbCounter = "400";
let hurryPlayed = false;
let finished = false;
let timerStartTime = 0;
let lastDisplayedTicks = null;
const TICK_MS = 1000; // Sonic Lost World: 1.0s per tick
let animationFrameId = null;

const ALLOWED_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function decrementSMBString(str) {
  let arr = str.toUpperCase().split('');
  for (let i = arr.length - 1; i >= 0; i--) {
    let ch = arr[i];
    if (ch === ' ') continue;
    let idx = ALLOWED_CHARS.indexOf(ch);
    if (idx > 0) {
      arr[i] = ALLOWED_CHARS[idx - 1];
      for (let j = i + 1; j < arr.length; j++) {
        arr[j] = (arr[j] === ' ') ? ' ' : '9';
      }
      return arr.join('');
    }
  }
  return "000";
}

function normalizeInput(str) {
  return (str.toUpperCase().replace(/[^A-Z0-9 ]/g, '').padEnd(3, ' ')).slice(0, 3);
}
function toLogicStr(str) { return str.replace(/ /g, '0'); }
function toDisplayArr(str) { return str.padEnd(3, ' ').slice(0, 3).split(''); }
function formatSMB(str) {
  let sArr = toDisplayArr(str);
  return sArr.map(ch => `<span class="monochar">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
}

function updateDisplay() {
  const display = document.getElementById('display');
  display.innerHTML = formatSMB(smbCounter);
}
function showInput(show) {
  const timerInput = document.getElementById('timerInput');
  timerInput.style.display = show ? '' : 'none';
  document.getElementById('display').style.display = show ? 'none' : '';
}
function updateStartStopButton() {
  const btn = document.getElementById('startStopBtn');
  btn.textContent = running ? "Stop" : "Start";
}

// Called on every displayed tick to check Hurry Up
function onTimerTick(ticksLeft) {
  if (!hurryTriggered && ticksLeft <= 100 && ticksLeft > 0) {
    hurryTriggered = true;
    triggerHurryUp();
  }
}

function wallClockUpdate() {
  if (!running) return;
  const now = performance.now();
  const elapsed = now - timerStartTime;
  const ticksPassed = Math.floor(elapsed / TICK_MS);

  if (lastDisplayedTicks === null) lastDisplayedTicks = 0;
  let decrementsNeeded = ticksPassed - lastDisplayedTicks;
  for (let i = 0; i < decrementsNeeded; i++) {
    if (toLogicStr(smbCounter) !== "000") {
      smbCounter = decrementSMBString(smbCounter);
    }
  }
  updateDisplay();

  const ticksLeft = parseInt(toLogicStr(smbCounter), 10);
  if (!isNaN(ticksLeft)) {
    onTimerTick(ticksLeft);
  }

  lastDisplayedTicks = ticksPassed;

  if (toLogicStr(smbCounter) !== "000") {
    animationFrameId = requestAnimationFrame(wallClockUpdate);
  } else {
    running = false;
    finished = true;
    updateStartStopButton();
    showInput(false);
    document.body.classList.remove('running');
    updateDisplay();
    animationFrameId = null;

    // Stop looping Hurry sound and reset media on timer end
    if (hurryAudio) { hurryAudio.loop=false; hurryAudio.pause(); hurryAudio.currentTime=0; }
    document.body.classList.remove('hurry');
    onTimerReset();
  }
}

function startStop() {
  if (finished && !running) return;

  if (running) {
    running = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    updateStartStopButton();
    showInput(false);
    document.body.classList.remove('running');
    onTimerStop();
    finished = false;
  } else {
    let input = document.getElementById('timerInput');
    smbCounter = normalizeInput(input.value);
    hurryPlayed = false;
    finished = false;
    document.body.classList.add('running');
    showInput(false);
    updateDisplay();
    timerStartTime = performance.now();
    lastDisplayedTicks = 0;
    running = true;
    updateStartStopButton();

    onTimerStart();
    animationFrameId = requestAnimationFrame(wallClockUpdate);
  }
}

function reset() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  running = false;
  let input = document.getElementById('timerInput');
  smbCounter = normalizeInput(input.value);
  hurryPlayed = false;
  finished = false;
  showInput(true);
  updateDisplay();
  updateStartStopButton();
  document.body.classList.remove('running');
  onTimerReset();
}

// Hook up controls after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timerInput = document.getElementById('timerInput');

  if (startBtn) startBtn.addEventListener('click', startStop);
  if (resetBtn) resetBtn.addEventListener('click', reset);

  // Enter key starts/stops; Escape resets
  if (timerInput) {
    timerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        startStop();
        timerInput.blur();
      } else if (e.key === 'Escape') {
        reset();
        timerInput.blur();
      }
    });
  }

  // Initialize visual
  showInput(true);
  updateDisplay();

  // Apply SLW classes
  document.body.classList.add('slw-timer','body-slw');
});
