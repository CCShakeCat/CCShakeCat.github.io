(() => {
  const body = document.body;

  const display = document.getElementById('display');
  const spriteDisplay = document.getElementById('spriteDisplay');
  const timerLabel = document.getElementById('timerLabel');
  const timerLabelSprite = document.getElementById('timerLabelSprite');
  const input = document.getElementById('timerInput');
  const startBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const styleSelect = document.getElementById('styleSelect');

  const hurryAudio = document.getElementById('hurryAudio');
  const genHurryAudio = document.getElementById('genHurryAudio');
  const genHurryToggleBox = document.getElementById('genHurryToggleBox');

  const customAudioInput = document.getElementById('customAudioInput');
  const loadAudioBtn = document.getElementById('loadAudioBtn');
  const audioStatus = document.getElementById('audioStatus');
  const mediaPreview = document.getElementById('mediaPreview');

  const TICK_MS = 400;
  const HURRY_AT_NUMERIC = 100;
  const HURRY_RESUME_RATE = 1.25;
  const SPRITE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let state = 'idle';
  let timerValue = '400';
  let startValue = '400';
  let timer = null;

  let hurryPlayed = false;
  let hurryResumeTimeout = null;

  let mediaType = null;
  let audioEl = null;
  let youTubeVideoID = '';
  let youTubePlayer = null;
  let ytApiReady = false;
  let wantPlayback = false;

  function normalizeTimerText(raw) {
    return String(raw ?? '')
      .replace(/[^0-9A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase();
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

  function currentStyle() {
    return styleSelect?.value || 'smb';
  }

  function usesSpriteHud() {
    const s = currentStyle();
    return s === 'smblost' || s === 'smas';
  }

  function currentHurryAudio() {
    return genHurryToggleBox?.checked ? genHurryAudio : hurryAudio;
  }

  function renderSpriteString(target, text) {
    if (!target) return;

    target.innerHTML = '';
    const rootStyles = getComputedStyle(document.documentElement);
    const stride = parseFloat(rootStyles.getPropertyValue('--glyph-stride')) || 9;
    const scale = parseFloat(rootStyles.getPropertyValue('--glyph-scale')) || 8;

    for (const rawCh of String(text)) {
      const ch = rawCh.toUpperCase();
      const idx = SPRITE_CHARS.indexOf(ch);
      if (idx === -1) continue;

      const cell = document.createElement('span');
      cell.className = 'sprite-char';
      cell.style.backgroundPosition = `${-(idx * stride * scale)}px 0px`;
      target.appendChild(cell);
    }
  }

  function render() {
    timerValue = padTimerText(timerValue);

    display.textContent = timerValue;
    input.value = timerValue;

    if (usesSpriteHud()) {
      renderSpriteString(timerLabelSprite, 'TIME');
      renderSpriteString(spriteDisplay, timerValue);
    } else {
      timerLabelSprite.innerHTML = '';
      spriteDisplay.innerHTML = '';
    }
  }

  function syncUiState() {
    body.dataset.running = state === 'running' ? 'true' : 'false';
    body.dataset.paused = state === 'paused' ? 'true' : 'false';
    startBtn.textContent = state === 'running' ? 'Stop' : 'Start';
  }

  function setEditing(on) {
    if (on) {
      input.value = padTimerText(timerValue);
      if (usesSpriteHud()) {
        renderSpriteString(spriteDisplay, input.value);
      }
      body.classList.add('editing');
      input.focus();
      input.setSelectionRange(0, input.value.length);
    } else {
      body.classList.remove('editing');
    }
  }

  function applyStyle() {
    body.dataset.style = currentStyle();

    try {
      localStorage.setItem('smb-style', currentStyle());
    } catch {}

    render();
  }

  function setAudioStatus(msg) {
    audioStatus.textContent = msg || '';
  }

  function clearHurryResumeTimeout() {
    if (hurryResumeTimeout) {
      clearTimeout(hurryResumeTimeout);
      hurryResumeTimeout = null;
    }
  }

  function clearMediaPreview() {
    mediaPreview.innerHTML = '';
    audioEl = null;
  }

  function stopAllMedia() {
    clearHurryResumeTimeout();
    wantPlayback = false;

    try {
      hurryAudio.pause();
      hurryAudio.currentTime = 0;
    } catch {}

    try {
      genHurryAudio.pause();
      genHurryAudio.currentTime = 0;
    } catch {}

    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.playbackRate = 1;
      } catch {}
    }

    if (youTubePlayer) {
      try {
        if (typeof youTubePlayer.pauseVideo === 'function') youTubePlayer.pauseVideo();
        if (typeof youTubePlayer.seekTo === 'function') youTubePlayer.seekTo(0, true);
        if (typeof youTubePlayer.setPlaybackRate === 'function') youTubePlayer.setPlaybackRate(1);
      } catch {}
    }
  }

  function pauseAllMediaIncludingHurry() {
    clearHurryResumeTimeout();
    wantPlayback = false;

    try {
      hurryAudio.pause();
      hurryAudio.currentTime = 0;
    } catch {}

    try {
      genHurryAudio.pause();
      genHurryAudio.currentTime = 0;
    } catch {}

    if (audioEl) {
      try {
        audioEl.pause();
      } catch {}
    }

    if (youTubePlayer) {
      try {
        if (typeof youTubePlayer.pauseVideo === 'function') youTubePlayer.pauseVideo();
      } catch {}
    }
  }

  function startConfiguredMedia({ rate = 1, restart = false } = {}) {
    if (!mediaType) return;
    if (state !== 'running') return;

    wantPlayback = true;

    if (mediaType === 'audio' && audioEl) {
      try {
        audioEl.loop = true;
        audioEl.playbackRate = rate;
        if (restart) audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
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
    }
  }

  function parseYouTubeId(url) {
    try {
      const u = new URL(url);

      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || '';
      if (u.searchParams.get('v')) return u.searchParams.get('v') || '';

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
    mediaPreview.innerHTML = `<div id="youtubePlayerDiv" style="width:min(360px, 90vw);aspect-ratio:16/9;"></div>`;

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
    youTubeVideoID = '';
    youTubePlayer = null;
    wantPlayback = false;
    stopAllMedia();
    clearMediaPreview();

    if (!url) {
      setAudioStatus('No music loaded');
      return;
    }

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
        mediaPreview.innerHTML = `<div id="youtubePlayerDiv" style="width:min(360px, 90vw);aspect-ratio:16/9;"></div>`;
      }

      setAudioStatus('YOUTUBE VIDEO LOADED');

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
          width="360"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
        </iframe>
      `;

      setAudioStatus('SPOTIFY LOADED');
      return;
    }

    mediaType = 'audio';
    audioEl = document.createElement('audio');
    audioEl.src = url;
    audioEl.loop = true;
    audioEl.preload = 'auto';
    audioEl.controls = true;
    audioEl.style.width = 'min(360px, 90vw)';
    audioEl.addEventListener('ended', () => {
      if (state === 'running') {
        try {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        } catch {}
      }
    });

    mediaPreview.innerHTML = '';
    mediaPreview.appendChild(audioEl);

    setAudioStatus('CUSTOM AUDIO LOADED');

    if (state === 'running') {
      startConfiguredMedia();
    }
  }

  function playHurrySoundThenResumeMedia() {
    clearHurryResumeTimeout();

    if (audioEl) {
      try { audioEl.pause(); } catch {}
    }
    if (youTubePlayer) {
      try {
        if (typeof youTubePlayer.pauseVideo === 'function') youTubePlayer.pauseVideo();
      } catch {}
    }

    const current = currentHurryAudio();

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
      current.pause();
      current.currentTime = 0;
      current.addEventListener('ended', resume, { once: true });

      current.play().then(() => {
        const fallback = Number.isFinite(current.duration) && current.duration > 0
          ? Math.ceil(current.duration * 1000) + 150
          : 3500;
        hurryResumeTimeout = setTimeout(resume, fallback);
      }).catch(() => resume());
    } catch {
      resume();
    }
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
    state = 'running';
    syncUiState();

    const num = numericValue(timerValue);
    if (!hurryPlayed && num !== null && num <= HURRY_AT_NUMERIC && num > 0) {
      triggerHurryIfNeeded();
    } else {
      startConfiguredMedia();
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
    wantPlayback = false;

    stopAllMedia();
    setEditing(false);
    syncUiState();
    render();
  }

  display.addEventListener('click', () => {
    if (state !== 'idle') return;
    setEditing(true);
  });

  spriteDisplay.addEventListener('click', () => {
    if (state !== 'idle') return;
    if (!usesSpriteHud()) return;
    setEditing(true);
    requestAnimationFrame(() => input.focus());
  });

  input.addEventListener('focus', () => {
    if (state !== 'idle') input.blur();
  });

  input.addEventListener('input', () => {
    input.value = normalizeTimerText(input.value);
    if (usesSpriteHud()) {
      renderSpriteString(spriteDisplay, input.value.padStart(3, '0'));
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    input.value = normalizeTimerText(pasted);
    if (usesSpriteHud()) {
      renderSpriteString(spriteDisplay, input.value.padStart(3, '0'));
    }
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
    render();
    setEditing(false);
  });

  startBtn.addEventListener('click', () => {
    if (state === 'running') pause();
    else start();
  });

  resetBtn.addEventListener('click', reset);

  styleSelect.addEventListener('change', () => {
    applyStyle();
  });

  loadAudioBtn.addEventListener('click', () => {
    setMusicFromURL(customAudioInput.value);
    try {
      localStorage.setItem('smb-music-url', customAudioInput.value.trim());
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

  if (genHurryToggleBox) {
    genHurryToggleBox.addEventListener('change', () => {
      try {
        localStorage.setItem('smb-gen-toggle', genHurryToggleBox.checked ? '1' : '0');
      } catch {}
    });
  }

  function initFromDOM() {
    try {
      const savedStyle = localStorage.getItem('smb-style');
      if (savedStyle) styleSelect.value = savedStyle;
    } catch {}

    try {
      const savedToggle = localStorage.getItem('smb-gen-toggle');
      if (genHurryToggleBox) genHurryToggleBox.checked = savedToggle === '1';
    } catch {}

    applyStyle();

    timerValue = padTimerText(input.value || display.textContent || '400');
    startValue = timerValue;

    render();
    setEditing(false);

    state = 'idle';
    syncUiState();

    try {
      const savedMusic = localStorage.getItem('smb-music-url');
      if (savedMusic) {
        customAudioInput.value = savedMusic;
        setMusicFromURL(savedMusic);
      } else {
        setAudioStatus('');
      }
    } catch {
      setAudioStatus('');
    }
  }

  initFromDOM();
})();