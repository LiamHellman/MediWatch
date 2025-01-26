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
    if (minutes < 0) return "0 min"; // Show 0 instead of negative
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

function generateIncrementalWaitTimes(patients) {
    const waitRanges = {
        1: [10, 30],       // Resuscitation
        2: [30, 90],       // Emergent
        3: [90, 180],      // Urgent
        4: [180, 360],     // Less Urgent
        5: [360, 720]      // Non-Urgent
    };

    // Sort patients by triage (ascending) and arrival time (FIFO)
    patients.sort((a, b) => {
        if (a.triage_category !== b.triage_category) {
            return a.triage_category - b.triage_category; // Higher priority first
        }
        return new Date(a.arrival_time) - new Date(b.arrival_time); // Earlier arrivals first
    });

    let cumulativeTime = 0;
    
    patients.forEach(patient => {
        const [min, max] = waitRanges[patient.triage_category];
        // First patient in queue: random time within category
        // Subsequent patients: previous cumulative time + new increment
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

    // Sort by remaining time (patients closest to 0 first)
    simulatedPatients.sort((a, b) => {
        const aRemaining = a.targetWaitTime - a.time_elapsed;
        const bRemaining = b.targetWaitTime - b.time_elapsed;
        return aRemaining - bRemaining;
    });

    // Remove all eligible patients (remaining time <= 0)
    const remainingPatients = simulatedPatients.filter(
        patient => patient.time_elapsed < patient.targetWaitTime
    );
    simulatedPatients = remainingPatients;

    updateQueueUI();
    document.getElementById("total-waiting").textContent = simulatedPatients.length;
}

async function updateQueue() {
    try {
        const response = await fetch('http://localhost:3000/api/v1/queue');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        queueData = await response.json();
        simulatedPatients = queueData.patients;
        
        // Reset timers and generate staggered targetWaitTime
        simulatedPatients = generateIncrementalWaitTimes(simulatedPatients);
        simulatedPatients.forEach(patient => {
            patient.time_elapsed = 0; // Start fresh
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
    
    // Sort patients by remaining time (ascending)
    const sortedPatients = [...simulatedPatients].sort((a, b) => {
        const aRemaining = a.targetWaitTime - a.time_elapsed;
        const bRemaining = b.targetWaitTime - b.time_elapsed;
        return aRemaining - bRemaining; // Least time left first
    });
    
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
        console.log('Attempting to delete patient:', id);
        const response = await fetch(`http://localhost:3000/api/v1/patient/${id}`, {
            method: 'DELETE'
        });
        console.log('Delete response:', response);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await updateQueue(); // Refresh the queue after deletion
    } catch (error) {
        console.error("Error deleting patient:", error);
    }
}

async function loadTrivia() {
    const triviaQuestionElement = document.getElementById("trivia-question");

    try {
        // Fetch a random trivia fact
        const response = await fetch("http://numbersapi.com/random/trivia");
        if (!response.ok) throw new Error("Failed to fetch fun fact");

        const fact = await response.text(); // Get plain text response
        triviaQuestionElement.textContent = fact; // Display the fact
    } catch (error) {
        console.error("Error fetching fun fact:", error);
        triviaQuestionElement.textContent = "Failed to load fun fact. Please try again.";
    }
}

function decodeHTML(html) {
    const text = document.createElement("textarea");
    text.innerHTML = html;
    return text.value;
}