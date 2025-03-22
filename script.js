let timer;
let startTime;
let elapsedTime = 0;
let isRunning = false;

// Load saved keybinds from localStorage
let startStopKey = localStorage.getItem('startStopKey') || 'S';
let resetKey = localStorage.getItem('resetKey') || 'R';

document.getElementById('startStopKey').value = startStopKey;
document.getElementById('resetKey').value = resetKey;

function startStop() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
    } else {
        startTime = Date.now() - elapsedTime;
        timer = setInterval(updateDisplay, 25); // Updating every 25ms
        isRunning = true;
    }
}

function reset() {
    clearInterval(timer);
    isRunning = false;
    elapsedTime = 0;
    updateDisplay();
}

function updateDisplay() {
    elapsedTime = Date.now() - startTime;
    
    let totalSeconds = Math.floor(elapsedTime / 1000);
    let minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    let seconds = (totalSeconds % 60).toString().padStart(2, '0');
    let milliseconds = Math.floor((elapsedTime % 1000) / 25).toString().padStart(2, '0'); // 0 to 39

    document.getElementById('display').innerText = `${minutes}:${seconds}.${milliseconds}`;
}

// Save keybinds to localStorage
function saveKeybinds() {
    startStopKey = document.getElementById('startStopKey').value.toUpperCase();
    resetKey = document.getElementById('resetKey').value.toUpperCase();
    
    localStorage.setItem('startStopKey', startStopKey);
    localStorage.setItem('resetKey', resetKey);

    alert(`Keybinds saved!\nStart/Stop: ${startStopKey}\nReset: ${resetKey}`);
}

// Listen for keypresses
document.addEventListener('keydown', function(event) {
    if (event.key.toUpperCase() === startStopKey) {
        startStop();
    } else if (event.key.toUpperCase() === resetKey) {
        reset();
    }
});
