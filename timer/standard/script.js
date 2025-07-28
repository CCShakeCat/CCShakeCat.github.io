// ========== TIMER APP SCRIPT.JS ==========

// --- Timer State & Settings ---
let msPerTick = 25;
let timerState = "stopped";
let timerSetMs = 9 * 60 * 1000 + 59 * 1000;
let timerLeftMs = timerSetMs;
let wallStart = null;
let wallEnd = null;
let pausedAt = null;
let rafId = null;
let fontType = localStorage.getItem('timerFontType') || 'default';
let customFontName = localStorage.getItem('timerCustomFontName') || '';
let customFontData = localStorage.getItem('timerCustomFontData') || null;

// Show/hide units
let showAuto = (localStorage.getItem('timerShowAuto') ?? "0") === "1";
let showHours = (localStorage.getItem('timerShowHours') ?? "1") === "1";
let showMinutes = (localStorage.getItem('timerShowMinutes') ?? "1") === "1";
let showSeconds = (localStorage.getItem('timerShowSeconds') ?? "1") === "1";
let showTicks = (localStorage.getItem('timerShowTicks') ?? "1") === "1";

// Music & Hurry Up
let musicUrl = localStorage.getItem('musicUrl') || '';
let hurryUpMain = localStorage.getItem('hurryUpMain') || 'ggd';
let hurryUpSub = localStorage.getItem('hurryUpSub') || 'hurryup-ggdsabo_retro';

// Clock mode for dropdown in settings
let clockMode = localStorage.getItem('clockMode') || "Standard [23:59:59]";
let clockModeInterval = null;

// For hurry up sound trigger precision
let previousMsLeft = timerLeftMs;

// --- Hurry Up Flashing ---
let hurryUpFlashInterval = null;

// ========== Music & Hurry Up Presets ==========
const hurryUpPresets = {
  none: {
    label: "None",
    sub: [
      { value: "", label: "No Hurry Up", desc: "No hurry up sound will play." }
    ]
  },
  ggd: {
    label: "Goose Goose Duck",
    sub: [
      { value: "hurryup-ggdsabo_retro", label: "Goose Goose Duck Sabotage - Retro", desc: "Plays at 1m remaining" },
      { value: "hurryup-ggdsabo_ship", label: "Goose Goose Duck Sabotage - Ship", desc: "Plays at 1m remaining, playing over music" },
      { value: "hurryup-ggdsabo_victorian", label: "Goose Goose Duck Sabotage - Victorian", desc: "Plays at 1m remaining" }
    ]
  },
  soniclw: {
    label: "Sonic Lost World",
    sub: [
      { value: "hurryup-soniclw", label: "Sonic Lost World", desc: "Plays at 30s remaining" }
    ]
  },
  mario: {
    label: "Mario",
    sub: [
      { value: "hurryup-smbnes", label: "Super Mario Bros - NES", desc: "Plays at 1m remaining, restarts music at 1.25x speed" },
      { value: "hurryup-smbgen", label: "Super Mario - Genesis", desc: "Plays at 1m remaining, restarts music at 1.25x speed" },
      { value: "hurryup-smb3", label: "Super Mario Bros 3", desc: "Plays at 1m remaining, restarts music at 1.25x speed" },
      { value: "hurryup-smw", label: "Super Mario World", desc: "Plays at 1m remaining, restarts music at 1.25x speed" },
      { value: "hurryup-nsmb", label: "New Super Mario Bros", desc: "Plays at 1m remaining, restarts music at 1.25x speed" },
      { value: "hurryup-sm3d", label: "Super Mario 3D Land", desc: "Plays at 1m remaining, restarts music at 1.25x speed" }
    ]
  }
};

function populateHurryUpDropdowns() {
  const mainSel = document.getElementById('hurryUpMain');
  const subSel = document.getElementById('hurryUpSub');
  const descDiv = document.getElementById('hurryUpDesc');
  // Populate main dropdown
  mainSel.innerHTML = '';
  Object.entries(hurryUpPresets).forEach(([key, obj]) => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = obj.label;
    mainSel.appendChild(o);
  });
  // Set main selection
  mainSel.value = hurryUpMain;

  // Populate secondary dropdown
  const subOpts = hurryUpPresets[hurryUpMain].sub;
  subSel.innerHTML = '';
  subOpts.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    subSel.appendChild(o);
  });
  // Select current or default
  if (!subOpts.find(x => x.value === hurryUpSub)) {
    hurryUpSub = subOpts[0].value;
  }
  subSel.value = hurryUpSub;
  // Update description
  const found = subOpts.find(opt => opt.value === subSel.value) || subOpts[0];
  descDiv.textContent = found.desc;
}

function saveMusicAndHurryUpSettings() {
  localStorage.setItem('musicUrl', musicUrl);
  localStorage.setItem('hurryUpMain', hurryUpMain);
  localStorage.setItem('hurryUpSub', hurryUpSub);
}

// ========== Formatting Helpers ==========
function pad(num, len=2) { return num.toString().padStart(len, "0"); }

// --- AUTO FORMAT TIMER ---
function formatTimer(ms) {
    // Always show all units when timer is zero
    if (ms === 0) {
        let out = [];
        if (showAuto) {
            out = [pad(0,2), pad(0,2), pad(0,2), pad(0,2)];
            return `${out[0]}:${out[1]}:${out[2]}.${out[3]}`;
        } else {
            if (showHours) out.push(pad(0,2));
            if (showMinutes) out.push(pad(0,2));
            if (showSeconds) out.push(pad(0,2));
            let joined = out.join((showHours || showMinutes) ? ":" : "");
            if (showTicks) {
                joined += (out.length ? "." : "") + pad(0,2);
            }
            return joined;
        }
    }
    // AUTO logic (hide leading zeros)
    if (showAuto) {
        let ticks = Math.floor((ms % 1000) / msPerTick);
        let s = Math.floor(ms / 1000);
        let sec = s % 60;
        let min = Math.floor(s / 60) % 60;
        let hr = Math.floor(s / 3600);

        let values = [hr, min, sec, ticks];
        // Find first non-zero (skip hours/minutes/seconds)
        let firstNonZero = values.findIndex((v, idx) => idx < 3 && v !== 0);
        if (firstNonZero === -1) firstNonZero = 2; // All zero, start at seconds

        // Always show at least two units (sec, ticks)
        let start = Math.max(0, firstNonZero);

        let out = [];
        for (let i = start; i <= 3; ++i) {
            if (i === 3) { // ticks
                if (out.length) out.push(".");
                out.push(pad(values[i], 2));
            } else {
                if (out.length) out.push(":");
                out.push(pad(values[i], 2));
            }
        }
        return out.join("");
    }
    // Manual show/hide logic
    let ticks = Math.floor((ms % 1000) / msPerTick);
    let s = Math.floor(ms / 1000);
    let sec = s % 60;
    let min = Math.floor(s / 60) % 60;
    let hr = Math.floor(s / 3600);

    let out = [];
    if (showHours) out.push(pad(hr));
    if (showMinutes) out.push(pad(min));
    if (showSeconds) out.push(pad(sec));
    let joined = out.join((showHours || showMinutes) ? ":" : "");
    if (showTicks) {
        joined += (out.length ? "." : "") + pad(ticks);
    }
    return joined;
}

function displayTimer(ms) {
    let s = formatTimer(ms);
    // Flashing red effect: alternate between red and white every third of a second
    let isHurryUp = (ms < 60000 && timerState === "running");
    let flashPhase = Math.floor(Date.now() / 333) % 2; // 0,1 alternates every 333ms
    return [...s].map((ch, i) => {
        let style = "";
        if (isHurryUp) {
            let color = (flashPhase === 0) ? "#ff0000" : "#fff";
            style = `color: ${color};`;
        }
        return `<span class="monochar" style="${style}">${ch === " " ? "&nbsp;" : ch}</span>`;
    }).join("");
}

// --- Parse input timer string based on visible units ---
function parseTimerInput(str) {
    str = str.trim().replace(/,/g, '.');
    // If AUTO, treat as all units enabled
    let autoMode = showAuto;
    let h=0, m=0, s=0, t=0;
    let main = str.split(".");
    let nums = main[0].split(":").map(x => parseInt(x,10));
    if ((autoMode || showHours) && nums.length === 3) [h,m,s] = nums;
    else if ((autoMode || !showHours) && nums.length === 2) [m,s] = nums;
    else if (nums.length === 1) [s] = nums;
    if (main.length > 1) {
        t = parseInt(main[1].substring(0,2),10) || 0;
    }
    return ((h||0)*3600 + (m||0)*60 + (s||0))*1000 + (t||0)*msPerTick;
}

// --- Timer logic ---
function updateTimerDisplay() {
    const disp = document.getElementById('timerDisplay');
    if (!disp) return;
    disp.innerHTML = formatClock(timerLeftMs);

    // Hurry up flashing effect: add/remove .hurry-up-flash class and keep interval running
    let isHurryUp = (timerLeftMs < 60000 && timerState === "running");
    if (isHurryUp) {
        disp.classList.add("hurry-up-flash");
        if (!hurryUpFlashInterval) {
            hurryUpFlashInterval = setInterval(() => {
                // Force re-render for color cycling
                updateTimerDisplay();
            }, 333);
        }
    } else {
        disp.classList.remove("hurry-up-flash");
        if (hurryUpFlashInterval) {
            clearInterval(hurryUpFlashInterval);
            hurryUpFlashInterval = null;
        }
    }
    if (clockMode === "Upside Down") {
        disp.style.transform = "rotate(180deg)";
    } else {
        disp.style.transform = "";
    }
}

function syncInputWithDisplay() {
    document.getElementById('timerInput').value = formatTimer(timerLeftMs);
}

function setTimerFromInput() {
    let val = document.getElementById('timerInput').value;
    let ms = parseTimerInput(val);
    timerSetMs = ms;
    timerLeftMs = ms;
    updateTimerDisplay();
}

function wallClockTick() {
    if (timerState !== "running") return;
    let now = performance.now();
    let msLeft = Math.max(0, wallEnd - now);
    timerLeftMs = msLeft;
    updateTimerDisplay();
    handleMusicAndHurryUp(msLeft, previousMsLeft); // pass previous value for precision
    previousMsLeft = msLeft;
    if (msLeft > 0) {
        rafId = requestAnimationFrame(wallClockTick);
    } else {
        timerState = "stopped";
        updateStartPauseBtn();
        setClockInterval();
        stopMusicAndHurryUp();
    }
}

function startPause() {
    if (timerState === "running") {
        timerState = "paused";
        pausedAt = performance.now();
        cancelAnimationFrame(rafId);
        updateStartPauseBtn();
        setClockInterval();
        updateTimerDisplay();
        pauseMusic();
    } else {
        timerLeftMs = timerSetMs;
        const ticksPerSec = Math.round(1000 / msPerTick);
        let ticks = Math.floor((timerLeftMs % 1000) / msPerTick);
        if (ticks === 0) {
            timerLeftMs += msPerTick * (ticksPerSec - 1);
        }
        wallStart = performance.now();
        wallEnd = wallStart + timerLeftMs;
        timerState = "running";
        pausedAt = null;
        previousMsLeft = timerLeftMs;
        updateStartPauseBtn();
        rafId = requestAnimationFrame(wallClockTick);
        if (clockModeInterval) clearInterval(clockModeInterval);
        updateTimerDisplay();
        playMusicIfNeeded();
    }
}
function resetTimer() {
    cancelAnimationFrame(rafId);
    timerLeftMs = timerSetMs;
    timerState = "stopped";
    wallStart = null;
    wallEnd = null;
    pausedAt = null;
    updateTimerDisplay();
    updateStartPauseBtn();
    setClockInterval();
    stopMusicAndHurryUp();
}
function updateStartPauseBtn() {
    const btn = document.getElementById('startPauseBtn');
    btn.textContent = timerState === "running" ? "Pause" : "Start";
}

// --- Editable clock logic ---
function enableTimerEditMode() {
    document.getElementById('timerDisplay').style.display = "none";
    const inp = document.getElementById('timerInput');
    inp.style.display = "";
    inp.focus();
    inp.select();
}
function disableTimerEditMode() {
    const inp = document.getElementById('timerInput');
    inp.style.display = "none";
    document.getElementById('timerDisplay').style.display = "";
}

// --- Font Settings ---
function detectOS() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "windows";
    if (/Android/i.test(ua)) return "android";
    if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
    return "windows";
}
function applyFontFamily(fontType) {
    const el = document.querySelector('.timer-app');
    let fontStack;
    if (fontType === 'custom') {
        const fontData = localStorage.getItem('timerCustomFontData');
        const fontName = (localStorage.getItem('timerCustomFontName') || 'CustomFont').replace(/\.[^/.]+$/, "");
        if (fontData && fontName) {
            if (!document.getElementById('timerCustomFontStyle')) {
                const style = document.createElement('style');
                style.id = 'timerCustomFontStyle';
                style.innerHTML = `
                  @font-face {
                    font-family: '${fontName}';
                    src: url(${fontData});
                  }
                `;
                document.head.appendChild(style);
            }
            fontStack = `'${fontName}', sans-serif`;
        } else {
            fontStack = "'FancyCatPX', sans-serif";
        }
    } else if (fontType === 'system') {
        const os = detectOS();
        if (os === 'windows') fontStack = "'Segoe UI', Arial, sans-serif";
        else if (os === 'android') fontStack = "Roboto, Arial, sans-serif";
        else fontStack = "'San Francisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    } else {
        fontStack = "'FancyCatPX', sans-serif";
    }
    if (el) el.style.fontFamily = fontStack;
}
function updateFontUI() {
    const sel = document.getElementById('fontSelect');
    const nameElem = document.getElementById('customFontName');
    sel.value = fontType;
    nameElem.textContent = fontType === 'custom' ? customFontName : '';
}

// --- Show/hide settings ---
function updateShowHideCheckboxUI() {
    document.getElementById('showAuto').checked = showAuto;
    const ids = ['showHours', 'showMinutes', 'showSeconds', 'showTicks'];
    ids.forEach((id) => {
        const box = document.getElementById(id);
        const label = box.closest('label');
        if (showAuto) {
            box.disabled = true;
            label.style.opacity = "0.5";
        } else {
            box.disabled = false;
            label.style.opacity = "";
        }
    });
}
function saveShowHideSettings() {
    localStorage.setItem('timerShowAuto', showAuto ? "1" : "0");
    localStorage.setItem('timerShowHours', showHours ? "1" : "0");
    localStorage.setItem('timerShowMinutes', showMinutes ? "1" : "0");
    localStorage.setItem('timerShowSeconds', showSeconds ? "1" : "0");
    localStorage.setItem('timerShowTicks', showTicks ? "1" : "0");
}

// ===== CLOCK MODES FOR STANDARD TIMER =====

const clockModes = {
  "Standard [23:59:59]": {
    name: "Standard [23:59:59]",
    formatter: (ms) => displayTimer(ms)
  },
  "Upside Down": {
    name: "⮀ uʍop ǝpᴉsdn",
    formatter: (ms) => {
      const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
      const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
      const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
      let out = [h, m, s].filter(x=>x!==null).join((showHours || showMinutes) ? ":" : "");
      if (showTicks) {
        const ticks = Math.floor((ms % 1000) / msPerTick);
        out += (out.length ? "." : "") + pad(ticks);
      }
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Backwards": {
    name: "⮀ ƨbяɒwʞɔɒꓭ",
    formatter: (ms) => {
      const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
      const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
      const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
      let out = [h, m, s].filter(x=>x!==null).join((showHours || showMinutes) ? ":" : "");
      if (showTicks) {
        const ticks = Math.floor((ms % 1000) / msPerTick);
        out += (out.length ? "." : "") + pad(ticks);
      }
      return `<span style="display:inline-block;transform:scaleX(-1);">` +
        [...out].map(ch => `<span class="monochar">${ch}</span>`).join('') +
        `</span>`;
    }
  },
  "esreveR": {
    name: "esreveR",
    formatter: (ms) => {
      const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
      const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
      const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
      let out = [h, m, s].filter(x=>x!==null).join((showHours || showMinutes) ? ":" : "");
      if (showTicks) {
        const ticks = Math.floor((ms % 1000) / msPerTick);
        out += (out.length ? "." : "") + pad(ticks);
      }
      let reversed = out.split('').reverse().join('');
      return [...reversed].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Marquee": {
    name: "Marquee",
    formatter: (() => {
      let offset = 0;
      let lastUpdate = Date.now();
      const speed = 80;
      return (ms) => {
        const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
        const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
        const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
        let out = [h, m, s].filter(x=>x!==null).join((showHours || showMinutes) ? ":" : "");
        if (showTicks) {
          const ticks = Math.floor((ms % 1000) / msPerTick);
          out += (out.length ? "." : "") + pad(ticks);
        }
        const now = Date.now();
        const dt = (now - lastUpdate) / 1000;
        lastUpdate = now;
        offset -= speed * dt / 16;
        if (offset < -out.length) offset = out.length;
        const padLen = 10;
        const scrollText = " ".repeat(padLen) + out + " ".repeat(padLen);
        let start = Math.floor(offset) % (out.length + padLen);
        if (start < 0) start += (out.length + padLen);
        const visible = scrollText.substring(start, start + 10);
        return [...visible].map(ch => `<span class="monochar">${ch}</span>`).join('');
      };
    })()
  },
  "Rotating Time": {
    name: "Rotating Time",
    formatter: (ms) => {
      const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
      const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
      const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
      const t = showTicks ? pad(Math.floor((ms % 1000) / msPerTick)) : null;
      const hourAngle = ((h ? parseInt(h) : 0) % 24) * (360 / 24);
      const minuteAngle = (m ? parseInt(m) : 0) * (360 / 60);
      const secondAngle = (s ? parseInt(s) : 0) * (360 / 60);
      const tickAngle = t !== null ? parseInt(t) * (360 / 40) : 0;
      let out = [];
      if (h) out.push(`<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${hourAngle}deg);">${h}</span>`);
      if (m) {
        out.push(`<span class="monochar">:</span>`);
        out.push(`<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${minuteAngle}deg);">${m}</span>`);
      }
      if (s) {
        out.push(`<span class="monochar">:</span>`);
        out.push(`<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${secondAngle}deg);">${s}</span>`);
      }
      if (t) {
        out.push(`<span class="monochar">.</span>`);
        out.push(`<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${tickAngle}deg);">${t}</span>`);
      }
      return out.join('');
    }
  },
  "LGBTQ Pride": {
    name: "LGBTQ Pride",
    formatter: (ms) => {
      const flagColors = [
        "#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787",
        "#FFF430", "#7851A9", "#FFFFFF", "#F5A9B8", "#55CDFC", "#603813", "#000000"
      ];
      const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
      const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
      const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
      let timeStr = [h,m,s].filter(x=>x!==null).join(":");
      if (showTicks) {
        const ticks = Math.floor((ms % 1000) / msPerTick);
        timeStr += "." + pad(ticks);
      }
      const offset = Math.floor(Date.now() / 250) % flagColors.length;
      let html = "";
      for (let i = 0; i < timeStr.length; ++i) {
        const ch = timeStr[i];
        if (!/[0-9.]/.test(ch)) {
          html += `<span class="monochar" style="color:#cccccc;">${ch}</span>`;
          continue;
        }
        const color = flagColors[(i + offset) % flagColors.length];
        html += `<span class="monochar" style="color:${color};">${ch}</span>`;
      }
      return html;
    }
  },
  "Rainbow": {
    name: "Rainbow Hurrah",
    formatter: (ms) => {
      const h = showHours ? pad(Math.floor(ms / 3600000)) : null;
      const m = showMinutes ? pad(Math.floor((ms / 60000) % 60)) : null;
      const s = showSeconds ? pad(Math.floor((ms / 1000) % 60)) : null;
      let timeStr = [h,m,s].filter(x=>x!==null).join(":");
      if (showTicks) {
        const ticks = Math.floor((ms % 1000) / msPerTick);
        timeStr += "." + pad(ticks);
      }
      let html = [...timeStr].map((ch, i) => {
        let hue = (Date.now() / 8 + i * 40) % 360;
        return `<span class="monochar" style="color:hsl(${hue},100%,60%);">${ch}</span>`;
      }).join('');
      return html;
    }
  }
};

const allowedClockModes = [
  "Standard [23:59:59]",
  "Upside Down",
  "Backwards",
  "esreveR",
  "Marquee",
  "Rotating Time",
  "LGBTQ Pride",
  "Rainbow"
];

const standardClockModes = {};
for (const k of allowedClockModes) {
    if (typeof clockModes[k] !== "undefined") standardClockModes[k] = clockModes[k];
}

function formatClock(ms) {
  return (standardClockModes[clockMode] || standardClockModes["Standard [23:59:59]"]).formatter(ms);
}

function populateClockModesDropdown() {
    const select = document.getElementById('clockModeSelect');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(standardClockModes).forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = standardClockModes[mode].name;
        option.textContent = tempDiv.textContent;
        if (mode === "Upside Down") {
            option.textContent = "uʍop ǝpᴉsdn ⥃";
        }
        if (mode === "Backwards") {
            option.textContent = "⮀ ƨbяɒwʞɔɒꓭ";
        }
        select.appendChild(option);
    });
    select.value = localStorage.getItem('clockMode') || "Standard [23:59:59]";
}

function setClockInterval() {
    if (clockModeInterval) clearInterval(clockModeInterval);

    let delay = 1000;
    if (
        clockMode === "Laggy" ||
        clockMode === "Badly Laggy" ||
        clockMode === "Horrendously Laggy" ||
        clockMode === "Max Laggy"
    ) delay = msPerTick;
    else if (showTicks) delay = msPerTick;

    clockModeInterval = setInterval(updateTimerDisplay, delay);
}

// --- Music & Hurry Up Playback Logic ---

let musicAudio = null;
let hurryUpAudio = null;
let hurryUpTriggered = false;
let hurryUpPlaying = false;
let hurryUpSpeedupDone = false;

function playMusicIfNeeded() {
  if (musicUrl) {
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
    }
    musicAudio = new Audio(musicUrl);
    musicAudio.loop = true;
    musicAudio.volume = 1;
    musicAudio.play().catch(err => {
      // Show error in console for debugging
      console.error("Music audio playback failed:", err);
    });
  }
  hurryUpTriggered = false;
  hurryUpPlaying = false;
  hurryUpSpeedupDone = false;
}

function pauseMusic() {
  if (musicAudio) musicAudio.pause();
}

function stopMusicAndHurryUp() {
  if (musicAudio) {
    musicAudio.pause(); musicAudio.currentTime = 0;
    musicAudio = null;
  }
  if (hurryUpAudio) {
    hurryUpAudio.pause(); hurryUpAudio.currentTime = 0;
    hurryUpAudio = null;
  }
  hurryUpTriggered = false;
  hurryUpPlaying = false;
  hurryUpSpeedupDone = false;
}

function handleMusicAndHurryUp(msLeft, prevMsLeft) {
  if (timerState !== "running") return;
  let hurryUpTimeMs = 60000;
  if (hurryUpMain === "soniclw") hurryUpTimeMs = 30000;
  // Trigger exactly when crossing threshold
  if (!hurryUpTriggered && prevMsLeft > hurryUpTimeMs && msLeft <= hurryUpTimeMs) {
      hurryUpTriggered = true;
      hurryUpPlaying = true;
      playHurryUpSound();
      if (hurryUpMain === "mario" && musicAudio && !hurryUpSpeedupDone) {
          musicAudio.pause();
          musicAudio.currentTime = 0;
          musicAudio.playbackRate = 1.25;
          musicAudio.play().catch(() => {});
          hurryUpSpeedupDone = true;
      }
  }
}

function playHurryUpSound() {
  if (!hurryUpSub) return; // Do nothing if NONE selected
  if (hurryUpAudio) {
    hurryUpAudio.pause();
    hurryUpAudio = null;
  }
  let hurryupPath = "hurryup/" + hurryUpSub + ".mp3";
  hurryUpAudio = new Audio(hurryupPath);
  hurryUpAudio.volume = 1;
  hurryUpAudio.play().catch(() => {});
}

// --- Settings UI listeners: music url & hurry up ---
document.addEventListener('DOMContentLoaded', () => {
  // Music URL
  document.getElementById('musicUrlInput').value = musicUrl;

  // Confirmation logic for music URL submit
  const musicUrlRow = document.getElementById('musicUrlRow');
  const submitBtn = document.getElementById('musicUrlSubmitBtn');
  const confirmSpan = document.getElementById('musicUrlConfirm');
  submitBtn.addEventListener('click', function() {
    let input = document.getElementById('musicUrlInput');
    let url = input.value.trim();
    if (!url) {
      confirmSpan.style.display = "block";
      confirmSpan.style.color = "#ff7373";
      confirmSpan.textContent = "Please enter a valid URL.";
      setTimeout(() => { confirmSpan.style.display = "none"; }, 1600);
      return;
    }
    musicUrl = url;
    saveMusicAndHurryUpSettings();
    confirmSpan.style.display = "block";
    confirmSpan.style.color = "#7fd87e";
    confirmSpan.textContent = "Saved!";
    setTimeout(() => { confirmSpan.style.display = "none"; }, 1300);
  });

  // ... rest of DOMContentLoaded as before ...
  populateHurryUpDropdowns();
  document.getElementById('hurryUpMain').addEventListener('change', function() {
    hurryUpMain = this.value;
    saveMusicAndHurryUpSettings();
    hurryUpSub = hurryUpPresets[hurryUpMain].sub[0].value;
    saveMusicAndHurryUpSettings();
    populateHurryUpDropdowns();
  });
  document.getElementById('hurryUpSub').addEventListener('change', function() {
    hurryUpSub = this.value;
    saveMusicAndHurryUpSettings();
    populateHurryUpDropdowns();
  });

  // --- Rest of DOMContentLoaded (settings & timer logic) ---
  applyFontFamily(fontType);
  updateTimerDisplay();
  syncInputWithDisplay();
  updateStartPauseBtn();

  document.getElementById('timerInput').style.display = "none";
  document.getElementById('timerDisplay').style.display = "";

  // Settings modal logic
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  settingsBtn.addEventListener('click', () => {
      updateFontUI();
      updateShowHideCheckboxUI();
      populateClockModesDropdown();
      document.getElementById('clockModeSelect').value = clockMode;
      populateHurryUpDropdowns();
      document.getElementById('musicUrlInput').value = musicUrl;
      settingsModal.classList.add('show');
  });
  closeSettings.addEventListener('click', () => {
      settingsModal.classList.remove('show');
  });
  settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
          settingsModal.classList.remove('show');
      }
  });

  document.getElementById('clockModeSelect').addEventListener('change', function() {
      clockMode = this.value;
      localStorage.setItem('clockMode', clockMode);
      setClockInterval();
      updateTimerDisplay();
  });

  document.getElementById('timerDisplay').addEventListener('click', () => {
      if (timerState === "running") return;
      enableTimerEditMode();
  });
  document.getElementById('timerDisplay').addEventListener('keydown', (e) => {
      if (timerState === "running") return;
      if (e.key === 'Enter' || e.key === ' ') enableTimerEditMode();
  });
  document.getElementById('timerInput').addEventListener('blur', () => {
      setTimerFromInput();
      disableTimerEditMode();
      syncInputWithDisplay();
  });
  document.getElementById('timerInput').addEventListener('keydown', (e) => {
      if (e.key === "Enter") {
          setTimerFromInput();
          disableTimerEditMode();
          syncInputWithDisplay();
      }
  });

  document.getElementById('startPauseBtn').addEventListener('click', () => {
      if (timerState === "running") {
          startPause();
      } else {
          setTimerFromInput();
          disableTimerEditMode();
          startPause();
      }
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
      resetTimer();
      syncInputWithDisplay();
  });

  document.getElementById('fontSelect').addEventListener('change', function() {
      fontType = this.value;
      localStorage.setItem('timerFontType', fontType);
      applyFontFamily(fontType);
      updateFontUI();
  });

  document.getElementById('importCustomFont').addEventListener('click', () => {
      document.getElementById('customFontFile').value = '';
      document.getElementById('customFontFile').click();
  });
  document.getElementById('customFontFile').addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return;
      customFontName = file.name;
      localStorage.setItem('timerFontType', 'custom');
      localStorage.setItem('timerCustomFontName', file.name);

      const reader = new FileReader();
      reader.onload = function(e) {
          customFontData = e.target.result;
          localStorage.setItem('timerCustomFontData', customFontData);
          applyFontFamily('custom');
          updateFontUI();
          document.getElementById('customFontNotice').style.display = 'block';
      };
      reader.readAsDataURL(file);
  });

  document.getElementById('showAuto').addEventListener('change', function() {
      showAuto = this.checked;
      saveShowHideSettings();
      updateShowHideCheckboxUI();
      setTimerFromInput();
      updateTimerDisplay();
      syncInputWithDisplay();
  });
  document.getElementById('showHours').addEventListener('change', function() {
      showHours = this.checked;
      saveShowHideSettings(); setTimerFromInput(); updateTimerDisplay(); syncInputWithDisplay(); updateShowHideCheckboxUI();
  });
  document.getElementById('showMinutes').addEventListener('change', function() {
      showMinutes = this.checked;
      saveShowHideSettings(); setTimerFromInput(); updateTimerDisplay(); syncInputWithDisplay(); updateShowHideCheckboxUI();
  });
  document.getElementById('showSeconds').addEventListener('change', function() {
      showSeconds = this.checked;
      saveShowHideSettings(); setTimerFromInput(); updateTimerDisplay(); syncInputWithDisplay(); updateShowHideCheckboxUI();
  });
  document.getElementById('showTicks').addEventListener('change', function() {
      showTicks = this.checked;
      saveShowHideSettings(); setTimerFromInput(); updateTimerDisplay(); syncInputWithDisplay(); updateShowHideCheckboxUI();
  });

  updateShowHideCheckboxUI();
  setClockInterval();
});