// globals/modal.js
// Reusable draggable modal system for MimiClocks Globals

(() => {
  "use strict";

  const DRAG_CANCEL_SELECTOR = [
    "input",
    "textarea",
    "select",
    "option",
    "button",
    "label",
    "a",
    "[data-no-drag]",
    ".gs-modal-content",
    ".gs-modal-scroll"
  ].join(",");

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getViewportSize() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 0,
      h: window.innerHeight || document.documentElement.clientHeight || 0
    };
  }

  function ensureModalState(modal) {
    if (!modal._gsModalState) {
      modal._gsModalState = {
        dragging: false,
        pointerId: null,
        startPointerX: 0,
        startPointerY: 0,
        startLeft: 0,
        startTop: 0,
        hasMoved: false
      };
    }
    return modal._gsModalState;
  }

  function centerModal(modal, force = false) {
    if (!modal) return;
    if (!force && modal.dataset.dragPositioned === "true") return;

    const vp = getViewportSize();

    // Temporarily ensure measurable
    const prevVisibility = modal.style.visibility;
    const prevDisplay = modal.style.display;

    if (getComputedStyle(modal).display === "none") {
      modal.style.visibility = "hidden";
      modal.style.display = "block";
    }

    const rect = modal.getBoundingClientRect();
    const width = rect.width || modal.offsetWidth || 0;
    const height = rect.height || modal.offsetHeight || 0;

    const left = Math.max(12, Math.round((vp.w - width) / 2));
    const top = Math.max(12, Math.round((vp.h - height) / 2));

    modal.style.left = `${left}px`;
    modal.style.top = `${top}px`;
    modal.dataset.dragPositioned = "true";

    if (prevDisplay === "none") {
      modal.style.display = prevDisplay;
      modal.style.visibility = prevVisibility;
    }
  }

  function keepModalInViewport(modal) {
    if (!modal) return;

    const vp = getViewportSize();
    const rect = modal.getBoundingClientRect();

    const width = rect.width || modal.offsetWidth || 0;
    const height = rect.height || modal.offsetHeight || 0;

    const maxLeft = Math.max(12, vp.w - width - 12);
    const maxTop = Math.max(12, vp.h - height - 12);

    const currentLeft = parseFloat(modal.style.left || "0");
    const currentTop = parseFloat(modal.style.top || "0");

    modal.style.left = `${clamp(currentLeft, 12, maxLeft)}px`;
    modal.style.top = `${clamp(currentTop, 12, maxTop)}px`;
  }

  function beginDrag(event, modal, handle) {
    const state = ensureModalState(modal);

    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest(DRAG_CANCEL_SELECTOR)) return;

    state.dragging = true;
    state.pointerId = event.pointerId ?? null;
    state.startPointerX = event.clientX;
    state.startPointerY = event.clientY;

    const rect = modal.getBoundingClientRect();
    state.startLeft = rect.left;
    state.startTop = rect.top;
    state.hasMoved = false;

    modal.classList.add("gs-dragging");
    document.documentElement.classList.add("gs-modal-dragging");

    if (handle.setPointerCapture && event.pointerId != null) {
      try {
        handle.setPointerCapture(event.pointerId);
      } catch {}
    }

    event.preventDefault();
  }

  function moveDrag(event, modal) {
    const state = ensureModalState(modal);
    if (!state.dragging) return;
    if (state.pointerId != null && event.pointerId != null && state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startPointerX;
    const dy = event.clientY - state.startPointerY;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      state.hasMoved = true;
    }

    const vp = getViewportSize();
    const rect = modal.getBoundingClientRect();
    const width = rect.width || modal.offsetWidth || 0;
    const height = rect.height || modal.offsetHeight || 0;

    const maxLeft = Math.max(12, vp.w - width - 12);
    const maxTop = Math.max(12, vp.h - height - 12);

    const nextLeft = clamp(state.startLeft + dx, 12, maxLeft);
    const nextTop = clamp(state.startTop + dy, 12, maxTop);

    modal.style.left = `${nextLeft}px`;
    modal.style.top = `${nextTop}px`;
    modal.dataset.dragPositioned = "true";
  }

  function endDrag(event, modal, handle) {
    const state = ensureModalState(modal);
    if (!state.dragging) return;
    if (state.pointerId != null && event.pointerId != null && state.pointerId !== event.pointerId) return;

    state.dragging = false;
    modal.classList.remove("gs-dragging");
    document.documentElement.classList.remove("gs-modal-dragging");

    if (handle.releasePointerCapture && event.pointerId != null) {
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch {}
    }

    state.pointerId = null;
  }

  function wireModal(modal) {
    if (!modal || modal.dataset.gsModalWired === "true") return;
    modal.dataset.gsModalWired = "true";

    const handle =
      modal.querySelector(".gs-modal-header") ||
      modal.querySelector("[data-drag-handle]") ||
      modal;

    modal.style.position = "fixed";

    handle.addEventListener("pointerdown", (event) => beginDrag(event, modal, handle));
    handle.addEventListener("pointermove", (event) => moveDrag(event, modal));
    handle.addEventListener("pointerup", (event) => endDrag(event, modal, handle));
    handle.addEventListener("pointercancel", (event) => endDrag(event, modal, handle));

    // Prevent accidental click on header controls after a drag
    handle.addEventListener("click", (event) => {
      const state = ensureModalState(modal);
      if (state.hasMoved) {
        event.preventDefault();
        event.stopPropagation();
        state.hasMoved = false;
      }
    }, true);

    // Initial center when wired
    requestAnimationFrame(() => centerModal(modal, true));
  }

  function wireAll() {
    document.querySelectorAll(".gs-modal").forEach(wireModal);
  }

  function openModal(modalOrSelector, options = {}) {
    const modal =
      typeof modalOrSelector === "string"
        ? document.querySelector(modalOrSelector)
        : modalOrSelector;

    if (!modal) return null;

    wireModal(modal);

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");

    if (options.recenter !== false) {
      requestAnimationFrame(() => centerModal(modal, true));
    } else {
      requestAnimationFrame(() => keepModalInViewport(modal));
    }

    return modal;
  }

  function closeModal(modalOrSelector) {
    const modal =
      typeof modalOrSelector === "string"
        ? document.querySelector(modalOrSelector)
        : modalOrSelector;

    if (!modal) return null;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    return modal;
  }

  function toggleModal(modalOrSelector, options = {}) {
    const modal =
      typeof modalOrSelector === "string"
        ? document.querySelector(modalOrSelector)
        : modalOrSelector;

    if (!modal) return null;

    const isHidden = modal.hidden || modal.getAttribute("aria-hidden") === "true";
    return isHidden ? openModal(modal, options) : closeModal(modal);
  }

  function recenterAllOpenModals() {
    document.querySelectorAll(".gs-modal.is-open:not([hidden])").forEach((modal) => {
      keepModalInViewport(modal);
    });
  }


  function bindLegacyModal(modalOrSelector, contentSelector = '.modal-content', handleSelector = '.settings-header, [data-drag-handle], h2.lbl') {
    const modal = typeof modalOrSelector === 'string' ? document.querySelector(modalOrSelector) : modalOrSelector;
    if (!modal) return null;
    const content = modal.querySelector(contentSelector) || modal;
    const handle = content;
    if (content.dataset.gsLegacyBound === 'true') return { modal, content, handle };
    content.dataset.gsLegacyBound = 'true';

    let dragging = false;
    let pendingDrag = false;
    let suppressNextClick = false;
    let sx = 0;
    let sy = 0;
    let bx = parseFloat(content.dataset.modalX || '0') || 0;
    let by = parseFloat(content.dataset.modalY || '0') || 0;
    let previousUserSelect = '';

    const isInteractive = el =>
      !!(el && el.closest && el.closest('input, textarea, select, option, button, a, [data-no-drag], .gs-modal-content, .gs-modal-scroll'));

    const clearSelection = () => {
      try { window.getSelection?.().removeAllRanges?.(); } catch {}
    };

    const setSelectionLock = (locked) => {
      if (locked) {
        previousUserSelect = document.body.style.userSelect || '';
        document.documentElement.classList.add('gs-modal-dragging');
        document.body.classList.add('modal-dragging');
        document.body.style.userSelect = 'none';
        clearSelection();
      } else {
        document.documentElement.classList.remove('gs-modal-dragging');
        document.body.classList.remove('modal-dragging');
        document.body.style.userSelect = previousUserSelect;
        clearSelection();
      }
    };

    const setOffset = (x = 0, y = 0) => {
      bx = x;
      by = y;
      content.dataset.modalX = String(x);
      content.dataset.modalY = String(y);
      content.style.setProperty('--modal-x', `${x}px`);
      content.style.setProperty('--modal-y', `${y}px`);
      content.style.transform = 'translate(-50%, -50%) translate(var(--modal-x), var(--modal-y))';
      clearSelection();
    };

    content._gsSetLegacyModalOffset = setOffset;
    setOffset(bx, by);

    handle.addEventListener('mousedown', e => {
      if (e.button !== 0 || isInteractive(e.target)) return;
      pendingDrag = true;
      sx = e.clientX;
      sy = e.clientY;
      bx = parseFloat(content.dataset.modalX || '0') || 0;
      by = parseFloat(content.dataset.modalY || '0') || 0;
    });

    const startMouseDrag = () => {
      pendingDrag = false;
      dragging = true;
      suppressNextClick = true;
      content.classList.add('dragging', 'gs-dragging');
      setSelectionLock(true);
    };

    window.addEventListener('mousemove', e => {
      if (pendingDrag) {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) startMouseDrag();
      }
      if (!dragging) return;
      setOffset(bx + (e.clientX - sx), by + (e.clientY - sy));
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      pendingDrag = false;
      if (!dragging) return;
      dragging = false;
      content.classList.remove('dragging', 'gs-dragging');
      setSelectionLock(false);
    });

    window.addEventListener('mouseleave', () => {
      pendingDrag = false;
      if (!dragging) return;
      dragging = false;
      content.classList.remove('dragging', 'gs-dragging');
      setSelectionLock(false);
    });

    handle.addEventListener('touchstart', e => {
      const t = e.touches && e.touches[0];
      if (!t || isInteractive(e.target)) return;
      pendingDrag = true;
      sx = t.clientX;
      sy = t.clientY;
      bx = parseFloat(content.dataset.modalX || '0') || 0;
      by = parseFloat(content.dataset.modalY || '0') || 0;
    }, { passive: false });

    const startTouchDrag = () => {
      pendingDrag = false;
      dragging = true;
      suppressNextClick = true;
      content.classList.add('dragging', 'gs-dragging');
      setSelectionLock(true);
    };

    window.addEventListener('touchmove', e => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      if (pendingDrag) {
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) startTouchDrag();
      }
      if (!dragging) return;
      setOffset(bx + (t.clientX - sx), by + (t.clientY - sy));
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
      pendingDrag = false;
      if (!dragging) return;
      dragging = false;
      content.classList.remove('dragging', 'gs-dragging');
      setSelectionLock(false);
    });

    window.addEventListener('touchcancel', () => {
      pendingDrag = false;
      if (!dragging) return;
      dragging = false;
      content.classList.remove('dragging', 'gs-dragging');
      setSelectionLock(false);
    });

    document.addEventListener('selectstart', e => {
      if (!dragging) return;
      e.preventDefault();
      clearSelection();
    });

    document.addEventListener('dragstart', e => {
      if (!dragging) return;
      e.preventDefault();
    });

    content.addEventListener('click', e => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      if (isInteractive(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    return { modal, content, handle };
  }

  function centerLegacyModal(modalOrSelector, contentSelector = '.modal-content') {
    const modal = typeof modalOrSelector === 'string' ? document.querySelector(modalOrSelector) : modalOrSelector;
    if (!modal) return null;
    const content = modal.querySelector(contentSelector) || modal;
    bindLegacyModal(modal, contentSelector);
    if (typeof content._gsSetLegacyModalOffset === 'function') {
      content._gsSetLegacyModalOffset(0, 0);
    }
    return content;
  }

  window.GSModal = {
    wireModal,
    wireAll,
    open: openModal,
    close: closeModal,
    toggle: toggleModal,
    center: centerModal,
    keepInViewport: keepModalInViewport,
    bindLegacyModal,
    centerLegacyModal
  };

  window.addEventListener("resize", recenterAllOpenModals);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireAll, { once: true });
  } else {
    wireAll();
  }
})();
