document.addEventListener("DOMContentLoaded", () => {
    updateQueue();
    loadTrivia();
    setInterval(updateQueue, 30000);
    document.getElementById("next-trivia").addEventListener("click", loadTrivia);
});

async function updateQueue() {
    try {
        // Changed port from 5000 to 3000
        const response = await fetch('http://localhost:3000/api/v1/queue');
        console.log('Queue Response:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Queue Data:', data);
        
        // Changed port from 5000 to 3000
        const stats = await fetch('http://localhost:3000/api/v1/stats/current');
        const statsData = await stats.json();
        console.log('Stats Data:', statsData);

        updateUI(data, statsData);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("wait-time").textContent = "Error loading data";
    }
}

// Rest of the file remains unchanged
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
        if (!response.ok) {
            throw new Error("Failed to fetch trivia. HTTP status: " + response.status);
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const question = data.results[0].question;
            triviaQuestionElement.textContent = decodeHTML(question);
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