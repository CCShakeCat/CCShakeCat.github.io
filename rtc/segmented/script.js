const display = document.getElementById("display");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");

const optActiveColor = document.getElementById("optActiveColor");
const activeColorPreview = document.getElementById("activeColorPreview");
const optBackgroundColor = document.getElementById("optBackgroundColor");
const backgroundColorPreview = document.getElementById("backgroundColorPreview");
const optInactiveEnabled = document.getElementById("optInactiveEnabled");
const optPreset = document.getElementById("optPreset");
const customDigitImportRow = document.getElementById("customDigitImportRow");
const importCustomDigitBtn = document.getElementById("importCustomDigitBtn");
const optCustomDigitFile = document.getElementById("optCustomDigitFile");
const customDigitStatus = document.getElementById("customDigitStatus");

const demoSeven = document.getElementById("demoSeven");
const demoSix = document.getElementById("demoSix");
const demoNine = document.getElementById("demoNine");
const burnoutMenuBtn = document.getElementById("burnoutMenuBtn");
const burnoutEditor = document.getElementById("burnoutEditor");
const resetBurnoutBtn = document.getElementById("resetBurnoutBtn");

const colorModeRGB = document.getElementById("colorModeRGB");
const colorModeHSV = document.getElementById("colorModeHSV");
const rgbEditor = document.getElementById("rgbEditor");
const hsvEditor = document.getElementById("hsvEditor");

const rgbRInput = document.getElementById("rgbRInput");
const rgbGInput = document.getElementById("rgbGInput");
const rgbBInput = document.getElementById("rgbBInput");

const hsvHInput = document.getElementById("hsvHInput");
const hsvSInput = document.getElementById("hsvSInput");
const hsvVInput = document.getElementById("hsvVInput");

const settings = {
  h24: loadBool("seg_h24", true),
  leading: loadBool("seg_leading", true),
  seconds: loadBool("seg_seconds", true),
  ticks: loadBool("seg_ticks", true),
  italic: loadBool("seg_italic", false),

  tps: loadNum("seg_tps", 40),

  preset: localStorage.getItem("seg_preset") || "default",
  corners: localStorage.getItem("seg_corners") || "chop",
  segmentHeight: localStorage.getItem("seg_segment_height") || "normal",
  symmetry: loadBool("seg_symmetry", true),

  flashSeparators: loadBool("seg_flash_separators", true),
  flashEvery: loadNum("seg_flash_every", 0.5),
  evenFlashing: loadBool("seg_even_flashing", false),

  activeColor: localStorage.getItem("seg_active_color") || "#ffffff",
  backgroundColor: localStorage.getItem("seg_background_color") || "#000000",
  inactiveEnabled: loadBool("seg_inactive_enabled", true),

  sevenStyle: localStorage.getItem("seg_seven_style") || "default",
  sixStyle: localStorage.getItem("seg_six_style") || "default",
  nineStyle: localStorage.getItem("seg_nine_style") || "default",

  customDigitSvg: localStorage.getItem("seg_custom_digit_svg") || "",
  customDigitName: localStorage.getItem("seg_custom_digit_name") || ""
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

const BURNOUT_STORAGE_KEY = "seg_burnout_map";
const BURNOUT_UNLOCK_SEQUENCE = ["ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp", "ArrowUp"];
const BURNOUT_DIGITS = ["8", "8", ":", "8", "8", ":", "8", "8", ".", "8", "8"];
const BURNOUT_SEGMENTS = ["A", "B", "C", "D", "E", "F", "G"];

const svgCache = {};
const imageCache = new Map();

let renderToken = 0;
let intervalId = null;
let suppressPresetAutoCustom = false;
let colorEditorMode = localStorage.getItem("seg_color_editor_mode") || "rgb";
let colorHsvDraft = null;
let burnoutUnlocked = false;
let burnoutSequenceIndex = 0;
let burnoutMap = loadBurnoutMap();
let burnoutHover = { index: -1, seg: "" };

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
  localStorage.setItem("seg_h24", settings.h24 ? "1" : "0");
  localStorage.setItem("seg_leading", settings.leading ? "1" : "0");
  localStorage.setItem("seg_seconds", settings.seconds ? "1" : "0");
  localStorage.setItem("seg_ticks", settings.ticks ? "1" : "0");
  localStorage.setItem("seg_italic", settings.italic ? "1" : "0");

  localStorage.setItem("seg_tps", String(settings.tps));
  localStorage.setItem("seg_preset", settings.preset);
  localStorage.setItem("seg_corners", settings.corners);
  localStorage.setItem("seg_segment_height", settings.segmentHeight);
  localStorage.setItem("seg_symmetry", settings.symmetry ? "1" : "0");

  localStorage.setItem("seg_flash_separators", settings.flashSeparators ? "1" : "0");
  localStorage.setItem("seg_flash_every", String(settings.flashEvery));
  localStorage.setItem("seg_even_flashing", settings.evenFlashing ? "1" : "0");

  localStorage.setItem("seg_active_color", settings.activeColor);
  localStorage.setItem("seg_background_color", settings.backgroundColor);
  localStorage.setItem("seg_inactive_enabled", settings.inactiveEnabled ? "1" : "0");

  localStorage.setItem("seg_seven_style", settings.sevenStyle);
  localStorage.setItem("seg_six_style", settings.sixStyle);
  localStorage.setItem("seg_nine_style", settings.nineStyle);
  localStorage.setItem("seg_custom_digit_svg", settings.customDigitSvg || "");
  localStorage.setItem("seg_custom_digit_name", settings.customDigitName || "");
}

function loadBurnoutMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BURNOUT_STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const normalized = {};
    for (const [key, value] of Object.entries(parsed)) {
      const match = key.match(/^pos:(\d+)$/) || key.match(/^\d+:(\d+)$/) || key.match(/^(\d+)$/);
      if (!match || !Array.isArray(value)) continue;
      const posKey = `pos:${match[1]}`;
      const current = new Set(Array.isArray(normalized[posKey]) ? normalized[posKey] : []);
      value.filter(seg => BURNOUT_SEGMENTS.includes(seg)).forEach(seg => current.add(seg));
      if (current.size) normalized[posKey] = [...current];
    }
    return normalized;
  } catch {
    return {};
  }
}

function saveBurnoutMap() {
  localStorage.setItem(BURNOUT_STORAGE_KEY, JSON.stringify(burnoutMap));
}

function getBurnoutKey(char, index = 0) {
  const slot = Number.parseInt(index, 10);
  return Number.isFinite(slot) ? `pos:${slot}` : "";
}

function isSegmentBurnedOut(char, seg, index = 0) {
  const key = getBurnoutKey(char, index);
  return !!(key && Array.isArray(burnoutMap[key]) && burnoutMap[key].includes(seg));
}

function setBurnoutSegment(char, index, seg, off) {
  const key = getBurnoutKey(char, index);
  if (!key) return;
  const current = new Set(Array.isArray(burnoutMap[key]) ? burnoutMap[key] : []);
  off ? current.add(seg) : current.delete(seg);
  if (current.size) burnoutMap[key] = [...current].filter(s => BURNOUT_SEGMENTS.includes(s));
  else delete burnoutMap[key];
}

function getBurnoutCacheKey() {
  return JSON.stringify(burnoutMap);
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
  if (settings.corners === "custom" && settings.customDigitSvg) return CUSTOM_DIGIT_ASSET_KEY;
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

const CUSTOM_DIGIT_ASSET_KEY = "__custom_digit__";
const REQUIRED_SEGMENTS = ["A", "B", "C", "D", "E", "F", "G"];

// Custom digit templates are read by guide colour, not by layer/order.
// This keeps B/top-right from being mistaken for another segment when the SVG
// editor reorders layers, duplicates IDs, or names objects like img15/img16.
const GUIDE_COLOR_TO_SEGMENT = {
  "#ff0000": "A", // top
  "#ffff00": "B", // upper-right
  "#00ff00": "C", // lower-right
  "#00ffff": "D", // bottom
  "#0000ff": "E", // lower-left
  "#b400ff": "F", // upper-left
  "#ff00ff": "G"  // middle
};

function normalizeHexColor(value) {
  if (!value) return "";
  let v = String(value).trim().toLowerCase();
  if (v === "none" || v === "transparent") return "";
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return /^#[0-9a-f]{6}$/i.test(v) ? v : "";
}

function getInlineFillColor(el) {
  const direct = normalizeHexColor(el.getAttribute("fill"));
  if (direct) return direct;

  const style = el.getAttribute("style") || "";
  const match = style.match(/(?:^|;)\s*fill\s*:\s*(#[0-9a-f]{3,6})/i);
  return match ? normalizeHexColor(match[1]) : "";
}

function base64ToBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function readPngChunkType(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function readUint32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function getPngPaletteColorFromDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:image\/png;base64,(.+)$/i);
  if (!m) return "";

  try {
    const bytes = base64ToBytes(m[1]);
    let offset = 8; // PNG signature

    while (offset + 8 <= bytes.length) {
      const length = readUint32(bytes, offset);
      const type = readPngChunkType(bytes, offset + 4);
      const dataStart = offset + 8;

      if (type === "PLTE" && length >= 3) {
        const r = bytes[dataStart];
        const g = bytes[dataStart + 1];
        const b = bytes[dataStart + 2];
        return rgbToHex(r, g, b);
      }

      offset = dataStart + length + 4; // data + CRC
    }
  } catch (_) {
    return "";
  }

  return "";
}

function getImageGuideColor(image) {
  return normalizeHexColor(image?.fill) || getPngPaletteColorFromDataUrl(image?.href || "");
}

function getUsePart(use, images) {
  const useId = use.id || "";
  const ref = (use.getAttribute("href") || use.getAttribute("xlink:href") || "").replace("#", "");
  if (!images[ref]) return null;
  const matrix = parseTransformMatrix(use.getAttribute("transform"));
  const x = parseFloat(use.getAttribute("x")) || matrix.e || 0;
  const y = parseFloat(use.getAttribute("y")) || matrix.f || 0;
  const width = (images[ref].width || 0) * (matrix.a || 1);
  const height = (images[ref].height || 0) * (matrix.d || 1);
  const fill = getInlineFillColor(use) || getImageGuideColor(images[ref]);
  return {
    useId,
    ref,
    fill,
    x,
    y,
    width,
    height,
    sourceWidth: images[ref].width || width,
    sourceHeight: images[ref].height || height,
    cx: x + width / 2,
    cy: y + height / 2,
    imageSrc: images[ref].href
  };
}

function rectIntersection(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const width = x2 - x1;
  const height = y2 - y1;
  if (width <= 0 || height <= 0) return null;
  return { x: x1, y: y1, width, height };
}

function makePaintPartFromTextureAndGuide(tex, guide) {
  const clipped = rectIntersection(tex, guide);
  if (!clipped) return null;
  const scaleX = tex.sourceWidth && tex.width ? tex.sourceWidth / tex.width : 1;
  const scaleY = tex.sourceHeight && tex.height ? tex.sourceHeight / tex.height : 1;
  return {
    x: clipped.x,
    y: clipped.y,
    width: clipped.width,
    height: clipped.height,
    sx: (clipped.x - tex.x) * scaleX,
    sy: (clipped.y - tex.y) * scaleY,
    sw: clipped.width * scaleX,
    sh: clipped.height * scaleY,
    sourceWidth: tex.width,
    sourceHeight: tex.height,
    imageSrc: tex.imageSrc
  };
}

function parseSvgAssetText(text, options = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("BAD_SVG");
  const defs = doc.querySelector("defs");
  const images = {};
  defs?.querySelectorAll("image").forEach(img => {
    images[img.id] = {
      width: parseFloat(img.getAttribute("width")) || 0,
      height: parseFloat(img.getAttribute("height")) || 0,
      href: img.getAttribute("href") || img.getAttribute("xlink:href") || "",
      fill: getInlineFillColor(img)
    };
  });
  const groups = [...doc.querySelectorAll("svg > g[id]")];
  if (options.custom) {
    const lowerId = g => (g.id || "").toLowerCase();
    const referenceGroup = groups.find(g => /reference|guide|segment|colour|color/.test(lowerId(g))) || groups[0];
    const textureGroup = groups.find(g => /texture|art|white|display|digit/.test(lowerId(g)) && g !== referenceGroup) || referenceGroup;
    const referenceParts = [...(referenceGroup?.querySelectorAll("use") || [])].map(use => getUsePart(use, images)).filter(Boolean);
    const textureParts = [...(textureGroup?.querySelectorAll("use") || [])].map(use => getUsePart(use, images)).filter(Boolean);
    const refNamed = referenceParts.map(part => {
      const named = /^[A-G]$/i.test(part.useId) ? part.useId.toUpperCase() : "";
      const byColor = GUIDE_COLOR_TO_SEGMENT[normalizeHexColor(part.fill)];
      return { ...part, segName: named || byColor || inferSegmentName(part) };
    });
    const map = {};
    const partsForPaint = textureParts.length ? textureParts : referenceParts;
    for (const tex of partsForPaint) {
      let best = null, bestDist = Infinity;
      for (const ref of refNamed) {
        const dist = Math.hypot(tex.cx - ref.cx, tex.cy - ref.cy);
        if (dist < bestDist) { bestDist = dist; best = ref; }
      }

      const segName = /^[A-G]$/i.test(tex.useId) ? tex.useId.toUpperCase() : best?.segName;
      if (!segName || !REQUIRED_SEGMENTS.includes(segName)) continue;

      // Custom templates use the coloured reference layer as the segment mask.
      // The white texture may intentionally be larger than the guide shape, so
      // crop it to the matching colour guide before painting. This prevents the
      // lower-right texture from covering the top-right segment, and vice versa.
      const paintPart = best ? makePaintPartFromTextureAndGuide(tex, best) : null;
      if (paintPart) map[segName] = paintPart;
    }
    const count = REQUIRED_SEGMENTS.filter(seg => map[seg]).length;
    if (count !== REQUIRED_SEGMENTS.length) { const error = new Error("BAD_DISPLAY"); error.segmentCount = count; throw error; }
    return { Regular: map, Uneven: map, HalfDigitHeight: map, HalfDigitHeightUneven: map };
  }
  const variants = {};
  groups.forEach(group => {
    const mapped = {};
    group.querySelectorAll("use").forEach(use => {
      const part = getUsePart(use, images);
      if (!part) return;
      const segName = /^[A-G]$/i.test(part.useId) ? part.useId.toUpperCase() : inferSegmentName(part);
      mapped[segName] = {
        x: part.x,
        y: part.y,
        width: part.width,
        height: part.height,
        sourceWidth: part.sourceWidth,
        sourceHeight: part.sourceHeight,
        imageSrc: part.imageSrc
      };
    });
    variants[group.id] = mapped;
  });
  return variants;
}

async function loadSvgAsset(path) {
  if (path === CUSTOM_DIGIT_ASSET_KEY) {
    if (svgCache[path]) return svgCache[path];
    if (!settings.customDigitSvg) throw new Error("NO_CUSTOM_SVG");
    const asset = parseSvgAssetText(settings.customDigitSvg, { custom: true });
    svgCache[path] = asset;
    return asset;
  }
  if (svgCache[path]) return svgCache[path];
  const res = await fetch(path);
  const text = await res.text();
  const variants = parseSvgAssetText(text);
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

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;

  let r1 = 0, g1 = 0, b1 = 0;

  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

function darkenColor(cssColor, factor = 0.133) {
  const rgb = parseCssColor(cssColor);
  if (!rgb) return "rgba(255, 255, 255, 0.133)";
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${factor})`;
}

async function paintSegment(ctx, part, color) {
  if (color === "transparent" || !part) return;
  const img = await loadImage(part.imageSrc);

  const w = part.width;
  const h = part.height;
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.ceil(w));
  off.height = Math.max(1, Math.ceil(h));

  const sx = Number.isFinite(part.sx) ? part.sx : 0;
  const sy = Number.isFinite(part.sy) ? part.sy : 0;
  const sw = Number.isFinite(part.sw) ? part.sw : (part.sourceWidth || img.naturalWidth || img.width || part.width);
  const sh = Number.isFinite(part.sh) ? part.sh : (part.sourceHeight || img.naturalHeight || img.height || part.height);

  const octx = off.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.clearRect(0, 0, off.width, off.height);
  octx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, off.width, off.height);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, Math.round(part.x), Math.round(part.y), Math.round(w), Math.round(h));
}

async function buildDigitCanvas(char, asset, opts = {}) {
  const variant = getVariantName(asset);
  if (!variant || !asset?.[variant]) return null;

  const map = asset[variant];
  const lit = new Set(getDigitSegments(char, opts.overrideStyles || null));
  const digitIndex = Number.isInteger(opts.digitIndex) ? opts.digitIndex : 0;
  if (!opts.ignoreBurnout) {
    for (const seg of BURNOUT_SEGMENTS) {
      if (isSegmentBurnedOut(char, seg, digitIndex)) lit.delete(seg);
    }
  }
  const order = ["A", "B", "C", "D", "E", "F", "G"];

  const c = document.createElement("canvas");
  c.width = 76;
  c.height = 115;
  const ctx = c.getContext("2d");

  const active = normalizeCssColor(settings.activeColor) || "#ffffff";
  const inactive = settings.inactiveEnabled ? darkenColor(active) : "transparent";
  const demoHideOff = !!opts.hideOff;

  // Paint inactive pieces first, then active pieces, so inactive overlap can never
  // cut holes out of a lit neighbouring segment in custom templates.
  for (const seg of order) {
    if (lit.has(seg)) continue;
    const part = map[seg];
    if (!part) continue;
    await paintSegment(ctx, part, demoHideOff ? "transparent" : inactive);
  }

  for (const seg of order) {
    if (!lit.has(seg)) continue;
    const part = map[seg];
    if (!part) continue;
    await paintSegment(ctx, part, active);
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
let demoNeedsRefresh = true;

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
    burnout: getBurnoutCacheKey(),
    customLen: settings.customDigitSvg ? settings.customDigitSvg.length : 0,
    customName: settings.customDigitName || ""
  });
}

function markDisplayDirty() {
  displayNeedsFullRefresh = true;
  demoNeedsRefresh = true;
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

async function getDigitDataUrl(char, asset, styleKey, digitIndex = 0) {
  const key = `${styleKey}|${char}|${digitIndex}`;
  if (digitDataUrlCache.has(key)) return digitDataUrlCache.get(key);

  const promise = buildDigitCanvas(char, asset, { digitIndex }).then(canvas => canvas ? canvas.toDataURL() : "");
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
        const dataUrl = await getDigitDataUrl(ch, asset, styleKey, i);
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

async function refreshDemosIfNeeded() {
  if (!demoNeedsRefresh) return;
  if (!demoSeven || !demoSix || !demoNine) return;
  demoNeedsRefresh = false;
  await renderNumberStyleDemos();
}

async function renderNumberStyleDemos() {
  const asset = await loadSvgAsset(getCornerFilename());

  const sevenDefault = await buildDigitCanvas("7", asset, {
    ignoreBurnout: true,
    hideOff: true,
    overrideStyles: { sevenStyle: "default", sixStyle: settings.sixStyle, nineStyle: settings.nineStyle }
  });
  const sevenSimple = await buildDigitCanvas("7", asset, {
    ignoreBurnout: true,
    hideOff: true,
    overrideStyles: { sevenStyle: "simple", sixStyle: settings.sixStyle, nineStyle: settings.nineStyle }
  });

  const sixDefault = await buildDigitCanvas("6", asset, {
    ignoreBurnout: true,
    hideOff: true,
    overrideStyles: { sevenStyle: settings.sevenStyle, sixStyle: "default", nineStyle: settings.nineStyle }
  });
  const sixSimple = await buildDigitCanvas("6", asset, {
    ignoreBurnout: true,
    hideOff: true,
    overrideStyles: { sevenStyle: settings.sevenStyle, sixStyle: "simple", nineStyle: settings.nineStyle }
  });

  const nineDefault = await buildDigitCanvas("9", asset, {
    ignoreBurnout: true,
    hideOff: true,
    overrideStyles: { sevenStyle: settings.sevenStyle, sixStyle: settings.sixStyle, nineStyle: "default" }
  });
  const nineSimple = await buildDigitCanvas("9", asset, {
    ignoreBurnout: true,
    hideOff: true,
    overrideStyles: { sevenStyle: settings.sevenStyle, sixStyle: settings.sixStyle, nineStyle: "simple" }
  });

  demoSeven.innerHTML = `
    <div class="num-demo-card">
      <div class="num-demo-label">Default</div>
      <span class="seg-digit num-demo-digit"><img class="seg-canvas-img" src="${sevenDefault.toDataURL()}" alt=""></span>
    </div>
    <div class="num-demo-card">
      <div class="num-demo-label">Simple</div>
      <span class="seg-digit num-demo-digit"><img class="seg-canvas-img" src="${sevenSimple.toDataURL()}" alt=""></span>
    </div>
  `;

  demoSix.innerHTML = `
    <div class="num-demo-card">
      <div class="num-demo-label">Default</div>
      <span class="seg-digit num-demo-digit"><img class="seg-canvas-img" src="${sixDefault.toDataURL()}" alt=""></span>
    </div>
    <div class="num-demo-card">
      <div class="num-demo-label">Simple</div>
      <span class="seg-digit num-demo-digit"><img class="seg-canvas-img" src="${sixSimple.toDataURL()}" alt=""></span>
    </div>
  `;

  demoNine.innerHTML = `
    <div class="num-demo-card">
      <div class="num-demo-label">Default</div>
      <span class="seg-digit num-demo-digit"><img class="seg-canvas-img" src="${nineDefault.toDataURL()}" alt=""></span>
    </div>
    <div class="num-demo-card">
      <div class="num-demo-label">Simple</div>
      <span class="seg-digit num-demo-digit"><img class="seg-canvas-img" src="${nineSimple.toDataURL()}" alt=""></span>
    </div>
  `;
}

function setColorEditorMode(mode) {
  colorEditorMode = mode;
  localStorage.setItem("seg_color_editor_mode", mode);
  if (mode === "hsv" && !colorHsvDraft) {
    const rgb = getActiveRgb();
    colorHsvDraft = rgbToHsv(rgb.r, rgb.g, rgb.b);
  }

  colorModeRGB.classList.toggle("active", mode === "rgb");
  colorModeHSV.classList.toggle("active", mode === "hsv");
  rgbEditor.classList.toggle("active", mode === "rgb");
  hsvEditor.classList.toggle("active", mode === "hsv");
}

function getActiveRgb() {
  return parseCssColor(settings.activeColor) || { r: 255, g: 255, b: 255 };
}

function getActiveHsv() {
  if (colorEditorMode === "hsv" && colorHsvDraft) return colorHsvDraft;
  const rgb = getActiveRgb();
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function syncColorEditorUI() {
  const rgb = getActiveRgb();
  const hsv = getActiveHsv();

  rgbRInput.value = rgb.r;
  rgbGInput.value = rgb.g;
  rgbBInput.value = rgb.b;

  hsvHInput.value = Math.round(hsv.h);
  hsvSInput.value = Math.round(hsv.s * 100);
  hsvVInput.value = Math.round(hsv.v * 100);

  const setSlider = (selector, pct) => {
    const fill = document.querySelector(`${selector} .channel-fill`);
    const thumb = document.querySelector(`${selector} .channel-thumb`);
    if (fill) fill.style.width = `${pct * 100}%`;
    if (thumb) thumb.style.left = `${pct * 100}%`;
  };

  setSlider(".channel-slider.rgb-r", rgb.r / 255);
  setSlider(".channel-slider.rgb-g", rgb.g / 255);
  setSlider(".channel-slider.rgb-b", rgb.b / 255);
  setSlider(".channel-slider.hsv-h", hsv.h / 360);
  setSlider(".channel-slider.hsv-s", hsv.s);
  setSlider(".channel-slider.hsv-v", hsv.v);

  const satColor = hsvToRgb(hsv.h, 1, hsv.v);
  const valColor = hsvToRgb(hsv.h, hsv.s, 1);

  const sFill = document.querySelector(".channel-slider.hsv-s .channel-fill");
  const sTrack = document.querySelector(".channel-slider.hsv-s .channel-track");
  if (sTrack) sTrack.style.background = "#fff";
  if (sFill) sFill.style.background = `linear-gradient(to right, rgba(${valColor.r}, ${valColor.g}, ${valColor.b}, 0), rgb(${valColor.r}, ${valColor.g}, ${valColor.b}))`;

  const vFill = document.querySelector(".channel-slider.hsv-v .channel-fill");
  const vTrack = document.querySelector(".channel-slider.hsv-v .channel-track");
  if (vTrack) vTrack.style.background = "#fff";
  if (vFill) vFill.style.background = `linear-gradient(to right, #000, rgb(${satColor.r}, ${satColor.g}, ${satColor.b}))`;

  optActiveColor.value = settings.activeColor;
  activeColorPreview.style.background = normalizeCssColor(settings.activeColor) || "#ffffff";
}

function commitActiveColorFromRgb(r, g, b, preserveHsvDraft = false) {
  if (!preserveHsvDraft) colorHsvDraft = null;
  settings.activeColor = rgbToHex(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
  maybeSetPresetCustom();
  saveSettings();
  syncCssVars();
  syncColorEditorUI();
  render();
}

function commitActiveColorFromHsv(h, s, v) {
  colorHsvDraft = {
    h: clamp(h, 0, 360),
    s: clamp(s, 0, 1),
    v: clamp(v, 0, 1)
  };
  const rgb = hsvToRgb(colorHsvDraft.h, colorHsvDraft.s, colorHsvDraft.v);
  commitActiveColorFromRgb(rgb.r, rgb.g, rgb.b, true);
}

function bindChannelSlider(selector, maxValue, onChange) {
  const slider = document.querySelector(selector);
  if (!slider) return;

  const updateFromPoint = (clientX) => {
    const rect = slider.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const ratio = rect.width ? x / rect.width : 0;
    onChange(ratio * maxValue);
  };

  let dragging = false;

  const move = (e) => {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    updateFromPoint(point.clientX);
  };

  const stop = () => {
    dragging = false;
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", stop);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", stop);
  };

  slider.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    updateFromPoint(e.clientX);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  });

  slider.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    dragging = true;
    updateFromPoint(e.touches[0].clientX);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", stop);
  }, { passive: true });
}

function unlockBurnoutMenu() {
  if (burnoutUnlocked) return;
  burnoutUnlocked = true;
  if (burnoutMenuBtn) burnoutMenuBtn.hidden = false;
  const page = document.getElementById("segPageBurnout");
  if (page) page.hidden = false;
  new Audio("../../globals/unlock.wav").play().catch(() => {});
  renderBurnoutEditor();
}

function handleBurnoutUnlockKey(event) {
  if (event.key === "Shift") return;
  if (!event.shiftKey || !BURNOUT_UNLOCK_SEQUENCE.includes(event.key)) {
    burnoutSequenceIndex = 0;
    return;
  }

  const expected = BURNOUT_UNLOCK_SEQUENCE[burnoutSequenceIndex];
  if (event.key === expected) {
    burnoutSequenceIndex += 1;
    if (burnoutSequenceIndex >= BURNOUT_UNLOCK_SEQUENCE.length) {
      burnoutSequenceIndex = 0;
      unlockBurnoutMenu();
    }
    return;
  }

  burnoutSequenceIndex = event.key === BURNOUT_UNLOCK_SEQUENCE[0] ? 1 : 0;
}

function getCurrentSegmentMap() {
  const asset = svgCache[getCornerFilename()];
  const variant = asset && getVariantName(asset);
  return variant ? asset[variant] : null;
}

function getBurnoutSegmentAt(canvas, event) {
  const map = getCurrentSegmentMap();
  if (!map) return "";
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 76 / rect.width;
  const y = (event.clientY - rect.top) * 115 / rect.height;
  const pad = 5;
  let bestSeg = "";
  let bestScore = Infinity;

  for (const seg of BURNOUT_SEGMENTS) {
    const part = map[seg];
    if (!part) continue;
    const left = part.x - pad;
    const right = part.x + part.width + pad;
    const top = part.y - pad;
    const bottom = part.y + part.height + pad;
    if (x < left || x > right || y < top || y > bottom) continue;

    const cx = part.x + part.width / 2;
    const cy = part.y + part.height / 2;
    const score = Math.hypot(x - cx, y - cy);
    if (score < bestScore) {
      bestScore = score;
      bestSeg = seg;
    }
  }

  return bestSeg;
}

function handleBurnoutCanvasMove(event) {
  const canvas = event.currentTarget;
  const index = parseInt(canvas.dataset.index || "0", 10) || 0;
  const seg = getBurnoutSegmentAt(canvas, event);
  canvas.style.cursor = seg ? "pointer" : "default";
  if (burnoutHover.index === index && burnoutHover.seg === seg) return;
  burnoutHover = { index, seg };
  paintBurnoutEditor();
}

function handleBurnoutCanvasLeave(event) {
  event.currentTarget.style.cursor = "default";
  if (burnoutHover.index < 0 && !burnoutHover.seg) return;
  burnoutHover = { index: -1, seg: "" };
  paintBurnoutEditor();
}

function handleBurnoutCanvasClick(event) {
  event.preventDefault();
  event.stopPropagation();
  const canvas = event.currentTarget;
  const seg = getBurnoutSegmentAt(canvas, event);
  if (!seg) return;

  const char = canvas.dataset.digit || "8";
  const index = parseInt(canvas.dataset.index || "0", 10) || 0;
  const turnOff = !isSegmentBurnedOut(char, seg, index);

  if (event.button === 2) {
    BURNOUT_DIGITS.forEach((digit, idx) => {
      if (/\d/.test(digit)) setBurnoutSegment(digit, idx, seg, turnOff);
    });
  } else {
    setBurnoutSegment(char, index, seg, turnOff);
  }

  saveBurnoutMap();
  markDisplayDirty();
  paintBurnoutEditor();
  render();
}

async function paintBurnoutEditor() {
  if (!burnoutEditor || !burnoutUnlocked) return;
  const asset = await loadSvgAsset(getCornerFilename());
  const map = getCurrentSegmentMap();
  const canvases = burnoutEditor.querySelectorAll(".burnout-digit");
  for (const canvas of canvases) {
    const index = parseInt(canvas.dataset.index || "0", 10) || 0;
    const digitCanvas = await buildDigitCanvas(canvas.dataset.digit || "8", asset, {
      digitIndex: index
    });
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (digitCanvas) ctx.drawImage(digitCanvas, 0, 0);
    const hoverPart = burnoutHover.index === index ? map?.[burnoutHover.seg] : null;
    if (hoverPart) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      await paintSegment(ctx, hoverPart, "#4aa3ff");
      ctx.restore();
    }
  }
}

async function renderBurnoutEditor() {
  if (!burnoutEditor || !burnoutUnlocked) return;
  await loadSvgAsset(getCornerFilename());
  burnoutEditor.innerHTML = "";

  BURNOUT_DIGITS.forEach((ch, index) => {
    if (!/\d/.test(ch)) {
      const sep = document.createElement("span");
      sep.className = "burnout-separator";
      sep.textContent = ch;
      burnoutEditor.appendChild(sep);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 76;
    canvas.height = 115;
    canvas.className = "burnout-digit";
    canvas.dataset.digit = ch;
    canvas.dataset.index = String(index);
    canvas.addEventListener("pointerdown", handleBurnoutCanvasClick);
    canvas.addEventListener("pointermove", handleBurnoutCanvasMove);
    canvas.addEventListener("pointerleave", handleBurnoutCanvasLeave);
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    burnoutEditor.appendChild(canvas);
  });

  await paintBurnoutEditor();
}

function syncCssVars() {
  const root = document.documentElement;
  root.style.setProperty("--digit-skew", settings.italic ? "-5deg" : "0deg");

  const active = normalizeCssColor(settings.activeColor) || "#ffffff";
  const background = normalizeCssColor(settings.backgroundColor) || "#000000";
  const inactive = settings.inactiveEnabled ? darkenColor(active) : "transparent";

  root.style.setProperty("--seg-bg", background);
  root.style.setProperty("--sep-active", active);
  root.style.setProperty("--sep-inactive", inactive);

  activeColorPreview.style.background = active;
  optActiveColor.value = settings.activeColor;
  if (backgroundColorPreview) backgroundColorPreview.style.background = background;
  if (optBackgroundColor) optBackgroundColor.value = settings.backgroundColor;
  optInactiveEnabled.checked = settings.inactiveEnabled;
  optPreset.value = settings.preset;

  syncColorEditorUI();
}

function updateCustomDigitUI() {
  const isCustom = settings.corners === "custom";
  const segmentHeightField = document.querySelector('input[name="optSegmentHeight"]')?.closest(".seg-field");
  if (customDigitImportRow) customDigitImportRow.hidden = !isCustom;
  if (segmentHeightField) segmentHeightField.hidden = isCustom;
  if (customDigitStatus) customDigitStatus.textContent = settings.customDigitName ? `Current: ${settings.customDigitName}` : "No custom digit imported.";
}

function showBadDisplayError(segmentCount) {
  alert("ERROR: BAD DISPLAY\n\nThis digit does not contain 7 segments. Please make sure you have all segments in the template and try again.");
}

async function importCustomDigitFile(file) {
  if (!file) return;
  const text = await file.text();
  try {
    parseSvgAssetText(text, { custom: true });
  } catch (err) {
    if (err?.message === "BAD_DISPLAY") showBadDisplayError(err.segmentCount);
    else alert("ERROR: BAD DISPLAY\n\nThis digit could not be read. Please use the digit template and try again.");
    if (optCustomDigitFile) optCustomDigitFile.value = "";
    return;
  }
  delete svgCache[CUSTOM_DIGIT_ASSET_KEY];
  settings.customDigitSvg = text;
  settings.customDigitName = file.name || "Custom SVG";
  delete svgCache[CUSTOM_DIGIT_ASSET_KEY];
  settings.corners = "custom";
  maybeSetPresetCustom();
  syncInputsFromSettings();
  updateCustomDigitUI();
  saveSettings();
  restartTimer();
}

async function render() {
  const token = ++renderToken;
  await renderClockFast(new Date());
  if (token !== renderToken) return;
  await refreshDemosIfNeeded();
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
    settings.backgroundColor = "#000000";
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
    settings.backgroundColor = "#000000";
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
    settings.backgroundColor = "#000000";
    settings.inactiveEnabled = true;

    settings.sevenStyle = "default";
    settings.sixStyle = "default";
    settings.nineStyle = "default";
  } else if (name === "lcd") {
    settings.corners = "square";
    settings.segmentHeight = "normal";
    settings.symmetry = true;
    settings.italic = true;

    settings.seconds = true;
    settings.ticks = true;
    settings.tps = 40;

    settings.flashSeparators = true;
    settings.flashEvery = 0.5;
    settings.evenFlashing = true;

    settings.activeColor = "#222222";
    settings.backgroundColor = "#c6c6c6";
    settings.inactiveEnabled = true;

    settings.sevenStyle = "simple";
    settings.sixStyle = "simple";
    settings.nineStyle = "simple";
  } else if (name === "lcdInverted") {
    settings.corners = "square";
    settings.segmentHeight = "normal";
    settings.symmetry = true;
    settings.italic = true;

    settings.seconds = true;
    settings.ticks = true;
    settings.tps = 40;

    settings.flashSeparators = true;
    settings.flashEvery = 0.5;
    settings.evenFlashing = true;

    settings.activeColor = "#c6c6c6";
    settings.backgroundColor = "#222222";
    settings.inactiveEnabled = true;

    settings.sevenStyle = "simple";
    settings.sixStyle = "simple";
    settings.nineStyle = "simple";
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

function syncInputsFromSettings() {
  document.getElementById("opt24h").checked = settings.h24;
  document.getElementById("optLeadingZero").checked = settings.leading;
  document.getElementById("optSeconds").checked = settings.seconds;
  document.getElementById("optTicks").checked = settings.ticks;
  document.getElementById("optItalic").checked = settings.italic;
  document.getElementById("optTPS").value = String(settings.tps);
  document.getElementById("optFlashSeparators").checked = settings.flashSeparators;
  document.getElementById("optFlashEvery").value = settings.flashEvery;
  document.getElementById("optEvenFlashing").checked = settings.evenFlashing;
  document.getElementById("optSymmetry").checked = settings.symmetry;
  document.getElementById("optInactiveEnabled").checked = settings.inactiveEnabled;
  document.getElementById("optActiveColor").value = settings.activeColor;
  optPreset.value = settings.preset;

  document.querySelectorAll(`input[name="optCorners"]`).forEach(el => {
    el.checked = el.value === settings.corners;
  });
  document.querySelectorAll(`input[name="optSegmentHeight"]`).forEach(el => {
    el.checked = el.value === settings.segmentHeight;
  });
  document.querySelectorAll(`input[name="optSevenStyle"]`).forEach(el => {
    el.checked = el.value === settings.sevenStyle;
  });
  document.querySelectorAll(`input[name="optSixStyle"]`).forEach(el => {
    el.checked = el.value === settings.sixStyle;
  });
  document.querySelectorAll(`input[name="optNineStyle"]`).forEach(el => {
    el.checked = el.value === settings.nineStyle;
  });
  updateCustomDigitUI();
}

const segmentedModalCard = settingsModal?.querySelector?.(".modal-content") || null;

function setSegmentedModalOffset(x = 0, y = 0) {
  if (!segmentedModalCard) return;
  segmentedModalCard.dataset.modalX = String(x);
  segmentedModalCard.dataset.modalY = String(y);
  segmentedModalCard.style.setProperty("--modal-x", `${x}px`);
  segmentedModalCard.style.setProperty("--modal-y", `${y}px`);
  segmentedModalCard.style.transform = "translate(-50%, -50%) translate(var(--modal-x), var(--modal-y))";
}

function centerSegmentedModal() {
  setSegmentedModalOffset(0, 0);
}

function enableSegmentedModalDrag() {
  if (!segmentedModalCard || segmentedModalCard.dataset.segDragBound === "true") return;
  segmentedModalCard.dataset.segDragBound = "true";

  let pendingDrag = false;
  let dragging = false;
  let sx = 0;
  let sy = 0;
  let bx = 0;
  let by = 0;
  let previousUserSelect = "";

  const isInteractive = el => !!(el && el.closest && el.closest("input, textarea, select, option, button, a, [data-no-drag], .channel-slider, .colour-editor, .color-field, .colour-mode-row"));
  const clearSelection = () => { try { window.getSelection?.().removeAllRanges?.(); } catch {} };
  const setDragLock = on => {
    if (on) {
      previousUserSelect = document.body.style.userSelect || "";
      document.documentElement.classList.add("gs-modal-dragging");
      document.body.classList.add("modal-dragging");
      document.body.style.userSelect = "none";
    } else {
      document.documentElement.classList.remove("gs-modal-dragging");
      document.body.classList.remove("modal-dragging");
      document.body.style.userSelect = previousUserSelect;
    }
    clearSelection();
  };

  const startDrag = () => {
    pendingDrag = false;
    dragging = true;
    segmentedModalCard.classList.add("dragging", "gs-dragging");
    setDragLock(true);
  };

  const stopDrag = () => {
    pendingDrag = false;
    if (!dragging) return;
    dragging = false;
    segmentedModalCard.classList.remove("dragging", "gs-dragging");
    setDragLock(false);
  };

  segmentedModalCard.addEventListener("mousedown", e => {
    if (e.button !== 0 || isInteractive(e.target)) return;
    pendingDrag = true;
    sx = e.clientX;
    sy = e.clientY;
    bx = parseFloat(segmentedModalCard.dataset.modalX || "0") || 0;
    by = parseFloat(segmentedModalCard.dataset.modalY || "0") || 0;
  });

  window.addEventListener("mousemove", e => {
    if (pendingDrag) {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) startDrag();
    }
    if (!dragging) return;
    setSegmentedModalOffset(bx + (e.clientX - sx), by + (e.clientY - sy));
    clearSelection();
    e.preventDefault();
  });

  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("mouseleave", stopDrag);

  segmentedModalCard.addEventListener("touchstart", e => {
    const t = e.touches && e.touches[0];
    if (!t || isInteractive(e.target)) return;
    pendingDrag = true;
    sx = t.clientX;
    sy = t.clientY;
    bx = parseFloat(segmentedModalCard.dataset.modalX || "0") || 0;
    by = parseFloat(segmentedModalCard.dataset.modalY || "0") || 0;
  }, { passive: false });

  window.addEventListener("touchmove", e => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    if (pendingDrag) {
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) startDrag();
    }
    if (!dragging) return;
    setSegmentedModalOffset(bx + (t.clientX - sx), by + (t.clientY - sy));
    clearSelection();
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("touchend", stopDrag);
  window.addEventListener("touchcancel", stopDrag);

  document.addEventListener("selectstart", e => {
    if (!dragging) return;
    e.preventDefault();
    clearSelection();
  });

  document.addEventListener("dragstart", e => {
    if (!dragging) return;
    e.preventDefault();
  });
}

function openSettingsModal() {
  settingsModal.classList.add("show");
  settingsModal.setAttribute("aria-hidden", "false");
  enableSegmentedModalDrag();
  centerSegmentedModal();
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

function openSegPage(id) {
  document.querySelectorAll(".seg-page").forEach(page => page.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
  if (id === "segPageBurnout") renderBurnoutEditor();
}

document.querySelectorAll("[data-page]").forEach(btn => {
  btn.addEventListener("click", () => openSegPage(btn.dataset.page));
});

document.addEventListener("keydown", handleBurnoutUnlockKey);

resetBurnoutBtn?.addEventListener("click", () => {
  burnoutMap = {};
  saveBurnoutMap();
  markDisplayDirty();
  paintBurnoutEditor();
  render();
});

function bindCheckbox(id, key, needsTimerRestart = false) {
  const el = document.getElementById(id);
  if (!el) return;

  el.checked = settings[key];
  el.addEventListener("change", () => {
    settings[key] = el.checked;
    if (key !== "inactiveEnabled") maybeSetPresetCustom();
    saveSettings();
    syncCssVars();
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
      updateCustomDigitUI();
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
    syncCssVars();
    needsTimerRestart ? restartTimer() : render();
  });
}

bindCheckbox("opt24h", "h24");
bindCheckbox("optLeadingZero", "leading");
bindCheckbox("optSeconds", "seconds", true);
bindCheckbox("optTicks", "ticks", true);
bindCheckbox("optItalic", "italic", true);

bindSelect("optPreset", "preset");
bindRadio("optCorners", "corners", true);
bindRadio("optSegmentHeight", "segmentHeight", true);
bindCheckbox("optSymmetry", "symmetry", true);

bindSelect("optTPS", "tps", v => parseInt(v, 10), true);

bindCheckbox("optFlashSeparators", "flashSeparators", true);
bindCheckbox("optEvenFlashing", "evenFlashing", true);
bindNumber("optFlashEvery", "flashEvery", v => Math.max(0.1, parseFloat(v) || 0.5), true);

bindRadio("optSevenStyle", "sevenStyle", true);
bindRadio("optSixStyle", "sixStyle", true);
bindRadio("optNineStyle", "nineStyle", true);

optActiveColor.addEventListener("change", () => {
  const normalized = normalizeCssColor(optActiveColor.value);
  if (!normalized) {
    optActiveColor.value = settings.activeColor;
    return;
  }
  colorHsvDraft = null;
  settings.activeColor = normalized;
  maybeSetPresetCustom();
  saveSettings();
  syncCssVars();
  syncColorEditorUI();
  render();
});

optBackgroundColor?.addEventListener("change", () => {
  const normalized = normalizeCssColor(optBackgroundColor.value);
  if (!normalized) {
    optBackgroundColor.value = settings.backgroundColor;
    return;
  }
  settings.backgroundColor = normalized;
  maybeSetPresetCustom();
  saveSettings();
  syncCssVars();
});

optInactiveEnabled.addEventListener("change", () => {
  settings.inactiveEnabled = optInactiveEnabled.checked;
  maybeSetPresetCustom();
  saveSettings();
  syncCssVars();
  render();
});

colorModeRGB.addEventListener("click", () => setColorEditorMode("rgb"));
colorModeHSV.addEventListener("click", () => setColorEditorMode("hsv"));

rgbRInput.addEventListener("input", () => {
  const rgb = getActiveRgb();
  commitActiveColorFromRgb(parseInt(rgbRInput.value || "0", 10), rgb.g, rgb.b);
});

rgbGInput.addEventListener("input", () => {
  const rgb = getActiveRgb();
  commitActiveColorFromRgb(rgb.r, parseInt(rgbGInput.value || "0", 10), rgb.b);
});

rgbBInput.addEventListener("input", () => {
  const rgb = getActiveRgb();
  commitActiveColorFromRgb(rgb.r, rgb.g, parseInt(rgbBInput.value || "0", 10));
});

hsvHInput.addEventListener("input", () => {
  const hsv = getActiveHsv();
  commitActiveColorFromHsv(parseFloat(hsvHInput.value || "0"), hsv.s, hsv.v);
});

hsvSInput.addEventListener("input", () => {
  const hsv = getActiveHsv();
  commitActiveColorFromHsv(hsv.h, parseFloat(hsvSInput.value || "0") / 100, hsv.v);
});

hsvVInput.addEventListener("input", () => {
  const hsv = getActiveHsv();
  commitActiveColorFromHsv(hsv.h, hsv.s, parseFloat(hsvVInput.value || "0") / 100);
});

bindChannelSlider(".channel-slider.rgb-r", 255, (value) => {
  const rgb = getActiveRgb();
  commitActiveColorFromRgb(Math.round(value), rgb.g, rgb.b);
});

bindChannelSlider(".channel-slider.rgb-g", 255, (value) => {
  const rgb = getActiveRgb();
  commitActiveColorFromRgb(rgb.r, Math.round(value), rgb.b);
});

bindChannelSlider(".channel-slider.rgb-b", 255, (value) => {
  const rgb = getActiveRgb();
  commitActiveColorFromRgb(rgb.r, rgb.g, Math.round(value));
});

bindChannelSlider(".channel-slider.hsv-h", 360, (value) => {
  const hsv = getActiveHsv();
  commitActiveColorFromHsv(value, hsv.s, hsv.v);
});

bindChannelSlider(".channel-slider.hsv-s", 100, (value) => {
  const hsv = getActiveHsv();
  commitActiveColorFromHsv(hsv.h, value / 100, hsv.v);
});

bindChannelSlider(".channel-slider.hsv-v", 100, (value) => {
  const hsv = getActiveHsv();
  commitActiveColorFromHsv(hsv.h, hsv.s, value / 100);
});

if (importCustomDigitBtn && optCustomDigitFile) {
  importCustomDigitBtn.addEventListener("click", () => optCustomDigitFile.click());
  optCustomDigitFile.addEventListener("change", () => importCustomDigitFile(optCustomDigitFile.files?.[0]));
}

(async function init() {
  await loadSvgAsset("./icons/digit-seven_seg.svg");
  await loadSvgAsset("./icons/digit-seven_seg_chop.svg");
  await loadSvgAsset("./icons/digit-seven_seg_round.svg");

  setColorEditorMode(colorEditorMode);

  if (settings.preset === "default") applyPreset("default");
  else if (settings.preset === "classic") applyPreset("classic");
  else if (settings.preset === "modern") applyPreset("modern");
  else if (settings.preset === "lcd") applyPreset("lcd");
  else if (settings.preset === "lcdInverted") applyPreset("lcdInverted");
  else {
    syncInputsFromSettings();
    syncCssVars();
    restartTimer();
  }
})();
