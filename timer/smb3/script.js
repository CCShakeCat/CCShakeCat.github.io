// ===== SMB3 timer — media control (pause for Hurry, then restart at 1.25x) =====
(() => {
  const TICK_MS  = 680;
  const HURRY_AT = 100;

  // ---- DOM
  const body          = document.body;
  const displayEl     = document.getElementById('display');
  const inputEl       = document.getElementById('timerInput');
  const startBtn      = document.getElementById('startStopBtn');
  const resetBtn      = document.getElementById('resetBtn');

  const urlInput      = document.getElementById('customAudioInput');
  const loadBtn       = document.getElementById('loadAudioBtn');
  const audioStatus   = document.getElementById('audioStatus');
  const mediaPreview  = document.getElementById('mediaPreview');

  const styleSelect   = document.getElementById('styleSelect');

  const hurryNES      = document.getElementById('hurryAudioNES');
  const hurrySNES     = document.getElementById('hurryAudioSNES');

  // ---- state
  let running = false;
  let startedSinceReset = false;
  let hurryPlayed = false;
  let timerId = null;

  let value = 400;
  let baseValue = 400;

  let currentMedia = null;     // { kind: 'yt'|'file'|'spotify', id|url }
  let extAudioEl = null;       // <audio> for file media
  let ytId = null;

  // YouTube control
  let ytAPIReady = false;
  let ytPlayer = null;         // YT.Player
  let ytContainer = null;

  const pad3 = n => String(Math.max(0, Math.min(999, n|0))).padStart(3,'0');
  const desiredRate = () => (value <= HURRY_AT ? 1.25 : 1.0);

  const setStatus = (m, ok=true)=>{
    if (!audioStatus) return;
    audioStatus.textContent = m.toUpperCase();
    audioStatus.style.color = ok ? '#b6ffb6' : '#ff6685';
  };
  const styleMode = () => (styleSelect?.value || body.dataset.style || 'smb3');
  const currentHurry = () => (styleMode()==='smb3smas' ? hurrySNES : hurryNES);

  function render(){ displayEl.textContent = pad3(value); }

  function enterEdit(){
    if (running || startedSinceReset) return;
    inputEl.value = pad3(baseValue);
    displayEl.style.display = 'none';
    inputEl.style.display = 'inline-block';
    inputEl.focus(); inputEl.select();
  }
  function exitEdit(commit){
    if (commit){
      const raw = inputEl.value.replace(/[^\d]/g,'').slice(0,3);
      const num = raw==='' ? baseValue : Math.max(0, Math.min(999, parseInt(raw,10)));
      baseValue = num; value = num; render();
    }
    inputEl.style.display = 'none';
    displayEl.style.display = '';
  }

  // ---------- URL → media parsing ----------
  function pickYouTubeId(url){
    try{
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.hostname.includes('youtube.com')){
        const v = u.searchParams.get('v'); if (v) return v;
        const m = u.pathname.match(/\/(shorts|embed)\/([^/?#]+)/i);
        if (m) return m[2];
      }
    }catch{}
    const m = String(url).match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return m ? m[1] : null;
  }
  function parseMedia(url){
    if (!url) return null;
    const s = url.trim();
    const id = pickYouTubeId(s);
    if (id) return { kind:'yt', id };
    if (/open\.spotify\.com\/track\//i.test(s)) return { kind:'spotify', url:s.replace('/track/','/embed/track/') };
    if (/\.(mp3|ogg|wav)(\?|#|$)/i.test(s)) return { kind:'file', url:s };
    return null;
  }

  // ---------- YouTube API loader ----------
  function ensureYTAPI(){
    if (ytAPIReady) return;
    if (window.YT && window.YT.Player){ ytAPIReady = true; return; }
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
    window.onYouTubeIframeAPIReady = () => { ytAPIReady = true; };
  }

  // ---------- preview build / clear ----------
  function clearPreview(){
    if (!mediaPreview) return;
    mediaPreview.innerHTML = '';
    extAudioEl = null;
    ytId = null;
    ytPlayer = null;
    ytContainer = null;
  }
  function showPreview(){
    if (!mediaPreview) return;
    mediaPreview.style.display = (!running && currentMedia) ? '' : 'none';
  }
  function buildPreview(){
    clearPreview();
    if (!currentMedia){ setStatus('INVALID FILE OR URL', false); showPreview(); return; }

    if (currentMedia.kind === 'yt'){
      ytId = currentMedia.id;
      ensureYTAPI();
      ytContainer = document.createElement('div');
      ytContainer.id = 'yt-player-'+Math.random().toString(36).slice(2);
      mediaPreview.appendChild(ytContainer);

      const tryMake = () => {
        if (!ytAPIReady || !window.YT){ setTimeout(tryMake, 60); return; }
        ytPlayer = new YT.Player(ytContainer.id, {
          width: 360, height: 203,
          videoId: ytId,
          playerVars: { rel:0, modestbranding:1, controls:1, origin: location.origin },
          events:{ onReady: ()=> setStatus('YOUTUBE VIDEO LOADED', true) }
        });
      };
      tryMake();

    } else if (currentMedia.kind === 'spotify'){
      const iframe = document.createElement('iframe');
      iframe.width = '300'; iframe.height = '80';
      iframe.src = currentMedia.url;
      iframe.allow = 'encrypted-media; autoplay';
      iframe.style.border = '0';
      mediaPreview.appendChild(iframe);
      setStatus('SPOTIFY TRACK LOADED', true);

    } else if (currentMedia.kind === 'file'){
      extAudioEl = document.createElement('audio');
      extAudioEl.controls = true;
      extAudioEl.preload = 'metadata';
      extAudioEl.src = currentMedia.url;
      mediaPreview.appendChild(extAudioEl);
      setStatus('AUDIO LOADED', true);
    } else {
      setStatus('INVALID FILE OR URL', false);
    }
    showPreview();
  }
  function loadMediaFromURL(){
    const url = urlInput?.value.trim();
    currentMedia = parseMedia(url);
    buildPreview();
  }

  // ---------- playback-rate helpers ----------
  function ytPickRate(target){
    try{
      const rates = ytPlayer?.getAvailablePlaybackRates?.() || [];
      if (!rates.length) return 1.0;
      // choose the closest supported to target (preferring higher)
      let best = rates[0], bestDiff = Math.abs(best - target);
      for (const r of rates){
        const d = Math.abs(r - target);
        if (d < bestDiff || (d === bestDiff && r > best)){ best = r; bestDiff = d; }
      }
      return best;
    }catch{ return 1.0; }
  }

  function setBgRate(rate){
    if (!currentMedia) return;
    if (currentMedia.kind === 'file' && extAudioEl){
      extAudioEl.playbackRate = rate;
    } else if (currentMedia.kind === 'yt' && ytPlayer){
      const r = ytPickRate(rate);
      try{ ytPlayer.setPlaybackRate(r); }catch{}
    }
    // spotify: cannot change rate
  }

  function restartBackgroundAtRate(rate){
    if (!currentMedia) return;
    if (currentMedia.kind === 'file' && extAudioEl){
      try{
        extAudioEl.pause();
        extAudioEl.currentTime = 0;
        extAudioEl.playbackRate = rate;
        extAudioEl.play().catch(()=>{});
      }catch{}
    } else if (currentMedia.kind === 'yt' && ytPlayer){
      try{
        const r = ytPickRate(rate);
        ytPlayer.setPlaybackRate(r);
        ytPlayer.seekTo(0, true);
        ytPlayer.playVideo();
      }catch{}
    } // spotify: no rate; just resume
  }

  // ---------- play / pause ----------
  function playBackground(){
    if (!currentMedia) return;
    const rate = desiredRate();
    setBgRate(rate);

    if (currentMedia.kind === 'file' && extAudioEl){
      try{ extAudioEl.play().catch(()=>{});}catch{}
    } else if (currentMedia.kind === 'yt' && ytPlayer && ytPlayer.playVideo){
      try{ ytPlayer.playVideo(); }catch{}
    }
  }
  function pauseBackground(){
    if (!currentMedia) return;
    if (currentMedia.kind === 'file' && extAudioEl){
      try{ extAudioEl.pause(); }catch{}
    } else if (currentMedia.kind === 'yt' && ytPlayer && ytPlayer.pauseVideo){
      try{ ytPlayer.pauseVideo(); }catch{}
    }
  }

  // Pause bg, play hurry; after SFX ends, RESTART music at 1.25x
  function playHurryThenResume(){
    const sfx = currentHurry();
    if (!sfx) return;
    pauseBackground();
    try{ sfx.currentTime = 0; sfx.play().catch(()=>{});}catch{}
    const onEnd = ()=>{
      sfx.removeEventListener('ended', onEnd);
      if (running && value>0){
        // restart from the top at 1.25x
        restartBackgroundAtRate(1.25);
      }
    };
    sfx.addEventListener('ended', onEnd);
  }

  // ---------- timer ----------
  function setRunning(on){
    running = on;
    body.classList.toggle('running', on);
    startBtn.textContent = on ? 'STOP' : 'START';
    showPreview();
  }
  function start(){
    if (running) return;
    startedSinceReset = true;
    if (inputEl.style.display!=='none') exitEdit(true);

    setRunning(true);
    hurryPlayed = value <= HURRY_AT;

    // play bg at appropriate rate (1.25x if starting at <=100)
    playBackground();

    clearInterval(timerId);
    timerId = setInterval(()=>{
      value = Math.max(0, value-1);
      render();

      if (!hurryPlayed && value <= HURRY_AT){
        hurryPlayed = true;
        playHurryThenResume(); // will restart bg at 1.25x when SFX ends
      }

      if (value===0) stop();
    }, TICK_MS);
  }
  function stop(){
    if (!running) return;
    clearInterval(timerId);
    timerId = null;
    pauseBackground();
    setBgRate(1.0); // normalize after stop
    setRunning(false);
  }
  function reset(){
    stop();
    value = baseValue;
    hurryPlayed = false;
    startedSinceReset = false;
    setBgRate(1.0);
    render();
    showPreview();
  }

  // ---------- wire-up ----------
  render();
  displayEl.addEventListener('click', enterEdit);
  inputEl.addEventListener('keydown', e=>{
    if (e.key==='Enter'){ e.preventDefault(); exitEdit(true); }
    if (e.key==='Escape'){ e.preventDefault(); exitEdit(false); }
  });
  inputEl.addEventListener('blur', ()=>{
    if (!running && !startedSinceReset) exitEdit(true);
  });

  startBtn.addEventListener('click', ()=> (running ? stop() : start()));
  resetBtn.addEventListener('click', reset);
  loadBtn?.addEventListener('click', loadMediaFromURL);

  styleSelect?.addEventListener('change', ()=>{
    body.dataset.style = styleSelect.value;
  });

  showPreview();
})();
