// ...existing code defining keybinds, keyEventToKeybind, etc...

// Inside DOMContentLoaded:
document.addEventListener("DOMContentLoaded", () => {
  // ...modal dom lookups...
  const keybindInputStartStop = document.getElementById('keybind-startstop');
  const keybindInputReset = document.getElementById('keybind-reset');
  const keybindCaptureOverlay = document.getElementById('keybindCaptureOverlay');
  const keybindCaptureInstruction = document.getElementById('keybindCaptureInstruction');
  const keybindCaptureCountdown = document.getElementById('keybindCaptureCountdown');

  // ...rest of modal setup...

  // Keybind listening UI (capture inside modal)
  keybindInputStartStop.onclick = function(e) {
    keybindInputStartStop.classList.add('listening');
    showKeybindCapturePrompt("startStop", function(newKeybind) {
      keybinds.startStop = newKeybind;
      localStorage.setItem('keybind-startStop', newKeybind);
      updateKeybindInputs();
      keybindInputStartStop.classList.remove('listening');
      updateFirefoxQuickFindSuppression();
    });
  };
  keybindInputReset.onclick = function(e) {
    keybindInputReset.classList.add('listening');
    showKeybindCapturePrompt("reset", function(newKeybind) {
      keybinds.reset = newKeybind;
      localStorage.setItem('keybind-reset', newKeybind);
      updateKeybindInputs();
      keybindInputReset.classList.remove('listening');
    });
  };

  // ...rest of DOMContentLoaded...
});

// Keybind capture "popup" in modal
let keybindCaptureTimeout = null;
let keybindCaptureCountdownInterval = null;

function showKeybindCapturePrompt(action, onSet) {
    const overlay = document.getElementById('keybindCaptureOverlay');
    const instruction = document.getElementById('keybindCaptureInstruction');
    const countdown = document.getElementById('keybindCaptureCountdown');
    let seconds = 7;
    instruction.textContent = `ENTER KEYBIND FOR ${action === "startStop" ? "START/STOP" : "RESET"}`;
    countdown.textContent = `This dialogue will close in ${seconds}s`;
    overlay.classList.add("show");
    keybindCaptureTimeout = setTimeout(hideKeybindCapturePrompt, seconds * 1000);
    keybindCaptureCountdownInterval = setInterval(() => {
        seconds--;
        countdown.textContent = `This dialogue will close in ${seconds}s`;
        if (seconds <= 0) hideKeybindCapturePrompt();
    }, 1000);

    function keyListener(e) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(keybindCaptureTimeout);
        clearInterval(keybindCaptureCountdownInterval);
        overlay.classList.remove("show");
        document.removeEventListener('keydown', keyListener, true);
        let kb = keyEventToKeybind(e);
        onSet(kb);
    }
    document.addEventListener('keydown', keyListener, true);

    overlay.onclick = function() {
        hideKeybindCapturePrompt();
    }
    function hideKeybindCapturePrompt() {
        clearTimeout(keybindCaptureTimeout);
        clearInterval(keybindCaptureCountdownInterval);
        overlay.classList.remove("show");
        document.removeEventListener('keydown', keyListener, true);
    }
}

// ...rest of JS...
