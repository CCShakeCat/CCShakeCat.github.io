// --- Version and Changelog Data as JSON ---
const WHATS_NEW_DATA = {
  version: "1.3.0",
  changelog: [
    "Made the dropdowns and checkboxes native"
  ]
};

// --- LocalStorage Key (update if version changes) ---
const DIALOG_SHOWN_KEY = `stopwatchVersionDialog_shown_${WHATS_NEW_DATA.version}`;

// --- Create Dialog Element with system font ---
function createVersionDialog() {
  let dialog = document.createElement('dialog');
  dialog.id = "stopwatch-version-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="whats-new-modal-content" style="min-width:300px">
      <h2>Stopwatch v${WHATS_NEW_DATA.version}</h2>
      <h3>What’s New</h3>
      <ul>
        ${WHATS_NEW_DATA.changelog.map(item => `<li>${item}</li>`).join("\n")}
      </ul>
      <button id="close-version-dialog" autofocus>Close</button>
    </form>
  `;
  document.body.appendChild(dialog);

  // Apply system font stack to match settings modal
  applySystemFontToWhatsNew(dialog.querySelector('.whats-new-modal-content'));

  return dialog;
}

// Apply system font stack based on OS, matching the settings modal
function applySystemFontToWhatsNew(modal) {
  const os = document.body.getAttribute('data-os');
  if (!modal) return;
  if (os === 'windows') {
    modal.style.fontFamily = "'Segoe UI', Arial, sans-serif";
  } else if (os === 'android') {
    modal.style.fontFamily = "Roboto, Arial, sans-serif";
  } else if (os === 'apple') {
    modal.style.fontFamily = "'San Francisco', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  } else {
    modal.style.fontFamily = "'Segoe UI', Arial, sans-serif";
  }
}

// --- Show Dialog Logic ---
function showVersionDialog() {
  let dialog = document.getElementById("stopwatch-version-dialog") || createVersionDialog();
  dialog.showModal();
  dialog.querySelector("#close-version-dialog").onclick = () => dialog.close();
}

// --- Show Once On Load ---
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem(DIALOG_SHOWN_KEY)) {
    showVersionDialog();
    localStorage.setItem(DIALOG_SHOWN_KEY, "true");
  }

  // --- Ctrl + F1 Keybind ---
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "F1") {
      e.preventDefault();
      showVersionDialog();
    }
  });

  // --- "What's New?" button in settings modal ---
  const whatsNewBtn = document.getElementById('whatsNewBtn');
  if (whatsNewBtn) {
    whatsNewBtn.addEventListener('click', () => {
      showVersionDialog();
    });
  }
});
