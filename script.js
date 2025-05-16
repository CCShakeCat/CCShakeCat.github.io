// Set default msPerSecond if not set
if (!localStorage.getItem('msPerSecond')) {
  localStorage.setItem('msPerSecond', '40');
}
let msPerSecond = parseInt(localStorage.getItem('msPerSecond')) || 40;
let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';

let keybinds = {
  startStop: localStorage.getItem('keybind-startStop') || 'Enter',
  reset: localStorage.getItem('keybind-reset') || 'Shift+Enter'
};
let firefoxQuickFindSuppressed = false;

let stopwatchInterval = null;
let elapsed = 0;
let running = false;

// --- Utility functions for keybind formatting ---
function keyEventToKeybind(e) {
  let keys = [];
  if (e.ctrlKey) keys.push("Ctrl");
  if (e.altKey) keys.push("Alt");
  if (e.metaKey) keys.push("Meta");
  if (e.shiftKey && e.key !== "Shift") keys.push("Shift");
  // Numpad mapping
  if (/^Numpad\d$/.test(e.code)) {
    keys.push('num' + e.code[e.code.length - 1]);
  } else if (e.code === "NumpadEnter") {
    keys.push("numEnter");
  } else {
    // Use e.key for most cases, but prettify
    let k = e.key;
    if (k === " ") k = "Space";
    if (k === "Enter") k = "Return";
    if (k === "/") k = "Slash";
    if (k === "Backslash") k = "Backslash";
    // Prevent double-Shift (from shiftKey + e.key === "Shift")
    if (k !== "Shift") keys.push(k);
  }
  // Remove duplicates, join
  return [...new Set(keys)].join("+");
}
function displayKeybind(keybind) {
  // Prettify for display
  return keybind
    .replace(/\+?/g, m => m) // keep pluses
    .replace(/num(\d)/g, "num$1")
    .replace("Return", "RETURN")
    .replace("Shift", "SHIFT")
    .replace("Ctrl", "CTRL")
    .replace("Alt", "ALT")
    .replace("Meta", "META")
    .replace("Slash", "/")
    .replace("Backslash", "\\")
    .replace("numEnter", "NUMENTER");
}

// --- Stopwatch core ---
applyFontFamily(savedFont);

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

function updateStartStopBtn() {
    const btn = document.getElementById('startStopBtn');
    if (btn) btn.textContent = running ? "STOP" : "START";
}

function startStop() {
    if (running) {
        clearInterval(stopwatchInterval);
        running = false;
    } else {
        msPerSecond = parseInt(localStorage.getItem('msPerSecond')) || 40;
        stopwatchInterval = setInterval(() => {
            elapsed += msPerSecond;
            updateDisplay();
        }, msPerSecond);
        running = true;
    }
    updateStartStopBtn();
}

function reset() {
    clearInterval(stopwatchInterval);
    running = false;
    elapsed = 0;
    updateDisplay();
    updateStartStopBtn();
}

// --- Keybind UI logic ---
function updateKeybindInputs() {
    document.getElementById('keybind-startstop').textContent = displayKeybind(keybinds.startStop);
    document.getElementById('keybind-reset').textContent = displayKeybind(keybinds.reset);
}

// Keybind overlay logic
let overlayTimeout = null;
let overlayCountdownInterval = null;
function showKeybindOverlay(action, onSet) {
    const overlay = document.getElementById('keybindOverlay');
    const instruction = document.getElementById('keybindOverlayInstruction');
    const countdown = document.getElementById('keybindOverlayCountdown');
    let seconds = 7;
    instruction.textContent = `ENTER KEYBIND FOR ${action === "startStop" ? "START/STOP" : "RESET"}`;
    countdown.textContent = `This dialogue will close in ${seconds}s`;
    overlay.style.display = "flex";
    overlayTimeout = setTimeout(hideKeybindOverlay, seconds * 1000);
    overlayCountdownInterval = setInterval(() => {
        seconds--;
        countdown.textContent = `This dialogue will close in ${seconds}s`;
        if (seconds <= 0) hideKeybindOverlay();
    }, 1000);

    function keyListener(e) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(overlayTimeout);
        clearInterval(overlayCountdownInterval);
        overlay.style.display = "none";
        document.removeEventListener('keydown', keyListener, true);
        let kb = keyEventToKeybind(e);
        onSet(kb);
    }
    document.addEventListener('keydown', keyListener, true);

    overlay.onclick = function() {
        hideKeybindOverlay();
    }
    function hideKeybindOverlay() {
        clearTimeout(overlayTimeout);
        clearInterval(overlayCountdownInterval);
        overlay.style.display = "none";
        document.removeEventListener('keydown', keyListener, true);
    }
}

// --- Settings/modal logic ---
document.addEventListener("DOMContentLoaded", () => {
  // Modal open/close logic
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const msDropdown = document.getElementById('msDropdown');
  const fontSelect = document.getElementById('fontSelect');
  const closeSettings = document.getElementById('closeSettings');
  const importCustomFont = document.getElementById('importCustomFont');
  const customFontFile = document.getElementById('customFontFile');
  const customFontName = document.getElementById('customFontName');

  // Stopwatch buttons
  const startStopBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');

  // Keybind inputs in modal
  const keybindInputStartStop = document.getElementById('keybind-startstop');
  const keybindInputReset = document.getElementById('keybind-reset');

  // Keybind overlay
  updateKeybindInputs();

  if (settingsBtn && settingsModal && msDropdown && fontSelect && closeSettings && importCustomFont && customFontFile && customFontName) {
    settingsBtn.onclick = () => {
      msDropdown.value = localStorage.getItem('msPerSecond') || "40";
      const font = localStorage.getItem('stopwatchFontType') || "default";
      fontSelect.value = font;
      customFontName.textContent = '';
      updateKeybindInputs();
      settingsModal.classList.add('show');
    };
    closeSettings.onclick = () => {
      settingsModal.classList.remove('show');
    };
    importCustomFont.onclick = () => {
      customFontFile.click();
    };
    customFontFile.onchange = function() {
      const file = this.files[0];
      customFontName.textContent = file ? file.name : '';
      if (file) {
        localStorage.setItem('stopwatchFontType', 'custom');
        const reader = new FileReader();
        reader.onload = function(e) {
          const fontData = e.target.result;
          const fontName = file.name.replace(/\.[^/.]+$/, "");
          const style = document.createElement('style');
          style.innerHTML = `
            @font-face {
              font-family: '${fontName}';
              src: url(${fontData});
            }
          `;
          document.head.appendChild(style);
          localStorage.setItem('stopwatchFont', fontName);
          applyFontFamily(fontName);
        };
        reader.readAsDataURL(file);
      }
    };
    fontSelect.onchange = function() {
      if (this.value !== 'custom') {
        customFontName.textContent = '';
      }
      applyAndSaveFont(this.value);
    };
    msDropdown.onchange = function() {
      localStorage.setItem('msPerSecond', this.value);
      msPerSecond = parseInt(this.value);
      if (running) {
        clearInterval(stopwatchInterval);
        running = false;
        startStop();
      }
    };

    // Keybind listening UI
    keybindInputStartStop.onclick = function(e) {
      keybindInputStartStop.classList.add('listening');
      showKeybindOverlay("startStop", function(newKeybind) {
        keybinds.startStop = newKeybind;
        localStorage.setItem('keybind-startStop', newKeybind);
        updateKeybindInputs();
        keybindInputStartStop.classList.remove('listening');
        // If Firefox and new keybind contains "/", suppress quick find
        updateFirefoxQuickFindSuppression();
      });
    };
    keybindInputReset.onclick = function(e) {
      keybindInputReset.classList.add('listening');
      showKeybindOverlay("reset", function(newKeybind) {
        keybinds.reset = newKeybind;
        localStorage.setItem('keybind-reset', newKeybind);
        updateKeybindInputs();
        keybindInputReset.classList.remove('listening');
      });
    };
  }

  // Remove inline onclick from HTML, use JS handlers
  if (startStopBtn) startStopBtn.onclick = startStop;
  if (resetBtn) resetBtn.onclick = reset;
  updateStartStopBtn();
});

// --- System font logic ---
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
  if (fontType === 'system') {
    const os = detectOS();
    if (os === 'windows') fontStack = "'Segoe UI', Arial, sans-serif";
    else if (os === 'android') fontStack = "Roboto, Arial, sans-serif";
    else fontStack = "'San Francisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  } else {
    fontStack = `'${fontType}', sans-serif`;
  }
  if (sw) sw.style.fontFamily = fontStack;
}

function applyAndSaveFont(type) {
  localStorage.setItem('stopwatchFontType', type);
  if (type === 'system') {
    applyFontFamily('system');
    localStorage.setItem('stopwatchFont', 'system');
    return;
  }
  if (type === 'default') {
    applyFontFamily('FancyCatPX');
    localStorage.setItem('stopwatchFont', 'FancyCatPX');
    return;
  }
  // Custom handled on file upload
}

// --- Keybind action handling ---
document.addEventListener('keydown', function(e) {
  // Don't trigger keybinds in modal or overlay
  if (
    document.getElementById('settingsModal').classList.contains('show') ||
    document.getElementById('keybindOverlay').style.display === 'flex'
  ) return;

  let kb = keyEventToKeybind(e);

  if (kb === keybinds.startStop) {
    e.preventDefault();
    startStop();
  } else if (kb === keybinds.reset) {
    e.preventDefault();
    reset();
  }
  // Firefox '/' quick find suppression
  if (
    isFirefox() &&
    (keybinds.startStop.includes("Slash") || keybinds.reset.includes("Slash")) &&
    (e.key === "/" || e.code === "Slash" || e.key === "Divide")
  ) {
    e.preventDefault();
  }
}, true);

function isFirefox() {
  return navigator.userAgent.toLowerCase().includes('firefox');
}

function updateFirefoxQuickFindSuppression() {
  // Only needed if '/' is a keybind on Firefox
  firefoxQuickFindSuppressed = isFirefox() && (
    keybinds.startStop.includes("Slash") || keybinds.reset.includes("Slash")
  );
}

// Initial display
updateDisplay();
updateStartStopBtn();
updateFirefoxQuickFindSuppression();
