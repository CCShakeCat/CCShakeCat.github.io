const display = document.getElementById("display");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const modalCard = document.getElementById("modalCard");
const closeSettings = document.getElementById("closeSettings");

const optPreset = document.getElementById("optPreset");
const optFlashEvery = document.getElementById("optFlashEvery");
const optFlashEveryEven = document.getElementById("optFlashEveryEven");
const flashEveryFreeRow = document.getElementById("flashEveryFreeRow");
const flashEveryEvenRow = document.getElementById("flashEveryEvenRow");

const settings = {
  h24: loadBool("seg_lite_h24", false),
  leading: loadBool("seg_lite_leading", true),
  seconds: loadBool("seg_lite_seconds", true),
  ticks: loadBool("seg_lite_ticks", true),

  // Lite does not expose italic manually. Presets may still set it internally.
  italic: loadBool("seg_lite_italic", false),

  // TPS = ticks per second.
  tps: loadNum("seg_lite_tps", 40),

  preset: localStorage.getItem("seg_lite_preset") || "default",
  corners: localStorage.getItem("seg_lite_corners") || "chop",
  segmentHeight: localStorage.getItem("seg_lite_segment_height") || "normal",
  symmetry: loadBool("seg_lite_symmetry", true),

  flashSeparators: loadBool("seg_lite_flash_separators", true),
  flashEvery: loadNum("seg_lite_flash_every", 0.5),
  evenFlashing: loadBool("seg_lite_even_flashing", false),

  // Lite does not expose manual colors. Presets own these.
  activeColor: localStorage.getItem("seg_lite_active_color") || "#ffffff",
  inactiveEnabled: loadBool("seg_lite_inactive_enabled", true),

  // Lite does not expose number styles yet, but preserves the renderer's original behavior.
  sevenStyle: localStorage.getItem("seg_lite_seven_style") || "default",
  sixStyle: localStorage.getItem("seg_lite_six_style") || "default",
  nineStyle: localStorage.getItem("seg_lite_nine_style") || "default"
};

const BASE_SEG7_MAP = {
  "0": ["A", "B", "C", "D", "E", "F"],
  "1": ["B", "C"],
  "2": ["A", "B", "G", "E", "D"],
  "3": ["A", "B", "C", "D", "G"],
  "4": ["F", "G", "B", "C"],
  "5": ["A", "F", "G", "C", "D"],
  "8": ["A", "B", "C", "D", "E", "F", "G"],
  " ": []
};

const svgCache = {};
const imageCache = new Map();

let renderToken = 0;
let intervalId = null;
let suppressPresetAutoCustom = false;

function loadBool(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}

function loadNum(key, fallback) {
  const v = parseFloat(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function saveSettings() {
  markDisplayDirty?.();
  localStorage.setItem("seg_lite_h24", settings.h24 ? "1" : "0");
  localStorage.setItem("seg_lite_leading", settings.leading ? "1" : "0");
  localStorage.setItem("seg_lite_seconds", settings.seconds ? "1" : "0");
  localStorage.setItem("seg_lite_ticks", settings.ticks ? "1" : "0");
  localStorage.setItem("seg_lite_italic", settings.italic ? "1" : "0");

  localStorage.setItem("seg_lite_tps", String(settings.tps));
  localStorage.setItem("seg_lite_preset", settings.preset);
  localStorage.setItem("seg_lite_corners", settings.corners);
  localStorage.setItem("seg_lite_segment_height", settings.segmentHeight);
  localStorage.setItem("seg_lite_symmetry", settings.symmetry ? "1" : "0");

  localStorage.setItem("seg_lite_flash_separators", settings.flashSeparators ? "1" : "0");
  localStorage.setItem("seg_lite_flash_every", String(settings.flashEvery));
  localStorage.setItem("seg_lite_even_flashing", settings.evenFlashing ? "1" : "0");

  localStorage.setItem("seg_lite_active_color", settings.activeColor);
  localStorage.setItem("seg_lite_inactive_enabled", settings.inactiveEnabled ? "1" : "0");

  localStorage.setItem("seg_lite_seven_style", settings.sevenStyle);
  localStorage.setItem("seg_lite_six_style", settings.sixStyle);
  localStorage.setItem("seg_lite_nine_style", settings.nineStyle);
}

function getDigitSegments(char, overrides = null) {
  const source = overrides || settings;

  switch (char) {
    case "7":
      return source.sevenStyle === "simple"
        ? ["A", "B", "C"]
        : ["A", "B", "C", "F"];

    case "6":
      return source.sixStyle === "simple"
        ? ["A", "F", "G", "E", "C", "D"]
        : ["F", "G", "E", "C", "D"];

    case "9":
      return source.nineStyle === "simple"
        ? ["A", "B", "C", "D", "F", "G"]
        : ["A", "B", "C", "F", "G"];

    default:
      return BASE_SEG7_MAP[char] || [];
  }
}

function pad(n, len = 2) {
  return String(n).padStart(len, "0");
}

function getDisplayHour(date) {
  let h = date.getHours();
  if (!settings.h24) {
    h = h % 12;
    if (h === 0) h = 12;
  }
  return h;
}

function buildHourString(date) {
  const h = getDisplayHour(date);
  if (settings.leading) return pad(h);
  if (h < 10) return ` ${h}`;
  return String(h);
}

function buildTimeString(date) {
  const hh = buildHourString(date);
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const safeTps = Math.max(1, settings.tps);
  const msPerTick = 1000 / safeTps;
  const rawTick = Math.floor(date.getMilliseconds() / msPerTick);
  const tt = pad(Math.min(rawTick, safeTps - 1));

  let out = `${hh}:${mm}`;
  if (settings.seconds) out += `:${ss}`;
  if (settings.ticks) out += `.${tt}`;
  return out;
}

function separatorsVisible(nowMs = Date.now()) {
  if (!settings.flashSeparators) return true;

  if (settings.evenFlashing) {
    const cycle = Math.max(0.5, settings.flashEvery) * 1000;
    return Math.floor(nowMs / cycle) % 2 === 0;
  }

  const onDuration = Math.max(0.1, settings.flashEvery) * 1000;
  const cycle = 2000;
  return (nowMs % cycle) < onDuration;
}

function getCornerFilename() {
  if (settings.corners === "chop") return "./icons/digit-seven_seg_chop.svg";
  if (settings.corners === "round") return "./icons/digit-seven_seg_round.svg";
  return "./icons/digit-seven_seg.svg";
}

function getVariantName(asset) {
  if (settings.segmentHeight === "half") {
    if (!settings.symmetry && asset?.HalfDigitHeightUneven) return "HalfDigitHeightUneven";
    if (asset?.HalfDigitHeight) return "HalfDigitHeight";
  } else {
    if (!settings.symmetry && asset?.Uneven) return "Uneven";
    if (asset?.Regular) return "Regular";
  }
  return Object.keys(asset || {})[0] || null;
}

function parseTransformMatrix(str) {
  if (!str) return { a: 1, d: 1, e: 0, f: 0 };
  const m = str.match(/matrix\(([^)]+)\)/);
  if (!m) return { a: 1, d: 1, e: 0, f: 0 };
  const parts = m[1].split(",").map(v => parseFloat(v.trim()));
  return {
    a: Number.isFinite(parts[0]) ? parts[0] : 1,
    d: Number.isFinite(parts[3]) ? parts[3] : 1,
    e: Number.isFinite(parts[4]) ? parts[4] : 0,
    f: Number.isFinite(parts[5]) ? parts[5] : 0
  };
}

function inferSegmentName(part) {
  const horizontal = part.width >= part.height;
  if (horizontal) {
    if (part.y < 28) return "A";
    if (part.y > 78) return "D";
    return "G";
  }

  const left = part.x < 40;
  const upper = part.y < 45;

  if (left && upper) return "F";
  if (!left && upper) return "B";
  if (left && !upper) return "E";
  return "C";
}

async function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);

  const img = new Image();
  img.decoding = "async";
  const promise = new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
  img.src = src;
  imageCache.set(src, promise);
  return promise;
}

async function loadSvgAsset(path) {
  if (svgCache[path]) return svgCache[path];

  const res = await fetch(path);
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");

  const defs = doc.querySelector("defs");
  const images = {};

  defs?.querySelectorAll("image").forEach(img => {
    images[img.id] = {
      width: parseFloat(img.getAttribute("width")) || 0,
      height: parseFloat(img.getAttribute("height")) || 0,
      href: img.getAttribute("href") || img.getAttribute("xlink:href") || ""
    };
  });

  const variants = {};

  doc.querySelectorAll("svg > g[id]").forEach(group => {
    const groupName = group.id;
    const mapped = {};

    group.querySelectorAll("use").forEach(use => {
      const useId = use.id || "";
      const ref = (use.getAttribute("href") || use.getAttribute("xlink:href") || "").replace("#", "");
      if (!images[ref]) return;

      const matrix = parseTransformMatrix(use.getAttribute("transform"));
      const x = parseFloat(use.getAttribute("x")) || matrix.e || 0;
      const y = parseFloat(use.getAttribute("y")) || matrix.f || 0;
      const width = (images[ref].width || 0) * (matrix.a || 1);
      const height = (images[ref].height || 0) * (matrix.d || 1);

      const part = {
        x,
        y,
        width,
        height,
        imageSrc: images[ref].href
      };

      const segName = /^[A-G]$/.test(useId) ? useId : inferSegmentName(part);
      mapped[segName] = part;
    });

    variants[groupName] = mapped;
  });

  svgCache[path] = variants;
  return variants;
}

function normalizeCssColor(input) {
  const c = document.createElement("canvas").getContext("2d");
  c.fillStyle = "#000";
  c.fillStyle = input;
  return c.fillStyle || null;
}

function parseCssColor(input) {
  const normalized = normalizeCssColor(input);
  if (!normalized) return null;

  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const v = hexMatch[1];
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16)
    };
  }

  const rgbMatch = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10)
    };
  }

  return null;
}

function rgbToHex(r, g, b) {
  const toHex = n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function darkenColor(cssColor, factor = 0.133) {
  const rgb = parseCssColor(cssColor);
  if (!rgb) return "#222222";
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

async function paintSegment(ctx, imgSrc, x, y, w, h, color) {
  if (color === "transparent") return;
  const img = await loadImage(imgSrc);

  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.ceil(w));
  off.height = Math.max(1, Math.ceil(h));

  const octx = off.getContext("2d");
  octx.clearRect(0, 0, off.width, off.height);
  octx.drawImage(img, 0, 0, off.width, off.height);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, off.width, off.height);

  ctx.drawImage(off, x, y, w, h);
}

async function buildDigitCanvas(char, asset, opts = {}) {
  const variant = getVariantName(asset);
  if (!variant || !asset?.[variant]) return null;

  const map = asset[variant];
  const lit = new Set(getDigitSegments(char, opts.overrideStyles || null));
  const order = ["A", "B", "C", "D", "E", "F", "G"];

  const c = document.createElement("canvas");
  c.width = 76;
  c.height = 115;
  const ctx = c.getContext("2d");

  const active = normalizeCssColor(settings.activeColor) || "#ffffff";
  const inactive = settings.inactiveEnabled ? darkenColor(active) : "transparent";

  for (const seg of order) {
    const part = map[seg];
    if (!part) continue;

    const color = lit.has(seg) ? active : inactive;
    await paintSegment(ctx, part.imageSrc, part.x, part.y, part.width, part.height, color);
  }

  return c;
}

function makeSeparatorHTML(type, visible) {
  if (type === ":") {
    return `
      <span class="seg-separator colon" aria-hidden="true">
        <span class="seg-dot top ${visible ? "on" : ""}"></span>
        <span class="seg-dot bottom ${visible ? "on" : ""}"></span>
      </span>
    `;
  }

  if (type === ".") {
    return `
      <span class="seg-separator dot" aria-hidden="true">
        <span class="seg-dot bottom ${visible ? "on" : ""}"></span>
      </span>
    `;
  }

  return `<span class="seg-separator"></span>`;
}

const digitDataUrlCache = new Map();
let slotState = [];
let lastSlotStructureKey = "";
let lastRenderedText = "";
let lastRenderedSeparatorsVisible = null;
let displayNeedsFullRefresh = true;

function getClockStyleKey() {
  return JSON.stringify({
    asset: getCornerFilename(),
    corners: settings.corners,
    segmentHeight: settings.segmentHeight,
    symmetry: settings.symmetry,
    italic: settings.italic,
    activeColor: normalizeCssColor(settings.activeColor) || "#ffffff",
    inactiveEnabled: settings.inactiveEnabled,
    sevenStyle: settings.sevenStyle,
    sixStyle: settings.sixStyle,
    nineStyle: settings.nineStyle,
  });
}

function markDisplayDirty() {
  displayNeedsFullRefresh = true;
}

function getSlotKind(ch) {
  if (/\d/.test(ch) || ch === " ") return "digit";
  if (ch === ":") return "colon";
  if (ch === ".") return "dot";
  return "blank";
}

function makeSlotShellHTML(ch) {
  const kind = getSlotKind(ch);
  if (kind === "digit") {
    return `<span class="seg-digit" data-kind="digit"><img class="seg-canvas-img" alt=""></span>`;
  }
  if (kind === "colon") {
    return `<span class="seg-separator colon" data-kind="colon" aria-hidden="true"><span class="seg-dot top"></span><span class="seg-dot bottom"></span></span>`;
  }
  if (kind === "dot") {
    return `<span class="seg-separator dot" data-kind="dot" aria-hidden="true"><span class="seg-dot bottom"></span></span>`;
  }
  return `<span class="seg-separator" data-kind="blank" aria-hidden="true"></span>`;
}

function ensureClockSlots(str) {
  const structureKey = [...str].map(getSlotKind).join("|");
  if (structureKey === lastSlotStructureKey && slotState.length) return;

  display.innerHTML = `<span class="segment-clock">${[...str].map(makeSlotShellHTML).join("")}</span>`;
  const slots = display.querySelectorAll(".segment-clock > span");
  slotState = [...slots].map((el) => ({
    el,
    img: el.querySelector("img"),
    char: null,
    visible: null
  }));
  lastSlotStructureKey = structureKey;
  lastRenderedText = "";
  lastRenderedSeparatorsVisible = null;
}

async function getDigitDataUrl(char, asset, styleKey) {
  const key = `${styleKey}|${char}`;
  if (digitDataUrlCache.has(key)) return digitDataUrlCache.get(key);

  const promise = buildDigitCanvas(char, asset).then(canvas => canvas ? canvas.toDataURL() : "");
  digitDataUrlCache.set(key, promise);
  return promise;
}

function setSeparatorSlot(slot, visible) {
  if (!slot || slot.visible === visible) return;
  slot.el.querySelectorAll(".seg-dot").forEach(dot => dot.classList.toggle("on", visible));
  slot.visible = visible;
}

async function renderClockFast(date) {
  display.classList.add("segmented-active");

  const str = buildTimeString(date);
  const sepVisible = separatorsVisible(Date.now());
  const styleKey = getClockStyleKey();

  if (!displayNeedsFullRefresh && str === lastRenderedText && sepVisible === lastRenderedSeparatorsVisible) {
    return;
  }

  const asset = await loadSvgAsset(getCornerFilename());
  ensureClockSlots(str);

  const force = displayNeedsFullRefresh;
  const chars = [...str];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const slot = slotState[i];
    if (!slot) continue;

    const kind = getSlotKind(ch);
    if (kind === "digit") {
      if (force || slot.char !== ch) {
        const dataUrl = await getDigitDataUrl(ch, asset, styleKey);
        if (slot.img && slot.img.src !== dataUrl) slot.img.src = dataUrl;
        slot.char = ch;
      }
    } else if (kind === "colon" || kind === "dot") {
      setSeparatorSlot(slot, sepVisible);
      slot.char = ch;
    }
  }

  lastRenderedText = str;
  lastRenderedSeparatorsVisible = sepVisible;
  displayNeedsFullRefresh = false;
}

function syncCssVars() {
  const root = document.documentElement;
  root.style.setProperty("--digit-skew", settings.italic ? "-5deg" : "0deg");

  const active = normalizeCssColor(settings.activeColor) || "#ffffff";
  const inactive = settings.inactiveEnabled ? darkenColor(active) : "transparent";

  root.style.setProperty("--sep-active", active);
  root.style.setProperty("--sep-inactive", inactive);
}

async function render() {
  const token = ++renderToken;
  await renderClockFast(new Date());
  if (token !== renderToken) return;
}

function restartTimer() {
  if (intervalId) clearInterval(intervalId);

  if (settings.ticks) {
    intervalId = setInterval(render, Math.max(10, Math.floor(1000 / Math.max(1, settings.tps))));
  } else if (settings.flashSeparators) {
    intervalId = setInterval(render, 50);
  } else {
    intervalId = setInterval(render, 1000);
  }

  markDisplayDirty();
  render();
}

function applyPreset(name) {
  suppressPresetAutoCustom = true;
  settings.preset = name;

  if (name === "default") {
    settings.corners = "chop";
    settings.segmentHeight = "normal";
    settings.symmetry = true;
    settings.italic = false;

    settings.seconds = true;
    settings.ticks = true;
    settings.tps = 40;

    settings.flashSeparators = true;
    settings.flashEvery = 0.5;
    settings.evenFlashing = false;

    settings.activeColor = "#ffffff";
    settings.inactiveEnabled = true;

    settings.sevenStyle = "default";
    settings.sixStyle = "default";
    settings.nineStyle = "default";
  } else if (name === "classic") {
    settings.corners = "chop";
    settings.segmentHeight = "normal";
    settings.symmetry = true;
    settings.italic = false;

    settings.seconds = false;
    settings.ticks = false;
    settings.tps = 40;

    settings.flashSeparators = false;
    settings.flashEvery = 0.5;
    settings.evenFlashing = true;

    settings.activeColor = "#ff0000";
    settings.inactiveEnabled = true;

    settings.sevenStyle = "simple";
    settings.sixStyle = "simple";
    settings.nineStyle = "simple";
  } else if (name === "modern") {
    settings.corners = "round";
    settings.segmentHeight = "normal";
    settings.symmetry = true;
    settings.italic = true;

    settings.seconds = true;
    settings.ticks = true;
    settings.tps = 100;

    settings.flashSeparators = true;
    settings.flashEvery = 0.5;
    settings.evenFlashing = true;

    settings.activeColor = "#0000ff";
    settings.inactiveEnabled = true;

    settings.sevenStyle = "default";
    settings.sixStyle = "default";
    settings.nineStyle = "default";
  }

  syncInputsFromSettings();
  saveSettings();
  syncCssVars();
  suppressPresetAutoCustom = false;
  restartTimer();
}

function maybeSetPresetCustom() {
  if (suppressPresetAutoCustom) return;
  if (settings.preset !== "custom") {
    settings.preset = "custom";
    optPreset.value = "custom";
    saveSettings();
  }
}

function syncFlashEveryUI() {
  if (settings.evenFlashing) {
    flashEveryFreeRow.style.display = "none";
    flashEveryEvenRow.style.display = "flex";
    if (settings.flashEvery !== 0.5 && settings.flashEvery !== 1.0) settings.flashEvery = 0.5;
    optFlashEveryEven.value = settings.flashEvery.toFixed(1);
  } else {
    flashEveryFreeRow.style.display = "flex";
    flashEveryEvenRow.style.display = "none";
    optFlashEvery.value = String(settings.flashEvery);
  }
}

function syncInputsFromSettings() {
  document.getElementById("opt24h").checked = settings.h24;
  document.getElementById("optLeadingZero").checked = settings.leading;
  document.getElementById("optSeconds").checked = settings.seconds;
  document.getElementById("optTicks").checked = settings.ticks;
  document.getElementById("optTPS").value = String(settings.tps);
  document.getElementById("optFlashSeparators").checked = settings.flashSeparators;
  document.getElementById("optEvenFlashing").checked = settings.evenFlashing;
  document.getElementById("optSymmetry").checked = settings.symmetry;
  optPreset.value = settings.preset;

  document.querySelectorAll(`input[name="optCorners"]`).forEach(el => {
    el.checked = el.value === settings.corners;
  });
  document.querySelectorAll(`input[name="optSegmentHeight"]`).forEach(el => {
    el.checked = el.value === settings.segmentHeight;
  });

  syncFlashEveryUI();
}

function openSettingsModal() {
  settingsModal.classList.add("show");
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettingsModal() {
  settingsModal.classList.remove("show");
  settingsModal.setAttribute("aria-hidden", "true");
}

settingsBtn.addEventListener("click", openSettingsModal);
closeSettings.addEventListener("click", closeSettingsModal);

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettingsModal();
});

function bindCheckbox(id, key, needsTimerRestart = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.checked = settings[key];
  el.addEventListener("change", () => {
    settings[key] = el.checked;
    maybeSetPresetCustom();
    if (key === "evenFlashing" && settings.evenFlashing && settings.flashEvery !== 0.5 && settings.flashEvery !== 1.0) {
      settings.flashEvery = 0.5;
    }
    saveSettings();
    syncCssVars();
    syncInputsFromSettings();
    needsTimerRestart ? restartTimer() : render();
  });
}

function bindSelect(id, key, parser = v => v, needsTimerRestart = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = String(settings[key]);
  el.addEventListener("change", () => {
    settings[key] = parser(el.value);

    if (key === "preset") {
      applyPreset(settings[key]);
      return;
    }

    maybeSetPresetCustom();
    saveSettings();
    syncCssVars();
    needsTimerRestart ? restartTimer() : render();
  });
}

function bindRadio(name, key, needsTimerRestart = false) {
  const els = document.querySelectorAll(`input[name="${name}"]`);
  els.forEach(el => {
    el.checked = el.value === String(settings[key]);
    el.addEventListener("change", () => {
      if (!el.checked) return;
      settings[key] = el.value;
      maybeSetPresetCustom();
      saveSettings();
      syncCssVars();
      needsTimerRestart ? restartTimer() : render();
    });
  });
}

function bindNumber(id, key, parser = v => parseFloat(v), needsTimerRestart = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = settings[key];
  el.addEventListener("change", () => {
    settings[key] = parser(el.value);
    maybeSetPresetCustom();
    saveSettings();
    syncInputsFromSettings();
    syncCssVars();
    needsTimerRestart ? restartTimer() : render();
  });
}

function enableLiteDrag() {
  const handle = modalCard.querySelector(".drag-handle") || modalCard;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const start = (clientX, clientY) => {
    const rect = modalCard.getBoundingClientRect();
    dragging = true;
    startX = clientX;
    startY = clientY;
    startLeft = rect.left;
    startTop = rect.top;
    modalCard.classList.add("dragging");
    modalCard.style.position = "fixed";
    modalCard.style.left = `${startLeft}px`;
    modalCard.style.top = `${startTop}px`;
    modalCard.style.margin = "0";
  };

  const move = (clientX, clientY) => {
    if (!dragging) return;
    modalCard.style.left = `${startLeft + clientX - startX}px`;
    modalCard.style.top = `${startTop + clientY - startY}px`;
  };

  const stop = () => {
    dragging = false;
    modalCard.classList.remove("dragging");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onStop);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onStop);
  };

  const onMouseMove = e => move(e.clientX, e.clientY);
  const onTouchMove = e => {
    if (!e.touches[0]) return;
    move(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onStop = () => stop();

  handle.addEventListener("mousedown", e => {
    if (e.target.closest("button, input, select, textarea, label")) return;
    start(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onStop);
  });

  handle.addEventListener("touchstart", e => {
    if (e.target.closest("button, input, select, textarea, label")) return;
    if (!e.touches[0]) return;
    start(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onStop);
  }, { passive: true });
}

bindCheckbox("opt24h", "h24");
bindCheckbox("optLeadingZero", "leading");
bindCheckbox("optSeconds", "seconds", true);
bindCheckbox("optTicks", "ticks", true);

bindSelect("optPreset", "preset");
bindRadio("optCorners", "corners", true);
bindRadio("optSegmentHeight", "segmentHeight", true);
bindCheckbox("optSymmetry", "symmetry", true);

bindSelect("optTPS", "tps", v => parseInt(v, 10), true);

bindCheckbox("optFlashSeparators", "flashSeparators", true);
bindCheckbox("optEvenFlashing", "evenFlashing", true);
bindNumber("optFlashEvery", "flashEvery", v => Math.max(0.1, parseFloat(v) || 0.5), true);
bindSelect("optFlashEveryEven", "flashEvery", v => parseFloat(v) || 0.5, true);

enableLiteDrag();

(async function init() {
  await loadSvgAsset("./icons/digit-seven_seg.svg");
  await loadSvgAsset("./icons/digit-seven_seg_chop.svg");
  await loadSvgAsset("./icons/digit-seven_seg_round.svg");

  if (settings.preset === "default") applyPreset("default");
  else if (settings.preset === "classic") applyPreset("classic");
  else if (settings.preset === "modern") applyPreset("modern");
  else {
    syncInputsFromSettings();
    syncCssVars();
    restartTimer();
  }
})();
