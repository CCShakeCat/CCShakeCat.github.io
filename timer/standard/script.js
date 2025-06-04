// ========== TIMER APP SCRIPT.JS ==========

// --- Global State ---
let msPerTick = 25; // 40 ticks per second
let timerState = "stopped"; // stopped, running, paused
let timerSetMs = 9 * 60 * 1000 + 59 * 1000; // Default 09:59.00
let timerLeftMs = timerSetMs;
let wallStart = null;
let wallEnd = null;
let pausedAt = null;
let rafId = null;
let fontType = localStorage.getItem('timerFontType') || 'default';
let customFontName = localStorage.getItem('timerCustomFontName') || '';
let customFontData = localStorage.getItem('timerCustomFontData') || null;

// Show/hide units
let showHours = (localStorage.getItem('timerShowHours') ?? "1") === "1";
let showMinutes = (localStorage.getItem('timerShowMinutes') ?? "1") === "1";
let showSeconds = (localStorage.getItem('timerShowSeconds') ?? "1") === "1";
let showTicks = (localStorage.getItem('timerShowTicks') ?? "1") === "1";

// ========== Formatting Helpers ==========
function pad(num, len=2) { return num.toString().padStart(len, "0"); }

function formatTimer(ms) {
    let ticks = Math.floor((ms % 1000) / msPerTick);
    let s = Math.floor(ms / 1000);
    let sec = s % 60;
    let min = Math.floor(s / 60) % 60;
    let hr = Math.floor(s / 3600);

    let showH = showHours, showM = showMinutes, showS = showSeconds, showT = showTicks;
    let out = [];

    // If only Ticks
    if (showT && !showS && !showM && !showH) {
        let totalTicks = Math.floor(ms / msPerTick);
        out.push(totalTicks.toString());
    }
    // If only Seconds (NO ticks): show integer seconds only
    else if (showS && !showT && !showM && !showH) {
        let totalSec = Math.floor(ms / 1000);
        out.push(totalSec.toString());
    }
    // If only Minutes
    else if (showM && !showS && !showT && !showH) {
        let totalMin = ms / 60000;
        out.push(totalMin.toFixed(4));
    }
    // If only Hours
    else if (showH && !showM && !showS && !showT) {
        let totalHr = ms / 3600000;
        out.push(totalHr.toFixed(6));
    }
    // If only Seconds and Ticks (and not Minutes/Hours)
    else if (!showH && !showM && showS && showT) {
        let totalSec = Math.floor(ms / 1000);
        out.push(pad(totalSec));
        out.push('.');
        out.push(pad(ticks));
    }
    // Otherwise: show by normal units, respecting which are checked
    else {
        if (showH) out.push(pad(hr));
        if (showM) out.push(pad(min));
        if (showS) out.push(pad(sec));
        let joined = out.join((showH || showM) ? ":" : "");
        // Only append .tt ticks if showT is true
        if (showT) {
            joined += (out.length ? "." : "") + pad(ticks);
        }
        out = [joined];
    }
    return out.join("");
}

function displayTimer(ms) {
    let s = formatTimer(ms);
    // Insert monochar spans for each char (except for input)
    return [...s].map(ch =>
        `<span class="monochar">${ch === " " ? "&nbsp;" : ch}</span>`
    ).join("");
}

// --- Parse input timer string based on visible units ---
function parseTimerInput(str) {
    str = str.trim().replace(/,/g, '.');
    // Only 1 visible: parse as that unit.
    if ([showHours, showMinutes, showSeconds, showTicks].filter(x => x).length === 1) {
        if (showTicks) {
            let ticks = parseInt(str.replace(/[^\d]/g,''));
            if (isNaN(ticks)) ticks = 0;
            return ticks * msPerTick;
        }
        if (showSeconds) {
            let sec = parseInt(str, 10);
            if (isNaN(sec)) sec = 0;
            return sec * 1000;
        }
        if (showMinutes) {
            let min = parseFloat(str);
            if (isNaN(min)) min = 0;
            return Math.round(min * 60000);
        }
        if (showHours) {
            let hr = parseFloat(str);
            if (isNaN(hr)) hr = 0;
            return Math.round(hr * 3600000);
        }
    }
    // If only Seconds and Ticks (and not Minutes/Hours): parse as sstt (e.g. 120.39)
    if (!showHours && !showMinutes && showSeconds && showTicks) {
        // Accept formats like 120.39 or 120
        let parts = str.split(".");
        let sec = parseInt(parts[0], 10) || 0;
        let ticks = parts[1] ? parseInt(parts[1].substring(0,2),10)||0 : 0;
        return sec * 1000 + ticks * msPerTick;
    }
    // Otherwise: parse colon/period separated
    let h=0, m=0, s=0, t=0;
    let main = str.split(".");
    let nums = main[0].split(":").map(x => parseInt(x,10));
    if (showHours && nums.length === 3) [h,m,s] = nums;
    else if (!showHours && nums.length === 2) [m,s] = nums;
    else if (nums.length === 1) [s] = nums;
    if (showTicks && main.length > 1) {
        t = parseInt(main[1].substring(0,2),10) || 0;
    }
    return ((h||0)*3600 + (m||0)*60 + (s||0))*1000 + (t||0)*msPerTick;
}

// --- Core timer logic with wall-clock accuracy and "extra second" ---
function updateTimerDisplay() {
    const disp = document.getElementById('timerDisplay');
    if (disp) disp.innerHTML = displayTimer(timerLeftMs);
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
    if (msLeft > 0) {
        rafId = requestAnimationFrame(wallClockTick);
    } else {
        timerState = "stopped";
        updateStartPauseBtn();
    }
}

function startPause() {
    if (timerState === "running") {
        // Pause timer
        timerState = "paused";
        pausedAt = performance.now();
        cancelAnimationFrame(rafId);
        updateStartPauseBtn();
    } else {
        if (timerState === "paused" && pausedAt && wallEnd) {
            // Resume
            let pauseDur = performance.now() - pausedAt;
            wallEnd += pauseDur;
        } else {
            // Start from set value, and if ticks==0, start at last tick
            timerLeftMs = timerSetMs;
            const ticksPerSec = Math.round(1000 / msPerTick);
            let ticks = Math.floor((timerLeftMs % 1000) / msPerTick);
            if (ticks === 0) {
                timerLeftMs += msPerTick * (ticksPerSec - 1);
            }
            wallStart = performance.now();
            wallEnd = wallStart + timerLeftMs;
        }
        timerState = "running";
        pausedAt = null;
        updateStartPauseBtn();
        rafId = requestAnimationFrame(wallClockTick);
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
    const ids = ['showHours', 'showMinutes', 'showSeconds', 'showTicks'];
    const flags = [showHours, showMinutes, showSeconds, showTicks];
    const count = flags.filter(Boolean).length;
    ids.forEach((id, idx) => {
        const box = document.getElementById(id);
        const label = box.closest('label');
        box.checked = flags[idx];
        box.disabled = (count === 1 && flags[idx]);
        if (box.disabled && label) label.classList.add('disabled-checkbox');
        else if (label) label.classList.remove('disabled-checkbox');
    });
}
function saveShowHideSettings() {
    localStorage.setItem('timerShowHours', showHours ? "1" : "0");
    localStorage.setItem('timerShowMinutes', showMinutes ? "1" : "0");
    localStorage.setItem('timerShowSeconds', showSeconds ? "1" : "0");
    localStorage.setItem('timerShowTicks', showTicks ? "1" : "0");
}

// --- Modal logic, startup, event handlers ---
document.addEventListener("DOMContentLoaded", () => {
    // Font
    applyFontFamily(fontType);
    // Timer
    updateTimerDisplay();
    syncInputWithDisplay();
    updateStartPauseBtn();

    document.getElementById('timerInput').style.display = "none";
    document.getElementById('timerDisplay').style.display = "";

    // Click on clock to edit
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

    // Settings modal logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    settingsBtn.addEventListener('click', () => {
        updateFontUI();
        updateShowHideCheckboxUI();
        settingsModal.classList.add('show');
    });
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });
    // Optional: close modal on outside click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
        }
    });

    // Font selector
    document.getElementById('fontSelect').addEventListener('change', function() {
        fontType = this.value;
        localStorage.setItem('timerFontType', fontType);
        applyFontFamily(fontType);
        updateFontUI();
    });

    // Custom font import
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

    // Show/hide checkboxes
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

    // On load, update the disabled state of checkboxes
    updateShowHideCheckboxUI();
});