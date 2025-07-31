// simple-tasks.js - Task Management System (Phase 1) - FIREBASE V10 FIXED VERSION
console.log('📋 Task Management System loading...');

// ========================================
// SECTION 1: GLOBAL VARIABLES AND CONFIGURATIONS
// ========================================
let tasksData = [];
let currentFilter = 'all';
// Use existing currentUser from index.html - don't redeclare
let isAdmin = false;
let draggedTask = null;
let tasksListener = null; // Store listener reference

// Task status configurations
const TASK_STATUS = {
    todo: { label: 'Por Hacer', color: '#6b7280', icon: '📝' },
    in_progress: { label: 'En Progreso', color: '#3b82f6', icon: '🔄' },
    review: { label: 'En Revisión', color: '#f59e0b', icon: '👀' },
    done: { label: 'Completado', color: '#10b981', icon: '✅' }
};

// Task priority configurations
const TASK_PRIORITY = {
    low: { label: 'Baja', color: '#10b981', icon: '🟢' },
    medium: { label: 'Media', color: '#f59e0b', icon: '🟡' },
    high: { label: 'Alta', color: '#ef4444', icon: '🔴' },
    urgent: { label: 'Urgente', color: '#dc2626', icon: '🚨' }
};

// ========================================
// SECTION 2: MAIN INITIALIZATION
// ========================================
// Create the main function that will be called
async function loadTasksMain() {
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
}

// IMMEDIATE OVERRIDE - Don't wait
console.log('📋 Overriding loadTasks function...');
window.loadTasksData = loadTasksMain;  // Add "Data" to match what the tab system expects
window.initializeTasksModule = loadTasksMain;  

// ========================================
// SECTION 3: UI RENDERING
// ========================================
function renderTasksUI() {
    const tasksContainer = document.getElementById('tasks');
    
    tasksContainer.innerHTML = `
        <!-- Header -->
        <h2>📋 Gestión de Tareas</h2>
        <p style="color: #6b7280; margin-bottom: 20px;">Vista de ${isAdmin ? 'Administrador - Todas las tareas' : 'Empleado - Mis tareas'}</p>
        
        <!-- Action Bar -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
            <button onclick="showCreateTaskModal()" class="btn btn-primary">➕ Nueva Tarea</button>
            <button onclick="refreshTasks()" class="btn" style="background: #6b7280; color: white;">🔄 Actualizar</button>
        </div>
        
        <!-- Filters -->
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Filtros:</h4>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <select id="filterStatus" onchange="applyFilters()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                    <option value="all">Todos los estados</option>
                    <option value="todo">📝 Por Hacer</option>
                    <option value="in_progress">🔄 En Progreso</option>
                    <option value="review">👀 En Revisión</option>
                    <option value="done">✅ Completado</option>
                </select>
                
                ${isAdmin ? `
                    <select id="filterAssignee" onchange="applyFilters()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="all">Todos los usuarios</option>
                    </select>
                ` : ''}
                
                <select id="filterPriority" onchange="applyFilters()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                    <option value="all">Todas las prioridades</option>
                    <option value="low">🟢 Baja</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🔴 Alta</option>
                    <option value="urgent">🚨 Urgente</option>
                </select>
                
                <button onclick="clearFilters()" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    ❌ Limpiar
                </button>
            </div>
        </div>
        
        <!-- Kanban Board -->
        <div id="kanbanBoard" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            ${Object.entries(TASK_STATUS).map(([key, status]) => `
                <div class="kanban-column" style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: ${status.color}; font-size: 16px;">
                            ${status.icon} ${status.label}
                        </h3>
                        <span id="count-${key}" style="background: ${status.color}20; color: ${status.color}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            0
                        </span>
                    </div>
                    <div id="column-${key}" class="task-column" style="min-height: 300px;" 
                         ondrop="handleDrop(event, '${key}')" 
                         ondragover="handleDragOver(event)"
                         ondragleave="handleDragLeave(event)">
                        <div style="text-align: center; color: #9ca3af; padding: 40px;">
                            <div class="loading-spinner" style="width: 30px; height: 30px; margin: 0 auto;"></div>
                            <p style="margin-top: 10px;">Cargando tareas...</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <!-- Modal Container -->
        <div id="modalContainer"></div>
    `;
    
    // Add styles
    addTaskStyles();
}

// ========================================
// DIRECT FIXES FOR EACH FIREBASE SECTION
// ========================================

// SECTION 4 FIX (around line 201):
// Replace the entire setupTasksListener function with this:
function setupTasksListener() {
    try {
        if (!window.firebaseDb || !window.firebaseModules) {
            console.error('❌ Firebase not ready');
            showError('Firebase no está listo todavía. Por favor, recarga la página.');
            return;
        }
        
        console.log('🔥 Setting up Firebase tasks listener...');
        
        // Get Firebase v10 functions
        const { ref, onValue } = window.firebaseModules.database;
        const tasksRef = ref(window.firebaseDb, 'tasks');
        
        onValue(tasksRef, (snapshot) => {
            console.log('📥 Tasks data received from Firebase');
            const data = snapshot.val() || {};
            
            // Convert to array with IDs
            tasksData = Object.entries(data).map(([id, task]) => ({
                id,
                ...task
            }));
            
            // Filter based on user role
            if (!isAdmin) {
                tasksData = tasksData.filter(task => 
                    task.assignedTo === currentUser?.uid || 
                    task.createdBy === currentUser?.uid
                );
            }
            
            console.log(`📋 Loaded ${tasksData.length} tasks`);
            
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
    } catch (error) {
        console.error('❌ Error setting up listener:', error);
        showError('Error al configurar Firebase: ' + error.message);
    }
}

// ========================================
// SECTION 5: TASK RENDERING FUNCTIONS
// ========================================
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

function renderTaskCard(task) {
    const priority = TASK_PRIORITY[task.priority || 'medium'];
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
    
    return `
        <div class="task-card" 
             draggable="true" 
             ondragstart="handleDragStart(event, '${task.id}')"
             onclick="showTaskDetails('${task.id}')"
             style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; ${isOverdue ? 'border-color: #dc2626;' : ''}">
            
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h4 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">${task.title}</h4>
                <span style="font-size: 18px;">${priority.icon}</span>
            </div>
            
            ${task.description ? `
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; line-height: 1.4;">
                    ${task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description}
                </p>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #6b7280;">
                <span>👤 ${task.assignedToName || 'Sin asignar'}</span>
                ${dueDate ? `
                    <span style="${isOverdue ? 'color: #dc2626; font-weight: bold;' : ''}">
                        📅 ${dueDate.toLocaleDateString('es-CO')}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

// SECTION 6 FIX (handleDrop function):
window.handleDrop = async function(event, newStatus) {
    event.preventDefault();
    event.currentTarget.style.backgroundColor = '#f9fafb';
    
    if (!draggedTask) return;
    
    try {
        const { ref, update } = window.firebaseModules.database;
        const taskRef = ref(window.firebaseDb, `tasks/${draggedTask}`);
        
        await update(taskRef, {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser.uid
        });
        
        console.log('✅ Task moved via drag & drop');
        showNotification('Tarea actualizada', 'success');
    } catch (error) {
        console.error('❌ Error updating task:', error);
        showNotification('Error al mover tarea', 'error');
    }
    
    draggedTask = null;
    document.querySelectorAll('.task-card').forEach(card => {
        card.style.opacity = '1';
    });
};

// ========================================
// SECTION 7: CREATE TASK MODAL
// ========================================
window.showCreateTaskModal = function() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%;">
                <h3 style="margin: 0 0 20px 0; color: #1f2937;">➕ Nueva Tarea</h3>
                
                <form onsubmit="createTask(event)">
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
                                style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer;">
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

// SECTION 8 FIX (createTask function):
window.createTask = async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const assigneeSelect = form.assignedTo;
    const assigneeName = assigneeSelect.options[assigneeSelect.selectedIndex].text.split(' (')[0];
    
    const newTask = {
        title: form.title.value,
        description: form.description.value,
        priority: form.priority.value,
        dueDate: form.dueDate.value,
        assignedTo: form.assignedTo.value,
        assignedToName: assigneeName,
        status: 'todo',
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    try {
        const { ref, push } = window.firebaseModules.database;
        const tasksRef = ref(window.firebaseDb, 'tasks');
        await push(tasksRef, newTask);
        
        console.log('✅ Task created successfully');
        showNotification('Tarea creada exitosamente', 'success');
        closeModal();
    } catch (error) {
        console.error('❌ Error creating task:', error);
        showNotification('Error al crear tarea', 'error');
    }
};


// ========================================
// SECTION 9: TASK DETAILS MODAL
// ========================================
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

// SECTION 10 FIX (updateTaskStatus function):
window.updateTaskStatus = async function(taskId, newStatus) {
    try {
        const { ref, update } = window.firebaseModules.database;
        const taskRef = ref(window.firebaseDb, `tasks/${taskId}`);
        
        await update(taskRef, {
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

// SECTION 11 FIX (deleteTask function):
window.deleteTask = async function(taskId) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
        const { ref, remove } = window.firebaseModules.database;
        const taskRef = ref(window.firebaseDb, `tasks/${taskId}`);
        await remove(taskRef);
        
        console.log('✅ Task deleted');
        showNotification('Tarea eliminada', 'success');
        closeModal();
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        showNotification('Error al eliminar tarea', 'error');
    }
};

// ========================================
// SECTION 12: FILTER FUNCTIONS
// ========================================
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

// ========================================
// SECTION 13: USER MANAGEMENT FUNCTIONS
// ========================================
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

// ========================================
// SECTION 14: UTILITY FUNCTIONS
// ========================================
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

// ========================================
// SECTION 15: STYLES
// ========================================
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
        
        .loading-spinner {
            border: 3px solid #f3f4f6;
            border-radius: 50%;
            border-top: 3px solid #3b82f6;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(style);
}

console.log('✅ Task Management System loaded successfully');
