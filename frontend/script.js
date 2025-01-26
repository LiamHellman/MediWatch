document.addEventListener("DOMContentLoaded", () => {
    // Dark mode toggle
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

    // Initialize UI elements and start updates
    updateQueue();
    loadTrivia();
    setInterval(updateQueue, 30000);
    document.getElementById("next-trivia").addEventListener("click", loadTrivia);
});

async function updateQueue() {
    try {
        const response = await fetch('http://localhost:3000/api/v1/queue');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateQueueUI(data);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("queue-list").innerHTML = '<li class="error">Error loading queue data</li>';
    }
}

function updateQueueUI(data) {
    const queueList = document.getElementById("queue-list");
    const waitTimeEl = document.getElementById("wait-time");
    const userCategory = 3; // URGENT (Yellow)
    
    // Update waiting count and time
    document.getElementById("total-waiting").textContent = data.waitingCount;
    document.getElementById("longest-wait").textContent = `${data.longestWaitTime} min`;
    
    // Filter and display patients
    const relevantPatients = data.patients.filter(p => p.triage_category === userCategory);
    
    queueList.innerHTML = relevantPatients.map(patient => `
        <li class="queue-item">
            <div class="patient-info">
                <span class="patient-id">Patient ${patient.id}</span>
                <span class="wait-time">${patient.time_elapsed} min wait</span>
            </div>
            <div class="patient-status">
                Status: ${patient.status.current_phase}
            </div>
        </li>
    `).join('');
    
    // Update average wait time
    const avgWait = relevantPatients.reduce((sum, p) => sum + p.time_elapsed, 0) / relevantPatients.length;
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