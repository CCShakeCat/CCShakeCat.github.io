(() => {
  "use strict";

  const scriptEl = document.currentScript;
  const THEMES_BASE = new URL("./", scriptEl.src);
  const INDEX_URL = new URL("themes_index.json", THEMES_BASE);

  const LS_MODE = "mc_theme_mode";              // light | dark | system | custom
  const LS_CUSTOM_FOLDER = "mc_theme_custom";  // folder name for custom pack
  const LS_CUSTOM_ZIP_ACTIVE = "gs.customZipThemeActive";
  const CUSTOM_ZIP_THEMES_KEY = "gs.customZipThemes";
  const LINK_ID = "mc-theme-pack-css";
  const CUSTOM_STYLE_ID = "mc-theme-custom-zip-css";
  const CUSTOM_COMPAT_CSS = `
:root{
  --theme-bg: var(--bg-main, var(--gs-bg, #0f0f0f));
  --theme-panel: var(--bg-panel, var(--gs-card, #171717));
  --theme-panel-2: var(--bg-card, var(--gs-card-2, #202020));
  --theme-fg: var(--text-primary, var(--gs-text, #ffffff));
  --theme-muted: var(--text-secondary, var(--gs-muted, #bdbdbd));
  --theme-subtle: var(--text-muted, var(--gs-subtle, #888888));
  --theme-accent: var(--accent-color, var(--gs-accent, #89aaff));
  --theme-accent-2: var(--accent-color, var(--gs-accent-2, #5f84ff));
  --page-bg: var(--theme-bg);
  --page-text: var(--theme-fg);
  --page-panel: var(--theme-panel);
  --page-border: var(--border-color, var(--gs-border, rgba(255,255,255,.14)));
}
`;

  let cachedIndex = null;

  function ensureLink() {
    let link = document.getElementById(LINK_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    return link;
  }

  function clearLink() {
    const link = document.getElementById(LINK_ID);
    if (link) link.remove();
  }

  function ensureCustomStyle() {
    let style = document.getElementById(CUSTOM_STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = CUSTOM_STYLE_ID;
      document.head.appendChild(style);
    }
    return style;
  }

  function clearCustomStyle() {
    const style = document.getElementById(CUSTOM_STYLE_ID);
    if (style) style.remove();
  }

  async function getIndex() {
    if (cachedIndex) return cachedIndex;
    const res = await fetch(INDEX_URL.href, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load themes_index.json");
    cachedIndex = await res.json();
    return cachedIndex;
  }

  function getMode() {
    return (localStorage.getItem(LS_MODE) || "dark").toLowerCase();
  }

  function getCustomPack() {
    return localStorage.getItem(LS_CUSTOM_FOLDER) || "";
  }

  function getCustomZipThemes() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_ZIP_THEMES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function getActiveCustomZipTheme() {
    const themes = getCustomZipThemes();
    if (!themes.length) return null;
    const activeName = localStorage.getItem(LS_CUSTOM_ZIP_ACTIVE) || "";
    return themes.find(theme => theme.name === activeName) || themes[themes.length - 1] || null;
  }

  function systemPrefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function setBodyThemeClass(mode) {
    document.body.classList.remove("theme-light", "theme-dark");

    if (mode === "system") {
      document.body.classList.add(systemPrefersDark() ? "theme-dark" : "theme-light");
      return;
    }

    document.body.classList.add(mode === "light" ? "theme-light" : "theme-dark");
  }

  function visualThemesDisabled() {
    return document.body?.dataset.themeVisuals === "off";
  }

  function findPackById(index, id) {
    return (index.packs || []).find(p => p.id === id) || null;
  }

  async function resolveFolderForMode(mode) {
    const index = await getIndex();

    if (mode === "custom") {
      return getCustomPack() || "";
    }

    if (mode === "system") {
      const wantedId = systemPrefersDark()
        ? index.defaults?.dark
        : index.defaults?.light;
      return findPackById(index, wantedId)?.folder || "";
    }

    if (mode === "light" || mode === "dark") {
      const wantedId = index.defaults?.[mode];
      return findPackById(index, wantedId)?.folder || "";
    }

    return "";
  }

  function folderUrl(folder, relPath) {
    return new URL(`${folder}/${relPath}`, THEMES_BASE).href;
  }


  async function resolveBitmapUrl(folder) {
    if (!folder) return "";
    const bmpUrl = folderUrl(folder, "fonts/default8.png");
    try {
      const res = await fetch(bmpUrl, { cache: "no-store" });
      if (res.ok) return bmpUrl;
    } catch {}
    return "";
  }

  function applyAssetVars(bitmapUrl) {
    const root = document.documentElement;
    if (bitmapUrl) root.style.setProperty("--gs-bitmap-font-url", `url("${bitmapUrl}")`);
    else root.style.removeProperty("--gs-bitmap-font-url");
    document.dispatchEvent(new CustomEvent("gs:theme-assets-changed", { detail: { bitmapUrl } }));
  }
  async function applyTheme() {
    const mode = getMode();
    const folder = await resolveFolderForMode(mode);

    if (visualThemesDisabled()) {
      document.body.classList.remove("theme-light", "theme-dark");
      clearLink();
      clearCustomStyle();
      applyAssetVars("");
      return folder || "";
    }

    // Body class should always match light/dark/system mode
    setBodyThemeClass(mode === "custom" ? "dark" : mode);

    if (mode === "custom" && !folder) {
      const customTheme = getActiveCustomZipTheme();
      if (customTheme) {
        clearLink();
        const style = ensureCustomStyle();
        style.textContent = `${CUSTOM_COMPAT_CSS}\n${customTheme.style_css || ""}`;
        applyAssetVars(customTheme.bitmap_dataurl || "");
        document.dispatchEvent(new CustomEvent("gs:custom-theme-changed", { detail: { theme: customTheme } }));
        return "";
      }
    }

    clearCustomStyle();

    if (!folder) {
      clearLink();
      applyAssetVars("");
      return "";
    }

    const link = ensureLink();
    link.href = folderUrl(folder, "style/theme.css");
    const bitmapUrl = await resolveBitmapUrl(folder);
    applyAssetVars(bitmapUrl);
    return folder;
  }

  function setMode(mode) {
    localStorage.setItem(LS_MODE, String(mode).toLowerCase());
    return applyTheme();
  }

  function setCustomPack(folder) {
    localStorage.setItem(LS_CUSTOM_FOLDER, folder || "");
    localStorage.setItem(LS_MODE, "custom");
    localStorage.removeItem(LS_CUSTOM_ZIP_ACTIVE);
    return applyTheme();
  }

  function setCustomZipTheme(name) {
    localStorage.removeItem(LS_CUSTOM_FOLDER);
    localStorage.setItem(LS_CUSTOM_ZIP_ACTIVE, name || "");
    localStorage.setItem(LS_MODE, "custom");
    return applyTheme();
  }

  function getThemesBaseUrl() {
    return THEMES_BASE.href;
  }

  async function getResolvedFolder() {
    return await resolveFolderForMode(getMode());
  }

  window.ThemeRuntime = {
    getMode,
    setMode,
    getCustomPack,
    setCustomPack,
    getActiveCustomZipTheme,
    setCustomZipTheme,
    getIndex,
    getResolvedFolder,
    getThemesBaseUrl,
    applyTheme
  };

  // Initial apply
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme();
    }, { once: true });
  } else {
    applyTheme();
  }

  // Live OS theme changes when in system mode
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (getMode() === "system") applyTheme();
  };

  if (mq.addEventListener) {
    mq.addEventListener("change", onSystemChange);
  } else if (mq.addListener) {
    mq.addListener(onSystemChange);
  }
})();
