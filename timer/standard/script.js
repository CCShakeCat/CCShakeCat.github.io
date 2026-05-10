(() => {
  const boot = () => {
    window.GSGlobal?.init?.('.');
    window.GSGlobal?.applyPlatformDataset?.();
    // ✅ Prevent double initialization (script included twice / boot called twice)
    if (window.__stdtimerBooted) return;
    window.__stdtimerBooted = true;

    const $ = id => document.getElementById(id);

    /* ==== ELEMENTS ==== */
    const timerDisplay = $('timerDisplay');
    const timerInput   = $('timerInput');

    const startPauseBtn = $('startPauseBtn');
    const resetBtn      = $('resetBtn');

    const prefixText = $('prefixText');
    const prefixIcon = $('prefixIcon');
    const prefixWrap = $('prefixWrap');

    const settingsBtn   = $('settingsBtn');
    const settingsModal = $('settingsModal');
    const modalCard     = $('modalCard');
    const closeSettings = $('closeSettings');

    const pages = {
      main:  $('page-main'),
      style: $('page-style'),
      colours: $('page-colours'),
      hurry: $('page-hurry')
    };
    const openStyle     = $('openStyle');
    const openColours   = $('openColours');
    const openHurry     = $('openHurry');
    const backFromStyle = $('backFromStyle');
    const backFromColours = $('backFromColours');
    const backFromHurry = $('backFromHurry');

    const sizePrev = $('sizePrev');
    const sizeNext = $('sizeNext');
    const sizeLabel = $('sizeLabel');

    const fontSelect      = $('fontSelect');
    const importFontBtn   = $('importCustomFont');
    const customFontInput = $('customFontFile');
    const customFontName  = $('customFontName');
    const customFontNotice = $('customFontNotice');

    const showAuto    = $('showAuto');
    const showHours   = $('showHours');
    const showMinutes = $('showMinutes');
    const showSeconds = $('showSeconds');
    const showTicks   = $('showTicks');

    const tpsSelect   = $('tpsSelect');
    const styleSelect = $('styleSelect');

    const prefixColorInput = $('prefixColorInput');
    const prefixColorPicker = $('prefixColorPicker');
    const faceColorInput = $('faceColorInput');
    const faceColorPicker = $('faceColorPicker');
    const resetColoursBtn = $('resetColours');

    const directionBtn2    = $('directionBtn_style');
    const directionTarget2 = $('directionTarget_style');
    const directionEnds2   = $('directionEnds_style');

    // music / status
    const musicUrlInput   = $('musicUrlInput');
    const musicUrlSubmit  = $('musicUrlSubmitBtn');
    const musicStatusBtn  = $('musicStatusBtn');
    const musicStatusIcon = $('musicStatusIcon');
    const musicStatusTip  = $('musicStatusTip');
    const bgAudio         = $('bgAudio');
    const ytWrap          = $('ytWrap'); // container with iframe #ytPlayer

    // HURRY page
    const hurryUpMain = $('hurryUpMain');
    const hurryUpSub  = $('hurryUpSub');
    const hurryUpDesc = $('hurryUpDesc');

    const flashModeSel = $('flashMode');
    const flashTypeSel = $('flashType');
    const flashValueIn = $('flashValue');

    const hurryVolumeSel      = $('hurryVolume');
    const hurryVolumeLabel    = $('hurryVolumeLabel');
    const tenSecondBeepToggle = $('tenSecondBeep');

    const clockRow = document.querySelector('.clock-row');

    // Hard guard: if critical elements are missing, don't crash.
    const required = [timerDisplay, timerInput, startPauseBtn, resetBtn, settingsBtn, settingsModal, modalCard];
    if (required.some(x => !x)) {
      console.error('[Timer] Missing required DOM elements. Check IDs in HTML.');
      return;
    }



    /* ==== BITMAP FONT ==== */
    const BITMAP_CELL = 8;
    let bitmapImg = null;
    let bitmapReady = false;
    let bitmapWidths = null;

    function ensureBitmapNodes(){
      let pWrap = document.getElementById('prefixBitmapWrap');
      if (!pWrap) { pWrap = document.createElement('div'); pWrap.id='prefixBitmapWrap'; pWrap.className='bitmap-prefix-holder'; prefixWrap?.appendChild(pWrap); }
      let pCanvas = document.getElementById('prefixBitmapCanvas');
      if (!pCanvas) { pCanvas = document.createElement('canvas'); pCanvas.id='prefixBitmapCanvas'; pCanvas.className='bitmap-canvas'; pWrap.appendChild(pCanvas); }
      let tWrap = document.getElementById('timerBitmapWrap');
      if (!tWrap) { tWrap = document.createElement('div'); tWrap.id='timerBitmapWrap'; tWrap.className='bitmap-holder'; timerDisplay?.parentNode?.insertBefore(tWrap, timerDisplay.nextSibling); }
      let tCanvas = document.getElementById('timerBitmapCanvas');
      if (!tCanvas) { tCanvas = document.createElement('canvas'); tCanvas.id='timerBitmapCanvas'; tCanvas.className='bitmap-canvas'; tWrap.appendChild(tCanvas); }
      return {pWrap,pCanvas,tWrap,tCanvas};
    }

    function resetBitmapFont(){
      bitmapReady = false;
      bitmapImg = null;
      bitmapWidths = null;
    }

    function fallbackBitmapWidth(index) {
      if (index === 32) return 4;
      if (index >= 29 && index <= 31) return 1;
      return 6;
    }

    function measureBitmapWidths(img) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 128;
      canvas.height = img.naturalHeight || 128;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const widths = new Array(256);

      for (let index = 0; index < 256; index++) {
        const sx = (index % 16) * BITMAP_CELL;
        const sy = Math.floor(index / 16) * BITMAP_CELL;
        let right = -1;

        try {
          const data = ctx.getImageData(sx, sy, BITMAP_CELL, BITMAP_CELL).data;
          for (let y = 0; y < BITMAP_CELL; y++) {
            for (let x = 0; x < BITMAP_CELL; x++) {
              const offset = (y * BITMAP_CELL + x) * 4;
              const visible = data[offset + 3] > 16 && (data[offset] > 16 || data[offset + 1] > 16 || data[offset + 2] > 16);
              if (visible && x > right) right = x;
            }
          }
        } catch {}

        widths[index] = right >= 0 ? Math.min(BITMAP_CELL, right + 2) : fallbackBitmapWidth(index);
      }

      return widths;
    }

    function loadBitmapFont(){
      const src = window.GSGlobal?.getBitmapFontUrl?.() || '../../globals/default8.png';
      if (bitmapReady && bitmapImg && bitmapImg.src === src) return Promise.resolve(bitmapImg);
      if (bitmapImg && bitmapImg._loading && bitmapImg._src === src) return bitmapImg._loading;
      bitmapImg = new Image();
      bitmapImg.decoding='async';
      bitmapImg._src = src;
      const prom = new Promise((resolve,reject)=>{
        bitmapImg.onload=()=>{ bitmapWidths = measureBitmapWidths(bitmapImg); bitmapReady=true; resolve(bitmapImg); render(); };
        bitmapImg.onerror=reject;
      });
      bitmapImg._loading = prom;
      bitmapImg.src = src;
      return prom;
    }

    function getBitmapGlyph(ch){
      const code = ch.codePointAt(0);
      const index = Number.isFinite(code) && code >= 0 && code <= 255 ? code : 63;
      return {
        x: (index % 16) * BITMAP_CELL,
        y: Math.floor(index / 16) * BITMAP_CELL,
        width: bitmapWidths?.[index] || fallbackBitmapWidth(index)
      };
    }

    function tintBitmapCanvas(canvas, color){
      if (!canvas || !color) return;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    function drawBitmapText(canvas, text, scale, color){
      if (!canvas || !bitmapReady || !bitmapImg) return;
      const glyphs = [...String(text||'')].map(getBitmapGlyph);
      const w = Math.max(1, glyphs.reduce((sum, g) => sum + g.width, 0) * scale);
      const h = Math.max(1, BITMAP_CELL * scale);
      canvas.width = w; canvas.height = h; canvas.style.width = w+'px'; canvas.style.height = h+'px';
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,w,h);
      ctx.imageSmoothingEnabled = false;
      let x = 0;
      for (const g of glyphs){
        if (g) ctx.drawImage(bitmapImg, g.x, g.y, BITMAP_CELL, BITMAP_CELL, x, 0, BITMAP_CELL*scale, BITMAP_CELL*scale);
        x += g.width * scale;
      }
      tintBitmapCanvas(canvas, color);
    }

    function measureBitmapLine(text, scale){
      const glyphs = [...String(text || '')].map(getBitmapGlyph);
      return {
        glyphs,
        width: Math.max(1, glyphs.reduce((sum, g) => sum + g.width, 0) * scale),
        height: BITMAP_CELL * scale,
        scale
      };
    }

    function drawBitmapLines(canvas, lines, color){
      if (!canvas || !bitmapReady || !bitmapImg) return;
      const measured = lines
        .filter(line => line && line.text !== '')
        .map(line => measureBitmapLine(line.text, line.scale));
      if (!measured.length) return drawBitmapText(canvas, '', 1, color);

      const gap = Math.max(0, Math.round(Math.min(...measured.map(line => line.scale)) * 2));
      const w = Math.max(1, ...measured.map(line => line.width));
      const h = Math.max(1, measured.reduce((sum, line) => sum + line.height, 0) + gap * (measured.length - 1));
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      let y = 0;
      for (const line of measured){
        let x = Math.floor((w - line.width) / 2);
        for (const g of line.glyphs){
          if (g) {
            ctx.drawImage(
              bitmapImg,
              g.x,
              g.y,
              BITMAP_CELL,
              BITMAP_CELL,
              x,
              y,
              BITMAP_CELL * line.scale,
              BITMAP_CELL * line.scale
            );
          }
          x += g.width * line.scale;
        }
        y += line.height + gap;
      }
      tintBitmapCanvas(canvas, color);
    }

    function renderBitmapMode(){
      if (!bitmapReady) { loadBitmapFont().catch(()=>{}); return false; }
      const nodes = ensureBitmapNodes();
      const fs = parseFloat(getComputedStyle(timerDisplay).fontSize) || 64;
      const prefixScale = Math.max(1, Math.round((parseFloat(getComputedStyle(prefixText).fontSize) || fs) / BITMAP_CELL));
      const flashTime = st.flashPhase && (st.flashMode === 'time' || st.flashMode === 'all');
      const flashPrefix = st.flashPhase && (st.flashMode === 'prefix' || st.flashMode === 'all');
      const flashColor = '#ff0000';
      const prefixColor = flashPrefix ? flashColor : st.prefixColor;
      const faceColor = flashTime ? flashColor : resolveThemeClockColor(st.faceColor);
      const lineEls = [...timerDisplay.querySelectorAll('.clock-line')];
      if (lineEls.length){
        drawBitmapLines(nodes.tCanvas, lineEls.map(el => ({
          text: el.textContent || '',
          scale: Math.max(1, Math.round((parseFloat(getComputedStyle(el).fontSize) || fs) / BITMAP_CELL))
        })), faceColor);
      } else {
        const scale = Math.max(1, Math.round(fs / BITMAP_CELL));
        const face = formatFromTicks(st.remainingTicks);
        drawBitmapText(nodes.tCanvas, face, scale, faceColor);
      }
      if (st.style==='time') drawBitmapText(nodes.pCanvas, 'TIME', prefixScale, prefixColor);
      clockRow?.classList.add('bitmap-active');
      clockRow?.classList.toggle('bitmap-prefix-active', st.style==='time');
      return true;
    }

    function clearBitmapMode(){
      clockRow?.classList.remove('bitmap-active', 'bitmap-prefix-active');
    }

    /* ==== CONSTANTS / PRESETS ==== */
    const LS_KEY = 'stdtimer:v19';
    const HURRY_DIR = './hurryup/';
    const ICON_NORMAL = './icons/clock.png';
    const ICON_FLASH  = './icons/clock_red.png';

    const MARIO_IDS = new Set([
      './hurryup/Mario/hurryup-smbnes',
      './hurryup/Mario/hurryup-smbgen',
      './hurryup/Mario/hurryup-smb3',
      './hurryup/Mario/hurryup-smw',
      './hurryup/Mario/hurryup-nsmb',
      './hurryup/Mario/hurryup-sm3d',
      'hurryup-smbnes','hurryup-smbgen','hurryup-smb3','hurryup-smw','hurryup-nsmb','hurryup-sm3d'
    ]);

    const hurryUpPresets = {
      none: {
        label: 'None',
        sub: [
          { value: '', label: 'No Hurry', desc: 'No hurry up sound will play.' },
          { value: '__speedup__', label: 'Speed Up', desc: 'Speeds up the current music when Hurry Up starts.' }
        ]
      },
      mario: {
        label: 'Mario',
        sub: [
          { value: './hurryup/Mario/hurryup-smbnes', label: 'Super Mario Bros - NES', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Mario/hurryup-smbgen', label: 'Super Mario - Genesis', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Mario/hurryup-smb3',   label: 'Super Mario Bros 3', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Mario/hurryup-smw',    label: 'Super Mario World', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Mario/hurryup-nsmb',   label: 'New Super Mario Bros', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Mario/hurryup-sm3d',   label: 'Super Mario 3D Land', desc: 'Plays at Hurry Up start.' }
        ]
      },
      sonic: {
        label: 'Sonic',
        sub: [
          { value: './hurryup/Sonic/hurryup-soniclw', label: 'Sonic Lost World', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-GreenHillFinal', label: 'Sonic Rumble - Green Hill', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-ChemicalPlantFinal', label: 'Sonic Rumble - Chemical Plant', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-SkySanctuaryFinal', label: 'Sonic Rumble - Sky Sanctuary', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-SeasideHillFinal', label: 'Sonic Rumble - Seaside Hill', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-FrozenFactoryFinal', label: 'Sonic Rumble - Frozen Factory', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-LavaMountainFinal', label: 'Sonic Rumble - Lava Mountain', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-SilentForestFinal', label: 'Sonic Rumble - Silent Forest', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-StarlightCarnivalFinal', label: 'Sonic Rumble - Starlight Carnival', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-PinballCarnivalFinal', label: 'Sonic Rumble - Pinball Carnival', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-DesertRuinsFinal', label: 'Sonic Rumble - Desert Ruins', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-SweetMountainFinal', label: 'Sonic Rumble - Sweet Mountain', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-CityEscapeFinal', label: 'Sonic Rumble - City Escape', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-SpaceColonyARKFinal', label: 'Sonic Rumble - Space Colony ARK', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-PlanetWispFinal', label: 'Sonic Rumble - Planet Wisp', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-PopFineFinal', label: 'Sonic Rumble - Pop Fine', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-FantasyAdventureFinal', label: 'Sonic Rumble - Fantasy Adventure', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-FancyCuteFinal', label: 'Sonic Rumble - Fancy Cute', desc: 'Plays at Hurry Up start' },
          { value: './hurryup/Sonic/hurryup-sonicrumble-ShibuyaCrossingFinal', label: 'Sonic Rumble - Shibuya Crossing', desc: 'Plays at Hurry Up start.' }
        ]
      },
      ggd: {
        label: 'Goose Goose Duck',
        sub: [
          { value: './hurryup/Goose Goose Duck/hurryup-ggdsabo_retro', label: 'Sabotage - Retro', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Goose Goose Duck/hurryup-ggdsabo_ship', label: 'Sabotage - Ship', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Goose Goose Duck/hurryup-ggdsabo_victorian', label: 'Sabotage - Victorian', desc: 'Plays at Hurry Up start.' }
        ]
      },
      splatoon: {
        label: 'Splatoon',
        sub: [
          { value: './hurryup/Splatoon/now_or_never-1.mp3', label: 'Splatoon 1 - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-1bDanFourts.mp3', label: 'Splatoon 1 Beta - Dan Fourts', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-1e.mp3', label: 'Splatoon 1 Event - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-2.mp3', label: 'Splatoon 2 - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-2d.mp3', label: 'Splatoon 2 Demo - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-2e.mp3', label: 'Splatoon 2 Event - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-2f.mp3', label: 'Splatoon 2 Final Fest - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-3.mp3', label: 'Splatoon 3 - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-3e.mp3', label: 'Splatoon 3 Event - Now or Never!', desc: 'Plays at Hurry Up start.' },
          { value: './hurryup/Splatoon/now_or_never-3c.mp3', label: 'Splatoon 3 TableTurf - Now or Never!', desc: 'Plays at Hurry Up start.' }
        ]
      }
    };

    const SIZE_VW = { 1:3.5, 2:5, 3:8, 4:14, 5:22 };
    const DEFAULT_PREFIX_COLOR = '#ffff00';
    const DEFAULT_FACE_COLOR = '#ffffff';
    const clamp = (v,min,max) => Math.min(max, Math.max(min,v));
    const pad2  = n => String(n).padStart(2,'0');
    const normalizeColor = (value, fallback) => {
      const raw = String(value || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
      const rgb = raw.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
      if (rgb) {
        const parts = rgb.slice(1).map(n => clamp(parseInt(n, 10) || 0, 0, 255));
        return '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('');
      }
      return fallback;
    };
    const cssColorToHex = (value, fallback = DEFAULT_FACE_COLOR) => {
      const raw = String(value || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
      const probe = document.createElement('span');
      probe.style.color = raw;
      if (!probe.style.color) return fallback;
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      const rgb = computed.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
      if (!rgb) return fallback;
      return '#' + rgb.slice(1, 4).map(n => clamp(parseInt(n, 10) || 0, 0, 255).toString(16).padStart(2, '0')).join('');
    };
    const resolveThemeClockColor = color => {
      const normalized = String(color || '').trim().toLowerCase();
      if (!normalized || normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') {
        const rootStyles = getComputedStyle(document.documentElement);
        return rootStyles.getPropertyValue('--page-text').trim() || getComputedStyle(document.body).color || DEFAULT_FACE_COLOR;
      }
      return color;
    };
    const resolveThemeClockHex = color => cssColorToHex(resolveThemeClockColor(color), normalizeColor(color, DEFAULT_FACE_COLOR));

    /* ==== STATE ==== */
    const st = {
      tickBase:40,
      initialTicks:0,
      remainingTicks:0,
      direction:'from',
      running:false,
      lastMs:0,

      auto:false,
      showH:true,
      showM:true,
      showS:true,
      showT:true,

      style:'default',
      size:3,
      prefixColor:DEFAULT_PREFIX_COLOR,
      faceColor:DEFAULT_FACE_COLOR,

      flashMode:'nothing', // nothing | time | prefix | all
      flashType:'time',    // time | percent
      flashValue:'',       // allow empty => 1 minute default
      flashTimer:null,
      flashPhase:false,

      fontMode:'system',
      customFontFamily:'',
      customFontData:'',

      musicUrl:'',
      musicStatus:'unknown',
      ytId:'',
      ytReady:false,
      yt:null,
      ytAutoplayWhenReady:false,

      huKey:'none',
      huValue:'',
      huAudio:null,
      huPlayed:false,
      huVolume:1.0,

      tenSecondBeep:false,
      tenBeepLastSecond:null,

      modalX:0,
      modalY:0
    };

    /* ==== HELPERS ==== */
    const monoText = str => [...str].map(ch=>{
      const sep = (ch === ':' || ch === '.');
      return `<span class="monochar${sep?' monochar--sep':''}">${ch}</span>`;
    }).join('');

    function parseTimeToTicks(text, base){
      const s = (text || '').trim();
      if (!s) return 0;
      const parts = s.split(':');
      let h=0,m=0,sec=0,tt=0;

      if (parts.length===3){
        h = parseInt(parts[0],10)||0;
        m = parseInt(parts[1],10)||0;
        sec = parts[2];
      } else if (parts.length===2){
        m = parseInt(parts[0],10)||0;
        sec = parts[1];
      } else {
        sec = parts[0];
      }

      if (String(sec).includes('.')){
        const [ss,t] = String(sec).split('.');
        sec = parseInt(ss,10)||0;
        tt  = clamp(parseInt(t,10)||0,0,base-1);
      } else {
        sec = parseInt(sec,10)||0;
        tt  = 0;
      }
      return (h*3600 + m*60 + sec)*base + tt;
    }

    function formatFromTicks(ticks, base = st.tickBase){
      const t = Math.max(0, Math.floor(ticks));
      const totalSeconds = Math.floor(t/base);
      const tickPart = t % base;

      let sh,sm,ss,stt;
      if (st.auto){
        sh  = totalSeconds>=3600;
        sm  = sh || totalSeconds>=60;
        ss  = true;
        stt = !!st.showT;
      } else {
        sh  = !!st.showH;
        sm  = !!st.showM;
        ss  = !!st.showS;
        stt = !!st.showT;
      }

      const visibleUnits = [
        { show: sh, unit: 3600 },
        { show: sm, unit: 60 },
        { show: ss, unit: 1 }
      ].filter(part => part.show);

      const arr=[];
      let remainingSeconds = totalSeconds;
      visibleUnits.forEach((part, index) => {
        const value = Math.floor(remainingSeconds / part.unit);
        remainingSeconds -= value * part.unit;
        arr.push(part.unit === 3600 ? pad2(value) : (index === 0 ? String(value) : pad2(value)));
      });

      let out = arr.join(':');
      if (stt) out += (out?'.':'') + pad2(tickPart);
      if (!out) {
        const fallbackMinutes = Math.floor((totalSeconds % 3600) / 60);
        const fallbackSeconds = totalSeconds % 60;
        out = `${pad2(fallbackMinutes)}:${pad2(fallbackSeconds)}.${pad2(tickPart)}`;
      }
      return out;
    }

    function partsFromTicks(ticks, base = st.tickBase){
      const t = Math.max(0, Math.floor(ticks));
      const totalSeconds = Math.floor(t/base);
      const tickPart = t % base;
      const h = Math.floor(totalSeconds/3600);
      const m = Math.floor((totalSeconds%3600)/60);
      const s = totalSeconds%60;
      return { h:pad2(h), m:pad2(m), s:pad2(s), tt:pad2(tickPart), totalSeconds };
    }

    const timeLeftTicks = () =>
      st.direction === 'from' ? st.remainingTicks : Math.max(0, st.initialTicks - st.remainingTicks);

    function convertTicksPreserveLast(oldBase,newBase,ticks){
      const S = Math.floor(ticks/oldBase);
      const r = ticks%oldBase;
      const wasLast = r === (oldBase-1);

      let nt;
      if (wasLast){
        nt = S*newBase + (newBase-1);
      } else {
        const secs = ticks/oldBase;
        nt = Math.round(secs*newBase);
        if (nt%newBase===0 && r!==0) nt -= 1;
      }
      return Math.max(0, nt);
    }

    /* ==== RENDER (Size 4/5 spec) ==== */
    function render(){
      clearBitmapMode();
      if (prefixText) prefixText.style.display = (st.style==='time') ? 'block' : 'none';
      if (prefixIcon) prefixIcon.style.display = (st.style==='icon') ? 'block' : 'none';

      if (clockRow){
        if (st.size === 4 || st.size === 5){
          clockRow.classList.add('stacked');
          clockRow.setAttribute('data-size', String(st.size));
        } else {
          clockRow.classList.remove('stacked');
          clockRow.removeAttribute('data-size');
        }
      }

      if (st.size === 4){
        // [[PREFIX]] HH:MM / SS.TT
        const p = partsFromTicks(st.remainingTicks);
        const showHH = st.showH || (st.auto && p.totalSeconds >= 3600);
        const hhmm = showHH ? `${p.h}:${p.m}` : `${p.m}`;
        const sstt = `${p.s}${st.showT ? '.' + p.tt : ''}`;

        timerDisplay.innerHTML =
          `<div class="clock-line clock-line-large">${monoText(hhmm)}</div>` +
          `<div class="clock-line clock-line-small">${monoText(sstt)}</div>`;
        if (st.fontMode==='bitmap') renderBitmapMode();
        return;
      }

      if (st.size === 5){
        // [[PREFIX]] HH / MM / SS / TT
        const p = partsFromTicks(st.remainingTicks);
        const lines = [];
        if (st.showH) lines.push(`<div class="clock-line clock-line-xl">${monoText(p.h)}</div>`);
        if (st.showM) lines.push(`<div class="clock-line clock-line-xl">${monoText(p.m)}</div>`);
        if (st.showS) lines.push(`<div class="clock-line clock-line-small">${monoText(p.s)}</div>`);
        if (st.showT) lines.push(`<div class="clock-line clock-line-tiny">${monoText(p.tt)}</div>`);
        if (lines.length === 0){
          lines.push(`<div class="clock-line clock-line-xl">${monoText(p.m)}</div>`);
          lines.push(`<div class="clock-line clock-line-small">${monoText(p.s + (st.showT ? '.' + p.tt : ''))}</div>`);
        }
        timerDisplay.innerHTML = lines.join('');
        if (st.fontMode==='bitmap') renderBitmapMode();
        return;
      }

      timerDisplay.innerHTML = monoText(formatFromTicks(st.remainingTicks));
      if (st.fontMode==='bitmap') renderBitmapMode();
    }

    /* ==== SIZE ==== */
    function applySize(){
      document.documentElement.style.setProperty('--clock-vw', `${(SIZE_VW[st.size]||8)}vw`);
      if (sizeLabel) sizeLabel.textContent = String(st.size);
      save();
      render();
    }
    const sizeDelta = d => { st.size = clamp(st.size + d, 1, 5); applySize(); };

    function applyColours(){
      st.prefixColor = normalizeColor(st.prefixColor, DEFAULT_PREFIX_COLOR);
      st.faceColor = normalizeColor(st.faceColor, DEFAULT_FACE_COLOR);
      document.documentElement.style.setProperty('--timer-prefix-color', st.prefixColor);
      const resolvedFaceColor = resolveThemeClockColor(st.faceColor);
      document.documentElement.style.setProperty('--timer-face-color', resolvedFaceColor);

      if (prefixColorInput) prefixColorInput.value = st.prefixColor.toUpperCase();
      if (prefixColorPicker) prefixColorPicker.value = st.prefixColor;
      const faceUiColor = resolveThemeClockHex(st.faceColor);
      if (faceColorInput) faceColorInput.value = faceUiColor.toUpperCase();
      if (faceColorPicker) faceColorPicker.value = faceUiColor;

      if (st.fontMode === 'bitmap') renderBitmapMode();
    }

    function setTimerColour(kind, value){
      const fallback = kind === 'prefix' ? DEFAULT_PREFIX_COLOR : DEFAULT_FACE_COLOR;
      const next = normalizeColor(value, fallback);
      if (kind === 'prefix') st.prefixColor = next;
      else st.faceColor = next;
      applyColours();
      save();
    }

    /* ==== FLASH ==== */
    function stopFlash(){
      if (st.flashTimer){ clearInterval(st.flashTimer); st.flashTimer=null; }
      st.flashPhase=false;
      timerDisplay.classList.remove('flash-face');
      if (prefixText) prefixText.classList.remove('flash-prefix-text');
      if (st.style==='icon' && prefixIcon) prefixIcon.src = ICON_NORMAL;
      if (st.fontMode === 'bitmap') renderBitmapMode();
    }

    function parsePercentValue(raw){
      const s = (raw || '').toString().trim();
      if (!s) return null;
      if (s.includes('/')){
        const [a,b] = s.split('/').map(x => parseFloat(x));
        if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return (a/b)*100;
        return NaN;
      }
      if (s.endsWith('%')){
        const n = parseFloat(s.slice(0,-1));
        return Number.isFinite(n) ? n : NaN;
      }
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : NaN;
    }

    function computeFlashTrigger(){
      const base = st.tickBase;
      if (isSplatoonFixedLastMinute()){
        return Math.max(0, 60 * base);
      }

      const raw = (st.flashValue || '').trim();

      if (!raw){
        return Math.max(0, 60 * base);
      }

      const t = parseTimeToTicks(raw, base);
      const secAligned = Math.floor(t / base) * base;
      return Math.max(0, secAligned);
    }

    function applyFlashPhase(){
      const wantTime   = (st.flashMode==='time'   || st.flashMode==='all');
      const wantPrefix = (st.flashMode==='prefix' || st.flashMode==='all');

      timerDisplay.classList.toggle('flash-face', wantTime && st.flashPhase);

      if (wantPrefix){
        if (st.style === 'time' && prefixText){
          prefixText.classList.toggle('flash-prefix-text', st.flashPhase);
        } else if (st.style === 'icon' && prefixIcon){
          prefixIcon.src = st.flashPhase ? ICON_FLASH : ICON_NORMAL;
        }
      } else {
        if (prefixText) prefixText.classList.remove('flash-prefix-text');
        if (st.style === 'icon' && prefixIcon) prefixIcon.src = ICON_NORMAL;
      }

      if (st.fontMode === 'bitmap') renderBitmapMode();
    }

    function startFlashIfNeeded(){
      if (st.flashTimer || st.flashMode==='nothing') return;
      st.flashPhase = true;
      applyFlashPhase();

      st.flashTimer = setInterval(() => {
        if (!st.running) return;
        st.flashPhase = !st.flashPhase;
        applyFlashPhase();
      }, 333);
    }

    function syncMinuteState(){
      const trigger = computeFlashTrigger();
      const left = timeLeftTicks();
      if (left <= trigger) startFlashIfNeeded();
      else stopFlash();
    }

    /* ==== MUSIC / YT ==== */
    function stopAllBGM(){
      if (bgAudio && bgAudio.src){ try { bgAudio.pause(); } catch {} }
      if (st.yt && st.ytReady){ try { st.yt.pauseVideo(); } catch {} }
    }
    function stopBGMAndReset(){
      if (bgAudio && bgAudio.src){ try { bgAudio.pause(); bgAudio.currentTime=0; bgAudio.playbackRate=1; } catch {} }
      if (st.yt && st.ytReady){ try { st.yt.setPlaybackRate(1); st.yt.seekTo(0,true); st.yt.pauseVideo(); } catch {} }
    }
    function playBGM(){
      if (!st.running) return;
      if (bgAudio && bgAudio.src){ try { bgAudio.loop=true; bgAudio.playbackRate=1; bgAudio.play(); } catch {} }
      if (st.yt && st.ytReady){ try { st.yt.setPlaybackRate(1); st.yt.playVideo(); } catch {} }
    }

    function markYTReadyAndInit(){
      st.ytReady = true;
      if (st.ytId) ensureYT(st.ytId);
    }
    const __prevYTReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function(){
      try { if (typeof __prevYTReady === 'function') __prevYTReady(); } catch {}
      markYTReadyAndInit();
    };
function ensureYT(id){
      if (!id) return;
      if (ytWrap) ytWrap.style.display = 'block';

      if (st.yt){
        try { st.yt.loadVideoById(id); } catch {}
        return;
      }

      st.yt = new YT.Player('ytPlayer', {
        width:'100%', height:'100%', videoId:id,
        playerVars:{ rel:0, modestbranding:1, controls:1, playsinline:1, loop:1, playlist:id },
        events:{
          onReady: () => {
            if (st.running || st.ytAutoplayWhenReady){
              st.ytAutoplayWhenReady = false;
              try { st.yt.setPlaybackRate(1); st.yt.playVideo(); } catch {}
            }
          },
          onStateChange: (e) => {
            try {
              if (e.data === YT.PlayerState.ENDED && st.running){
                st.yt.seekTo(0,true);
                st.yt.playVideo();
              }
            } catch {}
          }
        }
      });
    }

    function looksLikeDirectAudio(u){ return /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(u); }
    function extractYTId(input) {
      const raw = (input || "").trim();
      if (!raw) return "";

      const fallback11 = () => {
        const m = raw.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:[?&/#]|$)/);
        return m ? m[1] : "";
      };

      let u;
      try { u = new URL(raw); }
      catch { return fallback11(); }

      const host = (u.hostname || "").replace(/^www\./, "").toLowerCase();

      if (host === "youtu.be") {
        const id = (u.pathname.split("/")[1] || "").trim();
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : fallback11();
      }

      if (host.endsWith("youtube.com")) {
        const v = u.searchParams.get("v");
        if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

        const parts = u.pathname.split("/").filter(Boolean);
        const i = parts.findIndex(p => ["shorts", "embed", "live"].includes(p));
        if (i !== -1) {
          const id = parts[i + 1] || "";
          if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
        }
        return fallback11();
      }

      return "";
    }


    /* ==== HURRY AUDIO ==== */
    function getHurryVolume(){
      const local = Number.isFinite(st.huVolume) ? st.huVolume : 1.0;
      const global = window.GSGlobal?.getEffectiveAudioVolume?.('hurry') ?? 1.0;
      return clamp(local * global, 0, 1);
    }

    function isSplatoonNowOrNever(value = st.huValue){
      return /\/hurryup\/Splatoon\/now_or_never-/i.test(String(value || ''));
    }

    function isSplatoonCardsNowOrNever(value = st.huValue){
      return /\/hurryup\/Splatoon\/now_or_never-3c\.mp3(?:[?#].*)?$/i.test(String(value || ''));
    }

    function isSplatoonFixedLastMinute(value = st.huValue){
      return isSplatoonNowOrNever(value) && !isSplatoonCardsNowOrNever(value);
    }

    function shouldLetHurryUpFinish(){
      return st.huAudio && isSplatoonFixedLastMinute();
    }

    const stopHU = () => {
      if (st.huAudio){
        try { st.huAudio.pause(); } catch {}
        st.huAudio = null;
      }
    };

    async function doHurryUp(){
      if (!st.huValue) return;

      stopHU();

      const basePath = String(st.huValue).trim();

      if (basePath === '__speedup__') {
        if (st.yt && st.ytReady) {
          try { st.yt.setPlaybackRate(1.25); st.yt.playVideo(); } catch {}
        }
        if (bgAudio && bgAudio.src) {
          try { bgAudio.playbackRate = 1.25; if (st.running) bgAudio.play(); } catch {}
        }
        return;
      }

      // Goose Goose Duck (Ship) should OVERLAY on top of whatever music is playing.
      // Everything else keeps existing behavior (stop/pause/restart rules).
      const isGGDShip = /ggdsabo_ship$/i.test(basePath) || /\/hurryup-ggdsabo_ship$/i.test(basePath);

      const wasBGMPlaying =
        (bgAudio && bgAudio.src && !bgAudio.paused) ||
        (st.yt && st.ytReady && (() => { try { return st.yt.getPlayerState() === YT.PlayerState.PLAYING; } catch { return false; } })());

      if (wasBGMPlaying && !isGGDShip) stopAllBGM();
      const url = basePath.endsWith('.mp3') ? basePath : (basePath + '.mp3');

      const a = new Audio(url);
      a.preload = 'auto';
      a.volume = getHurryVolume();

      const isMario = MARIO_IDS.has(st.huValue) || MARIO_IDS.has(basePath.replace(/^.*\/(hurryup-[^\/]+)$/, '$1'));
      const isSplatoonFinisher = isSplatoonFixedLastMinute(basePath);
      // Mario: pause music, play HU once, then restart music at 1.25x.
      // GGD Ship: overlay HU once (do NOT stop music).
      // Splatoon Now or Never: play through once so the finishing chords can land.
      a.loop = !(isMario || isGGDShip || isSplatoonFinisher);

      st.huAudio = a;

      try { await a.play(); } catch { st.huAudio = null; return; }
      a.addEventListener('ended', () => {
        if (st.huAudio === a) st.huAudio = null;
      }, { once:true });

      if (isMario){
        a.addEventListener('ended', () => {
          if (!st.running) return;
          if (st.yt && st.ytReady){
            try { st.yt.setPlaybackRate(1.25); st.yt.seekTo(0,true); st.yt.playVideo(); } catch {}
          } else if (bgAudio && bgAudio.src){
            try { bgAudio.playbackRate=1.25; bgAudio.currentTime=0; bgAudio.play(); } catch {}
          }
        }, { once:true });
      }
    }

    async function playTenSecondBeep(){
      try {
        const a = new Audio(`${HURRY_DIR}time_warning.wav`);
        a.volume = 1.0;
        a.preload='auto';
        await a.play();
      } catch {}
    }

    /* ==== PERSISTENCE ==== */
    function save(){
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          tickBase:st.tickBase, initial:st.initialTicks, remaining:st.remainingTicks, direction:st.direction,
          auto:st.auto, showH:st.showH, showM:st.showM, showS:st.showS, showT:st.showT,
          style:st.style, size:st.size,
          prefixColor:st.prefixColor, faceColor:st.faceColor,
          flashMode:st.flashMode, flashType:st.flashType, flashValue:st.flashValue,
          fontMode:st.fontMode, customFontFamily:st.customFontFamily, customFontData:st.customFontData,
          musicUrl:st.musicUrl, ytId:st.ytId,
          huKey:st.huKey, huValue:st.huValue, huVolume:st.huVolume,
          tenSecondBeep:st.tenSecondBeep,
          modalX:st.modalX, modalY:st.modalY
        }));
      } catch {}
    }

    function load(){
      try {
        const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        st.tickBase = clamp(parseInt(d.tickBase || 40,10),10,100);
        const def = 9*60*st.tickBase + 59*st.tickBase + (st.tickBase-1);
        st.initialTicks   = Number.isFinite(d.initial)   ? d.initial   : def;
        st.remainingTicks = Number.isFinite(d.remaining) ? d.remaining : st.initialTicks;
        st.direction      = (d.direction === 'to' ? 'to' : 'from');
        st.auto  = !!d.auto;
        st.showH = d.showH !== false;
        st.showM = d.showM !== false;
        st.showS = d.showS !== false;
        st.showT = d.showT !== false;
        st.style = d.style || 'default';
        st.size  = clamp(parseInt(d.size || 3,10),1,5);
        st.prefixColor = normalizeColor(d.prefixColor, DEFAULT_PREFIX_COLOR);
        st.faceColor = normalizeColor(d.faceColor, DEFAULT_FACE_COLOR);
        st.flashMode  = d.flashMode || 'nothing';
        st.flashType  = d.flashType || 'time';
        st.flashValue = ('flashValue' in d) ? (d.flashValue || '') : '';
        st.fontMode         = d.fontMode || 'system';
        st.customFontFamily = d.customFontFamily || '';
        st.customFontData   = d.customFontData   || '';
        st.musicUrl = d.musicUrl || '';
        st.ytId     = d.ytId     || '';
        st.huKey    = d.huKey   || 'none';
        st.huValue  = d.huValue || '';
        st.huVolume = Number.isFinite(d.huVolume) ? d.huVolume : 1.0;
        st.tenSecondBeep = !!d.tenSecondBeep;
        st.modalX = parseFloat(d.modalX || 0);
        st.modalY = parseFloat(d.modalY || 0);
      } catch {}
    }

    /* ==== DIRECTION ==== */
    function updateDirectionUI(){
      if (!directionBtn2 || !directionTarget2 || !directionEnds2) return;
      directionBtn2.textContent = st.direction.toUpperCase();
      const target = formatFromTicks(st.initialTicks);
      directionTarget2.textContent = target;
      directionEnds2.textContent   = (st.direction==='from') ? '00:00:00.00' : target;
    }

    function flipDirection(){
      if (st.running) return;
      st.direction = (st.direction === 'from') ? 'to' : 'from';
      st.remainingTicks = (st.direction==='from') ? st.initialTicks : 0;
      st.huPlayed=false;
      st.tenBeepLastSecond=null;
      stopHU(); stopFlash();
      updateDirectionUI(); render(); save(); syncMinuteState();
    }

    /* ==== ENGINE ==== */
    function start(){
      if (st.running) return;
      if (st.direction==='from' && st.remainingTicks<=0) return;
      if (st.direction==='to'   && st.remainingTicks>=st.initialTicks) return;

      st.running=true;
      st.lastMs=performance.now();
      startPauseBtn.textContent='Pause';

      if (st.ytId && !st.ytReady) st.ytAutoplayWhenReady = true;
      playBGM();

      const trigger = computeFlashTrigger();
      const left = timeLeftTicks();
      if (!st.huPlayed && st.huValue && left <= trigger){
        st.huPlayed=true;
        doHurryUp();
      }

      syncMinuteState();
      tick();
    }

    function pause(){
      if (!st.running) return;
      st.running=false;
      startPauseBtn.textContent='Start';
      stopFlash(); stopAllBGM(); stopHU();
    }

    function reset(){
      pause();
      st.remainingTicks = (st.direction==='from') ? st.initialTicks : 0;
      st.huPlayed=false;
      st.tenBeepLastSecond=null;
      stopHU(); stopFlash();
      stopBGMAndReset();
      render(); save(); syncMinuteState();
    }

    function endReached(){
      if (!shouldLetHurryUpFinish()) stopHU();
      stopFlash(); stopAllBGM();
      st.running=false;
      startPauseBtn.textContent='Start';
      save();
    }

    function tick(){
      if (!st.running) return;
      const now=performance.now();
      const elapsed=now - st.lastMs;
      const ticks=Math.floor(elapsed * st.tickBase / 1000);

      if (ticks>0){
        if (st.direction==='from') st.remainingTicks=Math.max(0, st.remainingTicks - ticks);
        else st.remainingTicks=Math.min(st.initialTicks, st.remainingTicks + ticks);

        st.lastMs += ticks * 1000 / st.tickBase;

        syncMinuteState();

        const trigger=computeFlashTrigger();
        const left=timeLeftTicks();
        if (!st.huPlayed && st.huValue && left <= trigger){
          st.huPlayed=true;
          doHurryUp();
        }

        if (st.tenSecondBeep){
          const secsLeft = Math.ceil(left / st.tickBase);
          if (secsLeft <= 11 && secsLeft >= 1 && secsLeft !== st.tenBeepLastSecond){
            st.tenBeepLastSecond = secsLeft;
            playTenSecondBeep();
          }
        }

        const done = (st.direction==='from') ? (st.remainingTicks<=0) : (st.remainingTicks>=st.initialTicks);
        if (done){
          render();
          endReached();
          return;
        }

        render(); save();
      }

      requestAnimationFrame(tick);
    }

    /* ==== EDIT ==== */
    const atStart = () => (st.direction==='from') ? (st.remainingTicks===st.initialTicks) : (st.remainingTicks===0);

    function enterEdit(){
      if (st.running || !atStart()) return;
      timerInput.value = formatFromTicks(st.initialTicks);
      document.body.classList.add('editing');
      timerInput.style.display='block';
      timerInput.focus();
      try { timerInput.select(); } catch {}
    }

    function commitEdit(){
      const nv=parseTimeToTicks(timerInput.value, st.tickBase);
      if (Number.isFinite(nv) && nv>=0){
        st.initialTicks=nv;
        st.remainingTicks=(st.direction==='from') ? st.initialTicks : 0;
        st.huPlayed=false;
        st.tenBeepLastSecond=null;
        stopHU(); stopFlash();
        updateDirectionUI();
        save(); render(); syncMinuteState();
      }
      timerInput.style.display='none';
      document.body.classList.remove('editing');
    }

    /* ==== MODAL ==== */
    function setModalOffset(x=0,y=0){
      st.modalX=x; st.modalY=y;
      modalCard.style.setProperty('--modal-x', `${x}px`);
      modalCard.style.setProperty('--modal-y', `${y}px`);
      modalCard.style.transform = 'translate(-50%,-50%) translate(var(--modal-x), var(--modal-y))';
      save();
    }
    const centerModal = () => setModalOffset(0,0);

    function showPage(name,{recenter=false}={}){
      Object.values(pages).forEach(p => p && p.classList.remove('active'));
      const page = pages[name] || pages.main;
      if (page) page.classList.add('active');
      if (recenter) centerModal();
    }

    (() => {
      let dragging=false,sx=0,sy=0,bx=0,by=0;
      const isInteractive = el =>
        el && (['INPUT','SELECT','BUTTON','A','LABEL','TEXTAREA','AUDIO','IFRAME'].includes(el.tagName) ||
        el.closest('.status-tip'));
      const clearSelection = () => { try { window.getSelection?.().removeAllRanges?.(); } catch {} };
      const setDragLock = on => {
        document.documentElement.classList.toggle('gs-modal-dragging', on);
        document.body.classList.toggle('modal-dragging', on);
        document.body.style.userSelect = on ? 'none' : '';
        clearSelection();
      };
      const dragTo = (x, y) => {
        setModalOffset(x, y);
        clearSelection();
      };
      modalCard.addEventListener('mousedown', e => {
        if (isInteractive(e.target)) return;
        dragging=true; e.preventDefault();
        sx=e.clientX; sy=e.clientY;
        bx=st.modalX; by=st.modalY;
        setDragLock(true);
      });
      window.addEventListener('mousemove', e => {
        if (!dragging) return;
        dragTo(bx + (e.clientX - sx), by + (e.clientY - sy));
        e.preventDefault();
      });
      ['mouseup','mouseleave'].forEach(t => window.addEventListener(t, () => {
        if (!dragging) return;
        dragging=false;
        setDragLock(false);
      }));
      modalCard.addEventListener('touchstart', ev => {
        const t=ev.touches[0];
        if (!t || isInteractive(ev.target)) return;
        dragging=true; sx=t.clientX; sy=t.clientY; bx=st.modalX; by=st.modalY;
        setDragLock(true);
        ev.preventDefault();
      }, { passive:false });
      window.addEventListener('touchmove', ev => {
        if (!dragging) return;
        ev.preventDefault();
        const t=ev.touches[0];
        if (!t) return;
        dragTo(bx + (t.clientX - sx), by + (t.clientY - sy));
      }, { passive:false });
      window.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging=false;
        setDragLock(false);
      });
      window.addEventListener('touchcancel', () => {
        if (!dragging) return;
        dragging=false;
        setDragLock(false);
      });
    })();

    /* ==== FONTS ==== */
    function injectCustomFace(){
      if (!st.customFontData || !st.customFontFamily) return;
      const id='face-customFont';
      const old=document.getElementById(id);
      if (old) old.remove();
      const el=document.createElement('style');
      el.id=id;
      el.textContent=`@font-face{font-family:'${st.customFontFamily}';src:url('${st.customFontData}');font-display:swap;}`;
      document.head.appendChild(el);
    }
    function ensureDefaultFontFace(){
      const id='face-fancycatpx';
      if (document.getElementById(id)) return;
      const el=document.createElement('style');
      el.id=id;
      el.textContent=`@font-face{font-family:'GSFancyCatPX';src:url('${window.GSGlobal?.globalsBase ? new URL('fonts/FancyCatPX.ttf', window.GSGlobal.globalsBase).href : './fonts/FancyCatPX.ttf'}');font-display:swap;}`;
      document.head.appendChild(el);
    }
    function getThemeFontStack(){
      const root = getComputedStyle(document.documentElement);
      const themeFont = (root.getPropertyValue('--theme-font-family') || '').trim();
      return themeFont ? `'${themeFont.replace(/^['"]|['"]$/g,'')}', ${window.GSGlobal?.getSystemFontStack?.() || 'system-ui, Arial, sans-serif'}` : '';
    }

    function applyClockFontStack(stack){
      const resolved = stack || (window.GSGlobal?.getSystemFontStack?.() || 'system-ui, Arial, sans-serif');
      document.documentElement.style.setProperty('--clock-face-font', resolved);
    }

    function applyFont(mode){
      st.fontMode=mode;
      if (mode==='bitmap'){
        loadBitmapFont().catch(()=>{});
        applyClockFontStack(window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif");
      } else if (mode==='custom'){
        if (st.customFontFamily && st.customFontData) {
          injectCustomFace();
          applyClockFontStack(`'${st.customFontFamily}', ${window.GSGlobal?.getSystemFontStack?.() || 'system-ui, Arial, sans-serif'}`);
        } else {
          applyClockFontStack(window.GSGlobal?.getClockFontStack?.('custom') || window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif");
        }
      } else if (mode==='default'){
        ensureDefaultFontFace();
        const themeStack = getThemeFontStack();
        applyClockFontStack(themeStack || (window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif"));
      } else {
        applyClockFontStack(window.GSGlobal?.getSystemFontStack?.() || 'system-ui, Arial, sans-serif');
      }
      if (mode !== 'bitmap') clearBitmapMode();
      save();
    }

    // ✅ FIXED: import click can’t double-trigger now (prevents label propagation too)
    if (importFontBtn && customFontInput) {
      importFontBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        customFontInput.click();
      });

      customFontInput.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const family = f.name.replace(/\.(ttf|otf|woff2?)$/i,'');
        const reader = new FileReader();
        reader.onload = () => {
          st.customFontFamily = family || 'CustomFont';
          st.customFontData   = reader.result;
          injectCustomFace();
          applyFont('custom');
          if (customFontName) customFontName.textContent = `Loaded: ${st.customFontFamily}`;
          if (customFontNotice) customFontNotice.style.display='block';
        };
        reader.readAsDataURL(f);
      });
    }
    if (fontSelect){
      fontSelect.addEventListener('change', () => {
        applyFont(fontSelect.value);
        render();
        applyFlashPhase();
      });
    }

    /* ==== HURRY MENU ==== */
    function populateHurryUp(){
      if (!hurryUpMain || !hurryUpSub) return;

      const set = (sel,opts) => {
        sel.innerHTML='';
        opts.forEach(o => {
          const e=document.createElement('option');
          e.value=o.value; e.textContent=o.label;
          sel.appendChild(e);
        });
      };

      const groups = Object.entries(hurryUpPresets).map(([k,v]) => ({ value:k, label:v.label }));
      set(hurryUpMain, groups);

      function refreshSub({ keepValue=false }={}){
        const g = hurryUpPresets[hurryUpMain.value] || hurryUpPresets.none;
        const prior = keepValue ? st.huValue : '';
        set(hurryUpSub, g.sub.map(s => ({ value:s.value, label:s.label })));
        if (keepValue && prior && g.sub.some(s => s.value===prior)) hurryUpSub.value=prior;
        else hurryUpSub.value=g.sub[0]?.value || '';
        const d = g.sub.find(s => s.value===hurryUpSub.value) || g.sub[0];
        if (hurryUpDesc) hurryUpDesc.textContent = d?.desc || '';
        st.huKey=hurryUpMain.value;
        st.huValue=hurryUpSub.value;
        updateFlashControls();
        save();
      }

      hurryUpMain.addEventListener('change', () => refreshSub({ keepValue:false }));
      hurryUpSub.addEventListener('change', () => {
        const g = hurryUpPresets[hurryUpMain.value] || hurryUpPresets.none;
        const d = g.sub.find(s => s.value===hurryUpSub.value) || g.sub[0];
        if (hurryUpDesc) hurryUpDesc.textContent = d?.desc || '';
        st.huKey=hurryUpMain.value;
        st.huValue=hurryUpSub.value;
        updateFlashControls();
        stopFlash();
        syncMinuteState();
        save();
      });

      hurryUpMain.value = (st.huKey in hurryUpPresets) ? st.huKey : 'none';
      refreshSub({ keepValue:true });
    }

    function updateFlashControls(){
      if (!flashValueIn) return;
      const fixed = isSplatoonFixedLastMinute();
      flashValueIn.disabled = fixed;
      flashValueIn.placeholder = fixed ? 'Fixed: 00:01:00 (One Minute)' : 'Default: 00:01:00 (One Minute)';
      if (fixed) flashValueIn.value = '';
    }

    /* ==== INIT ==== */
    st.initialTicks = 9*60*st.tickBase + 59*st.tickBase + (st.tickBase-1);
    load();
    try { if (!localStorage.getItem(LS_KEY)) { st.fontMode = window.GSGlobal?.getClockFontMode?.() || st.fontMode; } } catch {}

    if (sizeLabel) sizeLabel.textContent=String(st.size);
    if (fontSelect) fontSelect.value=st.fontMode;

    if (showAuto)    showAuto.checked=!!st.auto;
    if (showHours)   showHours.checked=st.showH !== false;
    if (showMinutes) showMinutes.checked=st.showM !== false;
    if (showSeconds) showSeconds.checked=st.showS !== false;
    if (showTicks)   showTicks.checked=st.showT !== false;

    if (tpsSelect) tpsSelect.value=String(st.tickBase);
    if (styleSelect) styleSelect.value=st.style;

    if (flashModeSel) flashModeSel.value=st.flashMode || 'nothing';
    if (flashTypeSel) flashTypeSel.value=st.flashType || 'time';
    if (flashValueIn) flashValueIn.value=st.flashValue || '';

    if (hurryVolumeSel){
      const pct = Math.round(clamp((Number.isFinite(st.huVolume)?st.huVolume:1)*100,0,100));
      hurryVolumeSel.value=String(pct);
      if (hurryVolumeLabel) hurryVolumeLabel.textContent=`${pct}%`;
    }
    if (tenSecondBeepToggle) tenSecondBeepToggle.checked=!!st.tenSecondBeep;

    document.addEventListener('gs:theme-assets-changed', () => { if (st.fontMode==='bitmap') { resetBitmapFont(); loadBitmapFont().catch(()=>{}); } });
    applyFont(st.fontMode);
    applyColours();
    document.documentElement.style.setProperty('--clock-vw', `${(SIZE_VW[st.size]||8)}vw`);
    render();
    populateHurryUp();
    updateFlashControls();
    updateDirectionUI();
    setModalOffset(st.modalX || 0, st.modalY || 0);
    save();
    syncMinuteState();

    /* ==== EVENTS ==== */
    settingsBtn.addEventListener('click', () => {
      const showing=settingsModal.classList.contains('show');
      if (showing){
        settingsModal.classList.remove('show');
        settingsModal.setAttribute('aria-hidden','true');
      } else {
        settingsModal.classList.add('show');
        settingsModal.setAttribute('aria-hidden','false');
        showPage('main',{recenter:true});
        centerModal();
      }
    });
    closeSettings && closeSettings.addEventListener('click', () => {
      settingsModal.classList.remove('show');
      settingsModal.setAttribute('aria-hidden','true');
    });

    openStyle && openStyle.addEventListener('click', () => showPage('style'));
    openColours && openColours.addEventListener('click', () => showPage('colours'));
    openHurry && openHurry.addEventListener('click', () => showPage('hurry'));
    backFromStyle && backFromStyle.addEventListener('click', () => showPage('main'));
    backFromColours && backFromColours.addEventListener('click', () => showPage('main'));
    backFromHurry && backFromHurry.addEventListener('click', () => showPage('main'));

    startPauseBtn.addEventListener('click', () => (st.running ? pause() : start()));
    resetBtn.addEventListener('click', reset);

    timerDisplay.addEventListener('click', enterEdit);
    timerInput.addEventListener('keydown', e => {
      if (e.key==='Enter') commitEdit();
      if (e.key==='Escape'){
        timerInput.style.display='none';
        document.body.classList.remove('editing');
      }
    });
    timerInput.addEventListener('blur', commitEdit);

    showAuto && showAuto.addEventListener('change', () => { st.auto=!!showAuto.checked; save(); render(); });
    showHours && showHours.addEventListener('change', () => { st.showH=!!showHours.checked; save(); render(); });
    showMinutes && showMinutes.addEventListener('change', () => { st.showM=!!showMinutes.checked; save(); render(); });
    showSeconds && showSeconds.addEventListener('change', () => { st.showS=!!showSeconds.checked; save(); render(); });
    showTicks && showTicks.addEventListener('change', () => { st.showT=!!showTicks.checked; save(); render(); });

    tpsSelect && tpsSelect.addEventListener('change', () => {
      const nb=clamp(parseInt(tpsSelect.value,10),10,100);
      if (nb===st.tickBase) return;
      const ob=st.tickBase;
      st.initialTicks   = convertTicksPreserveLast(ob, nb, st.initialTicks);
      st.remainingTicks = convertTicksPreserveLast(ob, nb, st.remainingTicks);
      st.remainingTicks = Math.max(0, Math.min(st.remainingTicks, st.initialTicks));
      st.tickBase=nb;
      st.lastMs=performance.now();
      st.huPlayed=false;
      stopFlash(); stopHU();
      save(); render(); updateDirectionUI(); syncMinuteState();
      if (st.running){
        const trigger=computeFlashTrigger();
        const left=timeLeftTicks();
        if (!st.huPlayed && st.huValue && left <= trigger){
          st.huPlayed=true;
          doHurryUp();
        }
      }
    });

    sizePrev && sizePrev.addEventListener('click', () => sizeDelta(-1));
    sizeNext && sizeNext.addEventListener('click', () => sizeDelta(+1));

    styleSelect && styleSelect.addEventListener('change', () => { st.style=styleSelect.value; save(); render(); });

    prefixColorInput && prefixColorInput.addEventListener('change', () => setTimerColour('prefix', prefixColorInput.value));
    prefixColorPicker && prefixColorPicker.addEventListener('input', () => setTimerColour('prefix', prefixColorPicker.value));
    faceColorInput && faceColorInput.addEventListener('change', () => setTimerColour('face', faceColorInput.value));
    faceColorPicker && faceColorPicker.addEventListener('input', () => setTimerColour('face', faceColorPicker.value));
    resetColoursBtn && resetColoursBtn.addEventListener('click', () => {
      st.prefixColor = DEFAULT_PREFIX_COLOR;
      st.faceColor = DEFAULT_FACE_COLOR;
      applyColours();
      save();
    });

    flashModeSel && flashModeSel.addEventListener('change', () => { st.flashMode=flashModeSel.value; stopFlash(); save(); syncMinuteState(); });
    flashTypeSel && flashTypeSel.addEventListener('change', () => { st.flashType=flashTypeSel.value; stopFlash(); save(); syncMinuteState(); });
    flashValueIn && flashValueIn.addEventListener('input', () => { st.flashValue=isSplatoonFixedLastMinute() ? '' : (flashValueIn.value || ''); stopFlash(); save(); syncMinuteState(); });

    directionBtn2 && directionBtn2.addEventListener('click', flipDirection);

    if (hurryVolumeSel){
      const applyVol = (event) => {
        const pct = clamp(parseInt(hurryVolumeSel.value,10) || 0, 0, 100);
        hurryVolumeSel.value = String(pct);
        st.huVolume = pct / 100;
        if (hurryVolumeLabel) hurryVolumeLabel.textContent = `${pct}%`;
        if (st.huAudio){ try { st.huAudio.volume = getHurryVolume(); } catch {} }
        if (event) {
          event.gsSoundHandled = true;
          window.GSGlobal?.playSliderSound?.('hurry', st.huVolume);
        }
        save();
      };
      hurryVolumeSel.addEventListener('input', applyVol);
      hurryVolumeSel.addEventListener('change', applyVol);
    }

    if (tenSecondBeepToggle){
      tenSecondBeepToggle.addEventListener('change', () => { st.tenSecondBeep=!!tenSecondBeepToggle.checked; st.tenBeepLastSecond=null; save(); });
    }

/* ==== MUSIC UI + STATUS + SUBMIT (RESTORED) ==== */
const statusMap = {
  unknown: { icon: './icons/question.png', tip: 'No music' },
  loading: { icon: './icons/wait.gif',     tip: 'Fetching URL...' },
  saved:   { icon: './icons/check.png',    tip: 'URL saved' },
  invalid: { icon: './icons/cross.png',    tip: 'Invalid URL' }
};

function setMusicStatus(s){
  st.musicStatus = s;
  const m = statusMap[s] || statusMap.unknown;
  if (musicStatusIcon) musicStatusIcon.src = m.icon;
  if (musicStatusTip)  musicStatusTip.textContent = m.tip;
}

function showStatusTip(){
  if (!musicStatusBtn || !musicStatusTip) return;
  const r = musicStatusBtn.getBoundingClientRect();
  musicStatusTip.style.position = 'fixed';
  musicStatusTip.style.left = `${r.left + r.width / 2}px`;
  musicStatusTip.style.top  = `${r.top - 10}px`;
  musicStatusTip.style.transform = 'translate(-50%, -100%)';
  musicStatusTip.style.display = 'block';
  musicStatusTip.style.zIndex = '999999';
}
function hideStatusTip(){
  if (musicStatusTip) musicStatusTip.style.display = 'none';
}

if (musicStatusBtn){
  musicStatusBtn.addEventListener('mouseenter', showStatusTip);
  musicStatusBtn.addEventListener('mouseleave', hideStatusTip);
  musicStatusBtn.addEventListener('focus', showStatusTip);
  musicStatusBtn.addEventListener('blur', hideStatusTip);
  // Mobile: tap to show, tap elsewhere to hide
  musicStatusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!musicStatusTip) return;
    if (musicStatusTip.style.display === 'block') hideStatusTip();
    else showStatusTip();
  });
  document.addEventListener('click', hideStatusTip);
}

/* YouTube helpers */
let ytReadyPoll = null;

function waitForYouTubeReady(id){
  if (!id) return;
  if (ytReadyPoll) clearInterval(ytReadyPoll);
  let tries = 0;
  ytReadyPoll = setInterval(() => {
    if (window.YT && window.YT.Player) {
      clearInterval(ytReadyPoll);
      ytReadyPoll = null;
      st.ytReady = true;
      ensureYT(id);
      return;
    }
    tries += 1;
    if (tries >= 80) {
      clearInterval(ytReadyPoll);
      ytReadyPoll = null;
      setMusicStatus('invalid');
    }
  }, 250);
}

function ensureYouTubeAPI(){
  if (window.YT && window.YT.Player) {
    st.ytReady = true;
    return;
  }
  if (document.getElementById('yt-iframe-api')) return;
  const s = document.createElement('script');
  s.id = 'yt-iframe-api';
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

// onYouTubeIframeAPIReady already chained above

function ensureYT(id){
  if (!id) return;
  ensureYouTubeAPI();
  if (ytWrap) ytWrap.style.display = 'block';

  // If API not ready yet, wait
  if (!window.YT || !window.YT.Player) {
    waitForYouTubeReady(id);
    return;
  }

  if (st.yt){
    try { st.yt.loadVideoById(id); } catch {}
    return;
  }

  st.yt = new YT.Player('ytPlayer', {
    width: '100%',
    height: '100%',
    videoId: id,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      controls: 1,
      playsinline: 1,
      loop: 1,
      playlist: id
    },
    events: {
      onReady: () => {
        // Only play if timer is running (or we queued autoplay)
        if (st.running || st.ytAutoplayWhenReady){
          st.ytAutoplayWhenReady = false;
          try { st.yt.setPlaybackRate(1); st.yt.playVideo(); } catch {}
        }
      },
      onStateChange: (e) => {
        // Loop reliably even if loop param fails for some videos
        try {
          if (e.data === YT.PlayerState.ENDED && st.running) {
            st.yt.seekTo(0, true);
            st.yt.playVideo();
          }
        } catch {}
      },
      onError: () => {
        // Mark invalid and hide player
        setMusicStatus('invalid');
        try { st.yt.destroy(); } catch {}
        st.yt = null;
        st.ytId = '';
        if (ytWrap) ytWrap.style.display = 'none';
      }
    }
  });
}

function clearYT(){
  if (st.yt){
    try { st.yt.destroy(); } catch {}
    st.yt = null;
  }
  st.ytId = '';
  if (ytWrap) ytWrap.style.display = 'none';
}

function clearAudio(){
  if (!bgAudio) return;
  try {
    bgAudio.pause();
    bgAudio.currentTime = 0;
    bgAudio.playbackRate = 1;
    bgAudio.removeAttribute('src');
    bgAudio.load();
  } catch {}
  bgAudio.style.display = 'none';
}

function applyMusicUrl(url){
  const u = (url || '').trim();

  if (!musicUrlInput || !musicUrlSubmit || !bgAudio) return;

  if (!u){
    st.musicUrl = '';
    setMusicStatus('unknown');
    clearAudio();
    clearYT();
    save();
    return;
  }

  // validate URL
  try { new URL(u); }
  catch { setMusicStatus('invalid'); return; }

  st.musicUrl = u;

  const ytId = extractYTId(u);
  if (ytId){
    // YouTube mode
    clearAudio();
    st.ytId = ytId;
    ensureYT(ytId);

    // Show immediately, but only play when running
    if (st.running && st.ytReady && st.yt){
      try { st.yt.setPlaybackRate(1); st.yt.playVideo(); } catch {}
    } else {
      st.ytAutoplayWhenReady = st.running; // if running, play once ready
    }

    setMusicStatus('saved');
    save();
    return;
  }

  if (looksLikeDirectAudio(u)){
    // Direct audio mode
    clearYT();
    try {
      bgAudio.src = u;
      bgAudio.loop = true;
      bgAudio.style.display = 'block';
      // play only if running
      if (st.running){
        try { bgAudio.playbackRate = 1; bgAudio.play(); } catch {}
      }
    } catch {}
    setMusicStatus('saved');
    save();
    return;
  }

  // Anything else = invalid
  clearAudio();
  clearYT();
  setMusicStatus('invalid');
  save();
}

/* Wire music inputs */
if (musicUrlInput){
  musicUrlInput.addEventListener('input', () => setMusicStatus('loading'));
}
if (musicUrlSubmit){
  musicUrlSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    applyMusicUrl(musicUrlInput ? musicUrlInput.value : '');
  });
}

/* Restore saved music on load (show player immediately, but do not autoplay unless running) */
if (musicUrlInput && st.musicUrl){
  musicUrlInput.value = st.musicUrl;
  applyMusicUrl(st.musicUrl);
} else {
  setMusicStatus('unknown');
}

  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
