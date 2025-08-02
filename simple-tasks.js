<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Management System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            line-height: 1.6;
        }
        
        .header {
            background: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .header h1 {
            color: #1f2937;
            font-size: 1.5rem;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
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
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        
        .board {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 1.5rem;
            min-height: 70vh;
        }
        
        .column {
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
            min-height: 400px;
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
        
        .modal {
            display: none;
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
        
        .modal.show {
            display: flex;
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
        
        .form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
        }
        
        .empty-state {
            text-align: center;
            padding: 2rem;
            color: #9ca3af;
            font-style: italic;
        }
        
        .count-badge {
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        @media (max-width: 768px) {
            .board {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }
            
            .container {
                padding: 0 1rem;
            }
            
            .header {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Task Management System</h1>
        <div>
            <button class="btn btn-primary" onclick="showCreateTaskModal()">
                ➕ New Task
            </button>
            <button class="btn btn-secondary" onclick="refreshTasks()">
                🔄 Refresh
            </button>
        </div>
    </div>

    <div class="container">
        <div class="board" id="taskBoard">
            <!-- To Do -->
            <div class="column">
                <div class="column-header" style="background: #6b7280;">
                    <span>📝 To Do</span>
                    <span class="count-badge" id="count-todo">0</span>
                </div>
                <div class="column-body" data-status="todo" id="column-todo">
                    <div class="empty-state">No tasks yet</div>
                </div>
            </div>

            <!-- In Progress -->
            <div class="column">
                <div class="column-header" style="background: #3b82f6;">
                    <span>🔄 In Progress</span>
                    <span class="count-badge" id="count-in-progress">0</span>
                </div>
                <div class="column-body" data-status="in-progress" id="column-in-progress">
                    <div class="empty-state">No tasks in progress</div>
                </div>
            </div>

            <!-- Review -->
            <div class="column">
                <div class="column-header" style="background: #f59e0b;">
                    <span>👀 Review</span>
                    <span class="count-badge" id="count-review">0</span>
                </div>
                <div class="column-body" data-status="review" id="column-review">
                    <div class="empty-state">No tasks in review</div>
                </div>
            </div>

            <!-- Testing -->
            <div class="column">
                <div class="column-header" style="background: #8b5cf6;">
                    <span>🧪 Testing</span>
                    <span class="count-badge" id="count-testing">0</span>
                </div>
                <div class="column-body" data-status="testing" id="column-testing">
                    <div class="empty-state">No tasks in testing</div>
                </div>
            </div>

            <!-- Completed -->
            <div class="column">
                <div class="column-header" style="background: #10b981;">
                    <span>✅ Completed</span>
                    <span class="count-badge" id="count-completed">0</span>
                </div>
                <div class="column-body" data-status="completed" id="column-completed">
                    <div class="empty-state">No completed tasks</div>
                </div>
            </div>

            <!-- Blocked -->
            <div class="column">
                <div class="column-header" style="background: #ef4444;">
                    <span>🚫 Blocked</span>
                    <span class="count-badge" id="count-blocked">0</span>
                </div>
                <div class="column-body" data-status="blocked" id="column-blocked">
                    <div class="empty-state">No blocked tasks</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Create Task Modal -->
    <div class="modal" id="createTaskModal">
        <div class="modal-content">
            <h2 style="margin-bottom: 1.5rem;">Create New Task</h2>
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
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Task</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Task Management System
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

        // Initialize the board
        function initializeBoard() {
            renderTasks();
            setupDragAndDrop();
        }

        // Render all tasks
        function renderTasks() {
            const statuses = ['todo', 'in-progress', 'review', 'testing', 'completed', 'blocked'];
            
            statuses.forEach(status => {
                const column = document.getElementById(`column-${status}`);
                const count = document.getElementById(`count-${status}`);
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

        // Render individual task card
        function renderTaskCard(task) {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            
            return `
                <div class="task-card priority-${task.priority}" 
                     draggable="true" 
                     data-task-id="${task.id}"
                     onclick="editTask('${task.id}')">
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
        function setupDragAndDrop() {
            // Setup drag events for task cards
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

            // Setup drop zones
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
                
                // In a real app, you would sync with Firebase here
                // await updateTaskInFirebase(taskId, { status: newStatus });
                
                renderTasks();
                showNotification(`Task moved to ${newStatus.replace('-', ' ')}`, 'success');
            }
        }

        // Show create task modal
        function showCreateTaskModal() {
            document.getElementById('createTaskModal').classList.add('show');
        }

        // Close modal
        function closeModal() {
            document.getElementById('createTaskModal').classList.remove('show');
            document.getElementById('createTaskForm').reset();
        }

        // Create new task
        document.getElementById('createTaskForm').addEventListener('submit', (e) => {
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
            
            // In a real app, you would save to Firebase here
            // await saveTaskToFirebase(newTask);
            
            renderTasks();
            closeModal();
            showNotification('Task created successfully!', 'success');
        });

        // Edit task (simplified)
        function editTask(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const newTitle = prompt('Edit task title:', task.title);
                if (newTitle && newTitle !== task.title) {
                    task.title = newTitle;
                    task.updatedAt = new Date().toISOString();
                    renderTasks();
                    showNotification('Task updated!', 'success');
                }
            }
        }

        // Refresh tasks
        function refreshTasks() {
            // In a real app, this would fetch from Firebase
            renderTasks();
            showNotification('Tasks refreshed!', 'info');
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

        function showNotification(message, type = 'info') {
            // Simple notification system
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1001;
                font-weight: 500;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Close modal when clicking outside
        document.getElementById('createTaskModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal();
            }
        });

        // Initialize the application
        document.addEventListener('DOMContentLoaded', initializeBoard);
    </script>
</body>
</html>
