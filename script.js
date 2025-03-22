let timer;
let isRunning = false;
let milliseconds = 0;
let millisecondsSteps = 40;

function startStop() {
    if (isRunning) {
        clearInterval(timer);
    } else {
        timer = setInterval(updateDisplay, 40); // Update every 40 milliseconds
    }
    isRunning = !isRunning;
}

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
    const settingsFrame = document.getElementById("settingsFrame");
    const clockDisplay = document.getElementById("display");

    settingsButton.addEventListener("click", () => {
        settingsFrame.style.display = "block";
        settingsFrame.style.width = "320px";
        settingsFrame.style.height = "200px";
    });

    window.closeSettingsModal = () => {
        settingsFrame.style.display = "none";
    };

    // Apply saved settings
    if (localStorage.getItem("useSegoeUI") === "true") {
        clockDisplay.style.fontFamily = "'Segoe UI', sans-serif";
    }

    let intervalRate = parseInt(localStorage.getItem("msPerSecond") || "40");
    setInterval(updateClock, intervalRate);
});