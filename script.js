/**
 * Smart Productivity Suite - Core Logic
 * Handles State, Reminders, Recurrence, and UI Updates
 */

class SmartTodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('smart_tasks')) || [];
        this.goals = JSON.parse(localStorage.getItem('smart_goals')) || [];
        this.currentView = 'today';
        this.currentFilter = 'all';
        this.searchQuery = '';
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.updateDateDisplay();
        this.render();
        this.setupReminders();
        this.checkRecurrence();
        this.requestNotificationPermission();
    }

    cacheDOM() {
        this.dom = {
            taskListPending: document.getElementById('pending-list'),
            taskListCompleted: document.getElementById('completed-list'),
            pendingCount: document.getElementById('pending-count'),
            progressCircle: document.getElementById('progress-circle'),
            progressText: document.getElementById('progress-text'),
            taskModal: document.getElementById('task-modal'),
            taskForm: document.getElementById('task-form'),
            addBtn: document.getElementById('add-task-trigger'),
            closeModals: document.querySelectorAll('.close-modal'),
            themeToggle: document.getElementById('theme-toggle'),
            navItems: document.querySelectorAll('.nav-item'),
            filterChips: document.querySelectorAll('.chip'),
            globalSearch: document.getElementById('global-search'),
            notificationBtn: document.getElementById('notification-btn'),
            dateDisplay: document.getElementById('current-date-display')
        };
    }

    bindEvents() {
        this.dom.addBtn.onclick = () => this.toggleModal(true);
        this.dom.closeModals.forEach(btn => btn.onclick = () => this.toggleModal(false));
        
        this.dom.taskForm.onsubmit = (e) => this.handleTaskSubmit(e);
        
        this.dom.themeToggle.onclick = () => this.toggleTheme();
        
        this.dom.navItems.forEach(item => {
            item.onclick = () => {
                this.dom.navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentView = item.dataset.view;
                this.render();
            };
        });

        this.dom.filterChips.forEach(chip => {
            chip.onclick = () => {
                this.dom.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentFilter = chip.dataset.filter;
                this.render();
            };
        });

        this.dom.globalSearch.oninput = (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        };

        this.dom.notificationBtn.onclick = () => this.requestNotificationPermission(true);
    }

    // --- Core Logic ---

    handleTaskSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.dom.taskForm);
        
        const newTask = {
            id: Date.now().toString(),
            title: document.getElementById('task-title').value,
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            priority: document.getElementById('task-priority').value,
            category: document.getElementById('task-category').value,
            repeat: document.getElementById('task-repeat').value,
            completed: false,
            createdAt: new Date().toISOString(),
            lastGenerated: new Date().toISOString().split('T')[0]
        };

        this.tasks.push(newTask);
        this.save();
        this.render();
        this.toggleModal(false);
        this.dom.taskForm.reset();
        this.showToast('Task created successfully!');
    }

    toggleTask(id) {
        this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        this.save();
        this.render();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
        this.render();
        this.showToast('Task deleted', 'error');
    }

    save() {
        localStorage.setItem('smart_tasks', JSON.stringify(this.tasks));
        this.updateProgress();
    }

    // --- UI Rendering ---

    render() {
        const filtered = this.tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(this.searchQuery);
            const matchesFilter = this.currentFilter === 'all' || t.category === this.currentFilter;
            
            // Date filtering logic
            const today = new Date().toISOString().split('T')[0];
            let matchesView = true;
            if (this.currentView === 'today') matchesView = t.date === today;
            
            return matchesSearch && matchesFilter && matchesView;
        });

        const pending = filtered.filter(t => !t.completed);
        const completed = filtered.filter(t => t.completed);

        this.dom.taskListPending.innerHTML = pending.map(t => this.createTaskHTML(t)).join('');
        this.dom.taskListCompleted.innerHTML = completed.map(t => this.createTaskHTML(t)).join('');
        
        this.dom.pendingCount.textContent = pending.length;
        this.updateProgress();
    }

    createTaskHTML(task) {
        return `
            <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-checkbox" onclick="app.toggleTask('${task.id}')">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-info">
                    <div class="task-title">${this.escape(task.title)}</div>
                    <div class="task-meta">
                        <span class="prio-tag prio-${task.priority}">${task.priority}</span>
                        <span><i class="far fa-clock"></i> ${task.time || 'No time'}</span>
                        <span><i class="fas fa-tag"></i> ${task.category}</span>
                        ${task.repeat !== 'none' ? '<span><i class="fas fa-redo"></i> ' + task.repeat + '</span>' : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-btn" onclick="app.deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `;
    }

    // --- Advanced Features ---

    setupReminders() {
        setInterval(() => {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            const currentDate = now.toISOString().split('T')[0];

            this.tasks.forEach(t => {
                if (!t.completed && t.date === currentDate && t.time === currentTime) {
                    this.notifyUser(`Reminder: ${t.title}`, { body: `It's time for your task!` });
                }
            });
        }, 60000); // Check every minute
    }

    checkRecurrence() {
        const today = new Date().toISOString().split('T')[0];
        let updated = false;

        this.tasks.forEach(t => {
            if (t.repeat !== 'none' && t.lastGenerated !== today) {
                // Simple logic: if it's a new day and task is daily, reset or clone
                // For this MVP, we'll just update the date to today if it's daily
                if (t.repeat === 'daily') {
                    t.date = today;
                    t.completed = false;
                    t.lastGenerated = today;
                    updated = true;
                }
            }
        });

        if (updated) this.save();
    }

    updateProgress() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.tasks.filter(t => t.date === today);
        const completed = todayTasks.filter(t => t.completed).length;
        const total = todayTasks.length;
        
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        if (this.dom.progressCircle) {
            this.dom.progressCircle.setAttribute('stroke-dasharray', `${percent}, 100`);
            this.dom.progressText.textContent = `${percent}%`;
        }
    }

    // --- Utilities ---

    toggleModal(show) {
        this.dom.taskModal.classList.toggle('active', show);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        this.dom.themeToggle.querySelector('i').className = next === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    updateDateDisplay() {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        this.dom.dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    requestNotificationPermission(manual = false) {
        if (!("Notification" in window)) return;
        
        if (Notification.permission !== "granted") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted" && manual) {
                    this.showToast("Notifications enabled!");
                }
            });
        } else if (manual) {
            this.showToast("Notifications already enabled");
        }
    }

    notifyUser(title, options) {
        if (Notification.permission === "granted") {
            new Notification(title, options);
        }
    }

    showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize App
const app = new SmartTodoApp();
