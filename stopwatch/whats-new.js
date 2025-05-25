// --- Version Dialog Data ---
const STOPWATCH_VERSION = "v1.2.10";
const STOPWATCH_WHATS_NEW = "Added icons to the files and reworked the settings button / modal text";

// --- LocalStorage Key ---
const DIALOG_SHOWN_KEY = "stopwatchVersionDialog_shown_1.2.10";

// --- Create Dialog Element ---
function createVersionDialog() {
  let dialog = document.createElement('dialog');
  dialog.id = "stopwatch-version-dialog";
  dialog.innerHTML = `
    <form method="dialog" style="min-width:300px">
      <h2>Stopwatch ${STOPWATCH_VERSION}</h2>
      <h3>What’s New</h3>
      <ul><li>${STOPWATCH_WHATS_NEW}</li></ul>
      <button id="close-version-dialog" autofocus>Close</button>
    </form>
  `;
  document.body.appendChild(dialog);
  return dialog;
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
