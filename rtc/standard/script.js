let rtcTickRate = Math.min(100, Math.max(10, parseInt(localStorage.getItem('rtcTickRate') || '40', 10) || 40));
let msPerTick = 1000 / rtcTickRate;

let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('stopwatchFontType') || localStorage.getItem('gs.clockFontMode') || 'default';
let customFontData = localStorage.getItem('customFontData') || null;
let customFontName = localStorage.getItem('customFontName') || '';

let showHours = (localStorage.getItem('showHours') ?? "1") === "1";
let showMinutes = (localStorage.getItem('showMinutes') ?? "1") === "1";
let showSeconds = (localStorage.getItem('showSeconds') ?? "1") === "1";
let showTicks = (localStorage.getItem('showTicks') ?? "1") === "1";
let is24Hour = (localStorage.getItem('is24Hour') ?? "1") === "1";
let showAMPM = (localStorage.getItem('showAMPM') ?? "1") === "1";
let clockMode = localStorage.getItem('clockMode') || "Standard [23:59:59]";
const RTC_SIZE_EM = { 1: 2.6, 2: 4, 3: 7, 4: 11, 5: 16 };
let clockSize = Math.min(5, Math.max(1, parseInt(localStorage.getItem('rtcClockSize') || '3', 10) || 3));
let rtcClockColor = localStorage.getItem('rtcClockColor') || '#ffffff';
let rtcColourEditorMode = localStorage.getItem('rtcColourEditorMode') || 'rgb';
let rtcHsvDraft = null;
let minecraftSkyEnabled = (localStorage.getItem('rtcMinecraftSky') ?? '0') === '1';

function resolveThemeClockColor(color) {
  const normalized = String(color || '').trim().toLowerCase();
  if (!normalized || normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') {
    const rootStyles = getComputedStyle(document.documentElement);
    return rootStyles.getPropertyValue('--page-text').trim() || getComputedStyle(document.body).color || '#ffffff';
  }
  return color;
}

function setColourSliderVisual(rangeEl, track) {
  if (!rangeEl) return;
  rangeEl.style.setProperty('--channel-track', track);
}

function refreshColourSliderVisuals() {
  setColourSliderVisual(document.getElementById('rgbRRange'), '#ff2a2a');
  setColourSliderVisual(document.getElementById('rgbGRange'), '#1ee66c');
  setColourSliderVisual(document.getElementById('rgbBRange'), '#2b7fff');
  setColourSliderVisual(
    document.getElementById('hsvHRange'),
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
  );
  setColourSliderVisual(document.getElementById('hsvSRange'), 'linear-gradient(to right, #777777, #ffffff)');
  setColourSliderVisual(document.getElementById('hsvVRange'), 'linear-gradient(to right, #000000, #ffffff)');
}

function rtcMono(text) {
  return [...String(text || '')].map(ch => {
    const sep = ch === ':' || ch === '.';
    return `<span class="monochar${sep ? ' monochar--sep' : ''}">${ch}</span>`;
  }).join('');
}

function rtcStackedClock(mainText, suffixText = '') {
  const raw = String(mainText || '');
  if (clockSize < 4) return rtcMono(raw) + (suffixText ? rtcMono(suffixText) : '');

  const [main, ticks] = raw.split('.');
  const parts = main.split(':').filter(Boolean);
  const line = (text, cls = '') => `<div class="rtc-clock-line ${cls}">${rtcMono(text)}</div>`;

  if (clockSize >= 5) {
    const lines = parts.length ? parts : [main];
    if (ticks != null) lines.push(`.${ticks}`);
    if (suffixText) lines[lines.length - 1] += suffixText;
    return `<span class="rtc-clock-stack">${lines.map((part, index) => line(part, index < 2 ? 'rtc-line-xl' : 'rtc-line-small')).join('')}</span>`;
  }

  if (parts.length > 1) {
    const top = parts.slice(0, -1).join(':');
    const bottom = parts.slice(-1)[0] + (ticks != null ? `.${ticks}` : '') + suffixText;
    return `<span class="rtc-clock-stack">${line(top, 'rtc-line-large')}${line(bottom, 'rtc-line-small')}</span>`;
  }

  if (ticks != null) {
    return `<span class="rtc-clock-stack">${line(main, 'rtc-line-large')}${line(`.${ticks}${suffixText}`, 'rtc-line-small')}</span>`;
  }

  return rtcMono(raw) + (suffixText ? rtcMono(suffixText) : '');
}

function mixHexColors(a, b, t) {
  const read = hex => {
    const clean = String(hex || '').replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  };
  const write = rgb => `#${rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
  const from = read(a);
  const to = read(b);
  return write(from.map((value, index) => value + (to[index] - value) * Math.max(0, Math.min(1, t))));
}

function getMinecraftDayProgress(date = new Date()) {
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600 + date.getMilliseconds() / 3600000;
  return ((hours - 6 + 24) % 24) / 24;
}

function getMinecraftTicks(date = new Date()) {
  return Math.floor(getMinecraftDayProgress(date) * 24000) % 24000;
}

function getMinecraftSkyPalette(date = new Date()) {
  const ticks = getMinecraftTicks(date);
  const stops = [
    [0, { top: '#6f95dc', middle: '#8faee8', horizon: '#ccd5e5' }],
    [1000, { top: '#7fa2e5', middle: '#9cb8ec', horizon: '#d7ddea' }],
    [6000, { top: '#7ea1e8', middle: '#9bb7ed', horizon: '#d5deec' }],
    [10500, { top: '#7596da', middle: '#91abe0', horizon: '#cdd5e4' }],
    [12000, { top: '#c37d6b', middle: '#ba8f8f', horizon: '#d7bdad' }],
    [13000, { top: '#2d244b', middle: '#3f355f', horizon: '#806579' }],
    [18000, { top: '#060916', middle: '#0b1024', horizon: '#1d2340' }],
    [22500, { top: '#1e2344', middle: '#323653', horizon: '#776f86' }],
    [23500, { top: '#876f8c', middle: '#a18d9c', horizon: '#d0b9ae' }],
    [24000, { top: '#6f95dc', middle: '#8faee8', horizon: '#ccd5e5' }]
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [startAt, startColors] = stops[i];
    const [endAt, endColors] = stops[i + 1];
    if (ticks >= startAt && ticks <= endAt) {
      const t = (ticks - startAt) / Math.max(1, endAt - startAt);
      return {
        top: mixHexColors(startColors.top, endColors.top, t),
        middle: mixHexColors(startColors.middle, endColors.middle, t),
        horizon: mixHexColors(startColors.horizon, endColors.horizon, t)
      };
    }
  }
  return stops[0][1];
}

function getMinecraftSkyColor(date = new Date()) {
  return getMinecraftSkyPalette(date).middle;
}

function getMinecraftSkyBackground(date = new Date()) {
  const sky = getMinecraftSkyPalette(date);
  return `linear-gradient(180deg, ${sky.top} 0%, ${sky.middle} 54%, ${sky.horizon} 100%)`;
}

function isMinecraftSkyTextMode(mode = clockMode) {
  return mode === 'Time Query' || mode === 'Time Query (Ticks)';
}

function isMinecraftSkyMode(mode = clockMode) {
  return mode === 'Minecraft' || mode === 'Time Query' || mode === 'Time Query (Ticks)';
}

function isMinecraftSkyBackgroundMode(mode = clockMode) {
  return isMinecraftSkyMode(mode);
}

// Laggy rendering state
let laggyFrameCounter = 0;
let lastLaggyRenderedTick = 0;
let laggyFrozenOnesDigit = 0;

// Badly Laggy rendering state
let badlyLaggyFrameCounter = 0;
let badlyLaggyFrameInterval = 5;
let lastBadlyLaggyRenderedTick = 0;
let badlyFrozenOnesDigit = 0;

// Horrendously Laggy rendering state
let horrendousFrameCounter = 0;
let horrendousFrameInterval = 11;
let lastHorrendousRenderedTick = 0;
let horrendousFrozenOnesDigit = 0;

// Max Laggy rendering state
let maxLaggyFrameCounter = 0;
let lastMaxLaggyRenderedTick = 0;
let maxLaggyFrozenOnesDigit = 0;

// --------- LAGGY STATE FOR LAG MODES ---------
const laggyState = {
  "Laggy": { offset: 0, lastSec: null, justSwitched: false },
  "Badly Laggy": { offset: 0, lastSec: null, justSwitched: false },
  "Horrendously Laggy": { offset: 0, lastSec: null, justSwitched: false },
  "Max Laggy": { offset: 0, lastSec: null, justSwitched: false }
};

function updateLaggyOffset(mode, d) {
  const currSec = d.getSeconds();
  if (laggyState[mode].lastSec !== currSec || laggyState[mode].justSwitched) {
    laggyState[mode].lastSec = currSec;
    laggyState[mode].offset = Math.floor(d.getMilliseconds() / msPerTick);
    laggyState[mode].justSwitched = false;
  }
}
function notifyLaggyModeSwitch(newMode) {
  Object.keys(laggyState).forEach(name => {
    laggyState[name].justSwitched = (name === newMode);
  });
}

// --------- CLOCK MODES SUPPORT ---------

/**
 * Helper for handling 24h/12h conversion and AM/PM.
 */
function getHourAMPM(d) {
  let h = d.getHours();
  let ampm = '';
  if (!is24Hour && showHours) {
    ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
  }
  return { h, ampm };
}

/**
 * Helper for faded time-of-day color and label.
 */
function getTimeOfDayAndColor(date = new Date()) {
  const keyTimes = [
    { hour: 0,   label: "Midnight", color: "#020204" },
    { hour: 6,   label: "Sunrise",  color: "#c46744" },
    { hour: 8,   label: "Day",      color: "#7daaff" },
    { hour: 12,  label: "Noon",     color: "#79a7ff" },
    { hour: 20,  label: "Sunset",   color: "#b5927c" },
    { hour: 21,  label: "Night",    color: "#3c4a5f" },
    { hour: 24,  label: "Midnight", color: "#020204" }
  ];
  const h = date.getHours() + date.getMinutes()/60 + date.getSeconds()/3600;
  let i = 0;
  while (i < keyTimes.length - 1 && h >= keyTimes[i + 1].hour) i++;
  const prev = keyTimes[i];
  const next = keyTimes[i + 1];
  const t = (h - prev.hour) / (next.hour - prev.hour);
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function hexToRgb(hex) {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
    return [
      parseInt(hex.substr(0,2),16),
      parseInt(hex.substr(2,2),16),
      parseInt(hex.substr(4,2),16)
    ];
  }
  function rgbToHex(rgb) {
    return "#" + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const rgb1 = hexToRgb(prev.color), rgb2 = hexToRgb(next.color);
  const faded = rgb1.map((c,i) => lerp(c, rgb2[i], t));
  const color = rgbToHex(faded);
  let timeOfDay = prev.label;
  if (t >= 0.5 && i < keyTimes.length - 2) timeOfDay = next.label;
  return { hour: h, label: timeOfDay, color };
}

//---------Clock Modes Below--------//
const clockModes = {
  "Standard [23:59:59]": {
    name: "Standard [23:59:59]",
    formatter: (d) => {
      const { h, ampm } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      let out = [];
      if (showHours) out.push(pad(h));
      if (showMinutes) out.push(pad(m));
      if (showSeconds) out.push(pad(s));
      let joined = out.join((showHours || showMinutes) ? ":" : "");
      if (showTicks) {
        const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
        joined += (out.length ? "." : "") + msTick.toString().padStart(2, '0');
      }
      const suffix = (!is24Hour && showHours && showAMPM && ampm) ? ` ${ampm}` : '';
      return rtcStackedClock(joined, suffix);
    },
  },
  "*Veryyyyyy* Accurate Clock [23:59:59.9999999999]": {
    name: "<em>Veryyyyyy</em> Accurate Clock [23:59:59.9999999999]",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      const ms = d.getMilliseconds();
      let fractional = ms.toString().padStart(3, '0');
      let extra = '';
      for (let i = 0; i < 7; ++i) extra += Math.floor(Math.random() * 10).toString();
      fractional += extra;
      let out = [pad(h), pad(m), pad(s)].join(":") + "." + fractional;
      return `<span class="rtc-wrap rtc-dense">${[...out].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
    }
  },
  "UNIX [seconds since 1970-01-01]": {
    name: "UNIX [seconds since 1970-01-01]",
    formatter: (d) => {
      const unix = Math.floor(d.getTime() / 1000);
      return String(unix).split('').map(ch => `<span class="monochar">${ch}</span>`).join('');
    },
  },
  "Laggy": {
    name: "Laggy",
    formatter: (d) => {
      updateLaggyOffset("Laggy", d);
      laggyFrameCounter = (laggyFrameCounter + 1) % 5;
      if (laggyFrameCounter === 0) {
        let currTick = Math.floor(d.getMilliseconds() / msPerTick);
        lastLaggyRenderedTick = (Math.floor(currTick / 5) * 5) % 40;
        laggyFrozenOnesDigit = Math.floor(Math.random() * 10);
      }
      const tens = Math.floor(lastLaggyRenderedTick / 10) * 10;
      const noisyTick = (tens + laggyFrozenOnesDigit) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") +
                "." + noisyTick.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Badly Laggy": {
    name: "Badly Laggy",
    formatter: (d) => {
      updateLaggyOffset("Badly Laggy", d);
      badlyLaggyFrameCounter++;
      if (badlyLaggyFrameCounter >= badlyLaggyFrameInterval) {
        let currTick = Math.floor(d.getMilliseconds() / msPerTick);
        lastBadlyLaggyRenderedTick = (Math.floor(currTick / 10) * 10) % 40;
        badlyFrozenOnesDigit = Math.floor(Math.random() * 10);
        badlyLaggyFrameCounter = 0;
        badlyLaggyFrameInterval = (badlyLaggyFrameInterval === 5) ? 6 : 5;
      }
      const tens = Math.floor(lastBadlyLaggyRenderedTick / 10) * 10;
      const noisyTick = (tens + badlyFrozenOnesDigit) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") +
                "." + noisyTick.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Horrendously Laggy": {
    name: "Horrendously Laggy",
    formatter: (d) => {
      updateLaggyOffset("Horrendously Laggy", d);
      horrendousFrameCounter++;
      if (horrendousFrameCounter >= horrendousFrameInterval) {
        let currTick = Math.floor(d.getMilliseconds() / msPerTick);
        lastHorrendousRenderedTick = (Math.floor(currTick / 20) * 20) % 40;
        horrendousFrozenOnesDigit = Math.floor(Math.random() * 10);
        horrendousFrameCounter = 0;
        horrendousFrameInterval = (horrendousFrameInterval === 11) ? 12 : 11;
      }
      const tens = Math.floor(lastHorrendousRenderedTick / 10) * 10;
      const noisyTick = (tens + horrendousFrozenOnesDigit) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") +
                "." + noisyTick.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Max Laggy": {
    name: "Max Laggy",
    formatter: (d) => {
      updateLaggyOffset("Max Laggy", d);
      maxLaggyFrameCounter++;
      if (maxLaggyFrameCounter >= 40) {
        let currTick = Math.floor(d.getMilliseconds() / msPerTick);
        lastMaxLaggyRenderedTick = (Math.floor(currTick / 40) * 40) % 40;
        maxLaggyFrozenOnesDigit = Math.floor(Math.random() * 10);
        maxLaggyFrameCounter = 0;
      }
      const tens = Math.floor(lastMaxLaggyRenderedTick / 10) * 10;
      const noisyTick = (tens + maxLaggyFrozenOnesDigit) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") +
                "." + noisyTick.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Upside Down": {
    name: "⮀ uʍop ǝpᴉsdn",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      let out = [pad(h), pad(m), pad(s)].join(":");
      if (showTicks) {
        const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
        out += "." + msTick.toString().padStart(2, '0');
      }
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Backwards": {
    name: "⮀ ƨbяɒwʞɔɒꓭ",
    formatter: (d) => {
      let h24 = d.getHours();
      let m = d.getMinutes();
      let s = d.getSeconds();
      let ms = d.getMilliseconds();
      let h = h24;
      let ampm = '';
      if (!is24Hour && showHours) {
        ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
      }
      let out = [
        showHours ? pad(h) : null,
        showMinutes ? pad(m) : null,
        showSeconds ? pad(s) : null
      ].filter(x=>x!==null).join(":");
      if (showTicks) out += "." + Math.floor(ms / msPerTick).toString().padStart(2, '0');
      return `<span style="display:inline-block;transform:scaleX(-1);">` +
        [...out].map(ch => `<span class="monochar">${ch}</span>`).join('') +
      `</span>`;
    }
  },
  "esreveR": {
    name: "esreveR",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const m = pad(d.getMinutes());
      const s = pad(d.getSeconds());
      let out = [pad(h), m, s].join(":");
      if (showTicks) {
        const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
        out += "." + msTick.toString().padStart(2, '0');
      }
      let reversed = out.split('').reverse().join('');
      return [...reversed].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Session Timer": {
    name: "Session Timer",
    formatter: (() => {
      const sessionStart = Date.now();
      return () => {
        const elapsed = Date.now() - sessionStart;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const ticks = Math.floor((elapsed % 1000) / msPerTick);
        let out = [pad(hours), pad(minutes), pad(seconds)].join(":") + "." + ticks.toString().padStart(2, "0");
        return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
      };
    })()
  },
  "Date": {
    name: "Date",
    formatter: (d) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[d.getDay()];
      const date = pad(d.getDate());
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let out = `${dayName} ${date} ${month} ${year}`;
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Is it Thursday?": {
    name: "Is it Thursday?",
    formatter: (d) => {
      const answer = (d.getDay() === 4) ? "YES" : "NO";
      return [...answer].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Can I sleep yet?": {
    name: "Can I sleep yet?",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const answer = (is24Hour ? (h >= 20 || h < 6) : (d.getHours() >= 20 || d.getHours() < 6)) ? "You may rest now, it's night" : "You can only sleep at night";
      return `<span class="rtc-wrap rtc-sentence">${[...answer].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
    }
  },
  "Marquee": {
    name: "Marquee",
    formatter: (() => {
      let lastTime = "";
      let offset = 0;
      let lastUpdate = Date.now();
      const speed = 80;
      return (d) => {
        const { h } = getHourAMPM(d);
        const m = pad(d.getMinutes());
        const s = pad(d.getSeconds());
        let out = [pad(h), m, s].join(":");
        if (showTicks) {
          const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
          out += "." + msTick.toString().padStart(2, '0');
        }
        const now = Date.now();
        const dt = (now - lastUpdate) / 1000;
        lastUpdate = now;
        offset -= speed * dt / 16;
        if (offset < -out.length) offset = out.length;
        const padLen = 10;
        const scrollText = " ".repeat(padLen) + out + " ".repeat(padLen);
        let start = Math.floor(offset) % (out.length + padLen);
        if (start < 0) start += (out.length + padLen);
        const visible = scrollText.substring(start, start + 10);
        return [...visible].map(ch => `<span class="monochar">${ch}</span>`).join('');
      };
    })()
  },
  // Fixed Rotating Time - smooth, fixed width, no jitter
  "Rotating Time": {
    name: "Rotating Time",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      const t = showTicks ? Math.floor((d.getMilliseconds()) / msPerTick) : null;
      const hourAngle = ((is24Hour ? h : d.getHours()) % 24) * (360 / 24);
      const minuteAngle = m * (360 / 60);
      const secondAngle = s * (360 / 60);
      const tickAngle = t !== null ? t * (360 / 40) : 0;
      let out = [
        `<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${hourAngle}deg);">${pad(h)}</span>`,
        `<span class="monochar">:</span>`,
        `<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${minuteAngle}deg);">${pad(m)}</span>`,
        `<span class="monochar">:</span>`,
        `<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${secondAngle}deg);">${pad(s)}</span>`
      ];
      if (showTicks) {
        out.push(`<span class="monochar">.</span>`);
        out.push(`<span class="rot-group" style="display:inline-block;width:2ch;text-align:center;transition:transform 0.1s;transform:rotate(${tickAngle}deg);">${t.toString().padStart(2, "0")}</span>`);
      }
      return out.join('');
    }
  },
  "Flashing": {
    name: "Flashing",
    formatter: (d) => {
      const s = d.getSeconds();
      const showTime = s % 2 === 1;
      const { h } = getHourAMPM(d);
      const m = pad(d.getMinutes());
      let out = pad(h) + ":" + m;
      if (showSeconds) out += ":" + pad(s);
      if (showTicks) {
        const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
        out += "." + msTick.toString().padStart(2, '0');
      }
      if (!showTime) return "";
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Power Lost": {
    name: "Power Lost",
    formatter: (d) => {
      const s = d.getSeconds();
      const showTime = s % 2 === 1;
      if (!showTime) return "";
      let out = "00:00";
      if (showSeconds) out += ":00";
      if (showTicks) out += ".00";
      return `<span class="red">` +
        [...out].map(ch => `<span class="monochar">${ch}</span>`).join('') +
      `</span>`;
    }
  },
  "Time until Tomorrow": {
    name: "Time until Tomorrow",
    formatter: (d) => {
      let tomorrow = new Date(d);
      tomorrow.setHours(24, 0, 0, 0);
      let msLeft = tomorrow - d;
      let totalSeconds = Math.floor(msLeft / 1000);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      let seconds = totalSeconds % 60;
      let out = pad(hours) + ":" + pad(minutes);
      if (showSeconds) out += ":" + pad(seconds);
      if (showTicks) {
        const msTick = Math.floor((msLeft % 1000) / msPerTick);
        out += "." + msTick.toString().padStart(2, '0');
      }
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "LGBTQ Pride": {
    name: "LGBTQ Pride",
    formatter: (d) => {
      const flagColors = [
        "#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787",
        "#FFF430", "#7851A9", "#FFFFFF", "#F5A9B8", "#55CDFC", "#603813", "#000000"
      ];
      let ss = typeof showSeconds !== "undefined" ? showSeconds : true;
      let st = typeof showTicks !== "undefined" ? showTicks : false;
      let mpt = typeof msPerTick !== "undefined" ? msPerTick : 10;
      const { h } = getHourAMPM(d);
      let timeStr = pad(h) + ":" + pad(d.getMinutes());
      if (ss) timeStr += ":" + pad(d.getSeconds());
      if (st) {
        const msTick = Math.floor((d.getMilliseconds()) / mpt);
        timeStr += "." + pad(msTick, 2);
      }
      const offset = Math.floor(Date.now() / 250) % flagColors.length;
      let html = "";
      for (let i = 0; i < timeStr.length; ++i) {
        const ch = timeStr[i];
        if (!/[0-9.]/.test(ch)) {
          html += `<span class="monochar" style="color:#cccccc;">${ch}</span>`;
          continue;
        }
        const color = flagColors[(i + offset) % flagColors.length];
        html += `<span class="monochar" style="color:${color};">${ch}</span>`;
      }
      return html;
    }
  },
  "Minecraft": {
    name: "Minecraft",
    formatter: (d) => {
      const frameCount = 64;
      const imageSrc = "./images/minecraft_clock_atlas.png";
      const frame = Math.floor(getMinecraftTicks(d) / 24000 * frameCount) % frameCount;
      return `
        <div class="minecraft-clock-face"
          style="
            --mc-frame:${frame};
            background-image: url('${imageSrc}');
          "></div>
      `;
    }
  },
  "Time Query": {
    name: "Time Query",
    formatter: (d) => {
      const q = getTimeOfDayAndColor(d);
      const color = minecraftSkyEnabled ? '#ffffff' : q.color;
      return `<span class="timequery rtc-wrap" style="color:${color};">
        ${q.label}
      </span>`;
    }
  },
  "Time Query (Ticks)": {
    name: "Time Query (Ticks)",
    formatter: (d) => {
      const ticks = getMinecraftTicks(d);
      const q = getTimeOfDayAndColor(d);
      const color = minecraftSkyEnabled ? '#ffffff' : q.color;
      return `<span class="timequery rtc-wrap" style="color:${color};">
        Daytime is ${ticks}
      </span>`;
    }
  },
  "Crazycolors": {
    name: "Crazycolors",
    formatter: (d) => {
      const h24 = d.getHours();
      const m = d.getMinutes();
      const s = d.getSeconds();
      const ms = d.getMilliseconds();
      let h = h24;
      let ampm = '';
      let use24 = is24Hour;
      if (!is24Hour && showHours) {
        ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
      }
      let out = [
        showHours ? pad(h) : null,
        showMinutes ? pad(m) : null,
        showSeconds ? pad(s) : null
      ].filter(x=>x!==null).join(":");
      if (showTicks) out += "." + Math.floor(ms / msPerTick).toString().padStart(2, '0');

      let outputHtml = '';
      let extraHtml = '';

      // --- 11:19 — Birthday easter egg ---
      if (h === 11 && m === 19) {
        outputHtml = [
          `<span class="monochar">🎂</span>`,
          `<span class="monochar"> </span>`,
          `<span class="monochar">:</span>`,
          `<span class="monochar">🍰</span>`,
          `<span class="monochar">🥳</span>`
        ].join('');
      }
      // 2:40 - pixelation
      else if (h === 2 && m === 40) {
        outputHtml = `<span style="image-rendering: pixelated; filter: blur(1.2px);">${[...out].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
      }
      // 4:03 - 403 forbidden
      else if (h === 4 && m === 3) {
        outputHtml = [...out].map(() => `<span class="monochar" style="color:#c00;">❌</span>`).join('');
      }
      // 4:04 - 404 not found
      else if (h === 4 && m === 4) {
        outputHtml = '';
        extraHtml = `<div style="font-size:0.7em;opacity:0.5;"> </div>`;
      }
      // 4:20 - Snoop Dogg
      else if (h === 4 && m === 20) {
        outputHtml = `<span style="color:#00aa00;">${[...out].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
        extraHtml = `<div style="font-size:0.7em; color:#00aa00; opacity:0.25;">Haha Funny Snoop Dogg reference</div>`;
      }
      // 6:09 - remove zeros in hours and minutes only, but keep zeros in seconds (ones place) and ticks
      else if (((!use24 && ampm === "AM" && h === 6 && m === 9) || (use24 && h === 6 && m === 9))) {
        let [mainTime, tickPart] = out.split(".");
        let parts = mainTime.split(":");
        let processed = parts.map((part, idx) => {
          if (idx === 0 || idx === 1) {
            return [...part].map(ch =>
              ch === "0"
                ? `<span class="monochar" style="opacity:0;">0</span>`
                : `<span class="monochar">${ch}</span>`
            ).join('');
          } else {
            return [...part].map(ch =>
              `<span class="monochar">${ch}</span>`
            ).join('');
          }
        }).join('<span class="monochar">:</span>');
        if (typeof tickPart !== "undefined") {
          let tickHtml = [...tickPart].map(ch =>
            `<span class="monochar">${ch}</span>`
          ).join('');
          processed += `<span class="monochar">.</span>${tickHtml}`;
        }
        outputHtml = processed;
        extraHtml = `<div style="font-size:0.7em;opacity:0.5;">heh, nice</div>`;
      }
      // 7:04 - Red, White, Blue
      else if (h === 7 && m === 4) {
        const rwb = ['#d22', '#fff', '#229'];
        outputHtml = [...out].map((ch,i) => `<span class="monochar" style="color:${rwb[i%3]};">${ch}</span>`).join('');
      }
      // 7:27 - osu! pink box
      else if (h === 7 && m === 27) {
        outputHtml = `<span style="background:#ff79b8;padding:0.25em 0.5em;border-radius:5px;display:inline-block;">${[...out].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
      }
      // 8:20 PM - mask minutes
      else if ((use24 && h === 20 && m === 20) || (!use24 && h === 8 && m === 20 && ampm === "PM")) {
        outputHtml = [...out].map((ch,i) => i>=3&&i<5 ? `<span class="monochar" style="filter:brightness(0.5);">😷</span>` : `<span class="monochar">${ch}</span>`).join('');
        extraHtml = `<div style="font-size:0.7em;opacity:0.5;">Stay safe!</div>`;
      }
      // 9:06 - hide zeros in hours/minutes, keep zeros in seconds/ticks, flip everything, put message below clock
      else if (((!use24 && ampm === "AM" && h === 9 && m === 6) || (use24 && h === 9 && m === 6))) {
        let [mainTime, tickPart] = out.split(".");
        let parts = mainTime.split(":");
        let processed = parts.map((part, idx) => {
          if (idx === 0 || idx === 1) {
            return [...part].map(ch =>
              ch === "0"
                ? `<span class="monochar" style="opacity:0;">0</span>`
                : `<span class="monochar">${ch}</span>`
            ).join('');
          } else {
            return [...part].map(ch =>
              `<span class="monochar">${ch}</span>`
            ).join('');
          }
        }).join('<span class="monochar">:</span>');
        if (typeof tickPart !== "undefined") {
          let tickHtml = [...tickPart].map(ch =>
            `<span class="monochar">${ch}</span>`
          ).join('');
          processed += `<span class="monochar">.</span>${tickHtml}`;
        }
        outputHtml = `
          <div style="display: inline-block; transform: scaleX(-1); text-align: center;">
            <div>${processed}</div>
            <div style="font-size:0.7em;opacity:0.5;margin-top:0.5em;">heh, nice</div>
          </div>
        `;
        extraHtml = "";
      }
      // 9:11 - 🛩️🏢🏢
      else if (((!use24 && ampm === "AM" && h === 9 && m === 11) || (use24 && h === 9 && m === 11))) {
        let timeStr = out;
        timeStr = timeStr.replace('9','🛩️').replace('11','🏢🏢');
        outputHtml = [...timeStr].map(ch => `<span class="monochar">${ch}</span>`).join('');
        extraHtml = "";
      }
      // 11:11 - wish (yellow)
      else if (h === 11 && m === 11) {
        outputHtml = `<span style="color:#ffff55;">${[...out].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
        extraHtml = `<div style="font-size:0.7em;opacity:0.5;">Make a wish!</div>`;
      }
      // 12:34:56 - "78:90" below (12h only)
      else if (!use24 && h === 12 && m === 34 && s === 56) {
        outputHtml = [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
        extraHtml = `<div style="font-size:1.2em; color:#888;">78:90</div>`;
      }
      // Default: rainbow crazy colors
      else {
        outputHtml = [...out].map((ch,i) => {
          let hue = (Date.now()/10 + i*40) % 360;
          return `<span class="monochar" style="color:hsl(${hue},100%,60%);">${ch}</span>`;
        }).join('');
      }

      if (!outputHtml && !extraHtml) extraHtml = `<div style="font-size:0.7em;opacity:0.5;">Crazycolors mode</div>`;
      return outputHtml + extraHtml;
    }
  },
  "Rainbow": {
    name: "Rainbow Hurrah",
    formatter: (d) => {
      let h = d.getHours();
      let ampm = '';
      if (!is24Hour && showHours) {
        ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
      }
      let out = [
        showHours ? pad(h) : null,
        showMinutes ? pad(d.getMinutes()) : null,
        showSeconds ? pad(d.getSeconds()) : null
      ].filter(x=>x!==null).join(":");
      if (showTicks) out += "." + Math.floor(d.getMilliseconds() / msPerTick).toString().padStart(2, '0');
      let html = [...out].map((ch, i) => {
        let hue = (Date.now() / 8 + i * 40) % 360;
        return `<span class="monochar" style="color:hsl(${hue},100%,60%);">${ch}</span>`;
      }).join('');
      return html;
    }
  }
};
// --------- END CLOCK MODES ---------

function pad(n, l = 2) { return n.toString().padStart(l, '0'); }

function formatClock(d) {
  return (clockModes[clockMode] || clockModes["Standard [23:59:59]"]).formatter(d);
}

window.GSGlobal?.init?.('.');
document.documentElement.style.setProperty('--clock-font-stack', window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif");
function detectOS() {
  const info = window.GSGlobal?.detectPlatform?.();
  if (info?.platform === 'windows') return 'windows';
  if (info?.platform === 'android') return 'android';
  if (info?.platform === 'apple') return 'apple';
  return 'windows';
}
function applyFontFamily(fontType) {
  const sw = document.querySelector('.stopwatch');
  let fontStack;
  window.GSGlobal?.restoreBitmapText?.(sw || document.body);
  document.documentElement.dataset.clockFontMode = fontType === 'bitmap' ? 'bitmap' : '';
  if (fontType === 'bitmap') {
    fontStack = window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif";
    window.GSGlobal?.renderBitmapText?.(document.getElementById('display'), { force: true });
  } else if (fontType === 'custom') {
    const fontData = localStorage.getItem('customFontData');
    const fontName = (localStorage.getItem('customFontName') || 'CustomFont').replace(/\.[^/.]+$/, "");
    if (fontData && fontName) {
      if (!document.getElementById('customFontStyle')) {
        const style = document.createElement('style');
        style.id = 'customFontStyle';
        style.innerHTML = `
          @font-face { font-family: '${fontName}'; src: url(${fontData}); }
        `;
        document.head.appendChild(style);
      }
      fontStack = `'${fontName}', ${window.GSGlobal?.getSystemFontStack?.() || "system-ui, Arial, sans-serif"}`;
    } else {
      fontStack = window.GSGlobal?.getClockFontStack?.('custom') || window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif";
    }
  } else if (fontType === 'system') {
    fontStack = window.GSGlobal?.getSystemFontStack?.() || "system-ui, Arial, sans-serif";
  } else {
    fontStack = window.GSGlobal?.getDefaultFontStack?.() || "'GSFancyCatPX', sans-serif";
  }
  document.documentElement.style.setProperty('--clock-font-stack', fontStack);
  if (sw) sw.style.fontFamily = fontStack;
  localStorage.setItem('stopwatchFont', fontStack);
  updateMonocharMetrics();
}

function updateMonocharMetrics() {
  const target = document.getElementById('display') || document.body;
  const styles = getComputedStyle(target);
  const fontSize = parseFloat(styles.fontSize) || 64;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;line-height:1;';
  probe.style.font = styles.font;
  probe.style.fontFamily = styles.fontFamily;
  probe.style.fontVariantNumeric = 'normal';
  document.body.appendChild(probe);
  const measure = text => {
    probe.textContent = text;
    return probe.getBoundingClientRect().width / fontSize;
  };
  const glyphs = [...'0123456789'].map(ch => measure(ch));
  const seps = [measure(':'), measure('.')];
  probe.remove();
  const clampEm = (v, min, max) => Math.min(max, Math.max(min, v));
  const glyphWidth = clampEm(Math.max(...glyphs, 0.85) + 0.08, 0.9, 1.45);
  const sepWidth = clampEm(Math.max(...seps, 0.3) + 0.05, 0.35, 0.75);
  document.documentElement.style.setProperty('--monochar-width', `${glyphWidth.toFixed(3)}em`);
  document.documentElement.style.setProperty('--monochar-sep-width', `${sepWidth.toFixed(3)}em`);
}

document.fonts?.ready?.then(updateMonocharMetrics).catch(() => {});
function applyAndSaveFont(type) {
  if (type === 'system') {
    applyFontFamily('system');
    localStorage.setItem('stopwatchFont', 'system');
  } else if (type === 'bitmap') {
    applyFontFamily('bitmap');
    localStorage.setItem('stopwatchFont', 'bitmap');
  } else {
    applyFontFamily('default');
    localStorage.setItem('stopwatchFont', 'FancyCatPX');
  }
}

function updateShowHideCheckboxUI() {
  const showHoursEl = document.getElementById('showHours');
  const showMinutesEl = document.getElementById('showMinutes');
  if (showHoursEl) showHoursEl.checked = showHours;
  if (showMinutesEl) showMinutesEl.checked = showMinutes;
  document.getElementById('showSeconds').checked = showSeconds;
  document.getElementById('showTicks').checked = showTicks;
  const ampmRow = document.getElementById('showAMPMRow');
  if (!is24Hour && showHours) ampmRow.style.display = '';
  else ampmRow.style.display = 'none';
}
function saveShowHideState() {
  localStorage.setItem('showHours', showHours ? "1" : "0");
  localStorage.setItem('showMinutes', showMinutes ? "1" : "0");
  localStorage.setItem('showSeconds', showSeconds ? "1" : "0");
  localStorage.setItem('showTicks', showTicks ? "1" : "0");
  localStorage.setItem('is24Hour', is24Hour ? "1" : "0");
  localStorage.setItem('showAMPM', showAMPM ? "1" : "0");
  localStorage.setItem('clockMode', clockMode);
}

function updateDisplay() {
  const display = document.getElementById('display');
  if (!display) return;
  const now = new Date();
  const fontType = localStorage.getItem('stopwatchFontType') || localStorage.getItem('gs.clockFontMode') || savedFontType || 'default';
  document.documentElement.style.setProperty('--rtc-fit-scale', '1');
  document.documentElement.style.setProperty('--clock-size', `${RTC_SIZE_EM[clockSize] || RTC_SIZE_EM[3]}em`);
  const skyColor = getMinecraftSkyColor(now);
  const skyBackground = getMinecraftSkyBackground(now);
  const useMinecraftSky = minecraftSkyEnabled && isMinecraftSkyBackgroundMode();
  document.documentElement.style.setProperty('--minecraft-sky-color', skyColor);
  document.documentElement.style.setProperty('--minecraft-sky-background', skyBackground);
  document.documentElement.classList.toggle('minecraft-sky-background', useMinecraftSky);
  document.body.classList.toggle('minecraft-sky-background', useMinecraftSky);
  document.body.classList.toggle('minecraft-sky-text-mode', false);
  if (useMinecraftSky) {
    document.documentElement.style.setProperty('background', skyBackground, 'important');
    document.body.style.setProperty('background', skyBackground, 'important');
  } else {
    document.documentElement.style.removeProperty('background');
    document.body.style.removeProperty('background');
  }
  const useSkyTextStyle = minecraftSkyEnabled && isMinecraftSkyTextMode();
  display.style.setProperty('color', useSkyTextStyle ? '#ffffff' : resolveThemeClockColor(rtcClockColor), 'important');
  display.style.setProperty('text-shadow', useSkyTextStyle ? '0 3px 0 rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.55)' : '', 'important');
  display.innerHTML = formatClock(now);
  if (fontType === 'bitmap') window.GSGlobal?.renderBitmapText?.(display, { force: true });
  if (clockMode === "Upside Down") {
    display.style.transform = "scaleY(-1)";
  } else if (clockMode === "Backwards") {
    display.style.transform = "";
  } else if (clockMode === "Flipped") {
    display.style.transform = "";
  } else {
    display.style.transform = "";
  }
  requestAnimationFrame(fitDisplayToViewport);
}

function fitDisplayToViewport() {
  const display = document.getElementById('display');
  if (!display) return;
  document.documentElement.style.setProperty('--rtc-fit-scale', '1');
  const available = Math.max(160, Math.min(window.innerWidth * 0.94, 1500));
  const width = Math.max(display.scrollWidth, display.getBoundingClientRect().width);
  if (!Number.isFinite(width) || width <= available) return;
  const scale = Math.max(0.18, Math.min(1, available / width));
  document.documentElement.style.setProperty('--rtc-fit-scale', scale.toFixed(3));
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function rgbToHex(r, g, b) {
  const part = value => Math.round(clampNumber(value, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function hexToRgb(hex) {
  const match = String(hex || '').trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

function parseCssColor(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const direct = hexToRgb(raw);
  if (direct) return rgbToHex(direct.r, direct.g, direct.b);
  const probe = document.createElement('span');
  probe.style.color = raw;
  if (!probe.style.color) return null;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const match = computed.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  return match ? rgbToHex(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: max ? Math.round((delta / max) * 100) : 0, v: Math.round(max * 100) };
}

function hsvToRgb(h, s, v) {
  h = ((clampNumber(h, 0, 360) % 360) + 360) % 360;
  s = clampNumber(s, 0, 100) / 100;
  v = clampNumber(v, 0, 100) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

document.addEventListener("DOMContentLoaded", () => {
  const os = detectOS();
  document.body.setAttribute('data-os', os);

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const modalCard = document.getElementById('modalCard') || settingsModal?.querySelector?.('.modal-content');
  const fontSelect = document.getElementById('fontSelect');
  const closeSettings = document.getElementById('closeSettings');
  const importCustomFont = document.getElementById('importCustomFont');
  const customFontFile = document.getElementById('customFontFile');
  const customFontNameElem = document.getElementById('customFontName');
  const customFontNotice = document.getElementById('customFontNotice');
  const clock24Checkbox = document.getElementById('is24Hour');
  const showAMPMCheckbox = document.getElementById('showAMPM');
  const minecraftSkyCheckbox = document.getElementById('minecraftSky');
  const minecraftSkyRow = document.getElementById('minecraftSkyRow');
  const clockModeSelect = document.getElementById('clockModeSelect');
  const tpsSelect = document.getElementById('tpsSelect');
  const pages = {
    main: document.getElementById('page-main'),
    style: document.getElementById('page-style'),
    colors: document.getElementById('page-colors')
  };
  const openStyle = document.getElementById('openStyle');
  const openColors = document.getElementById('openColors');
  const backFromStyle = document.getElementById('backFromStyle');
  const backFromColors = document.getElementById('backFromColors');
  const sizePrev = document.getElementById('sizePrev');
  const sizeNext = document.getElementById('sizeNext');
  const sizeLabel = document.getElementById('sizeLabel');
  const colourModeRGB = document.getElementById('colourModeRGB');
  const colourModeHSV = document.getElementById('colourModeHSV');
  const colourValue = document.getElementById('colourValue');
  const colourPreview = document.getElementById('colourPreview');
  const rgbEditor = document.getElementById('rgbEditor');
  const hsvEditor = document.getElementById('hsvEditor');
  const rgbRRange = document.getElementById('rgbRRange');
  const rgbGRange = document.getElementById('rgbGRange');
  const rgbBRange = document.getElementById('rgbBRange');
  const rgbRInput = document.getElementById('rgbRInput');
  const rgbGInput = document.getElementById('rgbGInput');
  const rgbBInput = document.getElementById('rgbBInput');
  const hsvHRange = document.getElementById('hsvHRange');
  const hsvSRange = document.getElementById('hsvSRange');
  const hsvVRange = document.getElementById('hsvVRange');
  const hsvHInput = document.getElementById('hsvHInput');
  const hsvSInput = document.getElementById('hsvSInput');
  const hsvVInput = document.getElementById('hsvVInput');
  const resetColours = document.getElementById('resetColours');

  window.GSGlobal?.applyPlatformDataset?.();

  function showSettingsPage(name) {
    Object.entries(pages).forEach(([key, page]) => page?.classList.toggle('active', key === name));
  }

  function applyClockSize() {
    clockSize = Math.min(5, Math.max(1, parseInt(clockSize, 10) || 3));
    document.documentElement.style.setProperty('--clock-size', `${RTC_SIZE_EM[clockSize] || RTC_SIZE_EM[3]}em`);
    if (sizeLabel) sizeLabel.textContent = String(clockSize);
    localStorage.setItem('rtcClockSize', String(clockSize));
    requestAnimationFrame(updateMonocharMetrics);
    requestAnimationFrame(fitDisplayToViewport);
  }

  function setColourMode(mode, persist = true) {
    rtcColourEditorMode = mode === 'hsv' ? 'hsv' : 'rgb';
    if (rtcColourEditorMode === 'hsv' && !rtcHsvDraft) {
      const rgb = hexToRgb(parseCssColor(resolveThemeClockColor(rtcClockColor)) || parseCssColor(rtcClockColor) || '#ffffff') || { r: 255, g: 255, b: 255 };
      rtcHsvDraft = rgbToHsv(rgb.r, rgb.g, rgb.b);
    }
    colourModeRGB?.classList.toggle('active', rtcColourEditorMode === 'rgb');
    colourModeHSV?.classList.toggle('active', rtcColourEditorMode === 'hsv');
    rgbEditor?.classList.toggle('active', rtcColourEditorMode === 'rgb');
    hsvEditor?.classList.toggle('active', rtcColourEditorMode === 'hsv');
    if (persist) localStorage.setItem('rtcColourEditorMode', rtcColourEditorMode);
  }

  function setInputPair(rangeEl, numberEl, value) {
    if (rangeEl) rangeEl.value = String(value);
    if (numberEl) numberEl.value = String(value);
  }

  function getRtcEditorHsv(rgb) {
    return rtcColourEditorMode === 'hsv' && rtcHsvDraft ? rtcHsvDraft : rgbToHsv(rgb.r, rgb.g, rgb.b);
  }

  function syncColourEditorUI() {
    const hex = parseCssColor(resolveThemeClockColor(rtcClockColor)) || parseCssColor(rtcClockColor) || '#ffffff';
    const rgb = hexToRgb(hex) || { r: 255, g: 255, b: 255 };
    const hsv = getRtcEditorHsv(rgb);
    if (colourValue) colourValue.value = hex;
    if (colourPreview) colourPreview.style.background = hex;
    setInputPair(rgbRRange, rgbRInput, rgb.r);
    setInputPair(rgbGRange, rgbGInput, rgb.g);
    setInputPair(rgbBRange, rgbBInput, rgb.b);
    setInputPair(hsvHRange, hsvHInput, hsv.h);
    setInputPair(hsvSRange, hsvSInput, hsv.s);
    setInputPair(hsvVRange, hsvVInput, hsv.v);
    refreshColourSliderVisuals();
    setColourMode(rtcColourEditorMode, false);
  }

  function commitClockColour(value, preserveHsvDraft = false) {
    const parsed = parseCssColor(value);
    if (!parsed) {
      syncColourEditorUI();
      return;
    }
    if (!preserveHsvDraft) rtcHsvDraft = null;
    rtcClockColor = parsed;
    localStorage.setItem('rtcClockColor', rtcClockColor);
    syncColourEditorUI();
    updateDisplay();
  }

  function setRtcModalOffset(x = 0, y = 0) {
    if (!modalCard) return;
    modalCard.dataset.modalX = String(x);
    modalCard.dataset.modalY = String(y);
    modalCard.style.setProperty('--modal-x', `${x}px`);
    modalCard.style.setProperty('--modal-y', `${y}px`);
    modalCard.style.transform = 'translate(-50%, -50%) translate(var(--modal-x), var(--modal-y))';
  }

  function centerRtcModal() {
    setRtcModalOffset(0, 0);
  }

  function enableRtcModalDrag() {
    if (!modalCard || modalCard.dataset.rtcDragBound === 'true') return;
    modalCard.dataset.rtcDragBound = 'true';

    let pendingDrag = false;
    let dragging = false;
    let sx = 0;
    let sy = 0;
    let bx = 0;
    let by = 0;
    let previousUserSelect = '';

    const isInteractive = el => !!(el && el.closest && el.closest('input, textarea, select, option, button, a, [data-no-drag], .colour-editor, .color-field, .colour-mode-row'));
    const clearSelection = () => { try { window.getSelection?.().removeAllRanges?.(); } catch {} };
    const setDragLock = on => {
      if (on) {
        previousUserSelect = document.body.style.userSelect || '';
        document.documentElement.classList.add('gs-modal-dragging');
        document.body.classList.add('modal-dragging');
        document.body.style.userSelect = 'none';
      } else {
        document.documentElement.classList.remove('gs-modal-dragging');
        document.body.classList.remove('modal-dragging');
        document.body.style.userSelect = previousUserSelect;
      }
      clearSelection();
    };

    const startDrag = () => {
      pendingDrag = false;
      dragging = true;
      modalCard.classList.add('dragging', 'gs-dragging');
      setDragLock(true);
    };

    const stopDrag = () => {
      pendingDrag = false;
      if (!dragging) return;
      dragging = false;
      modalCard.classList.remove('dragging', 'gs-dragging');
      setDragLock(false);
    };

    modalCard.addEventListener('mousedown', e => {
      if (e.button !== 0 || isInteractive(e.target)) return;
      pendingDrag = true;
      sx = e.clientX;
      sy = e.clientY;
      bx = parseFloat(modalCard.dataset.modalX || '0') || 0;
      by = parseFloat(modalCard.dataset.modalY || '0') || 0;
    });

    window.addEventListener('mousemove', e => {
      if (pendingDrag) {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) startDrag();
      }
      if (!dragging) return;
      setRtcModalOffset(bx + (e.clientX - sx), by + (e.clientY - sy));
      clearSelection();
      e.preventDefault();
    });

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mouseleave', stopDrag);

    modalCard.addEventListener('touchstart', e => {
      const t = e.touches && e.touches[0];
      if (!t || isInteractive(e.target)) return;
      pendingDrag = true;
      sx = t.clientX;
      sy = t.clientY;
      bx = parseFloat(modalCard.dataset.modalX || '0') || 0;
      by = parseFloat(modalCard.dataset.modalY || '0') || 0;
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      if (pendingDrag) {
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) startDrag();
      }
      if (!dragging) return;
      setRtcModalOffset(bx + (t.clientX - sx), by + (t.clientY - sy));
      clearSelection();
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);

    document.addEventListener('selectstart', e => {
      if (!dragging) return;
      e.preventDefault();
      clearSelection();
    });

    document.addEventListener('dragstart', e => {
      if (!dragging) return;
      e.preventDefault();
    });
  }

  function openSettingsModal() {
    const globalClockMode = localStorage.getItem('gs.clockFontMode') || "default";
    fontSelect.value = localStorage.getItem('stopwatchFontType') || globalClockMode;
    customFontNameElem.textContent = localStorage.getItem('customFontName') || localStorage.getItem('gs.clockCustomFontName') || '';
    settingsModal.classList.add('show');
    settingsModal.setAttribute('aria-hidden', 'false');
    enableRtcModalDrag();
    centerRtcModal();
    showSettingsPage('main');
    updateCustomFontNotice();
    updateShowHideCheckboxUI();
    applyClockSize();
    syncColourEditorUI();
    clock24Checkbox.checked = is24Hour;
    showAMPMCheckbox.checked = showAMPM;
    populateClockModes();
  }

  function closeSettingsModal() {
    settingsModal.classList.remove('show');
    settingsModal.setAttribute('aria-hidden', 'true');
  }

  function populateClockModes() {
    clockModeSelect.innerHTML = '';
    Object.keys(clockModes).forEach(mode => {
      const option = document.createElement('option');
      option.value = mode;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = clockModes[mode].name;
      option.textContent = tempDiv.textContent;
      if (mode === "Upside Down") option.textContent = "uʍop ǝpᴉsdn ⥃";
      if (mode === "Backwards")  option.textContent = "⮀ ƨbяɒwʞɔɒꓭ";
      clockModeSelect.appendChild(option);
    });
    clockModeSelect.value = clockMode;
    if (tpsSelect) tpsSelect.value = String(rtcTickRate);
    updateMinecraftSkyVisibility();
  }

  function updateMinecraftSkyVisibility() {
    if (!minecraftSkyRow) return;
    const showSkyControl = isMinecraftSkyMode(clockMode);
    minecraftSkyRow.hidden = !showSkyControl;
    minecraftSkyRow.style.display = showSkyControl ? '' : 'none';
  }

  settingsBtn.addEventListener('click', openSettingsModal);
  closeSettings.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });

  openStyle?.addEventListener('click', () => showSettingsPage('style'));
  backFromStyle?.addEventListener('click', () => showSettingsPage('main'));
  openColors?.addEventListener('click', () => {
    syncColourEditorUI();
    showSettingsPage('colors');
  });
  backFromColors?.addEventListener('click', () => showSettingsPage('main'));

  sizePrev?.addEventListener('click', () => {
    clockSize = Math.max(1, clockSize - 1);
    applyClockSize();
    updateDisplay();
  });
  sizeNext?.addEventListener('click', () => {
    clockSize = Math.min(5, clockSize + 1);
    applyClockSize();
    updateDisplay();
  });

  colourModeRGB?.addEventListener('click', () => setColourMode('rgb'));
  colourModeHSV?.addEventListener('click', () => setColourMode('hsv'));
  colourValue?.addEventListener('change', () => {
    rtcHsvDraft = null;
    commitClockColour(colourValue.value);
  });

  [
    [rgbRRange, rgbRInput],
    [rgbGRange, rgbGInput],
    [rgbBRange, rgbBInput]
  ].forEach(([rangeEl, inputEl]) => {
    rangeEl?.addEventListener('input', event => {
      event.gsSoundHandled = true;
      rtcHsvDraft = null;
      if (inputEl) inputEl.value = rangeEl.value;
      commitClockColour(rgbToHex(rgbRInput?.value ?? rgbRRange?.value, rgbGInput?.value ?? rgbGRange?.value, rgbBInput?.value ?? rgbBRange?.value));
    });
    inputEl?.addEventListener('input', event => {
      event.gsSoundHandled = true;
      rtcHsvDraft = null;
      if (rangeEl) rangeEl.value = inputEl.value;
      commitClockColour(rgbToHex(rgbRInput?.value ?? rgbRRange?.value, rgbGInput?.value ?? rgbGRange?.value, rgbBInput?.value ?? rgbBRange?.value));
    });
  });

  [
    [hsvHRange, hsvHInput],
    [hsvSRange, hsvSInput],
    [hsvVRange, hsvVInput]
  ].forEach(([rangeEl, inputEl]) => {
    rangeEl?.addEventListener('input', event => {
      event.gsSoundHandled = true;
      if (inputEl) inputEl.value = rangeEl.value;
      rtcHsvDraft = {
        h: clamp(parseFloat(hsvHInput?.value ?? hsvHRange?.value) || 0, 0, 360),
        s: clamp(parseFloat(hsvSInput?.value ?? hsvSRange?.value) || 0, 0, 100),
        v: clamp(parseFloat(hsvVInput?.value ?? hsvVRange?.value) || 0, 0, 100)
      };
      const rgb = hsvToRgb(rtcHsvDraft.h, rtcHsvDraft.s, rtcHsvDraft.v);
      commitClockColour(rgbToHex(rgb.r, rgb.g, rgb.b), true);
    });
    inputEl?.addEventListener('input', event => {
      event.gsSoundHandled = true;
      if (rangeEl) rangeEl.value = inputEl.value;
      rtcHsvDraft = {
        h: clamp(parseFloat(hsvHInput?.value ?? hsvHRange?.value) || 0, 0, 360),
        s: clamp(parseFloat(hsvSInput?.value ?? hsvSRange?.value) || 0, 0, 100),
        v: clamp(parseFloat(hsvVInput?.value ?? hsvVRange?.value) || 0, 0, 100)
      };
      const rgb = hsvToRgb(rtcHsvDraft.h, rtcHsvDraft.s, rtcHsvDraft.v);
      commitClockColour(rgbToHex(rgb.r, rgb.g, rgb.b), true);
    });
  });

  resetColours?.addEventListener('click', () => { rtcHsvDraft = null; commitClockColour('#ffffff'); });

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

  clockModeSelect.addEventListener('change', function() {
    clockMode = this.value;
    saveShowHideState();
    updateMinecraftSkyVisibility();
    updateDisplay();
    setClockInterval();
    notifyLaggyModeSwitch(clockMode);
  });
  if (minecraftSkyCheckbox) {
    minecraftSkyCheckbox.checked = minecraftSkyEnabled;
    minecraftSkyCheckbox.addEventListener('change', function() {
      minecraftSkyEnabled = this.checked;
      localStorage.setItem('rtcMinecraftSky', minecraftSkyEnabled ? '1' : '0');
      updateDisplay();
    });
  }
  tpsSelect?.addEventListener('change', function() {
    rtcTickRate = Math.min(100, Math.max(10, parseInt(this.value || '40', 10) || 40));
    msPerTick = 1000 / rtcTickRate;
    localStorage.setItem('rtcTickRate', String(rtcTickRate));
    updateDisplay();
  });

  function updateCustomFontNotice() {
    if (fontSelect.value === 'custom' || (fontSelect.value !== 'bitmap' && customFontNameElem.textContent)) {
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

  ["showHours","showMinutes","showSeconds","showTicks"].forEach(id => {
    document.getElementById(id).addEventListener('change', function() {
      if (id === "showHours") showHours = this.checked;
      if (id === "showMinutes") showMinutes = this.checked;
      if (id === "showSeconds") showSeconds = this.checked;
      if (id === "showTicks") showTicks = this.checked;
      saveShowHideState();
      updateShowHideCheckboxUI();
      updateDisplay();
      setClockInterval();
    });
  });

  clock24Checkbox.addEventListener('change', function() {
    is24Hour = this.checked;
    saveShowHideState();
    updateShowHideCheckboxUI();
    updateDisplay();
  });

  showAMPMCheckbox.addEventListener('change', function() {
    showAMPM = this.checked;
    saveShowHideState();
    updateDisplay();
  });

  populateClockModes();
  updateShowHideCheckboxUI();
  applyClockSize();
  syncColourEditorUI();
  updateDisplay();
  document.addEventListener('gs:theme-assets-changed', () => {
    syncColourEditorUI();
    updateDisplay();
  });

  let interval = null;
  function setClockInterval() {
    if (interval) clearInterval(interval);
    if (clockMode === "*Veryyyyyy* Accurate Clock [23:59:59.9999999999]") {
      interval = setInterval(updateDisplay, 1);
    } else if (
      clockMode === "Laggy" ||
      clockMode === "Badly Laggy" ||
      clockMode === "Horrendously Laggy" ||
      clockMode === "Max Laggy"
    ) {
      interval = setInterval(updateDisplay, msPerTick);
    } else if (showTicks) {
      interval = setInterval(updateDisplay, msPerTick);
    } else {
      interval = setInterval(updateDisplay, 1000);
    }
  }
  setClockInterval();
});
