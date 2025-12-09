(async () => {
  const $ = id => document.getElementById(id);

  /* ==== ELEMENTS ==== */
  const timerDisplay = $('timerDisplay'), timerInput = $('timerInput');
  const startPauseBtn = $('startPauseBtn'), resetBtn = $('resetBtn');

  const prefixText = $('prefixText'), prefixIcon = $('prefixIcon');

  const settingsBtn = $('settingsBtn'), settingsModal = $('settingsModal');
  const modalCard = $('modalCard'), closeSettings = $('closeSettings');
  const pages = { main: $('page-main'), style: $('page-style'), hurry: $('page-hurry') };

  const sizePrev = $('sizePrev'), sizeNext = $('sizeNext'), sizeLabel = $('sizeLabel');
  const fontSelect = $('fontSelect'), importFontBtn = $('importCustomFont'), customFontInput = $('customFontFile');
  const customFontName = $('customFontName'), customFontNotice = $('customFontNotice');

  const musicUrlInput = $('musicUrlInput'), musicUrlSubmit = $('musicUrlSubmitBtn');
  const musicStatusBtn = $('musicStatusBtn'), musicStatusIcon = $('musicStatusIcon'), musicStatusTip = $('musicStatusTip');
  const bgAudio = $('bgAudio'), ytWrap = $('ytWrap');

  const showAuto = $('showAuto'), showHours = $('showHours'), showMinutes = $('showMinutes'), showSeconds = $('showSeconds'), showTicks = $('showTicks');
  const tpsSelect = $('tpsSelect'), styleSelect = $('styleSelect');

  const directionBtn2 = $('directionBtn_style'), directionTarget2 = $('directionTarget_style'), directionEnds2 = $('directionEnds_style');

  // HURRY page
  const hurryUpMain = $('hurryUpMain'), hurryUpSub = $('hurryUpSub'), hurryUpDesc = $('hurryUpDesc');
  const flashModeSel = $('flashMode'), flashTypeSel = $('flashType'), flashValueIn = $('flashValue');

  // clock-row element (used to switch to stacked layouts for larger sizes)
  const clockRow = document.querySelector('.clock-row');

  /* ==== CONSTANTS / PRESETS ==== */
  const LS_KEY = 'stdtimer:v18';
  const HURRY_DIR = './hurryup/';
  const ICON_NORMAL = './icons/clock.png';
  const ICON_FLASH = './icons/clock_red.png';
  const FONT_DB_NAME = 'stdtimer-fonts';
  const FONT_STORE = 'fonts';
  const FONT_KEY = 'custom';

  const hurryUpPresets = {
  none: { label: 'None', sub: [{ value: '', label: 'No Hurry', desc: 'No hurry up sound will play.' }] },
  mario: {
    label: 'Mario', sub: [
      { value: './Mario/hurryup-smbnes', label: 'Super Mario Bros - NES', desc: 'Plays at Hurry Up start setting, then music 1.25×' },
      { value: './Mario/hurryup-smbgen', label: 'Super Mario - Genesis', desc: 'Plays at Hurry Up start setting, then music 1.25×' },
      { value: './Mario/hurryup-smb3', label: 'Super Mario Bros 3', desc: 'Plays at Hurry Up start setting, then music 1.25×' },
      { value: './Mario/hurryup-smw', label: 'Super Mario World', desc: 'Plays at Hurry Up start setting, then music 1.25×' },
      { value: './Mario/hurryup-nsmb', label: 'New Super Mario Bros', desc: 'Plays at Hurry Up start setting, then music 1.25×' },
      { value: './Mario/hurryup-sm3d', label: 'Super Mario 3D Land', desc: 'Plays at Hurry Up start setting, then music 1.25×' },
    ]
  },
  sonic: {
    label: 'Sonic', sub: [
      { value: './Sonic/sonicrumble-LavaMountainFinal',         label: 'Sonic Rumble - Lava Mountain (Final Battle)',        desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-PinballCarnivalFinal',      label: 'Sonic Rumble - Pinball Carnival (Final Battle)',     desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-PlanetWispFinal',           label: 'Sonic Rumble - Planet Wisp (Final Battle)',         desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-PopFineFinal',              label: 'Sonic Rumble - Pop Fine (Final Battle)',            desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-SeasideHillFinal',          label: 'Sonic Rumble - Seaside Hill (Final Battle)',        desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-ShibuyaCrossingFinal',      label: 'Sonic Rumble - Shibuya Crossing (Final Battle)',    desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-SkySanctuaryFinal',         label: 'Sonic Rumble - Sky Sanctuary (Final Battle)',       desc: 'Plays at Hurry Up start Hurry Up setting' },
      { value: './Sonic/sonicrumble-SpaceColonyARKFinal',       label: 'Sonic Rumble - Space Colony ARK (Final Battle)',    desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-StarlightCarnivalFinal',    label: 'Sonic Rumble - Starlight Carnival (Final Battle)',  desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-SweetMountainFinal',        label: 'Sonic Rumble - Sweet Mountain (Final Battle)',      desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-ChemicalPlantFinal',        label: 'Sonic Rumble - Chemical Plant (Final Battle)',      desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-CityEscapeFinal',           label: 'Sonic Rumble - City Escape (Final Battle)',         desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-DesertRuinsFinal',          label: 'Sonic Rumble - Desert Ruins (Final Battle)',        desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-FancyCuteFinal',            label: 'Sonic Rumble - Fancy Cute (Final Battle)',         desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-FantasyAdventureFinal',     label: 'Sonic Rumble - Fantasy Adventure (Final Battle)',   desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-FrozenFactoryFinal',        label: 'Sonic Rumble - Frozen Factory (Final Battle)',      desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/sonicrumble-GreenHillFinal',            label: 'Sonic Rumble - Green Hill (Final Battle)',          desc: 'Plays at Hurry Up start setting' },
      { value: './Sonic/hurryup-soniclw', label: 'Sonic Lost World', desc: 'Plays at Hurry Up start setting' }
    ]
  },
  ggd: {
    label: 'Goose Goose Duck', sub: [
      { value: './Goose Goose Duck/hurryup-ggdsabo_retro', label: 'Sabotage - Retro', desc: 'Plays at Hurry Up start setting' },
      { value: './Goose Goose Duck/hurryup-ggdsabo_ship', label: 'Sabotage - Ship', desc: 'Plays over music at start' },
      { value: './Goose Goose Duck/hurryup-ggdsabo_victorian', label: 'Sabotage - Victorian', desc: 'Plays at Hurry Up start setting' },
    ]
  },
};

  const SIZE_VW = { 1: 3.5, 2: 5, 3: 8, 4: 14, 5: 22 };
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pad2 = n => String(n).padStart(2, '0');

  /* ==== STATE ==== */
  const st = {
    tickBase: 40, initialTicks: 0, remainingTicks: 0, direction: 'from',
    running: false, lastMs: 0,
    auto: false, showH: true, showM: true, showS: true, showT: true,
    style: 'default', size: 3,

    flashMode: 'nothing', flashType: 'time', flashValue: '00:01:00',
    flashTimer: null, flashPhase: false,

    fontMode: 'system', customFontFamily: '', customFontData: '', // customFontData will be blob: URL when IDB used, or data URL fallback
    customFontBlobPresent: false, // whether we stored a blob in IDB

    musicUrl: '', musicStatus: 'unknown',
    ytId: '', ytReady: false, yt: null, ytAutoplayWhenReady: false,

    huKey: 'none', huValue: '', huAudio: null, huPlayed: false,

    modalX: 0, modalY: 0
  };

  /* =======================
     IndexedDB helpers
     ======================= */
  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
      const r = indexedDB.open(FONT_DB_NAME, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(FONT_STORE)) db.createObjectStore(FONT_STORE); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function idbPutFont(blob) {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(FONT_STORE, 'readwrite'); const store = tx.objectStore(FONT_STORE);
      const rr = store.put(blob, FONT_KEY);
      rr.onsuccess = () => { db.close(); res(true); };
      rr.onerror = () => { db.close(); rej(rr.error); };
    });
  }
  async function idbGetFont() {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(FONT_STORE, 'readonly'); const store = tx.objectStore(FONT_STORE);
      const rr = store.get(FONT_KEY);
      rr.onsuccess = () => { db.close(); res(rr.result || null); };
      rr.onerror = () => { db.close(); rej(rr.error); };
    });
  }
  async function idbDeleteFont() {
    const db = await idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(FONT_STORE, 'readwrite'); const store = tx.objectStore(FONT_STORE);
      const rr = store.delete(FONT_KEY);
      rr.onsuccess = () => { db.close(); res(true); };
      rr.onerror = () => { db.close(); rej(rr.error); };
    });
  }

  /* ==== HELPERS ==== */
  const monoText = str => [...str].map(ch => {
    const sep = (ch === ':' || ch === '.');
    return `<span class="monochar${sep ? ' monochar--sep' : ''}">${ch}</span>`;
  }).join('');

  function parseTimeToTicks(text, base) {
    const s = (text || '').trim(); if (!s) return 0;
    const parts = s.split(':'); let h = 0, m = 0, sec = 0, tt = 0;
    if (parts.length === 3) { h = parseInt(parts[0], 10) || 0; m = parseInt(parts[1], 10) || 0; sec = parts[2]; }
    else if (parts.length === 2) { m = parseInt(parts[0], 10) || 0; sec = parts[1]; }
    else { sec = parts[0]; }
    if (String(sec).includes('.')) { const [ss, t] = String(sec).split('.'); sec = parseInt(ss, 10) || 0; tt = clamp(parseInt(t, 10) || 0, 0, base - 1); }
    else { sec = parseInt(sec, 10) || 0; tt = 0; }
    return (h * 3600 + m * 60 + sec) * base + tt;
  }
  function formatFromTicks(ticks, base = st.tickBase) {
    const t = Math.max(0, Math.floor(ticks));
    const totalSeconds = Math.floor(t / base), tickPart = t % base;
    const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60;

    let sh, sm, ss, stt;
    if (st.auto) { sh = totalSeconds >= 3600; sm = sh || totalSeconds >= 60; ss = true; stt = !!st.showT; }
    else { sh = !!st.showH; sm = !!st.showM; ss = !!st.showS; stt = !!st.showT; }

    const arr = [];
    if (sh) arr.push(pad2(h));
    if (sm) arr.push(sh ? pad2(m) : String(m));
    if (ss) arr.push((sh || sm) ? pad2(s) : String(s));
    let out = arr.join(':');
    if (stt) out += (out ? '.' : '') + pad2(tickPart);
    if (!out) out = `${pad2(m)}:${pad2(s)}.${pad2(tickPart)}`;
    return out;
  }

  function partsFromTicks(ticks, base = st.tickBase) {
    const t = Math.max(0, Math.floor(ticks));
    const totalSeconds = Math.floor(t / base), tickPart = t % base;
    const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60;
    return { h: pad2(h), m: pad2(m), s: pad2(s), tt: pad2(tickPart), totalSeconds };
  }

  const timeLeftTicks = () => st.direction === 'from' ? st.remainingTicks : Math.max(0, st.initialTicks - st.remainingTicks);

  // preserve “last tick” when changing TPS (hoisted function to avoid ReferenceError)
  function convertTicksPreserveLast(oldBase, newBase, ticks) {
    const S = Math.floor(ticks / oldBase);
    const r = ticks % oldBase;
    const wasLast = r === (oldBase - 1);
    let nt;
    if (wasLast) nt = S * newBase + (newBase - 1);
    else {
      const secs = ticks / oldBase;
      nt = Math.round(secs * newBase);
      if (nt % newBase === 0 && r !== 0) nt -= 1;
    }
    return Math.max(0, nt);
  }

  /* ==== SIZE helpers (missing previously) ==== */
  function applySize() {
    document.documentElement.style.setProperty('--clock-vw', `${(SIZE_VW[st.size] || 8)}vw`);
    sizeLabel.textContent = String(st.size);
    save();
    render();
  }
  function sizeDelta(d) {
    st.size = clamp(st.size + d, 1, 5);
    applySize();
  }

  /* ==== RENDER ==== */
  function render() {
    // default single-line rendering for the main display (other stacked layouts handled elsewhere at size change)
    timerDisplay.innerHTML = monoText(formatFromTicks(st.remainingTicks));
    prefixText.style.display = (st.style === 'time') ? 'block' : 'none';
    prefixIcon.style.display = (st.style === 'icon') ? 'block' : 'none';
  }

  /* ==== FONT: injection + persistent custom font via IndexedDB ==== */
  function injectFace(name, src) {
    const id = `face-${name}`;
    const old = document.getElementById(id); if (old) old.remove();
    const el = document.createElement('style'); el.id = id;
    el.textContent = `@font-face{font-family:'${name}';src:url('${src}');font-display:swap;}`;
    document.head.appendChild(el);
  }

  let _currentCustomBlobUrl = null;
  function revokeCurrentCustomBlobUrl() {
    if (_currentCustomBlobUrl) {
      try { URL.revokeObjectURL(_currentCustomBlobUrl); } catch { }
      _currentCustomBlobUrl = null;
    }
  }

  async function loadCustomFontFromIDBAndInject() {
    try {
      const blob = await idbGetFont();
      if (blob) {
        revokeCurrentCustomBlobUrl();
        const url = URL.createObjectURL(blob);
        _currentCustomBlobUrl = url;
        st.customFontData = url;
        st.customFontBlobPresent = true;
        const family = st.customFontFamily || 'CustomImportedFont';
        injectFace(family, url);
        // if user had previously selected custom mode, apply it now
        if (st.fontMode === 'custom') applyFont('custom');
        return true;
      }
    } catch (e) {
      console.warn('Could not load custom font from IDB:', e);
    }
    return false;
  }

  async function handleCustomFontFile(file) {
    if (!file) return;
    const family = file.name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '');
    try {
      await idbPutFont(file);
      revokeCurrentCustomBlobUrl();
      const blobUrl = URL.createObjectURL(file);
      _currentCustomBlobUrl = blobUrl;
      st.customFontFamily = family;
      st.customFontData = blobUrl;
      st.customFontBlobPresent = true;
      injectFace(st.customFontFamily, blobUrl);
      applyFont('custom');
      customFontName.textContent = `Loaded: ${family}`;
      customFontNotice.style.display = 'block';
      save();
      return;
    } catch (err) {
      console.warn('IndexedDB store failed; falling back to dataURL', err);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            st.customFontFamily = family;
            st.customFontData = reader.result; // data URL
            st.customFontBlobPresent = false;
            injectFace(st.customFontFamily, st.customFontData);
            applyFont('custom');
            customFontName.textContent = `Loaded: ${family}`;
            customFontNotice.style.display = 'block';
            save();
          } catch (e) { console.warn('fallback inject failed', e); }
        };
        reader.readAsDataURL(file);
      } catch (e) {
        console.error('Custom font import failed', e);
      }
    }
  }

  async function removeCustomFont() {
    revokeCurrentCustomBlobUrl();
    const family = st.customFontFamily || 'CustomImportedFont';
    const id = `face-${family}`;
    const el = document.getElementById(id); if (el) el.remove();
    st.customFontFamily = ''; st.customFontData = ''; st.customFontBlobPresent = false;
    try { await idbDeleteFont(); } catch { }
    save();
  }

  function detectSystemFontFile() {
    const ua = navigator.userAgent || '';
    const plat = navigator.platform || '';
    if (/Mac|iPhone|iPad|iPod/.test(plat) || /like Mac OS X|iPhone|iPad|Mac OS X/.test(ua)) return './fonts/Apple/SanFranciscoDisplay-Regular.otf';
    if (/Win/.test(plat)) return './fonts/Windows/Segoe UI regular.ttf';
    if (/Android/i.test(ua)) {
      if (/Pixel/i.test(ua)) return './fonts/Android/Google_GoogleSans.ttf';
      if (/OnePlus/i.test(ua)) return './fonts/Android/OnePlus_OnePlusSans.ttf';
      if (/OPPO|Oppo/i.test(ua)) return './fonts/Android/Oppo_OPPOSans.ttf';
      if (/SM-|Samsung/i.test(ua)) return './fonts/Android/Samsung_SamsungSans.ttf';
      if (/Vivo/i.test(ua)) return './fonts/Android/Vivo_VivoSans.ttf';
      if (/Xiaomi|Mi |Redmi/i.test(ua)) return './fonts/Android/Xaomi_MiSans.ttf';
      return './fonts/Android/roboto.ttf';
    }
    return './fonts/Android/roboto.ttf';
  }

  function ensureVendorSystemForModal() {
    try {
      const sysFile = detectSystemFontFile();
      injectFace('VendorSystem', sysFile);
      const stack = `'VendorSystem', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      document.documentElement.style.setProperty('--modal-font-stack', stack);
    } catch (e) { /* noop */ }
  }

  function applyFont(mode) {
    st.fontMode = mode;
    if (mode === 'custom' && st.customFontFamily) {
      document.body.style.fontFamily = `'${st.customFontFamily}', system-ui,"Segoe UI",Roboto,-apple-system,"SF Pro Display",Arial,sans-serif`;
    } else if (mode === 'default') {
      injectFace('FancyCatPX', './fonts/FancyCatPX.ttf');
      document.body.style.fontFamily = `'FancyCatPX', system-ui,"Segoe UI",Roboto,-apple-system,"SF Pro Display",Arial,sans-serif`;
    } else {
      const sysFile = detectSystemFontFile();
      injectFace('VendorSystem', sysFile);
      document.body.style.fontFamily = `'VendorSystem', system-ui,"Segoe UI",Roboto,-apple-system,"SF Pro Display",Arial,sans-serif`;
    }
    ensureVendorSystemForModal();
    save();
  }

  /* ==== FLASH / HURRY helpers ==== */
  function sanitizeFlashValue() { st.flashValue = (flashValueIn.value || '').trim(); }
  function parsePercentValue(raw) {
    const s = (raw || '').toString().trim();
    if (!s) return null;
    if (s.includes('/')) {
      const [a, b] = s.split('/').map(x => parseFloat(x));
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return (a / b) * 100;
      return NaN;
    }
    if (s.endsWith('%')) {
      const n = parseFloat(s.slice(0, -1));
      return Number.isFinite(n) ? n : NaN;
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function computeFlashTrigger() {
    sanitizeFlashValue();
    const base = st.tickBase;
    if (!st.flashValue || st.flashValue.trim() === '') {
      const oneMinuteTicks = 60 * base;
      const sec = Math.floor(oneMinuteTicks / base) * base;
      return Math.max(0, sec - 1);
    }

    if (st.flashType === 'percent') {
      const parsed = parsePercentValue(st.flashValue);
      const p = Number.isFinite(parsed) ? clamp(parsed, 0, 100) : 0;
      const t = Math.floor(st.initialTicks * (p / 100));
      const sec = Math.floor(t / base) * base;
      return Math.max(0, sec - 1);
    } else {
      const t = parseTimeToTicks(st.flashValue, base);
      const sec = Math.floor(t / base) * base;
      return Math.max(0, sec - 1);
    }
  }

  function startFlashIfNeeded() {
    if (st.flashTimer || st.flashMode === 'nothing') return;
    st.flashTimer = setInterval(() => {
      if (!st.running) return;
      st.flashPhase = !st.flashPhase;

      const wantTime = (st.flashMode === 'time' || st.flashMode === 'all');
      const wantPrefix = (st.flashMode === 'prefix' || st.flashMode === 'all');

      timerDisplay.classList.toggle('flash-face', wantTime && st.flashPhase);

      if (wantPrefix) {
        if (st.style === 'time') {
          prefixText.classList.toggle('flash-prefix-text', st.flashPhase);
        } else if (st.style === 'icon') {
          prefixIcon.src = st.flashPhase ? ICON_FLASH : ICON_NORMAL;
        }
      } else {
        prefixText.classList.remove('flash-prefix-text');
        if (st.style === 'icon') prefixIcon.src = ICON_NORMAL;
      }
    }, 333);
  }
  function stopFlash() {
    if (st.flashTimer) { clearInterval(st.flashTimer); st.flashTimer = null; }
    st.flashPhase = false;
    timerDisplay.classList.remove('flash-face');
    prefixText.classList.remove('flash-prefix-text');
    if (st.style === 'icon') prefixIcon.src = ICON_NORMAL;
  }
  function syncMinuteState() {
    const trigger = computeFlashTrigger();
    const left = timeLeftTicks();
    if (left <= trigger) startFlashIfNeeded(); else stopFlash();
  }

  /* ==== HURRY AUDIO ==== */
  const canPlay = type => { try { return (new Audio()).canPlayType(type); } catch { return ''; } };
  const hurrySrcFor = id => id ? `${HURRY_DIR}${id}.${canPlay('audio/mpeg') ? 'mp3' : 'ogg'}` : null;
  const stopHU = () => { if (st.huAudio) { try { st.huAudio.pause(); } catch { } } };

  async function doHurryUp() {
    if (!st.huValue) return;
    stopHU();
    const a = new Audio(hurrySrcFor(st.huValue));
    a.preload = 'auto';
    st.huAudio = a;

    const wasPlaying = isYTActive() ? ytIsPlaying() : (!!bgAudio.src && !bgAudio.paused);
    if (wasPlaying) stopAllBGM();

    try { await a.play(); } catch { }
    a.addEventListener('ended', () => {
      if (wasPlaying) {
        if (isYTActive() && st.yt) {
          try { st.yt.setPlaybackRate(1.25); st.yt.seekTo(0, true); if (st.running) st.yt.playVideo(); } catch { }
        } else if (bgAudio.src) {
          try { bgAudio.playbackRate = 1.25; bgAudio.currentTime = 0; if (st.running) bgAudio.play(); } catch { }
        }
      }
    }, { once: true });
  }

  /* ==== PERSISTENCE ==== */
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        tickBase: st.tickBase, initial: st.initialTicks, remaining: st.remainingTicks, direction: st.direction,
        auto: st.auto, showH: st.showH, showM: st.showM, showS: st.showS, showT: st.showT,
        style: st.style, size: st.size,
        flashMode: st.flashMode, flashType: st.flashType, flashValue: st.flashValue,
        fontMode: st.fontMode, customFontFamily: st.customFontFamily, customFontBlobPresent: st.customFontBlobPresent,
        musicUrl: st.musicUrl, ytId: st.ytId, huKey: st.huKey, huValue: st.huValue,
        modalX: st.modalX, modalY: st.modalY
      }));
    } catch (e) { console.warn('save failed', e); }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      st.tickBase = clamp(parseInt(d.tickBase || 40, 10), 10, 100);

      const def = 9 * 60 * st.tickBase + 59 * st.tickBase + (st.tickBase - 1);
      st.initialTicks = Number.isFinite(d.initial) ? d.initial : def;
      st.remainingTicks = Number.isFinite(d.remaining) ? d.remaining : st.initialTicks;
      st.direction = (d.direction === 'to' ? 'to' : 'from');

      st.auto = !!d.auto; st.showH = d.showH !== false; st.showM = d.showM !== false; st.showS = d.showS !== false; st.showT = d.showT !== false;
      st.style = d.style || 'default';
      st.size = clamp(parseInt(d.size || 3, 10), 1, 5);

      st.flashMode = d.flashMode || 'nothing';
      st.flashType = d.flashType || 'time';
      if ('flashValue' in d) st.flashValue = (d.flashValue === null ? '' : d.flashValue);
      else st.flashValue = '00:01:00';

      st.fontMode = d.fontMode || 'system';
      st.customFontFamily = d.customFontFamily || '';
      st.customFontBlobPresent = !!d.customFontBlobPresent;

      st.musicUrl = d.musicUrl || ''; st.ytId = d.ytId || '';
      st.huKey = d.huKey || 'none'; st.huValue = d.huValue || '';
      st.modalX = parseFloat(d.modalX || 0); st.modalY = parseFloat(d.modalY || 0);
    } catch (e) { console.warn('load failed', e); }
  }

  /* ==== DIRECTION ==== */
  function updateDirectionUI() {
    directionBtn2.textContent = st.direction.toUpperCase();
    const target = formatFromTicks(st.initialTicks);
    directionTarget2.textContent = target;
    directionEnds2.textContent = (st.direction === 'from') ? '00:00:00.00' : target;
  }
  function flipDirection() {
    if (st.running) return;
    st.direction = (st.direction === 'from') ? 'to' : 'from';
    st.remainingTicks = (st.direction === 'from') ? st.initialTicks : 0;
    st.huPlayed = false; stopFlash();
    updateDirectionUI(); render(); save();
  }

  /* ==== ENGINE ==== */
  function start() {
    if (st.running) return;
    if (st.direction === 'from' && st.remainingTicks <= 0) return;
    if (st.direction === 'to' && st.remainingTicks >= st.initialTicks) return;
    st.running = true; st.lastMs = performance.now();
    startPauseBtn.textContent = 'Pause';

    if (st.ytId && !st.ytReady) st.ytAutoplayWhenReady = true;

    playBGM();
    syncMinuteState();
    tick();
  }
  function pause() {
    if (!st.running) return;
    st.running = false; startPauseBtn.textContent = 'Start';
    stopFlash();
    stopBGM();
  }
  function reset() {
    pause();
    st.remainingTicks = (st.direction === 'from') ? st.initialTicks : 0;
    st.huPlayed = false; stopHU(); stopFlash(); render(); save();
  }
  function tick() {
    if (!st.running) return;
    const now = performance.now();
    const elapsed = now - st.lastMs;
    const ticks = Math.floor(elapsed * st.tickBase / 1000);
    if (ticks > 0) {
      if (st.direction === 'from') st.remainingTicks = Math.max(0, st.remainingTicks - ticks);
      else st.remainingTicks = Math.min(st.initialTicks, st.remainingTicks + ticks);
      st.lastMs += ticks * 1000 / st.tickBase;

      const trigger = computeFlashTrigger();
      const left = timeLeftTicks();
      if (!st.huPlayed && left === trigger) { st.huPlayed = true; doHurryUp(); }

      if (st.direction === 'from' ? st.remainingTicks <= 0 : st.remainingTicks >= st.initialTicks) pause();
      render(); save();
    }
    requestAnimationFrame(tick);
  }

  /* ==== EDIT OVERLAY ==== */
  const atStart = () => st.direction === 'from' ? st.remainingTicks === st.initialTicks : st.remainingTicks === 0;
function enterEdit(){
  if (st.running || !atStart()) return;

  // ensure input accepts text keyboard (colon, period, etc.)
  timerInput.type = 'text';
  try { timerInput.setAttribute('inputmode', 'text'); } catch{}

  // populate value
  timerInput.value = formatFromTicks(st.initialTicks);

  // match the visual font-size of the clock for a natural edit feel
  const computedFontSize = getComputedStyle(timerDisplay).fontSize || getComputedStyle(document.documentElement).getPropertyValue('--clock-vw') || '4rem';
  timerInput.style.fontSize = computedFontSize;

  // make visible so measurements work
  timerInput.style.display = 'block';
  document.body.classList.add('editing');

  // compute timerDisplay position and center the input horizontally & vertically on it
  const rect = timerDisplay.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

  // prefer input width close to timer width but keep bounds
  const desiredWidth = Math.min(Math.max(rect.width * 0.95, 160), window.innerWidth - 40);
  timerInput.style.width = `${desiredWidth}px`;

  // position: left center at rect center, top aligned to middle of display
  const inputHeightEstimate = parseFloat(timerInput.style.fontSize) * 1.15 || (rect.height * 0.28);
  const top = rect.top + scrollY + (rect.height / 2) - (inputHeightEstimate / 2);

  timerInput.style.left = `${rect.left + (rect.width / 2)}px`;
  timerInput.style.top = `${Math.max(8, top)}px`; // clamp to avoid off-screen at top
  timerInput.style.transform = 'translate(-50%, 0)';

  // select contents and focus (user gesture will bring up keyboard)
  timerInput.focus();
  try { timerInput.setSelectionRange(0, timerInput.value.length); } catch (e) { /* some mobile keyboards may not allow setSelectionRange */ }
}

function commitEdit(){
  const nv = parseTimeToTicks(timerInput.value, st.tickBase);
  if (Number.isFinite(nv) && nv >= 0){
    st.initialTicks = nv;
    st.remainingTicks = (st.direction === 'from') ? st.initialTicks : 0;
    st.huPlayed = false; stopFlash();
    updateDirectionUI(); save(); render();
  }

  // hide & reset positioning
  timerInput.style.display = 'none';
  timerInput.style.top = ''; timerInput.style.left = ''; timerInput.style.width = '';
  timerInput.style.transform = 'translateX(-50%)';
  document.body.classList.remove('editing');
}
  /* ==== MODAL / PAGES ==== */
  function setModalOffset(x = 0, y = 0) {
    st.modalX = x; st.modalY = y;
    modalCard.style.setProperty('--modal-x', `${x}px`);
    modalCard.style.setProperty('--modal-y', `${y}px`);
    modalCard.style.transform = 'translate(-50%,-50%) translate(var(--modal-x), var(--modal-y))';
  }
  const centerModal = () => setModalOffset(0, 0);
  function showPage(name, { recenter = false } = {}) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    (pages[name] || pages.main).classList.add('active');
    if (recenter) centerModal();
  }

  settingsBtn.addEventListener('click', () => {
    const showing = settingsModal.classList.contains('show');
    if (showing) {
      settingsModal.classList.remove('show'); settingsModal.setAttribute('aria-hidden', 'true');
    } else {
      settingsModal.classList.add('show'); settingsModal.setAttribute('aria-hidden', 'false');
      showPage('main', { recenter: true });
      setModalOffset(0, 0);
    }
  });
  closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('show'); settingsModal.setAttribute('aria-hidden', 'true');
  });
  $('openStyle').addEventListener('click', () => showPage('style', { recenter: false }));
  $('openHurry').addEventListener('click', () => showPage('hurry', { recenter: false }));
  $('backFromStyle').addEventListener('click', () => showPage('main', { recenter: false }));
  $('backFromHurry').addEventListener('click', () => showPage('main', { recenter: false }));

  // drag anywhere non-interactive; suppress pull-to-refresh while dragging
  (() => {
    let dragging = false, sx = 0, sy = 0, bx = 0, by = 0;
    const isInteractive = el => ['INPUT', 'SELECT', 'BUTTON', 'A', 'LABEL', 'TEXTAREA', 'AUDIO', 'IFRAME'].includes(el.tagName) || el.closest('.status-tip');
    modalCard.addEventListener('mousedown', e => {
      if (isInteractive(e.target)) return;
      dragging = true; e.preventDefault();
      sx = e.clientX; sy = e.clientY; bx = st.modalX; by = st.modalY;
    });
    window.addEventListener('mousemove', e => { if (!dragging) return; setModalOffset(bx + (e.clientX - sx), by + (e.clientY - sy)); });
    ['mouseup', 'mouseleave'].forEach(t => window.addEventListener(t, () => dragging = false));

    modalCard.addEventListener('touchstart', ev => {
      const t = ev.touches[0]; if (!t || isInteractive(ev.target)) return;
      dragging = true; sx = t.clientX; sy = t.clientY; bx = st.modalX; by = st.modalY;
    }, { passive: false });
    window.addEventListener('touchmove', ev => {
      if (!dragging) return;
      ev.preventDefault();
      const t = ev.touches[0]; if (!t) return;
      setModalOffset(bx + (t.clientX - sx), by + (t.clientY - sy));
    }, { passive: false });
    window.addEventListener('touchend', () => dragging = false);
    window.addEventListener('touchcancel', () => dragging = false);
  })();

  /* ==== EVENTS ==== */
  startPauseBtn.addEventListener('click', () => (st.running ? pause() : start()));
  resetBtn.addEventListener('click', reset);

  timerDisplay.addEventListener('click', enterEdit);
  timerInput.addEventListener('keydown', e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { timerInput.style.display = 'none'; document.body.classList.remove('editing'); } });
  timerInput.addEventListener('blur', commitEdit);

  showAuto.addEventListener('change', () => { st.auto = !!showAuto.checked; save(); render(); });
  showHours.addEventListener('change', () => { st.showH = !!showHours.checked; save(); render(); });
  showMinutes.addEventListener('change', () => { st.showM = !!showMinutes.checked; save(); render(); });
  showSeconds.addEventListener('change', () => { st.showS = !!showSeconds.checked; save(); render(); });
  showTicks.addEventListener('change', () => { st.showT = !!showTicks.checked; save(); render(); });

  tpsSelect.addEventListener('change', () => {
    const nb = clamp(parseInt(tpsSelect.value, 10), 10, 100);
    if (nb === st.tickBase) return;
    const ob = st.tickBase;
    st.initialTicks = convertTicksPreserveLast(ob, nb, st.initialTicks);
    st.remainingTicks = convertTicksPreserveLast(ob, nb, st.remainingTicks);
    st.remainingTicks = Math.max(0, Math.min(st.remainingTicks, st.initialTicks));
    st.tickBase = nb;
    st.lastMs = performance.now();
    stopFlash(); save(); render(); updateDirectionUI(); syncMinuteState();
  });

  sizePrev.addEventListener('click', () => sizeDelta(-1));
  sizeNext.addEventListener('click', () => sizeDelta(+1));

  styleSelect.addEventListener('change', () => { st.style = styleSelect.value; if (st.style !== 'icon') prefixIcon.src = ICON_NORMAL; save(); render(); });

  flashModeSel.addEventListener('change', () => { st.flashMode = flashModeSel.value; stopFlash(); syncMinuteState(); save(); });
  flashTypeSel.addEventListener('change', () => { st.flashType = flashTypeSel.value; flashValueIn.placeholder = (st.flashType === 'percent') ? '0–100 or 1/3' : 'HH:MM:SS'; stopFlash(); syncMinuteState(); save(); });
  flashValueIn.addEventListener('input', () => { st.flashValue = flashValueIn.value; stopFlash(); syncMinuteState(); save(); });

  directionBtn2.addEventListener('click', flipDirection);
  directionBtn2.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') flipDirection(); });

  // Music status + URL handling
  const statusMap = {
    unknown: { icon: './icons/question.png', tip: 'No music' },
    loading: { icon: './icons/wait.gif', tip: 'Fetching URL…' },
    saved: { icon: './icons/check.png', tip: 'URL saved' },
    invalid: { icon: './icons/cross.png', tip: 'Invalid URL' }
  };
  function setMusicStatus(s) {
    st.musicStatus = s;
    const m = statusMap[s] || statusMap.unknown;
    musicStatusIcon.src = m.icon; musicStatusTip.textContent = m.tip;
  }
  musicStatusBtn.addEventListener('mouseenter', () => {
    const r = musicStatusBtn.getBoundingClientRect();
    musicStatusTip.style.left = `${r.left}px`; musicStatusTip.style.top = `${r.top - 36}px`;
    musicStatusTip.style.display = 'block';
  });
  musicStatusBtn.addEventListener('mouseleave', () => { musicStatusTip.style.display = 'none'; });

  function looksLikeDirectAudio(u) { return /\.(mp3|ogg|wav|m4a|aac)(\?|#|$)/i.test(u); }
  const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]{11})/i;
  const extractYTId = u => (ytRegex.exec(u || '') || [])[1] || '';

  // IFrame API hook
  window.onYouTubeIframeAPIReady = () => {
    st.ytReady = true;
    if (st.ytId) ensureYT(st.ytId);
  };
  function ensureYT(id) {
    if (!st.ytReady || !id) return;
    ytWrap.style.display = 'block';
    if (st.yt) { try { st.yt.loadVideoById(id); } catch { } return; }
    st.yt = new YT.Player('ytPlayer', {
      width: '100%', height: '100%',
      videoId: id,
      playerVars: { rel: 0, modestbranding: 1, controls: 1, playsinline: 1 },
      events: {
        onReady: () => {
          if (st.running || st.ytAutoplayWhenReady) {
            st.ytAutoplayWhenReady = false;
            try { st.yt.setPlaybackRate(1); st.yt.playVideo(); } catch { }
          }
        }
      }
    });
  }
  function isYTActive() { return !!(st.ytId && st.ytReady); }
  function ytIsPlaying() { try { return st.yt && st.yt.getPlayerState() === YT.PlayerState.PLAYING; } catch { return false; } }
  function stopAllBGM() { if (bgAudio.src) { try { bgAudio.pause(); } catch { } } if (isYTActive()) { try { st.yt.pauseVideo(); } catch { } } }
  function playBGM() {
    if (bgAudio.src) { try { bgAudio.playbackRate = 1; if (st.running) bgAudio.play(); } catch { } }
    if (isYTActive()) { try { st.yt.setPlaybackRate(1); if (st.running) st.yt.playVideo(); } catch { } }
  }
  function stopBGM() { if (bgAudio.src) { try { bgAudio.pause(); } catch { } } if (isYTActive()) { try { st.yt.pauseVideo(); } catch { } } }

  musicUrlInput.addEventListener('input', () => setMusicStatus('loading'));
  musicUrlSubmit.addEventListener('click', () => {
    const url = (musicUrlInput.value || '').trim();
    if (!url) {
      st.musicUrl = ''; st.ytId = ''; setMusicStatus('unknown');
      bgAudio.removeAttribute('src'); bgAudio.style.display = 'none';
      ytWrap.style.display = 'none';
      save(); return;
    }
    try {
      new URL(url);
      st.musicUrl = url;
      const ytId = extractYTId(url);
      if (ytId) {
        st.ytId = ytId;
        bgAudio.removeAttribute('src'); bgAudio.style.display = 'none';
        ensureYT(ytId);
        if (st.running && st.ytReady) { try { st.yt.playVideo(); } catch { } } else { st.ytAutoplayWhenReady = st.running; }
        setMusicStatus('saved');
      } else if (looksLikeDirectAudio(url)) {
        st.ytId = ''; ytWrap.style.display = 'none';
        bgAudio.src = url; bgAudio.style.display = 'block';
        if (st.running) { try { bgAudio.play(); } catch { } }
        setMusicStatus('saved');
      } else {
        st.ytId = '';
        bgAudio.removeAttribute('src'); bgAudio.style.display = 'none';
        ytWrap.style.display = 'none';
        setMusicStatus('invalid');
      }
      save();
    } catch {
      setMusicStatus('invalid');
    }
  });

  /* ==== HURRY MENUS ==== */
  function populateHurryUp() {
    const set = (sel, opts) => { sel.innerHTML = ''; opts.forEach(o => { const e = document.createElement('option'); e.value = o.value; e.textContent = o.label; sel.appendChild(e); }); };
    const groups = Object.entries(hurryUpPresets).map(([k, v]) => ({ value: k, label: v.label }));
    set(hurryUpMain, groups);
    function refreshSub() {
      const g = hurryUpPresets[hurryUpMain.value] || hurryUpPresets.none;
      set(hurryUpSub, g.sub.map(s => ({ value: s.value, label: s.label })));
      const d = g.sub[0]; hurryUpDesc.textContent = d?.desc || ''; st.huKey = hurryUpMain.value; st.huValue = hurryUpSub.value; save();
    }
    hurryUpMain.addEventListener('change', refreshSub);
    hurryUpSub.addEventListener('change', () => {
      const g = hurryUpPresets[hurryUpMain.value] || hurryUpPresets.none;
      const d = g.sub.find(s => s.value === hurryUpSub.value) || g.sub[0];
      hurryUpDesc.textContent = d?.desc || ''; st.huKey = hurryUpMain.value; st.huValue = hurryUpSub.value; save();
    });
    hurryUpMain.value = st.huKey in hurryUpPresets ? st.huKey : 'none';
    refreshSub(); if (st.huValue) hurryUpSub.value = st.huValue;
  }

  /* ==== INIT ==== */
  st.initialTicks = 9 * 60 * st.tickBase + 59 * st.tickBase + (st.tickBase - 1);
  load();

  // Attempt to load font blob from IDB if user previously saved it
  try {
    if (st.customFontFamily && st.customFontBlobPresent) {
      const ok = await loadCustomFontFromIDBAndInject();
      if (!ok) {
        st.customFontBlobPresent = false;
        save();
      }
    } else {
      const blob = await idbGetFont().catch(() => null);
      if (blob) {
        await loadCustomFontFromIDBAndInject();
        if (!st.customFontFamily) st.customFontFamily = 'CustomImportedFont';
        st.customFontBlobPresent = true;
        save();
      }
    }
  } catch (e) {
    console.warn('custom font init err', e);
  }

  sizeLabel.textContent = String(st.size);
  fontSelect.value = st.fontMode;

  showAuto.checked = !!st.auto; showHours.checked = st.showH !== false; showMinutes.checked = st.showM !== false; showSeconds.checked = st.showS !== false; showTicks.checked = st.showT !== false;
  tpsSelect.value = String(st.tickBase); styleSelect.value = st.style;

  flashModeSel.value = st.flashMode;
  flashTypeSel.value = st.flashType;
  flashValueIn.value = st.flashValue || '';
  flashValueIn.placeholder = (st.flashType === 'percent') ? '0–100 or 1/3' : 'HH:MM:SS';

  st.remainingTicks = (st.direction === 'from') ? st.initialTicks : 0;

  ensureVendorSystemForModal();
  applyFont(st.fontMode);
  applySize(); // ensure CSS variable and label match the size on load
  render();
  populateHurryUp();
  updateDirectionUI();
  setModalOffset(st.modalX || 0, st.modalY || 0);
  save();

  // guard accidental double
  startPauseBtn.addEventListener('dblclick', e => e.preventDefault());
  resetBtn.addEventListener('dblclick', e => e.preventDefault());

})();