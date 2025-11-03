// ======================= Timer (Standard) — stable boot + reliable fonts =======================
(() => {
  if (window.__STD_TIMER_BOOTED__) return;
  window.__STD_TIMER_BOOTED__ = true;

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();

  function boot() {
    // ---------------- DOM ----------------
    const $ = (id) => document.getElementById(id);

    const timerInput     = $('timerInput');
    const timerDisplay   = $('timerDisplay');
    const startPauseBtn  = $('startPauseBtn');
    const resetBtn       = $('resetBtn');

    const settingsBtn    = $('settingsBtn');
    const settingsModal  = $('settingsModal');
    const closeSettings  = $('closeSettings');

    const showAuto       = $('showAuto');
    const showHours      = $('showHours');
    const showMinutes    = $('showMinutes');
    const showSeconds    = $('showSeconds');
    const showTicks      = $('showTicks');

    const tpsSelect      = $('tpsSelect');

    const musicUrlInput  = $('musicUrlInput');
    const musicUrlSubmit = $('musicUrlSubmitBtn');

    const hurryUpMain    = $('hurryUpMain');
    const hurryUpSub     = $('hurryUpSub');
    const hurryUpDesc    = $('hurryUpDesc');
    const disableFlashCB = $('disableFlash');

    const fontSelect       = $('fontSelect');
    const importFontBtn    = $('importCustomFont');
    const customFontInput  = $('customFontFile');
    const customFontName   = $('customFontName');
    const customFontNotice = $('customFontNotice');

    // Make absolutely sure the edit input starts hidden and cannot eat clicks
    if (timerInput) {
      timerInput.classList.add('is-hidden');
      timerInput.style.display = 'none';
    }

    // ---------------- State ----------------
    const LS_KEY = 'stdtimer:v6';

    let timerState   = 'stopped'; // 'stopped' | 'running' | 'paused'
    let tickBase     = 40;
    let msPerTick    = Math.round(1000 / tickBase);

    let timerSetMs   = 9*60*1000 + 59*1000; // 09:59.00
    let timerLeftMs  = timerSetMs;

    let rafId        = null;
    let wallStart    = 0;
    let wallEnd      = 0;
    let previousMsLeft = timerLeftMs;

    let hurryUpPlayed = false;
    let flashTicker   = null;

    // Fonts
    let injectedStyleId = 'timerCustomFontStyle';

    // ---------------- Presets ----------------
    const hurryUpPresets = {
      none: { label: "None", sub:[ { value:"", label:"No Hurry Up", desc:"No hurry up sound will play." } ] },
      ggd:  { label: "Goose Goose Duck", sub:[
        { value:"hurryup-ggdsabo_retro",     label:"Goose Goose Duck Sabotage - Retro",     desc:"Plays at 1m remaining" },
        { value:"hurryup-ggdsabo_ship",      label:"Goose Goose Duck Sabotage - Ship",      desc:"Plays at 1m remaining, playing over music" },
        { value:"hurryup-ggdsabo_victorian", label:"Goose Goose Duck Sabotage - Victorian", desc:"Plays at 1m remaining" }
      ]},
      soniclw: { label:"Sonic Lost World", sub:[
        { value:"hurryup-soniclw", label:"Sonic Lost World", desc:"Plays at 1m remaining" }
      ]},
      mario:   { label:"Mario", sub:[
        { value:"hurryup-smbnes", label:"Super Mario Bros - NES", desc:"Plays at 1m remaining, restarts music at 1.25x speed" },
        { value:"hurryup-smbgen", label:"Super Mario - Genesis",  desc:"Plays at 1m remaining, restarts music at 1.25x speed" },
        { value:"hurryup-smb3",   label:"Super Mario Bros 3",     desc:"Plays at 1m remaining, restarts music at 1.25x speed" },
        { value:"hurryup-smw",    label:"Super Mario World",      desc:"Plays at 1m remaining, restarts music at 1.25x speed" },
        { value:"hurryup-nsmb",   label:"New Super Mario Bros",   desc:"Plays at 1m remaining, restarts music at 1.25x speed" },
        { value:"hurryup-sm3d",   label:"Super Mario 3D Land",    desc:"Plays at 1m remaining, restarts music at 1.25x speed" }
      ]}
    };

    // ---------------- Music stubs (safe no-op) ----------------
    const syncMusic   = (_cmd)=>{};
    const setMusicRate= (_r)=>{};

    // ---------------- Utils ----------------
    const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
    const pad2  = (n)=>String(n).padStart(2,'0');

    function readTPSFromUI(){
      if (!tpsSelect) return tickBase;
      const v = clamp(parseInt(tpsSelect.value||String(tickBase),10), 10, 100);
      return v;
    }

    function msToParts(ms) {
      const pos = Math.max(0, Math.floor(ms));
      const totalSeconds = Math.floor(pos / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const frac = pos % 1000;
      const ticks = Math.floor(frac * tickBase / 1000);
      return {h,m,s,ticks};
    }

    function partsToMs({h=0,m=0,s=0,ticks=0}) {
      const baseMs = (h*3600 + m*60 + s) * 1000;
      const fracMs = Math.round((ticks / tickBase) * 1000);
      return baseMs + fracMs;
    }

    function parseTimerStringToMs(text){
      const s = (text||'').trim();
      if (!s) return 0;
      const [left, dotPart] = s.split('.');
      const ticks = clamp(parseInt(dotPart ?? '0',10) || 0, 0, Math.max(0,tickBase-1));
      const segs = (left||'').split(':').map(v=>parseInt(v,10)||0);
      let h=0,m=0,sec=0;
      if (segs.length===3){ [h,m,sec] = segs; }
      else if (segs.length===2){ [m,sec] = segs; }
      else { sec = segs[0]||0; }
      return partsToMs({h,m,s:sec,ticks});
    }

    function decideVisibility(totalSeconds){
      if (showAuto?.checked){
        const showH = totalSeconds >= 3600;
        const showM = showH || totalSeconds >= 60;
        const showS = true;
        const showT = !!showTicks?.checked;
        return {showH,showM,showS,showT};
      }
      return {
        showH: !!showHours?.checked,
        showM: !!showMinutes?.checked,
        showS: !!showSeconds?.checked,
        showT: !!showTicks?.checked
      };
    }

    function formatTimer(ms){
      const pos = Math.max(0,Math.floor(ms));
      const totalSeconds = Math.floor(pos/1000);
      const vis = decideVisibility(totalSeconds);
      const {h,m,s,ticks} = msToParts(pos);
      const parts = [];
      if (vis.showH) parts.push(pad2(h));
      if (vis.showM) parts.push(vis.showH ? pad2(m) : String(m));
      if (vis.showS) parts.push((vis.showH||vis.showM) ? pad2(s) : String(s));
      let out = parts.join(':');
      if (vis.showT) out += (out ? '.' : '') + pad2(ticks);
      if (!out) out = `${pad2(m)}:${pad2(s)}.${pad2(ticks)}`;
      return out;
    }

    function monoHTML(text, flashOn) {
      const color = flashOn ? '#ff0000' : '#ffffff';
      return Array.from(text, ch => {
        const safe = ch === ' ' ? '&nbsp;' : ch;
        return `<span class="monochar" style="color:${color};">${safe}</span>`;
      }).join('');
    }

    function shouldFlash(ms){
      if (disableFlashCB?.checked) return false;
      return timerState === 'running' && ms < 60000;
    }

    function startFlashTicker(){
      if (flashTicker) return;
      flashTicker = setInterval(()=>updateTimerDisplay(true), 333); // 3 fps
    }
    function stopFlashTicker(){
      if (flashTicker){ clearInterval(flashTicker); flashTicker = null; }
    }

    function updateTimerDisplay(forceFlashFrame=false){
      if (!timerDisplay) return;
      const text = formatTimer(timerLeftMs);
      let flashOn = false;
      if (shouldFlash(timerLeftMs)){
        flashOn = forceFlashFrame ? (Math.floor(Date.now()/333)%2===0)
                                  : (Math.floor(Date.now()/333)%2===0);
        startFlashTicker();
      } else {
        stopFlashTicker();
      }
      timerDisplay.innerHTML = monoHTML(text, flashOn);
    }

    function updateStartPauseBtn(){
      if (!startPauseBtn) return;
      startPauseBtn.textContent = (timerState === 'running') ? 'Pause' : 'Start';
    }

    // ---------------- Hurry-Up audio (pause/resume) ----------------
    let hurryUpAudio = null;
    let hurryState   = 'idle';    // 'idle' | 'playing' | 'done'
    let hurryOverlay = false;
    let hurryIsMario = false;

    const baseId = (v)=> (v||'').replace(/^.*\//,'').replace(/\.(mp3|ogg)$/i,'');
    function pickSrc(base){
      const probe = document.createElement('audio');
      const mp3 = !!probe.canPlayType && probe.canPlayType('audio/mpeg') !== '';
      return `hurryup/${base}.${mp3 ? 'mp3' : 'ogg'}`;
    }
    function stopHurryUp(){
      try { if (hurryUpAudio){ hurryUpAudio.pause(); hurryUpAudio.currentTime=0; } } catch {}
      hurryUpAudio=null; hurryState='idle'; hurryOverlay=false; hurryIsMario=false;
    }
    function pauseHurryUp(){ try{ if (hurryUpAudio && hurryState==='playing') hurryUpAudio.pause(); }catch{} }
    function resumeHurryUp(){ try{ if (hurryUpAudio && hurryState==='playing') hurryUpAudio.play().catch(()=>{});}catch{} }

    function beginHurryUp(mainKey, subVal){
      const b = baseId(subVal);
      if (!b) return;
      hurryOverlay = (subVal === 'hurryup-ggdsabo_ship');
      hurryIsMario = (mainKey === 'mario');
      hurryState   = 'playing';

      if (!hurryOverlay) syncMusic('pause');

      try { if (hurryUpAudio) hurryUpAudio.pause(); } catch {}
      hurryUpAudio = new Audio(pickSrc(b));
      hurryUpAudio.onended = () => {
        hurryUpAudio=null; hurryState='done';
        if (!hurryOverlay) {
          setMusicRate(hurryIsMario ? 1.25 : 1.0);
          if (timerState === 'running') syncMusic('play');
        }
      };
      hurryUpAudio.onerror = hurryUpAudio.onended;
      try { hurryUpAudio.play().catch(()=>{});}catch{}
    }

    // ---------------- Persistence ----------------
    function save(){
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          tickBase,
          tpsSelect: tpsSelect?.value || String(tickBase),
          timerSetMs,
          auto: !!showAuto?.checked,
          showH: !!showHours?.checked,
          showM: !!showMinutes?.checked,
          showS: !!showSeconds?.checked,
          showT: !!showTicks?.checked,
          disableFlash: !!disableFlashCB?.checked,
          musicUrl: (musicUrlInput?.value || ''),
          huMain: hurryUpMain?.value || 'none',
          huSub:  hurryUpSub?.value  || '',
          fontMode: fontSelect?.value || 'default',
          customFontData: localStorage.getItem('timerCustomFontData') || '',
          customFontName: localStorage.getItem('timerCustomFontName') || ''
        }));
      } catch {}
    }

    function load(){
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);

        tickBase  = clamp(parseInt(d.tickBase||40,10), 10, 100);
        msPerTick = Math.round(1000 / tickBase);

        if (typeof d.timerSetMs === 'number'){
          timerSetMs = Math.max(0, d.timerSetMs);
          timerLeftMs= timerSetMs;
        }

        if (tpsSelect && d.tpsSelect) tpsSelect.value = String(d.tpsSelect);

        if (showAuto)    showAuto.checked    = !!d.auto;
        if (showHours)   showHours.checked   = !!d.showH;
        if (showMinutes) showMinutes.checked = !!d.showM;
        if (showSeconds) showSeconds.checked = !!d.showS;
        if (showTicks)   showTicks.checked   = !!d.showT;

        if (disableFlashCB) disableFlashCB.checked = !!d.disableFlash;

        if (musicUrlInput && typeof d.musicUrl === 'string') musicUrlInput.value = d.musicUrl;

        if (hurryUpMain && d.huMain) hurryUpMain.value = d.huMain;
        if (hurryUpSub  && d.huSub)  hurryUpSub.value  = baseId(d.huSub);

        if (fontSelect && d.fontMode) fontSelect.value = d.fontMode;

        // carry over custom font data (if any)
        if (d.customFontData && d.customFontName) {
          localStorage.setItem('timerCustomFontData', d.customFontData);
          localStorage.setItem('timerCustomFontName', d.customFontName);
        }
      } catch {}
    }

    // ---------------- Fonts (robust injection) ----------------
    function applyFontFamily(mode){
      // remove old injected @font-face if any
      const old = document.getElementById(injectedStyleId);
      if (old) old.remove();

      if (mode === 'custom'){
        const dataUrl = localStorage.getItem('timerCustomFontData') || '';
        const nameRaw = localStorage.getItem('timerCustomFontName') || 'CustomFont';
        const family  = nameRaw.replace(/\.[^.]+$/, '');
        if (dataUrl){
          const st = document.createElement('style');
          st.id = injectedStyleId;
          st.textContent = `
            @font-face{
              font-family:'${family}';
              src:url(${dataUrl});
              font-weight:400; font-style:normal;
            }`;
          document.head.appendChild(st);
          document.body.style.fontFamily = `'${family}', 'Segoe UI', Roboto, Arial, sans-serif`;
          if (customFontName)   customFontName.textContent = `Loaded: ${family}`;
          if (customFontNotice) customFontNotice.style.display = 'block';
          return;
        }
      }
      if (mode === 'system'){
        document.body.style.fontFamily = "'Segoe UI', Roboto, Arial, sans-serif";
      } else {
        // DEFAULT
        document.body.style.fontFamily = "'FancyCatPX', 'Segoe UI', Roboto, Arial, sans-serif";
      }
    }

    importFontBtn?.addEventListener('click', ()=>customFontInput?.click());
    customFontInput?.addEventListener('change', async ()=>{
      const f = customFontInput.files?.[0]; if (!f) return;
      const buf = await f.arrayBuffer();
      const blob = new Blob([buf], { type: f.type || 'font/ttf' });
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem('timerCustomFontData', reader.result);
          localStorage.setItem('timerCustomFontName', f.name);
          if (fontSelect) fontSelect.value = 'custom';
          applyFontFamily('custom');
          save();
        } catch {}
      };
      reader.readAsDataURL(blob);
    });

    // ---------------- UI wiring ----------------
    startPauseBtn?.addEventListener('click', onStartPause);
    resetBtn?.addEventListener('click', onReset);

    timerDisplay?.addEventListener('click', enterEdit);
    timerInput?.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') { timerInput.classList.add('is-hidden'); timerInput.style.display='none'; }
    });
    timerInput?.addEventListener('blur', commitEdit);

    function openModal(el, show){
      if (!el) return;
      if (show){ el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
      else     { el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }
    }
    settingsBtn?.addEventListener('click', ()=>openModal(settingsModal,true));
    closeSettings?.addEventListener('click', ()=>openModal(settingsModal,false));
    settingsModal?.addEventListener('click', (e)=>{ if (e.target===settingsModal) openModal(settingsModal,false); });

    [showAuto, showHours, showMinutes, showSeconds, showTicks, disableFlashCB].forEach(cb=>{
      cb?.addEventListener('change', ()=>{ save(); updateTimerDisplay(true); });
    });

    tpsSelect?.addEventListener('change', ()=>{
      const newBase = readTPSFromUI();
      if (newBase === tickBase) return;
      tickBase  = newBase;
      msPerTick = Math.round(1000 / tickBase);
      save();
      updateTimerDisplay(true);
    });

    musicUrlSubmit?.addEventListener('click', ()=>save());
    fontSelect?.addEventListener('change', ()=>{
      applyFontFamily(fontSelect.value || 'default');
      save();
    });

    // ---------------- Editing ----------------
    function enterEdit(){
      if (timerState !== 'stopped' || !timerInput) return;
      timerInput.value = formatTimer(timerLeftMs);
      timerInput.style.display = 'block';
      timerInput.classList.remove('is-hidden');
      timerInput.focus();
      timerInput.select();
    }
    function commitEdit(){
      if (!timerInput) return;
      const ms = parseTimerStringToMs(timerInput.value);
      timerSetMs  = ms;
      timerLeftMs = ms;
      hurryUpPlayed = false;
      previousMsLeft = timerLeftMs;
      timerInput.classList.add('is-hidden');
      timerInput.style.display = 'none';
      save();
      updateTimerDisplay(true);
    }

    // ---------------- Timer controls ----------------
    function setTimerFromInput(){
      if (!timerInput) return;
      const ms = parseTimerStringToMs(timerInput.value);
      timerSetMs  = ms;
      timerLeftMs = ms;
      hurryUpPlayed = false;
      previousMsLeft = timerLeftMs;
      save();
    }

    function onStartPause(){
      if (timerState === 'running'){
        timerState = 'paused';
        if (rafId) cancelAnimationFrame(rafId);
        pauseHurryUp();
        stopFlashTicker();
        updateStartPauseBtn();
        updateTimerDisplay(true);
        syncMusic('pause');
        return;
      }

      if (timerState === 'paused'){
        const now = performance.now();
        wallStart = now;
        wallEnd   = now + timerLeftMs;

        if (hurryUpAudio && hurryState==='playing'){
          resumeHurryUp();
          // overlay keeps bg going; non-overlay keeps bg paused until sfx ends
        } else {
          syncMusic('play');
        }
      } else {
        // starting fresh
        if (timerInput && timerInput.value) setTimerFromInput();
        if (timerLeftMs > 0){
          const fracMs = timerLeftMs % 1000;
          if (fracMs === 0){
            const ticksPerSec = tickBase;
            timerLeftMs += msPerTick * (ticksPerSec - 1); // start at .(base-1)
          }
        }
        const now = performance.now();
        wallStart = now;
        wallEnd   = now + timerLeftMs;
        syncMusic('play');
      }

      timerState = 'running';
      previousMsLeft = timerLeftMs;
      updateStartPauseBtn();
      rafId = requestAnimationFrame(loop);
      updateTimerDisplay(true);
    }

    function loop(){
      if (timerState !== 'running') return;
      const now = performance.now();
      const msLeft = Math.max(0, Math.floor(wallEnd - now));

      if (!hurryUpPlayed && previousMsLeft >= 60000 && msLeft < 60000){
        hurryUpPlayed = true;
        const mainKey = hurryUpMain?.value || 'none';
        const subVal  = hurryUpSub?.value  || '';
        beginHurryUp(mainKey, subVal);
      }

      timerLeftMs = msLeft;
      previousMsLeft = msLeft;

      updateTimerDisplay();

      if (msLeft <= 0){
        timerState = 'stopped';
        updateStartPauseBtn();
        setMusicRate(1.0);
        syncMusic('pause');
        stopHurryUp();
        stopFlashTicker();
        return;
      }
      rafId = requestAnimationFrame(loop);
    }

    function onReset(){
      if (rafId) cancelAnimationFrame(rafId);
      timerState = 'stopped';
      if (timerInput && timerInput.value) setTimerFromInput();
      setMusicRate(1.0);
      syncMusic('pause');
      stopHurryUp();
      stopFlashTicker();
      updateStartPauseBtn();
      updateTimerDisplay(true);
    }

    // ---------------- Init ----------------
    load();

    // adopt TPS from saved value
    if (tpsSelect) tpsSelect.value = String(tickBase);

    // apply saved / default font once DOM is ready
    applyFontFamily(fontSelect?.value || 'default');

    // If HTML provided a value on first run, use it
    if (timerInput && timerInput.value){
      timerSetMs  = parseTimerStringToMs(timerInput.value);
      timerLeftMs = timerSetMs;
    }

    // Populate hurry-up selects
    if (hurryUpMain && hurryUpSub){
      // main
      hurryUpMain.innerHTML = '';
      Object.entries(hurryUpPresets).forEach(([key,grp])=>{
        const o = document.createElement('option');
        o.value = key; o.textContent = grp.label;
        hurryUpMain.appendChild(o);
      });
      // subs for current main
      const setSubs = (key)=>{
        const grp = hurryUpPresets[key] || hurryUpPresets.none;
        hurryUpSub.innerHTML = '';
        grp.sub.forEach(s=>{
          const o = document.createElement('option');
          o.value = s.value.replace(/^.*\//,'').replace(/\.(mp3|ogg)$/i,'');
          o.textContent = s.label;
          hurryUpSub.appendChild(o);
        });
        const first = hurryUpSub.querySelector('option');
        if (first) hurryUpSub.value = first.value;
        hurryUpDesc.textContent = (grp.sub[0]?.desc || '');
      };
      setSubs(hurryUpMain.value || 'none');
      hurryUpMain.addEventListener('change', ()=>setSubs(hurryUpMain.value));
      hurryUpSub.addEventListener('change', ()=>{
        const grp = hurryUpPresets[hurryUpMain.value] || hurryUpPresets.none;
        const sel = grp.sub.find(s=>s.value.includes(hurryUpSub.value));
        hurryUpDesc.textContent = sel?.desc || '';
      });
    }

    updateStartPauseBtn();
    updateTimerDisplay(true);
  }
})();