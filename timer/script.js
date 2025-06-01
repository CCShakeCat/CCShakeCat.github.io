// Timer with editable initial time, system-font settings modal, and dynamic button/icon updates

let msPerTick = 25; // 40 ticks per second
let running = false;
let intervalId = null;
let targetTime = 0; // ms to count down from
let remainingMs = 0;

let savedFont = localStorage.getItem('timerFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('timerFontType') || 'default';
let customFontData = localStorage.getItem('timerCustomFontData') || null;
let customFontName = localStorage.getItem('timerCustomFontName') || '';

// Format: "HH:MM:SS" or "MM:SS"
function parseTimeString(str) {
    if (!str) return 0;
    let parts = str.trim().split(":").map(s => parseInt(s, 10));
    if (parts.some(isNaN)) return 0;
    while (parts.length < 3) parts.unshift(0); // pad to [hh, mm, ss]
    let [hh, mm, ss] = parts;
    return ((hh * 60 + mm) * 60 + ss) * 1000;
}
function formatTime(ms) {
    let totalSec = Math.max(0, Math.floor(ms / 1000));
    let msTick = Math.floor((ms % 1000) / msPerTick);
    let ss = (totalSec % 60).toString().padStart(2, '0');
    let mm = (Math.floor(totalSec / 60) % 60).toString().padStart(2, '0');
    let hh = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    let msString = msTick.toString().padStart(2, '0');
    return [hh, ':', mm, ':', ss, '.', msString]
        .map(ch => `<span class="monochar">${ch}</span>`).join('');
}
function updateDisplay() {
    const display = document.getElementById('display');
    display.innerHTML = formatTime(remainingMs);
}
function showInput(show) {
    document.getElementById('timerInput').style.display = show ? '' : 'none';
    document.getElementById('display').style.display = show ? 'none' : '';
}
function updateStartStopButton() {
    const btn = document.getElementById('startStopBtn');
    btn.textContent = running ? "Stop" : "Start";
    btn.classList.toggle('running', running);
}
function startStop() {
    if (running) {
        clearInterval(intervalId);
        running = false;
        updateStartStopButton();
        showInput(false);
    } else {
        // On start, if not running, parse time from input
        if (!running) {
            let input = document.getElementById('timerInput');
            targetTime = parseTimeString(input.value);
            if (targetTime <= 0) {
                input.value = "00:10:00";
                targetTime = parseTimeString(input.value);
            }
            remainingMs = targetTime;
            showInput(false);
            updateDisplay();
        }
        let start = Date.now();
        intervalId = setInterval(() => {
            let now = Date.now();
            remainingMs = Math.max(0, remainingMs - (now - start));
            start = now;
            updateDisplay();
            if (remainingMs <= 0) {
                clearInterval(intervalId);
                running = false;
                updateStartStopButton();
                showInput(true);
                // Optional: play sound or show alert when timer ends
            }
        }, msPerTick);
        running = true;
        updateStartStopButton();
    }
}
function reset() {
    clearInterval(intervalId);
    running = false;
    let input = document.getElementById('timerInput');
    remainingMs = parseTimeString(input.value);
    updateDisplay();
    showInput(true);
    updateStartStopButton();
}
function detectOS() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "windows";
    if (/Android/i.test(ua)) return "android";
    if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
    return "windows";
}
// Font logic, nearly identical to stopwatch
function applyFontFamily(fontType) {
    const timer = document.querySelector('.timer');
    let fontStack;
    if (fontType === 'custom') {
        const fontData = localStorage.getItem('timerCustomFontData');
        const fontName = (localStorage.getItem('timerCustomFontName') || 'CustomFont').replace(/\.[^/.]+$/, "");
        if (fontData && fontName) {
            if (!document.getElementById('customFontStyle')) {
                const style = document.createElement('style');
                style.id = 'customFontStyle';
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
    if (timer) timer.style.fontFamily = fontStack;
    localStorage.setItem('timerFont', fontStack);
}
function applyAndSaveFont(type) {
    if (type === 'system') {
        applyFontFamily('system');
        localStorage.setItem('timerFont', 'system');
    } else {
        applyFontFamily('default');
        localStorage.setItem('timerFont', 'FancyCatPX');
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const os = detectOS();
    document.body.setAttribute('data-os', os);

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const fontSelect = document.getElementById('fontSelect');
    const closeSettings = document.getElementById('closeSettings');
    const importCustomFont = document.getElementById('importCustomFont');
    const customFontFile = document.getElementById('customFontFile');
    const customFontNameElem = document.getElementById('customFontName');
    const customFontNotice = document.getElementById('customFontNotice');
    const startStopBtn = document.getElementById('startStopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timerInput = document.getElementById('timerInput');

    startStopBtn.addEventListener('click', startStop);
    resetBtn.addEventListener('click', reset);

    timerInput.addEventListener('focus', function() {
        showInput(true);
    });
    timerInput.addEventListener('blur', function() {
        // Optionally format/validate input
        if (parseTimeString(timerInput.value) <= 0) {
            timerInput.value = "00:10:00";
        }
    });
    timerInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            timerInput.blur();
        }
    });

    settingsBtn.addEventListener('click', () => {
        fontSelect.value = localStorage.getItem('timerFontType') || "default";
        customFontNameElem.textContent = localStorage.getItem('timerCustomFontName') || '';
        settingsModal.classList.add('show');
        updateCustomFontNotice();
    });
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    importCustomFont.addEventListener('click', () => {
        customFontFile.value = '';
        customFontFile.click();
    });
    customFontFile.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        customFontNameElem.textContent = file.name;
        localStorage.setItem('timerFontType', 'custom');
        localStorage.setItem('timerCustomFontName', file.name);

        const reader = new FileReader();
        reader.onload = function(e) {
            const fontData = e.target.result;
            localStorage.setItem('timerCustomFontData', fontData);
            localStorage.setItem('timerFont', file.name.replace(/\.[^/.]+$/, ""));
            applyFontFamily('custom');
        };
        reader.readAsDataURL(file);
        fontSelect.value = 'custom';
        updateCustomFontNotice();
    });
    fontSelect.addEventListener('change', function() {
        localStorage.setItem('timerFontType', this.value);
        if (this.value === 'custom') {
            applyFontFamily('custom');
            customFontNameElem.textContent = localStorage.getItem('timerCustomFontName') || '';
        } else {
            customFontNameElem.textContent = '';
            applyAndSaveFont(this.value);
        }
        updateCustomFontNotice();
    });

    function updateCustomFontNotice() {
        if (fontSelect.value === 'custom' || customFontNameElem.textContent) {
            customFontNotice.style.display = '';
        } else {
            customFontNotice.style.display = 'none';
        }
    }

    if (savedFontType === 'custom') {
        applyFontFamily('custom');
    } else {
        applyFontFamily(savedFontType);
    }

    timerInput.value = "00:10:00";
    remainingMs = parseTimeString(timerInput.value);
    updateDisplay();
    updateStartStopButton();
    showInput(true);
});
