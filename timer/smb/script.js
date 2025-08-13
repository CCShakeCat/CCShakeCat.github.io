// === SMB Timer with Full NSMB Music Logic ===
const customAudioInput = document.getElementById('customAudioInput');
const customAudioBox = document.getElementById('customAudioBox');
const loadAudioBtn = document.getElementById('loadAudioBtn');
const audioStatus = document.getElementById('audioStatus');
const mediaPreview = document.getElementById('mediaPreview');
const hurryAudio = document.getElementById('hurryAudio');
const genHurryAudio = document.getElementById('genHurryAudio');

let customAudio = null;
let youTubeVideoID = null;
let youTubePlayer = null;
let spotifyURL = null;
let mediaType = null; // 'audio', 'youtube', 'spotify'
let currentPlaybackRate = 1;
let hurryTriggered = false;

// === Volume fade helper, returns Promise ===
function fadeVolume(audioElem, targetVolume, duration) {
  return new Promise((resolve) => {
    if (!audioElem) {
      resolve();
      return;
    }
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

// Playback rate display helper
function updatePlaybackRateDisplay(rate) {
  let display = document.getElementById('playbackRateDisplay');
  if (!display) {
    display = document.createElement('div');
    display.id = 'playbackRateDisplay';
    display.style.fontWeight = 'bold';
    display.style.marginTop = '10px';
    document.body.appendChild(display);
  }
  if (rate <= 0) {
    display.textContent = '';
  } else if (rate === 1) {
    display.textContent = 'Playback speed: Normal (1x)';
  } else {
    display.textContent = `Playback speed: ${rate.toFixed(2)}x`;
  }
}

function extractYouTubeID(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

loadAudioBtn.onclick = () => {
  const url = customAudioInput.value.trim();
  audioStatus.textContent = "";
  mediaType = null;
  youTubeVideoID = null;
  spotifyURL = null;

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

  if (!url) {
    audioStatus.textContent = "❌ Invalid URL.";
    return;
  }

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = extractYouTubeID(url);
    if (!id) {
      audioStatus.textContent = "❌ Invalid YouTube URL.";
      return;
    }
    youTubeVideoID = id;
    mediaType = 'youtube';
    audioStatus.textContent = "✅ YouTube video ready!";
    return;
  }

  if (url.includes("spotify.com")) {
    spotifyURL = url.replace("/track/", "/embed/track/");
    mediaType = 'spotify';
    audioStatus.textContent = "✅ Spotify track ready!";
    return;
  }

  customAudio = new Audio(url);
  customAudio.volume = 0.8;
  customAudio.autoplay = false;
  customAudio.preload = "metadata";
  customAudio.loop = false;
  customAudio.controls = false;
  mediaType = 'audio';

  customAudio.addEventListener("loadedmetadata", () => {
    if (customAudio.duration < 10) customAudio.loop = true;
    audioStatus.textContent = `✅ Audio loaded (${customAudio.duration.toFixed(1)}s)`;
  });

  customAudio.addEventListener("error", () => {
    audioStatus.textContent = "❌ Audio load failed.";
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
      onReady: (event) => {
        event.target.setPlaybackRate(currentPlaybackRate);
        if (running) event.target.playVideo();
      }
    }
  });
}

// Inject YT API once
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

// === Audio Logic with fade and playbackRateDisplay ===
function playMedia(rate = 1) {
  currentPlaybackRate = rate;
  mediaPreview.innerHTML = "";

  if (mediaType === 'audio' && customAudio) {
    customAudio.playbackRate = rate;
    customAudio.currentTime = 0;
    customAudio.controls = true;
    mediaPreview.appendChild(customAudio);
    fadeVolume(customAudio, 0.8, 500).then(() => customAudio.play());
  } else if (mediaType === 'youtube' && youTubeVideoID) {
    onYouTubeIframeAPIReady();
  } else if (mediaType === 'spotify' && spotifyURL) {
    mediaPreview.innerHTML = `<iframe style="border-radius:12px" src="${spotifyURL}" width="300" height="80" frameBorder="0" allowtransparency="true" allow="encrypted-media" allow="autoplay" allowfullscreen></iframe>`;
  }
  updatePlaybackRateDisplay(currentPlaybackRate);
}

function pauseMedia() {
  if (customAudio) fadeVolume(customAudio, 0, 500).then(() => customAudio.pause());
  if (youTubePlayer) youTubePlayer.pauseVideo();
  // Spotify iframe can't be paused
  updatePlaybackRateDisplay(0);
}

function resetMedia() {
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
}

// === Genesis Hurry Up Toggle Check ===
function isGenesisHurryEnabled() {
  const toggle = document.getElementById('genHurryToggleBox');
  // Defensive: ensure toggle is in DOM and is a checkbox
  return toggle && (toggle.type === 'checkbox') && toggle.checked;
}

// === Hurry Up Logic with fade and playbackRateDisplay ===
function triggerHurryUp() {
  if (hurryTriggered) return;
  hurryTriggered = true;
  pauseMedia();

  const audio = isGenesisHurryEnabled() ? genHurryAudio : hurryAudio;
  audio.currentTime = 0;
  audio.play();

  audio.onended = () => {
    if (running) {
      if (mediaType === 'audio' && customAudio) {
        currentPlaybackRate = 1.25;
        customAudio.currentTime = 0;
        customAudio.playbackRate = currentPlaybackRate;
        fadeVolume(customAudio, 0.8, 500).then(() => {
          customAudio.play();
          updatePlaybackRateDisplay(currentPlaybackRate);
        });
      }
      else if (mediaType === 'youtube' && youTubePlayer) {
        youTubePlayer.seekTo(0);
        youTubePlayer.setPlaybackRate(1.25);
        youTubePlayer.playVideo();
        updatePlaybackRateDisplay(1.25);
      }
      else if (mediaType === 'spotify') {
        mediaPreview.innerHTML = `<iframe style="border-radius:12px" src="${spotifyURL}" width="300" height="80" frameBorder="0" allowtransparency="true" allow="encrypted-media" allow="autoplay" allowfullscreen></iframe>`;
        updatePlaybackRateDisplay(1);
      }
    }
  };
}

// === Timer Logic ===
let running = false;
let smbCounter = "400";
let startValue = "400";
let hurryPlayed = false;
let finished = false;
let timerStartTime = 0;
let lastDisplayedTicks = null;
const TICK_MS = 400;
let animationFrameId = null;

const ALLOWED_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function decrementSMBString(str) {
  let arr = str.toUpperCase().split('');
  for (let i = arr.length - 1; i >= 0; i--) {
    const idx = ALLOWED_CHARS.indexOf(arr[i]);
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
function toLogicStr(str) {
  return str.replace(/ /g, '0');
}
function toDisplayArr(str) {
  return str.padEnd(3, ' ').slice(0, 3).split('');
}
function formatSMB(str) {
  return toDisplayArr(str).map(ch => `<span class="monochar">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
}
function updateDisplay() {
  document.getElementById('display').innerHTML = formatSMB(smbCounter);
}
function showInput(show) {
  const input = document.getElementById('timerInput');
  input.style.display = show ? '' : 'none';
  document.getElementById('display').style.display = show ? 'none' : '';
  if (show) {
    input.style.letterSpacing = '0.1em';
    input.style.width = '7.8em';
    input.style.textAlign = 'center';
  }
}
function updateStartStopButton() {
  document.getElementById('startStopBtn').textContent = running ? "Stop" : "Start";
}

function wallClockUpdate() {
  if (!running) return;
  const now = performance.now();
  const elapsed = now - timerStartTime;
  const ticksPassed = Math.floor(elapsed / TICK_MS);
  if (lastDisplayedTicks === null) lastDisplayedTicks = 0;

  for (let i = 0; i < ticksPassed - lastDisplayedTicks; i++) {
    if (toLogicStr(smbCounter) !== "000") {
      smbCounter = decrementSMBString(smbCounter);
    }
  }
  updateDisplay();

  const ticksLeft = parseInt(toLogicStr(smbCounter), 10);
  if (!hurryPlayed && ticksLeft <= 100 && ticksLeft > 0) {
    hurryPlayed = true;
    triggerHurryUp();
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
    resetMedia();
  }
}

function startStop() {
  if (finished && !running) return;
  const genHurryToggle = document.getElementById('genHurryToggle');
  if (running) {
    running = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    pauseMedia();
    updateStartStopButton();
    showInput(false);
    document.body.classList.remove('running');
    if (genHurryToggle) genHurryToggle.disabled = false; // Enable toggle
    finished = false;
  } else {
    smbCounter = normalizeInput(document.getElementById('timerInput').value);
    startValue = smbCounter;
    hurryPlayed = false;
    hurryTriggered = false;
    currentPlaybackRate = 1;
    running = true;
    document.body.classList.add('smb-mode');
    document.body.classList.add('running');
    showInput(false);
    updateDisplay();
    timerStartTime = performance.now();
    lastDisplayedTicks = 0;
    updateStartStopButton();
    playMedia();
    if (genHurryToggle) genHurryToggle.disabled = true; // Disable toggle while running
    customAudioBox.style.display = 'none';
    animationFrameId = requestAnimationFrame(wallClockUpdate);
  }
}

function reset() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  running = false;
  smbCounter = normalizeInput(document.getElementById('timerInput').value);
  startValue = smbCounter;
  hurryPlayed = false;
  hurryTriggered = false;
  finished = false;
  document.body.classList.add('smb-mode');
  document.body.classList.remove('running');
  showInput(true);
  updateDisplay();
  updateStartStopButton();
  resetMedia();
  const genHurryToggle = document.getElementById('genHurryToggle');
  if (genHurryToggle) genHurryToggle.disabled = false; // Enable toggle
  customAudioBox.style.display = '';
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('startStopBtn').addEventListener('click', startStop);
  document.getElementById('resetBtn').addEventListener('click', reset);

  const timerInput = document.getElementById('timerInput');
  timerInput.addEventListener('focus', () => showInput(true));
  timerInput.addEventListener('blur', () => {
    timerInput.value = normalizeInput(timerInput.value);
  });
  timerInput.addEventListener('input', () => {
    timerInput.value = timerInput.value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 3);
  });
  timerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') timerInput.blur();
  });

  timerInput.value = "400";
  reset();
  document.querySelectorAll('audio').forEach(audio => audio.volume = 0.5);
});