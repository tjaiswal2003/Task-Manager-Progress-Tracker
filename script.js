document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggle = document.getElementById('themeToggle');
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const deleteModal = document.getElementById('deleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Progress elements
    const overallProgressBar = document.getElementById('overallProgressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const workProgress = document.getElementById('workProgress');
    const personalProgress = document.getElementById('personalProgress');
    const healthProgress = document.getElementById('healthProgress');
    const highPriorityProgress = document.getElementById('highPriorityProgress');
    const mediumPriorityProgress = document.getElementById('mediumPriorityProgress');
    const lowPriorityProgress = document.getElementById('lowPriorityProgress');
    const motivationMessage = document.getElementById('motivationMessage');

    // State variables
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let taskToDelete = null;

    // --- Theme Functionality ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    };

    const updateThemeIcon = (theme) => {
        themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // --- Toast Notification ---
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    };
    
    // --- Task Rendering ---
    const renderTasks = () => {
        let filteredTasks = tasks;
        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }

        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        taskList.innerHTML = '';
        if (filteredTasks.length === 0) {
            taskList.appendChild(emptyState);
        } else {
            filteredTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                taskList.appendChild(taskElement);
            });
        }
        updateProgress();
    };
    
    const createTaskElement = (task) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.priority}-priority`;
        li.dataset.id = task.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const deadlineDate = task.deadline ? new Date(task.deadline + 'T00:00:00') : null;
        if (deadlineDate) deadlineDate.setHours(0,0,0,0);
        
        const isOverdue = deadlineDate && deadlineDate < today;
        const isDueToday = deadlineDate && deadlineDate.getTime() === today.getTime();

        if (task.completed) li.classList.add('completed');
        if (!task.completed && isOverdue) li.classList.add('overdue');
        if (!task.completed && isDueToday) li.classList.add('due-today');
        
        const deadlineInfo = task.deadline ? `
            <span class="task-deadline ${!task.completed && isOverdue ? 'text-danger' : ''}">
                <i class="fas fa-calendar-alt"></i> 
                ${formatDate(task.deadline)}
                ${!task.completed && isOverdue ? '(Overdue)' : ''}
                ${!task.completed && isDueToday ? '(Today)' : ''}
            </span>` : '';
        
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-title">
                    <span class="task-title-text">${task.title}</span>
                    <span class="task-category category-${task.category}">${task.category}</span>
                </div>
                <div class="task-meta">
                    ${deadlineInfo}
                    ${task.purpose ? `<span class="task-purpose"><i class="fas fa-bullseye"></i> ${task.purpose}</span>` : ''}
                </div>
                ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            </div>
            <div class="task-actions">
                <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Add event listeners
        li.querySelector('.task-checkbox').addEventListener('change', () => toggleTaskCompletion(task.id));
        li.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
        li.querySelector('.delete-btn').addEventListener('click', () => confirmDeleteTask(task.id));
        
        return li;
    };

    // --- Task Actions ---
    const addTask = (e) => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value.trim();
        if (!title) {
            showToast('Task title is required!', 'danger');
            return;
        }
        const newTask = {
            id: Date.now(),
            title: title,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            deadline: document.getElementById('taskDeadline').value,
            purpose: document.getElementById('taskPurpose').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskForm.reset();
        showToast('Task added successfully!');
    };
    
    const toggleTaskCompletion = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
            showToast(task.completed ? 'Task marked as complete!' : 'Task marked as active.');
        }
    };
    
    const editTask = (taskId) => {
        const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
        const titleElement = taskElement.querySelector('.task-title-text');
        const currentTitle = titleElement.textContent;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'edit-input';

        titleElement.replaceWith(input);
        input.focus();

        const saveEdit = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== currentTitle) {
                const task = tasks.find(t => t.id === taskId);
                task.title = newTitle;
                saveTasks();
                showToast('Task updated!');
            }
            renderTasks(); 
        };
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', e => { if (e.key === 'Enter') input.blur(); });
    };

    const confirmDeleteTask = (taskId) => {
        taskToDelete = taskId;
        deleteModal.classList.add('show');
    };
    
    const deleteTask = () => {
        if (taskToDelete) {
            tasks = tasks.filter(task => task.id !== taskToDelete);
            saveTasks();
            renderTasks();
            taskToDelete = null;
            showToast('Task deleted.', 'danger');
        }
        closeDeleteModal();
    };
    
    const closeDeleteModal = () => deleteModal.classList.remove('show');
    
    const saveTasks = () => localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // --- Progress & UI Updates ---
    const updateProgress = () => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const overall = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        overallProgressBar.style.width = `${overall}%`;
        progressPercentage.textContent = `${overall}%`;

        ['work', 'personal', 'health'].forEach(cat => {
            const catTasks = tasks.filter(t => t.category === cat);
            const completed = catTasks.filter(t => t.completed).length;
            const percentage = catTasks.length > 0 ? Math.round((completed / catTasks.length) * 100) : 0;
            document.getElementById(`${cat}Progress`).textContent = `${percentage}%`;
        });
        
        ['high', 'medium', 'low'].forEach(prio => {
            const prioTasks = tasks.filter(t => t.priority === prio);
            const completed = prioTasks.filter(t => t.completed).length;
            const percentage = prioTasks.length > 0 ? Math.round((completed / prioTasks.length) * 100) : 0;
            document.getElementById(`${prio}PriorityProgress`).textContent = `${percentage}%`;
        });
        
        if (totalTasks === 0) motivationMessage.textContent = "Add your first task to get started!";
        else if (overall === 100) motivationMessage.textContent = "Amazing! All tasks completed! 🎉";
        else if (overall >= 75) motivationMessage.textContent = "Almost there! Keep up the great work!";
        else if (overall >= 50) motivationMessage.textContent = "Halfway there! You're making great progress.";
        else motivationMessage.textContent = "Every step counts. Keep going!";
    };
    
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, options);
    };

    // --- Event Listeners ---
    taskForm.addEventListener('submit', addTask);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', deleteTask);
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
    window.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

    // --- Initial Load ---
    initTheme();
    renderTasks();
});