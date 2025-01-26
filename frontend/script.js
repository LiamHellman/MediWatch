document.addEventListener("DOMContentLoaded", () => {
    // Dark mode toggle (from first file)
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const currentMode = localStorage.getItem("darkMode");

    // Set initial mode and icon
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

    // Initialize UI elements
    document.getElementById("triage-level").textContent = "Yellow";
    
    // Queue and trivia setup (combined from both files)
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
        const stats = await fetch('http://localhost:3000/api/v1/stats/current').then(r => r.json());
        
        updateUI(data, stats);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("wait-time").textContent = "Error loading data";
    }
}

function updateUI(data, stats) {
    const userCategory = 3; // URGENT (Yellow)
    const waitTime = stats.averageWaitTimes[userCategory];
    document.getElementById("wait-time").textContent = `${waitTime} minutes`;

    const queueList = document.getElementById("queue-list");
    queueList.innerHTML = "";
    
    data.patients
        .filter(p => p.triage_category === userCategory)
        .forEach(patient => {
            const li = document.createElement("li");
            li.textContent = `Patient ${patient.id} (${patient.status.current_phase}) - Waiting ${patient.time_elapsed} min`;
            queueList.appendChild(li);
        });
}

async function loadTrivia() {
    const triviaQuestionElement = document.getElementById("trivia-question");

    try {
        const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
        if (!response.ok) throw new Error("Failed to fetch trivia. HTTP status: " + response.status);

        const data = await response.json();
        if (data.results?.length > 0) {
            triviaQuestionElement.textContent = decodeHTML(data.results[0].question);
        } else {
            throw new Error("Trivia API returned no results.");
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