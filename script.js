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
        cancelAnimationFrame(timer);
        isRunning = false;
    } else {
        const startTime = Date.now() - elapsedTime;
        function update() {
            elapsedTime = Date.now() - startTime;
            updateDisplay();
            timer = requestAnimationFrame(update);
        }
        timer = requestAnimationFrame(update);
        isRunning = true;
    }
}

function reset() {
    console.log("Reset button clicked!");
    clearInterval(timer);
    isRunning = false;
    elapsedTime = 0;
    updateDisplay();
}

function updateDisplay() {
    console.log(elapsedTime);
    const milliseconds = Math.floor((elapsedTime % 1000) / 10);
    const seconds = Math.floor((elapsedTime / 1000) % 60);
    const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
    const hours = Math.floor(elapsedTime / (1000 * 60 * 60));

    document.getElementById('display').textContent =
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
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
