const API_BASE = 'http://127.0.0.1:8000/api';
let currentTasks = [];

// DOM elements
const taskForm = document.getElementById('taskForm');
const jsonInput = document.getElementById('jsonInput');
const strategySelect = document.getElementById('strategy');
const analyzeBtn = document.getElementById('analyzeBtn');
const suggestBtn = document.getElementById('suggestBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

// Form handling
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const task = {
        id: document.getElementById('taskId').value,
        title: document.getElementById('taskTitle').value,
        due_date: document.getElementById('taskDueDate').value || null,
        estimated_hours: parseFloat(document.getElementById('taskHours').value) || null,
        importance: parseInt(document.getElementById('taskImportance').value) || null,
        dependencies: document.getElementById('taskDependencies').value
            .split(',')
            .map(dep => dep.trim())
            .filter(dep => dep.length > 0)
    };
    
    if (!task.id || !task.title) {
        showError('Task ID and Title are required');
        return;
    }
    
    currentTasks.push(task);
    updateTaskCount();
    taskForm.reset();
});

// Analyze button
analyzeBtn.addEventListener('click', async () => {
    let tasksToAnalyze = currentTasks;
    
    // Check if JSON input has content
    if (jsonInput.value.trim()) {
        try {
            const jsonData = JSON.parse(jsonInput.value);
            if (jsonData.tasks) {
                tasksToAnalyze = jsonData.tasks;
            }
        } catch (e) {
            showError('Invalid JSON format');
            return;
        }
    }
    
    if (tasksToAnalyze.length === 0) {
        showError('No tasks to analyze');
        return;
    }
    
    const payload = {
        strategy: strategySelect.value,
        tasks: tasksToAnalyze
    };
    
    await analyzeTasks(payload);
});

// Suggest button
suggestBtn.addEventListener('click', async () => {
    await getSuggestions();
});

// API calls
async function analyzeTasks(payload) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/tasks/analyze/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data);
        } else {
            showError('Analysis failed: ' + JSON.stringify(data));
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function getSuggestions() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/tasks/suggest/`);
        const data = await response.json();
        
        if (response.ok) {
            displaySuggestions(data);
        } else {
            showError('Suggestions failed: ' + JSON.stringify(data));
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Display functions
function displayResults(data) {
    results.innerHTML = `
        <h3>Analysis Results</h3>
        <p><strong>Strategy:</strong> ${data.strategy}</p>
        <p><strong>Analyzed at:</strong> ${new Date(data.analyzed_at).toLocaleString()}</p>
        <div class="tasks-list">
            ${data.tasks.map(task => `
                <div class="task-item">
                    <div class="task-header">
                        <div class="task-title">
                            <span class="priority-dot priority-${task.priority.toLowerCase()}"></span>
                            ${task.title}
                        </div>
                        <div class="task-score">${task.score}</div>
                    </div>
                    <div class="task-details">
                        <p><strong>Priority:</strong> ${task.priority}</p>
                        <p><strong>Due:</strong> ${task.due_date || 'No due date'}</p>
                        <p><strong>Hours:</strong> ${task.estimated_hours}</p>
                        <p><strong>Importance:</strong> ${task.importance}/10</p>
                        <p><strong>Dependencies:</strong> ${task.dependencies.join(', ') || 'None'}</p>
                    </div>
                    <div class="task-explanation">${task.explanation}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function displaySuggestions(data) {
    results.innerHTML = `
        <h3>Top Suggestions</h3>
        <p><strong>Suggested at:</strong> ${new Date(data.suggested_at).toLocaleString()}</p>
        <div class="suggestions-list">
            ${data.top.map((task, index) => `
                <div class="task-item">
                    <div class="task-header">
                        <div class="task-title">
                            <span class="priority-dot priority-${task.priority.toLowerCase()}"></span>
                            #${index + 1} - Task ${task.id}
                        </div>
                        <div class="task-score">${task.score}</div>
                    </div>
                    <div class="task-explanation">${task.why}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function showError(message) {
    results.innerHTML = `<div class="error">${message}</div>`;
}

function showLoading(show) {
    loading.classList.toggle('hidden', !show);
}

function updateTaskCount() {
    if (currentTasks.length > 0) {
        jsonInput.placeholder = `${currentTasks.length} tasks added via form. You can also paste JSON here.`;
    }
}
