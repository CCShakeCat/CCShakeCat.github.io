(() => {
  // ===== DOM =====
  const displayEl     = document.getElementById('display');
  const startStopBtn  = document.getElementById('startStopBtn');
  const resetBtn      = document.getElementById('resetBtn');

  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');

  // Unit toggles / AUTO
  const showAuto    = document.getElementById('showAuto');
  const showHours   = document.getElementById('showHours');
  const showMinutes = document.getElementById('showMinutes');
  const showSeconds = document.getElementById('showSeconds');
  const showTicks   = document.getElementById('showTicks');

  // Speedrunner + TPS
  const speedrunnerMode = document.getElementById('speedrunnerMode');
  const tpsSelect       = document.getElementById('tpsSelect');
  const tpsCustom       = document.getElementById('tpsCustom');

  // Font controls
  const fontSelect        = document.getElementById('fontSelect');
  const importFontBtn     = document.getElementById('importCustomFont');
  const customFontInput   = document.getElementById('customFontFile');
  const customFontName    = document.getElementById('customFontName');
  const customFontNotice  = document.getElementById('customFontNotice');

  // ===== State =====
  let running = false;

  // Time is stored in *ticks*. One tick = 1/TPS second.
  let totalTicks   = 0;   // accumulated ticks (at current tickBase)
  let tickBase     = 40;  // TPS (default 40)
  let rafId        = null;

  // Accurate accumulation while running
  let runStartMs   = 0;   // perf.now() when started
  let ticksAtStart = 0;   // snapshot of totalTicks at start

  // Custom font bookkeeping
  let currentFontFace = null;
  let currentFontURL  = null;

  // OS hint for “System” font option
  try {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) document.body.dataset.os = 'android';
    else if (/iphone|ipad|mac os x|macintosh/.test(ua)) document.body.dataset.os = 'apple';
  } catch {}

  // ===== Helpers =====
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function readTPS() {
    if (!tpsSelect) return tickBase;
    if (tpsSelect.value === 'custom') {
      const v = clamp(parseInt(tpsCustom.value || '40', 10), 10, 100);
      tpsCustom.value = String(v);
      return v;
    }
    return clamp(parseInt(tpsSelect.value, 10), 10, 100);
  }

  // Convert ticks between bases while keeping absolute time
  function convertTicksBase(absTicks, oldBase, newBase) {
    if (oldBase === newBase) return absTicks;
    const sign = absTicks < 0 ? -1 : 1;
    let a = Math.abs(absTicks);
    const sec   = Math.floor(a / oldBase);
    const frac  = a % oldBase; // 0..oldBase-1
    const newA  = sec * newBase + Math.round(frac * newBase / oldBase);
    return sign * newA;
  }

  function applyTPS() {
    const oldBase = tickBase;
    const newBase = readTPS();
    if (newBase === oldBase) return;

    if (running) {
      const nowTicksOld = currentTotalTicks(oldBase);
      totalTicks   = convertTicksBase(nowTicksOld, oldBase, newBase);
      ticksAtStart = totalTicks;
      runStartMs   = performance.now();
    } else {
      // paused: convert displayed ticks directly
      totalTicks = convertTicksBase(totalTicks, oldBase, newBase);
    }
    tickBase = newBase;
    render();
  }

  // Current total ticks, using provided or current base
  function currentTotalTicks(baseOverride = tickBase) {
    if (!running) return totalTicks;
    const elapsedMs   = performance.now() - runStartMs;
    const elapsedTick = Math.floor(elapsedMs * baseOverride / 1000);
    return ticksAtStart + elapsedTick;
  }

  // AUTO UI (disable/enable H/M/S checkboxes when Auto is on)
  function syncAutoUI() {
    const auto = !!showAuto?.checked;
    [showHours, showMinutes, showSeconds].forEach(cb => {
      if (!cb) return;
      cb.disabled = auto;
      const label = cb.closest('label');
      if (label) label.classList.toggle('disabled-checkbox', auto);
    });
    // Ticks stays user-controlled
    if (showTicks) {
      showTicks.disabled = false;
      const tlabel = showTicks.closest('label');
      if (tlabel) tlabel.classList.remove('disabled-checkbox');
    }
  }

  function getDisplayFlagsFromTicks(absTicks) {
    const totalSeconds = Math.floor(absTicks / tickBase);
    if (showAuto?.checked) {
      const showH = totalSeconds >= 3600;        // show hours ≥ 1h
      const showM = showH || totalSeconds >= 60; // show minutes ≥ 1m or if hours shown
      const showS = true;                        // seconds always
      const showT = !!showTicks?.checked;        // ticks stay user-controlled
      return { showH, showM, showS, showT };
    }
    return {
      showH: !!showHours?.checked,
      showM: !!showMinutes?.checked,
      showS: !!showSeconds?.checked,
      showT: !!showTicks?.checked,
    };
  }

  function formatFromTicks(ticks) {
    const sign = ticks < 0 ? '-' : '';
    let abs = Math.abs(ticks);

    const sec      = Math.floor(abs / tickBase);
    const tickPart = abs % tickBase;

    let s = sec;
    const hours   = Math.floor(s / 3600); s -= hours * 3600;
    const minutes = Math.floor(s / 60);   s -= minutes * 60;
    const seconds = s;

    const flags = getDisplayFlagsFromTicks(abs);
    const parts = [];
    if (flags.showH) parts.push(String(hours).padStart(2, '0'));
    if (flags.showM) parts.push(String(minutes).padStart(2, '0'));
    if (flags.showS) parts.push(String(seconds).padStart(2, '0'));

    let out = parts.join(':') || '00';
    if (flags.showT) {
      out += (parts.length ? '.' : '0.') + String(tickPart).padStart(2, '0');
    }
    return sign + out;
  }

  function applySpeedrunnerColor(ticksNow) {
    if (!speedrunnerMode?.checked) { displayEl.style.color = '#fff'; return; }
    if (running)                   { displayEl.style.color = '#00ff77'; return; } // green
    if (ticksNow < 0)              { displayEl.style.color = '#c6c6c6'; return; } // light gray
    if (ticksNow > 0)              { displayEl.style.color = '#00aaff'; return; } // blue
    displayEl.style.color = '#fff';
  }

  // Render as .monochar spans (no jitter)
  function toMonoHTML(text){
    return Array.from(text, ch => {
      const sep = (ch === ':' || ch === '.') ? ' monochar--sep' : '';
      const safe = ch === ' ' ? '&nbsp;' : ch;
      return `<span class="monochar${sep}">${safe}</span>`;
    }).join('');
  }

  function render() {
    const nowTicks = currentTotalTicks();
    const txt = formatFromTicks(nowTicks);
    displayEl.innerHTML = toMonoHTML(txt);
    applySpeedrunnerColor(nowTicks);
  }

  // Smooth UI updates independent of TPS
  function startRAF() {
    if (rafId) return;
    const step = () => { render(); rafId = requestAnimationFrame(step); };
    rafId = requestAnimationFrame(step);
  }
  function stopRAF() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  // ===== Controls =====
  function start() {
    if (running) return;
    runStartMs   = performance.now();
    ticksAtStart = totalTicks;
    running = true;
    startStopBtn.textContent = 'Stop';
    startRAF();
    render();
  }

  function stop() {
    if (!running) return;
    totalTicks = currentTotalTicks();
    running = false;
    startStopBtn.textContent = 'Start';
    stopRAF();
    render();
  }

  function reset() {
    stop();
    totalTicks = 0;
    render();
  }

  // ===== Font logic =====
  function applyFontChoice(mode, familyName = '') {
    if (mode === 'system') {
      const os = document.body.dataset.os;
      if (os === 'android') {
        document.body.style.fontFamily = "Roboto, Arial, sans-serif";
      } else if (os === 'apple') {
        document.body.style.fontFamily = "'San Francisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
      } else {
        document.body.style.fontFamily = "'Segoe UI', Arial, sans-serif";
      }
      return;
    }
    if (mode === 'custom' && familyName) {
      document.body.style.fontFamily = `'${familyName}', sans-serif`;
      return;
    }
    document.body.style.fontFamily = "'FancyCatPX', sans-serif"; // default
  }

  async function loadCustomFontFromFile(file) {
    try {
      if (currentFontFace) { document.fonts.delete(currentFontFace); currentFontFace = null; }
      if (currentFontURL)  { URL.revokeObjectURL(currentFontURL); currentFontURL = null; }
    } catch {}

    const familyName = file.name.replace(/\.(ttf|otf|woff2?|)$/i, '');
    const blob = new Blob([await file.arrayBuffer()]);
    const url  = URL.createObjectURL(blob);

    const face = new FontFace(familyName, `url(${url})`, { style: 'normal', weight: '400', stretch: 'normal' });
    await face.load();
    document.fonts.add(face);

    currentFontFace = face;
    currentFontURL  = url;
    return familyName;
  }

  // ===== Events =====
  startStopBtn?.addEventListener('click', () => (running ? stop() : start()));
  resetBtn?.addEventListener('click', reset);

  // Settings modal
  function openSettings(){ settingsModal?.classList.add('show'); settingsModal?.setAttribute('aria-hidden','false'); }
  function closeSettingsModal(){ settingsModal?.classList.remove('show'); settingsModal?.setAttribute('aria-hidden','true'); }
  settingsBtn?.addEventListener('click', openSettings);
  closeSettings?.addEventListener('click', closeSettingsModal);
  settingsModal?.addEventListener('click', (e)=>{ if (e.target === settingsModal) closeSettingsModal(); });

  // Toggles + speedrunner + AUTO
  [showHours, showMinutes, showSeconds, showTicks, speedrunnerMode, showAuto].forEach(cb => {
    cb?.addEventListener('change', () => {
      if (cb === showAuto) syncAutoUI();
      render();
    });
  });

  // TPS UI
  tpsSelect?.addEventListener('change', () => {
    const custom = tpsSelect.value === 'custom';
    tpsCustom?.classList.toggle('hidden', !custom);
    if (!custom) applyTPS();
  });
  tpsCustom?.addEventListener('input', applyTPS);

  // Font UI
  fontSelect?.addEventListener('change', () => {
    const val = fontSelect.value;
    if (val === 'custom') {
      if (!currentFontFace) { importFontBtn?.click(); return; }
      applyFontChoice('custom', currentFontFace.family);
    } else {
      applyFontChoice(val);
    }
  });

  importFontBtn?.addEventListener('click', () => customFontInput?.click());
  customFontInput?.addEventListener('change', async () => {
    const file = customFontInput.files?.[0];
    if (!file) return;
    try {
      const fam = await loadCustomFontFromFile(file);
      if (customFontName)   customFontName.textContent = `Loaded: ${fam}`;
      if (customFontNotice) customFontNotice.style.display = 'block';
      if (fontSelect)       fontSelect.value = 'custom';
      applyFontChoice('custom', fam);
    } catch (err) {
      if (customFontName)   customFontName.textContent = 'Failed to load font';
      if (customFontNotice) customFontNotice.style.display = 'block';
      console.error(err);
    }
  });

  // ===== Init =====
  // TPS initial
  const custom = tpsSelect?.value === 'custom';
  tpsCustom?.classList.toggle('hidden', !custom);
  tickBase = readTPS();

  // AUTO initial
  syncAutoUI();

  // Fonts initial
  applyFontChoice('default');

  // First paint
  render();
})();