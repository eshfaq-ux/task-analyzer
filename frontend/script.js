const API_BASE = 'http://127.0.0.1:8000/api';
let tasks = [];
let editingTaskId = null;

// DOM elements
const taskForm = document.getElementById('taskForm');
const jsonInput = document.getElementById('jsonInput');
const loadJsonBtn = document.getElementById('loadJsonBtn');
const replaceJsonBtn = document.getElementById('replaceJsonBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const strategySelect = document.getElementById('strategy');
const analyzeBtn = document.getElementById('analyzeBtn');
const suggestBtn = document.getElementById('suggestBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');

// New elements
const addTaskBtn = document.getElementById('addTaskBtn');
const updateTaskBtn = document.getElementById('updateTaskBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
        
        // Populate matrix when switching to it
        if (view === 'matrix') {
            populateEisenhowerMatrix();
        }
    });
});

function switchView(viewName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    
    // Update views
    document.querySelectorAll('.view-content').forEach(content => {
        content.classList.toggle('active', content.id === `${viewName}-view`);
    });
}

// Persistent storage using database
async function saveTasks() {
    // Save each task to database
    for (const task of tasks) {
        try {
            await fetch(`${API_BASE}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(task)
            });
        } catch (error) {
            console.error('Error saving task:', error);
        }
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks/`);
        if (response.ok) {
            const data = await response.json();
            tasks = data.tasks || [];
            updateTaskList();
            updateTaskCount();
            console.log(`Loaded ${tasks.length} tasks from database`);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = [];
    }
}

async function deleteTaskFromDB(taskId) {
    try {
        await fetch(`${API_BASE}/tasks/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: taskId })
        });
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// Form submission
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmission();
});

// Update button click
updateTaskBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleFormSubmission();
});

async function handleFormSubmission() {
    const taskId = document.getElementById('taskId').value.trim();
    const taskTitle = document.getElementById('taskTitle').value.trim();
    
    if (!taskId || !taskTitle) {
        showError('Task ID and Title are required');
        return;
    }
    
    // Check for duplicate IDs (except when editing)
    if (!editingTaskId && tasks.some(task => task.id === taskId)) {
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
    
    if (editingTaskId) {
        // Update existing task
        const index = tasks.findIndex(t => t.id === editingTaskId);
        if (index !== -1) {
            tasks[index] = task;
            showSuccessMessage(`Task "${taskTitle}" updated successfully!`);
        }
        cancelEdit();
    } else {
        // Add new task
        tasks.push(task);
        showSuccessMessage(`Task "${taskTitle}" added successfully!`);
    }
    
    taskForm.reset();
    updateTaskList();
    updateTaskCount();
    await saveTasks();
    hideError();
}

// Edit task
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    
    // Switch to analyzer view
    switchView('analyzer');
    
    // Populate form
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDueDate').value = task.due_date || '';
    document.getElementById('taskHours').value = task.estimated_hours || '';
    document.getElementById('taskImportance').value = task.importance || '';
    document.getElementById('taskDependencies').value = task.dependencies.join(', ');
    
    // Update form buttons
    addTaskBtn.classList.add('hidden');
    updateTaskBtn.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');
    
    showSuccessMessage(`Editing task "${task.title}"`);
}

function cancelEdit() {
    editingTaskId = null;
    taskForm.reset();
    
    // Reset form buttons
    addTaskBtn.classList.remove('hidden');
    updateTaskBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', cancelEdit);

// Delete task
let taskToDelete = null;

function deleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    taskToDelete = taskId;
    document.getElementById('deleteTaskTitle').textContent = task.title;
    document.getElementById('deleteTaskId').textContent = `ID: ${task.id}`;
    
    deleteModal.classList.remove('hidden');
}

confirmDeleteBtn.addEventListener('click', async () => {
    if (taskToDelete) {
        const task = tasks.find(t => t.id === taskToDelete);
        tasks = tasks.filter(t => t.id !== taskToDelete);
        
        await deleteTaskFromDB(taskToDelete);
        
        updateTaskList();
        updateTaskCount();
        
        showSuccessMessage(`Task "${task.title}" deleted successfully!`);
        
        // Cancel edit if deleting the task being edited
        if (editingTaskId === taskToDelete) {
            cancelEdit();
        }
    }
    
    deleteModal.classList.add('hidden');
    taskToDelete = null;
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
    taskToDelete = null;
});

// Clear all tasks
clearAllBtn.addEventListener('click', async () => {
    if (tasks.length === 0) return;
    
    if (confirm(`Are you sure you want to delete all ${tasks.length} tasks? This cannot be undone.`)) {
        // Delete all from database
        for (const task of tasks) {
            await deleteTaskFromDB(task.id);
        }
        
        tasks = [];
        updateTaskList();
        updateTaskCount();
        cancelEdit();
        showSuccessMessage('All tasks cleared successfully!');
    }
});

// JSON operations - Merge tasks
loadJsonBtn.addEventListener('click', async () => {
    const jsonText = jsonInput.value.trim();
    if (!jsonText) {
        showError('Please enter JSON data');
        return;
    }
    
    try {
        const data = JSON.parse(jsonText);
        if (data.tasks && Array.isArray(data.tasks)) {
            // Merge: Add new tasks, skip duplicates
            let addedCount = 0;
            data.tasks.forEach(newTask => {
                if (!tasks.find(t => t.id === newTask.id)) {
                    tasks.push(newTask);
                    addedCount++;
                }
            });
            
            if (data.strategy) {
                strategySelect.value = data.strategy;
            }
            updateTaskList();
            updateTaskCount();
            await saveTasks();
            hideError();
            jsonInput.value = '';
            showSuccessMessage(`Merged ${addedCount} new tasks! (${data.tasks.length - addedCount} duplicates skipped)`);
        } else {
            showError('JSON must contain a "tasks" array');
        }
    } catch (e) {
        showError('Invalid JSON format');
    }
});

// JSON operations - Replace all tasks
replaceJsonBtn.addEventListener('click', async () => {
    const jsonText = jsonInput.value.trim();
    if (!jsonText) {
        showError('Please enter JSON data');
        return;
    }
    
    if (tasks.length > 0 && !confirm(`Replace all ${tasks.length} existing tasks?`)) {
        return;
    }
    
    try {
        const data = JSON.parse(jsonText);
        if (data.tasks && Array.isArray(data.tasks)) {
            // Delete all existing tasks from DB
            for (const task of tasks) {
                await deleteTaskFromDB(task.id);
            }
            
            // Replace with new tasks
            tasks = data.tasks;
            if (data.strategy) {
                strategySelect.value = data.strategy;
            }
            updateTaskList();
            updateTaskCount();
            await saveTasks();
            hideError();
            jsonInput.value = '';
            showSuccessMessage(`Replaced with ${data.tasks.length} tasks!`);
        } else {
            showError('JSON must contain a "tasks" array');
        }
    } catch (e) {
        showError('Invalid JSON format');
    }
});

exportJsonBtn.addEventListener('click', () => {
    if (tasks.length === 0) {
        showError('No tasks to export');
        return;
    }
    
    const exportData = {
        strategy: strategySelect.value,
        tasks: tasks
    };
    
    jsonInput.value = JSON.stringify(exportData, null, 2);
    showSuccessMessage(`Exported ${tasks.length} tasks to JSON!`);
});

// Update task list display
function updateTaskList() {
    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No tasks yet</h3>
                <p>Add tasks using the Task Analyzer to manage them here</p>
            </div>
        `;
        return;
    }
    
    taskList.innerHTML = tasks.map(task => `
        <div class="task-list-item">
            <div class="task-item-header">
                <div>
                    <div class="task-item-title">${task.title}</div>
                    <div class="task-item-id">${task.id}</div>
                </div>
                <div class="task-item-actions">
                    <button class="edit-btn" onclick="editTask('${task.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteTask('${task.id}')">Delete</button>
                </div>
            </div>
            <div class="task-item-details">
                <div class="task-item-detail">
                    <strong>Due:</strong> ${task.due_date || 'No date'}
                </div>
                <div class="task-item-detail">
                    <strong>Hours:</strong> ${task.estimated_hours || 'Not set'}
                </div>
                <div class="task-item-detail">
                    <strong>Importance:</strong> ${task.importance || 'Not set'}/10
                </div>
                <div class="task-item-detail">
                    <strong>Dependencies:</strong> ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}
                </div>
            </div>
        </div>
    `).join('');
}

function updateTaskCount() {
    taskCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} loaded`;
}

// API calls and display functions 
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

suggestBtn.addEventListener('click', async () => {
    await getSuggestions();
});

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
            showError(`Analysis failed: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        showError(`Network error: ${error.message}`);
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
            showError(`Suggestions failed: ${data.error || JSON.stringify(data)}`);
        }
    } catch (error) {
        showError(`Network error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Display functions
function displayResults(data) {
    const highCount = data.tasks.filter(t => t.priority === 'High').length;
    const mediumCount = data.tasks.filter(t => t.priority === 'Medium').length;
    
    results.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
            <h3>📊 Analysis Complete</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="text-align: center; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #60a5fa;">${data.strategy}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">Strategy</div>
                </div>
                <div style="text-align: center; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #60a5fa;">${data.tasks.length}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">Total Tasks</div>
                </div>
                <div style="text-align: center; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #f87171;">${highCount}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">High Priority</div>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: #94a3b8; text-align: center;">
                Analyzed at ${new Date(data.analyzed_at).toLocaleString()}
            </p>
        </div>
        
        ${data.tasks.map((task, index) => `
            <div class="task-card" style="animation-delay: ${index * 0.1}s; margin-bottom: 20px;">
                <div class="task-header" style="margin-bottom: 16px;">
                    <div class="task-title">
                        <span class="priority-dot ${task.priority.toLowerCase()}"></span>
                        <div>
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px;">RANK #${index + 1}</div>
                            <div style="font-size: 1.1rem; font-weight: 600;">${task.title}</div>
                        </div>
                    </div>
                    <div class="task-score">${task.score}</div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <div class="priority-badge priority-${task.priority.toLowerCase()}" style="display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 0.9rem; font-weight: 600;">
                        ${task.priority} Priority
                    </div>
                </div>
                
                <div class="task-explanation" style="padding: 16px; border-radius: 8px; margin-bottom: 16px; line-height: 1.8;">
                    <div style="font-weight: 600; color: #60a5fa; margin-bottom: 10px; font-size: 0.95rem;">💡 Reasoning</div>
                    <div style="color: #cbd5e1; font-size: 0.95rem;">${task.explanation.replace(/; /g, '<br>• ')}</div>
                </div>
                
                <div class="task-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div class="task-detail" style="padding: 10px; border-radius: 6px;">
                        <strong style="color: #94a3b8;">📅 Due:</strong> 
                        <span style="color: #e2e8f0; margin-left: 6px;">${formatDueDate(task.due_date)}</span>
                    </div>
                    <div class="task-detail" style="padding: 10px; border-radius: 6px;">
                        <strong style="color: #94a3b8;">⏱️ Hours:</strong> 
                        <span style="color: #e2e8f0; margin-left: 6px;">${task.estimated_hours || 'Not specified'}</span>
                    </div>
                    <div class="task-detail" style="padding: 10px; border-radius: 6px;">
                        <strong style="color: #94a3b8;">⭐ Impact:</strong> 
                        <span style="color: #e2e8f0; margin-left: 6px;">${task.importance || 'Not specified'}/10</span>
                    </div>
                    <div class="task-detail" style="padding: 10px; border-radius: 6px;">
                        <strong style="color: #94a3b8;">🔗 Dependencies:</strong> 
                        <span style="color: #e2e8f0; margin-left: 6px;">${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}</span>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function displaySuggestions(data) {
    const medals = ['🥇', '🥈', '🥉'];
    
    results.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
            <h3>💡 Top 3 Suggestions</h3>
            <p style="font-size: 0.85rem; color: #94a3b8; text-align: center; margin-top: 10px;">
                Generated at ${new Date(data.suggested_at).toLocaleString()}
            </p>
        </div>
        
        ${data.top.map((task, index) => `
            <div class="task-card" style="animation-delay: ${index * 0.2}s;">
                <div class="task-header">
                    <div class="task-title">
                        <span class="priority-dot ${task.priority.toLowerCase()}"></span>
                        <div>
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 2px;">${medals[index]} SUGGESTION ${index + 1}</div>
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

// Utility functions
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
    } else {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
        suggestBtn.disabled = false;
    }
}

function showError(message) {
    error.innerHTML = `❌ ${message}`;
    error.classList.remove('hidden');
    setTimeout(() => hideError(), 5000);
}

function hideError() {
    error.classList.add('hidden');
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    successDiv.textContent = `✅ ${message}`;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideUp 0.3s ease-out forwards';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Save strategy changes
strategySelect.addEventListener('change', saveTasks);

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure modal is hidden on page load
    if (deleteModal) {
        deleteModal.classList.add('hidden');
    }
    
    await loadTasks();
    console.log('🚀 Enhanced Task Analyzer loaded!');
});

// Eisenhower Matrix
function populateEisenhowerMatrix() {
    const q1 = document.getElementById('q1-tasks');
    const q2 = document.getElementById('q2-tasks');
    const q3 = document.getElementById('q3-tasks');
    const q4 = document.getElementById('q4-tasks');
    
    // Clear all quadrants
    [q1, q2, q3, q4].forEach(q => q.innerHTML = '');
    
    if (tasks.length === 0) {
        [q1, q2, q3, q4].forEach(q => {
            q.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No tasks</p>';
        });
        return;
    }
    
    tasks.forEach(task => {
        const isUrgent = task.due_date && calculateDaysLeft(task.due_date) <= 3;
        const isImportant = (task.importance || 5) >= 7;
        
        let quadrant;
        if (isUrgent && isImportant) quadrant = q1;
        else if (!isUrgent && isImportant) quadrant = q2;
        else if (isUrgent && !isImportant) quadrant = q3;
        else quadrant = q4;
        
        const taskEl = document.createElement('div');
        taskEl.className = 'matrix-task';
        taskEl.innerHTML = `
            <div class="matrix-task-title">${task.title}</div>
            <div class="matrix-task-meta">
                <span>📅 ${formatDueDate(task.due_date)}</span>
                <span>⭐ ${task.importance || 5}/10</span>
                <span>⏱️ ${task.estimated_hours || 0.5}h</span>
            </div>
        `;
        quadrant.appendChild(taskEl);
    });
    
    // Show "No tasks" for empty quadrants
    [q1, q2, q3, q4].forEach(q => {
        if (q.children.length === 0) {
            q.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No tasks</p>';
        }
    });
}

function calculateDaysLeft(dueDate) {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
}

// Make functions global for onclick handlers
window.editTask = editTask;
window.deleteTask = deleteTask;
