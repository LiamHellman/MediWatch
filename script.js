document.addEventListener("DOMContentLoaded", () => {
    const mockPatients = generateMockPatients();
    const triageLevel = "Yellow";

    loadQueueData(mockPatients, triageLevel);
    loadTrivia();

    // Dark mode toggle
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const currentMode = localStorage.getItem("darkMode");

    // Set initial icon based on current mode
    if (currentMode === "enabled") {
        document.body.classList.add("dark-mode");
        darkModeToggle.textContent = "☀️"; // Sun icon for light mode
    } else {
        darkModeToggle.textContent = "🌙"; // Moon/star icon for dark mode
    }

    darkModeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const mode = document.body.classList.contains("dark-mode") ? "enabled" : "disabled";
        localStorage.setItem("darkMode", mode);

        // Update the icon
        darkModeToggle.textContent = mode === "enabled" ? "☀️" : "🌙";
    });

    document.getElementById("next-trivia").addEventListener("click", loadTrivia);
});

function generateMockPatients() {
    const names = ["John Doe", "Jane Smith", "Alice Brown", "Bob Johnson", "Clara White"];
    const phases = ["Waiting", "Initial Assessment", "Investigation", "Treatment"];
    const triageLevels = ["Blue", "Red", "Yellow", "Green", "White"];
    const patients = [];

    for (let i = 0; i < 20; i++) {
        const patient = {
            name: names[Math.floor(Math.random() * names.length)],
            triageCategory: triageLevels[Math.floor(Math.random() * triageLevels.length)],
            phase: phases[Math.floor(Math.random() * phases.length)],
            estimatedWait: Math.floor(Math.random() * 60) + 5,
        };
        patients.push(patient);
    }

    return patients;
}

function loadQueueData(mockPatients, triageLevel) {
    document.getElementById("triage-level").textContent = triageLevel;

    const yourQueue = mockPatients.filter(
        (patient) => patient.triageCategory === triageLevel
    );

    const totalWait = yourQueue.reduce((sum, patient) => sum + patient.estimatedWait, 0);
    const avgWait = yourQueue.length > 0 ? totalWait / yourQueue.length : 0;
    document.getElementById("wait-time").textContent = `${Math.ceil(avgWait)} minutes`;

    const queueList = document.getElementById("queue-list");
    queueList.innerHTML = "";
    yourQueue.forEach((patient) => {
        const li = document.createElement("li");
        li.textContent = `${patient.name} (${patient.phase}) - Waiting ${patient.estimatedWait} min`;
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
