let timer;
let isRunning = false;
let milliseconds = 0;
let millisecondsSteps = 40;

function startStop() {
    if (isRunning) {
        clearInterval(timer);
    } else {
        timer = setInterval(updateDisplay, 40); // Update every 40 milliseconds
    }
    isRunning = !isRunning;
}

function reset() {
    clearInterval(timer);
    isRunning = false;
    milliseconds = 0;
    updateDisplay();
}

function updateDisplay() {
    const display = document.getElementById('display');
    const formattedTime = formatTime(milliseconds);
    display.innerText = formattedTime;
    milliseconds += 40; // Increment by 40 milliseconds, wrapping around 0-39
}

function formatTime(ms) {
    const date = new Date(ms);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const formattedMilliseconds = Math.floor((ms % 1000) / (1000 / millisecondsSteps)).toString().padStart(2, '0'); // Display only two digits up to milliseconds steps
    return `${hours}:${minutes}:${seconds}.${formattedMilliseconds}`;
}

// Font paths
const fontFaces = {
  default: "fonts/YourDefaultFont.ttf", // Replace with your font file name
  system: {
    windows: "fonts/SegoeUI.ttf",
    android: "fonts/Roboto.ttf",
    apple: "fonts/SanFrancisco.ttf"
  }
};

function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|iPhone|iPad|iPod/i.test(ua)) return "apple";
  return "windows"; // fallback
}

// Modal logic
document.getElementById('openSettings').onclick = () => {
  document.getElementById('settingsModal').style.display = 'flex';
};
document.getElementById('closeSettings').onclick = () => {
  document.getElementById('settingsModal').style.display = 'none';
};

document.getElementById('fontSelect').onchange = function() {
  if (this.value === 'custom') {
    document.getElementById('customFontDiv').style.display = 'block';
  } else {
    document.getElementById('customFontDiv').style.display = 'none';
  }
};

document.getElementById('customFontFile').onchange = function() {
  const file = this.files[0];
  document.getElementById('customFontName').textContent = file ? file.name : '';
};

document.getElementById('saveSettings').onclick = async function() {
  const fontSelect = document.getElementById('fontSelect').value;
  let fontFamily = 'inherit';
  let fontFaceRule = null;
  if (fontSelect === 'default') {
    fontFamily = 'DefaultFont';
    fontFaceRule = `
      @font-face {
        font-family: 'DefaultFont';
        src: url('${fontFaces.default}');
      }
    `;
  } else if (fontSelect === 'system') {
    const os = detectOS();
    const fontName = os === 'windows' ? 'SegoeUI' : os === 'android' ? 'Roboto' : 'SanFrancisco';
    fontFamily = fontName;
    fontFaceRule = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontFaces.system[os]}');
      }
    `;
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
        applyFontFamily(fontName);
      };
      reader.readAsDataURL(file);
      document.getElementById('settingsModal').style.display = 'none';
      return;
    }
  }
  if (fontFaceRule) {
    // Remove old style if exists
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

function applyFontFamily(fontFamily) {
  // Replace '.stopwatch' with your stopwatch container selector
  document.querySelector('.stopwatch').style.fontFamily = `'${fontFamily}', sans-serif`;
}
