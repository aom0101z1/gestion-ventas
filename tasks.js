// tasks.js - Task Management Module
// ================================================================================
// ✅ COMPLETE TASK MANAGEMENT SYSTEM - Firebase Realtime Database
// ================================================================================

// ===== GLOBAL VARIABLES =====
let tasksData = [];
let currentFilter = 'all';
let taskListeners = [];

// ===== INITIALIZATION =====
async function initializeTasks() {
    console.log('📋 Initializing tasks module...');
    
    try {
        // Wait for Firebase to be ready
        if (!window.firebaseDb || !window.FirebaseData || !window.FirebaseData.currentUser) {
            console.log('⏳ Waiting for Firebase...');
            setTimeout(initializeTasks, 1000);
            return;
        }
        
        console.log('✅ Firebase ready, setting up tasks');
        
        // Initialize UI
        setupTasksUI();
        
        // Load tasks data
        await loadTasksData();
        
        console.log('✅ Tasks module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing tasks:', error);
        renderEmptyState();
    }
}

// ===== UI SETUP =====
function setupTasksUI() {
    console.log('🎨 Setting up tasks UI');
    
    // Create filter buttons container if it doesn't exist
    const tabContent = document.querySelector('.tab-content[data-tab="tasks"]');
    if (!tabContent) {
        console.error('❌ Tasks tab content not found');
        return;
    }
    
    // Clear existing content
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
            </div>
        </div>
    `;
}

// ===== DATA LOADING =====
async function loadTasksData() {
    console.log('📊 Loading tasks data...');
    
    try {
        const currentUser = window.FirebaseData.currentUser;
        if (!currentUser) {
            console.error('❌ No user authenticated');
            renderEmptyState();
            return;
        }
        
        // Setup real-time listener
        setupTasksListener();
        
    } catch (error) {
        console.error('❌ Error loading tasks:', error);
        renderEmptyState();
    }
}

// ===== FIREBASE LISTENERS =====
function setupTasksListener() {
    try {
        const currentUser = window.FirebaseData.currentUser;
        if (!currentUser || !window.firebaseDb) {
            console.error('❌ Firebase not ready');
            return;
        }
        
        console.log('🔥 Setting up tasks listener for user:', currentUser.uid);
        
        // Reference to tasks using Firebase v9 CDN syntax
        const tasksRef = firebase.database().ref('tasks');
        
        // Remove any existing listener
        if (taskListeners.length > 0) {
            taskListeners.forEach(listener => {
                tasksRef.off('value', listener);
            });
            taskListeners = [];
        }
        
        // Create new listener
        tasksRef.on('value', (snapshot) => {
            console.log('📥 Tasks data received');
            tasksData = [];
            const allTasks = snapshot.val() || {};
            
            // Convert to array and filter by user
            Object.entries(allTasks).forEach(([id, task]) => {
                if (task.createdBy === currentUser.uid || 
                    task.assignedTo === currentUser.uid) {
                    tasksData.push({
                        id: id,
                        ...task
                    });
                }
            });
            
            // Update task statuses
            updateTaskStatuses();
            
            // Sort by date
            tasksData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            console.log(`📋 Loaded ${tasksData.length} tasks`);
            renderTasksView();
        });
        
    } catch (error) {
        console.error('❌ Error setting up listener:', error);
        renderEmptyState();
    }
}

// ===== TASK CREATION =====
function showCreateTaskModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>➕ Nueva Tarea</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="createTaskForm" onsubmit="createTask(event)">
                    <div class="form-group">
                        <label>Título *</label>
                        <input type="text" name="title" required placeholder="Título de la tarea">
                    </div>
                    
                    <div class="form-group">
                        <label>Descripción</label>
                        <textarea name="description" rows="3" placeholder="Descripción detallada..."></textarea>
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
                            <label>Fecha de Inicio</label>
                            <input type="date" name="startDate" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label>Fecha de Vencimiento</label>
                            <input type="date" name="dueDate" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Asignar a</label>
                        <select name="assignedTo" id="assigneeSelect">
                            <option value="">Seleccionar usuario...</option>
                        </select>
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
    loadUsersList();
}

// ===== CREATE TASK =====
async function createTask(event) {
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
            startDate: form.startDate.value,
            dueDate: form.dueDate.value,
            assignedTo: form.assignedTo.value || currentUser.uid,
            assignedToName: form.assignedTo.value ? 
                form.assigneeSelect.options[form.assigneeSelect.selectedIndex].text : 
                userProfile.name,
            createdBy: currentUser.uid,
            createdByName: userProfile.name,
            status: 'pending',
            progress: 0,
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to Firebase using v9 CDN syntax
        const tasksRef = firebase.database().ref('tasks');
        await tasksRef.push(taskData);
        
        // Close modal
        form.closest('.modal').remove();
        
        showNotification('✅ Tarea creada exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error creating task:', error);
        showNotification('❌ Error al crear la tarea', 'error');
    }
}

// ===== LOAD USERS LIST =====
async function loadUsersList() {
    try {
        const snapshot = await firebase.database().ref('users').once('value');
        const users = snapshot.val() || {};
        
        const select = document.getElementById('assigneeSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar usuario...</option>';
        
        Object.entries(users).forEach(([uid, userData]) => {
            if (userData.profile) {
                const option = document.createElement('option');
                option.value = uid;
                option.textContent = userData.profile.name;
                select.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
    }
}

// ===== RENDER TASKS =====
function renderTasksView() {
    console.log('🎨 Rendering tasks view');
    
    const container = document.getElementById('tasksListContainer');
    if (!container) return;
    
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        renderEmptyState();
        return;
    }
    
    container.innerHTML = `
        <div class="tasks-list">
            ${filteredTasks.map(task => renderTaskCard(task)).join('')}
        </div>
    `;
}

// ===== RENDER TASK CARD =====
function renderTaskCard(task) {
    const statusColors = {
        pending: '#ffa500',
        'in-progress': '#3498db',
        completed: '#27ae60',
        overdue: '#e74c3c'
    };
    
    const priorityIcons = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
    };
    
    return `
        <div class="task-card" onclick="showTaskDetails('${task.id}')">
            <div class="task-header">
                <h3>${task.title}</h3>
                <span class="priority-icon">${priorityIcons[task.priority]}</span>
            </div>
            
            <div class="task-meta">
                <span class="task-category">${getCategoryName(task.category)}</span>
                <span class="task-status" style="background-color: ${statusColors[task.status]}">
                    ${getStatusName(task.status)}
                </span>
            </div>
            
            <div class="task-info">
                <p><strong>Asignado a:</strong> ${task.assignedToName}</p>
                <p><strong>Vencimiento:</strong> ${formatDate(task.dueDate)}</p>
            </div>
            
            <div class="task-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                </div>
                <span class="progress-text">${task.progress}%</span>
            </div>
        </div>
    `;
}

// ===== SHOW TASK DETAILS =====
function showTaskDetails(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>📋 ${task.title}</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="task-details-grid">
                    <div class="task-details-main">
                        <div class="detail-section">
                            <h4>Descripción</h4>
                            <p>${task.description || 'Sin descripción'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Progreso</h4>
                            <div class="progress-control">
                                <input type="range" id="progressSlider" min="0" max="100" 
                                       value="${task.progress}" onchange="updateTaskProgress('${taskId}', this.value)">
                                <span id="progressValue">${task.progress}%</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Estado</h4>
                            <select onchange="updateTaskStatus('${taskId}', this.value)">
                                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>En Progreso</option>
                                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completada</option>
                            </select>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Notas</h4>
                            <div class="notes-list">
                                ${task.notes && task.notes.length > 0 ? 
                                    task.notes.map(note => `
                                        <div class="note-item">
                                            <p>${note.text}</p>
                                            <small>${note.author} - ${formatDateTime(note.createdAt)}</small>
                                        </div>
                                    `).join('') : 
                                    '<p>No hay notas aún</p>'
                                }
                            </div>
                            <div class="add-note">
                                <textarea id="newNote" placeholder="Agregar una nota..."></textarea>
                                <button onclick="addTaskNote('${taskId}')" class="btn-primary">
                                    Agregar Nota
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="task-details-sidebar">
                        <div class="detail-item">
                            <strong>Creado por:</strong> ${task.createdByName}
                        </div>
                        <div class="detail-item">
                            <strong>Asignado a:</strong> ${task.assignedToName}
                        </div>
                        <div class="detail-item">
                            <strong>Categoría:</strong> ${getCategoryName(task.category)}
                        </div>
                        <div class="detail-item">
                            <strong>Prioridad:</strong> ${getPriorityName(task.priority)}
                        </div>
                        <div class="detail-item">
                            <strong>Fecha de inicio:</strong> ${formatDate(task.startDate)}
                        </div>
                        <div class="detail-item">
                            <strong>Fecha de vencimiento:</strong> ${formatDate(task.dueDate)}
                        </div>
                        <div class="detail-item">
                            <strong>Creado:</strong> ${formatDateTime(task.createdAt)}
                        </div>
                        <div class="detail-item">
                            <strong>Actualizado:</strong> ${formatDateTime(task.updatedAt)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== UPDATE FUNCTIONS =====
async function updateTaskProgress(taskId, progress) {
    try {
        await firebase.database().ref(`tasks/${taskId}`).update({
            progress: parseInt(progress),
            updatedAt: new Date().toISOString()
        });
        
        document.getElementById('progressValue').textContent = progress + '%';
        
    } catch (error) {
        console.error('❌ Error updating progress:', error);
        showNotification('❌ Error al actualizar el progreso', 'error');
    }
}

async function updateTaskStatus(taskId, status) {
    try {
        await firebase.database().ref(`tasks/${taskId}`).update({
            status: status,
            updatedAt: new Date().toISOString()
        });
        
        showNotification('✅ Estado actualizado', 'success');
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
        showNotification('❌ Error al actualizar el estado', 'error');
    }
}

async function addTaskNote(taskId) {
    const noteText = document.getElementById('newNote').value.trim();
    if (!noteText) return;
    
    try {
        const task = tasksData.find(t => t.id === taskId);
        const userProfile = await window.FirebaseData.loadUserProfile();
        
        const newNote = {
            text: noteText,
            author: userProfile.name,
            createdAt: new Date().toISOString()
        };
        
        const notes = task.notes || [];
        notes.push(newNote);
        
        await firebase.database().ref(`tasks/${taskId}`).update({
            notes: notes,
            updatedAt: new Date().toISOString()
        });
        
        // Clear the textarea
        document.getElementById('newNote').value = '';
        
        // Refresh the modal
        document.querySelector('.modal').remove();
        showTaskDetails(taskId);
        
    } catch (error) {
        console.error('❌ Error adding note:', error);
        showNotification('❌ Error al agregar la nota', 'error');
    }
}

// ===== FILTER FUNCTIONS =====
function filterTasks(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderTasksView();
}

function getFilteredTasks() {
    const currentUser = window.FirebaseData.currentUser;
    if (!currentUser) return [];
    
    switch (currentFilter) {
        case 'my-tasks':
            return tasksData.filter(task => task.assignedTo === currentUser.uid);
        case 'assigned-by-me':
            return tasksData.filter(task => task.createdBy === currentUser.uid && task.assignedTo !== currentUser.uid);
        case 'overdue':
            return tasksData.filter(task => task.status === 'overdue');
        default:
            return tasksData;
    }
}

// ===== UTILITY FUNCTIONS =====
function updateTaskStatuses() {
    const today = new Date().toISOString().split('T')[0];
    
    tasksData.forEach(task => {
        if (task.status !== 'completed' && task.dueDate < today) {
            task.status = 'overdue';
        }
    });
}

function renderEmptyState() {
    const container = document.getElementById('tasksListContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <h3>No hay tareas</h3>
            <p>Crea tu primera tarea para comenzar</p>
            <button onclick="showCreateTaskModal()" class="btn-primary">
                <i class="icon">➕</i> Nueva Tarea
            </button>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO');
}

function formatDateTime(dateString) {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO');
}

function getCategoryName(category) {
    const categories = {
        'sales': 'Ventas',
        'admin': 'Administración',
        'marketing': 'Marketing',
        'customer-service': 'Servicio al Cliente'
    };
    return categories[category] || category;
}

function getStatusName(status) {
    const statuses = {
        'pending': 'Pendiente',
        'in-progress': 'En Progreso',
        'completed': 'Completada',
        'overdue': 'Vencida'
    };
    return statuses[status] || status;
}

function getPriorityName(priority) {
    const priorities = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta',
        'urgent': 'Urgente'
    };
    return priorities[priority] || priority;
}

function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// ===== STYLES =====
const tasksStyles = `
<style>
/* Tasks Module Styles */
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
    flex-wrap: wrap;
}

.filter-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
}

.filter-btn:hover {
    background: #f8f9fa;
}

.filter-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.tasks-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
}

.task-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
}

.task-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
}

.task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.task-header h3 {
    margin: 0;
    font-size: 1.1rem;
}

.priority-icon {
    font-size: 1.2rem;
}

.task-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.task-category {
    padding: 0.25rem 0.5rem;
    background: #f0f0f0;
    border-radius: 0.25rem;
    font-size: 0.875rem;
}

.task-status {
    padding: 0.25rem 0.5rem;
    color: white;
    border-radius: 0.25rem;
    font-size: 0.875rem;
}

.task-info {
    margin-bottom: 0.75rem;
}

.task-info p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
}

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
    transition: width 0.3s;
}

.progress-text {
    font-size: 0.875rem;
    font-weight: 500;
}

/* Modal Styles */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content.large {
    max-width: 800px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
    margin: 0;
}

.close {
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
}

.close:hover {
    color: #000;
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
    font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.375rem;
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
    margin-top: 1.5rem;
}

/* Task Details */
.task-details-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
}

.detail-section {
    margin-bottom: 1.5rem;
}

.detail-section h4 {
    margin-bottom: 0.5rem;
}

.progress-control {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.progress-control input[type="range"] {
    flex: 1;
}

.notes-list {
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 1rem;
}

.note-item {
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
}

.note-item p {
    margin: 0 0 0.25rem 0;
}

.note-item small {
    color: #666;
}

.add-note textarea {
    width: 100%;
    margin-bottom: 0.5rem;
}

.task-details-sidebar {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 0.375rem;
}

.detail-item {
    margin-bottom: 0.75rem;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 3rem;
}

.empty-state h3 {
    color: #666;
    margin-bottom: 0.5rem;
}

.empty-state p {
    color: #999;
    margin-bottom: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
    .tasks-list {
        grid-template-columns: 1fr;
    }
    
    .task-details-grid {
        grid-template-columns: 1fr;
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// Add styles to page if not already added
if (!document.getElementById('tasksStyles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'tasksStyles';
    styleElement.innerHTML = tasksStyles;
    document.head.appendChild(styleElement);
}

// ===== INITIALIZE WHEN READY =====
// Wait for Firebase to be available
function waitForFirebase() {
    if (typeof firebase !== 'undefined' && firebase.database && window.FirebaseData) {
        console.log('✅ Firebase available, initializing tasks');
        initializeTasks();
    } else {
        console.log('⏳ Waiting for Firebase...');
        setTimeout(waitForFirebase, 100);
    }
}

// Check if we should initialize now or wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForFirebase);
} else {
    waitForFirebase();
}

// Export for global access
window.tasksModule = {
    initializeTasks,
    showCreateTaskModal,
    filterTasks,
    showTaskDetails,
    updateTaskProgress,
    updateTaskStatus,
    addTaskNote,
    createTask
};

console.log('📋 Tasks module loaded successfully');
