// stopwatch script with IndexedDB-persisted custom font
(async () => {
  // ---------- DOM ----------
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

  // ---------- State ----------
  let running = false;

  // time stored in ticks; one tick = 1/TPS second
  let totalTicks   = 0;
  let tickBase     = 40;  // default TPS
  let rafId        = null;

  let runStartMs   = 0;
  let ticksAtStart = 0;

  // custom font bookkeeping
  let currentFontFace = null;
  let currentFontURL  = null;

  // simple OS hint for "System" option
  try {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) document.body.dataset.os = 'android';
    else if (/iphone|ipad|mac os x|macintosh/.test(ua)) document.body.dataset.os = 'apple';
  } catch {}

  // ---------- Persistence (settings) ----------
  const LS_KEY = 'stopwatch:v1';

  function saveSettings() {
    const data = {
      // UI
      showAuto:        !!showAuto?.checked,
      showHours:       !!showHours?.checked,
      showMinutes:     !!showMinutes?.checked,
      showSeconds:     !!showSeconds?.checked,
      showTicks:       !!showTicks?.checked,
      speedrunnerMode: !!speedrunnerMode?.checked,

      // TPS
      tpsMode:   tpsSelect?.value || '40', // '40' or 'custom'
      tpsCustom: tpsCustom?.value || '',

      // font choice (the actual bytes are in IndexedDB)
      fontMode:       fontSelect?.value || 'default',
      customFontName: customFontName?.textContent?.replace(/^Loaded:\s*/, '') || '',
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      if (showAuto)    showAuto.checked    = !!data.showAuto;
      if (showHours)   showHours.checked   = !!data.showHours;
      if (showMinutes) showMinutes.checked = !!data.showMinutes;
      if (showSeconds) showSeconds.checked = !!data.showSeconds;
      if (showTicks)   showTicks.checked   = !!data.showTicks;

      if (speedrunnerMode) speedrunnerMode.checked = !!data.speedrunnerMode;

      if (tpsSelect && data.tpsMode) {
        tpsSelect.value = data.tpsMode;
        const custom = tpsSelect.value === 'custom';
        tpsCustom?.classList.toggle('hidden', !custom);
        if (custom && data.tpsCustom) tpsCustom.value = data.tpsCustom;
      }

      if (fontSelect && data.fontMode) {
        fontSelect.value = data.fontMode;
        if (data.fontMode === 'custom' && data.customFontName) {
          if (customFontName)   customFontName.textContent = `Loaded: ${data.customFontName}`;
          if (customFontNotice) customFontNotice.style.display = 'block';
        }
      }
    } catch {}
  }

  // ---------- IndexedDB (persist custom font file) ----------
  const DB_NAME   = 'stopwatch-fonts';
  const DB_STORE  = 'fonts';
  const FONT_KEY  = 'customFont';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(DB_STORE, 'readonly');
      const os  = tx.objectStore(DB_STORE);
      const req = os.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  }
  async function idbSet(key, val) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(DB_STORE, 'readwrite');
      const os  = tx.objectStore(DB_STORE);
      const req = os.put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror   = () => reject(req.error);
    });
  }

  // Load persisted custom font (if any) before first render
  async function restoreCustomFontFromDB() {
    try {
      const rec = await idbGet(FONT_KEY);
      if (!rec || !rec.bytes) return false;

      // clean old
      try {
        if (currentFontFace) { document.fonts.delete(currentFontFace); currentFontFace = null; }
        if (currentFontURL)  { URL.revokeObjectURL(currentFontURL); currentFontURL = null; }
      } catch {}

      const blob = new Blob([rec.bytes], { type: rec.type || 'font/ttf' });
      const url  = URL.createObjectURL(blob);
      const fam  = rec.family || 'CustomFont';

      const face = new FontFace(fam, `url(${url})`, { style: 'normal', weight: '400', stretch: 'normal' });
      await face.load();
      document.fonts.add(face);

      currentFontFace = face;
      currentFontURL  = url;

      // set UI to custom so it actually uses it
      if (fontSelect) fontSelect.value = 'custom';
      if (customFontName)   customFontName.textContent = `Loaded: ${fam}`;
      if (customFontNotice) customFontNotice.style.display = 'block';

      applyFontChoice('custom', fam);
      return true;
    } catch {
      return false;
    }
  }

  // Save chosen font file into DB
  async function persistCustomFontFile(file) {
    const bytes = await file.arrayBuffer();
    const family = file.name.replace(/\.(ttf|otf|woff2?|)$/i, '');
    await idbSet(FONT_KEY, { bytes, family, type: file.type || 'font/ttf' });
    return family;
  }

  // On tab close, revoke object URL
  window.addEventListener('beforeunload', () => {
    try {
      if (currentFontURL) URL.revokeObjectURL(currentFontURL);
    } catch {}
  });

  // ---------- Helpers ----------
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

  function convertTicksBase(absTicks, oldBase, newBase) {
    if (oldBase === newBase) return absTicks;
    const sign = absTicks < 0 ? -1 : 1;
    let a = Math.abs(absTicks);
    const sec   = Math.floor(a / oldBase);
    const frac  = a % oldBase;
    const newA  = sec * newBase + Math.round(frac * newBase / oldBase);
    return sign * newA;
  }

  function applyTPS({ fromUser = false } = {}) {
    const oldBase = tickBase;
    const newBase = readTPS();
    if (newBase === oldBase) { if (fromUser) saveSettings(); return; }

    if (running) {
      const nowOld = currentTotalTicks(oldBase);
      totalTicks   = convertTicksBase(nowOld, oldBase, newBase);
      ticksAtStart = totalTicks;
      runStartMs   = performance.now();
    } else {
      totalTicks = convertTicksBase(totalTicks, oldBase, newBase);
    }
    tickBase = newBase;
    render();
    if (fromUser) saveSettings();
  }

  function currentTotalTicks(baseOverride = tickBase) {
    if (!running) return totalTicks;
    const elapsedMs   = performance.now() - runStartMs;
    const elapsedTick = Math.floor(elapsedMs * baseOverride / 1000);
    return ticksAtStart + elapsedTick;
  }

  function syncAutoUI() {
    const auto = !!showAuto?.checked;
    [showHours, showMinutes, showSeconds].forEach(cb => {
      if (!cb) return;
      cb.disabled = auto;
      const label = cb.closest('label');
      if (label) label.classList.toggle('disabled-checkbox', auto);
    });
    // ticks remains user-controlled
    if (showTicks) {
      showTicks.disabled = false;
      const tlabel = showTicks.closest('label');
      if (tlabel) tlabel.classList.remove('disabled-checkbox');
    }
  }

  function getDisplayFlagsFromTicks(absTicks) {
    const totalSeconds = Math.floor(absTicks / tickBase);
    if (showAuto?.checked) {
      const showH = totalSeconds >= 3600;
      const showM = showH || totalSeconds >= 60;
      const showS = true;
      const showT = !!showTicks?.checked;
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

  function toMonoHTML(text) {
    return Array.from(text, ch => {
      const sep  = (ch === ':' || ch === '.') ? ' monochar--sep' : '';
      const safe = ch === ' ' ? '&nbsp;' : ch;
      return `<span class="monochar${sep}">${safe}</span>`;
    }).join('');
  }

  function render() {
    const nowTicks = currentTotalTicks();
    displayEl.innerHTML = toMonoHTML(formatFromTicks(nowTicks));
    applySpeedrunnerColor(nowTicks);
  }

  function startRAF() {
    if (rafId) return;
    const step = () => { render(); rafId = requestAnimationFrame(step); };
    rafId = requestAnimationFrame(step);
  }
  function stopRAF() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  // ---------- Controls ----------
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

  // ---------- Font logic ----------
  function applyFontChoice(mode, familyName = '') {
    if (mode === 'system') {
      const os = document.body.dataset.os;
      if (os === 'android')      document.body.style.fontFamily = "Roboto, Arial, sans-serif";
      else if (os === 'apple')   document.body.style.fontFamily = "'San Francisco','Helvetica Neue',Helvetica,Arial,sans-serif";
      else                       document.body.style.fontFamily = "'Segoe UI', Arial, sans-serif";
      return;
    }
    if (mode === 'custom' && familyName) {
      document.body.style.fontFamily = `'${familyName}', sans-serif`;
      return;
    }
    document.body.style.fontFamily = "'FancyCatPX', sans-serif"; // default
  }

  async function loadCustomFontFromFile(file) {
    // purge current
    try {
      if (currentFontFace) { document.fonts.delete(currentFontFace); currentFontFace = null; }
      if (currentFontURL)  { URL.revokeObjectURL(currentFontURL); currentFontURL = null; }
    } catch {}

    // persist file bytes in DB, then load face
    const familyName = await persistCustomFontFile(file);

    const bytes = await file.arrayBuffer();
    const url   = URL.createObjectURL(new Blob([bytes], { type: file.type || 'font/ttf' }));
    const face  = new FontFace(familyName, `url(${url})`, { style:'normal', weight:'400', stretch:'normal' });
    await face.load();
    document.fonts.add(face);

    currentFontFace = face;
    currentFontURL  = url;

    if (customFontName)   customFontName.textContent = `Loaded: ${familyName}`;
    if (customFontNotice) customFontNotice.style.display = 'block';
    if (fontSelect)       fontSelect.value = 'custom';
    applyFontChoice('custom', familyName);
    saveSettings();

    return familyName;
  }

  // ---------- Events ----------
  startStopBtn?.addEventListener('click', () => (running ? stop() : start()));
  resetBtn?.addEventListener('click', reset);

  // Settings modal
  function openSettings(){ settingsModal?.classList.add('show'); settingsModal?.setAttribute('aria-hidden','false'); }
  function closeSettingsModal(){ settingsModal?.classList.remove('show'); settingsModal?.setAttribute('aria-hidden','true'); }
  settingsBtn?.addEventListener('click', openSettings);
  closeSettings?.addEventListener('click', closeSettingsModal);
  settingsModal?.addEventListener('click', (e)=>{ if (e.target === settingsModal) closeSettingsModal(); });

  // Toggles (save + render)
  [showHours, showMinutes, showSeconds, showTicks, speedrunnerMode, showAuto].forEach(cb => {
    cb?.addEventListener('change', () => {
      if (cb === showAuto) syncAutoUI();
      saveSettings();
      render();
    });
  });

  // TPS
  tpsSelect?.addEventListener('change', () => {
    const custom = tpsSelect.value === 'custom';
    tpsCustom?.classList.toggle('hidden', !custom);
    applyTPS({ fromUser: true });
  });
  tpsCustom?.addEventListener('input', () => applyTPS({ fromUser: true }));

  // Font UI
  fontSelect?.addEventListener('change', () => {
    const val = fontSelect.value;
    if (val === 'custom') {
      if (!currentFontFace) { importFontBtn?.click(); return; }
      applyFontChoice('custom', currentFontFace.family);
    } else {
      applyFontChoice(val);
    }
    saveSettings();
  });

  importFontBtn?.addEventListener('click', () => customFontInput?.click());
  customFontInput?.addEventListener('change', async () => {
    const file = customFontInput.files?.[0];
    if (!file) return;
    try { await loadCustomFontFromFile(file); } catch (err) { console.error(err); }
  });

  // ---------- Init ----------
  loadSettings();

  // show/hide custom input based on saved TPS mode
  const custom = tpsSelect?.value === 'custom';
  tpsCustom?.classList.toggle('hidden', !custom);

  // restore custom font (if one is saved); must happen before we choose family
  const restored = await restoreCustomFontFromDB();

  // TPS & AUTO & font apply
  tickBase = readTPS();
  syncAutoUI();
  if (fontSelect) {
    if (fontSelect.value === 'custom' && restored && currentFontFace) {
      applyFontChoice('custom', currentFontFace.family);
    } else {
      applyFontChoice(fontSelect.value || 'default');
    }
  } else {
    applyFontChoice('default');
  }

  render();
})();