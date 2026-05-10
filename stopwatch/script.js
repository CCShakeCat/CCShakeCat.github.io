// ==== Stopwatch (single-boot) ===========================================
(() => {
  if (window.__STOPWATCH_BOOTED__) return;
  window.__STOPWATCH_BOOTED__ = true;

  window.GSGlobal?.init?.('.');
  document.documentElement.style.setProperty('--clock-font-stack', window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif");

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  const displayEl    = $('display');
  const startStopBtn = $('startStopBtn');
  const resetBtn     = $('resetBtn');
  const prefixWrap   = $('prefixWrap');
  const prefixText   = $('prefixText');
  const prefixIcon   = $('prefixIcon');
  const clockRow     = document.querySelector('.clock-row');

  const settingsBtn   = $('settingsBtn');
  const settingsModal = $('settingsModal');
  const closeSettings = $('closeSettings');
  const modalCard     = $('modalCard');

  const pages = {
    main: $('page-main'),
    style: $('page-style'),
    colors: $('page-colors'),
    speedrunner: $('page-speedrunner'),
    speedrunnerColors: $('page-speedrunner-colors')
  };
  const openStyle = $('openStyle');
  const openColors = $('openColors');
  const openSpeedrunner = $('openSpeedrunner');
  const openSpeedrunnerColours = $('openSpeedrunnerColours');
  const backFromStyle = $('backFromStyle');
  const backFromColors = $('backFromColors');
  const backFromSpeedrunner = $('backFromSpeedrunner');
  const backFromSpeedrunnerColours = $('backFromSpeedrunnerColours');

  const showAuto    = $('showAuto');
  const showHours   = $('showHours');
  const showMinutes = $('showMinutes');
  const showSeconds = $('showSeconds');
  const showTicks   = $('showTicks');

  const speedrunnerMode = $('speedrunnerMode');

  const tpsSelect = $('tpsSelect');
  const tpsCustom = $('tpsCustom');
  const prefixSelect = $('prefixSelect');
  const sizePrev = $('sizePrev');
  const sizeNext = $('sizeNext');
  const sizeLabel = $('sizeLabel');

  const colourTarget = $('colourTarget');
  const colourSettings = pages.colors?.querySelector?.('.colour-settings') || null;
  const colourModeRGB = $('colourModeRGB');
  const colourModeHSV = $('colourModeHSV');
  const colourValue = $('colourValue');
  const colourPreview = $('colourPreview');
  const rgbEditor = $('rgbEditor');
  const hsvEditor = $('hsvEditor');
  const rgbRRange = $('rgbRRange');
  const rgbGRange = $('rgbGRange');
  const rgbBRange = $('rgbBRange');
  const rgbRInput = $('rgbRInput');
  const rgbGInput = $('rgbGInput');
  const rgbBInput = $('rgbBInput');
  const hsvHRange = $('hsvHRange');
  const hsvSRange = $('hsvSRange');
  const hsvVRange = $('hsvVRange');
  const hsvHInput = $('hsvHInput');
  const hsvSInput = $('hsvSInput');
  const hsvVInput = $('hsvVInput');
  const resetColours = $('resetColours');
  const clearPersonalBest = $('clearPersonalBest');

  const speedColourSettings = pages.speedrunnerColors?.querySelector?.('.colour-settings') || null;
  const speedColourInputs = Array.from(document.querySelectorAll('[data-speed-colour]'));
  const speedColourPreviews = Array.from(document.querySelectorAll('[data-speed-preview]'));
  const speedColourRows = Array.from(document.querySelectorAll('[data-speed-row]'));
  const speedColourModeRGB = $('speedColourModeRGB');
  const speedColourModeHSV = $('speedColourModeHSV');
  const speedRgbEditor = $('speedRgbEditor');
  const speedHsvEditor = $('speedHsvEditor');
  const speedRgbRRange = $('speedRgbRRange');
  const speedRgbGRange = $('speedRgbGRange');
  const speedRgbBRange = $('speedRgbBRange');
  const speedRgbRInput = $('speedRgbRInput');
  const speedRgbGInput = $('speedRgbGInput');
  const speedRgbBInput = $('speedRgbBInput');
  const speedHsvHRange = $('speedHsvHRange');
  const speedHsvSRange = $('speedHsvSRange');
  const speedHsvVRange = $('speedHsvVRange');
  const speedHsvHInput = $('speedHsvHInput');
  const speedHsvSInput = $('speedHsvSInput');
  const speedHsvVInput = $('speedHsvVInput');
  const resetSpeedColours = $('resetSpeedColours');

  const fontSelect       = $('fontSelect');
  const importCustomFont = $('importCustomFont');
  const customFontFile   = $('customFontFile');
  const customFontName   = $('customFontName');
  const customFontNotice = $('customFontNotice');

  const openKeybinds  = $('openKeybinds');
  const keybindsModal = $('keybindsModal');
  const closeKeybinds = $('closeKeybinds');

  const rebindStartStop    = $('rebindStartStop');
  const rebindReset        = $('rebindReset');
  const rebindClearPb      = $('rebindClearPb');
  const bindStartStopLabel = $('bindStartStopLabel');
  const bindResetLabel     = $('bindResetLabel');
  const bindClearPbLabel   = $('bindClearPbLabel');

  const kbResetDefaults = $('kbResetDefaults');
  const kbCountdown     = $('kbCountdown');

  // ---------- OS hint (for per-vendor system fonts) ----------
  const platformInfo = window.GSGlobal?.detectPlatform?.() || { platform: 'windows', vendor: 'windows' };
  document.body.dataset.os = platformInfo.platform;
  window.GSGlobal?.applyPlatformDataset?.();

  function getSystemFontStack() {
    return window.GSGlobal?.getSystemFontStack?.() || "system-ui, Arial, sans-serif";
  }

  function getUIFontStack() {
    return window.GSGlobal?.getUIFontStack?.() || getSystemFontStack();
  }

  // ---------- Menu font rule ----------
  // Settings/Keybinds menus must ALWAYS be "System", regardless of selected clock font.
  const kbCard = keybindsModal?.querySelector?.('.modal-content') || null;

  function enforceMenuSystemFonts() {
    const stack = getUIFontStack();
    if (modalCard) {
      modalCard.classList.add('system-font');
      modalCard.style.fontFamily = stack;
    }
    if (kbCard) {
      kbCard.classList.add('system-font');
      kbCard.style.fontFamily = stack;
    }
  }

  // ---------- NEW: Center all menu options (JS-only, no CSS needed) ----------
  function centerAllMenuOptions() {
    const centerCard = (card) => {
      if (!card) return;
      card.style.textAlign = 'center';
      card.style.alignItems = 'center';

      // Center common rows/blocks while keeping them usable
      const blocks = card.querySelectorAll(
        '.setting-row, .show-hide-row, .show-clock, .kb-row, .kb-footer, .kb-rows, .settings-header'
      );
      blocks.forEach((el) => {
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.style.textAlign = 'center';
      });

      // Labels and inputs in rows should sit centered, not left-justified
      const rowFlex = card.querySelectorAll('.setting-row, .show-hide-row, .kb-row');
      rowFlex.forEach((row) => {
        row.style.flexWrap = 'wrap';
        row.style.gap = row.style.gap || '12px';
      });
    };

    centerCard(modalCard);
    centerCard(kbCard);
  }

  // ---------- Modal drag offsets ----------
  let modalX = 0;
  let modalY = 0;

  function recenterSettingsModal() {
    modalX = 0;
    modalY = 0;
    document.documentElement.style.setProperty('--modal-x', '0px');
    document.documentElement.style.setProperty('--modal-y', '0px');
    saveSettings?.();
  }

  // ---------- Stopwatch state ----------
  let running   = false;
  let startMs   = 0;
  let elapsedMs = 0;

  let tickBase = 40;
  const SIZE_VW = { 1:3.5, 2:5, 3:8, 4:14, 5:22 };
  let clockSize = 3;
  let prefixMode = 'default';
  const DEFAULT_COLOURS = {
    normal: '#ffffff',
    zero: '#ababab',
    paused: '#7a7a7a',
    running: '#52cc73',
    pb: '#14a5ff'
  };
  let colours = { ...DEFAULT_COLOURS };
  let colourEditorMode = 'rgb';
  let speedColourEditorMode = 'rgb';
  let activeSpeedColourTarget = 'zero';

  // Personal best
  const LS_PB = 'stopwatch:pbMs:v1';
  let pbMs = (() => {
    try {
      const v = localStorage.getItem(LS_PB);
      return v == null ? null : parseInt(v, 10);
    } catch {
      return null;
    }
  })();

  function savePB() {
    try {
      if (pbMs == null) localStorage.removeItem(LS_PB);
      else localStorage.setItem(LS_PB, String(pbMs));
    } catch {}
  }

  // ---------- Settings persistence ----------
  const LS_KEY = 'stopwatch:v2';

  function saveSettings() {
    const data = {
      modalX,
      modalY,

      showAuto:        !!showAuto?.checked,
      showHours:       !!showHours?.checked,
      showMinutes:     !!showMinutes?.checked,
      showSeconds:     !!showSeconds?.checked,
      showTicks:       !!showTicks?.checked,
      speedrunnerMode: !!speedrunnerMode?.checked,
      clockSize,
      prefixMode,

      tpsMode:   tpsSelect?.value || '40',
      tpsCustom: tpsCustom?.value || '',

      fontMode: fontSelect?.value || 'default', // affects CLOCK only
      customFontLabel: customFontName?.textContent || '',

      colours: { ...colours },
      colourEditorMode,
      speedColourEditorMode
    };

    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        const globalMode = window.GSGlobal?.getClockFontMode?.() || localStorage.getItem('gs.clockFontMode') || '';
        if (fontSelect && globalMode) fontSelect.value = globalMode;
        return;
      }

      const data = JSON.parse(raw);

      modalX = Number.isFinite(data.modalX) ? data.modalX : 0;
      modalY = Number.isFinite(data.modalY) ? data.modalY : 0;
      document.documentElement.style.setProperty('--modal-x', `${modalX}px`);
      document.documentElement.style.setProperty('--modal-y', `${modalY}px`);

      if (showAuto)    showAuto.checked    = !!data.showAuto;
      if (showHours)   showHours.checked   = !!data.showHours;
      if (showMinutes) showMinutes.checked = !!data.showMinutes;
      if (showSeconds) showSeconds.checked = !!data.showSeconds;
      if (showTicks)   showTicks.checked   = !!data.showTicks;

      if (speedrunnerMode) speedrunnerMode.checked = !!data.speedrunnerMode;
      clockSize = Math.min(5, Math.max(1, parseInt(data.clockSize || '3', 10) || 3));
      prefixMode = data.prefixMode || 'default';
      if (sizeLabel) sizeLabel.textContent = String(clockSize);
      if (prefixSelect) prefixSelect.value = prefixMode;

      if (tpsSelect && data.tpsMode) {
        tpsSelect.value = data.tpsMode;
        const custom = tpsSelect.value === 'custom';
        tpsCustom?.classList.toggle('hidden', !custom);
        if (custom && data.tpsCustom) tpsCustom.value = data.tpsCustom;
      }

      if (fontSelect && data.fontMode) {
        fontSelect.value = data.fontMode;
      }

      if (data.colours && typeof data.colours === 'object') {
        colours = { ...DEFAULT_COLOURS };
        Object.keys(DEFAULT_COLOURS).forEach((key) => {
          const parsed = parseCssColor(data.colours[key]);
          if (parsed) colours[key] = parsed;
        });
        if (data.colours.idle && !data.colours.zero) {
          const parsed = parseCssColor(data.colours.idle);
          if (parsed) colours.zero = parsed;
        }
        if (data.colours.stopped && !data.colours.paused) {
          const parsed = parseCssColor(data.colours.stopped);
          if (parsed) colours.paused = parsed;
        }
      }
      colourEditorMode = data.colourEditorMode === 'hsv' ? 'hsv' : 'rgb';
      speedColourEditorMode = data.speedColourEditorMode === 'hsv' ? 'hsv' : 'rgb';

      if (customFontName && typeof data.customFontLabel === 'string' && data.customFontLabel.trim()) {
        customFontName.textContent = data.customFontLabel;
        if (customFontNotice) customFontNotice.style.display = 'block';
      }
    } catch {}
  }

  // ---------- Custom font loader (FontFace + IndexedDB) ----------
  const DB_NAME = 'clockstuffs-fonts';
  const STORE   = 'fonts';
  const DB_KEY  = 'stopwatch-custom-font';

  let customFontFamily = '';
  let customFontFace   = null;
  let customFontURL    = null;

  function cleanupCustomFontRuntime() {
    try { if (customFontFace) document.fonts.delete(customFontFace); } catch {}
    try { if (customFontURL) URL.revokeObjectURL(customFontURL); } catch {}
    customFontFace = null;
    customFontURL  = null;
    customFontFamily = '';
  }

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const os = tx.objectStore(STORE);
      const req = os.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbSet(key, val) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const os = tx.objectStore(STORE);
      const req = os.put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror   = () => reject(req.error);
    });
  }

  async function loadCustomFontFromDB() {
    try {
      const rec = await idbGet(DB_KEY);
      if (!rec || !rec.bytes) return false;

      cleanupCustomFontRuntime();

      const blob = new Blob([rec.bytes], { type: rec.type || 'font/ttf' });
      const url  = URL.createObjectURL(blob);
      const fam  = rec.family || 'CustomFont';

      const face = new FontFace(fam, `url(${url})`, { style: 'normal', weight: '400' });
      await face.load();
      document.fonts.add(face);

      customFontFamily = fam;
      customFontFace   = face;
      customFontURL    = url;

      if (customFontName) customFontName.textContent = `Loaded: ${fam}`;
      if (customFontNotice) customFontNotice.style.display = 'block';

      return true;
    } catch {
      return false;
    }
  }

  async function installCustomFontFromFile(file) {
    cleanupCustomFontRuntime();

    const bytes = await file.arrayBuffer();
    const fam   = file.name.replace(/\.(ttf|otf|woff2?|)$/i, '') || 'CustomFont';

    await idbSet(DB_KEY, { bytes, family: fam, type: file.type || 'font/ttf' });

    const blob = new Blob([bytes], { type: file.type || 'font/ttf' });
    const url  = URL.createObjectURL(blob);

    const face = new FontFace(fam, `url(${url})`, { style: 'normal', weight: '400' });
    await face.load();
    document.fonts.add(face);

    customFontFamily = fam;
    customFontFace   = face;
    customFontURL    = url;

    if (customFontName) customFontName.textContent = `Loaded: ${fam}`;
    if (customFontNotice) customFontNotice.style.display = 'block';
  }

  window.addEventListener('beforeunload', cleanupCustomFontRuntime);

  // ---------- FIX #A: Monochar (and any other built-in font option) ----------
  // If your <select> has an option like value="Monochar", we now apply it properly.
  // Special values:
  //   default -> FancyCatPX
  //   system  -> OS system stack
  //   custom  -> imported FontFace family
  //   anything else -> treat as a font-family name
  function applyClockFontMode(mode) {
    const val = String(mode || 'default');
    window.GSGlobal?.restoreBitmapText?.(displayEl);
    document.documentElement.dataset.clockFontMode = val === 'bitmap' ? 'bitmap' : '';
    const setClockStack = stack => {
      const resolved = stack || window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif";
      document.documentElement.style.setProperty('--clock-font-stack', resolved);
      document.body.style.fontFamily = resolved;
    };

    if (val === 'bitmap') {
      const stack = window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif";
      setClockStack(stack);
      window.GSGlobal?.renderBitmapText?.(displayEl, { force: true });
      return;
    }

    if (val === 'system') {
      setClockStack(getSystemFontStack());
      return;
    }

    if (val === 'custom') {
      if (customFontFamily) {
        setClockStack(`'${customFontFamily}', ${getSystemFontStack()}`);
      } else {
        const globalCustom = window.GSGlobal?.getClockFontStack?.('custom') || window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif";
        setClockStack(globalCustom);
      }
      return;
    }

    if (val === 'default') {
      setClockStack(window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif");
      return;
    }

    // NEW: handle named fonts like Monochar
    // If your CSS has @font-face { font-family: 'Monochar'; ... } this will now work.
    setClockStack(`'${val}', sans-serif`);
  }

  // ---------- Time formatting ----------
  function readTPS() {
    if (!tpsSelect) return 40;

    if (tpsSelect.value === 'custom') {
      const v = Math.min(100, Math.max(10, parseInt(tpsCustom.value || '40', 10)));
      tpsCustom.value = String(v);
      return v;
    }

    return Math.min(100, Math.max(10, parseInt(tpsSelect.value, 10) || 40));
  }

  function nowElapsedMs() {
    if (!running) return elapsedMs;
    return elapsedMs + (performance.now() - startMs);
  }

  function showSettingsPage(name) {
    Object.entries(pages).forEach(([key, page]) => page?.classList.toggle('active', key === name));
  }

  function applyClockSize() {
    clockSize = Math.min(5, Math.max(1, parseInt(clockSize, 10) || 3));
    document.documentElement.style.setProperty('--clock-vw', `${SIZE_VW[clockSize] || SIZE_VW[3]}vw`);
    clockRow?.classList.toggle('stacked', clockSize >= 4);
    if (sizeLabel) sizeLabel.textContent = String(clockSize);
  }

  function applyPrefixMode() {
    prefixMode = prefixSelect?.value || prefixMode || 'default';
    if (prefixWrap) prefixWrap.style.display = prefixMode === 'default' ? 'none' : 'flex';
    if (prefixText) prefixText.style.display = prefixMode === 'time' ? 'block' : 'none';
    if (prefixIcon) prefixIcon.style.display = prefixMode === 'icon' ? 'block' : 'none';
  }

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function componentToHex(value) {
    return Math.round(clampNumber(value, 0, 255)).toString(16).padStart(2, '0');
  }

  function rgbToHex(r, g, b) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
  }

  function hexToRgb(hex) {
    const match = String(hex || '').trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return null;
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16)
    };
  }

  function parseCssColor(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const direct = hexToRgb(raw);
    if (direct) return rgbToHex(direct.r, direct.g, direct.b);

    const probe = document.createElement('span');
    probe.style.color = '';
    probe.style.color = raw;
    if (!probe.style.color) return null;

    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();

    const match = computed.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!match) return null;
    return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;

    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    return {
      h: Math.round(h),
      s: max === 0 ? 0 : Math.round((delta / max) * 100),
      v: Math.round(max * 100)
    };
  }

  function hsvToRgb(h, s, v) {
    h = ((clampNumber(h, 0, 360) % 360) + 360) % 360;
    s = clampNumber(s, 0, 100) / 100;
    v = clampNumber(v, 0, 100) / 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function getColourTarget() {
    return colourTarget?.value || 'normal';
  }

  function getClockColour(key = getColourTarget()) {
    const parsed = parseCssColor(colours[key]) || DEFAULT_COLOURS[key] || DEFAULT_COLOURS.normal;
    if (key === 'normal') {
      return parseCssColor(resolveThemeClockColor(parsed)) || parsed;
    }
    return parsed;
  }

  function setColourEditorMode(mode, persist = true) {
    colourEditorMode = mode === 'hsv' ? 'hsv' : 'rgb';
    colourModeRGB?.classList.toggle('active', colourEditorMode === 'rgb');
    colourModeHSV?.classList.toggle('active', colourEditorMode === 'hsv');
    rgbEditor?.classList.toggle('active', colourEditorMode === 'rgb');
    hsvEditor?.classList.toggle('active', colourEditorMode === 'hsv');
    if (persist) saveSettings();
  }

  function setSpeedColourEditorMode(mode, persist = true) {
    speedColourEditorMode = mode === 'hsv' ? 'hsv' : 'rgb';
    speedColourModeRGB?.classList.toggle('active', speedColourEditorMode === 'rgb');
    speedColourModeHSV?.classList.toggle('active', speedColourEditorMode === 'hsv');
    speedRgbEditor?.classList.toggle('active', speedColourEditorMode === 'rgb');
    speedHsvEditor?.classList.toggle('active', speedColourEditorMode === 'hsv');
    if (persist) saveSettings();
  }

  function setInputPair(rangeEl, numberEl, value) {
    if (rangeEl) rangeEl.value = String(value);
    if (numberEl) numberEl.value = String(value);
  }

  function syncColourEditorUI() {
    const hex = getClockColour();
    const rgb = hexToRgb(hex) || { r: 255, g: 255, b: 255 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    if (colourValue) colourValue.value = hex;
    if (colourPreview) colourPreview.style.background = hex;

    setInputPair(rgbRRange, rgbRInput, rgb.r);
    setInputPair(rgbGRange, rgbGInput, rgb.g);
    setInputPair(rgbBRange, rgbBInput, rgb.b);
    setInputPair(hsvHRange, hsvHInput, hsv.h);
    setInputPair(hsvSRange, hsvSInput, hsv.s);
    setInputPair(hsvVRange, hsvVInput, hsv.v);
    setColourEditorMode(colourEditorMode, false);
  }

  function getSpeedColourTarget() {
    return activeSpeedColourTarget || 'zero';
  }

  function setActiveSpeedColourTarget(key) {
    activeSpeedColourTarget = DEFAULT_COLOURS[key] ? key : 'zero';
    speedColourRows.forEach(row => row.classList.toggle('active', row.dataset.speedRow === activeSpeedColourTarget));
    syncSpeedColourEditorUI();
  }

  function syncSpeedColourEditorUI() {
    const hex = getClockColour(getSpeedColourTarget());
    const rgb = hexToRgb(hex) || { r: 171, g: 171, b: 171 };
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    speedColourInputs.forEach(input => {
      const key = input.dataset.speedColour;
      input.value = getClockColour(key);
    });
    speedColourPreviews.forEach(preview => {
      const key = preview.dataset.speedPreview;
      preview.style.background = getClockColour(key);
    });
    speedColourRows.forEach(row => row.classList.toggle('active', row.dataset.speedRow === activeSpeedColourTarget));

    setInputPair(speedRgbRRange, speedRgbRInput, rgb.r);
    setInputPair(speedRgbGRange, speedRgbGInput, rgb.g);
    setInputPair(speedRgbBRange, speedRgbBInput, rgb.b);
    setInputPair(speedHsvHRange, speedHsvHInput, hsv.h);
    setInputPair(speedHsvSRange, speedHsvSInput, hsv.s);
    setInputPair(speedHsvVRange, speedHsvVInput, hsv.v);
    setSpeedColourEditorMode(speedColourEditorMode, false);
  }

  function commitColour(value) {
    const parsed = parseCssColor(value);
    if (!parsed) {
      syncColourEditorUI();
      return;
    }

    colours[getColourTarget()] = parsed;
    syncColourEditorUI();
    saveSettings();
    render();
  }

  function commitRGBFromInputs() {
    commitColour(rgbToHex(
      clampNumber(rgbRInput?.value ?? rgbRRange?.value, 0, 255),
      clampNumber(rgbGInput?.value ?? rgbGRange?.value, 0, 255),
      clampNumber(rgbBInput?.value ?? rgbBRange?.value, 0, 255)
    ));
  }

  function commitHSVFromInputs() {
    const rgb = hsvToRgb(
      clampNumber(hsvHInput?.value ?? hsvHRange?.value, 0, 360),
      clampNumber(hsvSInput?.value ?? hsvSRange?.value, 0, 100),
      clampNumber(hsvVInput?.value ?? hsvVRange?.value, 0, 100)
    );
    commitColour(rgbToHex(rgb.r, rgb.g, rgb.b));
  }

  function commitSpeedColour(value) {
    const parsed = parseCssColor(value);
    if (!parsed) {
      syncSpeedColourEditorUI();
      return;
    }

    colours[getSpeedColourTarget()] = parsed;
    syncSpeedColourEditorUI();
    saveSettings();
    render();
  }

  function commitSpeedColourForKey(key, value) {
    const parsed = parseCssColor(value);
    if (!parsed) {
      syncSpeedColourEditorUI();
      return;
    }

    colours[key] = parsed;
    activeSpeedColourTarget = key;
    syncSpeedColourEditorUI();
    saveSettings();
    render();
  }

  function commitSpeedRGBFromInputs() {
    commitSpeedColour(rgbToHex(
      clampNumber(speedRgbRInput?.value ?? speedRgbRRange?.value, 0, 255),
      clampNumber(speedRgbGInput?.value ?? speedRgbGRange?.value, 0, 255),
      clampNumber(speedRgbBInput?.value ?? speedRgbBRange?.value, 0, 255)
    ));
  }

  function commitSpeedHSVFromInputs() {
    const rgb = hsvToRgb(
      clampNumber(speedHsvHInput?.value ?? speedHsvHRange?.value, 0, 360),
      clampNumber(speedHsvSInput?.value ?? speedHsvSRange?.value, 0, 100),
      clampNumber(speedHsvVInput?.value ?? speedHsvVRange?.value, 0, 100)
    );
    commitSpeedColour(rgbToHex(rgb.r, rgb.g, rgb.b));
  }

  function setDisplayColor(color) {
    displayEl?.style.setProperty('color', resolveThemeClockColor(color), 'important');
  }

  function resolveThemeClockColor(color) {
    const normalized = String(color || '').trim().toLowerCase();
    if (!normalized || normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') {
      const rootStyles = getComputedStyle(document.documentElement);
      return rootStyles.getPropertyValue('--page-text').trim() || getComputedStyle(document.body).color || '#ffffff';
    }
    return color;
  }

  function formatTime(ms) {
    const base = tickBase;
    const totalTicks = Math.floor(ms * base / 1000);

    const sec      = Math.floor(totalTicks / base);
    const tickPart = totalTicks % base;

    const auto = !!showAuto?.checked;

    const showH = auto ? (sec >= 3600) : !!showHours?.checked;
    const showM = auto ? (sec >= 60 || sec >= 3600) : !!showMinutes?.checked;
    const showS = auto ? true : !!showSeconds?.checked;
    const showT = !!showTicks?.checked;

    const visibleUnits = [
      { show: showH, unit: 3600 },
      { show: showM, unit: 60 },
      { show: showS, unit: 1 }
    ].filter(part => part.show);

    const parts = [];
    let remainingSeconds = sec;
    visibleUnits.forEach((part, index) => {
      const value = Math.floor(remainingSeconds / part.unit);
      remainingSeconds -= value * part.unit;
      parts.push(part.unit === 3600 ? String(value).padStart(2, '0') : (index === 0 ? String(value) : String(value).padStart(2, '0')));
    });

    let out = parts.join(':') || '00';
    if (showT) out += '.' + String(tickPart).padStart(2, '0');
    return out;
  }

  function applySpeedrunnerColor(msNow) {
    if (!speedrunnerMode?.checked) {
      setDisplayColor(getClockColour('normal'));
      return;
    }

    if (running) {
      setDisplayColor(getClockColour('running'));
      return;
    }

    if (pbMs != null && msNow > 0 && Math.floor(msNow) === pbMs) {
      setDisplayColor(getClockColour('pb'));
      return;
    }

    if (msNow > 0) {
      setDisplayColor(getClockColour('paused'));
      return;
    }

    setDisplayColor(getClockColour('zero'));
  }

  // ---------- Render loop ----------
  let raf = 0;

  function renderStackedTime(text) {
    const value = String(text || '00');
    const [main, ticks] = value.split('.');
    const parts = main.split(':').filter(Boolean);
    const line = (textValue, className = '') => `<div class="clock-line ${className}">${textValue}</div>`;

    if (clockSize >= 5) {
      const lines = parts.length ? parts : [main];
      if (ticks != null) lines.push(`.${ticks}`);
      return lines.map((part, index) => line(part, index < 2 ? 'clock-line-xl' : 'clock-line-small')).join('');
    }

    if (clockSize >= 4) {
      if (parts.length > 1) {
        const top = parts.slice(0, -1).join(':');
        const bottom = parts.slice(-1)[0] + (ticks != null ? `.${ticks}` : '');
        return line(top, 'clock-line-large') + line(bottom, 'clock-line-small');
      }
      if (ticks != null) return line(main, 'clock-line-large') + line(`.${ticks}`, 'clock-line-small');
    }

    return value;
  }

  function render() {
    const msNow = nowElapsedMs();
    applyPrefixMode();
    displayEl.innerHTML = renderStackedTime(formatTime(msNow));
    applySpeedrunnerColor(msNow);
    if (fontSelect?.value === 'bitmap') window.GSGlobal?.renderBitmapText?.(displayEl, { force: true });
  }

  function startRAF() {
    if (raf) return;
    const step = () => {
      render();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function stopRAF() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // ---------- Stopwatch controls ----------
  function start() {
    if (running) return;
    running = true;
    startMs = performance.now();
    tickBase = readTPS();
    startStopBtn.textContent = 'Stop';
    startRAF();
    render();
  }

  function stop() {
    if (!running) return;
    elapsedMs = nowElapsedMs();
    running = false;
    startStopBtn.textContent = 'Start';
    stopRAF();

    if (elapsedMs > 0 && (pbMs == null || elapsedMs < pbMs)) {
      pbMs = Math.floor(elapsedMs);
      savePB();
    }

    render();
  }

  function reset() {
    stop();
    elapsedMs = 0;
    render();
  }

  function clearPB() {
    pbMs = null;
    savePB();
    render();
  }

  // ---------- Modal open/close ----------
  function openModal(el, show) {
    if (!el) return;

    if (show) {
      el.classList.add('show');
      el.setAttribute('aria-hidden', 'false');

      // Opening settings always recenters (Timer behavior)
      if (el === settingsModal) recenterSettingsModal();
    } else {
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    }

    // Keep menus system-font no matter what + center them
    enforceMenuSystemFonts();
    centerAllMenuOptions();
  }

  // ---------- Events ----------
  startStopBtn?.addEventListener('click', () => (running ? stop() : start()));
  resetBtn?.addEventListener('click', reset);

  // Settings button = TOGGLE
  settingsBtn?.addEventListener('click', () => {
    const isOpen = settingsModal?.classList.contains('show');
    if (!isOpen) showSettingsPage('main');
    openModal(settingsModal, !isOpen);
  });

  // Close X just closes; reopening will recenter (handled in openModal)
  closeSettings?.addEventListener('click', () => openModal(settingsModal, false));

  openKeybinds?.addEventListener('click', () => openModal(keybindsModal, true));
  closeKeybinds?.addEventListener('click', () => openModal(keybindsModal, false));

  openStyle?.addEventListener('click', () => showSettingsPage('style'));
  backFromStyle?.addEventListener('click', () => showSettingsPage('main'));
  openSpeedrunner?.addEventListener('click', () => showSettingsPage('speedrunner'));
  backFromSpeedrunner?.addEventListener('click', () => showSettingsPage('style'));
  openSpeedrunnerColours?.addEventListener('click', () => {
    syncSpeedColourEditorUI();
    showSettingsPage('speedrunnerColors');
  });
  backFromSpeedrunnerColours?.addEventListener('click', () => showSettingsPage('speedrunner'));
  openColors?.addEventListener('click', () => {
    syncColourEditorUI();
    showSettingsPage('colors');
  });
  backFromColors?.addEventListener('click', () => showSettingsPage('main'));

  [showAuto, showHours, showMinutes, showSeconds, showTicks, speedrunnerMode].forEach(el => {
    el?.addEventListener('change', () => { saveSettings(); render(); });
  });

  colourTarget?.addEventListener('change', syncColourEditorUI);
  colourModeRGB?.addEventListener('click', () => setColourEditorMode('rgb'));
  colourModeHSV?.addEventListener('click', () => setColourEditorMode('hsv'));
  colourValue?.addEventListener('change', () => commitColour(colourValue.value));
  colourPreview?.addEventListener('click', () => colourSettings?.classList.toggle('sliders-open'));

  [
    [rgbRRange, rgbRInput],
    [rgbGRange, rgbGInput],
    [rgbBRange, rgbBInput]
  ].forEach(([rangeEl, inputEl]) => {
    rangeEl?.addEventListener('input', () => {
      if (inputEl) inputEl.value = rangeEl.value;
      commitRGBFromInputs();
    });
    inputEl?.addEventListener('input', () => {
      if (rangeEl) rangeEl.value = inputEl.value;
      commitRGBFromInputs();
    });
  });

  [
    [hsvHRange, hsvHInput],
    [hsvSRange, hsvSInput],
    [hsvVRange, hsvVInput]
  ].forEach(([rangeEl, inputEl]) => {
    rangeEl?.addEventListener('input', () => {
      if (inputEl) inputEl.value = rangeEl.value;
      commitHSVFromInputs();
    });
    inputEl?.addEventListener('input', () => {
      if (rangeEl) rangeEl.value = inputEl.value;
      commitHSVFromInputs();
    });
  });

  resetColours?.addEventListener('click', () => {
    colours.normal = DEFAULT_COLOURS.normal;
    syncColourEditorUI();
    saveSettings();
    render();
  });

  clearPersonalBest?.addEventListener('click', clearPB);
  speedColourModeRGB?.addEventListener('click', () => setSpeedColourEditorMode('rgb'));
  speedColourModeHSV?.addEventListener('click', () => setSpeedColourEditorMode('hsv'));
  speedColourInputs.forEach(input => {
    input.addEventListener('focus', () => setActiveSpeedColourTarget(input.dataset.speedColour));
    input.addEventListener('change', () => commitSpeedColourForKey(input.dataset.speedColour, input.value));
  });
  speedColourPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
      setActiveSpeedColourTarget(preview.dataset.speedPreview);
      speedColourSettings?.classList.add('sliders-open');
    });
  });

  [
    [speedRgbRRange, speedRgbRInput],
    [speedRgbGRange, speedRgbGInput],
    [speedRgbBRange, speedRgbBInput]
  ].forEach(([rangeEl, inputEl]) => {
    rangeEl?.addEventListener('input', () => {
      if (inputEl) inputEl.value = rangeEl.value;
      commitSpeedRGBFromInputs();
    });
    inputEl?.addEventListener('input', () => {
      if (rangeEl) rangeEl.value = inputEl.value;
      commitSpeedRGBFromInputs();
    });
  });

  [
    [speedHsvHRange, speedHsvHInput],
    [speedHsvSRange, speedHsvSInput],
    [speedHsvVRange, speedHsvVInput]
  ].forEach(([rangeEl, inputEl]) => {
    rangeEl?.addEventListener('input', () => {
      if (inputEl) inputEl.value = rangeEl.value;
      commitSpeedHSVFromInputs();
    });
    inputEl?.addEventListener('input', () => {
      if (rangeEl) rangeEl.value = inputEl.value;
      commitSpeedHSVFromInputs();
    });
  });

  resetSpeedColours?.addEventListener('click', () => {
    ['zero', 'paused', 'running', 'pb'].forEach(key => { colours[key] = DEFAULT_COLOURS[key]; });
    syncSpeedColourEditorUI();
    saveSettings();
    render();
  });

  sizePrev?.addEventListener('click', () => {
    clockSize = Math.max(1, clockSize - 1);
    applyClockSize();
    saveSettings();
    render();
  });

  sizeNext?.addEventListener('click', () => {
    clockSize = Math.min(5, clockSize + 1);
    applyClockSize();
    saveSettings();
    render();
  });

  prefixSelect?.addEventListener('change', () => {
    prefixMode = prefixSelect.value;
    saveSettings();
    render();
  });

  tpsSelect?.addEventListener('change', () => {
    const custom = tpsSelect.value === 'custom';
    tpsCustom?.classList.toggle('hidden', !custom);
    tickBase = readTPS();
    saveSettings();
    render();
  });

  tpsCustom?.addEventListener('input', () => {
    tickBase = readTPS();
    saveSettings();
    render();
  });

  // Font selection affects CLOCK only (menus are always system)
  fontSelect?.addEventListener('change', () => {
    applyClockFontMode(fontSelect.value);
    saveSettings();
    enforceMenuSystemFonts();
    centerAllMenuOptions();
  });

  importCustomFont?.addEventListener('click', () => customFontFile?.click());

  customFontFile?.addEventListener('change', async () => {
    const file = customFontFile.files?.[0];
    if (!file) return;

    try {
      await installCustomFontFromFile(file);

      // Switch to custom mode (clock only)
      if (fontSelect) fontSelect.value = 'custom';
      applyClockFontMode('custom');

      saveSettings();
      enforceMenuSystemFonts();
      centerAllMenuOptions();
    } catch (e) {
      console.error(e);
    }
  });

  // ---------- Dragging (mouse + touch) ----------
  (function enableModalDrag() {
    if (!modalCard) return;

    const isInteractive = (el) =>
      !!(el && el.closest && el.closest('button, a, input, select, textarea, label, option'));

    const clearSelection = () => { try { window.getSelection?.().removeAllRanges?.(); } catch {} };
    const setDragLock = (on) => {
      document.documentElement.classList.toggle('gs-modal-dragging', on);
      document.body.classList.toggle('modal-dragging', on);
      document.body.style.userSelect = on ? 'none' : '';
      clearSelection();
    };
    const setOffset = (x, y) => {
      modalX = x;
      modalY = y;
      document.documentElement.style.setProperty('--modal-x', `${modalX}px`);
      document.documentElement.style.setProperty('--modal-y', `${modalY}px`);
      clearSelection();
      saveSettings();
    };

    let dragging = false, sx = 0, sy = 0, bx = 0, by = 0;

    modalCard.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (isInteractive(e.target)) return;
      dragging = true;
      modalCard.classList.add('dragging');
      sx = e.clientX; sy = e.clientY;
      bx = modalX; by = modalY;
      setDragLock(true);
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      setOffset(bx + (e.clientX - sx), by + (e.clientY - sy));
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      modalCard.classList.remove('dragging');
      setDragLock(false);
    });

    modalCard.addEventListener('touchstart', (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      if (isInteractive(e.target)) return;
      dragging = true;
      modalCard.classList.add('dragging');
      sx = t.clientX; sy = t.clientY;
      bx = modalX; by = modalY;
      setDragLock(true);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      e.preventDefault();
      setOffset(bx + (t.clientX - sx), by + (t.clientY - sy));
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      modalCard.classList.remove('dragging');
      setDragLock(false);
    });
  })();

  // ---------- Keybinds ----------
  const LS_BINDS = 'stopwatch:keybinds:v1';

  const defaultBinds = {
    startStop: { key: 'Enter',  shift: false, ctrl: false, alt: false, meta: false },
    reset:     { key: 'Delete', shift: true,  ctrl: false, alt: false, meta: false },
    clearPb:   { key: 'Delete', shift: false, ctrl: false, alt: false, meta: false }
  };

  const PURE_MODS = new Set(['Shift', 'Control', 'Alt', 'Meta']);
  const normKey = (k) => (k && k.length === 1) ? k.toUpperCase() : k;

  function loadBinds() {
    try {
      const raw = localStorage.getItem(LS_BINDS);
      if (!raw) return { ...defaultBinds };
      const saved = JSON.parse(raw);
      return {
        startStop: { ...defaultBinds.startStop, ...(saved.startStop || {}) },
        reset:     { ...defaultBinds.reset,     ...(saved.reset || {}) },
        clearPb:   { ...defaultBinds.clearPb,   ...(saved.clearPb || {}) }
      };
    } catch {
      return { ...defaultBinds };
    }
  }

  function saveBinds() {
    try { localStorage.setItem(LS_BINDS, JSON.stringify(binds)); } catch {}
  }

  let binds = loadBinds();

  function describeBind(b) {
    const mods = [];
    if (b.ctrl)  mods.push('Ctrl');
    if (b.alt)   mods.push('Alt');
    if (b.shift) mods.push('Shift');
    if (b.meta)  mods.push('Meta');

    const base = (b.key === 'Enter') ? 'Return'
               : (b.key === ' ')     ? 'Space'
               : b.key;

    return (mods.length ? mods.join('+') + '+' : '') + base;
  }

  function updateBindLabels() {
    if (bindStartStopLabel) bindStartStopLabel.textContent = describeBind(binds.startStop);
    if (bindResetLabel)     bindResetLabel.textContent     = describeBind(binds.reset);
    if (bindClearPbLabel)   bindClearPbLabel.textContent   = describeBind(binds.clearPb);
  }

  function matchKey(e, b) {
    const k = normKey(e.key);
    if (!b || PURE_MODS.has(k)) return false;
    return k === b.key &&
      !!e.shiftKey === !!b.shift &&
      !!e.ctrlKey  === !!b.ctrl &&
      !!e.altKey   === !!b.alt &&
      !!e.metaKey  === !!b.meta;
  }

  function startRebind(which, btnEl, labelEl) {
    if (!btnEl) return;
    btnEl.classList.add('waiting');
    if (labelEl) labelEl.textContent = 'Press keys...';
    if (kbCountdown) kbCountdown.textContent = '3.0';

    const t0 = performance.now();
    let raf2 = 0;

    const onKey = (e) => {
      e.preventDefault();
      const k = normKey(e.key);
      if (PURE_MODS.has(k)) return;

      binds[which] = {
        key: k,
        shift: !!e.shiftKey,
        ctrl:  !!e.ctrlKey,
        alt:   !!e.altKey,
        meta:  !!e.metaKey
      };

      saveBinds();
      cleanup();
    };

    const onTick = () => {
      const left = Math.max(0, 3000 - (performance.now() - t0));
      if (kbCountdown) kbCountdown.textContent = (left / 1000).toFixed(1);
      if (left <= 0) cleanup();
      else raf2 = requestAnimationFrame(onTick);
    };

    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
      cancelAnimationFrame(raf2);
      btnEl.classList.remove('waiting');
      if (kbCountdown) kbCountdown.textContent = '';
      updateBindLabels();
    }

    document.addEventListener('keydown', onKey, true);
    raf2 = requestAnimationFrame(onTick);
  }

  rebindStartStop?.addEventListener('click', () => startRebind('startStop', rebindStartStop, bindStartStopLabel));
  rebindReset?.addEventListener('click', () => startRebind('reset', rebindReset, bindResetLabel));
  rebindClearPb?.addEventListener('click', () => startRebind('clearPb', rebindClearPb, bindClearPbLabel));

  kbResetDefaults?.addEventListener('click', () => {
    binds = { ...defaultBinds };
    saveBinds();
    updateBindLabels();
  });

  document.addEventListener('keydown', (e) => {
    const modalOpen =
      settingsModal?.classList.contains('show') ||
      keybindsModal?.classList.contains('show');

    if (modalOpen) return;

    if (matchKey(e, binds.startStop)) { e.preventDefault(); running ? stop() : start(); }
    else if (matchKey(e, binds.reset)) { e.preventDefault(); reset(); }
    else if (matchKey(e, binds.clearPb)) { e.preventDefault(); clearPB(); }
  }, { capture: true });

  // ---------- Init ----------
  (async () => {
    enforceMenuSystemFonts();
    centerAllMenuOptions();

    loadSettings();

    // Load custom font bytes (if previously saved)
    await loadCustomFontFromDB();

    tickBase = readTPS();
    updateBindLabels();
    applyClockSize();
    applyPrefixMode();
    syncColourEditorUI();
    syncSpeedColourEditorUI();

    // Apply CLOCK font mode (menus remain system)
    const mode = fontSelect?.value || 'default';
    applyClockFontMode(mode);

    enforceMenuSystemFonts();
    centerAllMenuOptions();
    render();
  })();
})();
