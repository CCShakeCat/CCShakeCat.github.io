// Remove msPerSecond customization; always use 40ms per tick
let msPerSecond = 40;
let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
applyFontFamily(savedFont);

let elapsed = 0;
let running = false;
let stopwatchInterval = null;

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
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const fontSelect = document.getElementById('fontSelect');
  const closeSettings = document.getElementById('closeSettings');
  const importCustomFont = document.getElementById('importCustomFont');
  const customFontFile = document.getElementById('customFontFile');
  const customFontName = document.getElementById('customFontName');

  if (settingsBtn && settingsModal && fontSelect && closeSettings && importCustomFont && customFontFile && customFontName) {
    settingsBtn.onclick = () => {
      const font = localStorage.getItem('stopwatchFontType') || "default";
      fontSelect.value = font;
      customFontName.textContent = '';
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
  }
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
  if (fontType === 'system') {
    const os = detectOS();
    if (os === 'windows') fontStack = "'Segoe UI', Arial, sans-serif";
    else if (os === 'android') fontStack = "Roboto, Arial, sans-serif";
    else fontStack = "'San Francisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  } else if (fontType === 'system') {
    fontStack = "'Segoe UI', Arial, sans-serif"; // fallback
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

// Initial display
updateDisplay();
