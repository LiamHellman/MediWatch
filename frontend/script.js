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
    setInterval(updateQueue, 30000);
    document.getElementById("next-trivia").addEventListener("click", loadTrivia);
});

let queueData = null;

async function updateQueue() {
    try {
        const response = await fetch('http://localhost:3000/api/v1/queue');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        queueData = await response.json();
        updateQueueUI();
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("queue-list").innerHTML = '<li class="error">Error loading queue data</li>';
    }
}

function updateQueueUI() {
    if (!queueData) return;
    
    const queueList = document.getElementById("queue-list");
    const waitTimeEl = document.getElementById("wait-time");
    const userCategory = 3; // URGENT (Yellow)
    
    document.getElementById("total-waiting").textContent = queueData.waitingCount;
    document.getElementById("estimated-time").textContent = "Calculating...";
    
    // Filter patients by category and calculate average wait time
    const allPatients = queueData.patients;
    const avgWait = allPatients.reduce((sum, p) => sum + p.time_elapsed, 0) / allPatients.length;
    
    queueList.innerHTML = allPatients
        .filter(p => p.triage_category === userCategory)
        .map((patient, index) => `
            <li class="queue-item">
                <div class="position-number">${index + 1}</div>
                <div class="patient-info">
                    <span class="patient-id">Patient ${patient.id}</span>
                </div>
                <div class="wait-time">${patient.time_elapsed} min</div>
            </li>
        `).join('');
    
    waitTimeEl.textContent = `${Math.round(avgWait)} minutes`;
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