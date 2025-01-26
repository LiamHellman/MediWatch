document.addEventListener("DOMContentLoaded", () => {
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const currentMode = localStorage.getItem("darkMode");

    if (currentMode === "enabled") {
        document.body.classList.add("dark-mode");
        darkModeToggle.textContent = "☀️";
    } else {
        darkModeToggle.textContent = "🌙";
    }

    darkModeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const mode = document.body.classList.contains("dark-mode") ? "enabled" : "disabled";
        localStorage.setItem("darkMode", mode);
        darkModeToggle.textContent = mode === "enabled" ? "☀️" : "🌙";
    });

    updateQueue();
    loadTrivia();
    document.getElementById("next-trivia").addEventListener("click", loadTrivia);

    // Wordle setup
    setupWordle();
});

let queueData = null;
let simulatedPatients = [];

// Format wait time utility function
function formatWaitTime(minutes) {
    if (minutes < 0) return "0 min"; // Show 0 instead of negative
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

function generateIncrementalWaitTimes(patients) {
    const waitRanges = {
        1: [10, 30],
        2: [30, 90],
        3: [90, 180],
        4: [180, 360],
        5: [360, 720]
    };

    patients.sort((a, b) => {
        if (a.triage_category !== b.triage_category) {
            return a.triage_category - b.triage_category;
        }
        return new Date(a.arrival_time) - new Date(b.arrival_time);
    });

    let cumulativeTime = 0;

    patients.forEach(patient => {
        const [min, max] = waitRanges[patient.triage_category];
        const increment = Math.floor(Math.random() * (max - min + 1)) + min;
        cumulativeTime = cumulativeTime === 0 ? increment : cumulativeTime + increment;
        patient.targetWaitTime = cumulativeTime;
    });

    return patients;
}

function processQueue() {
    if (!simulatedPatients.length) return;

    simulatedPatients.forEach(patient => {
        patient.time_elapsed += 1;
    });

    simulatedPatients = simulatedPatients.filter(
        patient => patient.time_elapsed < patient.targetWaitTime
    );

    updateQueueUI();
    document.getElementById("total-waiting").textContent = simulatedPatients.length;
}

async function updateQueue() {
    try {
        const response = await fetch('http://localhost:3000/api/v1/queue');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        queueData = await response.json();
        simulatedPatients = queueData.patients;

        simulatedPatients = generateIncrementalWaitTimes(simulatedPatients);
        simulatedPatients.forEach(patient => {
            patient.time_elapsed = 0;
        });

        updateQueueUI();
        if (window.queueInterval) clearInterval(window.queueInterval);
        window.queueInterval = setInterval(processQueue, 1000);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("queue-list").innerHTML = '<li class="error">Error loading queue data</li>';
    }
}

function updateQueueUI() {
    if (!simulatedPatients) return;

    const queueList = document.getElementById("queue-list");
    const waitTimeEl = document.getElementById("wait-time");

    document.getElementById("total-waiting").textContent = simulatedPatients.length;

    const sortedPatients = [...simulatedPatients].sort((a, b) => {
        const aRemaining = a.targetWaitTime - a.time_elapsed;
        const bRemaining = b.targetWaitTime - b.time_elapsed;
        return aRemaining - bRemaining;
    });

    const lastPatientWait = sortedPatients.length > 0 ?
        Math.max(0, sortedPatients[sortedPatients.length - 1].targetWaitTime - sortedPatients[sortedPatients.length - 1].time_elapsed) :
        0;

    document.getElementById("estimated-time").textContent = formatWaitTime(lastPatientWait);

    queueList.innerHTML = sortedPatients
        .map((patient, index) => {
            const remainingTime = Math.max(0, patient.targetWaitTime - patient.time_elapsed);
            return `
                <li class="queue-item">
                    <div class="position-number">${index + 1}</div>
                    <div class="patient-info">
                        <span class="patient-id">Patient ${patient.id}</span>
                    </div>
                    <div class="wait-time">${formatWaitTime(remainingTime)}</div>
                    <button onclick="deletePatient('${patient.id}')" class="delete-btn">×</button>
                </li>
            `;
        }).join('');

    const avgWait = simulatedPatients.length ?
        simulatedPatients.reduce((sum, p) => sum + p.time_elapsed, 0) / simulatedPatients.length :
        0;
    waitTimeEl.textContent = formatWaitTime(Math.round(avgWait));
}

async function deletePatient(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/v1/patient/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await updateQueue();
    } catch (error) {
        console.error("Error deleting patient:", error);
    }
}

async function loadTrivia() {
    const triviaQuestionElement = document.getElementById("trivia-question");

    try {
        const response = await fetch("http://numbersapi.com/random/trivia");
        if (!response.ok) throw new Error("Failed to fetch fun fact");

        const fact = await response.text();
        triviaQuestionElement.textContent = fact;
    } catch (error) {
        console.error("Error fetching fun fact:", error);
        triviaQuestionElement.textContent = "Failed to load fun fact. Please try again.";
    }
}

// Wordle game implementation
function setupWordle() {
    const wordleInput = document.getElementById("wordle-input");
    const submitWordleButton = document.getElementById("submit-wordle");
    const wordleGrid = document.getElementById("wordle-grid");
    const wordleFeedback = document.getElementById("wordle-feedback");

    let targetWord = "";
    let attempts = [];

    async function fetchWord() {
        try {
            const response = await fetch("https://random-word-api.herokuapp.com/word?length=5");
            const data = await response.json();
            targetWord = data[0].toUpperCase();
        } catch (error) {
            console.error("Failed to fetch the word:", error);
        }
    }

    async function initializeWordle() {
        await fetchWord();
        wordleGrid.innerHTML = "";
        wordleFeedback.textContent = "";
        attempts = [];
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 5; j++) {
                const tile = document.createElement("div");
                tile.className = "tile";
                wordleGrid.appendChild(tile);
            }
        }
    }

    submitWordleButton.addEventListener("click", () => {
        const guess = wordleInput.value.toUpperCase();
        if (guess.length !== 5) {
            wordleFeedback.textContent = "Please enter a 5-letter word.";
            return;
        }

        if (attempts.length >= 6) {
            wordleFeedback.textContent = "Game over! Reload to try again.";
            return;
        }

        const currentRow = attempts.length;
        const tiles = Array.from(wordleGrid.children).slice(currentRow * 5, currentRow * 5 + 5);

        const targetLetters = targetWord.split(""); // Split target word into an array
        const guessedLetters = guess.split(""); // Split guess into an array

        // First pass: Check for correct letters in the right position (green)
        guessedLetters.forEach((letter, index) => {
            if (letter === targetLetters[index]) {
                tiles[index].textContent = letter;
                tiles[index].classList.add("correct");
                targetLetters[index] = null; // Mark letter as used
                guessedLetters[index] = null; // Prevent further processing
            }
        });

        // Second pass: Check for correct letters in the wrong position (yellow)
        guessedLetters.forEach((letter, index) => {
            if (letter && targetLetters.includes(letter)) {
                const targetIndex = targetLetters.indexOf(letter);
                tiles[index].textContent = letter;
                tiles[index].classList.add("present");
                targetLetters[targetIndex] = null; // Mark letter as used
            } else if (letter) {
                tiles[index].textContent = letter;
                tiles[index].classList.add("absent");
            }
        });

        attempts.push(guess);

        if (guess === targetWord) {
            wordleFeedback.textContent = "Congratulations! You guessed it!";
        } else if (attempts.length === 6) {
            wordleFeedback.textContent = `Game over! The word was ${targetWord}.`;
        }

        wordleInput.value = "";
    });

    initializeWordle();
}
