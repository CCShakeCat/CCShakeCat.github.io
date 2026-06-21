(() => {
  "use strict";

  const dateEl = document.getElementById("statusDate");
  const timeEl = document.getElementById("statusTime");
  const launchMenu = document.getElementById("launchMenu");
  const launchMenuTitle = document.getElementById("launchMenuTitle");
  const launchMenuGrid = document.getElementById("launchMenuGrid");
  const launchMenuCard = launchMenu?.querySelector?.(".launch-menu-card");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const HOME_LEFT_SESSION_KEY = "gs.homeLeftThisSession";
  const homeTextures = [
    ["ui_rtc", "globals/icons/ui_rtc.png"],
    ["ui_stopwatch", "globals/icons/ui_stopwatch.png"],
    ["ui_timer", "globals/icons/ui_timer.png"],
    ["ui_settings", "globals/icons/ui_settings.png"],
    ["ui_clock_standard", "globals/icons/ui_clock_standard.png"],
    ["ui_rtc_segmented", "globals/icons/ui_rtc_segmented.png"],
    ["ui_rtc_segmented_lite", "globals/icons/ui_rtc_segmented_lite.png"],
    ["ui_timer_segmented", "globals/icons/ui_rtc_segmented.png"],
    ["ui_stopwatch_segmented", "globals/icons/ui_rtc_segmented.png"],
    ["ui_SMB", "globals/icons/ui_SMB.png"],
    ["ui_SMB3", "globals/icons/ui_SMB3.png"],
    ["ui_SMW", "globals/icons/ui_SMW.png"],
    ["ui_NSMB", "globals/icons/ui_NSMB.png"],
    ["ui_3DL", "globals/icons/ui_3DL.png"],
    ["ui_SLW", "globals/icons/ui_SLW.png"]
  ];
  const launchMenus = {
    rtc: {
      title: "Real Time Clock",
      options: [
        { label: "Stanmdard", href: "rtc/standard/", texture: "ui_clock_standard" },
        { label: "Segmented Display (Lite)", href: "rtc/segmented/", texture: "ui_rtc_segmented_lite" },
        { label: "Segmented Display", href: "rtc/segmented/", texture: "ui_rtc_segmented" }
      ]
    },
    timer: {
      title: "Timer",
      options: [
        { label: "Standard", href: "timer/standard/", texture: "ui_clock_standard" },
        { label: "Segmented Display", href: "timer/segmented/", texture: "ui_timer_segmented" },
        { label: "Super Mario Bros", href: "timer/smb/", texture: "ui_SMB" },
        { label: "Super Mario Bros. 3", href: "timer/smb3/", texture: "ui_SMB3" },
        { label: "Super Mario World", href: "timer/smw/", texture: "ui_SMW" },
        { label: "New Super Mario Bros", href: "timer/nsmb/", texture: "ui_NSMB" },
        { label: "Super Mario 3D Land", href: "timer/3D/", texture: "ui_3DL" },
        { label: "Sonic Lost World", href: "timer/soniclostworld/", texture: "ui_SLW" }
      ]
    },
    stopwatch: {
      title: "Stopwatch",
      options: [
        { label: "Standard", href: "stopwatch/", texture: "ui_stopwatch" },
        { label: "Segmented Display", href: "stopwatch/segmented/", texture: "ui_stopwatch_segmented" }
      ]
    }
  };

  function two(value) {
    return String(value).padStart(2, "0");
  }

  function updateStatusBar() {
    const now = new Date();
    const dateText = `${dayNames[now.getDay()]} ${two(now.getDate())} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const timeText = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;

    let changed = false;

    if (dateEl && dateEl.dataset.statusText !== dateText) {
      dateEl.textContent = dateText;
      dateEl.dateTime = now.toISOString();
      dateEl.dataset.statusText = dateText;
      changed = true;
    }

    if (timeEl && timeEl.dataset.statusText !== timeText) {
      timeEl.textContent = timeText;
      timeEl.dateTime = now.toISOString();
      timeEl.dataset.statusText = timeText;
      changed = true;
    }

    if (changed && window.GSGlobal?.getUIFontMode?.() === "bitmap") {
      window.GSGlobal.renderBitmapText?.(dateEl?.parentElement || document.body);
    }
  }

  updateStatusBar();
  window.setInterval(updateStatusBar, 250);

  window.addEventListener("pagehide", () => {
    sessionStorage.setItem(HOME_LEFT_SESSION_KEY, "1");
  });

  document.addEventListener("click", event => {
    const link = event.target?.closest?.("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    sessionStorage.setItem(HOME_LEFT_SESSION_KEY, "1");
  }, true);

  function canLoadImage(url) {
    return new Promise(resolve => {
      if (!url) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function resolveThemeTexture(name) {
    const runtime = window.ThemeRuntime;
    if (!runtime) return "";

    const customTheme = runtime.getMode?.() === "custom" && !runtime.getCustomPack?.()
      ? runtime.getActiveCustomZipTheme?.()
      : null;
    const customTexture = customTheme?.textures?.[name];
    if (customTexture) return customTexture;

    const folder = await runtime.getResolvedFolder?.();
    const base = runtime.getThemesBaseUrl?.();
    if (!folder || !base) return "";

    const url = new URL(`${folder}/textures/${name}.png`, base).href;
    return await canLoadImage(url) ? url : "";
  }

  async function applyHomeTextures() {
    for (const [name, fallback] of homeTextures) {
      const img = document.querySelector(`img[data-home-texture="${name}"]`);
      if (!img) continue;

      const themedUrl = await resolveThemeTexture(name);
      img.hidden = false;
      img.parentElement?.classList.remove("is-fallback");
      img.src = themedUrl || fallback;
    }
  }

  async function getTextureUrl(name) {
    const found = homeTextures.find(([textureName]) => textureName === name);
    const fallback = found?.[1] || `globals/icons/${name}.png`;
    return await resolveThemeTexture(name) || fallback;
  }

  function closeLaunchMenu() {
    if (!launchMenu) return;
    launchMenu.hidden = true;
    launchMenuGrid.innerHTML = "";
    launchMenuCard?.querySelector?.(".launch-menu-back")?.remove();
  }

  async function openLaunchMenu(kind) {
    const menu = launchMenus[kind];
    if (!menu || !launchMenu || !launchMenuTitle || !launchMenuGrid) return;

    launchMenuTitle.textContent = menu.title;
    launchMenuGrid.innerHTML = "";
    launchMenuCard?.querySelector?.(".launch-menu-back")?.remove();

    if (menu.parent && launchMenuCard) {
      const back = document.createElement("button");
      back.className = "launch-menu-back";
      back.type = "button";
      back.textContent = "< Back";
      back.addEventListener("click", () => openLaunchMenu(menu.parent));
      launchMenuCard.insertBefore(back, launchMenuTitle);
    }

    for (const option of menu.options) {
      const link = option.menu ? document.createElement("button") : document.createElement("a");
      link.className = "launch-option";
      if (option.menu) {
        link.type = "button";
        link.addEventListener("click", () => openLaunchMenu(option.menu));
      } else {
        link.href = option.href;
      }

      const icon = document.createElement("span");
      icon.className = "launch-option-icon";

      const img = document.createElement("img");
      img.alt = "";
      img.src = await getTextureUrl(option.texture);
      icon.appendChild(img);

      const label = document.createElement("span");
      label.className = "launch-option-label";
      label.textContent = option.label;

      link.append(icon, label);
      launchMenuGrid.appendChild(link);
    }

    launchMenu.hidden = false;
    if (window.GSGlobal?.getUIFontMode?.() === "bitmap") {
      await window.GSGlobal.renderBitmapText?.(launchMenu);
    }
    launchMenu.querySelector(".launch-option")?.focus();
  }

  applyHomeTextures();
  document.addEventListener("gs:custom-theme-changed", applyHomeTextures);
  document.addEventListener("gs:theme-assets-changed", applyHomeTextures);
  window.addEventListener("storage", event => {
    if (String(event.key || "").startsWith("mc_theme_") || String(event.key || "").startsWith("gs.customZip")) {
      applyHomeTextures();
    }
  });

  document.querySelectorAll("[data-launch-menu]").forEach(button => {
    button.addEventListener("click", () => openLaunchMenu(button.dataset.launchMenu));
  });

  document.querySelectorAll("[data-close-launch-menu]").forEach(button => {
    button.addEventListener("click", closeLaunchMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && launchMenu && !launchMenu.hidden) closeLaunchMenu();
  });

})();
