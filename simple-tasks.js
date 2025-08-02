// ===== COMPLETE TASK MANAGEMENT SYSTEM - FIXED FOR YOUR CRM =====

let tasks = [
    {
        id: '1',
        title: 'Design login page',
        description: 'Create wireframes and mockups for the login page using Figma. Include responsive design considerations.',
        status: 'in-progress',
        priority: 'high',
        assignee: 'john',
        assigneeName: 'John Doe',
        dueDate: '2024-08-14',
        createdAt: new Date('2024-08-01').toISOString(),
        collapsed: true
    },
    {
        id: '2',
        title: 'Implement API authentication',
        description: 'Set up JWT authentication for the API endpoints. Include refresh token logic.',
        status: 'in-progress',
        priority: 'urgent',
        assignee: 'jane',
        assigneeName: 'Jane Smith',
        dueDate: '2024-08-09',
        createdAt: new Date('2024-08-01').toISOString(),
        collapsed: true
    }
];

let employees = [
    { id: 'me', name: 'Myself', avatar: '👤' },
    { id: 'john', name: 'John Doe', avatar: '👨‍💻' },
    { id: 'jane', name: 'Jane Smith', avatar: '👩‍💻' },
    { id: 'mike', name: 'Mike Johnson', avatar: '👨‍🔧' },
    { id: 'sarah', name: 'Sarah Wilson', avatar: '👩‍🎨' },
    { id: 'alex', name: 'Alex Brown', avatar: '👨‍💼' }
];

let draggedTask = null;

// ===== MAIN LOADING FUNCTION (WORKS WITH YOUR CRM) =====
async function loadTasksData() {
    console.log('📋 Starting task management system...');
    
    const tasksContainer = document.getElementById('tasks');
    if (!tasksContainer) {
        console.error('❌ Tasks container not found!');
        return;
    }

    // Clear existing content
    tasksContainer.innerHTML = '';
    tasksContainer.style.display = 'block';
    tasksContainer.classList.remove('hidden');

    // Add styles first
    addTaskStyles();

    // Create the complete task management interface
    tasksContainer.innerHTML = createTaskInterface();

    // Initialize all functionality
    renderTasks();
    setupEventListeners();
    
    console.log('✅ Task management system loaded successfully!');
}

// ===== CREATE COMPLETE INTERFACE =====
function createTaskInterface() {
    return `
        <div class="task-management-container">
            <!-- Header Section -->
            <div class="task-header">
                <div class="header-left">
                    <h2>📋 Task Management System</h2>
                    <div class="task-stats">
                        <span class="stat-item">Total: ${tasks.length}</span>
                        <span class="stat-item">Active: ${tasks.filter(t => !['completed', 'blocked'].includes(t.status)).length}</span>
                    </div>
                </div>
                <div class="header-right">
                    <button class="btn-primary" onclick="showCreateTaskModal()">
                        ➕ New Task
                    </button>
                    <button class="btn-secondary" onclick="refreshTasks()">
                        🔄 Refresh
                    </button>
                </div>
            </div>
            
            <!-- Task Board with 6 Columns -->
            <div class="task-board">
                <!-- To Do Column -->
                <div class="task-column">
                    <div class="column-header" style="background: #6b7280;">
                        <span>📝 To Do</span>
                        <span class="count-badge" id="count-todo">0</span>
                    </div>
                    <div class="column-body" data-status="todo" id="column-todo">
                        <div class="empty-state">No tasks here</div>
                    </div>
                </div>

                <!-- In Progress Column -->
                <div class="task-column">
                    <div class="column-header" style="background: #3b82f6;">
                        <span>🔄 In Progress</span>
                        <span class="count-badge" id="count-in-progress">0</span>
                    </div>
                    <div class="column-body" data-status="in-progress" id="column-in-progress">
                        <div class="empty-state">No tasks here</div>
                    </div>
                </div>

                <!-- Review Column -->
                <div class="task-column">
                    <div class="column-header" style="background: #f59e0b;">
                        <span>👀 Review</span>
                        <span class="count-badge" id="count-review">0</span>
                    </div>
                    <div class="column-body" data-status="review" id="column-review">
                        <div class="empty-state">No tasks here</div>
                    </div>
                </div>

                <!-- Testing Column -->
                <div class="task-column">
                    <div class="column-header" style="background: #8b5cf6;">
                        <span>🧪 Testing</span>
                        <span class="count-badge" id="count-testing">0</span>
                    </div>
                    <div class="column-body" data-status="testing" id="column-testing">
                        <div class="empty-state">No tasks here</div>
                    </div>
                </div>

                <!-- Completed Column -->
                <div class="task-column">
                    <div class="column-header" style="background: #10b981;">
                        <span>✅ Completed</span>
                        <span class="count-badge" id="count-completed">0</span>
                    </div>
                    <div class="column-body" data-status="completed" id="column-completed">
                        <div class="empty-state">No tasks here</div>
                    </div>
                </div>

                <!-- Blocked Column -->
                <div class="task-column">
                    <div class="column-header" style="background: #ef4444;">
                        <span>🚫 Blocked</span>
                        <span class="count-badge" id="count-blocked">0</span>
                    </div>
                    <div class="column-body" data-status="blocked" id="column-blocked">
                        <div class="empty-state">No tasks here</div>
                    </div>
                </div>
            </div>
            
            <!-- Create Task Modal -->
            <div class="task-modal" id="createTaskModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create New Task</h3>
                        <button class="close-btn" onclick="closeTaskModal()">✕</button>
                    </div>
                    
                    <form id="createTaskForm">
                        <div class="form-group">
                            <label>Task Title *</label>
                            <input type="text" id="taskTitle" required placeholder="Enter task title...">
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="taskDescription" placeholder="Describe the task details..."></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Priority</label>
                                <select id="taskPriority">
                                    <option value="low">🟢 Low</option>
                                    <option value="medium" selected>🔵 Medium</option>
                                    <option value="high">🟠 High</option>
                                    <option value="urgent">🔴 Urgent</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Assign To</label>
                                <select id="taskAssignee">
                                    ${employees.map(emp => 
                                        `<option value="${emp.id}">${emp.avatar} ${emp.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" id="taskDueDate" min="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeTaskModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Create Task</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

// ===== RENDER TASKS IN COLUMNS =====
function renderTasks() {
    const statuses = ['todo', 'in-progress', 'review', 'testing', 'completed', 'blocked'];
    
    statuses.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        const count = document.getElementById(`count-${status}`);
        
        if (!column || !count) return;
        
        const statusTasks = tasks.filter(task => task.status === status);
        count.textContent = statusTasks.length;
        
        if (statusTasks.length === 0) {
            column.innerHTML = '<div class="empty-state">No tasks here</div>';
        } else {
            column.innerHTML = statusTasks.map(renderTaskCard).join('');
        }
    });
    
    setupDragAndDrop();
}

// ===== RENDER INDIVIDUAL TASK CARD =====
function renderTaskCard(task) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    const employee = employees.find(emp => emp.id === task.assignee);
    
    return `
        <div class="task-card priority-${task.priority}" 
             draggable="true" 
             data-task-id="${task.id}">
            
            <div class="task-main">
                <div class="task-title-row">
                    <div class="task-title">${task.title}</div>
                    <button class="collapse-btn" onclick="toggleTaskCollapse('${task.id}')" 
                            title="${task.collapsed ? 'Expand' : 'Collapse'} details">
                        ${task.collapsed ? '📋' : '📖'}
                    </button>
                </div>
                
                <div class="task-meta">
                    <div class="assignee-info">
                        <span class="assignee-avatar">${employee?.avatar || '👤'}</span>
                        <span class="assignee-name">${task.assigneeName}</span>
                    </div>
                    <div class="priority-badge priority-${task.priority}">
                        ${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}
                    </div>
                </div>
                
                ${task.dueDate ? `
                    <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
                        📅 ${formatDate(task.dueDate)} ${isOverdue ? '⚠️ OVERDUE' : ''}
                    </div>
                ` : ''}
            </div>
            
            <!-- Collapsible Details -->
            <div class="task-details ${task.collapsed ? 'collapsed' : 'expanded'}">
                <div class="task-description">
                    ${task.description || 'No description provided'}
                </div>
                <div class="task-actions">
                    <button class="action-btn edit" onclick="editTask('${task.id}')" title="Edit task">
                        ✏️
                    </button>
                    <button class="action-btn delete" onclick="deleteTask('${task.id}')" title="Delete task">
                        🗑️
                    </button>
                    <button class="action-btn priority" onclick="changePriority('${task.id}')" title="Change priority">
                        🎯
                    </button>
                </div>
                <div class="task-timestamps">
                    <small>Created: ${formatDate(task.createdAt)}</small>
                    ${task.updatedAt ? `<small>Updated: ${formatDate(task.updatedAt)}</small>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Create task form
    const form = document.getElementById('createTaskForm');
    if (form) {
        form.addEventListener('submit', createTask);
    }

    // Modal close on backdrop click
    const modal = document.getElementById('createTaskModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeTaskModal();
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTaskModal();
        if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            showCreateTaskModal();
        }
    });
}

// ===== DRAG AND DROP FUNCTIONALITY =====
function setupDragAndDrop() {
    // Task cards drag events
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedTask = e.target.dataset.taskId;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            draggedTask = null;
        });
    });

    // Column drop zones
    document.querySelectorAll('.column-body').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', (e) => {
            if (!column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            const newStatus = column.dataset.status;
            const taskId = draggedTask;
            
            if (taskId && newStatus) {
                moveTask(taskId, newStatus);
            }
        });
    });
}

// ===== TASK MANAGEMENT FUNCTIONS =====
function createTask(e) {
    e.preventDefault();
    
    const assigneeSelect = document.getElementById('taskAssignee');
    const selectedEmployee = employees.find(emp => emp.id === assigneeSelect.value);
    
    const newTask = {
        id: Date.now().toString(),
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        status: 'todo',
        priority: document.getElementById('taskPriority').value,
        assignee: assigneeSelect.value,
        assigneeName: selectedEmployee?.name || 'Unknown',
        dueDate: document.getElementById('taskDueDate').value,
        createdAt: new Date().toISOString(),
        collapsed: true
    };
    
    tasks.push(newTask);
    renderTasks();
    closeTaskModal();
    showNotification('Task created successfully! 🎉', 'success');
    
    // Update header stats
    updateTaskStats();
}

function moveTask(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        
        renderTasks();
        showNotification(`Task moved from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}`, 'success');
        updateTaskStats();
    }
}

function toggleTaskCollapse(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.collapsed = !task.collapsed;
        renderTasks();
    }
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        // Pre-fill form with task data
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskAssignee').value = task.assignee;
        document.getElementById('taskDueDate').value = task.dueDate;
        
        showCreateTaskModal();
        
        // Change form behavior for editing
        const form = document.getElementById('createTaskForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Task';
        
        form.onsubmit = (e) => {
            e.preventDefault();
            
            // Update task
            task.title = document.getElementById('taskTitle').value.trim();
            task.description = document.getElementById('taskDescription').value.trim();
            task.priority = document.getElementById('taskPriority').value;
            task.assignee = document.getElementById('taskAssignee').value;
            task.assigneeName = employees.find(emp => emp.id === task.assignee)?.name || 'Unknown';
            task.dueDate = document.getElementById('taskDueDate').value;
            task.updatedAt = new Date().toISOString();
            
            renderTasks();
            closeTaskModal();
            showNotification('Task updated successfully! ✅', 'success');
            
            // Reset form behavior
            form.onsubmit = createTask;
            submitBtn.textContent = 'Create Task';
        };
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        showNotification('Task deleted successfully', 'info');
        updateTaskStats();
    }
}

function changePriority(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const priorities = ['low', 'medium', 'high', 'urgent'];
        const currentIndex = priorities.indexOf(task.priority);
        const nextIndex = (currentIndex + 1) % priorities.length;
        
        task.priority = priorities[nextIndex];
        task.updatedAt = new Date().toISOString();
        
        renderTasks();
        showNotification(`Priority changed to ${task.priority}`, 'info');
    }
}

// ===== MODAL FUNCTIONS =====
function showCreateTaskModal() {
    const modal = document.getElementById('createTaskModal');
    if (modal) {
        modal.classList.add('show');
        document.getElementById('taskTitle').focus();
    }
}

function closeTaskModal() {
    const modal = document.getElementById('createTaskModal');
    if (modal) {
        modal.classList.remove('show');
        document.getElementById('createTaskForm').reset();
        
        // Reset form behavior if it was changed for editing
        const form = document.getElementById('createTaskForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        form.onsubmit = createTask;
        submitBtn.textContent = 'Create Task';
    }
}

function refreshTasks() {
    renderTasks();
    updateTaskStats();
    showNotification('Tasks refreshed! 🔄', 'info');
}

// ===== HELPER FUNCTIONS =====
function updateTaskStats() {
    const statsContainer = document.querySelector('.task-stats');
    if (statsContainer) {
        const totalTasks = tasks.length;
        const activeTasks = tasks.filter(t => !['completed', 'blocked'].includes(t.status)).length;
        
        statsContainer.innerHTML = `
            <span class="stat-item">Total: ${totalTasks}</span>
            <span class="stat-item">Active: ${activeTasks}</span>
        `;
    }
}

function getPriorityIcon(priority) {
    const icons = { urgent: '🔴', high: '🟠', medium: '🔵', low: '🟢' };
    return icons[priority] || '🔵';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

function formatStatus(status) {
    return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// ===== COMPREHENSIVE CSS STYLES =====
function addTaskStyles() {
    if (document.getElementById('task-management-styles')) return;

    const style = document.createElement('style');
    style.id = 'task-management-styles';
    style.textContent = `
        .task-management-container {
            background: #f8fafc;
            min-height: 100vh;
            padding: 1.5rem;
        }
        
        .task-header {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .task-header h2 {
            margin: 0;
            color: #1f2937;
            font-size: 1.5rem;
        }
        
        .task-stats {
            display: flex;
            gap: 1rem;
            margin-top: 0.5rem;
        }
        
        .stat-item {
            background: #e0e7ff;
            color: #3730a3;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .header-right {
            display: flex;
            gap: 0.75rem;
        }
        
        .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
        }
        
        .task-board {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 1.5rem;
        }
        
        .task-column {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 60vh;
        }
        
        .column-header {
            padding: 1rem;
            color: white;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .count-badge {
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            min-width: 1.5rem;
            text-align: center;
        }
        
        .column-body {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            min-height: 200px;
            transition: all 0.2s;
        }
        
        .column-body.drag-over {
            background: #f0f9ff;
            border: 2px dashed #3b82f6;
        }
        
        .empty-state {
            text-align: center;
            padding: 2rem 1rem;
            color: #9ca3af;
            font-style: italic;
        }
        
        .task-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 0.75rem;
            cursor: move;
            transition: all 0.2s;
            border-left: 4px solid #e2e8f0;
            overflow: hidden;
        }
        
        .task-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .task-card.dragging {
            opacity: 0.5;
            transform: rotate(5deg);
        }
        
        .task-card.priority-urgent { border-left-color: #dc2626; }
        .task-card.priority-high { border-left-color: #f59e0b; }
        .task-card.priority-medium { border-left-color: #3b82f6; }
        .task-card.priority-low { border-left-color: #10b981; }
        
        .task-main {
            padding: 1rem;
        }
        
        .task-title-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.75rem;
        }
        
        .task-title {
            font-weight: 600;
            color: #1f2937;
            font-size: 0.9rem;
            line-height: 1.4;
            flex: 1;
            margin-right: 0.5rem;
        }
        
        .collapse-btn {
            background: #f3f4f6;
            border: none;
            border-radius: 6px;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.2s;
        }
        
        .collapse-btn:hover {
            background: #e5e7eb;
        }
        
        .task-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .assignee-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .assignee-avatar {
            font-size: 1.2rem;
        }
        
        .assignee-name {
            background: #e0e7ff;
            color: #3730a3;
            padding: 0.25rem 0.6rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 500;
        }
        
        .priority-badge {
            padding: 0.25rem 0.6rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
        }
        
        .priority-urgent { background: #fee2e2; color: #dc2626; }
        .priority-high { background: #fef3c7; color: #d97706; }
        .priority-medium { background: #dbeafe; color: #2563eb; }
        .priority-low { background: #d1fae5; color: #059669; }
        
        .task-due-date {
            font-size: 0.8rem;
            color: #6b7280;
            margin-top: 0.5rem;
        }
        
        .task-due-date.overdue {
            color: #dc2626;
            font-weight: 600;
        }
        
        .task-details {
            border-top: 1px solid #f3f4f6;
            transition: all 0.3s ease;
            overflow: hidden;
        }
        
        .task-details.collapsed {
            max-height: 0;
        }
        
        .task-details.expanded {
            max-height: 300px;
            padding: 1rem;
        }
        
        .task-description {
            font-size: 0.8rem;
            color: #4b5563;
            line-height: 1.5;
            margin-bottom: 1rem;
            background: #f9fafb;
            padding: 0.75rem;
            border-radius: 6px;
        }
        
        .task-actions {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .action-btn {
            background: #f3f4f6;
            border: none;
            border-radius: 6px;
            padding: 0.5rem;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        
        .action-btn:hover {
            background: #e5e7eb;
            transform: scale(1.1);
        }
        
        .task-timestamps {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .task-timestamps small {
            color: #9ca3af;
            font-size: 0.7rem;
        }
        
        .task-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: none;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        }
        
        .task-modal.show {
            display: flex !important;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 500px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #1f2937;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            padding: 0.25rem;
            border-radius: 6px;
        }
        
        .close-btn:hover {
            background: #f3f4f6;
        }
        
        .modal-content form {
            padding: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
        }
        
        @media (max-width: 1200px) {
            .task-board {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        @media (max-width: 768px) {
            .task-board {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .task-header {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;
            }
            
            .header-right {
                justify-content: center;
            }
            
            .form-row {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 480px) {
            .task-board {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ===== INITIALIZE MODULE (FOR COMPATIBILITY) =====
function initializeTasksModule() {
    console.log('🚀 Initializing tasks module...');
    loadTasksData();
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.loadTasksData = loadTasksData;
window.initializeTasksModule = initializeTasksModule;
window.showCreateTaskModal = showCreateTaskModal;
window.closeTaskModal = closeTaskModal;
window.refreshTasks = refreshTasks;
window.toggleTaskCollapse = toggleTaskCollapse;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.changePriority = changePriority;

console.log('✅ Complete Task Management System loaded and ready!');
