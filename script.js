// Stopwatch state (global)
let msPerSecond = 40;
let elapsed = 0;
let running = false;
let stopwatchInterval = null;

// Font state (global)
let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('stopwatchFontType') || 'default';
let customFontData = localStorage.getItem('customFontData') || null;
let customFontName = localStorage.getItem('customFontName') || '';

// --- Stopwatch Functions ---
function formatTime(ms) {
    let milliseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    let seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
    let minutes = Math.floor((ms / (1000 * 60)) % 60).toString().padStart(2, '0');
    let hours = Math.floor(ms / (1000 * 60 * 60)).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
function updateDisplay() {
    const display = document.getElementById('display');
    if (display) display.textContent = formatTime(elapsed);
}
function startStop() {
    if (running) {
        clearInterval(stopwatchInterval);
        running = false;
    } else {
        clearInterval(stopwatchInterval);
        stopwatchInterval = setInterval(() => {
            elapsed += msPerSecond;
            updateDisplay();
        }, msPerSecond);
        running = true;
    }
}
function reset() {
    clearInterval(stopwatchInterval);
    running = false;
    elapsed = 0;
    updateDisplay();
}

// --- Font Logic ---
function detectOS() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "windows";
    if (/Android/i.test(ua)) return "android";
    if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
    return "windows"; // fallback
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

// --- DOMContentLoaded for UI Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // Button and modal elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const fontSelect = document.getElementById('fontSelect');
    const closeSettings = document.getElementById('closeSettings');
    const importCustomFont = document.getElementById('importCustomFont');
    const customFontFile = document.getElementById('customFontFile');
    const customFontNameElem = document.getElementById('customFontName');
    const startStopBtn = document.getElementById('startStopBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Stopwatch button events (using addEventListener ensures scoping works)
    startStopBtn.addEventListener('click', startStop);
    resetBtn.addEventListener('click', reset);

    // Settings modal logic
    settingsBtn.addEventListener('click', () => {
        fontSelect.value = localStorage.getItem('stopwatchFontType') || "default";
        customFontNameElem.textContent = localStorage.getItem('customFontName') || '';
        settingsModal.classList.add('show');
    });
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    // Font import & selection logic
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
    });

    // Initial font application
    if (savedFontType === 'custom') {
        applyFontFamily('custom');
    } else {
        applyFontFamily(savedFontType);
    }

    // Initial display
    updateDisplay();
});
