// tasks.js - TASK MANAGEMENT MODULE
// ===== STANDALONE TASK MANAGEMENT SYSTEM =====

// Global variables for tasks module
let tasksData = [];
let tasksInitialized = false;
let currentFilter = 'all';
let taskCategories = ['Sales', 'Admin', 'Marketing', 'Customer Service'];

// Task status configurations
const TASK_STATUS = {
    pending: { label: 'Pendiente', color: '#6b7280', emoji: '⏳' },
    in_progress: { label: 'En Progreso', color: '#3b82f6', emoji: '🔄' },
    completed: { label: 'Completado', color: '#10b981', emoji: '✅' },
    overdue: { label: 'Vencido', color: '#ef4444', emoji: '❌' }
};

// Priority configurations
const TASK_PRIORITY = {
    low: { label: 'Baja', color: '#10b981', emoji: '🟢' },
    medium: { label: 'Media', color: '#f59e0b', emoji: '🟡' },
    high: { label: 'Alta', color: '#ef4444', emoji: '🔴' }
};

// ===== MAIN TASK LOADING FUNCTION =====
async function loadTasksData() {
    try {
        console.log('📋 Loading tasks data');
        
        const container = document.getElementById('tasksContainer');
        if (!container) {
            console.error('❌ Tasks container not found');
            return;
        }
        
        // Initialize with empty data to show UI immediately
        tasksData = [];
        renderTasksView();
        
        // Check if Firebase and user are available
        if (window.FirebaseData && window.FirebaseData.currentUser && typeof firebase !== 'undefined') {
            console.log('✅ Firebase and user available, setting up listener');
            setupTasksListener();
        } else {
            console.log('⏳ Waiting for Firebase to be ready...');
            
            // Try again in a moment
            setTimeout(() => {
                if (window.FirebaseData && window.FirebaseData.currentUser && typeof firebase !== 'undefined') {
                    setupTasksListener();
                } else {
                    console.log('📋 Firebase not ready yet, showing empty state');
                }
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Error loading tasks:', error);
        // Show empty state instead of error
        tasksData = [];
        renderTasksView();
    }
}

// ===== FIREBASE REALTIME DATABASE LISTENERS =====
function setupTasksListener() {
    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.database) {
            console.error('❌ Firebase not available');
            tasksData = [];
            renderTasksView();
            return;
        }
        
        const currentUser = window.FirebaseData && window.FirebaseData.currentUser;
        if (!currentUser) {
            console.error('❌ No current user found');
            tasksData = [];
            renderTasksView();
            return;
        }
        
        console.log('📋 Setting up tasks listener for user:', currentUser.uid);
        
        // Reference to tasks in Realtime Database
        const tasksRef = firebase.database().ref('tasks');
        
        // Listen to all tasks
        tasksRef.on('value', (snapshot) => {
            tasksData = [];
            const allTasks = snapshot.val() || {};
            
            // Convert object to array and filter by user
            Object.keys(allTasks).forEach(taskId => {
                const task = allTasks[taskId];
                if (task.participants && task.participants.includes(currentUser.uid)) {
                    tasksData.push({ id: taskId, ...task });
                }
            });
            
            console.log(`✅ Loaded ${tasksData.length} tasks`);
            
            // Update overdue status
            updateOverdueStatus();
            
            // Render tasks view
            renderTasksView();
        }, (error) => {
            console.error('❌ Error listening to tasks:', error);
            // Show empty state instead of error
            tasksData = [];
            renderTasksView();
        });
        
    } catch (error) {
        console.error('❌ Error setting up tasks listener:', error);
        tasksData = [];
        renderTasksView();
    }
}

// ===== TASK CRUD OPERATIONS WITH REALTIME DATABASE =====
async function handleCreateTask(event) {
    event.preventDefault();
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
        showNotification('❌ Firebase no está disponible', 'error');
        return;
    }
    
    const form = event.target;
    const formData = new FormData(form);
    
    const currentUser = window.FirebaseData && window.FirebaseData.currentUser;
    if (!currentUser) {
        showNotification('❌ Usuario no autenticado', 'error');
        return;
    }
    
    const assignedTo = formData.get('assignedTo') || currentUser.uid;
    const assignedToText = form.assignedTo && form.assignedTo.selectedIndex >= 0 
        ? form.assignedTo.options[form.assignedTo.selectedIndex].text 
        : 'Usuario';
    
    const newTask = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        startDate: formData.get('startDate'),
        dueDate: formData.get('dueDate'),
        assignedTo: assignedTo,
        assignedToName: assignedToText,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email || 'Usuario',
        createdDate: new Date().toISOString(),
        status: 'pending',
        progress: 0,
        notes: [],
        participants: [currentUser.uid, assignedTo].filter(unique)
    };
    
    try {
        // Create task in Realtime Database
        const tasksRef = firebase.database().ref('tasks');
        await tasksRef.push(newTask);
        
        showNotification('✅ Tarea creada exitosamente', 'success');
        closeModal();
        
    } catch (error) {
        console.error('Error creating task:', error);
        showNotification('❌ Error al crear tarea', 'error');
    }
}

async function handleUpdateProgress(event, taskId) {
    event.preventDefault();
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
        showNotification('❌ Firebase no está disponible', 'error');
        return;
    }
    
    const form = event.target;
    const formData = new FormData(form);
    
    const currentUser = window.FirebaseData && window.FirebaseData.currentUser;
    if (!currentUser) {
        showNotification('❌ Usuario no autenticado', 'error');
        return;
    }
    
    const progress = parseInt(formData.get('progress'));
    const note = formData.get('note');
    const markComplete = formData.get('markComplete');
    
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    try {
        const updates = {
            progress: markComplete ? 100 : progress,
            status: markComplete || progress === 100 ? 'completed' : task.status,
            lastUpdated: new Date().toISOString()
        };
        
        // Add note if provided
        if (note) {
            const newNote = {
                date: new Date().toISOString(),
                note: note,
                author: currentUser.uid,
                authorName: currentUser.displayName || currentUser.email || 'Usuario',
                progress: updates.progress
            };
            
            updates.notes = [...(task.notes || []), newNote];
        }
        
        // Update in Realtime Database
        const taskRef = firebase.database().ref(`tasks/${taskId}`);
        await taskRef.update(updates);
        
        showNotification('✅ Progreso actualizado', 'success');
        closeModal();
        
    } catch (error) {
        console.error('Error updating progress:', error);
        showNotification('❌ Error al actualizar progreso', 'error');
    }
}

async function markTaskComplete(taskId) {
    if (!confirm('¿Marcar esta tarea como completada?')) return;
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
        showNotification('❌ Firebase no está disponible', 'error');
        return;
    }
    
    try {
        const taskRef = firebase.database().ref(`tasks/${taskId}`);
        await taskRef.update({
            status: 'completed',
            progress: 100,
            completedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        
        showNotification('✅ Tarea completada', 'success');
        closeModal();
        
    } catch (error) {
        console.error('Error completing task:', error);
        showNotification('❌ Error al completar tarea', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de eliminar esta tarea? Esta acción no se puede deshacer.')) return;
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
        showNotification('❌ Firebase no está disponible', 'error');
        return;
    }
    
    try {
        const taskRef = firebase.database().ref(`tasks/${taskId}`);
        await taskRef.remove();
        
        showNotification('✅ Tarea eliminada', 'success');
        closeModal();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('❌ Error al eliminar tarea', 'error');
    }
}

function updateOverdueStatus() {
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.warn('⚠️ Cannot update overdue status - Firebase not available');
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tasksData.forEach(task => {
        if (task.status !== 'completed') {
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today && task.status !== 'overdue') {
                // Update to overdue in Realtime Database
                const taskRef = firebase.database().ref(`tasks/${task.id}`);
                taskRef.update({ status: 'overdue' }).catch(error => {
                    console.error('Error updating overdue status:', error);
                });
            }
        }
    });
}

// ===== TASK RENDERING =====
function renderTasksView() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    const filteredTasks = filterTasks(tasksData);
    const taskStats = calculateTaskStats(filteredTasks);
    
    container.innerHTML = `
        ${renderTasksHeader(taskStats)}
        ${renderTasksFilters()}
        ${renderTasksList(filteredTasks)}
    `;
    
    // Initialize task styles
    initializeTaskStyles();
}

function renderTasksHeader(stats) {
    return `
        <div style="
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 1.5rem;
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
                margin-bottom: 1.5rem;
            ">
                <h2 style="
                    margin: 0;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    📋 Gestión de Tareas
                    <span style="
                        background: #f3f4f6;
                        color: #6b7280;
                        padding: 0.25rem 0.5rem;
                        border-radius: 12px;
                        font-size: 0.8rem;
                        font-weight: normal;
                    ">
                        ${stats.total} total
                    </span>
                </h2>
                
                <div style="display: flex; gap: 1rem;">
                    <button onclick="showCreateTaskModal()" 
                            class="btn btn-primary"
                            style="
                                padding: 0.75rem 1.5rem;
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            ">
                        ➕ Nueva Tarea
                    </button>
                    
                    <button onclick="showTaskCalendar()" 
                            class="btn btn-secondary"
                            style="padding: 0.75rem 1.5rem;">
                        📅 Calendario
                    </button>
                </div>
            </div>
            
            <!-- Task Statistics -->
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
            ">
                <div style="
                    text-align: center;
                    padding: 1rem;
                    background: #dbeafe;
                    border-radius: 8px;
                ">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                        ${stats.inProgress}
                    </div>
                    <div style="font-size: 0.9rem; color: #1e40af;">En Progreso</div>
                </div>
                
                <div style="
                    text-align: center;
                    padding: 1rem;
                    background: #fef3c7;
                    border-radius: 8px;
                ">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">
                        ${stats.pending}
                    </div>
                    <div style="font-size: 0.9rem; color: #d97706;">Pendientes</div>
                </div>
                
                <div style="
                    text-align: center;
                    padding: 1rem;
                    background: #d1fae5;
                    border-radius: 8px;
                ">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                        ${stats.completed}
                    </div>
                    <div style="font-size: 0.9rem; color: #059669;">Completadas</div>
                </div>
                
                <div style="
                    text-align: center;
                    padding: 1rem;
                    background: #fee2e2;
                    border-radius: 8px;
                ">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">
                        ${stats.overdue}
                    </div>
                    <div style="font-size: 0.9rem; color: #dc2626;">Vencidas</div>
                </div>
            </div>
        </div>
    `;
}

function renderTasksFilters() {
    return `
        <div style="
            background: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        ">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button onclick="setTaskFilter('all')" 
                        class="filter-btn ${currentFilter === 'all' ? 'active' : ''}"
                        style="
                            padding: 0.5rem 1rem;
                            border: 1px solid #e5e7eb;
                            background: ${currentFilter === 'all' ? '#3b82f6' : 'white'};
                            color: ${currentFilter === 'all' ? 'white' : '#374151'};
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.85rem;
                        ">
                    Todas
                </button>
                
                <button onclick="setTaskFilter('my_tasks')" 
                        class="filter-btn ${currentFilter === 'my_tasks' ? 'active' : ''}"
                        style="
                            padding: 0.5rem 1rem;
                            border: 1px solid #e5e7eb;
                            background: ${currentFilter === 'my_tasks' ? '#3b82f6' : 'white'};
                            color: ${currentFilter === 'my_tasks' ? 'white' : '#374151'};
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.85rem;
                        ">
                    Mis Tareas
                </button>
                
                <button onclick="setTaskFilter('assigned')" 
                        class="filter-btn ${currentFilter === 'assigned' ? 'active' : ''}"
                        style="
                            padding: 0.5rem 1rem;
                            border: 1px solid #e5e7eb;
                            background: ${currentFilter === 'assigned' ? '#3b82f6' : 'white'};
                            color: ${currentFilter === 'assigned' ? 'white' : '#374151'};
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.85rem;
                        ">
                    Asignadas por mí
                </button>
                
                <button onclick="setTaskFilter('overdue')" 
                        class="filter-btn ${currentFilter === 'overdue' ? 'active' : ''}"
                        style="
                            padding: 0.5rem 1rem;
                            border: 1px solid #e5e7eb;
                            background: ${currentFilter === 'overdue' ? '#3b82f6' : 'white'};
                            color: ${currentFilter === 'overdue' ? 'white' : '#374151'};
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.85rem;
                        ">
                    Vencidas
                </button>
            </div>
            
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <label style="font-size: 0.85rem; color: #6b7280;">Categoría:</label>
                <select onchange="filterByCategory(this.value)" style="
                    padding: 0.5rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    font-size: 0.85rem;
                ">
                    <option value="all">Todas</option>
                    ${taskCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
            </div>
        </div>
    `;
}

function renderTasksList(tasks) {
    if (tasks.length === 0) {
        return renderEmptyTasks();
    }
    
    // Group tasks by status
    const groupedTasks = {
        overdue: tasks.filter(t => t.status === 'overdue'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        pending: tasks.filter(t => t.status === 'pending'),
        completed: tasks.filter(t => t.status === 'completed')
    };
    
    return `
        <div style="display: grid; gap: 1.5rem;">
            ${Object.entries(groupedTasks).map(([status, statusTasks]) => {
                if (statusTasks.length === 0) return '';
                
                return `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        overflow: hidden;
                    ">
                        <div style="
                            padding: 1rem;
                            background: ${TASK_STATUS[status].color}15;
                            border-bottom: 1px solid #e5e7eb;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <span style="font-size: 1.2rem;">${TASK_STATUS[status].emoji}</span>
                            <span style="font-weight: 600; color: ${TASK_STATUS[status].color};">
                                ${TASK_STATUS[status].label} (${statusTasks.length})
                            </span>
                        </div>
                        
                        <div style="padding: 1rem;">
                            ${statusTasks.map(task => renderTaskCard(task)).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderTaskCard(task) {
    const priority = TASK_PRIORITY[task.priority || 'medium'];
    const assignedUser = task.assignedToName || 'Sin asignar';
    const progressPercent = task.progress || 0;
    const daysUntilDue = calculateDaysUntilDue(task.dueDate);
    
    return `
        <div class="task-card" 
             onclick="showTaskDetails('${task.id}')"
             style="
                 background: #f9fafb;
                 border: 1px solid #e5e7eb;
                 border-radius: 8px;
                 padding: 1rem;
                 margin-bottom: 0.75rem;
                 cursor: pointer;
                 transition: all 0.2s ease;
                 position: relative;
             ">
            
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.75rem;
            ">
                <div style="flex: 1;">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-bottom: 0.5rem;
                    ">
                        <span style="font-size: 1rem;">${priority.emoji}</span>
                        <h4 style="margin: 0; color: #374151; font-size: 1rem;">
                            ${task.title}
                        </h4>
                    </div>
                    
                    <div style="
                        font-size: 0.85rem;
                        color: #6b7280;
                        margin-bottom: 0.5rem;
                    ">
                        ${task.description || 'Sin descripción'}
                    </div>
                    
                    <div style="
                        display: flex;
                        gap: 1rem;
                        font-size: 0.8rem;
                        color: #6b7280;
                    ">
                        <span>👤 ${assignedUser}</span>
                        <span>📁 ${task.category}</span>
                        <span>📅 ${formatDate(task.dueDate)}</span>
                    </div>
                </div>
                
                <button onclick="event.stopPropagation(); showUpdateProgressModal('${task.id}')"
                        style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        "
                        onmouseover="this.style.opacity='0.8'"
                        onmouseout="this.style.opacity='1'">
                    Actualizar
                </button>
            </div>
            
            <!-- Progress Bar -->
            <div style="
                background: #e5e7eb;
                height: 8px;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            ">
                <div style="
                    background: ${progressPercent === 100 ? '#10b981' : '#3b82f6'};
                    height: 100%;
                    width: ${progressPercent}%;
                    transition: width 0.3s ease;
                "></div>
            </div>
            
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.8rem;
            ">
                <span style="color: #6b7280;">${progressPercent}% completado</span>
                ${daysUntilDue !== null ? `
                    <span style="color: ${daysUntilDue < 0 ? '#ef4444' : daysUntilDue <= 3 ? '#f59e0b' : '#6b7280'};">
                        ${daysUntilDue < 0 ? `Vencido hace ${Math.abs(daysUntilDue)} días` : 
                          daysUntilDue === 0 ? 'Vence hoy' : 
                          `Vence en ${daysUntilDue} días`}
                    </span>
                ` : ''}
            </div>
            
            ${task.notes && task.notes.length > 0 ? `
                <div style="
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid #e5e7eb;
                    font-size: 0.75rem;
                    color: #6b7280;
                ">
                    💬 ${task.notes.length} nota${task.notes.length > 1 ? 's' : ''}
                </div>
            ` : ''}
        </div>
    `;
}

function renderEmptyTasks() {
    return `
        <div style="
            text-align: center;
            padding: 4rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
            <h3 style="margin: 0 0 1rem 0; color: #374151;">No hay tareas</h3>
            <p style="color: #6b7280; margin-bottom: 2rem;">
                ${currentFilter === 'all' ? 'No hay tareas creadas aún' : 'No hay tareas que coincidan con el filtro'}
            </p>
            <button onclick="showCreateTaskModal()" class="btn btn-primary">
                ➕ Crear Primera Tarea
            </button>
        </div>
    `;
}

// ===== TASK MODALS =====
function showCreateTaskModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>➕ Nueva Tarea</h3>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="createTaskForm" onsubmit="handleCreateTask(event)">
                    <div class="form-group">
                        <label>Título *</label>
                        <input type="text" name="title" required 
                               placeholder="Ej: Visitar escuelas en Pereira"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>
                    
                    <div class="form-group">
                        <label>Descripción</label>
                        <textarea name="description" rows="3"
                                  placeholder="Detalles de la tarea..."
                                  style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;"></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Categoría *</label>
                            <select name="category" required
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                ${taskCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Prioridad *</label>
                            <select name="priority" required
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <option value="low">🟢 Baja</option>
                                <option value="medium" selected>🟡 Media</option>
                                <option value="high">🔴 Alta</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Fecha Inicio *</label>
                            <input type="date" name="startDate" required
                                   value="${new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        
                        <div class="form-group">
                            <label>Fecha Vencimiento *</label>
                            <input type="date" name="dueDate" required
                                   min="${new Date().toISOString().split('T')[0]}"
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Asignar a *</label>
                        <select name="assignedTo" required
                                style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            <option value="">Seleccionar usuario...</option>
                            ${renderUserOptions()}
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Crear Tarea
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showUpdateProgressModal(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>📊 Actualizar Progreso</h3>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <h4 style="margin: 0 0 1rem 0; color: #374151;">${task.title}</h4>
                
                <form id="updateProgressForm" onsubmit="handleUpdateProgress(event, '${taskId}')">
                    <div class="form-group">
                        <label>Progreso: <span id="progressValue">${task.progress || 0}%</span></label>
                        <input type="range" name="progress" 
                               min="0" max="100" 
                               value="${task.progress || 0}"
                               oninput="document.getElementById('progressValue').textContent = this.value + '%'"
                               style="width: 100%;">
                        
                        <div style="
                            background: #e5e7eb;
                            height: 8px;
                            border-radius: 4px;
                            overflow: hidden;
                            margin-top: 0.5rem;
                        ">
                            <div id="progressBar" style="
                                background: ${task.progress === 100 ? '#10b981' : '#3b82f6'};
                                height: 100%;
                                width: ${task.progress || 0}%;
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Agregar Nota</label>
                        <textarea name="note" rows="3"
                                  placeholder="Describe el progreso realizado..."
                                  style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px;"></textarea>
                    </div>
                    
                    ${task.progress !== 100 ? `
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="markComplete" onchange="toggleCompleteProgress(this)">
                                Marcar como completada
                            </label>
                        </div>
                    ` : ''}
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Actualizar
                        </button>
                    </div>
                </form>
                
                ${task.notes && task.notes.length > 0 ? `
                    <div style="
                        margin-top: 2rem;
                        padding-top: 1rem;
                        border-top: 1px solid #e5e7eb;
                    ">
                        <h5 style="margin: 0 0 1rem 0; color: #374151;">📝 Notas Anteriores</h5>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${task.notes.map(note => `
                                <div style="
                                    background: #f9fafb;
                                    padding: 0.75rem;
                                    border-radius: 6px;
                                    margin-bottom: 0.5rem;
                                ">
                                    <div style="
                                        font-size: 0.8rem;
                                        color: #6b7280;
                                        margin-bottom: 0.25rem;
                                    ">
                                        ${note.authorName} - ${formatDateTime(note.date)}
                                    </div>
                                    <div style="font-size: 0.9rem; color: #374151;">
                                        ${note.note}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update progress bar on slider change
    const slider = modal.querySelector('input[type="range"]');
    slider.addEventListener('input', function() {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = this.value + '%';
        progressBar.style.background = this.value === '100' ? '#10b981' : '#3b82f6';
    });
}

function showTaskDetails(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>📋 Detalles de Tarea</h3>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                ">
                    <div>
                        <h2 style="margin: 0 0 0.5rem 0; color: #374151;">
                            ${TASK_PRIORITY[task.priority].emoji} ${task.title}
                        </h2>
                        <p style="color: #6b7280; margin: 0;">
                            ${task.description || 'Sin descripción'}
                        </p>
                    </div>
                    
                    <span style="
                        background: ${TASK_STATUS[task.status].color}15;
                        color: ${TASK_STATUS[task.status].color};
                        padding: 0.5rem 1rem;
                        border-radius: 20px;
                        font-weight: 600;
                        font-size: 0.9rem;
                    ">
                        ${TASK_STATUS[task.status].emoji} ${TASK_STATUS[task.status].label}
                    </span>
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <div style="
                        background: #f9fafb;
                        padding: 1rem;
                        border-radius: 8px;
                    ">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">
                            Asignado a
                        </div>
                        <div style="font-weight: 600; color: #374151;">
                            👤 ${task.assignedToName || 'Sin asignar'}
                        </div>
                    </div>
                    
                    <div style="
                        background: #f9fafb;
                        padding: 1rem;
                        border-radius: 8px;
                    ">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">
                            Creado por
                        </div>
                        <div style="font-weight: 600; color: #374151;">
                            👤 ${task.createdByName || 'Desconocido'}
                        </div>
                    </div>
                    
                    <div style="
                        background: #f9fafb;
                        padding: 1rem;
                        border-radius: 8px;
                    ">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">
                            Fecha Inicio
                        </div>
                        <div style="font-weight: 600; color: #374151;">
                            📅 ${formatDate(task.startDate)}
                        </div>
                    </div>
                    
                    <div style="
                        background: #f9fafb;
                        padding: 1rem;
                        border-radius: 8px;
                    ">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">
                            Fecha Vencimiento
                        </div>
                        <div style="font-weight: 600; color: #374151;">
                            📅 ${formatDate(task.dueDate)}
                        </div>
                    </div>
                </div>
                
                <!-- Progress Section -->
                <div style="margin-bottom: 2rem;">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 0.5rem;
                    ">
                        <label style="font-weight: 600; color: #374151;">Progreso</label>
                        <span style="font-weight: 600; color: #3b82f6;">${task.progress || 0}%</span>
                    </div>
                    <div style="
                        background: #e5e7eb;
                        height: 12px;
                        border-radius: 6px;
                        overflow: hidden;
                    ">
                        <div style="
                            background: ${task.progress === 100 ? '#10b981' : '#3b82f6'};
                            height: 100%;
                            width: ${task.progress || 0}%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div style="
                    display: flex;
                    gap: 1rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                ">
                    <button onclick="closeModal(); showUpdateProgressModal('${taskId}')" 
                            class="btn btn-primary">
                        📊 Actualizar Progreso
                    </button>
                    
                    ${task.status !== 'completed' ? `
                        <button onclick="markTaskComplete('${taskId}')" 
                                class="btn btn-success">
                            ✅ Marcar Completada
                        </button>
                    ` : ''}
                    
                    <button onclick="deleteTask('${taskId}')" 
                            class="btn btn-danger">
                        🗑️ Eliminar
                    </button>
                </div>
                
                <!-- Notes History -->
                ${task.notes && task.notes.length > 0 ? `
                    <div style="margin-top: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; color: #374151;">📝 Historial de Notas</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${task.notes.map(note => `
                                <div style="
                                    background: #f9fafb;
                                    padding: 1rem;
                                    border-radius: 8px;
                                    margin-bottom: 0.75rem;
                                    border-left: 3px solid #3b82f6;
                                ">
                                    <div style="
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;
                                        margin-bottom: 0.5rem;
                                    ">
                                        <span style="
                                            font-weight: 600;
                                            color: #374151;
                                            font-size: 0.9rem;
                                        ">
                                            ${note.authorName}
                                        </span>
                                        <span style="
                                            font-size: 0.8rem;
                                            color: #6b7280;
                                        ">
                                            ${formatDateTime(note.date)}
                                        </span>
                                    </div>
                                    <div style="color: #4b5563;">
                                        ${note.note}
                                    </div>
                                    ${note.progress !== undefined ? `
                                        <div style="
                                            margin-top: 0.5rem;
                                            font-size: 0.8rem;
                                            color: #6b7280;
                                        ">
                                            Progreso actualizado a: ${note.progress}%
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== UTILITY FUNCTIONS =====
function filterTasks(tasks) {
    const currentUser = window.FirebaseData && window.FirebaseData.currentUser;
    
    if (!currentUser) {
        return tasks;
    }
    
    switch (currentFilter) {
        case 'my_tasks':
            return tasks.filter(t => t.assignedTo === currentUser.uid);
        case 'assigned':
            return tasks.filter(t => t.createdBy === currentUser.uid && t.assignedTo !== currentUser.uid);
        case 'overdue':
            return tasks.filter(t => t.status === 'overdue');
        default:
            return tasks;
    }
}

function setTaskFilter(filter) {
    currentFilter = filter;
    renderTasksView();
}

function filterByCategory(category) {
    // Implement category filtering
    console.log('Filter by category:', category);
    renderTasksView();
}

function calculateTaskStats(tasks) {
    return {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status === 'overdue').length
    };
}

function calculateDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

function formatDateTime(dateString) {
    if (!dateString) return 'Sin fecha';
    
    const date = new Date(dateString);
    const options = { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return date.toLocaleDateString('es-ES', options);
}

function unique(value, index, self) {
    return self.indexOf(value) === index;
}

function renderUserOptions() {
    const currentUser = window.FirebaseData && window.FirebaseData.currentUser;
    
    if (currentUser) {
        return `
            <option value="${currentUser.uid}" selected>
                Yo (${currentUser.displayName || currentUser.email || 'Usuario actual'})
            </option>
            <option value="user2">Otro usuario</option>
        `;
    }
    
    return `
        <option value="">Seleccionar usuario...</option>
        <option value="current">Usuario actual</option>
    `;
}

function toggleCompleteProgress(checkbox) {
    const progressSlider = checkbox.form.querySelector('input[name="progress"]');
    const progressValue = document.getElementById('progressValue');
    const progressBar = document.getElementById('progressBar');
    
    if (checkbox.checked) {
        progressSlider.value = 100;
        progressValue.textContent = '100%';
        progressBar.style.width = '100%';
        progressBar.style.background = '#10b981';
        progressSlider.disabled = true;
    } else {
        progressSlider.disabled = false;
    }
}

// ===== MODAL FUNCTIONS =====
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function showNotification(message, type = 'info', duration = 3000) {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type, duration);
    } else {
        alert(message);
    }
}

// ===== CALENDAR VIEW =====
function showTaskCalendar() {
    alert('📅 Vista de calendario - Próximamente');
}

// ===== LOADING AND ERROR STATES =====
function showTasksLoading() {
    const container = document.getElementById('tasksContainer');
    if (container) {
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                color: #6b7280;
            ">
                <div style="text-align: center;">
                    <div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 1rem;"></div>
                    <div>Cargando tareas...</div>
                </div>
            </div>
        `;
    }
}

function showTasksError(message) {
    const container = document.getElementById('tasksContainer');
    if (container) {
        container.innerHTML = `
            <div style="
                text-align: center;
                color: #dc2626;
                padding: 3rem;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            ">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin: 0 0 1rem 0;">Error en Tareas</h3>
                <p style="margin: 0 0 1rem 0; color: #6b7280;">${message}</p>
                <button onclick="loadTasksData()" class="btn btn-primary">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

// ===== STYLES =====
function initializeTaskStyles() {
    if (document.getElementById('task-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'task-styles';
    style.textContent = `
        .task-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            max-height: 90vh;
            overflow-y: auto;
            margin: 20px;
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #374151;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .close-btn:hover {
            background: #f3f4f6;
            color: #374151;
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 1.25rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #374151;
            font-size: 0.9rem;
        }
        
        .form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
        }
        
        .btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }
        
        .btn-secondary:hover {
            background: #d1d5db;
        }
        
        .btn-success {
            background: #10b981;
            color: white;
        }
        
        .btn-success:hover {
            background: #059669;
        }
        
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        
        .btn-danger:hover {
            background: #dc2626;
        }
    `;
    
    document.head.appendChild(style);
}

// ===== MODULE INITIALIZATION =====
function initializeTasksModule() {
    console.log('📋 Initializing tasks module');
    
    if (tasksInitialized) {
        console.log('⚠️ Tasks module already initialized');
        return;
    }
    
    try {
        initializeTaskStyles();
        tasksInitialized = true;
        console.log('✅ Tasks module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing tasks module:', error);
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Tasks module DOM ready');
    initializeTasksModule();
});

// ===== GLOBAL FUNCTION ASSIGNMENTS =====
window.loadTasksData = loadTasksData;
window.showCreateTaskModal = showCreateTaskModal;
window.showUpdateProgressModal = showUpdateProgressModal;
window.showTaskDetails = showTaskDetails;
window.handleCreateTask = handleCreateTask;
window.handleUpdateProgress = handleUpdateProgress;
window.markTaskComplete = markTaskComplete;
window.deleteTask = deleteTask;
window.setTaskFilter = setTaskFilter;
window.filterByCategory = filterByCategory;
window.showTaskCalendar = showTaskCalendar;
window.toggleCompleteProgress = toggleCompleteProgress;
window.closeModal = closeModal;

console.log('✅ Tasks.js module loaded successfully!');
