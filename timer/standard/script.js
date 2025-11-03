// ======================= Timer (Standard) - Full Drop-in =======================
(() => {
  const $ = (id) => document.getElementById(id);

  // --------- Core UI ----------
  const timerInput     = $('timerInput');
  const timerDisplay   = $('timerDisplay');
  const startPauseBtn  = $('startPauseBtn');
  const resetBtn       = $('resetBtn');

  // Settings modal & controls
  const settingsBtn    = $('settingsBtn');
  const settingsModal  = $('settingsModal');
  const closeSettings  = $('closeSettings');

  // Show-on-clock
  const showAuto       = $('showAuto');
  const showHours      = $('showHours');
  const showMinutes    = $('showMinutes');
  const showSeconds    = $('showSeconds');
  const showTicks      = $('showTicks');

  // TPS select
  const tpsSelect      = $('tpsSelect');

  // Hurry-up UI (presets + disable flash)
  const hurryUpMain    = $('hurryUpMain');
  const hurryUpSub     = $('hurryUpSub');
  const hurryUpDesc    = $('hurryUpDesc');
  const disableFlashCB = $('disableFlash');

  // Font UI
  const fontSelect       = $('fontSelect');
  const importFontBtn    = $('importCustomFont');
  const customFontInput  = $('customFontFile');
  const customFontName   = $('customFontName');
  const customFontNotice = $('customFontNotice');

  // --------- State ----------
  const LS_KEY = 'stdtimer:v6';

  const st = {
    tickBase: 40,            // TPS
    initialTicks: 9 * 60 * 40 + 59 * 40, // 09:59.00 @40 TPS
    remainingTicks: 0,
    lastMs: 0,
    running: false,

    // display toggles
    auto: false, showH: true, showM: true, showS: true, showT: true,

    // hurry-up & flash
    huKey: 'none',
    huValue: '',
    huPlayed: false,
    disableFlash: false,

    // fonts
    fontMode: 'default',     // default | system | custom
    customFontFamily: '',

    // behavior
    startAtLastTick: true    // show last tick of set time (e.g., 02:00.99 in 100 TPS)
  };

  // --------- Presets (IDs map to files in ./hurryup/<id>.mp3/.ogg) ----------
  const hurryUpPresets = {
    none:   { label: 'None', sub: [{ value: '', label: 'No Hurry Up', desc: 'No hurry up sound will play.' }] },
    ggd:    { label: 'Goose Goose Duck', sub: [
      { value: 'hurryup-ggdsabo_retro',     label: 'Sabotage - Retro',     desc: 'Plays at 1m remaining' },
      { value: 'hurryup-ggdsabo_ship',      label: 'Sabotage - Ship',      desc: 'Plays at 1m remaining (over music)' },
      { value: 'hurryup-ggdsabo_victorian', label: 'Sabotage - Victorian', desc: 'Plays at 1m remaining' },
    ]},
    soniclw:{ label: 'Sonic Lost World', sub: [
      { value: 'hurryup-soniclw', label: 'Sonic Lost World', desc: 'Plays at 1m remaining' },
    ]},
    mario:  { label: 'Mario', sub: [
      { value: 'hurryup-smbnes', label: 'SMB (NES)',   desc: 'At 1m, then music resumes at 1.25x' },
      { value: 'hurryup-smbgen', label: 'SMB (Genesis)', desc: 'At 1m, then music resumes at 1.25x' },
      { value: 'hurryup-smb3',   label: 'SMB3',        desc: 'At 1m, then music resumes at 1.25x' },
      { value: 'hurryup-smw',    label: 'SMW',         desc: 'At 1m, then music resumes at 1.25x' },
      { value: 'hurryup-nsmb',   label: 'NSMB',        desc: 'At 1m, then music resumes at 1.25x' },
      { value: 'hurryup-sm3d',   label: 'SM 3D Land',  desc: 'At 1m, then music resumes at 1.25x' },
    ]},
  };

  // --------- Music hooks (no-ops for now) ----------
  function syncMusic(_cmd) {}
  function setMusicRate(_r) {}

  // --------- Utils ----------
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pad2 = (n) => String(n).padStart(2, '0');

  function convertTicksBase(absTicks, oldBase, newBase) {
    if (oldBase === newBase) return absTicks;
    const sign = absTicks < 0 ? -1 : 1;
    const a = Math.abs(absTicks);
    const sec  = Math.floor(a / oldBase);
    const frac = a % oldBase;
    return sign * (sec * newBase + Math.round(frac * newBase / oldBase));
  }

  function parseTimeToTicks(text, base = st.tickBase) {
    const s = (text || '').trim();
    if (!s) return 0;

    const parts = s.split(':');
    let h = 0, m = 0, sec = 0, tt = 0;

    if (parts.length === 3) { h = parseInt(parts[0],10)||0; m = parseInt(parts[1],10)||0; sec = parts[2]; }
    else if (parts.length === 2) { m = parseInt(parts[0],10)||0; sec = parts[1]; }
    else { sec = parts[0]; }

    if (String(sec).includes('.')) {
      const [ss, ticks] = String(sec).split('.');
      sec = parseInt(ss,10)||0;
      tt  = clamp(parseInt(ticks,10)||0, 0, base-1);
    } else {
      sec = parseInt(sec,10)||0;
      tt = 0;
    }
    return (h*3600 + m*60 + sec) * base + tt;
  }

  // monochar wrap
  const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function mono(text) {
    return String(text).split('').map(ch => {
      const safe = ch === ' ' ? '&nbsp;' : escapeHtml(ch);
      return `<span class="monochar">${safe}</span>`;
    }).join('');
  }

  function formatFromTicks(ticks, base = st.tickBase) {
    const t = Math.max(0, ticks);
    const totalSeconds = Math.floor(t / base);
    const tickPart     = t % base;

    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let showH, showM, showS, showT;
    if (st.auto) {
      showH = totalSeconds >= 3600;
      showM = showH || totalSeconds >= 60;
      showS = true;
      showT = !!st.showT;
    } else {
      showH = !!st.showH; showM = !!st.showM; showS = !!st.showS; showT = !!st.showT;
    }

    const parts = [];
    if (showH) parts.push(pad2(hours));
    if (showM) parts.push(showH ? pad2(minutes) : String(minutes));
    if (showS) parts.push((showH || showM) ? pad2(seconds) : String(seconds));

    let out = parts.join(':');
    if (showT) out += (out ? '.' : '') + pad2(tickPart);
    if (!out) out = `${pad2(minutes)}:${pad2(seconds)}.${pad2(tickPart)}`;
    return out;
  }

  function render() {
    if (!timerDisplay) return;
    const txt = formatFromTicks(st.remainingTicks);
    // Use monochar for consistent spacing across fonts
    timerDisplay.innerHTML = mono(txt);
  }

  // --------- Save / Load ----------
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        tickBase: st.tickBase,
        initial: st.initialTicks,
        auto: st.auto, showH: st.showH, showM: st.showM, showS: st.showS, showT: st.showT,
        huKey: st.huKey, huValue: st.huValue,
        disableFlash: st.disableFlash,
        fontMode: st.fontMode, customFontFamily: st.customFontFamily,
        tpsOption: tpsSelect?.value ?? String(st.tickBase),
      }));
    } catch {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      st.tickBase = clamp(parseInt(d.tickBase||40,10), 10, 100);
      st.initialTicks = clamp(parseInt(d.initial ?? st.initialTicks, 10), 0, Number.MAX_SAFE_INTEGER);

      st.auto = !!d.auto; st.showH = !!d.showH; st.showM = !!d.showM; st.showS = !!d.showS; st.showT = !!d.showT;
      st.huKey = d.huKey || 'none';
      st.huValue = d.huValue || '';
      st.disableFlash = !!d.disableFlash;

      st.fontMode = d.fontMode || 'default';
      st.customFontFamily = d.customFontFamily || '';

      if (tpsSelect && d.tpsOption) tpsSelect.value = String(d.tpsOption);
      if (disableFlashCB) disableFlashCB.checked = st.disableFlash;

      if (showAuto)    showAuto.checked    = st.auto;
      if (showHours)   showHours.checked   = st.showH;
      if (showMinutes) showMinutes.checked = st.showM;
      if (showSeconds) showSeconds.checked = st.showS;
      if (showTicks)   showTicks.checked   = st.showT;
    } catch {}
  }

  // --------- Fonts (IndexedDB) ----------
  const DB_NAME  = 'stdtimer-fonts';
  const DB_STORE = 'fonts';
  const FONT_KEY = 'customFont';

  let currentFontFace = null;
  let currentFontURL  = null;

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const os = tx.objectStore(DB_STORE);
      const rq = os.get(key);
      rq.onsuccess = () => resolve(rq.result ?? null);
      rq.onerror   = () => reject(rq.error);
    });
  }
  async function idbSet(key, val) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const os = tx.objectStore(DB_STORE);
      const rq = os.put(val, key);
      rq.onsuccess = () => resolve(true);
      rq.onerror   = () => reject(rq.error);
    });
  }

  async function restoreCustomFontFromDB() {
    try {
      const rec = await idbGet(FONT_KEY);
      if (!rec || !rec.bytes) return false;

      try {
        if (currentFontFace) { document.fonts.delete(currentFontFace); currentFontFace = null; }
        if (currentFontURL)  { URL.revokeObjectURL(currentFontURL); currentFontURL = null; }
      } catch {}

      const blob = new Blob([rec.bytes], { type: rec.type || 'font/ttf' });
      const url  = URL.createObjectURL(blob);
      const fam  = rec.family || 'CustomFont';

      const face = new FontFace(fam, `url(${url})`, { style: 'normal', weight: '400' });
      await face.load();
      document.fonts.add(face);

      currentFontFace = face;
      currentFontURL  = url;
      st.customFontFamily = fam;
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

  function applyFontChoice(mode, familyName = '') {
    st.fontMode = mode;
    // drive everything through the CSS var so display AND input match
    const root = document.documentElement;
    if (mode === 'system') {
      root.style.setProperty('--ui-font', "'Segoe UI', Roboto, Arial, sans-serif");
    } else if (mode === 'custom' && familyName) {
      root.style.setProperty('--ui-font', `'${familyName}', 'Segoe UI', Roboto, Arial, sans-serif`);
      st.customFontFamily = familyName;
    } else {
      root.style.setProperty('--ui-font', "'FancyCatPX', 'Segoe UI', Roboto, Arial, sans-serif");
      st.customFontFamily = '';
    }
    save();
  }

  window.addEventListener('beforeunload', () => {
    try { if (currentFontURL) URL.revokeObjectURL(currentFontURL); } catch {}
  });

  async function initFonts() {
    // light OS hint for modal system font choice
    try {
      const ua = navigator.userAgent.toLowerCase();
      if (/android/.test(ua)) document.body.dataset.os = 'android';
      else if (/iphone|ipad|mac os x|macintosh/.test(ua)) document.body.dataset.os = 'apple';
    } catch {}

    const hadCustom = await restoreCustomFontFromDB();

    if (fontSelect) {
      if (st.fontMode === 'custom' && !hadCustom) {
        st.fontMode = 'default';
        fontSelect.value = 'default';
      }
      // apply saved (or fallback)
      applyFontChoice(st.fontMode, hadCustom ? st.customFontFamily : st.customFontFamily);

      fontSelect.addEventListener('change', () => {
        const val = fontSelect.value;
        if (val === 'custom') {
          if (!st.customFontFamily) { importFontBtn?.click(); return; }
          applyFontChoice('custom', st.customFontFamily);
        } else {
          applyFontChoice(val);
        }
      });
    }

    importFontBtn?.addEventListener('click', () => customFontInput?.click());
    customFontInput?.addEventListener('change', async () => {
      const file = customFontInput.files?.[0];
      if (!file) return;
      try {
        const familyName = await persistCustomFontFile(file);
        // load the face for this session
        const bytes = await file.arrayBuffer();
        const url   = URL.createObjectURL(new Blob([bytes], { type: file.type || 'font/ttf' }));
        const face  = new FontFace(familyName, `url(${url})`, { style:'normal', weight:'400' });
        await face.load();
        document.fonts.add(face);

        try {
          if (currentFontFace) document.fonts.delete(currentFontFace);
          if (currentFontURL)  URL.revokeObjectURL(currentFontURL);
        } catch {}
        currentFontFace = face;
        currentFontURL  = url;

        st.customFontFamily = familyName;
        if (customFontName)   customFontName.textContent = `Loaded: ${familyName}`;
        if (customFontNotice) customFontNotice.style.display = 'block';
        if (fontSelect)       fontSelect.value = 'custom';
        applyFontChoice('custom', familyName);
      } catch (e) { console.error(e); }
    });
  }

  // --------- Hurry-up UI ----------
  function populateHurryUpFromPresets(initialKey = 'none', initialVal = '') {
    if (!hurryUpMain || !hurryUpSub) return;

    hurryUpMain.innerHTML = '';
    Object.entries(hurryUpPresets).forEach(([key, grp]) => {
      const o = document.createElement('option');
      o.value = key; o.textContent = grp.label;
      hurryUpMain.appendChild(o);
    });

    function fillSubs(key, val) {
      const grp = hurryUpPresets[key] || hurryUpPresets.none;
      hurryUpSub.innerHTML = '';
      grp.sub.forEach(s => {
        const o = document.createElement('option');
        o.value = s.value; o.textContent = s.label;
        hurryUpSub.appendChild(o);
      });
      const chosen = grp.sub.find(s => s.value === val) || grp.sub[0];
      hurryUpSub.value = chosen.value;
      if (hurryUpDesc) hurryUpDesc.textContent = chosen.desc || '';

      st.huKey = key; st.huValue = chosen.value; save();
    }

    const key = (initialKey in hurryUpPresets) ? initialKey : 'none';
    hurryUpMain.value = key;
    fillSubs(key, initialVal);

    hurryUpMain.addEventListener('change', () => fillSubs(hurryUpMain.value, ''));
    hurryUpSub.addEventListener('change', () => {
      const grp = hurryUpPresets[hurryUpMain.value] || hurryUpPresets.none;
      const chosen = grp.sub.find(s => s.value === hurryUpSub.value) || grp.sub[0];
      if (hurryUpDesc) hurryUpDesc.textContent = chosen.desc || '';
      st.huKey = hurryUpMain.value; st.huValue = hurryUpSub.value; save();
    });
  }

  // --------- Hurry-up audio (mp3→ogg fallback) ----------
  function playHurryUpSfx(id) {
    return new Promise((resolve) => {
      if (!id) { resolve(); return; }
      const a = new Audio();
      a.preload = 'auto';

      let triedMp3 = false;
      function playOgg() {
        a.src = `./hurryup/${id}.ogg`;
        const p2 = a.play();
        if (p2?.catch) p2.catch(()=>resolve());
      }
      a.onended = () => resolve();
      a.onerror = () => {
        if (!triedMp3) { triedMp3 = true; playOgg(); }
        else resolve();
      };
      a.src = `./hurryup/${id}.mp3`;
      const p = a.play();
      if (p?.catch) p.catch(()=>resolve());
    });
  }

  async function doHurryUp() {
    const id = st.huValue;
    if (!id) return;

    const isOverlay = (id === 'hurryup-ggdsabo_ship');
    const isMario   = (st.huKey === 'mario');

    if (!isOverlay) { syncMusic('pause'); }
    await playHurryUpSfx(id);
    if (!isOverlay) {
      setMusicRate(isMario ? 1.25 : 1.0);
      syncMusic('play');
    }
  }

  // --------- HARD BLINK FLASH @ 1:00 ---------
  function shouldFlashNow() {
    const threshold = 60 * st.tickBase;
    return !st.disableFlash && st.running && st.remainingTicks <= threshold && st.remainingTicks > 0;
  }
  function updateHurryFlash() {
    document.body.classList.toggle('hurry-flashing', shouldFlashNow());
  }

  // --------- Timer control ---------
  function start() {
    if (st.running || st.remainingTicks <= 0) return;
    st.running = true;
    st.lastMs  = performance.now();
    if (startPauseBtn) startPauseBtn.textContent = 'Pause';
    if (timerInput) timerInput.style.display = 'none';
    updateHurryFlash();
    tick();
    syncMusic('play');
  }

  function pause() {
    if (!st.running) return;
    st.running = false;
    if (startPauseBtn) startPauseBtn.textContent = 'Start';
    updateHurryFlash();
    syncMusic('pause');
  }

  function reset() {
    pause();
    st.remainingTicks = st.initialTicks;
    st.huPlayed = false;
    setMusicRate(1.0);
    updateHurryFlash();
    render();
  }

  function tick() {
    if (!st.running) return;

    const now = performance.now();
    const elapsedMs = now - st.lastMs;
    const decTicks  = Math.floor(elapsedMs * st.tickBase / 1000);

    if (decTicks > 0) {
      const prev = st.remainingTicks;
      st.lastMs += (decTicks * 1000 / st.tickBase);
      st.remainingTicks = Math.max(0, st.remainingTicks - decTicks);

      // trigger hurry-up exactly when crossing <= 1:00.00
      const thresh = 60 * st.tickBase;
      if (!st.huPlayed && prev > thresh && st.remainingTicks <= thresh) {
        st.huPlayed = true;
        doHurryUp();
      }

      if (st.remainingTicks <= 0) {
        st.remainingTicks = 0;
        st.running = false;
        if (startPauseBtn) startPauseBtn.textContent = 'Start';
      }
      render();
    }

    updateHurryFlash();
    if (st.running) requestAnimationFrame(tick);
  }

  // --------- Editing overlay ---------
  function enterEdit() {
    if (st.running) return; // editable only when not running
    if (!timerInput) return;
    timerInput.value = formatFromTicks(st.remainingTicks);
    timerInput.style.display = 'block';
    timerInput.focus();
    timerInput.select();
  }
  function commitEdit() {
    if (!timerInput) return;
    const newTicks = parseTimeToTicks(timerInput.value, st.tickBase);
    if (Number.isFinite(newTicks) && newTicks >= 0) {
      st.initialTicks = newTicks;
      st.remainingTicks = st.startAtLastTick
        ? Math.max(0, newTicks + (st.tickBase - 1))
        : newTicks;
      st.huPlayed = false;
      setMusicRate(1.0);
      save();
      render();
      updateHurryFlash();
    }
    timerInput.style.display = 'none';
  }

  // --------- TPS handling ---------
  function currentSelectTPS() {
    if (!tpsSelect) return st.tickBase;
    return clamp(parseInt(tpsSelect.value || st.tickBase, 10) || st.tickBase, 10, 100);
  }
  function applyTPSChange() {
    const newBase = currentSelectTPS();
    const oldBase = st.tickBase;
    if (newBase === oldBase) return;

    st.initialTicks   = convertTicksBase(st.initialTicks,   oldBase, newBase);
    st.remainingTicks = convertTicksBase(st.remainingTicks, oldBase, newBase);
    st.tickBase = newBase;

    st.lastMs = performance.now();
    render();
    updateHurryFlash();
    save();
  }

  // --------- UI wiring ---------
  startPauseBtn?.addEventListener('click', () => (st.running ? pause() : start()));
  resetBtn?.addEventListener('click', reset);

  timerDisplay?.addEventListener('click', enterEdit);
  timerInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') { timerInput.style.display = 'none'; }
  });
  timerInput?.addEventListener('blur', commitEdit);

  function openModal(el, show){
    if (!el) return;
    if (show) { el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
    else      { el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }
  }
  settingsBtn?.addEventListener('click', () => openModal(settingsModal, true));
  closeSettings?.addEventListener('click', () => openModal(settingsModal, false));
  settingsModal?.addEventListener('click', (e)=>{ if (e.target === settingsModal) openModal(settingsModal, false); });

  // Show-on-clock
  showAuto   ?.addEventListener('change', () => { st.auto = !!showAuto.checked;   syncAutoUI(); save(); render(); });
  showHours  ?.addEventListener('change', () => { st.showH = !!showHours.checked; save(); render(); });
  showMinutes?.addEventListener('change', () => { st.showM = !!showMinutes.checked; save(); render(); });
  showSeconds?.addEventListener('change', () => { st.showS = !!showSeconds.checked; save(); render(); });
  showTicks  ?.addEventListener('change', () => { st.showT = !!showTicks.checked; save(); render(); });

  function syncAutoUI() {
    const auto = !!st.auto;
    [showHours, showMinutes, showSeconds].forEach(cb => {
      if (!cb) return;
      cb.disabled = auto;
      const lbl = cb.closest('label');
      if (lbl) lbl.classList.toggle('disabled-checkbox', auto);
    });
  }

  // Tick rate
  tpsSelect?.addEventListener('change', applyTPSChange);

  // Disable flash checkbox
  disableFlashCB?.addEventListener('change', () => {
    st.disableFlash = !!disableFlashCB.checked;
    save();
    updateHurryFlash();
  });

  // --------- Init ---------
  // First-visit initial from input, then load saved (saved overrides UI)
  if (timerInput && timerInput.value) {
    st.initialTicks = parseTimeToTicks(timerInput.value, st.tickBase);
  }
  load();

  st.remainingTicks = st.startAtLastTick
    ? Math.max(0, st.initialTicks + (st.tickBase - 1))
    : st.initialTicks;

  if (tpsSelect && parseInt(tpsSelect.value||st.tickBase,10) !== st.tickBase) {
    tpsSelect.value = String(st.tickBase);
  }

  initFonts();
  populateHurryUpFromPresets(st.huKey || 'none', st.huValue || '');

  syncAutoUI();
  render();
  updateHurryFlash();
})();