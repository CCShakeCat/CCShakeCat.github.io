// NSMB Timer — old Hurry-Up element + edit only when IDLE + Reset to last idle value
(() => {
  // ---------- DOM ----------
  const body        = document.body;
  const display     = document.getElementById('display');
  const input       = document.getElementById('timerInput');
  const startBtn    = document.getElementById('startStopBtn');
  const resetBtn    = document.getElementById('resetBtn');
  const styleSelect = document.getElementById('styleSelect');
  const hurryAudio  = document.getElementById('hurryAudio'); // uses <audio> from HTML

  // ---------- Config ----------
  const TICK_MS  = 680;   // NSMB family tick (~0.68s)
  const HURRY_AT = 100;   // trigger at 100

  // ---------- State ----------
  let state       = 'idle';  // 'idle' | 'running' | 'paused'
  let value       = 400;     // current numeric value
  let startValue  = 400;     // what Reset returns to
  let timer       = null;
  let hurryPrimed = false;
  let hurryPlayed = false;

  // ---------- Helpers ----------
  const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
  const fmt   = n => String(clamp(n|0, 0, 999)).padStart(3, '0');

  function render() {
    const html = fmt(value).split('')
      .map(ch => `<span class="monochar">${ch}</span>`).join('');
    display.innerHTML = html;
  }

  function setEditing(on) {
    if (on) {
      input.value = fmt(value);
      input.style.display = 'inline-block';
      display.style.display = 'none';
      input.focus();
      input.setSelectionRange(0, input.value.length);
      body.classList.add('editing');
    } else {
      input.style.display = 'none';
      display.style.display = 'inline';
      body.classList.remove('editing');
    }
  }

  function setRunning(on) {
    const running = !!on;
    state = running ? 'running' : (state === 'running' ? 'paused' : state);
    input.readOnly = running;
    body.classList.toggle('is-running', running);
  }

  // ---------- Hurry-Up (old <audio> element) ----------
  function primeHurryOnce() {
    if (hurryPrimed || !hurryAudio) return;
    hurryPrimed = true;
    // Silent prime on first user gesture to satisfy autoplay policies
    const wasMuted = hurryAudio.muted;
    const wasVol   = hurryAudio.volume;
    try {
      hurryAudio.muted  = true;
      hurryAudio.volume = 0;
      const p = hurryAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          hurryAudio.pause();
          hurryAudio.currentTime = 0;
          hurryAudio.muted  = wasMuted;
          hurryAudio.volume = wasVol;
        }).catch(() => {
          hurryAudio.muted  = wasMuted;
          hurryAudio.volume = wasVol;
        });
      } else {
        hurryAudio.muted  = wasMuted;
        hurryAudio.volume = wasVol;
      }
    } catch {
      hurryAudio.muted  = wasMuted;
      hurryAudio.volume = wasVol;
    }
  }

  function playHurryOnce() {
    if (hurryPlayed || !hurryAudio) return;
    hurryPlayed = true;
    try {
      hurryAudio.currentTime = 0;
      hurryAudio.muted = false;
      hurryAudio.play().catch(()=>{ /* ignore */ });
    } catch { /* ignore */ }
  }

  // ---------- Timer control ----------
  function tick() {
    if (value > 0) {
      value -= 1;
      render();
      if (value === HURRY_AT) playHurryOnce();
    } else {
      pause();
    }
  }

  function start() {
    if (state === 'running') return;
    setEditing(false);      // never edit while running/paused
    primeHurryOnce();       // attach to same user gesture as Start

    state = 'running';
    setRunning(true);
    startBtn.textContent = 'Stop';

    if (value <= HURRY_AT) playHurryOnce(); // fire immediately if already ≤100

    tick();                                  // immediate step
    clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
  }

  function pause() {
    if (state !== 'running') return;
    clearInterval(timer); timer = null;
    state = 'paused';
    setRunning(false);
    startBtn.textContent = 'Start';
    setEditing(false);
  }

  function reset() {
    clearInterval(timer); timer = null;

    // If idle and the user typed but didn't blur, capture it
    if (state === 'idle') {
      const n = parseInt(input.value.replace(/[^\d]/g, ''), 10);
      if (!Number.isNaN(n)) startValue = clamp(n, 0, 999);
    }

    value = startValue;     // return to last idle-set value
    state = 'idle';
    hurryPlayed = false;    // re-arm
    startBtn.textContent = 'Start';
    setEditing(false);
    setRunning(false);
    render();
  }

  // ---------- Events ----------
  // Click-to-edit ONLY when idle
  display.addEventListener('click', () => {
    if (state !== 'idle') return;
    setEditing(true);
  });

  input.addEventListener('focus', () => { if (state !== 'idle') input.blur(); });

  // numeric-only, max 3 chars while idle
  input.addEventListener('beforeinput', (e) => {
    if (state !== 'idle') { e.preventDefault(); return; }
    if (e.inputType === 'insertText' && /\D/.test(e.data ?? '')) e.preventDefault();
  });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D+/g, '').slice(0, 3);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') setEditing(false);
  });
  input.addEventListener('blur', () => {
    const n = parseInt(input.value.replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(n)) value = clamp(n, 0, 999);
    render();
    setEditing(false);
    if (state === 'idle') startValue = value; // remember for Reset
    hurryPlayed = false;                      // re-arm on manual edit
  });

  startBtn.addEventListener('click', () => {
    primeHurryOnce();
    if (state === 'running') pause();
    else start(); // idle or paused -> start
  });
  resetBtn.addEventListener('click', reset);

  // Style -> body class (fonts)
  function applyNSMBFontClass() {
    body.classList.remove('ds-timer','wii-timer','nsmb2-timer');
    const v = styleSelect?.value || 'ds';
    if (v === 'wii') body.classList.add('wii-timer');
    else if (v === 'nsmb2') body.classList.add('nsmb2-timer');
    else body.classList.add('ds-timer');
    try { localStorage.setItem('nsmb-style', v); } catch {}
  }
  styleSelect.addEventListener('change', applyNSMBFontClass);

  // ---------- Init ----------
  (function initFromDOM(){
    try {
      const v = localStorage.getItem('nsmb-style');
      if (v) styleSelect.value = v;
    } catch {}
    applyNSMBFontClass();

    // Prefer what's in the input; otherwise display; otherwise 400
    let initial = 400;
    if (input.value) initial = parseInt(input.value.replace(/[^\d]/g, ''), 10);
    else if (display.textContent) initial = parseInt(display.textContent.replace(/[^\d]/g, ''), 10);
    if (Number.isNaN(initial)) initial = 400;

    value = clamp(initial, 0, 999);
    startValue = value;   // Reset returns here
    render();
    setEditing(false);
  })();
})();
