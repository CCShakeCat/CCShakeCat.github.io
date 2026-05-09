/* theme_loader.js
   Loads a theme pack ZIP, applies theme.css, optional fonts, and exposes a preview UI helper.

   Requirements:
   - JSZip available globally as JSZip (or import it yourself)
   - theme_contract.js available (ESM import below)
*/

import {
  THEME_PATHS,
  safeJsonParse,
  normalizeManifest,
} from "./theme_contract.js";

/**
 * Reads a JSZip file entry into a Blob.
 */
async function zipFileToBlob(zip, path) {
  const f = zip.file(path);
  if (!f) return null;
  const data = await f.async("uint8array");
  return new Blob([data]);
}

/**
 * Reads a JSZip file entry into text.
 */
async function zipFileToText(zip, path) {
  const f = zip.file(path);
  if (!f) return null;
  return await f.async("text");
}

/**
 * Returns true if the ZIP contains the file.
 */
function zipHas(zip, path) {
  return !!zip.file(path);
}

/**
 * Create/reuse a <style id="themePackStyle"> for injecting theme.css and font-face.
 */
function getOrCreateStyleTag(id) {
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    document.head.appendChild(tag);
  }
  return tag;
}

/**
 * Object URL lifecycle helper.
 */
function revokeAll(urls) {
  for (const u of urls) {
    try { URL.revokeObjectURL(u); } catch {}
  }
}

/**
 * Theme pack object returned by loadThemePackZip(file)
 * @typedef {Object} ThemePack
 * @property {Object} manifest
 * @property {JSZip} zip
 * @property {string[]} _objectUrls
 * @property {Object} filesPresent
 */

let _activeTheme = null; // track current theme for cleanup
let _activeObjectUrls = [];

// Style tags we manage
const STYLE_ID_CSS = "themePackStyle";
const STYLE_ID_FONT = "themePackFontStyle";

// Optional class hooks
const BODY_THEME_CLASS_PREFIX = "theme-pack-";

/**
 * Loads a theme pack from a user-selected ZIP File/Blob.
 * @param {File|Blob} zipFile
 * @returns {Promise<ThemePack>}
 */
export async function loadThemePackZip(zipFile) {
  if (!window.JSZip) throw new Error("JSZip not found. Include JSZip before theme_loader.js.");

  const zip = await JSZip.loadAsync(zipFile);

  // Manifest
  const manifestText = await zipFileToText(zip, THEME_PATHS.manifest);
  const raw = manifestText ? safeJsonParse(manifestText, {}) : {};
  const manifest = normalizeManifest(raw);

  const filesPresent = {
    hasCss: zipHas(zip, THEME_PATHS.css),
    hasBitfont: zipHas(zip, THEME_PATHS.fonts.bitfontPng),
    hasTTF: zipHas(zip, THEME_PATHS.fonts.ttf),
    hasOTF: zipHas(zip, THEME_PATHS.fonts.otf),
  };

  return {
    manifest,
    zip,
    _objectUrls: [],
    filesPresent,
  };
}

/**
 * Apply theme pack to the document.
 * - Injects theme.css if present
 * - Applies optional font file if present (ttf/otf)
 * - If no ttf/otf exists, it DOES NOT touch your global font settings (fallback works automatically)
 * - If useBitfont=true, it tries to enable bitfont mode (your app decides what that means via CSS vars)
 *
 * @param {ThemePack} theme
 * @param {{ useBitfont?: boolean }} opts
 */
export async function applyThemePack(theme, opts = {}) {
  const useBitfont = !!opts.useBitfont;

  // Cleanup previous theme object URLs
  revokeAll(_activeObjectUrls);
  _activeObjectUrls = [];

  // Remember current theme for later
  _activeTheme = theme;

  // Apply branding vars (safe even if no css)
  const root = document.documentElement;
  root.style.setProperty("--theme-accent", theme.manifest.branding.accent_color || "#22AA55");
  root.style.setProperty("--theme-preview-bg", theme.manifest.branding.preview_background || "dark");

  // Load + inject theme.css (optional)
  const cssText = await zipFileToText(theme.zip, THEME_PATHS.css);
  const cssTag = getOrCreateStyleTag(STYLE_ID_CSS);
  cssTag.textContent = cssText || ""; // if missing, clear it (fallback CSS remains in your site)

  // Fonts: prefer TTF then OTF
  const hasTTF = theme.filesPresent.hasTTF;
  const hasOTF = theme.filesPresent.hasOTF;

  // If useBitfont requested but bitfont not present, force it off
  const canBitfont = theme.filesPresent.hasBitfont;
  const effectiveUseBitfont = useBitfont && canBitfont;

  // Tell CSS whether bitfont mode is enabled
  root.dataset.useBitfont = effectiveUseBitfont ? "true" : "false";

  // Inject font-face ONLY if TTF/OTF exists and bitfont is NOT being used
  const fontTag = getOrCreateStyleTag(STYLE_ID_FONT);

  if (!effectiveUseBitfont && (hasTTF || hasOTF)) {
    const fontPath = hasTTF ? THEME_PATHS.fonts.ttf : THEME_PATHS.fonts.otf;
    const fontBlob = await zipFileToBlob(theme.zip, fontPath);
    if (fontBlob) {
      const url = URL.createObjectURL(fontBlob);
      _activeObjectUrls.push(url);

      // Theme font family name (scoped)
      const family = "ThemePackFont";
      fontTag.textContent = `
@font-face{
  font-family: "${family}";
  src: url("${url}") format("${hasTTF ? "truetype" : "opentype"}");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
:root{
  --theme-font-family: "${family}";
}
      `.trim();

      // IMPORTANT:
      // If your site uses --site-font-family / --settings-font-family etc,
      // you can map them in theme.css; we only provide --theme-font-family.
    } else {
      fontTag.textContent = "";
      root.style.removeProperty("--theme-font-family");
    }
  } else {
    // No ttf/otf OR bitfont mode enabled: do not override fonts (fallback to Global Settings)
    fontTag.textContent = "";
    root.style.removeProperty("--theme-font-family");
  }

  // Optional: add a body class based on name (useful for debugging)
  const safeName = String(theme.manifest.name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // Remove old theme-pack-* classes
  for (const c of Array.from(document.body.classList)) {
    if (c.startsWith(BODY_THEME_CLASS_PREFIX)) document.body.classList.remove(c);
  }
  document.body.classList.add(`${BODY_THEME_CLASS_PREFIX}${safeName}`);
}

/**
 * Build a simple Theme Preview UI logic:
 * - Shows name/author/version/description (you can bind to your own UI)
 * - Shows/hides the bitfont toggle based on manifest.show_bitfont_toggle
 * - Calls applyThemePack on toggle change
 *
 * You pass in a "refs" object so this works with your existing DOM.
 *
 * @param {ThemePack} theme
 * @param {{
 *   titleEl?: HTMLElement,
 *   subtitleEl?: HTMLElement,
 *   descEl?: HTMLElement,
 *   bitfontRowEl?: HTMLElement,
 *   bitfontCheckboxEl?: HTMLInputElement,
 *   onApply?: (useBitfont:boolean)=>void
 * }} refs
 */
export function buildThemePreviewUI(theme, refs = {}) {
  const m = theme.manifest;

  if (refs.titleEl) refs.titleEl.textContent = m.name;
  if (refs.subtitleEl) refs.subtitleEl.textContent = `By ${m.author} • v${m.version}`;
  if (refs.descEl) refs.descEl.textContent = m.description || "";

  const showToggle = !!m.show_bitfont_toggle;
  if (refs.bitfontRowEl) refs.bitfontRowEl.hidden = !showToggle;

  if (refs.bitfontCheckboxEl) {
    // If the toggle is hidden, force unchecked
    refs.bitfontCheckboxEl.checked = false;
    refs.bitfontCheckboxEl.disabled = !showToggle;

    refs.bitfontCheckboxEl.onchange = async () => {
      const useBitfont = !!refs.bitfontCheckboxEl.checked;
      if (typeof refs.onApply === "function") {
        refs.onApply(useBitfont);
      } else {
        // Default behavior: apply theme immediately
        await applyThemePack(theme, { useBitfont });
      }
    };
  }
}

/**
 * Convenience: Apply based on a <select> dropdown choosing "custom".
 * If you want "Selecting CUSTOM theme OR tapping Themes row opens Themes settings",
 * you can call this from your settings page JS.
 */
export function shouldOpenThemesSection(themeSelectValue) {
  return String(themeSelectValue || "").toLowerCase() === "custom";
}
