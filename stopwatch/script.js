// Wall-clock accurate stopwatch with system-font settings modal and dynamic button/icon updates
let msPerTick = 25; // 40 ticks per second: shows .00 - .39
let running = false;
let intervalId = null;
let startTimestamp = null;
let elapsedBefore = 0; // ms accumulated before current run

let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('stopwatchFontType') || 'default';
let customFontData = localStorage.getItem('customFontData') || null;
let customFontName = localStorage.getItem('customFontName') || '';

// --- Show/hide state for units ---
let showHours = (localStorage.getItem('showHours') ?? "1") === "1";
let showMinutes = (localStorage.getItem('showMinutes') ?? "1") === "1";
let showSeconds = (localStorage.getItem('showSeconds') ?? "1") === "1";
let showTicks = (localStorage.getItem('showTicks') ?? "1") === "1";

// --- Format time with show/hide logic ---
function formatTime(ms) {
    const msTick = Math.floor((ms % 1000) / msPerTick);
    const s = Math.floor(ms / 1000);
    const sec = s % 60;
    const min = Math.floor(s / 60) % 60;
    const hr = Math.floor(s / 3600);

    let out = [];

    if (showTicks && !showSeconds && !showMinutes && !showHours) {
        // Only ticks
        out.push(Math.floor(ms / msPerTick).toString());
    } else if (showSeconds && !showTicks && !showMinutes && !showHours) {
        // Only seconds
        out.push(Math.floor(ms / 1000).toString());
    } else if (showMinutes && !showSeconds && !showTicks && !showHours) {
        // Only minutes
        out.push((ms / 60000).toFixed(4));
    } else if (showHours && !showMinutes && !showSeconds && !showTicks) {
        // Only hours
        out.push((ms / 3600000).toFixed(6));
    } else if (!showHours && !showMinutes && showSeconds && showTicks) {
        // Only seconds and ticks
        out.push(sec.toString().padStart(2, '0'));
        out.push('.');
        out.push(msTick.toString().padStart(2, '0'));
    } else {
        if (showHours) out.push(hr.toString().padStart(2, '0'));
        if (showMinutes) out.push(min.toString().padStart(2, '0'));
        if (showSeconds) out.push(sec.toString().padStart(2, '0'));
        let joined = out.join((showHours || showMinutes) ? ":" : "");
        if (showTicks) {
            joined += (out.length ? "." : "") + msTick.toString().padStart(2, '0');
        }
        out = [joined];
    }

    return [...out.join('')].map(ch => `<span class="monochar">${ch}</span>`).join('');
}

function getElapsed() {
    if (running) {
        return elapsedBefore + (Date.now() - startTimestamp);
    } else {
        return elapsedBefore;
    }
}

function updateDisplay() {
    const display = document.getElementById('display');
    if (display) display.innerHTML = formatTime(getElapsed());
}

function updateStartStopButton() {
    const btn = document.getElementById('startStopBtn');
    if (btn) {
        btn.textContent = running ? "Stop" : "Start";
        btn.classList.toggle('running', running); // For styling
    }
}

function startStop() {
    if (running) {
        clearInterval(intervalId);
        elapsedBefore += Date.now() - startTimestamp;
        running = false;
    } else {
        startTimestamp = Date.now();
        intervalId = setInterval(updateDisplay, msPerTick);
        running = true;
    }
    updateStartStopButton();
}

function reset() {
    clearInterval(intervalId);
    running = false;
    startTimestamp = null;
    elapsedBefore = 0;
    updateDisplay();
    updateStartStopButton();
}

// --- Font logic ---
function detectOS() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "windows";
    if (/Android/i.test(ua)) return "android";
    if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
    return "windows";
}

function applyFontFamily(fontType) {
    const sw = document.querySelector('.stopwatch');
    let fontStack;
    if (fontType === 'custom') {
        const fontData = localStorage.getItem('customFontData');
        const fontName = (localStorage.getItem('customFontName') || 'CustomFont').replace(/\.[^/.]+$/, "");
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
    if (sw) sw.style.fontFamily = fontStack;
    localStorage.setItem('stopwatchFont', fontStack);
}

function applyAndSaveFont(type) {
    if (type === 'system') {
        applyFontFamily('system');
        localStorage.setItem('stopwatchFont', 'system');
    } else {
        applyFontFamily('default');
        localStorage.setItem('stopwatchFont', 'FancyCatPX');
    }
}

// --- Checkbox UI logic ---
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
function saveShowHideState() {
    localStorage.setItem('showHours', showHours ? "1" : "0");
    localStorage.setItem('showMinutes', showMinutes ? "1" : "0");
    localStorage.setItem('showSeconds', showSeconds ? "1" : "0");
    localStorage.setItem('showTicks', showTicks ? "1" : "0");
}

document.addEventListener("DOMContentLoaded", () => {
    // Detect OS for settings modal font
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

    startStopBtn.addEventListener('click', startStop);
    resetBtn.addEventListener('click', reset);

    settingsBtn.addEventListener('click', () => {
        fontSelect.value = localStorage.getItem('stopwatchFontType') || "default";
        customFontNameElem.textContent = localStorage.getItem('customFontName') || '';
        settingsModal.classList.add('show');
        updateCustomFontNotice();
        updateShowHideCheckboxUI();
    });
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
        }
    });

    importCustomFont.addEventListener('click', () => {
        customFontFile.value = '';
        customFontFile.click();
    });
    customFontFile.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        customFontNameElem.textContent = file.name;
        localStorage.setItem('stopwatchFontType', 'custom');
        localStorage.setItem('customFontName', file.name);

        const reader = new FileReader();
        reader.onload = function(e) {
            const fontData = e.target.result;
            localStorage.setItem('customFontData', fontData);
            localStorage.setItem('stopwatchFont', file.name.replace(/\.[^/.]+$/, ""));
            applyFontFamily('custom');
        };
        reader.readAsDataURL(file);
        fontSelect.value = 'custom';
        updateCustomFontNotice();
    });
    fontSelect.addEventListener('change', function() {
        localStorage.setItem('stopwatchFontType', this.value);
        if (this.value === 'custom') {
            applyFontFamily('custom');
            customFontNameElem.textContent = localStorage.getItem('customFontName') || '';
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

    // Show/hide checkboxes logic
    ["showHours","showMinutes","showSeconds","showTicks"].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            if (id === "showHours") showHours = this.checked;
            if (id === "showMinutes") showMinutes = this.checked;
            if (id === "showSeconds") showSeconds = this.checked;
            if (id === "showTicks") showTicks = this.checked;
            saveShowHideState();
            updateShowHideCheckboxUI();
            updateDisplay();
        });
    });
    updateShowHideCheckboxUI();

    updateDisplay();
    updateStartStopButton();
});