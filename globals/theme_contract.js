/* theme_contract.js
   Defines the theme pack contract + helper utilities.
*/

export const THEME_SCHEMA_VERSION = 1;

export const THEME_PATHS = Object.freeze({
  manifest: "pack.json",
  icon: "pack_icon.png",
  css: "style/theme.css",

  fonts: {
    bitfontPng: "fonts/default8.png",
    ttf: "fonts/default9.ttf",
    otf: "fonts/default9.otf",
  },

  sounds: {
    click: "sound/click.ogg",
    unmute: "sound/unmute.ogg",
    volume: "sound/volume.ogg",
  },

  // Optional: If you later decide to support images for controls, keep these names stable.
  texturesDir: "textures/",
});

export const DEFAULT_MANIFEST = Object.freeze({
  schema_version: THEME_SCHEMA_VERSION,
  name: "Unnamed Theme",
  author: "Unknown",
  version: "0.0.0",
  description: "",
  show_bitfont_toggle: false,
  branding: {
    accent_color: "#22AA55",
    preview_background: "dark", // "dark" | "light"
  },
});

/**
 * Safe JSON parse with fallback.
 */
export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Merges a theme manifest onto DEFAULT_MANIFEST (shallow + branding).
 */
export function normalizeManifest(maybeManifest) {
  const m = (maybeManifest && typeof maybeManifest === "object") ? maybeManifest : {};
  const branding = (m.branding && typeof m.branding === "object") ? m.branding : {};

  const merged = {
    ...DEFAULT_MANIFEST,
    ...m,
    branding: {
      ...DEFAULT_MANIFEST.branding,
      ...branding,
    },
  };

  // Normalize types
  merged.schema_version = Number.isFinite(+merged.schema_version) ? +merged.schema_version : THEME_SCHEMA_VERSION;
  merged.show_bitfont_toggle = !!merged.show_bitfont_toggle;

  if (typeof merged.name !== "string") merged.name = DEFAULT_MANIFEST.name;
  if (typeof merged.author !== "string") merged.author = DEFAULT_MANIFEST.author;
  if (typeof merged.version !== "string") merged.version = DEFAULT_MANIFEST.version;
  if (typeof merged.description !== "string") merged.description = DEFAULT_MANIFEST.description;

  if (typeof merged.branding.accent_color !== "string") merged.branding.accent_color = DEFAULT_MANIFEST.branding.accent_color;
  if (typeof merged.branding.preview_background !== "string") merged.branding.preview_background = DEFAULT_MANIFEST.branding.preview_background;

  // Clamp preview_background
  merged.branding.preview_background =
    merged.branding.preview_background === "light" ? "light" : "dark";

  return merged;
}

/**
 * Animation scale rule:
 * - "off" behaves like 1
 * - numbers: less than 1 => faster, greater than 1 => slower
 * Implementation: duration = baseMs * scale
 * So 0.25 => 25% duration (faster), 2 => 200% duration (slower)
 */
export function animScaleToMultiplier(val) {
  if (val == null) return 1;
  const s = String(val).trim().toLowerCase();
  if (s === "off") return 1;

  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}
