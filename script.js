/**
 * Modern To-Do List Application
 * Features: CRUD, Local Storage, Drag & Drop, Search/Filter, Dark Mode, CSV Export
 */

// State Management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const todoForm = document.getElementById('todo-form');
const taskInput = document.getElementById('task-input');
const priorityInput = document.getElementById('priority-input');
const dateInput = document.getElementById('date-input');
const pendingList = document.getElementById('pending-list');
const completedList = document.getElementById('completed-list');
const pendingCount = document.getElementById('pending-count');
const completedCount = document.getElementById('completed-count');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const exportBtn = document.getElementById('export-btn');
const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    initTheme();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
});

// --- Core Functions ---

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function addTask(e) {
    e.preventDefault();
    
    const taskText = taskInput.value.trim();
    if (!taskText) return;

    const newTask = {
        id: Date.now().toString(),
        text: taskText,
        priority: priorityInput.value,
        dueDate: dateInput.value || 'No date',
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    todoForm.reset();
    showToast('Task added successfully!', 'success');
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
    showToast('Task deleted', 'danger');
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
    const task = tasks.find(t => t.id === id);
    showToast(task.completed ? 'Task completed!' : 'Task moved to pending', 'success');
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    const newText = prompt('Edit task:', task.text);
    
    if (newText !== null && newText.trim() !== '') {
        tasks = tasks.map(t => {
            if (t.id === id) {
                return { ...t, text: newText.trim() };
            }
            return t;
        });
        saveTasks();
        renderTasks();
        showToast('Task updated', 'success');
    }
}

// --- UI Rendering ---

function renderTasks() {
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = 
            currentFilter === 'all' || 
            (currentFilter === 'pending' && !task.completed) || 
            (currentFilter === 'completed' && task.completed);
        return matchesSearch && matchesFilter;
    });

    const pending = filteredTasks.filter(t => !t.completed);
    const completed = filteredTasks.filter(t => t.completed);

    pendingList.innerHTML = '';
    completedList.innerHTML = '';

    pending.forEach(task => pendingList.appendChild(createTaskElement(task)));
    completed.forEach(task => completedList.appendChild(createTaskElement(task)));

    pendingCount.textContent = pending.length;
    completedCount.textContent = completed.length;

    initDragAndDrop();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `todo-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('draggable', 'true');
    li.setAttribute('data-id', task.id);

    li.innerHTML = `
        <div class="checkbox-container ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
            <i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
        </div>
        <div class="task-content">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                <span class="due-date"><i class="far fa-calendar-alt"></i> ${task.dueDate}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="action-btn edit-btn" onclick="editTask('${task.id}')" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return li;
}

// --- Features ---

// Theme Toggle
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Search & Filter
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTasks();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderTasks();
    });
});

// Drag and Drop
function initDragAndDrop() {
    const items = document.querySelectorAll('.todo-item');
    let dragSrcEl = null;

    items.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            dragSrcEl = this;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            items.forEach(i => i.classList.remove('over'));
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            return false;
        });

        item.addEventListener('dragenter', function() {
            this.classList.add('over');
        });

        item.addEventListener('dragleave', function() {
            this.classList.remove('over');
        });

        item.addEventListener('drop', function(e) {
            e.stopPropagation();
            if (dragSrcEl !== this) {
                const fromId = dragSrcEl.getAttribute('data-id');
                const toId = this.getAttribute('data-id');
                reorderTasks(fromId, toId);
            }
            return false;
        });
    });
}

function reorderTasks(fromId, toId) {
    const fromIndex = tasks.findIndex(t => t.id === fromId);
    const toIndex = tasks.findIndex(t => t.id === toId);
    
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);
    
    saveTasks();
    renderTasks();
}

// CSV Export
exportBtn.addEventListener('click', () => {
    if (tasks.length === 0) {
        showToast('No tasks to export', 'danger');
        return;
    }

    const headers = ['Task', 'Priority', 'Due Date', 'Status', 'Created At'];
    const csvContent = [
        headers.join(','),
        ...tasks.map(t => [
            `"${t.text.replace(/"/g, '""')}"`,
            t.priority,
            t.dueDate,
            t.completed ? 'Completed' : 'Pending',
            t.createdAt
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `todo-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exporting CSV...', 'success');
});

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Helpers
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
todoForm.addEventListener('submit', addTask);
