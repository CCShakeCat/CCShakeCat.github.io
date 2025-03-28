let timer;
let isRunning = false;
let milliseconds = 0;
let millisecondsSteps = 40;

function startStop() {
    if (isRunning) {
        clearInterval(timer);
        timer = null;
    } else {
        timer = setInterval(updateDisplay, millisecondsSteps); // Use millisecondsSteps
    }
    isRunning = !isRunning; // Toggle the state properly
}

// Update milliseconds when dropdown changes
document.getElementById('msDropdown').addEventListener('change', function () {
    millisecondsSteps = parseInt(this.value);
    
    if (isRunning) { 
        clearInterval(timer); 
        timer = setInterval(updateDisplay, millisecondsSteps); // Restart with new interval
    }
});


function reset() {
    clearInterval(timer);
    isRunning = false;
    milliseconds = 0;
    updateDisplay();
}

function updateDisplay() {
    const display = document.getElementById('display');
    const formattedTime = formatTime(milliseconds);
    display.innerText = formattedTime;
    milliseconds += 40; // Increment by 40 milliseconds, wrapping around 0-39
}

function formatTime(ms) {
    const date = new Date(ms);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const formattedMilliseconds = Math.floor((ms % 1000) / (1000 / millisecondsSteps)).toString().padStart(2, '0'); // Display only two digits up to milliseconds steps
    return `${hours}:${minutes}:${seconds}.${formattedMilliseconds}`;
}

//settings popup

document.addEventListener("DOMContentLoaded", () => {
    const settingsButton = document.getElementById("settingsButton");
    const settingsModal = document.getElementById("settingsModal");
    const fontToggle = document.getElementById("fontToggle");
    const msDropdown = document.getElementById("msDropdown");
    const clockDisplay = document.getElementById("display");

    // Load settings from localStorage
    fontToggle.checked = localStorage.getItem("useSegoeUI") === "true";
    msDropdown.value = localStorage.getItem("msPerSecond") || "40";

    // Apply settings
    if (fontToggle.checked) {
        clockDisplay.style.fontFamily = "'Segoe UI', sans-serif";
    }

    // Open settings modal
settingsButton.addEventListener("click", () => {
    settingsModal.style.display = "block";
});

// Close modal when tapping outside it (for mobile usability)
window.onclick = (event) => {
    if (event.target === settingsModal) {
        closeSettings();
    }
};
    // Save settings
    window.saveSettings = () => {
        localStorage.setItem("useSegoeUI", fontToggle.checked);
        localStorage.setItem("msPerSecond", msDropdown.value);

        if (fontToggle.checked) {
            clockDisplay.style.fontFamily = "'Segoe UI', sans-serif";
        } else {
            clockDisplay.style.fontFamily = ""; // Reset to default
        }

        alert("Settings saved!");
    };

    // Close modal
    window.closeSettings = () => {
        settingsModal.style.display = "none";
    };
    
});
function applyClockFont() {
    const clockDisplay = document.getElementById("display");
    const useSegoe = localStorage.getItem("useSegoeUI") === "true";

    if (useSegoe) {
        clockDisplay.style.fontFamily = "'Segoe UI Custom', sans-serif";
    } else {
        clockDisplay.style.fontFamily = "'FancyCat', sans-serif";
    }
}
