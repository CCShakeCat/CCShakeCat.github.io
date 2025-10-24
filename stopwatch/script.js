// ==== Stopwatch (single-boot, de-duped) ======================================
(() => {
  if (window.__STOPWATCH_BOOTED__) return;
  window.__STOPWATCH_BOOTED__ = true;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  // Core UI
  const displayEl     = $('display');
  const startStopBtn  = $('startStopBtn');
  const resetBtn      = $('resetBtn');

  // Settings modal + controls (optional but supported)
  const settingsBtn   = $('settingsBtn');
  const settingsModal = $('settingsModal');
  const closeSettings = $('closeSettings');

  // Unit toggles / AUTO
  const showAuto    = $('showAuto');
  const showHours   = $('showHours');
  const showMinutes = $('showMinutes');
  const showSeconds = $('showSeconds');
  const showTicks   = $('showTicks');

  // Speedrunner + TPS
  const speedrunnerMode = $('speedrunnerMode');
  const tpsSelect       = $('tpsSelect');
  const tpsCustom       = $('tpsCustom');

  // Font controls
  const fontSelect       = $('fontSelect');
  const importFontBtn    = $('importCustomFont');
  const customFontInput  = $('customFontFile');
  const customFontName   = $('customFontName');
  const customFontNotice = $('customFontNotice');

  // Keybinds UI (optional, if present in your HTML)
  const openKeybinds        = $('openKeybinds');
  const keybindsModal       = $('keybindsModal');
  const closeKeybinds       = $('closeKeybinds');
  const rebindStartStop     = $('rebindStartStop');
  const rebindReset         = $('rebindReset');
  const bindStartStopLabel  = $('bindStartStopLabel');
  const bindResetLabel      = $('bindResetLabel');
  const kbResetDefaults     = $('kbResetDefaults');
  const kbCountdown         = $('kbCountdown');

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

  // simple OS hint for "System" font option
  try {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) document.body.dataset.os = 'android';
    else if (/iphone|ipad|mac os x|macintosh/.test(ua)) document.body.dataset.os = 'apple';
  } catch {}

  // ---------- Persistence (settings) ----------
  const LS_KEY       = 'stopwatch:v1';
  const LS_BINDS     = 'stopwatch:keybinds:v1';

  const defaultBinds = {
    startStop: { key: 'Enter',  shift: false, ctrl: false, alt: false, meta: false },
    reset:     { key: 'Delete', shift: true,  ctrl: false, alt: false, meta: false }
  };
  let binds = loadLS(LS_BINDS, defaultBinds);

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
      tpsMode:   tpsSelect?.value || '40', // '40'.. or 'custom'
      tpsCustom: tpsCustom?.value || '',

      // font choice (bytes are in IndexedDB)
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

      if (fontSelect) fontSelect.value = 'custom';
      if (customFontName)   customFontName.textContent = `Loaded: ${fam}`;
      if (customFontNotice) customFontNotice.style.display = 'block';

      applyFontChoice('custom', fam);
      return true;
    } catch {
      return false;
    }
  }

  async function persistCustomFontFile(file) {
    const bytes  = await file.arrayBuffer();
    const family = file.name.replace(/\.(ttf|otf|woff2?|)$/i, '');
    await idbSet(FONT_KEY, { bytes, family, type: file.type || 'font/ttf' });
    return family;
  }

  window.addEventListener('beforeunload', () => {
    try { if (currentFontURL) URL.revokeObjectURL(currentFontURL); } catch {}
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
    return clamp(parseInt(tpsSelect.value, 10) || 40, 10, 100);
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
    // ticks is always user-controllable
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
    if (ticksNow < 0)              { displayEl.style.color = '#777777'; return; } // light gray
    if (ticksNow > 0)              { displayEl.style.color = '#00aaff'; return; } // blue
    displayEl.style.color = '#fff';
  }

  function monoHTML(text) {
    return Array.from(text, ch => {
      const sep  = (ch === ':' || ch === '.') ? ' monochar--sep' : '';
      const safe = ch === ' ' ? '&nbsp;' : ch;
      return `<span class="monochar${sep}">${safe}</span>`;
    }).join('');
  }

  function render() {
    const nowTicks = currentTotalTicks();
    displayEl.innerHTML = monoHTML(formatFromTicks(nowTicks));
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
    // default
    document.body.style.fontFamily = "'FancyCatPX', sans-serif";
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

  // ---------- Keybinds (modifiers + base key) ----------
  const PURE_MODS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

  function normalizeKey(k) {
    if (!k) return '';
    if (k === 'Esc') return 'Escape';
    if (k === 'Del') return 'Delete';
    if (k === 'Spacebar') return ' ';
    return k.length === 1 ? k.toUpperCase() : k;
  }
  function keyLabel(k) {
    if (k === ' ') return 'Space';
    if (k === 'Enter') return 'Return';
    return k;
  }
  function describeBind(b) {
    const mods = [];
    if (b.ctrl)  mods.push('Ctrl');
    if (b.alt)   mods.push('Alt');
    if (b.shift) mods.push('Shift');
    if (b.meta)  mods.push('Meta');
    const base = keyLabel(b.key);
    return (mods.length ? mods.join('+') + '+' : '') + base;
  }
  function isPureModifierKey(k) {
    return PURE_MODS.has(k);
  }

  /** Convert a keydown event into a bind object.
   *  IMPORTANT: returns null for pure-modifier presses (so we wait for the real base key). */
  function eventToBind(e) {
    const raw = e.key;
    if (isPureModifierKey(raw)) return null; // wait for Delete/K/etc
    return {
      key:   normalizeKey(raw),
      shift: !!e.shiftKey,
      ctrl:  !!e.ctrlKey,
      alt:   !!e.altKey,
      meta:  !!e.metaKey
    };
  }

  /** Does the current keydown match a stored binding? */
  function matchKey(e, bind) {
    if (!bind) return false;
    const base = normalizeKey(e.key);
    if (isPureModifierKey(base)) return false; // never trigger on mods alone
    return base === bind.key &&
           !!e.shiftKey === !!bind.shift &&
           !!e.ctrlKey  === !!bind.ctrl &&
           !!e.altKey   === !!bind.alt &&
           !!e.metaKey  === !!bind.meta;
  }

  function saveLS(key, obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch{} }
  function loadLS(key, fallback){ try{ const raw = localStorage.getItem(key); return raw? JSON.parse(raw) : fallback; }catch{ return fallback; } }

  function updateBindLabels() {
    if (bindStartStopLabel) bindStartStopLabel.textContent = describeBind(binds.startStop);
    if (bindResetLabel)     bindResetLabel.textContent     = describeBind(binds.reset);
  }

  /** Rebind flow with 3.0s countdown; only accepts non-modifier base key. */
  function startRebind(which, btnEl, labelEl) {
    if (!btnEl) return;
    btnEl.classList.add('waiting');
    if (labelEl) labelEl.textContent = 'Press keys…';
    if (kbCountdown) kbCountdown.textContent = '3.0';

    const t0 = performance.now();

    function onKey(e) {
      e.preventDefault();
      const kb = eventToBind(e);
      if (!kb) return; // ignore pure-modifier presses until base arrives
      binds[which] = kb;
      saveLS(LS_BINDS, binds);
      cleanup(true);
    }
    function onEsc(e) {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(false); }
    }
    function onTick(){
      const left = Math.max(0, 3000 - (performance.now() - t0));
      if (kbCountdown) kbCountdown.textContent = (left/1000).toFixed(1);
      if (left <= 0) { cleanup(false); return; }
      raf = requestAnimationFrame(onTick);
    }
    function cleanup(){
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keydown', onEsc, true);
      cancelAnimationFrame(raf);
      btnEl.classList.remove('waiting');
      if (kbCountdown) kbCountdown.textContent = '';
      updateBindLabels();
    }

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onEsc, true);
    let raf = requestAnimationFrame(onTick);
  }

  // ---------- Events ----------
  startStopBtn?.addEventListener('click', () => (running ? stop() : start()));
  resetBtn?.addEventListener('click', reset);

  // Settings modal
  function openModal(el, show){
    if (!el) return;
    if (show) { el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
    else      { el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }
  }
  settingsBtn?.addEventListener('click', () => openModal(settingsModal, true));
  closeSettings?.addEventListener('click', () => openModal(settingsModal, false));
  settingsModal?.addEventListener('click', (e)=>{ if (e.target === settingsModal) openModal(settingsModal, false); });

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

  // Keybinds modal
  openKeybinds?.addEventListener('click', () => openModal(keybindsModal, true));
  closeKeybinds?.addEventListener('click', () => openModal(keybindsModal, false));
  keybindsModal?.addEventListener('click', (e)=>{ if (e.target === keybindsModal) openModal(keybindsModal, false); });

  rebindStartStop?.addEventListener('click', () => startRebind('startStop', rebindStartStop, bindStartStopLabel));
  rebindReset?.addEventListener('click', () => startRebind('reset', rebindReset, bindResetLabel));
  kbResetDefaults?.addEventListener('click', () => {
    binds = JSON.parse(JSON.stringify(defaultBinds));
    saveLS(LS_BINDS, binds);
    updateBindLabels();
  });

  // Global key handler (tab-focused)
  document.addEventListener('keydown', (e) => {
    // Ignore typing in inputs/selects or when any modal is open
    const target = e.target;
    const isFormEl = target && (
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
    );
    const modalOpen = settingsModal?.classList.contains('show') || keybindsModal?.classList.contains('show');
    if (isFormEl || modalOpen) return;

    if (matchKey(e, binds.startStop)) {
      e.preventDefault();
      running ? stop() : start();
    } else if (matchKey(e, binds.reset)) {
      e.preventDefault();
      reset();
    }
  }, { capture: true });

  // ---------- Init ----------
  (async function init(){
    loadSettings();

    // Show/hide custom TPS field based on saved mode
    const custom = tpsSelect?.value === 'custom';
    tpsCustom?.classList.toggle('hidden', !custom);

    // Restore custom font (if present) *before* applying selection
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

    updateBindLabels();
    render(); // initial paint
  })();
// --- HOLD TO RESET KEYBINDS (3.0s, mobile-friendly) ---
(() => {
  if (!kbResetDefaults) return;

  const HOLD_MS = 3000;
  let raf = 0;
  let downAt = 0;
  let completed = false;
  let origText = kbResetDefaults.textContent;

  function startHold(e){
    e.preventDefault();
    completed = false;
    origText = kbResetDefaults.textContent;
    downAt = performance.now();

    // capture pointer so we still get 'up' even if finger/mouse leaves
    if (e.pointerId != null && kbResetDefaults.setPointerCapture) {
      try { kbResetDefaults.setPointerCapture(e.pointerId); } catch {}
    }

    const tick = () => {
      const elapsed = performance.now() - downAt;
      const left = Math.max(0, HOLD_MS - elapsed);
      kbResetDefaults.textContent =
        `HOLD FOR ${(left/1000).toFixed(1)} MORE SECONDS TO RESET KEYBINDS`;
      if (left <= 0) { complete(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function cancelHold(){
    if (completed) return; // already reset
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    kbResetDefaults.textContent = origText;
  }

  function complete(){
    completed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;

    // Perform the reset
    binds = JSON.parse(JSON.stringify(defaultBinds));
    saveLS(LS_BINDS, binds);
    updateBindLabels();

    kbResetDefaults.textContent = 'Keybinds reset!';
    setTimeout(() => { kbResetDefaults.textContent = origText; }, 1200);
  }

  if ('onpointerdown' in window){
    kbResetDefaults.addEventListener('pointerdown', startHold);
    kbResetDefaults.addEventListener('pointerup', cancelHold);
    kbResetDefaults.addEventListener('pointercancel', cancelHold);
    kbResetDefaults.addEventListener('pointerleave', cancelHold);
  } else {
    // Fallback: mouse + touch
    kbResetDefaults.addEventListener('mousedown', startHold);
    kbResetDefaults.addEventListener('mouseup', cancelHold);
    kbResetDefaults.addEventListener('mouseleave', cancelHold);
    kbResetDefaults.addEventListener('touchstart', (e)=>{ e.preventDefault(); startHold(e); }, {passive:false});
    kbResetDefaults.addEventListener('touchend', cancelHold);
    kbResetDefaults.addEventListener('touchcancel', cancelHold);
  }
})();
})();
