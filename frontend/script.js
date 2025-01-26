document.addEventListener("DOMContentLoaded", () => {
    // Dark mode handling remains the same
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

    // Initialize and start updates
    updateQueue();
    loadTrivia();
    setInterval(updateEtas, 1000); // Update ETAs every second
    setInterval(updateQueue, 30000); // Refresh full queue every 30 seconds
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

function updateEtas() {
    if (!queueData) return;

    // Decrease ETAs by 1
    queueData.patients = queueData.patients.map(patient => ({
        ...patient,
        eta: Math.max(0, patient.eta - 1)
    }));

    // Handle patients with 0 ETA
    queueData.patients.forEach(patient => {
        if (patient.eta === 0) {
            setTimeout(() => {
                // Remove patient
                queueData.patients = queueData.patients.filter(p => p.id !== patient.id);
                
                // Generate new patient with random ETA between 30-360 minutes
                const newPatient = {
                    ...patient,
                    id: `anon_${Math.floor(Math.random() * 9000) + 1000}`,
                    eta: Math.floor(Math.random() * 330) + 30,
                    time_elapsed: 0
                };
                queueData.patients.push(newPatient);
                
                updateQueueUI();
            }, Math.random() * 1000 + 1000); // Random delay between 1-2 seconds
        }
    });

    updateQueueUI();
}

function updateQueueUI() {
    if (!queueData) return;
    
    const queueList = document.getElementById("queue-list");
    const waitTimeEl = document.getElementById("wait-time");
    const userCategory = 3; // URGENT (Yellow)
    
    document.getElementById("total-waiting").textContent = queueData.waitingCount;
    const maxEta = Math.max(...queueData.patients.map(p => p.eta || 0));
    document.getElementById("estimated-time").textContent = `${maxEta} min`;
    
    const relevantPatients = queueData.patients.filter(p => p.triage_category === userCategory);
    
    queueList.innerHTML = relevantPatients.map(patient => `
        <li class="queue-item">
            <div class="patient-info">
                <span class="patient-id">Patient ${patient.id}</span>
                <span class="wait-time">${patient.time_elapsed} min wait</span>
                <span class="eta">ETA: ${patient.eta} min</span>
            </div>
            <div class="patient-status">
                Status: ${patient.status.current_phase}
            </div>
        </li>
    `).join('');
    
    const avgWait = relevantPatients.reduce((sum, p) => sum + p.time_elapsed, 0) / relevantPatients.length;
    waitTimeEl.textContent = `${Math.round(avgWait)} minutes`;
}

// Trivia functions remain the same
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