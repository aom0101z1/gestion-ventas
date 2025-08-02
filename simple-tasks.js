// simple-tasks.js - FIXED VERSION WITH DRAG & DROP
// ===== WORKING TASK MANAGEMENT WITH DRAG & DROP =====

// Task data
let taskData = [
    {
        id: '1',
        title: 'Seguimiento Lead María González',
        description: 'Contactar para agendar clase muestra de inglés',
        status: 'pending',
        priority: 'high',
        assignee: 'Ana López',
        dueDate: '2024-08-15',
        type: 'sales'
    },
    {
        id: '2', 
        title: 'Llamar estudiantes morosos',
        description: 'Recordar pagos pendientes del mes de agosto',
        status: 'in-progress',
        priority: 'urgent',
        assignee: 'Carlos Ruiz',
        dueDate: '2024-08-12',
        type: 'payment'
    },
    {
        id: '3',
        title: 'Preparar reporte semanal',
        description: 'Reporte de conversiones y ventas de la semana',
        status: 'completed',
        priority: 'medium',
        assignee: 'Director',
        dueDate: '2024-08-10',
        type: 'admin'
    }
];

// ===== MAIN FUNCTION =====
function loadTasksData() {
    console.log('📋 Loading tasks data with drag & drop');
    
    const container = document.getElementById('tasksContainer');
    if (!container) {
        console.error('❌ tasksContainer not found');
        return;
    }
    
    console.log('✅ Found tasksContainer, rendering...');
    container.innerHTML = createTaskBoard();
    console.log('✅ Task board rendered');
}

// ===== CREATE TASK BOARD =====
function createTaskBoard() {
    return `
        <div style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1f2937;">📋 Task Management - Drag & Drop</h2>
                <button onclick="openTaskModal()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    ➕ New Task
                </button>
            </div>
            
            <!-- DRAG & DROP BOARD -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; height: 500px;">
                ${renderTaskColumn('pending', '⏳ Pendientes', '#f59e0b')}
                ${renderTaskColumn('in-progress', '🔄 En Progreso', '#3b82f6')}
                ${renderTaskColumn('completed', '✅ Completadas', '#10b981')}
            </div>
        </div>
        
        <!-- Task Modal -->
        <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 10px; width: 400px; max-width: 90%;">
                <h3>Create New Task</h3>
                <input type="text" id="newTaskTitle" placeholder="Task title..." style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
                <textarea id="newTaskDesc" placeholder="Description..." style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; height: 80px;"></textarea>
                <select id="newTaskPriority" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium" selected>🔵 Medium Priority</option>
                    <option value="high">🟠 High Priority</option>
                    <option value="urgent">🔴 Urgent</option>
                </select>
                <input type="text" id="newTaskAssignee" placeholder="Assignee name..." style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="closeTaskModal()" style="flex: 1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button onclick="saveTask()" style="flex: 1; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Task</button>
                </div>
            </div>
        </div>
    `;
}

// ===== RENDER TASK COLUMN =====
function renderTaskColumn(status, title, color) {
    const tasks = taskData.filter(task => task.status === status);
    
    return `
        <div class="drop-zone" 
             ondrop="dropTask(event)" 
             ondragover="allowDropTask(event)"
             data-status="${status}"
             style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; border-top: 4px solid ${color};">
            
            <div style="background: ${color}; color: white; padding: 15px; text-align: center; font-weight: bold;">
                ${title} (${tasks.length})
            </div>
            
            <div style="padding: 15px; height: calc(100% - 60px); overflow-y: auto;">
                ${tasks.length === 0 ? 
                    '<div style="text-align: center; color: #9ca3af; padding: 20px; font-style: italic;">Drop tasks here</div>' :
                    tasks.map(task => renderTaskCard(task)).join('')
                }
            </div>
        </div>
    `;
}

// ===== RENDER TASK CARD =====
function renderTaskCard(task) {
    const priorityColors = {
        low: '#10b981',
        medium: '#3b82f6',
        high: '#f59e0b', 
        urgent: '#ef4444'
    };
    
    return `
        <div id="task-${task.id}" 
             draggable="true" 
             ondragstart="dragTask(event)"
             onclick="toggleTaskDetails('${task.id}')"
             style="background: white; border: 1px solid #e5e7eb; border-left: 4px solid ${priorityColors[task.priority]}; border-radius: 6px; padding: 15px; margin-bottom: 10px; cursor: pointer;"
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">${task.title}</div>
            
            <div id="details-${task.id}" style="display: none; font-size: 0.9rem; color: #6b7280; margin-bottom: 8px;">${task.description}</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 12px;">${task.assignee}</span>
                <span style="background: ${getPriorityBg(task.priority)}; color: ${priorityColors[task.priority]}; padding: 4px 8px; border-radius: 12px;">${task.priority.toUpperCase()}</span>
            </div>
            ${task.dueDate ? `<div style="font-size: 0.8rem; color: #6b7280; margin-top: 8px;">📅 ${task.dueDate}</div>` : ''}
        </div>
    `;
}

// ===== DRAG & DROP FUNCTIONS =====
function allowDropTask(ev) {
    ev.preventDefault();
}

function dragTask(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    console.log('🎯 Drag started:', ev.target.id);
}

function dropTask(ev) {
    ev.preventDefault();
    
    const taskElementId = ev.dataTransfer.getData("text");
    const taskId = taskElementId.replace('task-', '');
    const newStatus = ev.currentTarget.dataset.status;
    
    console.log('🎯 Drop:', taskId, 'to', newStatus);
    
    // Find and update task
    const task = taskData.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        
        // Refresh board
        loadTasksData();
        
        if (window.showNotification) {
            window.showNotification(`Task moved to ${newStatus}`, 'success');
        }
        
        console.log('✅ Task updated');
    }
}

function toggleTaskDetails(taskId) {
    const details = document.getElementById(`details-${taskId}`);
    if (details) {
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
    }
}

// ===== MODAL FUNCTIONS =====
function openTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('newTaskTitle').value = '';
        document.getElementById('newTaskDesc').value = '';
        document.getElementById('newTaskAssignee').value = '';
    }
}

function saveTask() {
    const title = document.getElementById('newTaskTitle').value.trim();
    const description = document.getElementById('newTaskDesc').value.trim();
    const priority = document.getElementById('newTaskPriority').value;
    const assignee = document.getElementById('newTaskAssignee').value.trim();
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        description: description,
        status: 'pending',
        priority: priority,
        assignee: assignee || 'Unassigned',
        dueDate: '',
        type: 'admin'
    };
    
    taskData.push(newTask);
    closeTaskModal();
    loadTasksData();
    
    if (window.showNotification) {
        window.showNotification('Task created successfully!', 'success');
    }
}

// ===== UTILITY FUNCTIONS =====
function getPriorityBg(priority) {
    const colors = {
        low: '#d1fae5',
        medium: '#dbeafe',
        high: '#fef3c7',
        urgent: '#fee2e2'
    };
    return colors[priority] || '#dbeafe';
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.loadTasksData = loadTasksData;
window.allowDropTask = allowDropTask;
window.dragTask = dragTask;
window.dropTask = dropTask;
window.toggleTaskDetails = toggleTaskDetails;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveTask = saveTask;

console.log('✅ FIXED Task Management System with Drag & Drop loaded!');
