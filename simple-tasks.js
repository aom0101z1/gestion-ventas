// ===== TASK MANAGEMENT SYSTEM - INTEGRATED WITH YOUR CRM =====

let tasks = [
    {
        id: '1',
        title: 'Design login page',
        description: 'Create wireframes and mockups for the login page',
        status: 'todo',
        priority: 'high',
        assignee: 'john',
        assigneeName: 'John Doe',
        dueDate: '2024-08-15',
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        title: 'Implement API authentication',
        description: 'Set up JWT authentication for the API',
        status: 'in-progress',
        priority: 'urgent',
        assignee: 'jane',
        assigneeName: 'Jane Smith',
        dueDate: '2024-08-10',
        createdAt: new Date().toISOString()
    },
    {
        id: '3',
        title: 'Write unit tests',
        description: 'Create comprehensive unit tests for user module',
        status: 'review',
        priority: 'medium',
        assignee: 'mike',
        assigneeName: 'Mike Johnson',
        dueDate: '2024-08-20',
        createdAt: new Date().toISOString()
    }
];

let draggedTask = null;

// Main function to load tasks (this replaces your loadTasksData)
async function loadTasksData() {
    const tasksContainer = document.getElementById('tasks');
    if (!tasksContainer) return;

    // Clear existing content
    tasksContainer.innerHTML = '';
    tasksContainer.style.display = 'block';
    tasksContainer.classList.remove('hidden');

    // Add styles first
    addTaskStyles();

    // Render the task board
    tasksContainer.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: #1f2937;">📋 Task Management System</h2>
                <div>
                    <button class="btn btn-primary" onclick="showCreateTaskModal()" style="margin-right: 0.5rem;">
                        ➕ New Task
                    </button>
                    <button class="btn" onclick="refreshTasks()" style="background: #6b7280; color: white;">
                        🔄 Refresh
                    </button>
                </div>
            </div>
            
            <div class="task-board" style="
                display: grid; 
                grid-template-columns: repeat(6, 1fr); 
                gap: 1rem;
                min-height: 60vh;
            ">
                <!-- To Do -->
                <div class="task-column">
                    <div class="column-header" style="background: #6b7280;">
                        <span>📝 To Do</span>
                        <span class="count-badge" id="count-todo">0</span>
                    </div>
                    <div class="column-body" data-status="todo" id="column-todo"></div>
                </div>

                <!-- In Progress -->
                <div class="task-column">
                    <div class="column-header" style="background: #3b82f6;">
                        <span>🔄 In Progress</span>
                        <span class="count-badge" id="count-in-progress">0</span>
                    </div>
                    <div class="column-body" data-status="in-progress" id="column-in-progress"></div>
                </div>

                <!-- Review -->
                <div class="task-column">
                    <div class="column-header" style="background: #f59e0b;">
                        <span>👀 Review</span>
                        <span class="count-badge" id="count-review">0</span>
                    </div>
                    <div class="column-body" data-status="review" id="column-review"></div>
                </div>

                <!-- Testing -->
                <div class="task-column">
                    <div class="column-header" style="background: #8b5cf6;">
                        <span>🧪 Testing</span>
                        <span class="count-badge" id="count-testing">0</span>
                    </div>
                    <div class="column-body" data-status="testing" id="column-testing"></div>
                </div>

                <!-- Completed -->
                <div class="task-column">
                    <div class="column-header" style="background: #10b981;">
                        <span>✅ Completed</span>
                        <span class="count-badge" id="count-completed">0</span>
                    </div>
                    <div class="column-body" data-status="completed" id="column-completed"></div>
                </div>

                <!-- Blocked -->
                <div class="task-column">
                    <div class="column-header" style="background: #ef4444;">
                        <span>🚫 Blocked</span>
                        <span class="count-badge" id="count-blocked">0</span>
                    </div>
                    <div class="column-body" data-status="blocked" id="column-blocked"></div>
                </div>
            </div>
        </div>

        <!-- Create Task Modal -->
        <div class="task-modal" id="createTaskModal" style="display: none;">
            <div class="modal-content">
                <h3 style="margin-bottom: 1.5rem;">Create New Task</h3>
                <form id="createTaskForm">
                    <div class="form-group">
                        <label>Task Title*</label>
                        <input type="text" id="taskTitle" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="taskDescription" placeholder="Task description..."></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
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
                                <option value="me">👤 Myself</option>
                                <option value="john">John Doe</option>
                                <option value="jane">Jane Smith</option>
                                <option value="mike">Mike Johnson</option>
                                <option value="sarah">Sarah Wilson</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="taskDueDate">
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                        <button type="button" onclick="closeTaskModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Initialize the board
    renderTasks();
    setupTaskDragDrop();
    setupTaskForm();
}

// Add CSS styles
function addTaskStyles() {
    if (document.getElementById('task-management-styles')) return;

    const style = document.createElement('style');
    style.id = 'task-management-styles';
    style.textContent = `
        .task-column {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .column-header {
            padding: 1rem;
            color: white;
            font-weight: 600;
            text-align: center;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .column-body {
            flex: 1;
            padding: 1rem;
            min-height: 350px;
            transition: background-color 0.2s;
        }
        
        .column-body.drag-over {
            background-color: #f0f9ff;
            border: 2px dashed #3b82f6;
        }
        
        .task-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            cursor: move;
            transition: all 0.2s;
            border-left: 4px solid #e2e8f0;
        }
        
        .task-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .task-card.dragging {
            opacity: 0.5;
            transform: rotate(2deg);
        }
        
        .task-card.priority-urgent {
            border-left-color: #dc2626;
        }
        
        .task-card.priority-high {
            border-left-color: #f59e0b;
        }
        
        .task-card.priority-medium {
            border-left-color: #3b82f6;
        }
        
        .task-card.priority-low {
            border-left-color: #10b981;
        }
        
        .task-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }
        
        .task-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: #6b7280;
            margin-bottom: 0.5rem;
        }
        
        .task-assignee {
            background: #e0e7ff;
            color: #3730a3;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 500;
        }
        
        .priority-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .priority-urgent {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .priority-high {
            background: #fef3c7;
            color: #d97706;
        }
        
        .priority-medium {
            background: #dbeafe;
            color: #2563eb;
        }
        
        .priority-low {
            background: #d1fae5;
            color: #059669;
        }
        
        .task-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        
        .task-modal.show {
            display: flex !important;
        }
        
        .modal-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            width: 500px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .form-group {
            margin-bottom: 1rem;
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
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .count-badge {
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .empty-state {
            text-align: center;
            padding: 2rem;
            color: #9ca3af;
            font-style: italic;
        }
    `;
    
    document.head.appendChild(style);
}

// Render all tasks
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
    
    setupTaskDragDrop();
}

// Render individual task card
function renderTaskCard(task) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    
    return `
        <div class="task-card priority-${task.priority}" 
             draggable="true" 
             data-task-id="${task.id}">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-assignee">${task.assigneeName}</span>
                <span class="priority-badge priority-${task.priority}">
                    ${getPriorityIcon(task.priority)} ${task.priority}
                </span>
            </div>
            ${task.description ? `<div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem;">${task.description}</div>` : ''}
            ${task.dueDate ? `
                <div style="font-size: 0.8rem; color: ${isOverdue ? '#dc2626' : '#6b7280'};">
                    📅 ${formatDate(task.dueDate)} ${isOverdue ? '⚠️' : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// Setup drag and drop
function setupTaskDragDrop() {
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedTask = e.target.dataset.taskId;
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', draggedTask);
        });

        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            draggedTask = null;
        });
    });

    document.querySelectorAll('.column-body').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
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
            const taskId = e.dataTransfer.getData('text/plain') || draggedTask;
            
            if (taskId && newStatus) {
                moveTask(taskId, newStatus);
            }
        });
    });
}

// Move task to new status
function moveTask(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        
        // TODO: Sync with Firebase
        // await window.FirebaseData.updateTask(taskId, { status: newStatus });
        
        renderTasks();
        if (window.showNotification) {
            window.showNotification(`Task moved to ${newStatus.replace('-', ' ')}`, 'success');
        }
    }
}

// Setup task form
function setupTaskForm() {
    const form = document.getElementById('createTaskForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const assigneeSelect = document.getElementById('taskAssignee');
            const selectedOption = assigneeSelect.options[assigneeSelect.selectedIndex];
            
            const newTask = {
                id: Date.now().toString(),
                title: document.getElementById('taskTitle').value,
                description: document.getElementById('taskDescription').value,
                status: 'todo',
                priority: document.getElementById('taskPriority').value,
                assignee: document.getElementById('taskAssignee').value,
                assigneeName: selectedOption.text.replace('👤 ', ''),
                dueDate: document.getElementById('taskDueDate').value,
                createdAt: new Date().toISOString()
            };
            
            tasks.push(newTask);
            
            // TODO: Save to Firebase
            // await window.FirebaseData.createTask(newTask);
            
            renderTasks();
            closeTaskModal();
            
            if (window.showNotification) {
                window.showNotification('Task created successfully!', 'success');
            }
        });
    }
}

// Show create task modal
function showCreateTaskModal() {
    const modal = document.getElementById('createTaskModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close modal
function closeTaskModal() {
    const modal = document.getElementById('createTaskModal');
    if (modal) {
        modal.classList.remove('show');
        document.getElementById('createTaskForm').reset();
    }
}

// Refresh tasks
function refreshTasks() {
    // TODO: Fetch from Firebase
    renderTasks();
    if (window.showNotification) {
        window.showNotification('Tasks refreshed!', 'info');
    }
}

// Utility functions
function getPriorityIcon(priority) {
    const icons = {
        urgent: '🔴',
        high: '🟠',
        medium: '🔵',
        low: '🟢'
    };
    return icons[priority] || '🔵';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Export functions to global scope
window.loadTasksData = loadTasksData;
window.showCreateTaskModal = showCreateTaskModal;
window.closeTaskModal = closeTaskModal;
window.refreshTasks = refreshTasks;

console.log('✅ Task Management System loaded and integrated');
