let running = false;
let smbCounter = "400";
let startValue = "400";
let hurryPlayed = false;
let finished = false;
let timerStartTime = 0;
let lastDisplayedTicks = null;
const TICK_MS = 750; // 0.75s per tick for NSMB Wii
let animationFrameId = null;

const ALLOWED_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// --- String decrement logic (supports both numbers and letters) ---
function decrementSMBString(str) {
    let arr = str.toUpperCase().split('');
    for (let i = arr.length - 1; i >= 0; i--) {
        let ch = arr[i];
        if (ch === ' ') continue; // Skip spaces
        let idx = ALLOWED_CHARS.indexOf(ch);
        if (idx > 0) {
            // Decrement this char, set all to right to '9' if not space, else keep as space
            arr[i] = ALLOWED_CHARS[idx - 1];
            for (let j = i + 1; j < arr.length; j++) {
                arr[j] = (arr[j] === ' ') ? ' ' : '9';
            }
            return arr.join('');
        }
    }
    return "000";
}

function normalizeInput(str) {
    return (str.toUpperCase().replace(/[^A-Z0-9 ]/g, '').padEnd(3, ' ')).slice(0, 3);
}
function toLogicStr(str) {
    return str.replace(/ /g, '0');
}
function toDisplayArr(str) {
    return str.padEnd(3, ' ').slice(0, 3).split('');
}
function formatSMB(str) {
    let sArr = toDisplayArr(str);
    return sArr.map(ch => `<span class="monochar">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
}

function updateDisplay() {
    const display = document.getElementById('display');
    display.innerHTML = formatSMB(smbCounter);
}
function showInput(show) {
    const timerInput = document.getElementById('timerInput');
    timerInput.style.display = show ? '' : 'none';
    document.getElementById('display').style.display = show ? 'none' : '';
    if (show) {
        timerInput.style.letterSpacing = '0.1em';
        timerInput.style.width = '7.8em';
        timerInput.style.textAlign = 'center';
    }
}
function updateStartStopButton() {
    const btn = document.getElementById('startStopBtn');
    btn.textContent = running ? "Stop" : "Start";
}

// --- Wall-clock timer logic (ticks string-based decrement!) ---
function wallClockUpdate() {
    if (!running) return;
    const now = performance.now();
    const elapsed = now - timerStartTime;
    const ticksPassed = Math.floor(elapsed / TICK_MS);

    // Only decrement as many times as ticks passed
    if (lastDisplayedTicks === null) lastDisplayedTicks = 0;
    let decrementsNeeded = ticksPassed - lastDisplayedTicks;
    for (let i = 0; i < decrementsNeeded; i++) {
        if (toLogicStr(smbCounter) !== "000") {
            smbCounter = decrementSMBString(smbCounter);
        }
    }
    updateDisplay();

    // Play hurry up when reaching 100 or less (on numeric strings)
    if (!hurryPlayed && /^\d{3}$/.test(toLogicStr(smbCounter)) && parseInt(toLogicStr(smbCounter), 10) <= 100 && parseInt(toLogicStr(smbCounter), 10) > 0) {
        playHurryUp();
        hurryPlayed = true;
    }

    lastDisplayedTicks = ticksPassed;

    if (toLogicStr(smbCounter) !== "000") {
        animationFrameId = requestAnimationFrame(wallClockUpdate);
    } else {
        running = false;
        finished = true;
        updateStartStopButton();
        showInput(false);
        document.body.classList.remove('running');
        updateDisplay();
        animationFrameId = null;
    }
}

function startStop() {
    if (finished && !running) return;

    if (running) {
        running = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        updateStartStopButton();
        showInput(false);
        document.body.classList.remove('running');
        finished = false;
    } else {
        let input = document.getElementById('timerInput');
        smbCounter = normalizeInput(input.value);
        startValue = smbCounter;
        hurryPlayed = false;
        finished = false;
        document.body.classList.add('nsmb-mode');
        document.body.classList.add('running');
        showInput(false);
        updateDisplay();
        timerStartTime = performance.now();
        lastDisplayedTicks = 0;
        running = true;
        updateStartStopButton();
        animationFrameId = requestAnimationFrame(wallClockUpdate);
    }
}
function reset() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    running = false;
    let input = document.getElementById('timerInput');
    smbCounter = normalizeInput(input.value);
    startValue = smbCounter;
    hurryPlayed = false;
    finished = false;
    document.body.classList.add('nsmb-mode');
    showInput(true);
    updateDisplay();
    updateStartStopButton();
    document.body.classList.remove('running');
}
function playHurryUp() {
    let hurryAudio = document.getElementById('hurryAudio');
    if (hurryAudio) {
        hurryAudio.currentTime = 0;
        hurryAudio.play().catch(() => {});
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('startStopBtn').addEventListener('click', startStop);
    document.getElementById('resetBtn').addEventListener('click', reset);

    const timerInput = document.getElementById('timerInput');
    timerInput.addEventListener('focus', function() {
        showInput(true);
    });
    timerInput.addEventListener('blur', function() {
        timerInput.value = normalizeInput(timerInput.value);
    });
    timerInput.addEventListener('input', function() {
        timerInput.value = timerInput.value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 3);
    });
    timerInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            timerInput.blur();
        }
    });

    timerInput.value = "400";
    reset();

    document.querySelectorAll('audio').forEach(audio => {
        audio.volume = 0.5;
    });
});