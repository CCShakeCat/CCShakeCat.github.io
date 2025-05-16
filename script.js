// Defensive version of script.js: all DOM lookups are checked before use.

const fontFaces = {
  default: "fonts/FancyCatPX.ttf",
  system: {
    windows: "fonts/SegoeUI regular.ttf",
    android: "fonts/Roboto-Regular.ttf",
    apple: "fonts/SanFranciscoDisplay-Regular.ttf"
  }
};

let stopwatchInterval = null;
let elapsed = 0;
let running = false;

let msPerSecond = parseInt(localStorage.getItem('msPerSecond')) || 40;
let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
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
}

function reset() {
    clearInterval(stopwatchInterval);
    running = false;
    elapsed = 0;
    updateDisplay();
}

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

  // Debug: Log the DOM elements (optional, can remove after testing)
  console.log({
    settingsBtn, settingsModal, msDropdown, fontSelect, closeSettings, importCustomFont, customFontFile, customFontName
  });

  if (settingsBtn && settingsModal && msDropdown && fontSelect && closeSettings && importCustomFont && customFontFile && customFontName) {
    settingsBtn.onclick = () => {
      settingsModal.classList.add('show');
      msDropdown.value = localStorage.getItem('msPerSecond') || "40";
      const font = localStorage.getItem('stopwatchFontType') || "default";
      fontSelect.value = font;
      customFontName.textContent = '';
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
  } else {
    // Log what is missing for easier debugging
    if (!settingsBtn) console.error("settingsBtn not found");
    if (!settingsModal) console.error("settingsModal not found");
    if (!msDropdown) console.error("msDropdown not found");
    if (!fontSelect) console.error("fontSelect not found");
    if (!closeSettings) console.error("closeSettings not found");
    if (!importCustomFont) console.error("importCustomFont not found");
    if (!customFontFile) console.error("customFontFile not found");
    if (!customFontName) console.error("customFontName not found");
  }
});

function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
  return "windows"; // fallback
}

function applyFontFamily(fontFamily) {
  const sw = document.querySelector('.stopwatch');
  if (sw) sw.style.fontFamily = `'${fontFamily}', sans-serif`;
}

function applyAndSaveFont(type) {
  localStorage.setItem('stopwatchFontType', type);
  let fontFamily = 'FancyCatPX';
  let fontFaceRule = null;

  if (type === 'default') {
    fontFamily = 'FancyCatPX';
    fontFaceRule = `
      @font-face {
        font-family: 'FancyCatPX';
        src: url('${fontFaces.default}');
      }
    `;
    localStorage.setItem('stopwatchFont', fontFamily);
  } else if (type === 'system') {
    const os = detectOS();
    let fontName = '';
    if (os === 'windows') fontName = 'SegoeUI';
    else if (os === 'android') fontName = 'Roboto';
    else fontName = 'SanFrancisco';
    fontFamily = fontName;
    fontFaceRule = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontFaces.system[os]}');
      }
    `;
    localStorage.setItem('stopwatchFont', fontFamily);
  } else if (type === 'custom') {
    // Handled via file input
    return;
  }
  if (fontFaceRule) {
    let oldStyle = document.getElementById('dynamicFontStyle');
    if (oldStyle) oldStyle.remove();
    const style = document.createElement('style');
    style.id = 'dynamicFontStyle';
    style.innerHTML = fontFaceRule;
    document.head.appendChild(style);
  }
  applyFontFamily(fontFamily);
}

// Initial display
updateDisplay();
