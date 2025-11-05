// ======================= Timer (Standard) – Full Drop-in =======================
(() => {
  const $ = (id) => document.getElementById(id);

  // Core UI
  const timerInput   = $('timerInput');
  const timerDisplay = $('timerDisplay');
  const startPauseBtn= $('startPauseBtn');
  const resetBtn     = $('resetBtn');

  // Modal
  const settingsBtn  = $('settingsBtn');
  const settingsModal= $('settingsModal');
  const closeSettings= $('closeSettings');

  // Show on clock
  const showAuto=$('showAuto'), showHours=$('showHours'), showMinutes=$('showMinutes'),
        showSeconds=$('showSeconds'), showTicks=$('showTicks');

  // Tick rate
  const tpsSelect = $('tpsSelect');

  // Music URL (store only)
  const musicUrlInput=$('musicUrlInput'), musicUrlSubmit=$('musicUrlSubmitBtn');

  // Hurry Up
  const hurryUpMain=$('hurryUpMain'), hurryUpSub=$('hurryUpSub'),
        hurryUpDesc=$('hurryUpDesc'), disableFlashCB=$('disableFlash');

  // Fonts
  const fontSelect=$('fontSelect'), importFontBtn=$('importCustomFont'),
        customFontInput=$('customFontFile'), customFontName=$('customFontName'),
        customFontNotice=$('customFontNotice');

  // Direction
  const directionBtn=$('directionBtn'), directionTarget=$('directionTarget'), directionEnds=$('directionEnds');

  // ---------- State ----------
  const LS_KEY='stdtimer:v6';
  const DEFAULT_TPS=40;
  const DEFAULT_TICKS=(9*60+59)*DEFAULT_TPS; // 09:59.00

  const st={
    tickBase:DEFAULT_TPS,
    initialTicks:DEFAULT_TICKS,
    remainingTicks:DEFAULT_TICKS,
    elapsedTicks:0,
    running:false,
    lastMs:0,
    wasStarted:false,

    huPlayed:false,
    flashActive:false, flashOn:true, lastFlashToggleMs:0,

    auto:false, showH:true, showM:true, showS:true, showT:true,

    huKey:'none', huValue:'', huAudio:null, huPausedAt:0,

    disableFlash:false, musicUrl:'',

    fontMode:'default', customFontFamily:'',

    direction:'from'
  };

  // ---------- Presets ----------
  const hurryUpPresets={
    none:{label:"None", sub:[{value:"",label:"No Hurry Up",desc:"No hurry up sound will play."}]},
    ggd:{label:"Goose Goose Duck", sub:[
      {value:"hurryup-ggdsabo_retro",label:"Goose Goose Duck Sabotage - Retro",desc:"Plays at 1m remaining"},
      {value:"hurryup-ggdsabo_ship",label:"Goose Goose Duck Sabotage - Ship",desc:"Plays at 1m remaining, playing over music"},
      {value:"hurryup-ggdsabo_victorian",label:"Goose Goose Duck Sabotage - Victorian",desc:"Plays at 1m remaining"}
    ]},
    soniclw:{label:"Sonic Lost World", sub:[{value:"hurryup-soniclw",label:"Sonic Lost World",desc:"Plays at 1m remaining"}]},
    mario:{label:"Mario", sub:[
      {value:"hurryup-smbnes",label:"Super Mario Bros - NES",desc:"Plays at 1m remaining, restarts music at 1.25x (if music used)"},
      {value:"hurryup-smbgen",label:"Super Mario - Genesis",desc:"Plays at 1m remaining, restarts music at 1.25x (if music used)"},
      {value:"hurryup-smb3",label:"Super Mario Bros 3",desc:"Plays at 1m remaining, restarts music at 1.25x (if music used)"},
      {value:"hurryup-smw",label:"Super Mario World",desc:"Plays at 1m remaining, restarts music at 1.25x (if music used)"},
      {value:"hurryup-nsmb",label:"New Super Mario Bros",desc:"Plays at 1m remaining, restarts music at 1.25x (if music used)"},
      {value:"hurryup-sm3d",label:"Super Mario 3D Land",desc:"Plays at 1m remaining, restarts music at 1.25x (if music used)"}
    ]}
  };
  const HURRY_PATH='./hurryup/';
  function syncMusic(_){ } function setMusicRate(_){ }

  // ---------- Utils ----------
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const pad2=(n)=>String(n).padStart(2,'0');

  function convertTicksBase(absTicks,oldBase,newBase){
    if(oldBase===newBase) return absTicks;
    const sign=absTicks<0?-1:1; let a=Math.abs(absTicks);
    const sec=Math.floor(a/oldBase), frac=a%oldBase;
    return sign*(sec*newBase+Math.round(frac*newBase/oldBase));
  }

  function parseTimeToTicks(text,base){
    const s=(text||'').trim(); if(!s) return 0;
    const parts=s.split(':'); let h=0,m=0,sec=0,tt=0;
    if(parts.length===3){ h=parseInt(parts[0],10)||0; m=parseInt(parts[1],10)||0; sec=parts[2]; }
    else if(parts.length===2){ m=parseInt(parts[0],10)||0; sec=parts[1]; } else { sec=parts[0]; }
    if(String(sec).includes('.')){ const [ss,ticks]=String(sec).split('.'); sec=parseInt(ss,10)||0; tt=clamp(parseInt(ticks,10)||0,0,base-1); }
    else { sec=parseInt(sec,10)||0; tt=0; }
    return ((h*3600+m*60+sec)*base)+tt;
  }

  function formatFromTicks(ticks,base=st.tickBase){
    let t=Math.max(0,ticks);
    const totalSeconds=Math.floor(t/base), tickPart=t%base;
    const h=Math.floor(totalSeconds/3600);
    const m=Math.floor((totalSeconds%3600)/60);
    const s=totalSeconds%60;

    let sh,sm,ss,stt;
    if(st.auto){ sh=totalSeconds>=3600; sm=sh||totalSeconds>=60; ss=true; stt=!!st.showT; }
    else { sh=!!st.showH; sm=!!st.showM; ss=!!st.showS; stt=!!st.showT; }

    const parts=[];
    if(sh) parts.push(pad2(h));
    if(sm) parts.push(sh?pad2(m):String(m));
    if(ss) parts.push((sh||sm)?pad2(s):String(s));
    let out=parts.join(':');
    if(stt) out+=(out?'.':'')+pad2(tickPart);
    if(!out) out=`${pad2(m)}:${pad2(s)}.${pad2(tickPart)}`;
    return out;
  }

  function toMonoHTML(text){
    return Array.from(text, ch=>{
      const sep=(ch===':'||ch==='.')?' monochar--sep':'';
      const safe=ch===' ' ? '&nbsp;' : ch;
      return `<span class="monochar${sep}">${safe}</span>`;
    }).join('');
  }

  // ---------- Persist ----------
  function save(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({
        tickBase:st.tickBase, initial:st.initialTicks, remaining:st.remainingTicks, elapsed:st.elapsedTicks,
        direction:st.direction, auto:!!st.auto, showH:!!st.showH, showM:!!st.showM, showS:!!st.showS, showT:!!st.showT,
        disableFlash:!!st.disableFlash, musicUrl:st.musicUrl||'', huMode:st.huKey, huStyle:st.huValue,
        fontMode:st.fontMode, customFontFamily:st.customFontFamily
      }));
    }catch{}
  }

  function load(){
    try{
      const raw=localStorage.getItem(LS_KEY); if(!raw) return; const d=JSON.parse(raw);
      st.tickBase=clamp(parseInt(d.tickBase||DEFAULT_TPS,10),10,100);
      st.initialTicks=clamp(parseInt(d.initial||DEFAULT_TICKS,10),0,Number.MAX_SAFE_INTEGER);
      st.remainingTicks=clamp(parseInt(d.remaining ?? st.initialTicks,10),0,Number.MAX_SAFE_INTEGER);
      st.elapsedTicks=clamp(parseInt(d.elapsed ?? 0,10),0,Number.MAX_SAFE_INTEGER);
      st.direction=(d.direction==='to')?'to':'from';
      st.auto=!!d.auto; st.showH=!!d.showH; st.showM=!!d.showM; st.showS=!!d.showS; st.showT=!!d.showT;
      st.disableFlash=!!d.disableFlash; st.musicUrl=d.musicUrl||'';
      st.huKey=d.huMode||'none'; st.huValue=d.huStyle||'';
      st.fontMode=d.fontMode||'default'; st.customFontFamily=d.customFontFamily||'';
    }catch{}
  }

  // ---------- Fonts (IndexedDB) ----------
  const DB_NAME='stdtimer-fonts', DB_STORE='fonts', FONT_KEY='customFont';
  let currentFontFace=null, currentFontURL=null;

  function idbOpen(){ return new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
  async function idbGet(key){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,'readonly'), os=tx.objectStore(DB_STORE), rq=os.get(key); rq.onsuccess=()=>res(rq.result??null); rq.onerror=()=>rej(rq.error); }); }
  async function idbSet(key,val){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,'readwrite'), os=tx.objectStore(DB_STORE), rq=os.put(val,key); rq.onsuccess=()=>res(true); rq.onerror=()=>rej(rq.error); }); }

  async function restoreCustomFontFromDB(){
    try{
      const rec=await idbGet(FONT_KEY); if(!rec||!rec.bytes) return false;
      try{ if(currentFontFace){document.fonts.delete(currentFontFace); currentFontFace=null;} if(currentFontURL){URL.revokeObjectURL(currentFontURL); currentFontURL=null;} }catch{}
      const blob=new Blob([rec.bytes],{type:rec.type||'font/ttf'}), url=URL.createObjectURL(blob), fam=rec.family||'CustomFont';
      const face=new FontFace(fam,`url(${url})`); await face.load(); document.fonts.add(face);
      currentFontFace=face; currentFontURL=url; st.customFontFamily=fam; return true;
    }catch{ return false; }
  }
  async function persistCustomFontFile(file){
    const bytes=await file.arrayBuffer(); const family=file.name.replace(/\.(ttf|otf|woff2?|)$/i,'');
    await idbSet(FONT_KEY,{bytes:bytes,family,type:file.type||'font/ttf'}); return family;
  }
  function applyFontChoice(mode,familyName=''){
    st.fontMode=mode;
    if(mode==='system'){ document.body.style.fontFamily="'Segoe UI', Roboto, Arial, sans-serif"; }
    else if(mode==='custom'&&familyName){ document.body.style.fontFamily=`'${familyName}', 'Segoe UI', Roboto, Arial, sans-serif`; st.customFontFamily=familyName; }
    else{ document.body.style.fontFamily="'FancyCatPX', 'Segoe UI', Roboto, Arial, sans-serif"; st.customFontFamily=''; }
    save();
  }
  window.addEventListener('beforeunload',()=>{ try{ if(currentFontURL) URL.revokeObjectURL(currentFontURL); }catch{} });

  // ---------- Hurry-Up UI ----------
  function populateHurryUpFromPresets(initialKey='none', initialVal=''){
    if(!hurryUpMain||!hurryUpSub) return;

    hurryUpMain.innerHTML='';
    Object.entries(hurryUpPresets).forEach(([key,grp])=>{
      const o=document.createElement('option'); o.value=key; o.textContent=grp.label; hurryUpMain.appendChild(o);
    });

    function fillSubs(key,val){
      const group=hurryUpPresets[key]||hurryUpPresets.none;
      hurryUpSub.innerHTML='';
      group.sub.forEach(s=>{ const o=document.createElement('option'); o.value=s.value; o.textContent=s.label; hurryUpSub.appendChild(o); });
      const choose=group.sub.find(s=>s.value===val)||group.sub[0];
      hurryUpSub.value=choose.value; if(hurryUpDesc) hurryUpDesc.textContent=choose.desc||'';
      st.huKey=key; st.huValue=choose.value;
      hurryUpSub.style.display=(key==='none')?'none':'';
      save();
    }

    const validKey=(initialKey in hurryUpPresets)?initialKey:'none';
    hurryUpMain.value=validKey; fillSubs(validKey, initialVal);
    hurryUpMain.addEventListener('change',()=>fillSubs(hurryUpMain.value,''));
    hurryUpSub.addEventListener('change',()=>{
      const group=hurryUpPresets[hurryUpMain.value]||hurryUpPresets.none;
      const sel=group.sub.find(s=>s.value===hurryUpSub.value)||group.sub[0];
      if(hurryUpDesc) hurryUpDesc.textContent=sel.desc||'';
      st.huKey=hurryUpMain.value; st.huValue=hurryUpSub.value; save();
    });
  }

  // ---------- Hurry-Up playback ----------
  function stopHurrySfx(){ if(st.huAudio){ try{st.huAudio.pause();}catch{} st.huAudio=null; st.huPausedAt=0; } }
  function pauseHurrySfx(){ if(st.huAudio && !st.huAudio.paused){ try{ st.huPausedAt=st.huAudio.currentTime||0; st.huAudio.pause(); }catch{} } }
  function resumeHurrySfx(){ if(st.huAudio && st.huPausedAt){ try{ st.huAudio.currentTime=st.huPausedAt; st.huAudio.play().catch(()=>{}); st.huPausedAt=0; }catch{} } }
  function playHurryUpSfx(basename){
    return new Promise((resolve)=>{
      if(!basename){ resolve(); return; }
      stopHurrySfx();
      const a=new Audio(); a.preload='auto'; a.src=HURRY_PATH+basename+'.mp3';
      a.onended=()=>{ st.huAudio=null; resolve(); };
      a.onerror=()=>{ const b=new Audio(); b.preload='auto'; b.src=HURRY_PATH+basename+'.ogg';
        b.onended=()=>{ st.huAudio=null; resolve(); }; b.onerror=()=>{ st.huAudio=null; resolve(); };
        st.huAudio=b; const p2=b.play(); if(p2&&p2.catch) p2.catch(()=>resolve()); };
      st.huAudio=a; const p=a.play(); if(p&&p.catch) p.catch(()=>resolve());
    });
  }
  async function triggerHurryUp(){ if(!st.huValue) return; syncMusic('pause'); await playHurryUpSfx(st.huValue); setMusicRate(1.0); syncMusic('play'); }

  // ---------- 1:00 flash (3 FPS) ----------
  function updateFlash(nowMs){
    if(st.disableFlash){ st.flashActive=false; return; }
    const remaining=(st.direction==='from')?st.remainingTicks:Math.max(0, st.initialTicks-st.elapsedTicks);
    const remainingSec=Math.floor(remaining/st.tickBase);
    st.flashActive=remainingSec<=60 && remaining>0;
    if(!st.flashActive) return;
    if((nowMs-st.lastFlashToggleMs)>=333){ st.flashOn=!st.flashOn; st.lastFlashToggleMs=nowMs; }
  }
  function applyFlashColor(){ timerDisplay.style.color = st.flashActive ? (st.flashOn ? '#FFFFFF' : '#FF0000') : ''; }

  // ---------- Direction ----------
  function setDirection(dir){
    if(st.running) return;
    dir=(dir==='to')?'to':'from';
    if(dir==='to'){ st.elapsedTicks=Math.max(0, st.initialTicks-st.remainingTicks); }
    else { st.remainingTicks=Math.max(0, st.initialTicks-st.elapsedTicks); }
    st.direction=dir; st.huPlayed=false; st.flashActive=false; st.flashOn=true;
    if(directionBtn) directionBtn.textContent = dir==='from' ? 'FROM' : 'TO';
    if(directionTarget) directionTarget.textContent = formatFromTicks(st.initialTicks);
    if(directionEnds) directionEnds.textContent = formatFromTicks(dir==='from'?0:st.initialTicks);
    save(); render();
  }

  // ---------- Timer core ----------
  function start(){
    if(st.running) return;
    if(st.direction==='from' && !st.wasStarted){
      if(st.remainingTicks>0 && (st.remainingTicks%st.tickBase)===0){
        st.remainingTicks=Math.max(0, st.remainingTicks-1); // “last tick” start
      }
    }
    st.wasStarted=true; st.running=true; st.lastMs=performance.now();
    startPauseBtn.textContent='Pause'; timerInput.style.display='none';
    syncMusic('play'); tick();
    resumeHurrySfx();
  }
  function pause(){ if(!st.running) return; st.running=false; startPauseBtn.textContent='Start'; syncMusic('pause'); pauseHurrySfx(); }
  function reset(){
    pause();
    if(st.direction==='from'){ st.remainingTicks=st.initialTicks; st.elapsedTicks=0; }
    else { st.elapsedTicks=0; st.remainingTicks=st.initialTicks; }
    st.wasStarted=false; st.huPlayed=false; st.flashActive=false; st.flashOn=true;
    stopHurrySfx(); setMusicRate(1.0); save(); render();
  }

  function tick(){
    if(!st.running) return;
    const now=performance.now();
    const elapsedMs=now-st.lastMs;
    const addTicks=Math.floor(elapsedMs*st.tickBase/1000);
    if(addTicks>0){
      st.lastMs += addTicks*1000/st.tickBase;
      if(st.direction==='from'){ st.remainingTicks=Math.max(0, st.remainingTicks-addTicks); }
      else { st.elapsedTicks=Math.min(st.initialTicks, st.elapsedTicks+addTicks); }

      const remain=(st.direction==='from')?st.remainingTicks:Math.max(0, st.initialTicks-st.elapsedTicks);
      if(!st.huPlayed && Math.floor(remain/st.tickBase)<=60 && remain>0){ st.huPlayed=true; triggerHurryUp(); }

      if((st.direction==='from' && st.remainingTicks<=0) || (st.direction==='to' && st.elapsedTicks>=st.initialTicks)){
        if(st.direction==='from') st.remainingTicks=0; else st.elapsedTicks=st.initialTicks; pause();
      }
      render();
    }
    updateFlash(now); applyFlashColor();
    requestAnimationFrame(tick);
  }

  // ---------- Render ----------
  function render(){
    const showTicks=(st.direction==='from')?st.remainingTicks:st.elapsedTicks;
    timerDisplay.innerHTML = toMonoHTML(formatFromTicks(showTicks));
    if(directionTarget) directionTarget.textContent = formatFromTicks(st.initialTicks);
    if(directionEnds) directionEnds.textContent = formatFromTicks(st.direction==='from'?0:st.initialTicks);
  }

  // ---------- Edit overlay ----------
  function canEnterEdit(){ if(st.running) return false; return st.direction==='from'? st.remainingTicks===st.initialTicks : st.elapsedTicks===0; }
  function enterEdit(){ if(!canEnterEdit()) return; timerInput.value=formatFromTicks(st.initialTicks); timerInput.style.display='block'; timerInput.focus(); timerInput.select(); }
  function commitEdit(){
    const newTicks=parseTimeToTicks(timerInput.value, st.tickBase);
    if(Number.isFinite(newTicks)&&newTicks>=0){
      st.initialTicks=newTicks; st.remainingTicks=newTicks; st.elapsedTicks=0; st.wasStarted=false;
      st.huPlayed=false; st.flashActive=false; st.flashOn=true; setMusicRate(1.0); save(); render();
    }
    timerInput.style.display='none';
  }

  // ---------- Events ----------
  startPauseBtn?.addEventListener('click', ()=> (st.running?pause():start()));
  resetBtn?.addEventListener('click', reset);

  timerDisplay?.addEventListener('click', enterEdit);
  timerInput?.addEventListener('keydown', e=>{ if(e.key==='Enter') commitEdit(); if(e.key==='Escape') timerInput.style.display='none'; });
  timerInput?.addEventListener('blur', commitEdit);

  // Modal open/close
  function openModal(el,show){ if(!el) return; if(show){ el.classList.add('show'); el.setAttribute('aria-hidden','false'); } else { el.classList.remove('show'); el.setAttribute('aria-hidden','true'); } }
  settingsBtn?.addEventListener('click', ()=>openModal(settingsModal,true));
  closeSettings?.addEventListener('click', ()=>openModal(settingsModal,false));
  settingsModal?.addEventListener('click', (e)=>{ if(e.target===settingsModal) openModal(settingsModal,false); });

  // Show-on-clock toggles
  function syncAutoUI(){
    const auto=!!st.auto;
    [showHours,showMinutes,showSeconds].forEach(cb=>{
      if(!cb) return; cb.disabled=auto;
      const lbl=cb.closest('label'); if(lbl) lbl.classList.toggle('disabled-checkbox', auto);
    });
  }
  showAuto?.addEventListener('change', ()=>{ st.auto=!!showAuto.checked; syncAutoUI(); save(); render(); });
  showHours?.addEventListener('change', ()=>{ st.showH=!!showHours.checked; save(); render(); });
  showMinutes?.addEventListener('change', ()=>{ st.showM=!!showMinutes.checked; save(); render(); });
  showSeconds?.addEventListener('change', ()=>{ st.showS=!!showSeconds.checked; save(); render(); });
  showTicks?.addEventListener('change', ()=>{ st.showT=!!showTicks.checked; save(); render(); });

  // TPS
  function applyTPSChange(){
    const newBase=clamp(parseInt(tpsSelect.value||st.tickBase,10),10,100);
    const oldBase=st.tickBase; if(newBase===oldBase) return;
    st.initialTicks=convertTicksBase(st.initialTicks,oldBase,newBase);
    st.remainingTicks=convertTicksBase(st.remainingTicks,oldBase,newBase);
    st.elapsedTicks=convertTicksBase(st.elapsedTicks,oldBase,newBase);
    st.tickBase=newBase; st.lastMs=performance.now(); st.huPlayed=false; render(); save();
  }
  tpsSelect?.addEventListener('change', applyTPSChange);

  // Music (store only)
  musicUrlSubmit?.addEventListener('click', ()=>{ st.musicUrl=(musicUrlInput?.value||'').trim(); save(); });

  // Flash disable
  disableFlashCB?.addEventListener('change', ()=>{ st.disableFlash=!!disableFlashCB.checked; save(); });

  // Direction toggle
  directionBtn?.addEventListener('click', ()=> setDirection(st.direction==='from' ? 'to' : 'from'));

  // ---------- Make the modal draggable by empty dark areas ----------
  installDraggableModal(settingsModal);

  // ---------- Init ----------
  load();
  if(tpsSelect) tpsSelect.value=String(st.tickBase);
  if(disableFlashCB) disableFlashCB.checked=st.disableFlash;
  if(showAuto) showAuto.checked=st.auto;
  if(showHours) showHours.checked=st.showH;
  if(showMinutes) showMinutes.checked=st.showM;
  if(showSeconds) showSeconds.checked=st.showS;
  if(showTicks) showTicks.checked=st.showT;
  syncAutoUI();

  if(directionBtn) directionBtn.textContent = st.direction==='from' ? 'FROM' : 'TO';
  if(directionTarget) directionTarget.textContent = formatFromTicks(st.initialTicks);
  if(directionEnds) directionEnds.textContent = formatFromTicks(st.direction==='from'?0:st.initialTicks);

  if(timerInput && timerInput.value){
    st.initialTicks = parseTimeToTicks(timerInput.value, st.tickBase);
    st.remainingTicks = st.initialTicks; st.elapsedTicks=0;
  }

  (async ()=>{
    const hadCustom=await restoreCustomFontFromDB();
    if(st.fontMode==='custom' && !hadCustom) st.fontMode='default';
    applyFontChoice(st.fontMode, st.customFontFamily);
    if(fontSelect) fontSelect.value=st.fontMode;
    if(st.fontMode==='custom' && customFontName && st.customFontFamily){
      customFontName.textContent=`Loaded: ${st.customFontFamily}`;
      if(customFontNotice) customFontNotice.style.display='block';
    }
    fontSelect?.addEventListener('change', ()=>{
      const v=fontSelect.value;
      if(v==='custom'){
        if(!st.customFontFamily){ importFontBtn?.click(); return; }
        applyFontChoice('custom', st.customFontFamily);
      }else{ applyFontChoice(v); }
    });
    importFontBtn?.addEventListener('click', ()=> customFontInput?.click());
    customFontInput?.addEventListener('change', async ()=>{
      const f=customFontInput.files?.[0]; if(!f) return;
      try{
        const fam=await persistCustomFontFile(f);
        const bytes=await f.arrayBuffer();
        const url=URL.createObjectURL(new Blob([bytes],{type:f.type||'font/ttf'}));
        const face=new FontFace(fam,`url(${url})`); await face.load(); document.fonts.add(face);
        try{ if(currentFontFace) document.fonts.delete(currentFontFace); if(currentFontURL) URL.revokeObjectURL(currentFontURL); }catch{}
        currentFontFace=face; currentFontURL=url;
        st.customFontFamily=fam;
        if(customFontName) customFontName.textContent=`Loaded: ${fam}`;
        if(customFontNotice) customFontNotice.style.display='block';
        if(fontSelect) fontSelect.value='custom';
        applyFontChoice('custom', fam);
      }catch(e){ console.error(e); }
    });
  })();

  populateHurryUpFromPresets(st.huKey||'none', st.huValue||'');
  render();
})();

// ---- Draggable by empty dark areas (mouse + touch) ----
function installDraggableModal(modalEl){
  if(!modalEl) return;
  const panel=modalEl.querySelector('.modal-content');
  if(!panel) return;

  let down=false, startX=0, startY=0, baseDx=0, baseDy=0;

  function isInteractive(t){ return !!(t.closest('input,select,textarea,button,a,label')); }
  function xy(e){ return e.touches ? {x:e.touches[0].clientX, y:e.touches[0].clientY} : {x:e.clientX, y:e.clientY}; }

  function onDown(e){
    if(e.type==='mousedown' && e.button!==0) return;
    if(isInteractive(e.target)) return;
    down=true;
    const p=xy(e); startX=p.x; startY=p.y;
    const cs=getComputedStyle(panel);
    baseDx=parseFloat(cs.getPropertyValue('--modal-dx'))||0;
    baseDy=parseFloat(cs.getPropertyValue('--modal-dy'))||0;
    panel.classList.add('modal-dragging');
    window.addEventListener('mousemove', onMove, {passive:false});
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('touchend', onUp);
  }
  function onMove(e){
    if(!down) return;
    const p=xy(e);
    panel.style.setProperty('--modal-dx', (baseDx + (p.x-startX)) + 'px');
    panel.style.setProperty('--modal-dy', (baseDy + (p.y-startY)) + 'px');
    e.preventDefault();
  }
  function onUp(){
    down=false; panel.classList.remove('modal-dragging');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  }
  panel.addEventListener('mousedown', onDown);
  panel.addEventListener('touchstart', onDown, {passive:true});

  // Reset position when the modal opens
  const obs=new MutationObserver(()=>{
    if(modalEl.classList.contains('show')){
      panel.style.setProperty('--modal-dx','0px');
      panel.style.setProperty('--modal-dy','0px');
      panel.style.setProperty('--modal-top','6vh');
    }
  });
  obs.observe(modalEl,{attributes:true, attributeFilter:['class']});
}