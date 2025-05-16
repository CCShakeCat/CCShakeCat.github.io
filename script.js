// Font paths - matches actual font files in fonts/
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

// Try to restore msPerSecond and font from storage:
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
  // Modal open/close
  document.getElementById('openSettings').onclick = () => {
    document.getElementById('settingsModal').style.display = 'flex';
    // Restore previous settings
    document.getElementById('msDropdown').value = localStorage.getItem('msPerSecond') || "40";
    const font = localStorage.getItem('stopwatchFontType') || "default";
    document.getElementById('fontSelect').value = font;
  };
  document.getElementById('closeSettings').onclick = () => {
    document.getElementById('settingsModal').style.display = 'none';
  };

  // Font selector logic
  document.getElementById('fontSelect').onchange = function() {
    document.getElementById('customFontDiv').style.display = this.value === 'custom' ? 'block' : 'none';
  };

  document.getElementById('customFontFile').onchange = function() {
    const file = this.files[0];
    document.getElementById('customFontName').textContent = file ? file.name : '';
  };

  document.getElementById('saveSettings').onclick = async function() {
    // Save ms-per-second
    const msValue = document.getElementById('msDropdown').value;
    localStorage.setItem('msPerSecond', msValue);
    msPerSecond = parseInt(msValue);

    // Font logic
    const fontSelect = document.getElementById('fontSelect').value;
    localStorage.setItem('stopwatchFontType', fontSelect);

    let fontFamily = 'inherit';
    let fontFaceRule = null;

    if (fontSelect === 'default') {
      fontFamily = 'FancyCatPX';
      fontFaceRule = `
        @font-face {
          font-family: 'FancyCatPX';
          src: url('${fontFaces.default}');
        }
      `;
      localStorage.setItem('stopwatchFont', fontFamily);
    } else if (fontSelect === 'system') {
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
    } else if (fontSelect === 'custom') {
      const file = document.getElementById('customFontFile').files[0];
      if (file) {
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
        document.getElementById('settingsModal').style.display = 'none';
        return;
      }
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
    document.getElementById('settingsModal').style.display = 'none';
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

// Initial display
updateDisplay();
