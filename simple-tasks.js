// ===== ENHANCED TASK MANAGEMENT WITH DRAG & DROP =====
// Modeled after pipeline.js functionality for consistency

let tasks = [
    {
        id: '1',
        title: 'Follow up with Laura Pineda',
        description: 'Contact interested lead from pipeline',
        status: 'todo',
        priority: 'high',
        assignee: 'John Doe',
        dueDate: '2024-08-14',
        leadId: null // Link to CRM lead if needed
    },
    {
        id: '2',
        title: 'Prepare marketing materials',
        description: 'Create flyers for new English courses',
        status: 'in-progress',
        priority: 'medium',
        assignee: 'Jane Smith',
        dueDate: '2024-08-10',
        leadId: null
    },
    {
        id: '3',
        title: 'Update CRM system',
        description: 'Add new lead sources to system',
        status: 'completed',
        priority: 'low',
        assignee: 'Admin',
        dueDate: '2024-08-05',
        leadId: null
    }
];

// ===== MAIN LOADING FUNCTION =====
async function loadTasksData() {
    console.log('📋 Loading enhanced task management...');
    
    // Find container - try multiple possible IDs
    let container = document.getElementById('tasksContainer') || 
                   document.getElementById('tasks') || 
                   document.querySelector('#tasks .tab-content');
    
    if (!container) {
        console.error('❌ No task container found');
        return;
    }
    
    console.log('✅ Found container:', container.id || 'unnamed');
    
    // Ensure container is visible
    container.style.display = 'block';
    container.classList.remove('hidden');
    
    // Group tasks by status (similar to pipeline)
    const taskGroups = {
        'todo': tasks.filter(t => t.status === 'todo'),
        'in-progress': tasks.filter(t => t.status === 'in-progress'),
        'review': tasks.filter(t => t.status === 'review'),
        'completed': tasks.filter(t => t.status === 'completed')
    };
    
    // Render task board with drag & drop
    container.innerHTML = createTaskBoard(taskGroups);
    
    console.log('✅ Enhanced task system loaded');
}

// ===== CREATE TASK BOARD (SIMILAR TO PIPELINE) =====
function createTaskBoard(taskGroups) {
    return `
        <div style="padding: 20px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1f2937; display: flex; align-items: center; gap: 10px;">
                    📋 Task Management
                    <span style="background: #e5e7eb; color: #6b7280; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">
                        ${Object.values(taskGroups).flat().length} tasks
                    </span>
                </h2>
                <button onclick="createNewTask()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ➕ Nueva Tarea
                </button>
            </div>
            
            <!-- Task Board Grid (2x2 like pipeline) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1rem; height: 70vh;">
                ${renderTaskColumn('todo', 'Todo', taskGroups['todo'], '#fbbf24')}
                ${renderTaskColumn('in-progress', 'En Progreso', taskGroups['in-progress'], '#3b82f6')}
                ${renderTaskColumn('review', 'Revisión', taskGroups['review'], '#f97316')}
                ${renderTaskColumn('completed', 'Completado', taskGroups['completed'], '#10b981')}
            </div>
        </div>
        
        <!-- Task Modal -->
        <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; width: 500px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 20px 0; color: #1f2937;">✨ Nueva Tarea</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Título:</label>
                    <input type="text" id="newTaskTitle" placeholder="Ej: Llamar a cliente potencial..." style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Descripción:</label>
                    <textarea id="newTaskDesc" placeholder="Detalles de la tarea..." style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; height: 80px; resize: vertical; font-size: 1rem;"></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Prioridad:</label>
                        <select id="newTaskPriority" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="low">🟢 Baja</option>
                            <option value="medium" selected>🔵 Media</option>
                            <option value="high">🟠 Alta</option>
                            <option value="urgent">🔴 Urgente</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Asignado a:</label>
                        <input type="text" id="newTaskAssignee" placeholder="Nombre del empleado..." style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Fecha límite (opcional):</label>
                    <input type="date" id="newTaskDueDate" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="closeTaskModal()" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button onclick="saveNewTask()" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        💾 Guardar Tarea
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== RENDER TASK COLUMN (SIMILAR TO PIPELINE COLUMNS) =====
function renderTaskColumn(status, title, taskList, color) {
    return `
        <div class="drop-zone" 
             ondrop="dropTask(event)" 
             ondragover="allowDropTask(event)"
             data-status="${status}"
             style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; border-top: 4px solid ${color};">
            
            <!-- Column Header -->
            <div style="background: ${color}15; color: #374151; padding: 1rem; text-align: center; font-weight: 600; border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">${title}</div>
                <div style="background: ${color}; color: white; display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">
                    ${taskList.length} tareas
                </div>
            </div>
            
            <!-- Tasks Container -->
            <div style="padding: 1rem; height: calc(100% - 80px); overflow-y: auto;">
                ${taskList.length === 0 ? `
                    <div style="text-align: center; color: #9ca3af; padding: 2rem; font-style: italic;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📝</div>
                        No hay tareas aquí
                    </div>
                ` : taskList.map(task => renderTaskCard(task)).join('')}
            </div>
        </div>
    `;
}

// ===== RENDER INDIVIDUAL TASK CARD =====
function renderTaskCard(task) {
    const priorityConfig = {
        low: { color: '#10b981', bg: '#d1fae5', text: '🟢 Baja' },
        medium: { color: '#3b82f6', bg: '#dbeafe', text: '🔵 Media' },
        high: { color: '#f59e0b', bg: '#fef3c7', text: '🟠 Alta' },
        urgent: { color: '#dc2626', bg: '#fee2e2', text: '🔴 Urgente' }
    };
    
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    
    return `
        <div id="task-${task.id}" 
             draggable="true" 
             ondragstart="dragTask(event)"
             onclick="toggleTaskInfo('${task.id}')"
             style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${priority.color}; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s ease;"
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            
            <!-- Task Header -->
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                <span>${task.title}</span>
                <div style="background: ${priority.bg}; color: ${priority.color}; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: 500;">
                    ${priority.text.split(' ')[0]}
                </div>
            </div>
            
            <!-- Task Description -->
            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 8px; line-height: 1.4;">
                ${task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}
            </div>
            
            <!-- Task Meta Info -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 12px;">
                    👤 ${task.assignee}
                </span>
                ${task.dueDate ? `
                    <span style="background: ${isOverdue ? '#fee2e2' : '#f3f4f6'}; color: ${isOverdue ? '#dc2626' : '#6b7280'}; padding: 4px 8px; border-radius: 12px;">
                        📅 ${formatTaskDate(task.dueDate)}
                    </span>
                ` : ''}
            </div>
            
            <!-- Extended Info (hidden by default) -->
            <div id="task-info-${task.id}" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #6b7280;">
                <div><strong>Descripción completa:</strong> ${task.description}</div>
                ${task.dueDate ? `<div><strong>Fecha límite:</strong> ${task.dueDate}</div>` : ''}
                <div><strong>ID:</strong> ${task.id}</div>
            </div>
        </div>
    `;
}

// ===== DRAG & DROP FUNCTIONS (COPIED FROM PIPELINE.JS) =====
function allowDropTask(ev) {
    ev.preventDefault();
}

function dragTask(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    console.log('🎯 Task drag started:', ev.target.id);
}

async function dropTask(ev) {
    ev.preventDefault();
    
    const taskElementId = ev.dataTransfer.getData("text");
    const taskId = taskElementId.replace('task-', '');
    const newStatus = ev.currentTarget.dataset.status;
    
    console.log('🎯 Task drop:', taskId, 'to', newStatus);
    
    try {
        // Find and update task
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }
        
        tasks[taskIndex].status = newStatus;
        tasks[taskIndex].lastUpdated = new Date().toISOString();
        
        console.log('✅ Task status updated');
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(`Tarea movida a ${getStatusDisplayName(newStatus)} ✅`, 'success');
        }
        
        // TODO: Save to Firebase if needed
        // await saveTasksToFirebase();
        
        // Reload task board
        setTimeout(() => loadTasksData(), 300);
        
    } catch (error) {
        console.error('❌ Error moving task:', error);
        if (window.showNotification) {
            window.showNotification('❌ Error al mover la tarea', 'error');
        }
    }
}

// ===== TASK MANAGEMENT FUNCTIONS =====
function createNewTask() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('newTaskTitle').focus();
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear form
        document.getElementById('newTaskTitle').value = '';
        document.getElementById('newTaskDesc').value = '';
        document.getElementById('newTaskAssignee').value = '';
        document.getElementById('newTaskDueDate').value = '';
        document.getElementById('newTaskPriority').value = 'medium';
    }
}

function saveNewTask() {
    const title = document.getElementById('newTaskTitle').value.trim();
    const description = document.getElementById('newTaskDesc').value.trim();
    const priority = document.getElementById('newTaskPriority').value;
    const assignee = document.getElementById('newTaskAssignee').value.trim();
    const dueDate = document.getElementById('newTaskDueDate').value;
    
    if (!title) {
        alert('⚠️ Por favor ingresa un título para la tarea');
        return;
    }
    
    if (!assignee) {
        alert('⚠️ Por favor asigna la tarea a alguien');
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        description: description || 'Sin descripción',
        status: 'todo',
        priority: priority,
        assignee: assignee,
        dueDate: dueDate || null,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    tasks.push(newTask);
    closeTaskModal();
    loadTasksData(); // Refresh the board
    
    if (window.showNotification) {
        window.showNotification(`✅ Tarea "${title}" creada exitosamente`, 'success');
    }
}

function toggleTaskInfo(taskId) {
    const info = document.getElementById(`task-info-${taskId}`);
    if (info) {
        info.style.display = info.style.display === 'none' ? 'block' : 'none';
    }
}

// ===== UTILITY FUNCTIONS =====
function formatTaskDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)}d`;
    if (diffDays <= 7) return `En ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function getStatusDisplayName(status) {
    const statusNames = {
        'todo': 'Por Hacer',
        'in-progress': 'En Progreso',
        'review': 'En Revisión',
        'completed': 'Completado'
    };
    return statusNames[status] || status;
}

// TODO: Firebase integration
async function saveTasksToFirebase() {
    try {
        if (window.FirebaseData) {
            // Could save tasks to Firebase here
            // await window.FirebaseData.updateTasks(tasks);
        }
    } catch (error) {
        console.error('❌ Error saving tasks to Firebase:', error);
    }
}

// ===== EXPORT FUNCTIONS GLOBALLY =====
window.loadTasksData = loadTasksData;
window.createNewTask = createNewTask;
window.closeTaskModal = closeTaskModal;
window.saveNewTask = saveNewTask;
window.allowDropTask = allowDropTask;
window.dragTask = dragTask;
window.dropTask = dropTask;
window.toggleTaskInfo = toggleTaskInfo;

console.log('✅ Enhanced Task Management with Drag & Drop loaded successfully!');
