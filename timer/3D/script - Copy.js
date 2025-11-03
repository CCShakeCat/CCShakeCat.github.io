/* 3D Land / World timer
   - NSMB-style toolbar
   - clock icon left of digits
   - 0.7375s tick rate (drift-corrected)
   - 3-digit, leading-zero display
*/

// ---- DOM
const styleSelect    = document.getElementById('styleSelect');
const displayEl      = document.getElementById('display');
const inputEl        = document.getElementById('timerInput');
const startStopBtn   = document.getElementById('startStopBtn');
const resetBtn       = document.getElementById('resetBtn');
const audioStatusEl  = document.getElementById('audioStatus');
const mediaPreviewEl = document.getElementById('mediaPreview');
const audioInputEl   = document.getElementById('customAudioInput');
const loadAudioBtn   = document.getElementById('loadAudioBtn');

// ---- Style application (toggle body data-style & optional world look)
function applyStyle(val){
  const body = document.body;
  body.dataset.style = val === 'world' ? 'world' : 'land';
}
applyStyle(styleSelect.value);
styleSelect.addEventListener('change', e => applyStyle(e.target.value));

// ---- Leading-zero formatter
function fmt(n){
  const v = Math.max(0, Math.min(999, Number.isFinite(n) ? Math.floor(n) : 0));
  return String(v).padStart(3,'0');
}
function setValue(n){
  const s = fmt(n);
  displayEl.textContent = s;
  inputEl.value = s;
}

// ---- Editing UX: click digits to edit when paused
let running = false;
function showInput(){
  if (running) return;
  displayEl.style.display = 'none';
  inputEl.style.display   = 'inline';
  inputEl.focus();
  inputEl.select();
}
function showDisplay(){
  displayEl.style.display = 'inline';
  inputEl.style.display   = 'none';
}
displayEl.addEventListener('click', showInput);

// numeric-only, 3 chars, live mirror
inputEl.addEventListener('input', () => {
  inputEl.value = inputEl.value.replace(/\D+/g,'').slice(0,3);
  displayEl.textContent = fmt(+inputEl.value || 0);
});
inputEl.addEventListener('blur', showDisplay);
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') { inputEl.blur(); }
});

// ---- Timer (drift-corrected 0.7375 s)
const TICK_MS = 737.5;  // target tick
let targetNext = null;
let rafId = null;

function tickLoop(ts){
  if (!running) return;

  if (targetNext === null) targetNext = ts + TICK_MS;

  // handle multiple missed ticks if tab was backgrounded
  while (ts >= targetNext - 1) {
    decrOne();
    targetNext += TICK_MS;
  }
  rafId = requestAnimationFrame(tickLoop);
}
function decrOne(){
  const cur = parseInt(displayEl.textContent, 10) || 0;
  const next = Math.max(0, cur - 1);
  setValue(next);
  if (next === 0) stopTimer();
}

function startTimer(){
  if (running) return;
  running = true;
  startStopBtn.textContent = 'Stop';
  hidePreview(true);
  targetNext = null;
  rafId = requestAnimationFrame(tickLoop);
}
function stopTimer(){
  running = false;
  startStopBtn.textContent = 'Start';
  hidePreview(false);
  if (rafId) cancelAnimationFrame(rafId), rafId = null;
}
function resetTimer(){
  stopTimer();
  setValue(400);
}
startStopBtn.addEventListener('click', () => running ? stopTimer() : startTimer());
resetBtn.addEventListener('click', resetTimer);

// ---- Initial value
setValue(400);

// ---- Audio loader (same behavior you had, compact & safe)
loadAudioBtn.addEventListener('click', async () => {
  const url = (audioInputEl.value || '').trim();
  mediaPreviewEl.innerHTML = '';
  audioStatusEl.textContent = '';
  if (!url) return;

  try {
    // YouTube quick embed
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/i);
    if (yt) {
      const id = yt[1];
      mediaPreviewEl.innerHTML =
        `<iframe width="384" height="216" src="https://www.youtube.com/embed/${id}"
           title="YouTube video" frameborder="0"
           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
           allowfullscreen></iframe>`;
      audioStatusEl.textContent = '✔ YouTube loaded.';
      return;
    }
    // Fallback: just link out (local mp3/ogg still plays if you attach your own <audio>)
    mediaPreviewEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener">Open media</a>`;
    audioStatusEl.textContent = '✔ URL set.';
  } catch (e){
    audioStatusEl.textContent = '✖ Could not load preview.';
  }
});

// Hide / show preview while running so layout never shifts
function hidePreview(hide){
  if (!mediaPreviewEl) return;
  mediaPreviewEl.style.visibility = hide ? 'hidden' : 'visible';
  mediaPreviewEl.style.height     = hide ? '0px'   : '';
}

/* Notes:
   - The icon image is chosen via CSS by body[data-style="land|world"].
     If your filenames differ, change the two background-image rules:
       body[data-style="land"]  #clockIcon{ background-image:url('./fonts/3DLclock.png'); }
       body[data-style="world"] #clockIcon{ background-image:url('./fonts/3DWclock.png'); }
   - Visual rules for Land/World (fill/outline) are in style.css and keep the
     same feel you used previously. */
