// Version dialog data
const STOPWATCH_VERSION = "v1.2.10";
const STOPWATCH_WHATS_NEW = "Added icons to the files and reworked the settings button / modal text";
const DIALOG_SHOWN_KEY = "stopwatchVersionDialog_shown_1.2.10";

// Create version dialog if needed
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
function showVersionDialog() {
  let dialog = document.getElementById("stopwatch-version-dialog") || createVersionDialog();
  dialog.showModal();
  dialog.querySelector("#close-version-dialog").onclick = () => dialog.close();
}

document.addEventListener("DOMContentLoaded", () => {
  // ...existing code...

  // Show dialog once on load
  if (!localStorage.getItem(DIALOG_SHOWN_KEY)) {
    showVersionDialog();
    localStorage.setItem(DIALOG_SHOWN_KEY, "true");
  }

  // "What's New?" button in settings
  const whatsNewBtn = document.getElementById('whatsNewBtn');
  if (whatsNewBtn) {
    whatsNewBtn.addEventListener('click', () => {
      showVersionDialog();
    });
  }
});
