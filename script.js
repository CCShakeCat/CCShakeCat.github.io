let msPerTick = 25; // 40 ticks per second: shows .00 - .39
let running = false;
let intervalId = null;
let startTimestamp = null;
let elapsedBefore = 0; // ms accumulated before current run

let savedFont = localStorage.getItem('stopwatchFont') || 'FancyCatPX';
let savedFontType = localStorage.getItem('stopwatchFontType') || 'default';
let customFontData = localStorage.getItem('customFontData') || null;
let customFontName = localStorage.getItem('customFontName') || '';

function getElapsed() {
    if (running) {
        return elapsedBefore + (Date.now() - startTimestamp);
    } else {
        return elapsedBefore;
    }
}

function formatTime(ms) {
    const msTick = Math.floor((ms % 1000) / msPerTick); // 0..39
    const msString = msTick.toString().padStart(2, '0');
    const seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((ms / (1000 * 60)) % 60).toString().padStart(2, '0');
    const hours = Math.floor(ms / (1000 * 60 * 60)).toString().padStart(2, '0');
    return [
        ...hours, ':', ...minutes, ':', ...seconds, '.', ...msString
    ].map(ch => `<span class="monochar">${ch}</span>`).join('');
}

function updateDisplay() {
    const display = document.getElementById('display');
    if (display) display.innerHTML = formatTime(getElapsed());
}

function updateStartStopButton() {
    const btn = document.getElementById('startStopBtn');
    if (btn) {
        btn.textContent = running ? "Stop" : "Start";
        btn.classList.toggle('running', running); // Optional for styling
    }
}

function startStop() {
    if (running) {
        clearInterval(intervalId);
        elapsedBefore += Date.now() - startTimestamp;
        running = false;
    } else {
        startTimestamp = Date.now();
        intervalId = setInterval(updateDisplay, msPerTick);
        running = true;
    }
    updateStartStopButton();
}

function reset() {
    clearInterval(intervalId);
    running = false;
    startTimestamp = null;
    elapsedBefore = 0;
    updateDisplay();
    updateStartStopButton();
}

// ... rest of your code unchanged ...
// (font functions and DOMContentLoaded as before, just add a call to updateStartStopButton() after updateDisplay() in the setup)

document.addEventListener("DOMContentLoaded", () => {
    // ... all your existing setup code ...
    // (omitted for brevity, see previous script.js)
    // Add this at the end:
    updateDisplay();
    updateStartStopButton();
});
