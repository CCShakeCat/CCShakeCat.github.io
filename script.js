// Globals for stopwatch logic
let msPerSecond = 40;
let elapsed = 0;
let running = false;
let stopwatchInterval = null;

// Font handling state
let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('stopwatchFontType') || 'default';
let customFontData = localStorage.getItem('customFontData') || null;
let customFontName = localStorage.getItem('customFontName') || '';

// Stopwatch formatting and logic
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
        if (stopwatchInterval) clearInterval(stopwatchInterval);
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

document.addEventListener("DOMContentLoaded", () => {
  // Font dropdown and modal UI
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const fontSelect = document.getElementById('fontSelect');
  const closeSettings = document.getElementById('closeSettings');
  const importCustomFont = document.getElementById('importCustomFont');
  const customFontFile = document.getElementById('customFontFile');
  const customFontNameElem = document.getElementById('customFontName');

  // Restore dropdown and font state
  if (fontSelect) {
      fontSelect.value = savedFontType;
      if (savedFontType === 'custom' && customFontName) {
        customFontNameElem.textContent = customFontName;
      }
  }

  if (settingsBtn && settingsModal && fontSelect && closeSettings && importCustomFont && customFontFile && customFontNameElem) {
    settingsBtn.onclick = () => {
      fontSelect.value = localStorage.getItem('stopwatchFontType') || "default";
      customFontNameElem.textContent = localStorage.getItem('customFontName') || '';
      settingsModal.classList.add('show');
    };
    closeSettings.onclick = () => {
      settingsModal.classList.remove('show');
    };
    importCustomFont.onclick = () => {
      customFontFile.value = ''; // Reset file input so onchange always triggers
      customFontFile.click();
    };
    customFontFile.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      customFontNameElem.textContent = file.name;
      localStorage.setItem('stopwatchFontType', 'custom');
      localStorage.setItem('customFontName', file.name);

      const reader = new FileReader();
      reader.onload = function(e) {
        const fontData = e.target.result;
        // Save font data for later reapplication
        localStorage.setItem('customFontData', fontData);
        localStorage.setItem('stopwatchFont', file.name.replace(/\.[^/.]+$/, ""));
        applyFontFamily('custom');
      };
      reader.readAsDataURL(file);
      fontSelect.value = 'custom';
    };
    fontSelect.onchange = function() {
      localStorage.setItem('stopwatchFontType', this.value);
      if (this.value === 'custom') {
        applyFontFamily('custom');
        customFontNameElem.textContent = localStorage.getItem('customFontName') || '';
      } else {
        customFontNameElem.textContent = '';
        applyAndSaveFont(this.value);
      }
    };
  }

  // Initial font application
  if (savedFontType === 'custom') {
    applyFontFamily('custom');
  } else {
    applyFontFamily(savedFontType);
  }

  // Initial display
  updateDisplay();
});

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
      // Only add style if not already present
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
      // fallback if no custom font stored
      fontStack = "'FancyCatPX', sans-serif";
    }
  } else if (fontType === 'system') {
    const os = detectOS();
    if (os === 'windows') fontStack = "'Segoe UI', Arial, sans-serif";
    else if (os === 'android') fontStack = "Roboto, Arial, sans-serif";
    else fontStack = "'San Francisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  } else if (fontType === 'default') {
    fontStack = "'FancyCatPX', sans-serif";
  } else {
    fontStack = "'FancyCatPX', sans-serif";
  }
  if (sw) sw.style.fontFamily = fontStack;
  // Save current font stack for reload
  localStorage.setItem('stopwatchFont', fontStack);
}

function applyAndSaveFont(type) {
  if (type === 'system') {
    applyFontFamily('system');
    localStorage.setItem('stopwatchFont', 'system');
    return;
  }
  if (type === 'default') {
    applyFontFamily('default');
    localStorage.setItem('stopwatchFont', 'FancyCatPX');
    return;
  }
  // "custom" handled in applyFontFamily
}
