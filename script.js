let timer;
let startTime;
let elapsedTime = 0;
let isRunning = false;

// Load saved keybinds from localStorage (default to 'KeyS' and 'KeyR')
let startStopKey = localStorage.getItem('startStopKey') || 'KeyS';
let resetKey = localStorage.getItem('resetKey') || 'KeyR';

// Display the saved keybinds in the input fields
document.getElementById('startStopKey').value = startStopKey;
document.getElementById('resetKey').value = resetKey;

function startStop() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
    } else {
        startTime = Date.now() - elapsedTime;
        timer = setInterval(updateDisplay, 25); // Updates every 25ms
        isRunning = true;
    }
}

function reset() {
    clearInterval(timer); // Stop the timer
    isRunning = false;    // Ensure it is stopped
    elapsedTime = 0;      // Reset elapsed time
    updateDisplay();      // Immediately update the UI
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
    let startInput = document.getElementById('startStopKey').value.trim();
    let resetInput = document.getElementById('resetKey').value.trim();

    if (startInput && resetInput) {
        startStopKey = startInput;
        resetKey = resetInput;
        
        localStorage.setItem('startStopKey', startStopKey);
        localStorage.setItem('resetKey', resetKey);

        alert(`Keybinds saved!\nStart/Stop: ${startStopKey}\nReset: ${resetKey}`);
    } else {
        alert("Please enter valid key codes.");
    }
}

// Listen for keypresses
document.addEventListener('keydown', function(event) {
    const keyCode = event.code; // Detects numpad and special keys uniquely

    if (keyCode === startStopKey) {
        startStop();
    } else if (keyCode === resetKey) {
        reset();
    }
});

// Allow users to capture key codes for custom keybinds
document.getElementById('startStopKey').addEventListener('keydown', function(event) {
    event.preventDefault(); // Prevent typing in the input field
    this.value = event.code; // Store key as event.code
});

document.getElementById('resetKey').addEventListener('keydown', function(event) {
    event.preventDefault(); // Prevent typing in the input field
    this.value = event.code; // Store key as event.code
});
