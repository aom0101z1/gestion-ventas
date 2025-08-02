// ===== TASK DRAG & DROP - FIXED VERSION =====

// Variables globales
let tasksData = [];
let currentUser = null;
let isAdmin = false;

const TASK_STATUS = {
    todo: { label: 'Por Hacer', color: '#6b7280', icon: '📝' },
    in_progress: { label: 'En Progreso', color: '#3b82f6', icon: '🔄' },
    review: { label: 'En Revisión', color: '#f59e0b', icon: '👀' },
    done: { label: 'Completado', color: '#10b981', icon: '✅' }
};

// Función principal
async function loadTasksMain() {
    console.log('✅ Loading tasks module...');
    
    // Get current user
    if (window.FirebaseData?.currentUser) {
        currentUser = window.FirebaseData.currentUser;
        const profile = await window.FirebaseData.loadUserProfile();
        isAdmin = profile?.role === 'director';
    }
    
    const tabContent = document.getElementById('tasks');
    if (!tabContent) return;
    
    tabContent.innerHTML = '';
    tabContent.style.display = 'block';
    tabContent.classList.remove('hidden');
    
    renderTasksUI();
    setupTasksListener();
}

// Render UI
function renderTasksUI() {
    const tasksContainer = document.getElementById('tasks');
    
    tasksContainer.innerHTML = `
        <h2>📋 Gestión de Tareas</h2>
        <p style="color: #6b7280; margin-bottom: 20px;">Vista de ${isAdmin ? 'Administrador' : 'Empleado'}</p>
        
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button onclick="showCreateTaskModal()" class="btn btn-primary">➕ Nueva Tarea</button>
            <button onclick="refreshTasks()" class="btn" style="background: #6b7280; color: white;">🔄 Actualizar</button>
        </div>
        
        <!-- Kanban Board -->
        <div id="kanbanBoard" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            ${Object.entries(TASK_STATUS).map(([key, status]) => `
                <div class="kanban-column" style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: ${status.color}; font-size: 16px;">
                            ${status.icon} ${status.label}
                        </h3>
                        <span id="count-${key}" style="background: ${status.color}20; color: ${status.color}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">0</span>
                    </div>
                    <div class="task-column" data-status="${key}" style="min-height: 300px; transition: background-color 0.2s;">
                        <div style="text-align: center; color: #9ca3af; padding: 40px;">Cargando tareas...</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div id="modalContainer"></div>
    `;
}

// Setup Firebase listener
function setupTasksListener() {
    if (!window.firebaseDb || !window.firebaseModules) {
        console.error('❌ Firebase not ready');
        return;
    }
    
    const { ref, onValue } = window.firebaseModules.database;
    const tasksRef = ref(window.firebaseDb, 'tasks');
    
    onValue(tasksRef, (snapshot) => {
        const data = snapshot.val() || {};
        
        tasksData = Object.entries(data).map(([id, task]) => ({ id, ...task }));
        
        if (!isAdmin) {
            tasksData = tasksData.filter(task => 
                task.assignedTo === currentUser?.uid || task.createdBy === currentUser?.uid
            );
        }
        
        renderTasks();
        
        // CLAVE: Setup eventos DESPUÉS del render
        setTimeout(setupTaskEvents, 100);
    });
}

// Render tasks
function renderTasks() {
    // Clear columns
    Object.keys(TASK_STATUS).forEach(status => {
        const column = document.querySelector(`.task-column[data-status="${status}"]`);
        if (column) column.innerHTML = '';
        const count = document.getElementById(`count-${status}`);
        if (count) count.textContent = '0';
    });
    
    // Group by status
    const tasksByStatus = {};
    Object.keys(TASK_STATUS).forEach(status => {
        tasksByStatus[status] = tasksData.filter(task => (task.status || 'todo') === status);
    });
    
    // Render in columns
    Object.entries(tasksByStatus).forEach(([status, tasks]) => {
        const column = document.querySelector(`.task-column[data-status="${status}"]`);
        const count = document.getElementById(`count-${status}`);
        
        if (column) {
            if (tasks.length === 0) {
                column.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 40px;">No hay tareas</div>';
            } else {
                column.innerHTML = tasks.map(task => `
                    <div class="task-card" draggable="true" data-task-id="${task.id}" 
                         style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; 
                                padding: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s;">
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">${task.title}</h4>
                            <span style="font-size: 18px;">${TASK_STATUS[task.priority || 'medium']?.icon || '🟡'}</span>
                        </div>
                        
                        ${task.description ? `
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                                ${task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description}
                            </p>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280;">
                            <span>👤 ${task.assignedToName || 'Sin asignar'}</span>
                            ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString('es-CO')}</span>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
        
        if (count) count.textContent = tasks.length;
    });
}

// Setup drag & drop events - SOLUCIÓN IGUAL QUE PIPELINE
function setupTaskEvents() {
    // Task cards - drag start/end
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            window.draggedTask = e.target.dataset.taskId;
            e.target.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', window.draggedTask);
            console.log('🎯 Task drag started:', window.draggedTask);
        });
        
        card.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
            window.draggedTask = null;
        });
    });
    
    // Drop zones
    document.querySelectorAll('.task-column').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.style.backgroundColor = '#e3f2fd';
        });
        
        column.addEventListener('dragleave', () => {
            column.style.backgroundColor = '';
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.style.backgroundColor = '';
            
            const newStatus = column.dataset.status;
            const taskId = e.dataTransfer.getData('text/plain') || window.draggedTask;
            
            if (!taskId || !newStatus) return;
            
            console.log('🎯 Task drop:', taskId, 'to', newStatus);
            
            try {
                const { ref, update } = window.firebaseModules.database;
                const taskRef = ref(window.firebaseDb, `tasks/${taskId}`);
                
                await update(taskRef, {
                    status: newStatus,
                    lastUpdated: new Date().toISOString(),
                    lastUpdatedBy: currentUser.uid
                });
                
                console.log('✅ Task moved successfully');
                if (window.showNotification) {
                    window.showNotification('Tarea actualizada', 'success');
                }
                
            } catch (error) {
                console.error('❌ Error moving task:', error);
                if (window.showNotification) {
                    window.showNotification('Error al mover tarea', 'error');
                }
            }
        });
    });
    
    console.log('✅ Task drag & drop configured');
}

// Create task modal
function showCreateTaskModal() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="modal-content" onclick="event.stopPropagation()" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%;">
                <h3 style="margin: 0 0 20px 0;">➕ Nueva Tarea</h3>
                
                <form onsubmit="createTask(event)">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Título *</label>
                        <input type="text" name="title" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Descripción</label>
                        <textarea name="description" rows="3" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="closeModal()" style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 6px; cursor: pointer;">Cancelar</button>
                        <button type="submit" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Crear</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
}

// Create task
async function createTask(event) {
    event.preventDefault();
    
    const form = event.target;
    const newTask = {
        title: form.title.value,
        description: form.description.value,
        status: 'todo',
        createdBy: currentUser.uid,
        assignedTo: currentUser.uid,
        assignedToName: currentUser.email,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    try {
        const { ref, push } = window.firebaseModules.database;
        const tasksRef = ref(window.firebaseDb, 'tasks');
        await push(tasksRef, newTask);
        
        if (window.showNotification) {
            window.showNotification('Tarea creada', 'success');
        }
        closeModal();
    } catch (error) {
        console.error('❌ Error creating task:', error);
    }
}

// Utility functions
function closeModal(event) {
    if (!event || event.target.classList.contains('modal-overlay')) {
        document.getElementById('modalContainer').innerHTML = '';
    }
}

function refreshTasks() {
    setupTasksListener();
}

// Export functions
window.loadTasksData = loadTasksMain;
window.showCreateTaskModal = showCreateTaskModal;
window.createTask = createTask;
window.closeModal = closeModal;
window.refreshTasks = refreshTasks;

console.log('✅ Tasks with working drag & drop loaded');
