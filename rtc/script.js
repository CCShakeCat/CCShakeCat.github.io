let msPerTick = 25;

let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('stopwatchFontType') || 'default';
let customFontData = localStorage.getItem('customFontData') || null;
let customFontName = localStorage.getItem('customFontName') || '';

let showHours = true;
let showMinutes = true;
let showSeconds = (localStorage.getItem('showSeconds') ?? "1") === "1";
let showTicks = (localStorage.getItem('showTicks') ?? "1") === "1";
let is24Hour = (localStorage.getItem('is24Hour') ?? "1") === "1";
let showAMPM = (localStorage.getItem('showAMPM') ?? "1") === "1";
let clockMode = localStorage.getItem('clockMode') || "Standard [23:59:59]";

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
  // Define key times and their colors/labels
  const keyTimes = [
    { hour: 0,   label: "Midnight", color: "#020204" },
    { hour: 6,   label: "Sunrise",  color: "#c46744" },
    { hour: 8,   label: "Day",      color: "#7daaff" },
    { hour: 12,  label: "Noon",     color: "#79a7ff" },
    { hour: 20,  label: "Sunset",   color: "#b5927c" },
    { hour: 21,  label: "Night",    color: "#3c4a5f" },
    { hour: 24,  label: "Midnight", color: "#020204" }
  ];
  // Current hour as decimal
  const h = date.getHours() + date.getMinutes()/60 + date.getSeconds()/3600;
  // Find which interval we're in
  let i = 0;
  while (i < keyTimes.length - 1 && h >= keyTimes[i + 1].hour) i++;
  const prev = keyTimes[i];
  const next = keyTimes[i + 1];
  // Interpolate color
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
  // Find label for the current interval (snap to current or next if closer)
  let timeOfDay = prev.label;
  if (t >= 0.5 && i < keyTimes.length - 2) timeOfDay = next.label;
  return {
    hour: h,
    label: timeOfDay,
    color
  };
}

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
      let mono = [...joined].map(ch => `<span class="monochar">${ch}</span>`).join('');
      if (!is24Hour && showHours && showAMPM && ampm) {
        mono += `<span class="monochar"> </span><span class="monochar">${ampm[0]}</span><span class="monochar">${ampm[1]}</span>`;
      }
      return mono;
    },
  },
  "*Veryyyyyy* Accurate Clock [23:59:59.9999999999]": {
    name: "<em>Veryyyyyy</em> Accurate Clock [23:59:59.9999999999]",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      const ms = d.getMilliseconds();

      // True milliseconds (first 3), fake 7 more for animation
      let fractional = ms.toString().padStart(3, '0');
      let extra = '';
      for (let i = 0; i < 7; ++i) {
        extra += Math.floor(Math.random() * 10).toString();
      }
      fractional += extra;

      let out = [pad(h), pad(m), pad(s)].join(":") + "." + fractional;
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
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
    name: "Laggy (ticks +5)",
    formatter: (d) => {
      updateLaggyOffset("Laggy", d);
      let t0 = laggyState.Laggy.offset;
      let currTick = Math.floor(d.getMilliseconds() / msPerTick);
      let steps = ((currTick - t0 + 40) % 40) / 5 | 0;
      let ticks = (t0 + steps * 5) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") + "." + ticks.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Badly Laggy": {
    name: "Badly Laggy (ticks +10)",
    formatter: (d) => {
      updateLaggyOffset("Badly Laggy", d);
      let t0 = laggyState["Badly Laggy"].offset;
      let currTick = Math.floor(d.getMilliseconds() / msPerTick);
      let steps = ((currTick - t0 + 40) % 40) / 10 | 0;
      let ticks = (t0 + steps * 10) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") + "." + ticks.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Horrendously Laggy": {
    name: "Horrendously Laggy (ticks +20)",
    formatter: (d) => {
      updateLaggyOffset("Horrendously Laggy", d);
      let t0 = laggyState["Horrendously Laggy"].offset;
      let currTick = Math.floor(d.getMilliseconds() / msPerTick);
      let steps = ((currTick - t0 + 40) % 40) / 20 | 0;
      let ticks = (t0 + steps * 20) % 40;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") + "." + ticks.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Max Laggy": {
    name: "Max Laggy (ticks frozen)",
    formatter: (d) => {
      updateLaggyOffset("Max Laggy", d);
      let ticks = laggyState["Max Laggy"].offset;
      const { h } = getHourAMPM(d);
      let out = [pad(h), pad(d.getMinutes()), pad(d.getSeconds())].join(":") + "." + ticks.toString().padStart(2, "0");
      return [...out].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Upside Down": {
    name: "˥ʇɐʍuo pǝpᴉsd∩ ⥃",
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
    name: "sdrawkcaB ⮂", // Unicode mirrored arrow for fun
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      let out = [pad(h), pad(m), pad(s)].join(":");
      if (showTicks) {
        const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
        out += "." + msTick.toString().padStart(2, '0');
      }
      // Reverse the string for backwards effect
      return [...out].reverse().map(ch => `<span class="monochar">${ch}</span>`).join('');
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
      // Reverse the string, but keep the formatting (e.g., 23:59:59.39 -> 93.95.95:32)
      // We'll reverse the whole string including separators.
      let reversed = out.split('').reverse().join('');
      return [...reversed].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Session Timer": {
    name: "Session Timer",
    formatter: (() => {
      // Store session start time in a closure (resets on page refresh)
      const sessionStart = Date.now();
      return () => {
        const elapsed = Date.now() - sessionStart;
        // Format as HH:MM:SS.ticks (ticks = hundredths of a second)
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
      // Sunday = 0, Monday = 1, ..., Thursday = 4
      const answer = (d.getDay() === 4) ? "YES" : "NO";
      return [...answer].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Can I sleep yet?": {
    name: "Can I sleep yet?",
    formatter: (d) => {
      const { h } = getHourAMPM(d);
      // YES if it's 8PM or later, or before 6:00AM
      const answer = (is24Hour ? (h >= 20 || h < 6) : (d.getHours() >= 20 || d.getHours() < 6)) ? "You may rest now, it's night" : "You can only sleep at night";
      return [...answer].map(ch => `<span class="monochar">${ch}</span>`).join('');
    }
  },
  "Marquee": {
    name: "Marquee",
    formatter: (() => {
      let lastTime = "";
      let offset = 0;
      let lastUpdate = Date.now();

      // You can adjust this for speed (pixels per second)
      const speed = 80; // Higher = faster, in pixels per second

      // We'll use a span with a moving left position
      return (d) => {
        // Generate the time string as usual
        const { h } = getHourAMPM(d);
        const m = pad(d.getMinutes());
        const s = pad(d.getSeconds());
        let out = [pad(h), m, s].join(":");
        if (showTicks) {
          const msTick = Math.floor((d.getMilliseconds()) / msPerTick);
          out += "." + msTick.toString().padStart(2, '0');
        }

        // Only update position if time has passed
        const now = Date.now();
        const dt = (now - lastUpdate) / 1000; // seconds
        lastUpdate = now;

        // Move offset left by speed*dt pixels (but since we're using monospace, we'll move by characters)
        offset -= speed * dt / 16; // 16 px per monochar approx
        if (offset < -out.length) offset = out.length; // wrap around

        // To produce the scrolling effect, pad spaces at start and end and take a substring
        const padLen = 10;
        const scrollText = " ".repeat(padLen) + out + " ".repeat(padLen);
        let start = Math.floor(offset) % (out.length + padLen);
        if (start < 0) start += (out.length + padLen);
        const visible = scrollText.substring(start, start + 10);

        // Display each character in a span as usual
        return [...visible].map(ch => `<span class="monochar">${ch}</span>`).join('');
      };
    })()
  },
  "Rotating Time": {
    name: "(Jittery) Rotating Time",
    formatter: (d) => {
      // Compute values and angles
      const { h } = getHourAMPM(d);
      const m = d.getMinutes();
      const s = d.getSeconds();
      const t = showTicks ? Math.floor((d.getMilliseconds()) / msPerTick) : null;

      // Rotation for each field (full circle for max value)
      const hourAngle = ((is24Hour ? h : d.getHours()) % 24) * (360 / 24); // 0-23 mapped to 0-360
      const minuteAngle = m * (360 / 60);            // 0-59 mapped to 0-360
      const secondAngle = s * (360 / 60);            // 0-59 mapped to 0-360
      const tickAngle = t !== null ? t * (360 / 40) : 0; // 0-39 mapped to 0-360

      // Format with rotating spans
      let out = [
        `<span class="rot-group" style="display:inline-block;transform:rotate(${hourAngle}deg);">${pad(h)}</span>`,
        `<span class="monochar">:</span>`,
        `<span class="rot-group" style="display:inline-block;transform:rotate(${minuteAngle}deg);">${pad(m)}</span>`,
        `<span class="monochar">:</span>`,
        `<span class="rot-group" style="display:inline-block;transform:rotate(${secondAngle}deg);">${pad(s)}</span>`
      ];
      if (showTicks) {
        out.push(`<span class="monochar">.</span>`);
        out.push(`<span class="rot-group" style="display:inline-block;transform:rotate(${tickAngle}deg);">${t.toString().padStart(2, "0")}</span>`);
      }
      return out.join('');
    }
  },
  "Flashing": {
    name: "Flashing",
    formatter: (d) => {
      // Only show on odd seconds (1, 3, 5, ...)
      const s = d.getSeconds();
      const showTime = s % 2 === 1;

      // Build time string based on options
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
      const showTime = s % 2 === 1; // Show on odd seconds

      if (!showTime) return "";

      // Build zeroed out time according to options
      let out = "00:00";
      if (showSeconds) out += ":00";
      if (showTicks) out += ".00";

      // Wrap in red class
      return `<span class="red">` +
        [...out].map(ch => `<span class="monochar">${ch}</span>`).join('') +
      `</span>`;
    }
  },
  "Time until Tomorrow": {
    name: "Time until Tomorrow",
    formatter: (d) => {
      // Get next midnight
      let tomorrow = new Date(d);
      tomorrow.setHours(24, 0, 0, 0); // Set to next midnight
      let msLeft = tomorrow - d;

      // Calculate hours, minutes, seconds, ticks
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
      // Progress Pride flag colors
      const flagColors = [
        "#E40303", // Red
        "#FF8C00", // Orange
        "#FFED00", // Yellow (rainbow)
        "#008026", // Green
        "#004DFF", // Blue
        "#750787", // Violet
        "#FFF430", // Intersex yellow
        "#7851A9", // Intersex purple
        "#FFFFFF", // White
        "#F5A9B8", // Trans pink
        "#55CDFC", // Trans blue
        "#603813", // Brown
        "#000000", // Black
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

      // Shift colors by time (cycles every 100ms)
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
      const frameW = 16, frameH = 16, scale = 4;
      const imageSrc = "./images/minecraft_clock_atlas.png";
      // Real-time hour, offset so 6am = frame 0 (sync to real time)
      let hours = d.getHours() + d.getMinutes()/60 + d.getSeconds()/3600;
      let mcTime = (hours - 6 + 24) % 24;
      let frame = Math.floor(mcTime / 24 * frameCount) % frameCount;
      const bgY = -frame * frameH * scale;
      return `
        <div class="minecraft-clock-face"
          style="
            width: ${frameW * scale}px;
            height: ${frameH * scale}px;
            background: url('${imageSrc}') 0px ${bgY}px;
            background-size: ${frameW * scale}px ${frameH * frameCount * scale}px;
            image-rendering: pixelated;
            border: 4px solid #333;
            border-radius: 12px;
          "></div>
      `;
    }
  },
  "Time Query": {
    name: "Time Query",
    formatter: (d) => {
      const q = getTimeOfDayAndColor(d);
      return `<span class="timequery" style="color:${q.color}; font-size:2em;">
        ${q.label}
      </span>`;
    }
  },
    "Time Query (Ticks)": {
  name: "Time Query (Ticks)",
  formatter: (d) => {
    let hours = d.getHours() + d.getMinutes()/60 + d.getSeconds()/3600 + d.getMilliseconds()/3600000;
    let ticks = Math.floor((hours / 24) * 24000) % 24000;
    const q = getTimeOfDayAndColor(d);
    return `<span class="timequery" style="color:${q.color}; font-size:2em;">
      Daytime is ${ticks}
    </span>`;
  }
},
      "Crazycolors": {
    name: "Crazycolors",
    formatter: (d) => {
      // Get time parts
      const h24 = d.getHours();
      const m = d.getMinutes();
      const s = d.getSeconds();
      const ms = d.getMilliseconds();
      // 12h/24h logic
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

      // 2:40 - pixelation
      if (h === 2 && m === 40) {
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
      // 6:09 - remove zeros
      else if (((!use24 && ampm === "AM" && h === 6 && m === 9) || (use24 && h === 6 && m === 9))) {
        outputHtml = [...out.replace(/0/g,'')].map(ch => `<span class="monochar">${ch}</span>`).join('');
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
      // 9:06 - remove zeros, flip
      else if (((!use24 && ampm === "AM" && h === 9 && m === 6) || (use24 && h === 9 && m === 6))) {
        outputHtml = `<span style="display:inline-block;transform:scaleX(-1);">${[...out.replace(/0/g,'')].map(ch => `<span class="monochar">${ch}</span>`).join('')}</span>`;
        extraHtml = `<div style="font-size:0.7em;opacity:0.5;">heh, nice</div>`;
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
      // 12h/24h logic
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

      // Rainbow effect
      let html = [...out].map((ch, i) => {
        let hue = (Date.now() / 8 + i * 40) % 360;
        return `<span class="monochar" style="color:hsl(${hue},100%,60%);">${ch}</span>`;
      }).join('');
      return html;
    }
  },

};
// --------- END CLOCK MODES ---------

function pad(n, l = 2) { return n.toString().padStart(l, '0'); }

function formatClock(d) {
  return (clockModes[clockMode] || clockModes["Standard [23:59:59]"]).formatter(d);
}

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

function updateShowHideCheckboxUI() {
    document.getElementById('showSeconds').checked = showSeconds;
    document.getElementById('showTicks').checked = showTicks;
    const ampmRow = document.getElementById('showAMPMRow');
    if (!is24Hour && showHours) {
        ampmRow.style.display = '';
    } else {
        ampmRow.style.display = 'none';
    }
}
function saveShowHideState() {
    localStorage.setItem('showSeconds', showSeconds ? "1" : "0");
    localStorage.setItem('showTicks', showTicks ? "1" : "0");
    localStorage.setItem('is24Hour', is24Hour ? "1" : "0");
    localStorage.setItem('showAMPM', showAMPM ? "1" : "0");
    localStorage.setItem('clockMode', clockMode);
}

function updateDisplay() {
    const display = document.getElementById('display');
    if (!display) return;
    display.innerHTML = formatClock(new Date());

    // Rotate 180° for Upside Down mode, else reset
    if (clockMode === "Upside Down") {
        display.style.transform = "rotate(180deg)";
    } else if (clockMode === "Backwards") {
        display.style.transform = "scaleX(-1)";
    } else {
        display.style.transform = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
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
    const clock24Checkbox = document.getElementById('is24Hour');
    const showAMPMCheckbox = document.getElementById('showAMPM');
    const clockModeSelect = document.getElementById('clockModeSelect');

    function populateClockModes() {
      clockModeSelect.innerHTML = '';
      Object.keys(clockModes).forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        // Remove HTML tags for <option> text, since most browsers don't render them in <option>
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = clockModes[mode].name;
        option.textContent = tempDiv.textContent;
        // For Upside Down and Backwards, try to visually flip the option using Unicode or upside down text
        if (mode === "Upside Down") {
          option.textContent = "˥ʇɐʍuo pǝpᴉsd∩ ⥃";
        }
        if (mode === "Backwards") {
          option.textContent = "sdrawkcaB ⮂";
        }
        clockModeSelect.appendChild(option);
      });
      clockModeSelect.value = clockMode;
    }

    settingsBtn.addEventListener('click', () => {
        fontSelect.value = localStorage.getItem('stopwatchFontType') || "default";
        customFontNameElem.textContent = localStorage.getItem('customFontName') || '';
        settingsModal.classList.add('show');
        updateCustomFontNotice();
        updateShowHideCheckboxUI();
        clock24Checkbox.checked = is24Hour;
        showAMPMCheckbox.checked = showAMPM;
        populateClockModes();
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

    clockModeSelect.addEventListener('change', function() {
      clockMode = this.value;
      saveShowHideState();
      updateDisplay();
      setClockInterval();
      notifyLaggyModeSwitch(clockMode);
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

    ["showSeconds","showTicks"].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
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
    updateDisplay();

    let interval = null;
    function setClockInterval() {
        if (interval) clearInterval(interval);
        if (clockMode === "*Veryyyyyy* Accurate Clock [23:59:59.9999999999]") {
            interval = setInterval(updateDisplay, 1); // as fast as possible (1 ms)
        } else if (
            clockMode === "Laggy" ||
            clockMode === "Badly Laggy" ||
            clockMode === "Horrendously Laggy" ||
            clockMode === "Max Laggy"
        ) {
            interval = setInterval(updateDisplay, msPerTick); // tick-based
        } else if (showTicks) {
            interval = setInterval(updateDisplay, msPerTick);
        } else {
            interval = setInterval(updateDisplay, 1000);
        }
    }
    setClockInterval();
});