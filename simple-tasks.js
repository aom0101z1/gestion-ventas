// simple-tasks.js - Task Management System (Phase 1)
console.log('📋 Task Management System loading...');

// Global variables
let tasksData = [];
let currentFilter = 'all';
let isAdmin = false;
let draggedTask = null;

// Task configurations
const TASK_STATUS = {
    todo: { label: 'Por Hacer', color: '#6b7280', icon: '📝' },
    in_progress: { label: 'En Progreso', color: '#3b82f6', icon: '🔄' },
    review: { label: 'En Revisión', color: '#f59e0b', icon: '👀' },
    done: { label: 'Completado', color: '#10b981', icon: '✅' }
};

const TASK_PRIORITY = {
    low: { label: 'Baja', color: '#10b981', icon: '🟢' },
    medium: { label: 'Media', color: '#f59e0b', icon: '🟡' },
    high: { label: 'Alta', color: '#ef4444', icon: '🔴' },
    urgent: { label: 'Urgente', color: '#dc2626', icon: '🚨' }
};

// Wait for system to be ready
setTimeout(() => {
    console.log('📋 Initializing Task Management System...');
    
    // Override the loadTasksData function
    window.loadTasksData = async function() {
        console.log('✅ Loading tasks module...');
        
        // Get current user info
        if (window.FirebaseData && window.FirebaseData.currentUser) {
            currentUser = window.FirebaseData.currentUser;
            const profile = await window.FirebaseData.loadUserProfile();
            isAdmin = profile && profile.role === 'director';
            console.log('👤 User:', currentUser.email, 'Admin:', isAdmin);
        }
        
        // Get the tasks tab content area
        const tabContent = document.getElementById('tasks');
        if (!tabContent) {
            console.error('❌ Tasks tab content area not found');
            return;
        }
        
        // Clear and show content
        tabContent.innerHTML = '';
        tabContent.style.display = 'block';
        tabContent.classList.remove('hidden');
        
        // Render main UI
        renderTasksUI();
        
        // Setup Firebase listener
        setupTasksListener();
        
        console.log('✅ Tasks module initialized');
    };
    
    console.log('✅ Task Management System ready');
}, 100);

// ===== UI RENDERING =====
function renderTasksUI() {
    const tabContent = document.getElementById('tasks');
    
    tabContent.innerHTML = `
        <div style="padding: 20px; background: #f9fafb; min-height: calc(100vh - 200px);">
            <!-- Header -->
            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                    <div>
                        <h2 style="margin: 0; color: #1f2937; font-size: 24px;">📋 Gestión de Tareas</h2>
                        <p style="margin: 5px 0 0 0; color: #6b7280;">
                            ${isAdmin ? 'Vista de Administrador - Todas las tareas' : 'Mis tareas asignadas'}
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button onclick="showCreateTaskModal()" 
                                style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                            ➕ Nueva Tarea
                        </button>
                        <button onclick="refreshTasks()" 
                                style="padding: 10px 20px; background: white; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-weight: 500;">
                            🔄 Actualizar
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Filters -->
            <div style="background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                    <span style="font-weight: 500; color: #374151;">Filtros:</span>
                    <select id="filterStatus" onchange="applyFilters()" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="all">Todos los estados</option>
                        <option value="todo">Por Hacer</option>
                        <option value="in_progress">En Progreso</option>
                        <option value="review">En Revisión</option>
                        <option value="done">Completado</option>
                    </select>
                    ${isAdmin ? `
                        <select id="filterAssignee" onchange="applyFilters()" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="all">Todos los usuarios</option>
                        </select>
                    ` : ''}
                    <select id="filterPriority" onchange="applyFilters()" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="all">Todas las prioridades</option>
                        <option value="urgent">Urgente</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                    </select>
                    <button onclick="clearFilters()" style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer;">
                        ❌ Limpiar
                    </button>
                </div>
            </div>
            
            <!-- Kanban Board -->
            <div id="kanbanBoard" style="display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px;">
                ${Object.entries(TASK_STATUS).map(([status, config]) => `
                    <div class="kanban-column" 
                         style="flex: 1; min-width: 300px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <div style="padding: 15px; background: ${config.color}10; border-bottom: 2px solid ${config.color}; border-radius: 12px 12px 0 0;">
                            <h3 style="margin: 0; color: ${config.color}; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                                <span>${config.icon}</span>
                                <span>${config.label}</span>
                                <span id="count-${status}" style="background: ${config.color}20; padding: 2px 8px; border-radius: 12px; font-size: 14px;">0</span>
                            </h3>
                        </div>
                        <div id="column-${status}" 
                             class="task-column" 
                             data-status="${status}"
                             ondrop="handleDrop(event)" 
                             ondragover="handleDragOver(event)"
                             style="padding: 15px; min-height: 400px;">
                            <!-- Tasks will be added here -->
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Modal Container -->
        <div id="modalContainer"></div>
    `;
    
    // Add styles
    addTaskStyles();
}

// ===== FIREBASE INTEGRATION =====
function setupTasksListener() {
    if (!window.firebase || !window.firebase.database) {
        console.error('❌ Firebase not available');
        showError('Firebase no está disponible');
        return;
    }
    
    console.log('🔥 Setting up Firebase listener...');
    
    const tasksRef = firebase.database().ref('tasks');
    
    tasksRef.on('value', (snapshot) => {
        const allTasks = snapshot.val() || {};
        tasksData = [];
        
        // Convert to array and filter based on user role
        Object.keys(allTasks).forEach(taskId => {
            const task = allTasks[taskId];
            task.id = taskId;
            
            // Admin sees all, others see only their tasks
            if (isAdmin || (currentUser && (task.assignedTo === currentUser.uid || task.createdBy === currentUser.uid))) {
                tasksData.push(task);
            }
        });
        
        console.log(`✅ Loaded ${tasksData.length} tasks`);
        
        // Update assignee filter if admin
        if (isAdmin) {
            updateAssigneeFilter();
        }
        
        // Render tasks
        renderTasks();
    }, (error) => {
        console.error('❌ Firebase error:', error);
        showError('Error al cargar tareas: ' + error.message);
    });
}

// ===== RENDER TASKS IN KANBAN =====
function renderTasks() {
    // Clear all columns
    Object.keys(TASK_STATUS).forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (column) column.innerHTML = '';
        const count = document.getElementById(`count-${status}`);
        if (count) count.textContent = '0';
    });
    
    // Get filtered tasks
    const filteredTasks = getFilteredTasks();
    
    // Group tasks by status
    const tasksByStatus = {};
    Object.keys(TASK_STATUS).forEach(status => {
        tasksByStatus[status] = filteredTasks.filter(task => (task.status || 'todo') === status);
    });
    
    // Render tasks in each column
    Object.entries(tasksByStatus).forEach(([status, tasks]) => {
        const column = document.getElementById(`column-${status}`);
        const count = document.getElementById(`count-${status}`);
        
        if (column) {
            if (tasks.length === 0) {
                column.innerHTML = `
                    <div style="text-align: center; color: #9ca3af; padding: 40px;">
                        <p>No hay tareas</p>
                    </div>
                `;
            } else {
                column.innerHTML = tasks.map(task => renderTaskCard(task)).join('');
            }
        }
        
        if (count) {
            count.textContent = tasks.length;
        }
    });
}

// ===== RENDER INDIVIDUAL TASK CARD =====
function renderTaskCard(task) {
    const priority = TASK_PRIORITY[task.priority || 'medium'];
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
    
    return `
        <div class="task-card" 
             draggable="true" 
             ondragstart="handleDragStart(event, '${task.id}')"
             onclick="showTaskDetails('${task.id}')"
             style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: move; transition: all 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 14px; color: #1f2937; flex: 1;">${task.title || 'Sin título'}</h4>
                <span style="font-size: 20px;" title="${priority.label}">${priority.icon}</span>
            </div>
            
            ${task.description ? `
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.4;">
                    ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}
                </p>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${task.assignedToName ? `
                        <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; color: #374151;">
                            👤 ${task.assignedToName}
                        </span>
                    ` : ''}
                    ${dueDate ? `
                        <span style="background: ${isOverdue ? '#fee2e2' : '#f3f4f6'}; color: ${isOverdue ? '#dc2626' : '#374151'}; padding: 2px 8px; border-radius: 4px;">
                            📅 ${dueDate.toLocaleDateString('es-CO')}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ===== DRAG AND DROP HANDLERS =====
function handleDragStart(event, taskId) {
    draggedTask = tasksData.find(t => t.id === taskId);
    event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

async function handleDrop(event) {
    event.preventDefault();
    
    const column = event.target.closest('.task-column');
    if (!column || !draggedTask) return;
    
    const newStatus = column.dataset.status;
    if (draggedTask.status === newStatus) return;
    
    try {
        // Update task status in Firebase
        const taskRef = firebase.database().ref(`tasks/${draggedTask.id}`);
        await taskRef.update({
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser.uid
        });
        
        console.log('✅ Task status updated');
    } catch (error) {
        console.error('❌ Error updating task:', error);
        showNotification('Error al actualizar tarea', 'error');
    }
    
    draggedTask = null;
}

// ===== CREATE TASK MODAL =====
window.showCreateTaskModal = function() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin: 0 0 20px 0; color: #1f2937;">➕ Nueva Tarea</h3>
                
                <form onsubmit="handleCreateTask(event)">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; color: #374151; font-weight: 500;">Título *</label>
                        <input type="text" name="title" required 
                               style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; color: #374151; font-weight: 500;">Descripción</label>
                        <textarea name="description" rows="3" 
                                  style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; color: #374151; font-weight: 500;">Prioridad</label>
                            <select name="priority" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="low">🟢 Baja</option>
                                <option value="medium" selected>🟡 Media</option>
                                <option value="high">🔴 Alta</option>
                                <option value="urgent">🚨 Urgente</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 6px; color: #374151; font-weight: 500;">Fecha de vencimiento</label>
                            <input type="date" name="dueDate" 
                                   style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; color: #374151; font-weight: 500;">Asignar a</label>
                        <select name="assignedTo" id="assigneeSelect" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="${currentUser?.uid}">${currentUser?.email} (Yo)</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="closeModal()" 
                                style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit" 
                                style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Crear Tarea
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Load users for assignment
    loadUsersForAssignment();
};

// ===== CREATE TASK HANDLER =====
window.handleCreateTask = async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const newTask = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        dueDate: formData.get('dueDate'),
        assignedTo: formData.get('assignedTo'),
        assignedToName: document.getElementById('assigneeSelect').options[document.getElementById('assigneeSelect').selectedIndex].text.replace(' (Yo)', ''),
        status: 'todo',
        createdBy: currentUser.uid,
        createdByName: currentUser.email,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    try {
        const tasksRef = firebase.database().ref('tasks');
        await tasksRef.push(newTask);
        
        console.log('✅ Task created successfully');
        showNotification('Tarea creada exitosamente', 'success');
        closeModal();
    } catch (error) {
        console.error('❌ Error creating task:', error);
        showNotification('Error al crear tarea', 'error');
    }
};

// ===== SHOW TASK DETAILS =====
window.showTaskDetails = function(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    const priority = TASK_PRIORITY[task.priority || 'medium'];
    const status = TASK_STATUS[task.status || 'todo'];
    
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #1f2937;">${task.title}</h3>
                    <button onclick="closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <span style="background: ${status.color}20; color: ${status.color}; padding: 6px 12px; border-radius: 6px; font-size: 14px;">
                        ${status.icon} ${status.label}
                    </span>
                    <span style="background: ${priority.color}20; color: ${priority.color}; padding: 6px 12px; border-radius: 6px; font-size: 14px;">
                        ${priority.icon} ${priority.label}
                    </span>
                </div>
                
                ${task.description ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #374151;">Descripción</h4>
                        <p style="margin: 0; color: #6b7280; line-height: 1.6;">${task.description}</p>
                    </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #374151;">Asignado a</h4>
                        <p style="margin: 0; color: #6b7280;">👤 ${task.assignedToName || 'Sin asignar'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #374151;">Fecha de vencimiento</h4>
                        <p style="margin: 0; color: #6b7280;">📅 ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-CO') : 'Sin fecha'}</p>
                    </div>
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                    <h4 style="margin: 0 0 12px 0; color: #374151;">Cambiar estado</h4>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${Object.entries(TASK_STATUS).map(([statusKey, statusConfig]) => `
                            <button onclick="updateTaskStatus('${task.id}', '${statusKey}')" 
                                    style="padding: 8px 16px; background: ${task.status === statusKey ? statusConfig.color : '#f3f4f6'}; 
                                           color: ${task.status === statusKey ? 'white' : '#374151'}; 
                                           border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                                ${statusConfig.icon} ${statusConfig.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                ${(isAdmin || task.createdBy === currentUser?.uid) ? `
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <button onclick="showEditTaskModal('${task.id}')" 
                                style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            ✏️ Editar
                        </button>
                        <button onclick="deleteTask('${task.id}')" 
                                style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            🗑️ Eliminar
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
};

// ===== UPDATE TASK STATUS =====
window.updateTaskStatus = async function(taskId, newStatus) {
    try {
        const taskRef = firebase.database().ref(`tasks/${taskId}`);
        await taskRef.update({
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser.uid
        });
        
        console.log('✅ Task status updated');
        showNotification('Estado actualizado', 'success');
        closeModal();
    } catch (error) {
        console.error('❌ Error updating status:', error);
        showNotification('Error al actualizar estado', 'error');
    }
};

// ===== DELETE TASK =====
window.deleteTask = async function(taskId) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
        const taskRef = firebase.database().ref(`tasks/${taskId}`);
        await taskRef.remove();
        
        console.log('✅ Task deleted');
        showNotification('Tarea eliminada', 'success');
        closeModal();
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        showNotification('Error al eliminar tarea', 'error');
    }
};

// ===== FILTERS =====
function getFilteredTasks() {
    let filtered = [...tasksData];
    
    // Status filter
    const statusFilter = document.getElementById('filterStatus')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Assignee filter (admin only)
    if (isAdmin) {
        const assigneeFilter = document.getElementById('filterAssignee')?.value;
        if (assigneeFilter && assigneeFilter !== 'all') {
            filtered = filtered.filter(task => task.assignedTo === assigneeFilter);
        }
    }
    
    // Priority filter
    const priorityFilter = document.getElementById('filterPriority')?.value;
    if (priorityFilter && priorityFilter !== 'all') {
        filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    return filtered;
}

window.applyFilters = function() {
    renderTasks();
};

window.clearFilters = function() {
    document.getElementById('filterStatus').value = 'all';
    if (document.getElementById('filterAssignee')) {
        document.getElementById('filterAssignee').value = 'all';
    }
    document.getElementById('filterPriority').value = 'all';
    renderTasks();
};

// ===== LOAD USERS FOR ASSIGNMENT =====
async function loadUsersForAssignment() {
    if (!window.FirebaseData) return;
    
    try {
        const users = await window.FirebaseData.getAllUsers();
        const select = document.getElementById('assigneeSelect');
        if (!select) return;
        
        select.innerHTML = `<option value="${currentUser?.uid}">${currentUser?.email} (Yo)</option>`;
        
        Object.entries(users).forEach(([uid, user]) => {
            if (uid !== currentUser?.uid) {
                const option = document.createElement('option');
                option.value = uid;
                option.textContent = user.name || user.email;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ===== UPDATE ASSIGNEE FILTER =====
function updateAssigneeFilter() {
    if (!isAdmin) return;
    
    const select = document.getElementById('filterAssignee');
    if (!select) return;
    
    // Get unique assignees from tasks
    const assignees = new Map();
    tasksData.forEach(task => {
        if (task.assignedTo && task.assignedToName) {
            assignees.set(task.assignedTo, task.assignedToName);
        }
    });
    
    select.innerHTML = '<option value="all">Todos los usuarios</option>';
    assignees.forEach((name, uid) => {
        const option = document.createElement('option');
        option.value = uid;
        option.textContent = name;
        select.appendChild(option);
    });
}

// ===== UTILITY FUNCTIONS =====
window.closeModal = function(event) {
    if (!event || event.target.classList.contains('modal-overlay')) {
        document.getElementById('modalContainer').innerHTML = '';
    }
};

window.refreshTasks = function() {
    setupTasksListener();
    showNotification('Tareas actualizadas', 'success');
};

function showNotification(message, type = 'success') {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

function showError(message) {
    const kanbanBoard = document.getElementById('kanbanBoard');
    if (kanbanBoard) {
        kanbanBoard.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 40px;">
                <div style="background: #fee2e2; color: #dc2626; padding: 20px; border-radius: 8px;">
                    <h3>❌ Error</h3>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
}

// ===== ADD STYLES =====
function addTaskStyles() {
    if (document.getElementById('task-management-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'task-management-styles';
    style.textContent = `
        .task-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .task-column {
            transition: background-color 0.2s;
        }
        
        .task-column.drag-over {
            background-color: #f3f4f6;
        }
        
        .modal-overlay {
            animation: fadeIn 0.2s ease-out;
        }
        
        .modal-content {
            animation: slideIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .kanban-column {
            transition: box-shadow 0.2s;
        }
        
        .kanban-column:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
    `;
    
    document.head.appendChild(style);
}

console.log('✅ Task Management System loaded successfully');
