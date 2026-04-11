(() => {
  const body = document.body;

  const display = document.getElementById('display');
  const input = document.getElementById('timerInput');
  const startBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const styleSelect = document.getElementById('styleSelect');

  const hurryAudio = document.getElementById('hurryAudio');
  const nsmb2WarningAudio = document.getElementById('nsmb2WarningAudio');

  const customAudioInput = document.getElementById('customAudioInput');
  const loadAudioBtn = document.getElementById('loadAudioBtn');
  const audioStatus = document.getElementById('audioStatus');
  const mediaPreview = document.getElementById('mediaPreview');
  const bgAudio = document.getElementById('bgAudio');

  const TICK_MS = 750;
  const HURRY_AT_NUMERIC = 100;
  const LAST_TEN_MIN = 1;
  const LAST_TEN_MAX = 10;
  const HURRY_RESUME_RATE = 1.25;

  let state = 'idle'; // idle | running | paused
  let timerValue = '400';
  let startValue = '400';
  let timer = null;

  let hurryPrimed = false;
  let hurryPlayed = false;
  let lastTenPlayedFor = new Set();
  let warningFlashTimer = null;

  let mediaType = null; // null | audio | youtube | spotify
  let mediaURL = '';
  let youTubeVideoID = '';
  let youTubePlayer = null;
  let ytApiReady = false;
  let wantPlayback = false;

  let hurryResumeTimeout = null;
  let activeWarningOverlays = [];

  function normalizeTimerText(raw) {
    return String(raw ?? '')
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .slice(0, 3);
  }

  function padTimerText(raw) {
    return normalizeTimerText(raw).padStart(3, '0');
  }

  function numericValue(text) {
    const t = padTimerText(text);
    if (!/^[0-9]{3}$/.test(t)) return null;
    return parseInt(t, 10);
  }

  function isTimerZero(text) {
    return padTimerText(text) === '000';
  }

  function formatTimerHTML(text) {
    return padTimerText(text)
      .split('')
      .map(ch => `<span class="monochar">${ch}</span>`)
      .join('');
  }

  function render() {
    timerValue = padTimerText(timerValue);
    display.innerHTML = formatTimerHTML(timerValue);
    input.value = timerValue;
  }

  function syncUiState() {
    body.dataset.running = state === 'running' ? 'true' : 'false';
    body.dataset.paused = state === 'paused' ? 'true' : 'false';
    startBtn.textContent = state === 'running' ? 'Stop' : 'Start';
  }

  function setEditing(on) {
    if (on) {
      input.value = padTimerText(timerValue);
      body.classList.add('editing');
      input.focus();
      input.setSelectionRange(0, input.value.length);
    } else {
      body.classList.remove('editing');
    }
  }

  function currentStyle() {
    return styleSelect?.value || 'ds';
  }

  function isNSMB2() {
    return currentStyle() === 'nsmb2';
  }

  function applyStyleClass() {
    body.classList.remove('ds-timer', 'wii-timer', 'nsmb2-timer');

    const v = currentStyle();
    if (v === 'wii') body.classList.add('wii-timer');
    else if (v === 'nsmb2') body.classList.add('nsmb2-timer');
    else body.classList.add('ds-timer');

    try {
      localStorage.setItem('nsmb-style', v);
    } catch {}
  }

  function setAudioStatus(msg) {
    audioStatus.textContent = msg || '';
  }

  function clearWarningFlash() {
    if (warningFlashTimer) {
      clearInterval(warningFlashTimer);
      warningFlashTimer = null;
    }
    body.classList.remove('warning-fill-red', 'warning-fill-white');
  }

  function startNSMB2Flash() {
    clearWarningFlash();

    let red = false;
    warningFlashTimer = setInterval(() => {
      red = !red;
      body.classList.toggle('warning-fill-red', red);
      body.classList.toggle('warning-fill-white', !red);
    }, 333);
  }

  function updateNSMB2WarningVisual() {
    const num = numericValue(timerValue);
    if (isNSMB2() && state === 'running' && num !== null && num <= HURRY_AT_NUMERIC && num > 0) {
      if (!warningFlashTimer) startNSMB2Flash();
    } else {
      clearWarningFlash();
    }
  }

  function primeAudioElementOnce(audioEl) {
    if (!audioEl) return;

    try {
      const oldMuted = audioEl.muted;
      const oldVol = audioEl.volume;

      audioEl.muted = true;
      audioEl.volume = 0;

      const p = audioEl.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          audioEl.pause();
          audioEl.currentTime = 0;
          audioEl.muted = oldMuted;
          audioEl.volume = oldVol;
        }).catch(() => {
          audioEl.muted = oldMuted;
          audioEl.volume = oldVol;
        });
      }
    } catch {}
  }

  function primeHurryOnce() {
    if (hurryPrimed) return;
    hurryPrimed = true;
    primeAudioElementOnce(hurryAudio);
    primeAudioElementOnce(nsmb2WarningAudio);
    primeAudioElementOnce(bgAudio);
  }

  function clearMediaPreview() {
    mediaPreview.innerHTML = '';
  }

  function clearHurryResumeTimeout() {
    if (hurryResumeTimeout) {
      clearTimeout(hurryResumeTimeout);
      hurryResumeTimeout = null;
    }
  }

  function stopWarningOverlays() {
    activeWarningOverlays.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      } catch {}
    });
    activeWarningOverlays = [];
  }

  function stopAllMedia() {
    clearHurryResumeTimeout();
    stopWarningOverlays();
    wantPlayback = false;

    try {
      hurryAudio.pause();
      hurryAudio.currentTime = 0;
    } catch {}

    try {
      bgAudio.pause();
      bgAudio.currentTime = 0;
      bgAudio.playbackRate = 1;
    } catch {}

    if (youTubePlayer) {
      try {
        if (typeof youTubePlayer.pauseVideo === 'function') {
          youTubePlayer.pauseVideo();
        }
        if (typeof youTubePlayer.seekTo === 'function') {
          youTubePlayer.seekTo(0, true);
        }
        if (typeof youTubePlayer.setPlaybackRate === 'function') {
          youTubePlayer.setPlaybackRate(1);
        }
      } catch {}
    }
  }

  function pauseBackgroundMedia() {
    try {
      bgAudio.pause();
    } catch {}

    if (youTubePlayer && typeof youTubePlayer.pauseVideo === 'function') {
      try {
        youTubePlayer.pauseVideo();
      } catch {}
    }
  }

  function pauseAllMediaIncludingHurry() {
    clearHurryResumeTimeout();
    stopWarningOverlays();
    wantPlayback = false;

    try {
      hurryAudio.pause();
      hurryAudio.currentTime = 0;
    } catch {}

    try {
      bgAudio.pause();
    } catch {}

    if (youTubePlayer && typeof youTubePlayer.pauseVideo === 'function') {
      try {
        youTubePlayer.pauseVideo();
      } catch {}
    }
  }

  function startConfiguredMedia({ rate = 1, restart = false } = {}) {
    if (!mediaType) return;
    if (state !== 'running') return;

    wantPlayback = true;

    if (mediaType === 'audio') {
      try {
        bgAudio.loop = true;
        bgAudio.playbackRate = rate;
        if (restart) bgAudio.currentTime = 0;
        bgAudio.play().catch(() => {});
      } catch {}
      return;
    }

    if (mediaType === 'youtube') {
      if (!window.YT || !window.YT.Player) return;

      if (!youTubePlayer && youTubeVideoID) {
        buildYouTubePlayer();
        return;
      }

      if (!youTubePlayer || !ytApiReady) return;

      try {
        if (restart && typeof youTubePlayer.seekTo === 'function') {
          youTubePlayer.seekTo(0, true);
        }
        if (typeof youTubePlayer.setPlaybackRate === 'function') {
          youTubePlayer.setPlaybackRate(rate);
        }
        youTubePlayer.playVideo();
      } catch {}
      return;
    }

    // Spotify remains manual/embed-only
  }

  function parseYouTubeId(url) {
    try {
      const u = new URL(url);

      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1) || '';
      }

      if (u.searchParams.get('v')) {
        return u.searchParams.get('v') || '';
      }

      const parts = u.pathname.split('/');
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];

      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];
    } catch {}

    return '';
  }

  function buildYouTubePlayer() {
    if (!youTubeVideoID) return;
    if (!window.YT || !window.YT.Player) return;

    ytApiReady = true;

    clearMediaPreview();
    mediaPreview.innerHTML = `<div id="youtubePlayerDiv" style="width:100%;max-width:360px;aspect-ratio:16/9;"></div>`;

    youTubePlayer = new YT.Player('youtubePlayerDiv', {
      videoId: youTubeVideoID,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        loop: 1,
        playlist: youTubeVideoID
      },
      events: {
        onReady: () => {
          ytApiReady = true;
          if (state === 'running') {
            startConfiguredMedia();
          }
        },
        onStateChange: (event) => {
          if (window.YT && event.data === window.YT.PlayerState.ENDED) {
            if (state !== 'running') return;
            try {
              youTubePlayer.seekTo(0, true);
              youTubePlayer.playVideo();
            } catch {}
          }
        }
      }
    });
  }

  window.onYouTubeIframeAPIReady = function () {
    ytApiReady = true;
    if (mediaType === 'youtube' && youTubeVideoID) {
      buildYouTubePlayer();
    }
  };

  function setMusicFromURL(rawURL) {
    const url = String(rawURL || '').trim();

    mediaType = null;
    mediaURL = '';
    youTubeVideoID = '';
    youTubePlayer = null;
    wantPlayback = false;
    stopAllMedia();
    clearMediaPreview();

    if (!url) {
      setAudioStatus('No music loaded');
      return;
    }

    mediaURL = url;

    if (/youtu\.be|youtube\.com/i.test(url)) {
      const vid = parseYouTubeId(url);
      if (!vid) {
        setAudioStatus('Could not read that YouTube link');
        return;
      }

      mediaType = 'youtube';
      youTubeVideoID = vid;

      if (window.YT && window.YT.Player) {
        ytApiReady = true;
        buildYouTubePlayer();
      } else {
        mediaPreview.innerHTML = `<div id="youtubePlayerDiv" style="width:100%;max-width:360px;aspect-ratio:16/9;"></div>`;
      }

      setAudioStatus('YouTube loaded');

      if (state === 'running') {
        startConfiguredMedia();
      }
      return;
    }

    if (/spotify\.com/i.test(url)) {
      mediaType = 'spotify';

      const spotifyEmbedURL = url
        .replace('/track/', '/embed/track/')
        .replace('/episode/', '/embed/episode/')
        .replace('/album/', '/embed/album/')
        .replace('/playlist/', '/embed/playlist/');

      mediaPreview.innerHTML = `
        <iframe
          src="${spotifyEmbedURL}"
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
        </iframe>
      `;

      setAudioStatus('Spotify embed loaded');
      return;
    }

    mediaType = 'audio';
    bgAudio.src = url;
    bgAudio.loop = true;
    bgAudio.load();

    clearMediaPreview();
    mediaPreview.appendChild(bgAudio);
    bgAudio.controls = true;

    setAudioStatus('Direct audio loaded');

    if (state === 'running') {
      startConfiguredMedia();
    }
  }

  function playHurrySoundThenResumeMedia() {
    pauseBackgroundMedia();
    stopWarningOverlays();
    clearHurryResumeTimeout();

    let resumed = false;
    const resume = () => {
      if (resumed) return;
      resumed = true;
      clearHurryResumeTimeout();

      if (state === 'running' && !isTimerZero(timerValue)) {
        startConfiguredMedia({ rate: HURRY_RESUME_RATE, restart: true });
      }
    };

    try {
      hurryAudio.pause();
      hurryAudio.currentTime = 0;
      hurryAudio.addEventListener('ended', resume, { once: true });

      hurryAudio.play().then(() => {
        const fallback = Number.isFinite(hurryAudio.duration) && hurryAudio.duration > 0
          ? Math.ceil(hurryAudio.duration * 1000) + 150
          : 3500;
        hurryResumeTimeout = setTimeout(resume, fallback);
      }).catch(() => resume());
    } catch {
      resume();
    }
  }

  function playNSMB2LastTenOverlay(currentNumericValue) {
    if (!isNSMB2()) return;
    if (!nsmb2WarningAudio) return;
    if (currentNumericValue < LAST_TEN_MIN || currentNumericValue > LAST_TEN_MAX) return;
    if (lastTenPlayedFor.has(currentNumericValue)) return;

    lastTenPlayedFor.add(currentNumericValue);

    try {
      const overlay = nsmb2WarningAudio.cloneNode(true);
      overlay.currentTime = 0;
      activeWarningOverlays.push(overlay);

      const cleanup = () => {
        activeWarningOverlays = activeWarningOverlays.filter(a => a !== overlay);
      };

      overlay.addEventListener('ended', cleanup, { once: true });
      overlay.play().catch(cleanup);
    } catch {}
  }

  function triggerHurryIfNeeded() {
    if (hurryPlayed) return;
    hurryPlayed = true;
    playHurrySoundThenResumeMedia();
  }

  function decrementTimerText(text) {
    const chars = padTimerText(text).split('');

    for (let i = chars.length - 1; i >= 0; i--) {
      const ch = chars[i];

      if (ch >= 'B' && ch <= 'Z') {
        chars[i] = String.fromCharCode(ch.charCodeAt(0) - 1);
        return chars.join('');
      }

      if (ch === 'A') {
        chars[i] = '9';
        return chars.join('');
      }

      if (ch >= '1' && ch <= '9') {
        chars[i] = String(Number(ch) - 1);
        return chars.join('');
      }

      chars[i] = '9';
    }

    return '000';
  }

  function tick() {
    timerValue = padTimerText(timerValue);

    if (!isTimerZero(timerValue)) {
      timerValue = decrementTimerText(timerValue);
      render();

      const num = numericValue(timerValue);

      if (!hurryPlayed && num !== null && num <= HURRY_AT_NUMERIC && num > 0) {
        triggerHurryIfNeeded();
      }

      if (num !== null && num <= LAST_TEN_MAX) {
        playNSMB2LastTenOverlay(num);
      }

      updateNSMB2WarningVisual();

      if (isTimerZero(timerValue)) {
        timerValue = '000';
        render();
        stopFromTimeout();
      }
    } else {
      stopFromTimeout();
    }
  }

  function startInterval() {
    clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
  }

  function start() {
    if (state === 'running') return;

    timerValue = padTimerText(timerValue);
    startValue = padTimerText(startValue);

    setEditing(false);
    primeHurryOnce();

    state = 'running';
    syncUiState();

    const num = numericValue(timerValue);

    if (!hurryPlayed && num !== null && num <= HURRY_AT_NUMERIC && num > 0) {
      triggerHurryIfNeeded();
    } else {
      startConfiguredMedia();
      updateNSMB2WarningVisual();
    }

    startInterval();
  }

  function pause() {
    if (state !== 'running') return;

    clearInterval(timer);
    timer = null;
    state = 'paused';
    syncUiState();

    pauseAllMediaIncludingHurry();
    updateNSMB2WarningVisual();
    setEditing(false);

    if (mediaType === 'youtube' && youTubeVideoID && !youTubePlayer && window.YT && window.YT.Player) {
      buildYouTubePlayer();
    }
  }

  function stopFromTimeout() {
    clearInterval(timer);
    timer = null;
    state = 'paused';
    syncUiState();

    pauseAllMediaIncludingHurry();
    updateNSMB2WarningVisual();
    setEditing(false);
  }

  function reset() {
    clearInterval(timer);
    timer = null;

    if (state === 'idle') {
      startValue = padTimerText(input.value || startValue);
    }

    state = 'idle';
    timerValue = padTimerText(startValue);
    hurryPlayed = false;
    lastTenPlayedFor.clear();
    wantPlayback = false;

    stopAllMedia();
    clearWarningFlash();
    setEditing(false);
    syncUiState();
    render();
  }

  display.addEventListener('click', () => {
    if (state !== 'idle') return;
    setEditing(true);
  });

  input.addEventListener('focus', () => {
    if (state !== 'idle') input.blur();
  });

  input.addEventListener('input', () => {
    const cleaned = String(input.value ?? '')
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .slice(0, 3);
    input.value = cleaned;
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    input.value = normalizeTimerText(pasted);
  });

  input.addEventListener('drop', (e) => {
    e.preventDefault();
  });

  input.addEventListener('keydown', (e) => {
    const allowedControlKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab',
      'Enter', 'Escape'
    ];

    if (allowedControlKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') setEditing(false);
      return;
    }

    if (!/^[0-9a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('blur', () => {
    const cleaned = normalizeTimerText(input.value);

    if (cleaned !== '') {
      timerValue = padTimerText(cleaned);
      startValue = timerValue;
    } else {
      timerValue = padTimerText(timerValue);
    }

    hurryPlayed = false;
    lastTenPlayedFor.clear();
    clearWarningFlash();
    stopWarningOverlays();

    render();
    setEditing(false);
  });

  startBtn.addEventListener('click', () => {
    primeHurryOnce();
    if (state === 'running') pause();
    else start();
  });

  resetBtn.addEventListener('click', reset);

  styleSelect.addEventListener('change', () => {
    const wasNSMB2 = body.classList.contains('nsmb2-timer');
    applyStyleClass();

    if (wasNSMB2 && !isNSMB2()) {
      clearWarningFlash();
    } else {
      updateNSMB2WarningVisual();
    }
  });

  loadAudioBtn.addEventListener('click', () => {
    setMusicFromURL(customAudioInput.value);

    try {
      localStorage.setItem('nsmb-music-url', customAudioInput.value.trim());
    } catch {}

    if (state === 'running') {
      startConfiguredMedia();
    }
  });

  customAudioInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadAudioBtn.click();
    }
  });

  if (bgAudio) {
    bgAudio.loop = true;
    bgAudio.addEventListener('ended', () => {
      if (state === 'running') {
        try {
          bgAudio.currentTime = 0;
          bgAudio.play().catch(() => {});
        } catch {}
      }
    });
  }

  function initFromDOM() {
    try {
      const savedStyle = localStorage.getItem('nsmb-style');
      if (savedStyle) styleSelect.value = savedStyle;
    } catch {}

    applyStyleClass();

    timerValue = padTimerText(input.value || display.textContent || '400');
    startValue = timerValue;

    render();
    setEditing(false);
    clearWarningFlash();

    state = 'idle';
    syncUiState();

    try {
      const savedMusic = localStorage.getItem('nsmb-music-url');
      if (savedMusic) {
        customAudioInput.value = savedMusic;
        setMusicFromURL(savedMusic);
      } else {
        setAudioStatus('No music loaded');
      }
    } catch {
      setAudioStatus('No music loaded');
    }
  }

  initFromDOM();
})();
