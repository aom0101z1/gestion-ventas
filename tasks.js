// tasks.js - Task Management Module - SIMPLIFIED VERSION
// ================================================================================

console.log('📋 Tasks.js loading...');

// ===== GLOBAL VARIABLES =====
window.tasksModuleState = {
    initialized: false,
    tasksData: [],
    currentFilter: 'all'
};

// ===== MAIN FUNCTION - CALLED FROM TAB CLICK =====
window.loadTasksData = function() {
    console.log('📋 loadTasksData called from tab switch');
    
    // Check if already initialized
    if (window.tasksModuleState.initialized) {
        console.log('✅ Tasks already initialized, refreshing view');
        renderTasksView();
        return;
    }
    
    // Initialize the module
    initializeTasksModule();
};

// ===== INITIALIZATION =====
function initializeTasksModule() {
    console.log('🚀 Starting tasks module initialization...');
    
    try {
        // Setup UI first
        setupTasksUI();
        
        // Then setup data listener
        setupTasksListener();
        
        // Mark as initialized
        window.tasksModuleState.initialized = true;
        console.log('✅ Tasks module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing tasks:', error);
        showError('Error al inicializar el módulo de tareas');
    }
}

// ===== UI SETUP =====
function setupTasksUI() {
    console.log('🎨 Setting up tasks UI');
    
    const tabContent = document.querySelector('.tab-content[data-tab="tasks"]');
    if (!tabContent) {
        console.error('❌ Tasks tab content not found');
        return;
    }
    
    tabContent.innerHTML = `
        <div id="tasksContainer">
            <div class="tasks-header">
                <h2>📋 Gestión de Tareas</h2>
                <button onclick="showCreateTaskModal()" class="btn-primary">
                    <i class="icon">➕</i> Nueva Tarea
                </button>
            </div>
            
            <div class="tasks-filters">
                <button class="filter-btn active" data-filter="all" onclick="filterTasks('all')">
                    Todas las Tareas
                </button>
                <button class="filter-btn" data-filter="my-tasks" onclick="filterTasks('my-tasks')">
                    Mis Tareas
                </button>
                <button class="filter-btn" data-filter="assigned-by-me" onclick="filterTasks('assigned-by-me')">
                    Asignadas por Mí
                </button>
                <button class="filter-btn" data-filter="overdue" onclick="filterTasks('overdue')">
                    Vencidas
                </button>
            </div>
            
            <div id="tasksListContainer">
                <div class="loading-spinner"></div>
                <p>Cargando tareas...</p>
            </div>
        </div>
    `;
}

// ===== FIREBASE LISTENER =====
function setupTasksListener() {
    console.log('🔥 Setting up Firebase listener for tasks');
    
    try {
        // Get reference to tasks in Firebase
        const tasksRef = firebase.database().ref('tasks');
        
        // Listen for changes
        tasksRef.on('value', (snapshot) => {
            console.log('📥 Tasks data received from Firebase');
            
            const currentUser = window.FirebaseData.currentUser;
            if (!currentUser) {
                console.error('No user found');
                return;
            }
            
            // Clear existing data
            window.tasksModuleState.tasksData = [];
            
            // Get all tasks
            const allTasks = snapshot.val() || {};
            
            // Filter tasks for current user
            Object.entries(allTasks).forEach(([id, task]) => {
                if (task.createdBy === currentUser.uid || task.assignedTo === currentUser.uid) {
                    window.tasksModuleState.tasksData.push({
                        id: id,
                        ...task
                    });
                }
            });
            
            console.log(`📋 Found ${window.tasksModuleState.tasksData.length} tasks for current user`);
            
            // Update view
            renderTasksView();
        });
        
    } catch (error) {
        console.error('❌ Error setting up listener:', error);
        showError('Error al cargar las tareas');
    }
}

// ===== RENDER TASKS =====
function renderTasksView() {
    console.log('🎨 Rendering tasks view');
    
    const container = document.getElementById('tasksListContainer');
    if (!container) {
        console.error('Tasks container not found');
        return;
    }
    
    const tasks = getFilteredTasks();
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No hay tareas</h3>
                <p>Crea tu primera tarea para comenzar</p>
                <button onclick="showCreateTaskModal()" class="btn-primary">
                    <i class="icon">➕</i> Nueva Tarea
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="tasks-list">
            ${tasks.map(task => `
                <div class="task-card" onclick="showTaskDetails('${task.id}')">
                    <div class="task-header">
                        <h3>${task.title}</h3>
                        <span class="priority-${task.priority}">${getPriorityIcon(task.priority)}</span>
                    </div>
                    <div class="task-meta">
                        <span class="task-category">${task.category}</span>
                        <span class="task-status status-${task.status}">${getStatusName(task.status)}</span>
                    </div>
                    <div class="task-info">
                        <p><strong>Asignado a:</strong> ${task.assignedToName}</p>
                        <p><strong>Vence:</strong> ${formatDate(task.dueDate)}</p>
                    </div>
                    <div class="task-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${task.progress}%"></div>
                        </div>
                        <span>${task.progress}%</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== CREATE TASK MODAL =====
window.showCreateTaskModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>➕ Nueva Tarea</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form onsubmit="createTask(event); return false;">
                    <div class="form-group">
                        <label>Título *</label>
                        <input type="text" name="title" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Descripción</label>
                        <textarea name="description" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Categoría</label>
                            <select name="category">
                                <option value="sales">Ventas</option>
                                <option value="admin">Administración</option>
                                <option value="marketing">Marketing</option>
                                <option value="customer-service">Servicio al Cliente</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Prioridad</label>
                            <select name="priority">
                                <option value="low">Baja</option>
                                <option value="medium" selected>Media</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Fecha de Vencimiento *</label>
                            <input type="date" name="dueDate" required>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Crear Tarea</button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

// ===== CREATE TASK =====
window.createTask = async function(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const currentUser = window.FirebaseData.currentUser;
        const userProfile = await window.FirebaseData.loadUserProfile();
        
        const taskData = {
            title: form.title.value,
            description: form.description.value,
            category: form.category.value,
            priority: form.priority.value,
            dueDate: form.dueDate.value,
            assignedTo: currentUser.uid,
            assignedToName: userProfile.name,
            createdBy: currentUser.uid,
            createdByName: userProfile.name,
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to Firebase
        await firebase.database().ref('tasks').push(taskData);
        
        // Close modal
        form.closest('.modal').remove();
        
        // Show success message
        alert('✅ Tarea creada exitosamente');
        
    } catch (error) {
        console.error('Error creating task:', error);
        alert('❌ Error al crear la tarea');
    }
};

// ===== SHOW TASK DETAILS =====
window.showTaskDetails = function(taskId) {
    const task = window.tasksModuleState.tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    alert(`📋 Detalles de la tarea:

Título: ${task.title}
Descripción: ${task.description || 'Sin descripción'}
Estado: ${getStatusName(task.status)}
Progreso: ${task.progress}%
Asignado a: ${task.assignedToName}
Creado por: ${task.createdByName}
Fecha de vencimiento: ${formatDate(task.dueDate)}`);
};

// ===== FILTER FUNCTIONS =====
window.filterTasks = function(filter) {
    window.tasksModuleState.currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderTasksView();
};

function getFilteredTasks() {
    const tasks = window.tasksModuleState.tasksData;
    const currentUser = window.FirebaseData.currentUser;
    
    if (!currentUser) return tasks;
    
    switch (window.tasksModuleState.currentFilter) {
        case 'my-tasks':
            return tasks.filter(t => t.assignedTo === currentUser.uid);
        case 'assigned-by-me':
            return tasks.filter(t => t.createdBy === currentUser.uid && t.assignedTo !== currentUser.uid);
        case 'overdue':
            const today = new Date().toISOString().split('T')[0];
            return tasks.filter(t => t.status !== 'completed' && t.dueDate < today);
        default:
            return tasks;
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-CO');
}

function getStatusName(status) {
    const names = {
        'pending': 'Pendiente',
        'in-progress': 'En Progreso',
        'completed': 'Completada',
        'overdue': 'Vencida'
    };
    return names[status] || status;
}

function getPriorityIcon(priority) {
    const icons = {
        'low': '🟢',
        'medium': '🟡',
        'high': '🟠',
        'urgent': '🔴'
    };
    return icons[priority] || '⚪';
}

function showError(message) {
    const container = document.getElementById('tasksListContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <h3>❌ Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary">
                    Recargar página
                </button>
            </div>
        `;
    }
}

// ===== STYLES =====
const styles = `
<style>
#tasksContainer {
    padding: 1rem;
}

.tasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.tasks-filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.filter-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 0.375rem;
    cursor: pointer;
}

.filter-btn.active {
    background: #007bff;
    color: white;
}

.tasks-list {
    display: grid;
    gap: 1rem;
}

.task-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
}

.task-card:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.task-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.task-header h3 {
    margin: 0;
}

.task-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.task-category, .task-status {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
}

.task-category {
    background: #f0f0f0;
}

.status-pending { background: #ffa500; color: white; }
.status-in-progress { background: #3498db; color: white; }
.status-completed { background: #27ae60; color: white; }
.status-overdue { background: #e74c3c; color: white; }

.task-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.progress-bar {
    flex: 1;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #4caf50;
}

.empty-state, .error-state {
    text-align: center;
    padding: 3rem;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 0.5rem;
    width: 90%;
    max-width: 500px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
}

.modal-body {
    padding: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.25rem;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
}

.close {
    font-size: 1.5rem;
    cursor: pointer;
}
</style>
`;

// Add styles if not already added
if (!document.getElementById('tasksStyles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'tasksStyles';
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);
}

console.log('✅ Tasks.js loaded successfully');
console.log('ℹ️ The loadTasksData function is ready to be called from tab clicks');
