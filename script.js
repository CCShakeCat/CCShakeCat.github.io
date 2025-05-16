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
    document.getElementById('display').textContent = formatTime(elapsed);
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
  document.getElementById('settingsBtn').onclick = () => {
    document.getElementById('settingsModal').style.display = 'flex';
    document.getElementById('msDropdown').value = localStorage.getItem('msPerSecond') || "40";
    const font = localStorage.getItem('stopwatchFontType') || "default";
    document.getElementById('fontSelect').value = font;
    document.getElementById('customFontName').textContent = '';
  };
  document.getElementById('closeSettings').onclick = () => {
    document.getElementById('settingsModal').style.display = 'none';
  };

  // Import Custom Font link
  document.getElementById('importCustomFont').onclick = () => {
    document.getElementById('customFontFile').click();
  };

  document.getElementById('customFontFile').onchange = function() {
    const file = this.files[0];
    document.getElementById('customFontName').textContent = file ? file.name : '';
    if (file) {
      // Save font selection as 'custom'
      localStorage.setItem('stopwatchFontType', 'custom');
      // Actually load and apply the custom font
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

  document.getElementById('fontSelect').onchange = function() {
    if (this.value !== 'custom') {
      document.getElementById('customFontName').textContent = '';
    }
    applyAndSaveFont(this.value);
  };

  document.getElementById('msDropdown').onchange = function() {
    localStorage.setItem('msPerSecond', this.value);
    msPerSecond = parseInt(this.value);
    if (running) {
      clearInterval(stopwatchInterval);
      running = false;
      startStop();
    }
  };
});

function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
  return "windows"; // fallback
}

function applyFontFamily(fontFamily) {
  document.querySelector('.stopwatch').style.fontFamily = `'${fontFamily}', sans-serif`;
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
