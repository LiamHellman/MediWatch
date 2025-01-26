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
});

let queueData = null;
let simulatedPatients = [];

function formatWaitTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

function getRandomWaitTime(category) {
    // REMOVE THE MULTIPLIER
    const waitRanges = {
        1: [10, 30],       // Resuscitation: 10-30 mins
        2: [30, 90],       // Emergent: 30-90 mins
        3: [90, 180],      // Urgent: 90-180 mins
        4: [180, 360],     // Less Urgent: 3-6 hours
        5: [360, 720]      // Non-Urgent: 6-12 hours
    };
    
    const [min, max] = waitRanges[category];
    return Math.floor(Math.random() * (max - min + 1) + min); // No multiplier
}

function processQueue() {
    if (!simulatedPatients.length) return;

    simulatedPatients.forEach(patient => {
        patient.time_elapsed += 1;
    });

    // Sort by arrival time (FIFO)
    simulatedPatients.sort((a, b) => a.time_elapsed - b.time_elapsed);

    // Check and remove ONLY the front patient if ready
    if (simulatedPatients[0] && simulatedPatients[0].time_elapsed >= simulatedPatients[0].targetWaitTime) {
        simulatedPatients.shift();
    }
    
    updateQueueUI();
    document.getElementById("total-waiting").textContent = simulatedPatients.length;
}

async function updateQueue() {
    try {
        const response = await fetch('http://localhost:3000/api/v1/queue');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        queueData = await response.json();
        simulatedPatients = queueData.patients;
        
        simulatedPatients.forEach(patient => {
            patient.targetWaitTime = getRandomWaitTime(patient.triage_category);
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
    const longestWait = Math.max(...simulatedPatients.map(p => p.time_elapsed));
    document.getElementById("estimated-time").textContent = formatWaitTime(longestWait);
    
    // Sort patients by wait time in descending order
    const sortedPatients = [...simulatedPatients].sort((a, b) => b.time_elapsed - a.time_elapsed);
    
    queueList.innerHTML = sortedPatients
        .map((patient, index) => `
            <li class="queue-item">
                <div class="position-number">${index + 1}</div>
                <div class="patient-info">
                    <span class="patient-id">Patient ${patient.id}</span>
                </div>
                <div class="wait-time">${formatWaitTime(patient.time_elapsed)}</div>
            </li>
        `).join('');
    
    const avgWait = simulatedPatients.length ? 
        simulatedPatients.reduce((sum, p) => sum + p.time_elapsed, 0) / simulatedPatients.length : 
        0;
    waitTimeEl.textContent = formatWaitTime(Math.round(avgWait));
}

async function loadTrivia() {
    const triviaQuestionElement = document.getElementById("trivia-question");

    try {
        const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
        if (!response.ok) throw new Error("Failed to fetch trivia");
        
        const data = await response.json();
        if (data.results?.length > 0) {
            triviaQuestionElement.textContent = decodeHTML(data.results[0].question);
        }
    } catch (error) {
        console.error("Error fetching trivia:", error);
        triviaQuestionElement.textContent = "Failed to load trivia. Please try again.";
    }
}

function decodeHTML(html) {
    const text = document.createElement("textarea");
    text.innerHTML = html;
    return text.value;
}