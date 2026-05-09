/* globals/global.js
   Shared helpers for MimiClocks pages.
   Exposes window.GSGlobal.
*/
(() => {
  "use strict";

  function currentScriptBase() {
    const script = document.currentScript || [...document.scripts].find(s => (s.src || '').includes('/globals/global.js') || (s.src || '').endsWith('globals/global.js'));
    if (!script || !script.src) return new URL('./globals/', window.location.href).href;
    return new URL('./', script.src).href;
  }

  const GLOBALS_BASE = currentScriptBase();

  function detectPlatform() {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/android/.test(ua)) {
      let vendor = 'google';
      if (/samsung|sm-/.test(ua)) vendor = 'samsung';
      else if (/oneplus|ne221|cph2|kb200|le2/.test(ua)) vendor = 'oneplus';
      else if (/oppo|cph/.test(ua)) vendor = 'oppo';
      else if (/vivo/.test(ua)) vendor = 'vivo';
      else if (/xiaomi|mi |redmi|poco/.test(ua)) vendor = 'xiaomi';
      else if (/pixel|google/.test(ua)) vendor = 'google';
      return { platform: 'android', vendor };
    }
    if (/iphone|ipad|ipod|macintosh|mac os x/.test(ua)) return { platform: 'apple', vendor: 'apple' };
    if (/windows/.test(ua)) return { platform: 'windows', vendor: 'windows' };
    return { platform: 'android', vendor: 'google' };
  }

  function fontUrl(rel) {
    return new URL(rel, GLOBALS_BASE).href;
  }

  function installSharedFonts(pageFallbackPrefix='.') {
    if (document.getElementById('gs-shared-fontfaces')) return;
    const p = String(pageFallbackPrefix || '.').replace(/\/$/, '');
    const fallback = (sub) => `${p}/${sub}`;
    const style = document.createElement('style');
    style.id = 'gs-shared-fontfaces';
    style.textContent = `
@font-face{font-family:'GSFancyCatPX';src:url('${fontUrl('fonts/FancyCatPX.ttf')}'),url('${fallback('fonts/FancyCatPX.ttf')}');font-display:swap;}
@font-face{font-family:'GSSegoeUI';src:url('${fontUrl('fonts/Windows/Segoe UI regular.ttf')}'),url('${fallback('fonts/Windows/Segoe UI regular.ttf')}'),url('${fallback('fonts/Segoe UI regular.ttf')}');font-display:swap;}
@font-face{font-family:'GSAndroidRoboto';src:url('${fontUrl('fonts/Android/roboto.ttf')}'),url('${fontUrl('fonts/Android/Roboto.ttf')}'),url('${fallback('fonts/Android/roboto.ttf')}'),url('${fallback('fonts/Android/Roboto.ttf')}'),url('${fallback('fonts/Roboto-Regular.ttf')}');font-display:swap;}
@font-face{font-family:'GSGoogleSans';src:url('${fontUrl('fonts/Android/Google_GoogleSans.ttf')}'),url('${fallback('fonts/Android/Google_GoogleSans.ttf')}');font-display:swap;}
@font-face{font-family:'GSOnePlusSans';src:url('${fontUrl('fonts/Android/OnePlus_OnePlusSans.ttf')}'),url('${fallback('fonts/Android/OnePlus_OnePlusSans.ttf')}');font-display:swap;}
@font-face{font-family:'GSOPPOSans';src:url('${fontUrl('fonts/Android/Oppo_OPPOSans.ttf')}'),url('${fallback('fonts/Android/Oppo_OPPOSans.ttf')}');font-display:swap;}
@font-face{font-family:'GSSamsungSans';src:url('${fontUrl('fonts/Android/Samsung_SamsungSans.ttf')}'),url('${fallback('fonts/Android/Samsung_SamsungSans.ttf')}');font-display:swap;}
@font-face{font-family:'GSVivoSans';src:url('${fontUrl('fonts/Android/Vivo_VivoSans.ttf')}'),url('${fallback('fonts/Android/Vivo_VivoSans.ttf')}');font-display:swap;}
@font-face{font-family:'GSMiSans';src:url('${fontUrl('fonts/Android/Xaomi_MiSans.ttf')}'),url('${fallback('fonts/Android/Xaomi_MiSans.ttf')}');font-display:swap;}
@font-face{font-family:'GSSanFrancisco';src:url('${fontUrl('fonts/Apple/SanFranciscoDisplay-Regular.otf')}'),url('${fontUrl('fonts/Apple/SanFrancisco.otf')}'),url('${fontUrl('fonts/SanFranciscoDisplay-Regular.otf')}'),url('${fallback('fonts/Apple/SanFranciscoDisplay-Regular.otf')}'),url('${fallback('fonts/Apple/SanFrancisco.otf')}'),url('${fallback('fonts/SanFranciscoDisplay-Regular.otf')}');font-display:swap;}
:root{
  --gs-font-default:'GSFancyCatPX', sans-serif;
  --gs-clock-default:'GSFancyCatPX', sans-serif;
}
.gs-bitmap-text{
  --gs-bitmap-scale:2;
  display:inline-flex;
  flex-wrap:wrap;
  align-items:flex-end;
  gap:0;
  vertical-align:baseline;
  line-height:1;
}
.gs-bitmap-glyph{
  --gs-bitmap-cell:8;
  --gs-bitmap-width:8;
  --gs-bitmap-x:0;
  --gs-bitmap-y:0;
  display:inline-block;
  width:calc(var(--gs-bitmap-width) * var(--gs-bitmap-scale) * 1px);
  height:calc(var(--gs-bitmap-cell) * var(--gs-bitmap-scale) * 1px);
  background-color:currentColor;
  -webkit-mask-image:var(--gs-bitmap-font-url-current);
  mask-image:var(--gs-bitmap-font-url-current);
  -webkit-mask-repeat:no-repeat;
  mask-repeat:no-repeat;
  -webkit-mask-size:calc(128 * var(--gs-bitmap-scale) * 1px) calc(128 * var(--gs-bitmap-scale) * 1px);
  mask-size:calc(128 * var(--gs-bitmap-scale) * 1px) calc(128 * var(--gs-bitmap-scale) * 1px);
  -webkit-mask-position:
    calc(var(--gs-bitmap-x) * var(--gs-bitmap-cell) * var(--gs-bitmap-scale) * -1px)
    calc(var(--gs-bitmap-y) * var(--gs-bitmap-cell) * var(--gs-bitmap-scale) * -1px);
  mask-position:
    calc(var(--gs-bitmap-x) * var(--gs-bitmap-cell) * var(--gs-bitmap-scale) * -1px)
    calc(var(--gs-bitmap-y) * var(--gs-bitmap-cell) * var(--gs-bitmap-scale) * -1px);
  image-rendering:pixelated;
  image-rendering:crisp-edges;
  flex:0 0 auto;
}
body[data-os-platform='windows']{--gs-system-font:'GSSegoeUI', Arial, sans-serif;}
body[data-os-platform='apple']{--gs-system-font:'GSSanFrancisco', 'Helvetica Neue', Helvetica, Arial, sans-serif;}
body[data-os-platform='android'][data-os-vendor='google']{--gs-system-font:'GSGoogleSans','GSAndroidRoboto',Arial,sans-serif;}
body[data-os-platform='android'][data-os-vendor='oneplus']{--gs-system-font:'GSOnePlusSans','GSAndroidRoboto',Arial,sans-serif;}
body[data-os-platform='android'][data-os-vendor='oppo']{--gs-system-font:'GSOPPOSans','GSAndroidRoboto',Arial,sans-serif;}
body[data-os-platform='android'][data-os-vendor='samsung']{--gs-system-font:'GSSamsungSans','GSAndroidRoboto',Arial,sans-serif;}
body[data-os-platform='android'][data-os-vendor='vivo']{--gs-system-font:'GSVivoSans','GSAndroidRoboto',Arial,sans-serif;}
body[data-os-platform='android'][data-os-vendor='xiaomi']{--gs-system-font:'GSMiSans','GSAndroidRoboto',Arial,sans-serif;}
`;
    document.head.appendChild(style);
  }

  function applyPlatformDataset() {
    const info = detectPlatform();
    document.body.dataset.osPlatform = info.platform;
    document.body.dataset.osVendor = info.vendor;
    return info;
  }

  function getSystemFontStack() {
    const info = detectPlatform();
    if (info.platform === 'windows') return "'GSSegoeUI', Arial, sans-serif";
    if (info.platform === 'apple') return "'GSSanFrancisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    const vendorMap = {
      google: "'GSGoogleSans','GSAndroidRoboto',Arial,sans-serif",
      oneplus: "'GSOnePlusSans','GSAndroidRoboto',Arial,sans-serif",
      oppo: "'GSOPPOSans','GSAndroidRoboto',Arial,sans-serif",
      samsung: "'GSSamsungSans','GSAndroidRoboto',Arial,sans-serif",
      vivo: "'GSVivoSans','GSAndroidRoboto',Arial,sans-serif",
      xiaomi: "'GSMiSans','GSAndroidRoboto',Arial,sans-serif"
    };
    return vendorMap[info.vendor] || vendorMap.google;
  }

  function getDefaultFontStack() {
    return "'GSFancyCatPX', sans-serif";
  }

  const UI_FONT_MODE_KEY = "gs.uiFontMode";
  const UI_ANIM_SCALE_KEY = "gs.uiAnimScale";
  const CLOCK_FONT_MODE_KEY = "gs.clockFontMode";
  const UI_CUSTOM_FONT_DATA_KEY = "gs.uiCustomFontData";
  const UI_CUSTOM_FONT_NAME_KEY = "gs.uiCustomFontName";
  const UI_CUSTOM_FONT_FAMILY_KEY = "gs.uiCustomFontFamily";
  const CLOCK_CUSTOM_FONT_DATA_KEY = "gs.clockCustomFontData";
  const CLOCK_CUSTOM_FONT_NAME_KEY = "gs.clockCustomFontName";
  const CLOCK_CUSTOM_FONT_FAMILY_KEY = "gs.clockCustomFontFamily";
  const BITMAP_FONT_DATA_KEY = "gs.bitmapFontData";
  const BITMAP_FONT_NAME_KEY = "gs.bitmapFontName";
  const BITMAP_RENDERED_ATTR = "data-gs-bitmap-rendered";
  const AUDIO_VOLUME_KEYS = {
    master: "gs.audio.master",
    music: "gs.audio.music",
    hurry: "gs.audio.hurry",
    warning: "gs.audio.warning"
  };
  const BITMAP_CELL = 8;
  let bitmapMetricsSrc = "";
  let bitmapMetrics = null;
  let bitmapMetricsPromise = null;
  let uiSoundsInstalled = false;
  let themeAssetListenerInstalled = false;
  let lastSliderSoundAt = 0;

  function safeFontFamilyName(name, fallback) {
    const raw = String(name || fallback || "CustomFont").replace(/\.(ttf|otf|woff2?)$/i, "");
    return raw.replace(/['"\\]/g, "").trim() || fallback || "CustomFont";
  }

  function getStoredFont(kind) {
    const isClock = kind === "clock";
    const data = localStorage.getItem(isClock ? CLOCK_CUSTOM_FONT_DATA_KEY : UI_CUSTOM_FONT_DATA_KEY) || "";
    const name = localStorage.getItem(isClock ? CLOCK_CUSTOM_FONT_NAME_KEY : UI_CUSTOM_FONT_NAME_KEY) || "";
    const family = safeFontFamilyName(
      localStorage.getItem(isClock ? CLOCK_CUSTOM_FONT_FAMILY_KEY : UI_CUSTOM_FONT_FAMILY_KEY) || name,
      isClock ? "GSClockCustomFont" : "GSUICustomFont"
    );
    return { data, name, family };
  }

  function clampAudioVolume(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return Math.max(0, Math.min(1, num));
  }

  function getAudioVolume(kind = "master") {
    const key = AUDIO_VOLUME_KEYS[kind] || AUDIO_VOLUME_KEYS.master;
    return clampAudioVolume(localStorage.getItem(key) ?? "1");
  }

  function setAudioVolume(kind, value) {
    const key = AUDIO_VOLUME_KEYS[kind] || AUDIO_VOLUME_KEYS.master;
    const volume = clampAudioVolume(value);
    localStorage.setItem(key, String(volume));
    return volume;
  }

  function getEffectiveAudioVolume(kind = "master") {
    if (kind === "master") return getAudioVolume("master");
    return getAudioVolume("master") * getAudioVolume(kind);
  }

  async function getThemeSoundUrl(soundName) {
    const clean = String(soundName || "").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    if (!clean || !window.ThemeRuntime) return "";
    const useCustomZip = window.ThemeRuntime.getMode?.() === "custom" && !window.ThemeRuntime.getCustomPack?.();
    const customTheme = useCustomZip ? window.ThemeRuntime.getActiveCustomZipTheme?.() : null;
    const customSound = customTheme?.sounds?.[clean];
    if (customSound) return customSound;
    const folder = await window.ThemeRuntime.getResolvedFolder?.();
    const base = window.ThemeRuntime.getThemesBaseUrl?.();
    if (!folder || !base) return "";
    return new URL(`${folder}/sounds/${clean}.ogg`, base).href;
  }

  async function playUISound(soundName, volumeKind = "master", volumeMultiplier = 1) {
    const url = await getThemeSoundUrl(soundName);
    if (!url) return false;
    const audio = new Audio(url);
    audio.volume = clampAudioVolume(getEffectiveAudioVolume(volumeKind) * clampAudioVolume(volumeMultiplier));
    if (audio.volume <= 0) return false;
    audio.play().catch(() => {});
    return true;
  }

  function playSliderSound(volumeKind = "master", volumeMultiplier = 1) {
    const now = Date.now();
    if (now - lastSliderSoundAt < 500) return false;
    lastSliderSoundAt = now;
    playUISound("volume", volumeKind, volumeMultiplier);
    return true;
  }

  function installUISounds() {
    if (uiSoundsInstalled) return;
    uiSoundsInstalled = true;

    document.addEventListener("click", event => {
      const target = event.target;
      const control = target?.closest?.("[data-ui-sound], button, a, summary, .gs-theme-file-label, .gs-setting-button");
      if (!control || control.closest?.("[data-no-ui-sound]")) return;

      const explicit = control.getAttribute?.("data-ui-sound");
      if (explicit) {
        playUISound(explicit);
        return;
      }

      const closeLike = control.matches?.(".gs-backbtn, .gs-modal-close, [aria-label*='close' i], [title*='close' i]") ||
        /close|back|cancel/i.test(control.id || "") ||
        /close|back|cancel/i.test(String(control.className || ""));
      playUISound(closeLike ? "cancel" : "click");
    }, true);

    document.addEventListener("change", event => {
      const target = event.target;
      if (!target?.matches?.("select, input[type='checkbox'], input[type='radio']")) return;
      if (target.closest?.("[data-no-ui-sound]")) return;
      playUISound("click");
    }, true);

    document.addEventListener("input", event => {
      const target = event.target;
      if (!target?.matches?.("input[type='range']")) return;
      if (
        event.gsSoundHandled ||
        target.closest?.("[data-no-ui-sound], .colour-editor, .color-field, .colour-settings")
      ) return;
      playSliderSound();
    });
  }

  let globalSettingsLinksInstalled = false;
  function installGlobalSettingsLinks() {
    if (globalSettingsLinksInstalled) return;
    globalSettingsLinksInstalled = true;

    document.addEventListener("click", event => {
      const link = event.target?.closest?.("[data-global-settings-link]");
      if (!link) return;

      const ok = window.confirm(
        "Opening Global Settings will leave this page and stop the current timer or clock session. Continue?"
      );
      if (!ok) event.preventDefault();
    });
  }

  function installThemeAssetListener() {
    if (themeAssetListenerInstalled) return;
    themeAssetListenerInstalled = true;
    document.addEventListener("gs:theme-assets-changed", () => {
      document.documentElement.style.setProperty('--gs-bitmap-font-url-current', `url("${getBitmapFontUrl()}")`);
      bitmapMetrics = null;
      bitmapMetricsPromise = null;
      renderBitmapText(document.body);
    });
  }

  function installStoredCustomFont(kind) {
    const isClock = kind === "clock";
    const id = isClock ? "gs-clock-custom-fontface" : "gs-ui-custom-fontface";
    const font = getStoredFont(isClock ? "clock" : "ui");
    const old = document.getElementById(id);
    if (old) old.remove();
    if (!font.data) return "";
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@font-face{font-family:'${font.family}';src:url('${font.data}');font-display:swap;}`;
    document.head.appendChild(style);
    return `'${font.family}', ${getSystemFontStack()}`;
  }

  function installStoredCustomFonts() {
    installStoredCustomFont("ui");
    installStoredCustomFont("clock");
  }

  function getUIFontMode() {
    return (localStorage.getItem(UI_FONT_MODE_KEY) || 'system').toLowerCase();
  }

  function getUIAnimScale() {
    return (localStorage.getItem(UI_ANIM_SCALE_KEY) || '1').toLowerCase();
  }

  function getClockFontMode() {
    return (localStorage.getItem(CLOCK_FONT_MODE_KEY) || "default").toLowerCase();
  }

  function getBitmapFontUrl() {
    const stored = localStorage.getItem(BITMAP_FONT_DATA_KEY);
    if (stored) return stored;
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue("--gs-bitmap-font-url").trim();
    if (cssVar) return cssVar.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    return new URL("fonts/default8.png", GLOBALS_BASE).href;
  }

  function getBitmapFontName() {
    return localStorage.getItem(BITMAP_FONT_NAME_KEY) || "default8.png";
  }

  function getBitmapGlyphIndex(ch) {
    const code = ch.codePointAt(0);
    if (!Number.isFinite(code)) return 32;
    if (code >= 0 && code <= 255) return code;
    return 63;
  }

  function fallbackBitmapWidth(index) {
    if (index === 32) return 4;
    if (index >= 29 && index <= 31) return 1;
    return 6;
  }

  function measureBitmapMetrics(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 128;
    canvas.height = img.naturalHeight || 128;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const metrics = new Array(256);

    for (let index = 0; index < 256; index++) {
      const sx = (index % 16) * BITMAP_CELL;
      const sy = Math.floor(index / 16) * BITMAP_CELL;
      let right = -1;

      try {
        const data = ctx.getImageData(sx, sy, BITMAP_CELL, BITMAP_CELL).data;
        for (let y = 0; y < BITMAP_CELL; y++) {
          for (let x = 0; x < BITMAP_CELL; x++) {
            const offset = (y * BITMAP_CELL + x) * 4;
            const alpha = data[offset + 3];
            const visible = alpha > 16 && (data[offset] > 16 || data[offset + 1] > 16 || data[offset + 2] > 16);
            if (visible && x > right) right = x;
          }
        }
      } catch {}

      metrics[index] = right >= 0 ? Math.min(BITMAP_CELL, right + 2) : fallbackBitmapWidth(index);
    }

    return metrics;
  }

  function loadBitmapMetrics() {
    const src = getBitmapFontUrl();
    if (bitmapMetrics && bitmapMetricsSrc === src) return Promise.resolve(bitmapMetrics);
    if (bitmapMetricsPromise && bitmapMetricsSrc === src) return bitmapMetricsPromise;

    bitmapMetricsSrc = src;
    bitmapMetricsPromise = new Promise(resolve => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        bitmapMetrics = measureBitmapMetrics(img);
        resolve(bitmapMetrics);
      };
      img.onerror = () => {
        bitmapMetrics = Array.from({ length: 256 }, (_, index) => fallbackBitmapWidth(index));
        resolve(bitmapMetrics);
      };
      img.src = src;
    });
    return bitmapMetricsPromise;
  }

  function getBitmapGlyphWidth(index) {
    return bitmapMetrics?.[index] || fallbackBitmapWidth(index);
  }

  function createBitmapGlyph(ch) {
    const glyph = document.createElement("span");
    glyph.className = "gs-bitmap-glyph";
    const index = getBitmapGlyphIndex(ch);
    const x = index % 16;
    const y = Math.floor(index / 16);
    glyph.style.setProperty("--gs-bitmap-x", String(x));
    glyph.style.setProperty("--gs-bitmap-y", String(y));
    glyph.style.setProperty("--gs-bitmap-width", String(getBitmapGlyphWidth(index)));
    glyph.setAttribute("aria-hidden", "true");
    return glyph;
  }

  function createBitmapText(text) {
    const wrap = document.createElement("span");
    wrap.className = "gs-bitmap-text";
    wrap.setAttribute("aria-label", text);
    for (const ch of String(text || "")) {
      if (ch === "\n") {
        wrap.appendChild(document.createElement("br"));
      } else {
        wrap.appendChild(createBitmapGlyph(ch));
      }
    }
    return wrap;
  }

  function normalizeBitmapTextNode(node) {
    const raw = String(node?.nodeValue || "");
    const parent = node?.parentElement;
    const whiteSpace = parent ? getComputedStyle(parent).whiteSpace : "normal";
    if (/pre/.test(whiteSpace)) return raw;
    return raw.replace(/\s+/g, " ");
  }

  const bitmapMeasureCanvas = document.createElement("canvas");

  function getTextInkHeight(text, sourceElement) {
    if (!sourceElement) return 0;
    const cs = getComputedStyle(sourceElement);
    const fontSize = parseFloat(cs.fontSize) || 16;
    const ctx = bitmapMeasureCanvas.getContext("2d");
    const fontStyle = cs.fontStyle || "normal";
    const fontVariant = cs.fontVariant || "normal";
    const fontWeight = cs.fontWeight || "400";
    const fontFamily = cs.fontFamily || "sans-serif";
    ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(String(text || "Hg"));
    const inkHeight = (metrics.actualBoundingBoxAscent || 0) + (metrics.actualBoundingBoxDescent || 0);
    return Math.max(inkHeight || 0, fontSize * 0.9);
  }

  function syncBitmapScale(wrap, sourceElement, text) {
    if (!wrap || !sourceElement) return;
    const cs = getComputedStyle(sourceElement);
    const fontSize = parseFloat(cs.fontSize) || 16;
    const lineHeightRaw = cs.lineHeight;
    const lineHeight = lineHeightRaw === "normal" ? fontSize * 1.2 : (parseFloat(lineHeightRaw) || fontSize);
    const targetHeight = Math.max(8, Math.min(getTextInkHeight(text, sourceElement), lineHeight));
    wrap.style.setProperty("--gs-bitmap-scale", String(targetHeight / BITMAP_CELL));
  }

  function restoreBitmapText(root = document.body) {
    root.querySelectorAll?.(`[${BITMAP_RENDERED_ATTR}]`).forEach(node => {
      node.replaceWith(document.createTextNode(node.getAttribute("aria-label") || node.textContent || ""));
    });
  }

  async function renderBitmapText(root = document.body, opts = {}) {
    if (!root) return;
    restoreBitmapText(root);
    if (!opts.force && getUIFontMode() !== "bitmap" && getClockFontMode() !== "bitmap") return;
    await loadBitmapMetrics();

    const skipSelector = [
      "script",
      "style",
      "canvas",
      "input",
      "textarea",
      "select",
      "option",
      ".gs-mi",
      ".gs-bitmap-text",
      "[data-no-bitmap]"
    ].join(",");

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = normalizeBitmapTextNode(node);
      if (!text.trim()) return;
      const bitmap = createBitmapText(text);
      bitmap.setAttribute(BITMAP_RENDERED_ATTR, "true");
      syncBitmapScale(bitmap, node.parentElement, text);
      node.replaceWith(bitmap);
    });
  }

  function getThemeUIFontStack() {
    const cs = getComputedStyle(document.documentElement);
    const candidates = [
      cs.getPropertyValue('--settings-font-family').trim(),
      cs.getPropertyValue('--site-font-family').trim(),
      cs.getPropertyValue('--theme-font-family').trim()
    ].filter(Boolean).filter(v => !/^(initial|inherit|unset|normal)$/i.test(v));
    return candidates[0] || '';
  }

  function getThemeUIFontStack() {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--theme-font-family")
      .trim();
    return cssVar || "";
  }

  function getUIFontStack(mode = getUIFontMode()) {
    const themeUIFont = getThemeUIFontStack();

    if (mode === 'default') {
      return themeUIFont || getSystemFontStack();
    }

    if (mode === 'custom') return installStoredCustomFont("ui") || getSystemFontStack();

    if (mode === 'bitmap') return getSystemFontStack();

    return getSystemFontStack();
  }

  function applyUIFontMode(mode = getUIFontMode()) {
    const stack = getUIFontStack(mode);
    document.documentElement.style.setProperty('--ui-font-stack', stack);
    document.documentElement.style.setProperty('--gs-bitmap-font-url-current', `url("${getBitmapFontUrl()}")`);
    document.body.style.fontFamily = stack;
    document.documentElement.dataset.uiFontMode = mode;
    document.body.dataset.uiFontMode = mode;
    window.setTimeout(() => renderBitmapText(document.body), 0);
    return stack;
  }

  function getClockFontStack(mode = getClockFontMode()) {
    const normalized = String(mode || "default").toLowerCase();
    if (normalized === "system") return getSystemFontStack();
    if (normalized === "custom") return installStoredCustomFont("clock") || getDefaultFontStack();
    if (normalized === "bitmap") return getDefaultFontStack();
    return getDefaultFontStack();
  }

  function applyClockFontMode(mode = getClockFontMode()) {
    const normalized = String(mode || "default").toLowerCase();
    const stack = getClockFontStack(normalized);
    document.documentElement.style.setProperty("--clock-font-stack", stack);
    document.documentElement.style.setProperty("--clock-face-font", stack);
    document.documentElement.style.setProperty('--gs-bitmap-font-url-current', `url("${getBitmapFontUrl()}")`);
    document.documentElement.dataset.clockFontMode = normalized;
    return stack;
  }

  function setBitmapFontData(dataUrl, name = "default8.png") {
    if (dataUrl) localStorage.setItem(BITMAP_FONT_DATA_KEY, dataUrl);
    if (name) localStorage.setItem(BITMAP_FONT_NAME_KEY, name);
    document.documentElement.style.setProperty('--gs-bitmap-font-url-current', `url("${getBitmapFontUrl()}")`);
    bitmapMetrics = null;
    bitmapMetricsPromise = null;
    renderBitmapText(document.body);
  }

  function clearBitmapFontData() {
    localStorage.removeItem(BITMAP_FONT_DATA_KEY);
    localStorage.removeItem(BITMAP_FONT_NAME_KEY);
    document.documentElement.style.setProperty('--gs-bitmap-font-url-current', `url("${getBitmapFontUrl()}")`);
    bitmapMetrics = null;
    bitmapMetricsPromise = null;
    renderBitmapText(document.body);
  }

  function applyUIAnimScale(val = getUIAnimScale()) {
    const raw = val === 'off' ? 0 : Number(val || 1);
    const scale = Number.isFinite(raw) ? Math.max(0, raw) : 1;
    document.documentElement.style.setProperty('--gs-anim-mult', String(scale));
    document.documentElement.style.setProperty('--gs-anim', `${Math.round(400 * scale)}ms`);
    document.documentElement.dataset.uiAnimScale = String(val || '1');
  }

  function applyPageThemeVars() {
    document.documentElement.style.setProperty('--page-bg', 'var(--gs-bg, var(--ui-bg, #000))');
    document.documentElement.style.setProperty('--page-text', 'var(--gs-text, var(--ui-fg, #fff))');
    document.documentElement.style.setProperty('--page-panel', 'var(--gs-card, var(--ui-panel, #0b0b0b))');
    document.documentElement.style.setProperty('--page-border', 'var(--gs-border, var(--ui-border, rgba(255,255,255,.14)))');
  }

  function init(pageFallbackPrefix='.') {
    installSharedFonts(pageFallbackPrefix);
    installStoredCustomFonts();
    applyPlatformDataset();
    applyUIFontMode();
    applyClockFontMode();
    applyUIAnimScale();
    applyPageThemeVars();
    installUISounds();
    installGlobalSettingsLinks();
    installThemeAssetListener();
  }

  window.GSGlobal = {
    globalsBase: GLOBALS_BASE,
    detectPlatform,
    installSharedFonts,
    applyPlatformDataset,
    getSystemFontStack,
    getDefaultFontStack,
    getUIFontMode,
    getUIFontStack,
    getClockFontMode,
    getClockFontStack,
    getBitmapFontUrl,
    getBitmapFontName,
    installStoredCustomFont,
    installStoredCustomFonts,
    renderBitmapText,
    restoreBitmapText,
    setBitmapFontData,
    clearBitmapFontData,
    getAudioVolume,
    setAudioVolume,
    getEffectiveAudioVolume,
    playUISound,
    playSliderSound,
    installUISounds,
    installGlobalSettingsLinks,
    applyUIFontMode,
    applyClockFontMode,
    applyUIAnimScale,
    applyPageThemeVars,
    init
  };
})();

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { try { window.GSGlobal.init('.'); } catch {} }, { once: true }); } else { try { window.GSGlobal.init('.'); } catch {} }
