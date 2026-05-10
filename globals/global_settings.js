(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const themeSelect = $("#gsThemeSelect");
  const themeListEl = $("#gsThemeList");
  const zipInput = $("#gsThemeZipInput");
  const clearThemeBtn = $("#gsClearThemeBtn");
  const uiFontSelect = $("#gsSettingsFontSelect");
  const clockFontSelect = $("#gsClockFontSelect");
  const animScaleSelect = $("#gsAnimScaleSelect");
  const audioSliders = [
    { kind: "master", input: $("#gsVolumeMaster"), output: $("#gsVolumeMasterValue"), mute: $("#gsMuteMaster") },
    { kind: "music", input: $("#gsVolumeMusic"), output: $("#gsVolumeMusicValue"), mute: $("#gsMuteMusic") },
    { kind: "hurry", input: $("#gsVolumeHurry"), output: $("#gsVolumeHurryValue"), mute: $("#gsMuteHurry") },
    { kind: "warning", input: $("#gsVolumeWarning"), output: $("#gsVolumeWarningValue"), mute: $("#gsMuteWarning") }
  ];
  const uiFontRow = $("#gsOpenSettingsFontAdvanced");
  const clockFontRow = $("#gsOpenClockFontAdvanced");
  const fontModal = $("#gsFontModal");
  const fontModalTitle = $("#gsFontModalTitle");
  const fontModalDesc = $("#gsFontModalDesc");
  const fontModalStatus = $("#gsFontModalStatus");
  const fontModalClose = $("#gsFontModalClose");
  const fontImportBtn = $("#gsFontImportBtn");
  const fontClearBtn = $("#gsFontClearBtn");
  const fontFileInput = $("#gsFontFileInput");

  const tp = {
    icon: $("#tpIcon"),
    nameSmall: $("#tpNameSmall"),
    authorSmall: $("#tpAuthorSmall"),
    title: $("#tpTitle"),
    desc: $("#tpDesc"),
    byline: $("#tpByline"),
    version: $("#tpVersion")
  };

  const CUSTOM_ZIP_THEMES_KEY = "gs.customZipThemes";
  const BITFONT_KEY = "gs.useBitfont";
  const UI_FONT_MODE_KEY = "gs.uiFontMode";
  const CLOCK_FONT_MODE_KEY = "gs.clockFontMode";
  const UI_ANIM_SCALE_KEY = "gs.uiAnimScale";
  const UI_CUSTOM_FONT_DATA_KEY = "gs.uiCustomFontData";
  const UI_CUSTOM_FONT_NAME_KEY = "gs.uiCustomFontName";
  const UI_CUSTOM_FONT_FAMILY_KEY = "gs.uiCustomFontFamily";
  const CLOCK_CUSTOM_FONT_DATA_KEY = "gs.clockCustomFontData";
  const CLOCK_CUSTOM_FONT_NAME_KEY = "gs.clockCustomFontName";
  const CLOCK_CUSTOM_FONT_FAMILY_KEY = "gs.clockCustomFontFamily";
  const BITMAP_FONT_DATA_KEY = "gs.bitmapFontData";
  const BITMAP_FONT_NAME_KEY = "gs.bitmapFontName";
  const audioMuteMemoryKey = kind => `gs.audio.${kind}.beforeMute`;


  try {
    window.GSGlobal?.init?.('.');
    document.body.dataset.uiFontMode = (localStorage.getItem(UI_FONT_MODE_KEY) || "system").toLowerCase();
  } catch {}


  const body = document.body;
  const statusDateEl = $("#gsStatusDate");
  const statusTimeEl = $("#gsStatusTime");
  const statusDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const statusMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const navButtons = Array.from(document.querySelectorAll('.gs-nav-btn[data-section]'));
  const sections = Array.from(document.querySelectorAll('.gs-section[data-section]'));
  const backBtns = Array.from(document.querySelectorAll('#gsBackBtn, #gsPanelBackBtn'));
  const layoutEl = document.querySelector('.gs-layout');
  const navEl = document.querySelector('.gs-nav');
  const panelEl = document.querySelector('.gs-panel');
  let mobileTransitionTimer = null;

  function two(value) {
    return String(value).padStart(2, "0");
  }

  function updateStatusBar() {
    const now = new Date();
    const dateText = `${statusDayNames[now.getDay()]} ${two(now.getDate())} ${statusMonthNames[now.getMonth()]} ${now.getFullYear()}`;
    const timeText = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;
    let changed = false;

    if (statusDateEl && statusDateEl.dataset.statusText !== dateText) {
      statusDateEl.textContent = dateText;
      statusDateEl.dateTime = now.toISOString();
      statusDateEl.dataset.statusText = dateText;
      changed = true;
    }

    if (statusTimeEl && statusTimeEl.dataset.statusText !== timeText) {
      statusTimeEl.textContent = timeText;
      statusTimeEl.dateTime = now.toISOString();
      statusTimeEl.dataset.statusText = timeText;
      changed = true;
    }

    if (changed && getUIFontMode() === "bitmap") {
      window.GSGlobal?.renderBitmapText?.(statusDateEl?.parentElement || document.body);
    }
  }

  function getSection(sectionName) {
    return sections.find(sec => sec.dataset.section === sectionName) || null;
  }

  function isMobileView() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function getAnimMs() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--gs-anim').trim();
    const seconds = raw.match(/^([\d.]+)s$/i);
    if (seconds) return Math.max(0, Number(seconds[1]) * 1000);
    const ms = raw.match(/^([\d.]+)ms$/i);
    if (ms) return Math.max(0, Number(ms[1]));
    return 220;
  }

  function clearSectionAnimClasses(sec) {
    sec.classList.remove(
      'gs-enter',
      'gs-exit',
      'gs-anim-run',
      'gs-from-down',
      'gs-from-up',
      'gs-to-up',
      'gs-to-down',
      'gs-mobile-enter-target',
      'gs-mobile-exit-target'
    );
  }

  function clearMobileViewAnimClasses() {
    navEl?.classList.remove('gs-mobile-enter-target', 'gs-mobile-exit-target', 'gs-mobile-back-target');
    panelEl?.classList.remove('gs-mobile-enter-target', 'gs-mobile-exit-target');
  }

  function scheduleMobileTransitionCleanup(fn, delay) {
    if (mobileTransitionTimer) {
      window.clearTimeout(mobileTransitionTimer);
      mobileTransitionTimer = null;
    }
    mobileTransitionTimer = window.setTimeout(() => {
      mobileTransitionTimer = null;
      fn();
    }, delay);
  }

  function lockMobileLayoutHeight(...elements) {
    if (!layoutEl || !isMobileView()) return;
    const heights = elements
      .filter(Boolean)
      .map(el => Math.ceil(Math.max(el.getBoundingClientRect().height, el.scrollHeight || 0)))
      .filter(height => Number.isFinite(height) && height > 0);
    if (!heights.length) return;
    const height = Math.max(...heights);
    layoutEl.style.setProperty('--gs-mobile-layout-height', `${height}px`);
    layoutEl.classList.add('gs-mobile-layout-locked');
  }

  function unlockMobileLayoutHeight() {
    if (!layoutEl) return;
    layoutEl.classList.remove('gs-mobile-layout-locked');
    layoutEl.style.removeProperty('--gs-mobile-layout-height');
  }

  function syncNav(sectionName) {
    navButtons.forEach(btn => {
      const active = btn.dataset.section === sectionName;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function showSection(sectionName, opts = {}) {
    const next = getSection(sectionName);
    if (!next) return;

    const current = sections.find(sec => sec.classList.contains('is-visible')) || sections[0] || null;
    const currentIndex = current ? sections.indexOf(current) : -1;
    const nextIndex = sections.indexOf(next);
    const movingDown = currentIndex >= 0 && nextIndex > currentIndex;

    syncNav(sectionName);

    if (isMobileView()) {
      const duration = getAnimMs();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      const oldHeightSource = body.classList.contains('gs-mobile-section-open') ? panelEl : navEl;

      sections.forEach(sec => {
        clearSectionAnimClasses(sec);
        sec.classList.remove('is-visible');
        sec.style.display = 'none';
        sec.style.visibility = 'hidden';
      });

      next.style.display = 'block';
      next.style.visibility = 'visible';
      next.classList.add('is-visible');
      clearMobileViewAnimClasses();
      navEl?.classList.add('gs-mobile-exit-target');
      panelEl?.classList.add('gs-mobile-enter-target');

      body.classList.remove('gs-mobile-home', 'gs-mobile-back', 'gs-mobile-enter');
      body.classList.add('gs-mobile-section-open', 'gs-mobile-enter');
      lockMobileLayoutHeight(oldHeightSource, panelEl);

      scheduleMobileTransitionCleanup(() => {
        clearMobileViewAnimClasses();
        body.classList.remove('gs-mobile-enter');
        unlockMobileLayoutHeight();
      }, duration + 40);

      body.dataset.gsCurrentSection = sectionName;
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (!current || current === next || opts.instant) {
      sections.forEach(sec => {
        clearSectionAnimClasses(sec);
        sec.classList.remove('is-visible');
      });
      next.classList.add('is-visible');
    } else {
      sections.forEach(clearSectionAnimClasses);

      next.classList.add('gs-enter', movingDown ? 'gs-from-down' : 'gs-from-up', 'is-visible');
      current.classList.add('gs-exit', movingDown ? 'gs-to-up' : 'gs-to-down');

      requestAnimationFrame(() => {
        next.classList.add('gs-anim-run');
      });

      const cleanup = () => {
        current.classList.remove('is-visible', 'gs-exit', 'gs-to-up', 'gs-to-down');
        next.classList.remove('gs-enter', 'gs-anim-run', 'gs-from-down', 'gs-from-up');
      };

      next.addEventListener('transitionend', cleanup, { once: true });
      window.setTimeout(cleanup, getAnimMs() + 80);
    }

    body.classList.remove('gs-mobile-home', 'gs-mobile-section-open', 'gs-mobile-enter', 'gs-mobile-back');
    body.dataset.gsCurrentSection = sectionName;
  }

  function goHomeMobile() {
    if (isMobileView()) {
      const duration = Math.min(getAnimMs(), 450);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      lockMobileLayoutHeight(panelEl, navEl);

      clearMobileViewAnimClasses();
      panelEl?.classList.add('gs-mobile-exit-target');
      navEl?.classList.add('gs-mobile-back-target');
      body.classList.remove('gs-mobile-enter');
      body.classList.add('gs-mobile-back');

      scheduleMobileTransitionCleanup(() => {
        clearMobileViewAnimClasses();
        sections.forEach(sec => {
          clearSectionAnimClasses(sec);
          sec.classList.remove('is-visible');
          sec.style.display = 'none';
          sec.style.visibility = 'hidden';
        });
        body.classList.remove('gs-mobile-section-open', 'gs-mobile-enter');
        body.classList.add('gs-mobile-home');
        unlockMobileLayoutHeight();
        window.scrollTo({ top: 0, behavior: 'auto' });
        window.setTimeout(() => body.classList.remove('gs-mobile-back'), 40);
      }, duration + 40);
    } else {
      body.classList.remove('gs-mobile-home', 'gs-mobile-section-open', 'gs-mobile-enter', 'gs-mobile-back');
    }
  }

  function syncLayoutState() {
    const current = body.dataset.gsCurrentSection || 'display';
    syncNav(current);

    if (isMobileView()) {
      if (body.classList.contains('gs-mobile-section-open')) {
        sections.forEach(sec => {
          const active = sec.dataset.section === current;
          clearSectionAnimClasses(sec);
          sec.classList.toggle('is-visible', active);
          sec.style.display = active ? 'block' : 'none';
          sec.style.visibility = active ? 'visible' : 'hidden';
        });
        body.classList.remove('gs-mobile-home');
      } else {
        sections.forEach(sec => {
          clearSectionAnimClasses(sec);
          sec.classList.remove('is-visible');
          sec.style.display = 'none';
          sec.style.visibility = 'hidden';
        });
        body.classList.remove('gs-mobile-section-open', 'gs-mobile-enter');
        body.classList.add('gs-mobile-home');
      }
    } else {
      sections.forEach(sec => {
        clearSectionAnimClasses(sec);
        sec.style.removeProperty('display');
        sec.style.removeProperty('visibility');
      });
      body.classList.remove('gs-mobile-home', 'gs-mobile-section-open', 'gs-mobile-enter', 'gs-mobile-back');
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionName = btn.dataset.section;
      if (!sectionName) return;
      showSection(sectionName);
    });
  });

  backBtns.forEach(backBtn => {
    backBtn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      goHomeMobile();
    }, true);
  });

  window.addEventListener('resize', syncLayoutState);

  function changelogCards() {
    const aboutSection = getSection('about');
    if (!aboutSection) return [];
    return Array.from(aboutSection.querySelectorAll('.gs-card')).filter(card => {
      const label = (card.querySelector('strong')?.textContent || '').trim().toLowerCase();
      return Boolean(label) && !label.includes('credits');
    });
  }

  function changelogDetails() {
    return changelogCards().flatMap(card => Array.from(card.querySelectorAll('details')));
  }

  function parseVersion(summaryText) {
    const match = String(summaryText || '').match(/\bVersion\s+(\d+)(?:\.(\d+|x))?(?:\.(\d+|x))?/i);
    if (!match) return null;
    return {
      major: Number(match[1]),
      minor: match[2]?.toLowerCase() === 'x' || match[2] == null ? null : Number(match[2]),
      patch: match[3]?.toLowerCase() === 'x' || match[3] == null ? null : Number(match[3])
    };
  }

  function hasChangelogBody(details) {
    return Array.from(details.childNodes).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      if (node.tagName?.toLowerCase() === 'summary') return false;
      return node.textContent.trim().length > 0 || node.querySelector?.('li, p, ul, ol, details');
    });
  }

  function showVersionEdge(mode) {
    changelogDetails().forEach(details => { details.open = false; });

    changelogCards().forEach(card => {
      const items = Array.from(card.querySelectorAll('details'))
        .map(details => ({
          details,
          version: parseVersion(details.querySelector('summary')?.textContent || '')
        }))
        .filter(item => item.version);

      if (!items.length) return;

      const major = mode === 'newest'
        ? Math.max(...items.map(item => item.version.major))
        : Math.min(...items.map(item => item.version.major));

      const inMajor = items.filter(item => item.version.major === major);
      const minorValues = inMajor
        .filter(item => item.version.minor !== null)
        .map(item => item.version.minor);
      const minor = minorValues.length
        ? (mode === 'newest' ? Math.max(...minorValues) : Math.min(...minorValues))
        : null;

      inMajor.forEach(item => {
        const isMajorBucket = item.version.minor === null;
        const isTargetMinor = minor === null || item.version.minor === minor;
        const shouldOpen = isMajorBucket || (isTargetMinor && hasChangelogBody(item.details));
        if (shouldOpen) {
          item.details.open = true;
          let parent = item.details.parentElement?.closest?.('details');
          while (parent) {
            parent.open = true;
            parent = parent.parentElement?.closest?.('details');
          }
        }
      });
    });
  }

  document.querySelectorAll('[data-changelog-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.changelogAction;
      if (action === 'expand') {
        changelogDetails().forEach(details => { details.open = true; });
      } else if (action === 'collapse') {
        changelogDetails().forEach(details => { details.open = false; });
      } else if (action === 'newest' || action === 'oldest') {
        showVersionEdge(action);
      }
    });
  });

  function getCustomZipThemes() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_ZIP_THEMES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setCustomZipThemes(arr) {
    localStorage.setItem(CUSTOM_ZIP_THEMES_KEY, JSON.stringify(arr));
  }

  function getUseBitfont() {
    return localStorage.getItem(BITFONT_KEY) === "1";
  }

  function setUseBitfont(on) {
    localStorage.setItem(BITFONT_KEY, on ? "1" : "0");
  }

  function getUIFontMode(){ return (localStorage.getItem(UI_FONT_MODE_KEY) || "system").toLowerCase(); }
  function setUIFontMode(mode){ localStorage.setItem(UI_FONT_MODE_KEY, mode); window.GSGlobal?.applyUIFontMode?.(mode); document.body.dataset.uiFontMode = mode; }
  function getUIAnimScale(){ return (localStorage.getItem(UI_ANIM_SCALE_KEY) || "1").toLowerCase(); }
  function setUIAnimScale(val){ localStorage.setItem(UI_ANIM_SCALE_KEY, val); window.GSGlobal?.applyUIAnimScale?.(val); }
  function getClockFontMode(){ return (localStorage.getItem(CLOCK_FONT_MODE_KEY) || "default").toLowerCase(); }
  function setClockFontMode(mode){ localStorage.setItem(CLOCK_FONT_MODE_KEY, mode); document.documentElement.dataset.clockFontMode = mode; window.GSGlobal?.applyClockFontMode?.(mode); }

  function syncAudioSlider(item) {
    if (!item.input) return;
    const volume = window.GSGlobal?.getAudioVolume?.(item.kind) ?? 1;
    const percent = Math.round(volume * 100);
    item.input.value = String(percent);
    item.input.style.setProperty("--gs-range-value", `${percent}%`);
    if (item.output) item.output.textContent = `${percent}%`;
    if (item.mute) {
      const muted = percent <= 0;
      item.mute.classList.toggle("is-muted", muted);
      item.mute.textContent = muted ? "Unmute" : "Mute";
      item.mute.setAttribute("aria-pressed", muted ? "true" : "false");
    }
  }

  function syncAudioSliders() {
    audioSliders.forEach(syncAudioSlider);
  }

  audioSliders.forEach(item => {
    if (!item.input) return;
    item.input.addEventListener("input", event => {
      const previous = window.GSGlobal?.getAudioVolume?.(item.kind) ?? 1;
      const next = window.GSGlobal?.setAudioVolume?.(item.kind, Number(item.input.value) / 100) ?? 1;
      syncAudioSlider(item);
      event.gsSoundHandled = true;

      if (item.kind === "master" && previous <= 0 && next > 0) {
        window.GSGlobal?.playUISound?.("unmute");
      } else {
        window.GSGlobal?.playSliderSound?.(item.kind);
      }
    });

    item.mute?.addEventListener("click", event => {
      event.gsSoundHandled = true;
      const current = window.GSGlobal?.getAudioVolume?.(item.kind) ?? 1;
      if (current > 0) {
        localStorage.setItem(audioMuteMemoryKey(item.kind), String(current));
        window.GSGlobal?.setAudioVolume?.(item.kind, 0);
        syncAudioSlider(item);
        window.GSGlobal?.playUISound?.("cancel");
        return;
      }

      const remembered = Number(localStorage.getItem(audioMuteMemoryKey(item.kind)));
      const next = Number.isFinite(remembered) && remembered > 0 ? remembered : 1;
      window.GSGlobal?.setAudioVolume?.(item.kind, next);
      syncAudioSlider(item);
      window.GSGlobal?.playUISound?.("unmute");
    });
  });

  function cleanFamilyName(name, fallback) {
    return String(name || fallback || "CustomFont").replace(/\.(ttf|otf|woff2?)$/i, "").replace(/['"\\]/g, "").trim() || fallback || "CustomFont";
  }

  function fontKeys(kind) {
    const isClock = kind === "clock";
    return {
      mode: isClock ? CLOCK_FONT_MODE_KEY : UI_FONT_MODE_KEY,
      data: isClock ? CLOCK_CUSTOM_FONT_DATA_KEY : UI_CUSTOM_FONT_DATA_KEY,
      name: isClock ? CLOCK_CUSTOM_FONT_NAME_KEY : UI_CUSTOM_FONT_NAME_KEY,
      family: isClock ? CLOCK_CUSTOM_FONT_FAMILY_KEY : UI_CUSTOM_FONT_FAMILY_KEY
    };
  }

  function getCustomFontInfo(kind) {
    const keys = fontKeys(kind);
    const name = localStorage.getItem(keys.name) || "";
    const family = cleanFamilyName(localStorage.getItem(keys.family) || name, kind === "clock" ? "GSClockCustomFont" : "GSUICustomFont");
    const hasData = !!localStorage.getItem(keys.data);
    return { name, family, hasData };
  }

  let activeFontKind = "ui";

  function updateFontModalStatus() {
    if (!fontModalStatus) return;
    if (isBitmapModal()) {
      fontModalStatus.textContent = localStorage.getItem(BITMAP_FONT_DATA_KEY)
        ? `Current bitmap font: ${localStorage.getItem(BITMAP_FONT_NAME_KEY) || "default8.png"}`
        : "Using default8.png.";
      return;
    }
    const info = getCustomFontInfo(activeFontKind);
    fontModalStatus.textContent = info.hasData
      ? `Current custom font: ${info.name || info.family}`
      : "No custom font imported.";
  }

  function isBitmapModal() {
    const select = activeFontKind === "clock" ? clockFontSelect : uiFontSelect;
    return String(select?.value || "").toLowerCase() === "bitmap";
  }

  function openFontModal(kind) {
    activeFontKind = kind === "clock" ? "clock" : "ui";
    const isClock = activeFontKind === "clock";
    const bitmap = isBitmapModal();
    if (fontModalTitle) fontModalTitle.textContent = bitmap ? "BITMAP FONT OPTIONS" : (isClock ? "CLOCK FONT OPTIONS" : "UI FONT OPTIONS");
    if (fontModalDesc) fontModalDesc.textContent = bitmap
      ? "Import a Minecraft default8.png bitmap font. Characters use the 16 by 16 Unicode grid."
      : (isClock
        ? "Import a TTF or OTF font for clocks that use the global Clock fonts setting."
        : "Import a TTF or OTF font for menus and Global Settings UI.");
    if (fontImportBtn) fontImportBtn.textContent = bitmap ? "Import default8.png..." : "Import Custom Font...";
    if (fontClearBtn) fontClearBtn.textContent = bitmap ? "Restore Default Bitmap" : "Clear Custom Font";
    if (fontFileInput) fontFileInput.accept = bitmap ? ".png,image/png" : ".ttf,.otf,.woff,.woff2";
    updateFontModalStatus();
    if (fontModal) fontModal.hidden = false;
  }

  function closeFontModal() {
    if (fontModal) fontModal.hidden = true;
  }

  function setCustomFont(kind, file, dataUrl) {
    const keys = fontKeys(kind);
    const family = cleanFamilyName(file.name, kind === "clock" ? "GSClockCustomFont" : "GSUICustomFont");
    localStorage.setItem(keys.data, dataUrl);
    localStorage.setItem(keys.name, file.name);
    localStorage.setItem(keys.family, family);
    localStorage.setItem(keys.mode, "custom");
    if (kind === "clock") {
      if (clockFontSelect) clockFontSelect.value = "custom";
      window.GSGlobal?.installStoredCustomFont?.("clock");
      setClockFontMode("custom");
    } else {
      if (uiFontSelect) uiFontSelect.value = "custom";
      window.GSGlobal?.installStoredCustomFont?.("ui");
      setUIFontMode("custom");
    }
    updateFontModalStatus();
  }

  function clearCustomFont(kind) {
    const keys = fontKeys(kind);
    localStorage.removeItem(keys.data);
    localStorage.removeItem(keys.name);
    localStorage.removeItem(keys.family);
    if (kind === "clock") {
      if (getClockFontMode() === "custom") {
        if (clockFontSelect) clockFontSelect.value = "default";
        setClockFontMode("default");
      }
      window.GSGlobal?.installStoredCustomFont?.("clock");
    } else {
      if (getUIFontMode() === "custom") {
        if (uiFontSelect) uiFontSelect.value = "system";
        setUIFontMode("system");
      }
      window.GSGlobal?.installStoredCustomFont?.("ui");
    }
    updateFontModalStatus();
  }

  function setBitmapFont(file, dataUrl) {
    window.GSGlobal?.setBitmapFontData?.(dataUrl, file.name || "default8.png");
    localStorage.setItem(BITMAP_FONT_DATA_KEY, dataUrl);
    localStorage.setItem(BITMAP_FONT_NAME_KEY, file.name || "default8.png");
    updateFontModalStatus();
  }

  function clearBitmapFont() {
    window.GSGlobal?.clearBitmapFontData?.();
    localStorage.removeItem(BITMAP_FONT_DATA_KEY);
    localStorage.removeItem(BITMAP_FONT_NAME_KEY);
    updateFontModalStatus();
  }

  function zipFindFile(zip, path) {
    let f = zip.file(path);
    if (f) return f;

    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = zip.file(new RegExp(`${escaped}$`, "i"));
    return matches && matches.length ? matches[0] : null;
  }

  async function zipReadText(zip, path) {
    const f = zipFindFile(zip, path);
    if (!f) return null;
    return await f.async("text");
  }

  async function zipReadDataUrl(zip, path) {
    const f = zipFindFile(zip, path);
    if (!f) return null;

    const blob = await f.async("blob");
    return await new Promise(resolve => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(blob);
    });
  }

  async function zipReadNamedDataUrls(zip, folder, names) {
    const out = {};
    for (const name of names) {
      const dataUrl = await zipReadDataUrl(zip, `${folder}/${name}`);
      if (dataUrl) out[name.replace(/\.[^.]+$/, "")] = dataUrl;
    }
    return out;
  }

  function rewriteThemeCssAssetUrls(css, textures) {
    if (!css || !textures || typeof textures !== "object") return css || "";
    return String(css).replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, rawUrl) => {
      const url = String(rawUrl || "").trim();
      if (!url || /^(data:|https?:|blob:|#)/i.test(url)) return match;
      const clean = url.replace(/\\/g, "/").replace(/^(\.\/|\.\.\/)+/, "");
      const key = clean.replace(/^textures\//i, "").replace(/\.[^.]+$/, "");
      const byName = textures[key] || textures[clean.replace(/\.[^.]+$/, "")];
      return byName ? `url("${byName}")` : match;
    });
  }

  function normalizePackJson(obj) {
    if (!obj || typeof obj !== "object") return null;

    return {
      schema_version: Number(obj.schema_version ?? 1) || 1,
      name: String(obj.name || "Unnamed Theme").trim() || "Unnamed Theme",
      author: String(obj.author || "Unknown").trim() || "Unknown",
      version: String(obj.version || "0.0.0").trim() || "0.0.0",
      description: String(obj.description || "").trim(),
      branding: (obj.branding && typeof obj.branding === "object") ? obj.branding : {},
      show_bitfont_toggle: obj.show_bitfont_toggle === true
    };
  }

  async function fetchFolderPack(folder) {
    const base = new URL(window.ThemeRuntime.getThemesBaseUrl());

    const packJsonUrl = new URL(`${folder}/pack.json`, base).href;
    const packIconUrl = new URL(`${folder}/pack_icon.png`, base).href;

    let manifest = null;
    try {
      const res = await fetch(packJsonUrl, { cache: "no-store" });
      if (res.ok) {
        manifest = normalizePackJson(await res.json());
      }
    } catch {}

    let iconUrl = null;
    try {
      const res = await fetch(packIconUrl, { cache: "no-store" });
      if (res.ok) {
        const blob = await res.blob();
        iconUrl = await new Promise(resolve => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result || ""));
          fr.readAsDataURL(blob);
        });
      }
    } catch {}

    return {
      ...manifest,
      folder,
      icon_dataurl: iconUrl
    };
  }

  function setPreview(theme) {
    const isBuiltin = !!theme?.folder;
    if (tp.icon) {
      if (theme && theme.icon_dataurl) {
        tp.icon.src = theme.icon_dataurl;
        tp.icon.hidden = false;
      } else {
        tp.icon.hidden = true;
        tp.icon.removeAttribute("src");
      }
    }

    if (tp.nameSmall) tp.nameSmall.textContent = theme?.name || "(Theme Name Here)";
    if (tp.authorSmall) tp.authorSmall.textContent = isBuiltin ? '' : (theme?.author ? `By ${theme.author}` : 'By (name)');
    if (tp.title) tp.title.textContent = theme?.name || "(Theme Name Here)";
    if (tp.desc) tp.desc.textContent = theme?.description || "(Description)";
    if (tp.byline) tp.byline.textContent = isBuiltin ? '' : (theme?.author ? `By ${theme.author}` : 'By (name)');
    if (tp.version) tp.version.textContent = theme?.version ? `v(${theme.version})` : "v(x.x.x)";

  }

  function getDefaultThemeSubtitle(pack, index) {
    if (pack.id === index.defaults?.light) return "Default Light Theme";
    if (pack.id === index.defaults?.dark) return "Default Dark Theme";
    return pack.description || "Theme";
  }

  function themeItemIconHtml(theme) {
    if (!theme?.icon_dataurl) return `<div class="gs-theme-item-icon is-empty" aria-hidden="true"></div>`;
    return `<img class="gs-theme-item-icon" src="${theme.icon_dataurl}" alt="" aria-hidden="true" />`;
  }

  async function renderActivePreview() {
    const mode = window.ThemeRuntime.getMode();

    if (mode === "custom") {
      const customFolder = window.ThemeRuntime.getCustomPack();
      if (customFolder) {
        const pack = await fetchFolderPack(customFolder);
        setPreview(pack);
        return;
      }

      const zipTheme = window.ThemeRuntime.getActiveCustomZipTheme?.() || getCustomZipThemes().slice(-1)[0];
      if (zipTheme) {
        setPreview(zipTheme);
        return;
      }
    }

    const folder = await window.ThemeRuntime.getResolvedFolder();
    if (!folder) {
      setPreview(null);
      return;
    }

    const pack = await fetchFolderPack(folder);
    setPreview(pack);
  }

  async function renderThemeList() {
    if (!themeListEl) return;

    const index = await window.ThemeRuntime.getIndex();
    const mode = window.ThemeRuntime.getMode();
    const currentCustom = window.ThemeRuntime.getCustomPack();
    const currentZipTheme = window.ThemeRuntime.getActiveCustomZipTheme?.();

    const zipThemes = getCustomZipThemes();

    themeListEl.innerHTML = "";

    // Render folder themes from themes_index.json
    for (const pack of (index.packs || [])) {
      const isLightDefault = pack.id === index.defaults?.light;
      const isDarkDefault = pack.id === index.defaults?.dark;

      const isActive =
        (mode === "light" && isLightDefault) ||
        (mode === "dark" && isDarkDefault) ||
        (mode === "custom" && currentCustom === pack.folder);

      const fullPack = await fetchFolderPack(pack.folder);
      const title = fullPack?.name || pack.label || pack.id;
      const subtitle = getDefaultThemeSubtitle(pack, index);

      const row = document.createElement("div");
      row.className = "gs-theme-item";

      row.innerHTML = `
        <div class="gs-theme-item-left">
          ${themeItemIconHtml(fullPack)}
          <div class="gs-theme-item-text">
            <div class="gs-theme-item-name">${title}</div>
            <div class="gs-theme-item-meta">${subtitle}</div>
          </div>
        </div>
        <div class="gs-theme-item-actions">
          <button class="gs-btn primary" type="button" ${isActive ? "disabled" : ""}>
            ${isActive ? "Applied" : "Apply"}
          </button>
        </div>
      `;

      row.querySelector(".gs-btn.primary").addEventListener("click", async () => {
        if (isLightDefault) {
          await window.ThemeRuntime.setMode("light");
          if (themeSelect) themeSelect.value = "light";
        } else if (isDarkDefault) {
          await window.ThemeRuntime.setMode("dark");
          if (themeSelect) themeSelect.value = "dark";
        } else {
          await window.ThemeRuntime.setCustomPack(pack.folder);
          if (themeSelect) themeSelect.value = "custom";
        }

        try { await renderActivePreview(); } catch (err) { console.error('Theme preview failed', err); }
        try { await renderThemeList(); } catch (err) { console.error('Theme list failed', err); }
      });

      themeListEl.appendChild(row);
    }

    // Render System option
    const systemRow = document.createElement("div");
    systemRow.className = "gs-theme-item";
    systemRow.innerHTML = `
      <div class="gs-theme-item-left">
        <div class="gs-theme-item-icon is-system" aria-hidden="true">
          <span class="gs-mi">brightness_auto</span>
        </div>
        <div class="gs-theme-item-text">
          <div class="gs-theme-item-name">System</div>
          <div class="gs-theme-item-meta">Uses Light Mode / Dark Mode automatically</div>
        </div>
      </div>
      <div class="gs-theme-item-actions">
        <button class="gs-btn primary" type="button" ${mode === "system" ? "disabled" : ""}>
          ${mode === "system" ? "Applied" : "Apply"}
        </button>
      </div>
    `;
    systemRow.querySelector(".gs-btn.primary").addEventListener("click", async () => {
      await window.ThemeRuntime.setMode("system");
      if (themeSelect) themeSelect.value = "system";
      await renderActivePreview();
      await renderThemeList();
    });
    themeListEl.appendChild(systemRow);

    // Render uploaded zip themes after the folder themes
    for (const theme of zipThemes) {
      const isActive = mode === "custom" && !currentCustom && theme.name === currentZipTheme?.name;

      const row = document.createElement("div");
      row.className = "gs-theme-item";

      row.innerHTML = `
        <div class="gs-theme-item-left">
          ${themeItemIconHtml(theme)}
          <div class="gs-theme-item-name">${theme.name}</div>
          <div class="gs-theme-item-meta">
            ${theme.author ? `by ${theme.author}` : ""}
            ${theme.version ? `${theme.author ? " • " : ""}v${theme.version}` : ""}
          </div>
        </div>
        <div class="gs-theme-item-actions">
          <button class="gs-btn primary" type="button" ${isActive ? "disabled" : ""}>
            ${isActive ? "Applied" : "Apply"}
          </button>
          <button class="gs-btn gs-remove-theme" type="button">Remove</button>
        </div>
      `;

      row.querySelector(".gs-btn.primary").addEventListener("click", async () => {
        await window.ThemeRuntime.setCustomZipTheme?.(theme.name);
        setPreview(theme);
        if (themeSelect) themeSelect.value = "custom";
        await renderThemeList();
      });

      row.querySelector(".gs-remove-theme").addEventListener("click", async () => {
        const next = getCustomZipThemes().filter(t => t.name !== theme.name);
        setCustomZipThemes(next);
        if (window.ThemeRuntime.getActiveCustomZipTheme?.()?.name === theme.name) {
          await window.ThemeRuntime.setMode("dark");
          if (themeSelect) themeSelect.value = "dark";
        }
        await renderThemeList();
        await renderActivePreview();
      });

      themeListEl.appendChild(row);
    }

    await window.GSGlobal?.renderBitmapText?.(themeListEl);
  }

  async function handleThemeZip(file) {
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const buffer = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(buffer);

    const packText = await zipReadText(zip, "pack.json");
    if (!packText) throw new Error("pack.json not found in zip.");

    let parsed;
    try {
      parsed = JSON.parse(packText);
    } catch {
      throw new Error("pack.json is invalid JSON.");
    }

    const manifest = normalizePackJson(parsed);
    if (!manifest) throw new Error("pack.json could not be read.");

    const icon_dataurl = await zipReadDataUrl(zip, "pack_icon.png");
    const rawStyleCss = await zipReadText(zip, "style/theme.css");
    const bitmap_dataurl = await zipReadDataUrl(zip, "fonts/default8.png");
    const textures = await zipReadNamedDataUrls(zip, "textures", [
      "button.png", "button_hover.png", "button_press.png", "button_disabled.png", "button_hover_disabled.png", "button_press_disabled.png",
      "check.png", "check_hover.png", "check_press.png", "check_disabled.png", "check_hover_disabled.png", "check_press_disabled.png",
      "dropdown.png", "dropdown_hover.png", "dropdown_press.png", "dropdown_disabled.png", "dropdown_hover_disabled.png", "dropdown_press_disabled.png",
      "radio.png", "radio_hover.png", "radio_press.png", "radio_disabled.png", "radio_hover_disabled.png", "radio_press_disabled.png",
      "slider.png", "slider_hover.png", "slider_press.png", "slider_disabled.png", "slider_hover_disabled.png", "slider_press_disabled.png",
      "toggle.png", "toggle_hover.png", "toggle_press.png", "toggle_disabled.png", "toggle_hover_disabled.png", "toggle_press_disabled.png",
      "ui_rtc.png", "ui_stopwatch.png", "ui_timer.png", "ui_settings.png",
      "ui_clock_standard.png", "ui_rtc_segmented.png", "ui_rtc_segmented_lite.png",
      "ui_SMB.png", "ui_SMB3.png", "ui_SMW.png", "ui_NSMB.png", "ui_3DL.png", "ui_SLW.png"
    ]);
    const sounds = await zipReadNamedDataUrls(zip, "sounds", [
      "click.ogg", "cancel.ogg", "unmute.ogg", "volume.ogg"
    ]);
    const sound = await zipReadNamedDataUrls(zip, "sound", [
      "click.ogg", "cancel.ogg", "unmute.ogg", "volume.ogg"
    ]);
    const style_css = rewriteThemeCssAssetUrls(rawStyleCss || "", textures);

    const zipTheme = {
      ...manifest,
      icon_dataurl,
      style_css,
      bitmap_dataurl,
      textures,
      sounds: { ...sound, ...sounds }
    };

    const existing = getCustomZipThemes();
    const idx = existing.findIndex(t => t.name === zipTheme.name);
    if (idx >= 0) existing[idx] = zipTheme;
    else existing.push(zipTheme);

    setCustomZipThemes(existing);
    await window.ThemeRuntime.setCustomZipTheme?.(zipTheme.name);
    setPreview(zipTheme);
    if (themeSelect) themeSelect.value = "custom";
    await renderThemeList();
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", async () => {
      const val = String(themeSelect.value || "").toLowerCase();

      if (val === "light" || val === "dark" || val === "system") {
        await window.ThemeRuntime.setMode(val);
        try { await renderActivePreview(); } catch (err) { console.error('Theme preview failed', err); }
        try { await renderThemeList(); } catch (err) { console.error('Theme list failed', err); }
        return;
      }

      if (val === "custom") {
        const activeZip = window.ThemeRuntime.getActiveCustomZipTheme?.() || getCustomZipThemes().slice(-1)[0];
        if (activeZip) {
          await window.ThemeRuntime.setCustomZipTheme?.(activeZip.name);
          await renderActivePreview();
          await renderThemeList();
        }
        const themesBtn = document.querySelector('.gs-nav-btn[data-section="themes"]');
        if (themesBtn) themesBtn.click();
      }
    });
  }


  if (uiFontSelect) {
    uiFontSelect.addEventListener("mousedown", e => e.stopPropagation());
    uiFontSelect.addEventListener("click", e => e.stopPropagation());
    uiFontSelect.addEventListener("change", () => setUIFontMode(String(uiFontSelect.value || "system").toLowerCase()));
  }
  if (clockFontSelect) {
    clockFontSelect.addEventListener("mousedown", e => e.stopPropagation());
    clockFontSelect.addEventListener("click", e => e.stopPropagation());
    clockFontSelect.addEventListener("change", () => setClockFontMode(String(clockFontSelect.value || "default").toLowerCase()));
  }

  uiFontRow?.addEventListener("click", () => openFontModal("ui"));
  clockFontRow?.addEventListener("click", () => openFontModal("clock"));
  fontModalClose?.addEventListener("click", closeFontModal);
  fontModal?.addEventListener("click", e => {
    if (e.target === fontModal) closeFontModal();
  });
  fontImportBtn?.addEventListener("click", () => {
    if (!fontFileInput) return;
    fontFileInput.value = "";
    fontFileInput.click();
  });
  fontClearBtn?.addEventListener("click", () => {
    if (isBitmapModal()) clearBitmapFont();
    else clearCustomFont(activeFontKind);
  });
  fontFileInput?.addEventListener("change", () => {
    const file = fontFileInput.files && fontFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (isBitmapModal()) setBitmapFont(file, String(reader.result || ""));
      else setCustomFont(activeFontKind, file, String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && fontModal && !fontModal.hidden) closeFontModal();
  });

  if (animScaleSelect) {
    animScaleSelect.addEventListener("change", () => setUIAnimScale(String(animScaleSelect.value || "1").toLowerCase()));
  }

  if (zipInput) {
    zipInput.addEventListener("change", async () => {
      const file = zipInput.files && zipInput.files[0];
      if (!file) return;

      try {
        await handleThemeZip(file);
      } catch (err) {
        console.error(err);
        alert(`Theme load failed: ${err?.message || err}`);
      } finally {
        zipInput.value = "";
      }
    });
  }

  if (clearThemeBtn) {
    clearThemeBtn.addEventListener("click", async () => {
      await window.ThemeRuntime.setMode("dark");
      if (themeSelect) themeSelect.value = "dark";
      setUseBitfont(false);
      await renderActivePreview();
      await renderThemeList();
    });
  }

  
  // Initial layout sync for desktop/mobile and first visible section.
  if (!body.dataset.gsCurrentSection) {
    body.dataset.gsCurrentSection = 'display';
  }
  syncLayoutState();
  updateStatusBar();
  window.setInterval(updateStatusBar, 250);

(async () => {
    if (!window.ThemeRuntime) return;

    const mode = window.ThemeRuntime.getMode();
    if (themeSelect) themeSelect.value = mode;
    if (uiFontSelect) uiFontSelect.value = getUIFontMode();
    window.GSGlobal?.applyUIFontMode?.(getUIFontMode());
    document.body.dataset.uiFontMode = getUIFontMode();
    if (clockFontSelect) clockFontSelect.value = getClockFontMode();
    window.GSGlobal?.applyClockFontMode?.(getClockFontMode());
    if (animScaleSelect) animScaleSelect.value = getUIAnimScale();
    syncAudioSliders();

    try { await renderActivePreview(); } catch (err) { console.error('Theme preview failed', err); }
    try { await renderThemeList(); } catch (err) { console.error('Theme list failed', err); }
  })();
})();
