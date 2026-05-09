// globals/test/script.js
// Playground page logic: TEST / STARTED / PAUSED / RESET + slider value labels

const $ = (sel) => document.querySelector(sel);

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function wireSliderValue(sliderId, valueId) {
  const slider = document.getElementById(sliderId);
  const value = document.getElementById(valueId);

  if (!slider || !value) return;

  const update = () => {
    value.textContent = slider.value;
  };

  // initialize + live updates
  update();
  slider.addEventListener("input", update);
  slider.addEventListener("change", update);
}

document.addEventListener("DOMContentLoaded", () => {
  // Modal wiring (settings button)
  if (window.GSModal?.wireAll) {
    window.GSModal.wireAll();
  }

  // Clock face behavior
  const face = $(" #clockFace") || document.getElementById("clockFace");
  const btnStartStop = document.getElementById("btnStartStop");
  const btnReset = document.getElementById("btnReset");

  let running = false;

  const updateButtons = () => {
    if (!btnStartStop) return;
    btnStartStop.textContent = running ? "Pause" : "Start";
  };

  const setFace = (t) => {
    if (face) face.textContent = t;
  };

  if (btnStartStop) {
    btnStartStop.addEventListener("click", () => {
      running = !running;
      setFace(running ? "STARTED" : "PAUSED");
      updateButtons();
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      running = false;
      setFace("RESET");
      updateButtons();
    });
  }

  // Slider value labels (this is the part you need)
  // Enabled slider: label span should show current slider.value
  wireSliderValue("testSlider", "sliderValue");

  // Disabled slider label is fixed at 50 in your HTML (no need to wire),
  // BUT if you ever decide to change it dynamically, uncomment below and
  // give the disabled value span an id like "sliderValueDisabled".
  // wireSliderValue("testSliderDisabled", "sliderValueDisabled");

  // Set initial face
  if (face && !face.textContent.trim()) setFace("TEST");
  updateButtons();
});