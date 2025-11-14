(() => {
  const $ = id => document.getElementById(id);

  /* ---------- Core UI ---------- */
  const timerInput   = $('timerInput');
  const timerDisplay = $('timerDisplay');
  const startPauseBtn= $('startPauseBtn');
  const resetBtn     = $('resetBtn');

  // Prefix
  const prefixText   = $('prefixText');
  const prefixIcon   = $('prefixIcon');

  // Modal
  const settingsBtn  = $('settingsBtn');
  const settingsModal= $('settingsModal');
  const closeSettings= $('closeSettings');
  const modalCard    = $('modalCard');

  // Show-on-clock
  const showAuto     = $('showAuto');
  const showHours    = $('showHours');
  const showMinutes  = $('showMinutes');
  const showSeconds  = $('showSeconds');
  const showTicks    = $('showTicks');

  // Controls
  const tpsSelect    = $('tpsSelect');
  const styleSelect  = $('styleSelect');
  const flashModeSel = $('flashMode');

  // Size
  const sizePrev     = $('sizePrev');
  const sizeNext     = $('sizeNext');
  const sizeLabel    = $('sizeLabel');

  // Direction UI
  const directionBtn = $('directionBtn');
  const directionTarget = $('directionTarget');
  const directionEnds   = $('directionEnds');

  // Music URL (store only)
  const musicUrlInput  = $('musicUrlInput');
  const musicUrlSubmit = $('musicUrlSubmitBtn');

  // Fonts
  const fontSelect       = $('fontSelect');
  const importFontBtn    = $('importCustomFont');
  const customFontInput  = $('customFontFile');
  const customFontName   = $('customFontName');
  const customFontNotice = $('customFontNotice');

  // Hurry Up
  const hurryUpMain    = $('hurryUpMain');
  const hurryUpSub     = $('hurryUpSub');
  const hurryUpDesc    = $('hurryUpDesc');

  /* ---------- Constants ---------- */
  const LS_KEY = 'stdtimer:v10';

  const HURRY_DIR = './hurryup/';
  const ICON_NORMAL = './icons/clock.png';
  const ICON_FLASH  = './icons/clock_red.png';

  // Presets (keep names matching your files in ./hurryup/)
  const hurryUpPresets = {
    none:  { label:'None', sub:[{value:'',label:'No Hurry',desc:'No hurry up sound will play.'}] },
    mario: { label:'Mario', sub:[
      { value:'hurryup-smbnes', label:'Super Mario Bros - NES',    desc:'Last tick of 00:59' },
      { value:'hurryup-smbgen', label:'Super Mario - Genesis',     desc:'Last tick of 00:59' },
      { value:'hurryup-smb3',   label:'Super Mario Bros 3',        desc:'Last tick of 00:59' },
      { value:'hurryup-smw',    label:'Super Mario World',         desc:'Last tick of 00:59' },
      { value:'hurryup-nsmb',   label:'New Super Mario Bros',      desc:'Last tick of 00:59' },
      { value:'hurryup-sm3d',   label:'Super Mario 3D Land',       desc:'Last tick of 00:59' },
    ]},
    soniclw:{ label:'Sonic Lost World', sub:[
      { value:'hurryup-soniclw', label:'Sonic Lost World',         desc:'Last tick of 00:59' },
    ]},
    ggd:    { label:'Goose Goose Duck', sub:[
      { value:'hurryup-ggdsabo_retro',     label:'Sabotage - Retro',     desc:'Last tick of 00:59' },
      { value:'hurryup-ggdsabo_ship',      label:'Sabotage - Ship',      desc:'Last tick of 00:59' },
      { value:'hurryup-ggdsabo_victorian', label:'Sabotage - Victorian', desc:'Last tick of 00:59' },
    ]},
  };

  // Size mapping (vw)
  const SIZE_VW = { 1:3.5, 2:5, 3:8, 4:14, 5:22 };

  /* ---------- State ---------- */
  const st = {
    tickBase: 40,
    initialTicks: 9*60*40 + 59*40 + 39,   // 09:59.39 @40 tps
    remainingTicks: 0,
    running: false,
    lastMs: 0,

    direction: 'from', // 'from' | 'to'

    // display flags
    auto:false, showH:true, showM:true, showS:true, showT:true,

    // style/flash
    style:'default',          // default|time|icon
    flashMode:'nothing',      // nothing|prefix|time|all
    flashTimer:null,

    // size 1..5
    size: 3,

    // fonts
    fontMode:'default',       // default|system|custom
    customFontFamily:'',

    // music URL (not used for playback here)
    musicUrl:'',

    // hurry-up
    huKey:'none',
    huValue:'',
    huAudio:null,
    huPlayed:false,
    huWasPaused:false,
  };

  /* ---------- Utils ---------- */
  const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
  const pad2  = n => String(n).padStart(2,'0');

  function parseTimeToTicks(text, base=st.tickBase){
    const s=(text||'').trim(); if(!s) return 0;
    const parts=s.split(':'); let h=0,m=0,sec=0,tt=0;
    if(parts.length===3){ h=parseInt(parts[0],10)||0; m=parseInt(parts[1],10)||0; sec=parts[2]; }
    else if(parts.length===2){ m=parseInt(parts[0],10)||0; sec=parts[1]; }
    else { sec=parts[0]; }
    if(String(sec).includes('.')){ const [ss,t]=String(sec).split('.'); sec=parseInt(ss,10)||0; tt=clamp(parseInt(t,10)||0,0,base-1); }
    else { sec=parseInt(sec,10)||0; tt=0; }
    return (h*3600+m*60+sec)*base+tt;
  }

  // format to string
  function formatFromTicks(ticks, base=st.tickBase){
    let t=Math.max(0,ticks);
    const totalSec = Math.floor(t/base);
    const tickPart = t%base;
    const h = Math.floor(totalSec/3600);
    const m = Math.floor((totalSec%3600)/60);
    const s = totalSec%60;

    let sh,sm,ss,stt;
    if(st.auto){ sh=totalSec>=3600; sm=sh||totalSec>=60; ss=true; stt=!!st.showT; }
    else { sh=!!st.showH; sm=!!st.showM; ss=!!st.showS; stt=!!st.showT; }

    const arr=[];
    if(sh) arr.push(pad2(h));
    if(sm) arr.push(sh?pad2(m):String(m));
    if(ss) arr.push((sh||sm)?pad2(s):String(s));

    let out=arr.join(':');
    if(stt) out+=(out?'.':'')+pad2(tickPart);
    if(!out) out=`${pad2(m)}:${pad2(s)}.${pad2(tickPart)}`;
    return out;
  }

  // Render with monochar spans so variable fonts stay aligned
  function renderMono(text){
    const frag = document.createDocumentFragment();
    for(const ch of text){
      const span = document.createElement('span');
      if(ch === ':' || ch === '.'){ span.className='monochar monochar--sep'; span.textContent = ch; }
      else { span.className='monochar'; span.textContent = ch; }
      frag.appendChild(span);
    }
    timerDisplay.replaceChildren(frag);
  }

  // Remaining time (for HU/flash logic)
  const timeLeftTicks = () =>
    st.direction==='from' ? st.remainingTicks : Math.max(0, st.initialTicks - st.remainingTicks);

  function render(){
    const showTicks = st.direction==='from' ? st.remainingTicks : st.remainingTicks; // same
    renderMono(formatFromTicks(showTicks));
  }

  /* ---------- Size ---------- */
  function applySize(){
    const vw = SIZE_VW[st.size] || 8;
    document.documentElement.style.setProperty('--clock-vw', `${vw}vw`);
    if(sizeLabel) sizeLabel.textContent = String(st.size);
    save();
  }
  const sizeDelta = d => { st.size = clamp(st.size + d,1,5); applySize(); };

  /* ---------- Style / Prefix ---------- */
  function setPrefixIconVisible(show){ if(prefixIcon) prefixIcon.style.display = show ? 'block' : 'none'; }
  function setPrefixIconFlashing(active){ if(prefixIcon) prefixIcon.src = active ? ICON_FLASH : ICON_NORMAL; }

  function applyStyle(){
    prefixText.style.display='none';
    setPrefixIconVisible(false);
    setPrefixIconFlashing(false);

    if(st.style==='time'){
      prefixText.style.display='block';
    }else if(st.style==='icon'){
      setPrefixIconVisible(true);
    }
  }

  /* ---------- Flash (3 FPS) ---------- */
  function stopFlash(){
    if(st.flashTimer){ clearInterval(st.flashTimer); st.flashTimer=null; }
    timerDisplay.classList.remove('flash-on');
    prefixText.classList.remove('flash-on');
    setPrefixIconFlashing(false);
  }
  function startFlashIfNeeded(){
    if(st.flashMode==='nothing' || st.flashTimer) return;
    let on=false;
    st.flashTimer=setInterval(()=>{
      on=!on;
      const tf=st.flashMode;

      const flashTime  = (tf==='time' || tf==='all') && on;
      const flashText  = (tf==='prefix' || tf==='all') && on && st.style==='time';
      const flashIcon  = (tf==='prefix' || tf==='all') && on && st.style==='icon';

      timerDisplay.classList.toggle('flash-on', flashTime);
      prefixText.classList.toggle('flash-on', flashText);
      setPrefixIconFlashing(flashIcon);
    },333);
  }

  /* ---------- Hurry-Up ---------- */
  function can(type){ try{ return (new Audio()).canPlayType(type); }catch{ return ''; } }
  const srcFor = id => id ? `${HURRY_DIR}${id}.${can('audio/mpeg')?'mp3':'ogg'}` : null;
  function stopHU(){ if(st.huAudio){ try{ st.huAudio.pause(); }catch{} } }
  async function doHurryUp(){
    if(!st.huValue) return;
    stopHU();
    const a = new Audio(srcFor(st.huValue));
    a.preload='auto';
    st.huAudio=a;
    try{ await a.play(); }catch{}
  }

  function populateHurryUp(){
    // main
    hurryUpMain.replaceChildren();
    for(const key of Object.keys(hurryUpPresets)){
      const opt=document.createElement('option');
      opt.value=key; opt.textContent=hurryUpPresets[key].label;
      hurryUpMain.appendChild(opt);
    }
    // sub
    function fillSub(k,keepValue){
      hurryUpSub.replaceChildren();
      const group = hurryUpPresets[k] || hurryUpPresets.none;
      for(const s of group.sub){
        const o=document.createElement('option');
        o.value=s.value; o.textContent=s.label; hurryUpSub.appendChild(o);
      }
      if(keepValue){
        const found=[...hurryUpSub.options].some(o=>o.value===st.huValue);
        if(found) hurryUpSub.value=st.huValue;
      }else{
        hurryUpSub.selectedIndex=0;
        st.huValue=hurryUpSub.value || '';
      }
      hurryUpDesc.textContent = (group.sub.find(x=>x.value===hurryUpSub.value)?.desc) || 'No hurry up sound will play.';
    }
    hurryUpMain.addEventListener('change', ()=>{
      st.huKey=hurryUpMain.value; fillSub(st.huKey,false); save();
    });
    hurryUpSub.addEventListener('change', ()=>{
      st.huValue=hurryUpSub.value;
      const group=hurryUpPresets[st.huKey]||hurryUpPresets.none;
      hurryUpDesc.textContent=(group.sub.find(x=>x.value===st.huValue)?.desc)||'';
      save();
    });

    // initial
    hurryUpMain.value = st.huKey || 'none';
    fillSub(hurryUpMain.value, true);
  }

  /* ---------- Persistence ---------- */
  function save(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({
        tickBase:st.tickBase, initial:st.initialTicks, remaining:st.remainingTicks, direction:st.direction,
        auto:st.auto, showH:st.showH, showM:st.showM, showS:st.showS, showT:st.showT,
        style:st.style, flashMode:st.flashMode, size:st.size,
        fontMode:st.fontMode, customFontFamily:st.customFontFamily,
        musicUrl:st.musicUrl, huKey:st.huKey, huValue:st.huValue
      }));
    }catch{}
  }
  function load(){
    try{
      const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      st.tickBase = clamp(parseInt(d.tickBase ?? 40,10),10,100);
      st.initialTicks = clamp(parseInt(d.initial ?? st.initialTicks,10),0,Number.MAX_SAFE_INTEGER);
      st.remainingTicks = clamp(parseInt(d.remaining ?? st.initialTicks,10),0,Number.MAX_SAFE_INTEGER);
      st.direction = (d.direction==='to'?'to':'from');

      st.auto=!!d.auto; st.showH=!!d.showH; st.showM=!!d.showM; st.showS=!!d.showS; st.showT=!!d.showT;
      st.style=d.style||'default'; st.flashMode=d.flashMode||'nothing';
      st.size = clamp(parseInt(d.size||3,10),1,5);

      st.fontMode=d.fontMode||'default'; st.customFontFamily=d.customFontFamily||'';
      st.musicUrl=d.musicUrl||'';
      st.huKey=d.huKey||'none'; st.huValue=d.huValue||'';
    }catch{}
  }

  /* ---------- Direction UI & minute boundary ---------- */
  function updateDirectionUI(){
    directionBtn.textContent = st.direction.toUpperCase();
    directionTarget.textContent = formatFromTicks(st.initialTicks);
    directionEnds.textContent = (st.direction==='from') ? '00:00:00.00' : formatFromTicks(st.initialTicks);
  }

  function syncMinuteState(){
    const trigger = st.tickBase*60 - 1; // last tick of 00:59
    const left = timeLeftTicks();

    if(!st.huPlayed && left === trigger){ st.huPlayed=true; doHurryUp(); }
    if(left <= trigger) startFlashIfNeeded(); else stopFlash();
  }

  /* ---------- Engine ---------- */
  function start(){
    if(st.running) return;
    if(st.direction==='from' && st.remainingTicks<=0) return;
    if(st.direction==='to'   && st.remainingTicks>=st.initialTicks) return;

    st.running=true; st.lastMs=performance.now();
    startPauseBtn.textContent='Pause';

    if(st.huAudio && st.huWasPaused){ try{ st.huAudio.play(); }catch{} st.huWasPaused=false; }

    syncMinuteState();
    tick();
  }
  function pause(){
    if(!st.running) return;
    st.running=false; startPauseBtn.textContent='Start';
    if(st.huAudio && !st.huAudio.paused){ try{ st.huAudio.pause(); }catch{} st.huWasPaused=true; }
    stopFlash();
  }
  function reset(){
    pause();
    st.remainingTicks = (st.direction==='from') ? st.initialTicks : 0;
    st.huPlayed=false; st.huWasPaused=false;
    stopHU(); stopFlash(); render(); save();
  }

  function tick(){
    if(!st.running) return;
    const now=performance.now();
    const elapsed=now - st.lastMs;
    const ticks = Math.floor(elapsed * st.tickBase / 1000);
    if(ticks>0){
      if(st.direction==='from'){
        st.remainingTicks = Math.max(0, st.remainingTicks - ticks);
      }else{
        st.remainingTicks = Math.min(st.initialTicks, st.remainingTicks + ticks);
      }
      st.lastMs += ticks * 1000 / st.tickBase;

      syncMinuteState();

      if(st.direction==='from' ? st.remainingTicks<=0 : st.remainingTicks>=st.initialTicks){
        pause();
      }
      render(); save();
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Edit overlay ---------- */
  function atStartState(){
    return st.direction==='from'
      ? st.remainingTicks===st.initialTicks
      : st.remainingTicks===0;
  }
  function placeInputAboveDisplay(){
    // center over display
    const r = timerDisplay.getBoundingClientRect();
    timerInput.style.left = `${window.scrollX + r.left + r.width/2}px`;
    timerInput.style.top  = `${window.scrollY + r.top  + r.height/2}px`;
    timerInput.style.transform = 'translate(-50%,-50%)';
  }
  function enterEdit(){
    if(st.running) return;
    if(!atStartState()) return;
    timerInput.value = formatFromTicks(st.initialTicks);
    placeInputAboveDisplay();
    timerInput.style.display='block';
    timerInput.focus(); timerInput.select();
  }
  function commitEdit(){
    const nv=parseTimeToTicks(timerInput.value);
    if(Number.isFinite(nv) && nv>=0){
      st.initialTicks=nv; st.huPlayed=false; stopFlash();
      st.remainingTicks = (st.direction==='from') ? st.initialTicks : 0;
      updateDirectionUI(); save(); render();
    }
    timerInput.style.display='none';
  }

  /* ---------- Fonts ---------- */
  function applyClockFont(mode){
    st.fontMode = mode;
    let fam = "FancyCatPX, system-ui, 'Segoe UI', Arial, sans-serif"; // Default fixed
    if(mode==='system'){
      const ua = navigator.userAgent || '';
      if(/Windows|Xbox/i.test(ua)) fam = "SystemWin, 'Segoe UI', system-ui, Arial, sans-serif";
      else if(/Android/i.test(ua)) fam = "SystemAndroid, Roboto, system-ui, Arial, sans-serif";
      else if(/Mac OS X|iPhone|iPad/i.test(ua)) fam = "SystemApple, -apple-system, system-ui, Arial, sans-serif";
      else fam = "system-ui, 'Segoe UI', Arial, sans-serif";
    }else if(mode==='custom' && st.customFontFamily){
      fam = `'${st.customFontFamily}', system-ui, 'Segoe UI', Arial, sans-serif`;
    }
    document.documentElement.style.setProperty('--clock-font', fam);
    save();
  }

  // load custom font file
  importFontBtn?.addEventListener('click', ()=> customFontInput?.click());
  customFontInput?.addEventListener('change', ()=>{
    const f = customFontInput.files?.[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    const family = `UserFont_${Date.now()}`;
    const face = new FontFace(family, `url(${url})`);
    face.load().then(ff=>{
      document.fonts.add(ff);
      st.customFontFamily = family;
      customFontName.textContent = `Loaded: ${f.name}`;
      customFontNotice.style.display='block';
      applyClockFont('custom');
      fontSelect.value='custom';
    }).catch(()=>{ customFontName.textContent='Failed to load font.'; });
  });

  fontSelect.addEventListener('change', ()=> applyClockFont(fontSelect.value));

  /* ---------- Events ---------- */
  startPauseBtn.addEventListener('click', ()=> (st.running?pause():start()));
  resetBtn.addEventListener('click', reset);

  timerDisplay.addEventListener('click', enterEdit);
  timerInput.addEventListener('keydown', e=>{
    if(e.key==='Enter') commitEdit();
    if(e.key==='Escape'){ timerInput.style.display='none'; }
  });
  window.addEventListener('resize', ()=>{ if(timerInput.style.display==='block') placeInputAboveDisplay(); });
  timerInput.addEventListener('blur', commitEdit);

  // Modal open/close
  const openModal = show => {
    settingsModal.classList.toggle('show', !!show);
    settingsModal.setAttribute('aria-hidden', show?'false':'true');
  };
  settingsBtn.addEventListener('click', ()=>openModal(true));
  closeSettings.addEventListener('click', ()=>openModal(false));
  // click outside card closes
  settingsModal.addEventListener('mousedown', e=>{
    if(e.target === settingsModal) openModal(false);
  });

  // Show-on-clock
  showAuto.addEventListener('change',()=>{ st.auto=!!showAuto.checked; save(); render(); });
  showHours.addEventListener('change',()=>{ st.showH=!!showHours.checked; save(); render(); });
  showMinutes.addEventListener('change',()=>{ st.showM=!!showMinutes.checked; save(); render(); });
  showSeconds.addEventListener('change',()=>{ st.showS=!!showSeconds.checked; save(); render(); });
  showTicks.addEventListener('change',()=>{ st.showT=!!showTicks.checked; save(); render(); });

  // TPS
  tpsSelect.addEventListener('change', ()=>{
    const newBase = clamp(parseInt(tpsSelect.value,10),10,100);
    if(newBase===st.tickBase) return;
    const secInit = st.initialTicks / st.tickBase;
    const secNow  = st.remainingTicks / st.tickBase;
    st.tickBase = newBase;
    st.initialTicks = Math.round(secInit*newBase);
    st.remainingTicks= Math.round(secNow*newBase);
    stopFlash(); save(); render(); updateDirectionUI(); syncMinuteState();
  });

  // Size
  sizePrev.addEventListener('click', ()=> sizeDelta(-1));
  sizeNext.addEventListener('click', ()=> sizeDelta(+1));

  // Style + Flash
  styleSelect.addEventListener('change', ()=>{ st.style=styleSelect.value; applyStyle(); save(); });
  flashModeSel.addEventListener('change', ()=>{ st.flashMode=flashModeSel.value; stopFlash(); syncMinuteState(); save(); });

  // Direction toggle
  directionBtn.addEventListener('click', ()=>{
    if(st.running) return;
    st.direction = (st.direction==='from') ? 'to' : 'from';
    st.remainingTicks = (st.direction==='from') ? st.initialTicks : 0;
    st.huPlayed=false; stopFlash();
    updateDirectionUI(); render(); save();
  });

  // Music (store only)
  musicUrlSubmit.addEventListener('click', ()=>{
    st.musicUrl=(musicUrlInput.value||'').trim(); save();
  });

  /* ---------- Init ---------- */
  /* ---------- Init ---------- */
  if(timerInput && timerInput.value){ st.initialTicks = parseTimeToTicks(timerInput.value, st.tickBase); }
  load();

  // If first run, put remaining according to direction
  if(st.direction==='from' && st.remainingTicks===0) st.remainingTicks=st.initialTicks;
  if(st.direction==='to'   && st.remainingTicks>st.initialTicks) st.remainingTicks=0;

  // UI reflect state
  showAuto.checked = !!st.auto;
  showHours.checked= !!st.showH;
  showMinutes.checked=!!st.showM;
  showSeconds.checked=!!st.showS;
  showTicks.checked= !!st.showT;

  tpsSelect.value = String(st.tickBase);
  styleSelect.value = st.style;
  flashModeSel.value = st.flashMode;

  applySize();
  applyStyle();
  updateDirectionUI();
  populateHurryUp();
  applyClockFont(st.fontMode || 'default');
  render();
})();

// ===== Draggable modal (all black areas, mouse + touch, preserves position) =====
(() => {
  const modalCard = document.getElementById('modalCard');
  if (!modalCard) return;

  // Save/restore modal position so it doesn't re-center after the first drag
  const POS_KEY = 'stdtimer:modalPos';
  const savePos = (x, y) => {
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x, y })); } catch {}
  };
  const loadPos = () => {
    try {
      const d = JSON.parse(localStorage.getItem(POS_KEY) || '{}');
      if (Number.isFinite(d.x) && Number.isFinite(d.y)) {
        modalCard.style.setProperty('--modal-x', `${d.x}px`);
        modalCard.style.setProperty('--modal-y', `${d.y}px`);
      }
    } catch {}
  };
  loadPos();

  let dragging = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;

  const getVarPx = (name, fallback) => {
    const v = getComputedStyle(modalCard).getPropertyValue(name).trim();
    if (!v) return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // Anything interactive should NOT start a drag
  const INTERACTIVE_SEL =
    'input, select, textarea, button, label, a, [contenteditable="true"], .nodrag';

  // Start dragging only if pressed directly on a “black area” (modal background)
  const maybeStartDrag = (ev) => {
    // If the exact target or any of its ancestors is interactive, do not drag
    if (ev.target.closest(INTERACTIVE_SEL)) return;

    // Only drag when the press is *on* the modal card (its black background / padding),
    // not on the backdrop (if you have one)
    const host = ev.target.closest('#modalCard');
    if (!host) return;

    dragging = true;

    const p = ev instanceof PointerEvent ? ev : (ev.touches ? ev.touches[0] : ev);
    startX = p.clientX; startY = p.clientY;
    baseX = getVarPx('--modal-x', 0);
    baseY = getVarPx('--modal-y', 0);

    // helpful cursor feedback
    modalCard.classList.add('dragging');

    // Keep receiving events even if pointer leaves the card
    if (ev.target.setPointerCapture && 'pointerId' in ev) {
      try { ev.target.setPointerCapture(ev.pointerId); } catch {}
    }

    ev.preventDefault();
    ev.stopPropagation();
  };

  const onMove = (ev) => {
    if (!dragging) return;
    const p = ev instanceof PointerEvent ? ev : (ev.touches ? ev.touches[0] : ev);
    const dx = p.clientX - startX;
    const dy = p.clientY - startY;
    const x = baseX + dx;
    const y = baseY + dy;
    modalCard.style.setProperty('--modal-x', `${x}px`);
    modalCard.style.setProperty('--modal-y', `${y}px`);
    ev.preventDefault();
  };

  const endDrag = (ev) => {
    if (!dragging) return;
    dragging = false;
    modalCard.classList.remove('dragging');

    const x = getVarPx('--modal-x', 0);
    const y = getVarPx('--modal-y', 0);
    savePos(x, y);

    if (ev && ev.target && ev.target.releasePointerCapture && ev.pointerId != null) {
      try { ev.target.releasePointerCapture(ev.pointerId); } catch {}
    }
  };

  // Start drag from ANY black area (non-interactive region) of the modal
  modalCard.addEventListener('pointerdown', maybeStartDrag);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
})();