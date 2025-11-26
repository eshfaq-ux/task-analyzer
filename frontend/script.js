const API_BASE = 'http://127.0.0.1:8000/api';
let tasks = [];

// DOM elements
const taskForm = document.getElementById('taskForm');
const jsonInput = document.getElementById('jsonInput');
const loadJsonBtn = document.getElementById('loadJsonBtn');
const strategySelect = document.getElementById('strategy');
const analyzeBtn = document.getElementById('analyzeBtn');
const suggestBtn = document.getElementById('suggestBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');

// Form submission with animation
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const taskId = document.getElementById('taskId').value.trim();
    const taskTitle = document.getElementById('taskTitle').value.trim();
    
    if (!taskId || !taskTitle) {
        showError('Task ID and Title are required');
        return;
    }
    
    if (tasks.some(task => task.id === taskId)) {
        showError('Task ID already exists');
        return;
    }
    
    const task = {
        id: taskId,
        title: taskTitle,
        due_date: document.getElementById('taskDueDate').value || null,
        estimated_hours: parseFloat(document.getElementById('taskHours').value) || null,
        importance: parseInt(document.getElementById('taskImportance').value) || null,
        dependencies: document.getElementById('taskDependencies').value
            .split(',')
            .map(dep => dep.trim())
            .filter(dep => dep.length > 0)
    };
    
    tasks.push(task);
    updateTaskCount();
    taskForm.reset();
    hideError();
    
    // Add success animation
    showSuccessMessage(`Task "${taskTitle}" added successfully!`);
});

// Load JSON button with animation
loadJsonBtn.addEventListener('click', () => {
    const jsonText = jsonInput.value.trim();
    if (!jsonText) {
        showError('Please enter JSON data');
        return;
    }
    
    try {
        const data = JSON.parse(jsonText);
        if (data.tasks && Array.isArray(data.tasks)) {
            tasks = data.tasks;
            if (data.strategy) {
                strategySelect.value = data.strategy;
            }
            updateTaskCount();
            hideError();
            jsonInput.value = '';
            showSuccessMessage(`Loaded ${data.tasks.length} tasks from JSON!`);
        } else {
            showError('JSON must contain a "tasks" array');
        }
    } catch (e) {
        showError('Invalid JSON format');
    }
});

// Analyze button with enhanced loading
analyzeBtn.addEventListener('click', async () => {
    if (tasks.length === 0) {
        showError('No tasks to analyze. Add tasks first.');
        return;
    }
    
    const payload = {
        strategy: strategySelect.value,
        tasks: tasks
    };
    
    await analyzeTasks(payload);
});

// Suggest button
suggestBtn.addEventListener('click', async () => {
    await getSuggestions();
});

// Enhanced API calls with better loading states
async function analyzeTasks(payload) {
    showLoading(true, `Analyzing ${payload.tasks.length} tasks with ${payload.strategy}...`);
    hideError();
    
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
            showSuccessMessage(`Successfully analyzed ${data.tasks.length} tasks!`);
        } else {
            showError('Analysis failed: ' + (data.error || JSON.stringify(data)));
        }
    } catch (err) {
        showError('Network error: ' + err.message);
    } finally {
        showLoading(false);
    }
}

async function getSuggestions() {
    showLoading(true, 'Getting your top 3 suggestions...');
    hideError();
    
    try {
        const response = await fetch(`${API_BASE}/tasks/suggest/`);
        const data = await response.json();
        
        if (response.ok) {
            displaySuggestions(data);
            showSuccessMessage('Top suggestions generated!');
        } else {
            showError('Suggestions failed: ' + (data.error || JSON.stringify(data)));
        }
    } catch (err) {
        showError('Network error: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// Enhanced display functions with staggered animations
function displayResults(data) {
    const highCount = data.tasks.filter(t => t.priority === 'High').length;
    const mediumCount = data.tasks.filter(t => t.priority === 'Medium').length;
    const lowCount = data.tasks.filter(t => t.priority === 'Low').length;
    
    results.innerHTML = `
        <div class="card" style="animation: slideInRight 0.6s ease-out;">
            <h3>📊 Analysis Complete</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="text-align: center; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${data.strategy}</div>
                    <div style="font-size: 0.8rem; color: #6c757d;">Strategy</div>
                </div>
                <div style="text-align: center; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${data.tasks.length}</div>
                    <div style="font-size: 0.8rem; color: #6c757d;">Total Tasks</div>
                </div>
                <div style="text-align: center; padding: 10px; background: rgba(255, 107, 107, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #ff6b6b;">${highCount}</div>
                    <div style="font-size: 0.8rem; color: #6c757d;">High Priority</div>
                </div>
                <div style="text-align: center; padding: 10px; background: rgba(255, 167, 38, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #ffa726;">${mediumCount}</div>
                    <div style="font-size: 0.8rem; color: #6c757d;">Medium Priority</div>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: #6c757d; text-align: center;">
                Analyzed at ${new Date(data.analyzed_at).toLocaleString()}
            </p>
        </div>
        
        ${data.tasks.map((task, index) => `
            <div class="task-card" style="animation-delay: ${index * 0.1}s;">
                <div class="task-header">
                    <div class="task-title">
                        <span class="priority-dot ${task.priority.toLowerCase()}"></span>
                        <div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-bottom: 2px;">🏆 RANK #${index + 1}</div>
                            <div>${task.title}</div>
                        </div>
                    </div>
                    <div class="task-score">${task.score}</div>
                </div>
                
                <div class="priority-badge priority-${task.priority.toLowerCase()}">
                    ${task.priority} Priority
                </div>
                
                <div class="task-explanation">
                    💡 ${task.explanation}
                </div>
                
                <div class="task-details">
                    <div class="task-detail">
                        <strong>📅 Due:</strong> ${formatDueDate(task.due_date)}
                    </div>
                    <div class="task-detail">
                        <strong>⏱️ Hours:</strong> ${task.estimated_hours || 'Not specified'}
                    </div>
                    <div class="task-detail">
                        <strong>⭐ Impact:</strong> ${task.importance || 'Not specified'}/10
                    </div>
                    <div class="task-detail">
                        <strong>🔗 Dependencies:</strong> ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function displaySuggestions(data) {
    const medals = ['🥇', '🥈', '🥉'];
    
    results.innerHTML = `
        <div class="card" style="animation: slideInRight 0.6s ease-out;">
            <h3>💡 Top 3 Suggestions</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding: 15px; background: rgba(102, 126, 234, 0.1); border-radius: 8px;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 600; color: #667eea;">🎯 Recommended Actions</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">Start with these high-impact tasks</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${data.top.length}</div>
                    <div style="font-size: 0.8rem; color: #6c757d;">Suggestions</div>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: #6c757d; text-align: center;">
                Generated at ${new Date(data.suggested_at).toLocaleString()}
            </p>
        </div>
        
        ${data.top.map((task, index) => `
            <div class="task-card" style="animation-delay: ${index * 0.2}s;">
                <div class="task-header">
                    <div class="task-title">
                        <span class="priority-dot ${task.priority.toLowerCase()}"></span>
                        <div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-bottom: 2px;">${medals[index]} SUGGESTION ${index + 1}</div>
                            <div>Task ${task.id}</div>
                        </div>
                    </div>
                    <div class="task-score">${task.score}</div>
                </div>
                
                <div class="priority-badge priority-${task.priority.toLowerCase()}">
                    ${task.priority} Priority
                </div>
                
                <div class="task-explanation">
                    <strong>🤔 Why this task:</strong> ${task.why}
                </div>
            </div>
        `).join('')}
    `;
}

// Enhanced utility functions
function formatDueDate(dateStr) {
    if (!dateStr) return 'No deadline';
    
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `⚠️ ${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return '🔥 Due today';
    if (diffDays === 1) return '⏰ Due tomorrow';
    if (diffDays <= 7) return `📅 ${diffDays} days left`;
    return date.toLocaleDateString();
}

function showLoading(show, message = 'Processing...') {
    if (show) {
        loading.innerHTML = `
            <div class="spinner"></div>
            <p>${message}</p>
        `;
        loading.classList.remove('hidden');
        analyzeBtn.disabled = true;
        suggestBtn.disabled = true;
        analyzeBtn.style.opacity = '0.6';
        suggestBtn.style.opacity = '0.6';
    } else {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
        suggestBtn.disabled = false;
        analyzeBtn.style.opacity = '1';
        suggestBtn.style.opacity = '1';
    }
}

function showError(message) {
    error.innerHTML = `❌ ${message}`;
    error.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    error.classList.add('hidden');
}

function showSuccessMessage(message) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(102, 187, 106, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    successDiv.textContent = `✅ ${message}`;
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.style.animation = 'slideUp 0.3s ease-out forwards';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

function updateTaskCount() {
    const existingCount = document.querySelector('.task-count');
    if (existingCount) {
        existingCount.remove();
    }
    
    if (tasks.length > 0) {
        const countDiv = document.createElement('div');
        countDiv.className = 'task-count';
        countDiv.textContent = `🎯 ${tasks.length} tasks ready for analysis`;
        
        const card = document.querySelector('.card');
        card.parentNode.insertBefore(countDiv, card.nextSibling);
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        analyzeBtn.click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        suggestBtn.click();
    }
});

// Initialize
console.log('🚀 Smart Task Analyzer loaded with enhanced animations!');
