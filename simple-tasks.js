// improved-tasks.js - TASK MANAGEMENT FOR ENGLISH SCHOOL CRM
// ===== INTEGRATED TASK MANAGEMENT SYSTEM =====

let tasks = [
    {
        id: '1',
        title: 'Seguimiento lead María González',
        description: 'Contactar para agendar clase muestra',
        status: 'pending',
        priority: 'high',
        assignee: 'Ana López',
        dueDate: '2024-08-15',
        type: 'sales',
        relatedLead: 'lead-123'
    },
    {
        id: '2',
        title: 'Llamar a estudiantes morosos',
        description: 'Recordar pagos pendientes del mes',
        status: 'in-progress',
        priority: 'urgent',
        assignee: 'Carlos Ruiz',
        dueDate: '2024-08-12',
        type: 'payment'
    },
    {
        id: '3',
        title: 'Preparar reporte semanal',
        description: 'Reporte de conversiones y ventas',
        status: 'completed',
        priority: 'medium',
        assignee: 'Director',
        dueDate: '2024-08-10',
        type: 'admin'
    }
];

// ===== MAIN LOADING FUNCTION =====
function loadTasksData() {
    console.log('📋 Loading task management...');
    
    const container = document.getElementById('tasksContainer');
    if (!container) {
        console.error('❌ Tasks container not found');
        return;
    }
    
    // Clear and render
    container.innerHTML = createTaskInterface();
    console.log('✅ Task system loaded successfully');
}

// ===== CREATE TASK INTERFACE =====
function createTaskInterface() {
    const taskStats = calculateTaskStats();
    
    return `
        <!-- Task Header with Stats -->
        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #1f2937;">📋 Panel de Tareas</h3>
                <button onclick="openTaskModal()" class="btn btn-primary">
                    ➕ Nueva Tarea
                </button>
            </div>
            
            <!-- Quick Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <div style="text-align: center; padding: 1rem; background: #fef3c7; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #92400e;">${taskStats.pending}</div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Pendientes</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #dbeafe; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #1e40af;">${taskStats.inProgress}</div>
                    <div style="color: #6b7280; font-size: 0.9rem;">En Progreso</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #dcfce7; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #166534;">${taskStats.completed}</div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Completadas</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #fee2e2; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">${taskStats.overdue}</div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Vencidas</div>
                </div>
            </div>
        </div>

        <!-- Task Filters -->
        <div style="background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 2rem;">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <label style="color: #374151; font-weight: 600;">Filtros:</label>
                <select id="taskTypeFilter" onchange="filterTasks()" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <option value="">Todos los tipos</option>
                    <option value="sales">📞 Ventas</option>
                    <option value="payment">💰 Pagos</option>
                    <option value="admin">⚙️ Administración</option>
                </select>
                <select id="taskStatusFilter" onchange="filterTasks()" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <option value="">Todos los estados</option>
                    <option value="pending">⏳ Pendiente</option>
                    <option value="in-progress">🔄 En Progreso</option>
                    <option value="completed">✅ Completada</option>
                </select>
                <select id="taskAssigneeFilter" onchange="filterTasks()" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <option value="">Todos los asignados</option>
                    ${getUniqueAssignees().map(assignee => 
                        `<option value="${assignee}">${assignee}</option>`
                    ).join('')}
                </select>
            </div>
        </div>

        <!-- Task Board -->
        <div id="taskBoard" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
            ${renderTaskColumns()}
        </div>

        <!-- Task Modal -->
        ${createTaskModal()}
    `;
}

// ===== RENDER TASK COLUMNS =====
function renderTaskColumns() {
    const columns = [
        { id: 'pending', title: '⏳ Pendientes', color: '#f59e0b' },
        { id: 'in-progress', title: '🔄 En Progreso', color: '#3b82f6' },
        { id: 'completed', title: '✅ Completadas', color: '#10b981' }
    ];

    return columns.map(column => {
        const columnTasks = getFilteredTasks().filter(task => task.status === column.id);
        
        return `
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
                <div style="background: ${column.color}; color: white; padding: 1rem; text-align: center; font-weight: 600;">
                    ${column.title} (${columnTasks.length})
                </div>
                <div style="padding: 1rem; min-height: 300px; max-height: 500px; overflow-y: auto;">
                    ${columnTasks.length === 0 ? 
                        '<div style="text-align: center; color: #9ca3af; padding: 2rem; font-style: italic;">No hay tareas</div>' :
                        columnTasks.map(task => renderTaskCard(task)).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

// ===== RENDER TASK CARD =====
function renderTaskCard(task) {
    const priorityColors = {
        low: '#10b981',
        medium: '#3b82f6', 
        high: '#f59e0b',
        urgent: '#ef4444'
    };

    const typeIcons = {
        sales: '📞',
        payment: '💰',
        admin: '⚙️'
    };

    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return `
        <div style="
            background: ${isOverdue ? '#fef2f2' : '#f9fafb'};
            border: 1px solid ${isOverdue ? '#fecaca' : '#e5e7eb'};
            border-left: 4px solid ${priorityColors[task.priority]};
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
        " 
        onclick="editTask('${task.id}')"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; color: #1f2937; flex: 1;">
                    ${typeIcons[task.type] || '📋'} ${task.title}
                </div>
                <span style="
                    background: ${priorityColors[task.priority]};
                    color: white;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                ">
                    ${task.priority}
                </span>
            </div>
            
            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem; line-height: 1.4;">
                ${task.description}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.5rem; border-radius: 12px;">
                    👤 ${task.assignee}
                </span>
                <span style="color: ${isOverdue ? '#dc2626' : '#6b7280'}; font-weight: ${isOverdue ? '600' : 'normal'};">
                    📅 ${formatTaskDate(task.dueDate)}
                    ${isOverdue ? ' (VENCIDA)' : ''}
                </span>
            </div>
        </div>
    `;
}

// ===== TASK MODAL =====
function createTaskModal() {
    return `
        <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 2rem; border-radius: 12px; width: 500px; max-width: 90%; max-height: 90%; overflow-y: auto;">
                <h3 style="margin: 0 0 1.5rem 0; color: #1f2937;">➕ Nueva Tarea</h3>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Título:</label>
                    <input type="text" id="newTaskTitle" placeholder="Título de la tarea..." 
                           style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Descripción:</label>
                    <textarea id="newTaskDesc" placeholder="Descripción detallada..." 
                              style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; height: 100px; resize: vertical;"></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Tipo:</label>
                        <select id="newTaskType" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="sales">📞 Ventas</option>
                            <option value="payment">💰 Pagos</option>
                            <option value="admin">⚙️ Administración</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Prioridad:</label>
                        <select id="newTaskPriority" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="low">🟢 Baja</option>
                            <option value="medium" selected>🔵 Media</option>
                            <option value="high">🟠 Alta</option>
                            <option value="urgent">🔴 Urgente</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Asignado a:</label>
                        <input type="text" id="newTaskAssignee" placeholder="Nombre del responsable..." 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Fecha límite:</label>
                        <input type="date" id="newTaskDueDate" 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button onclick="closeTaskModal()" class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="saveNewTask()" class="btn btn-primary" style="flex: 1;">
                        💾 Guardar Tarea
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== TASK MANAGEMENT FUNCTIONS =====
function openTaskModal() {
    document.getElementById('taskModal').style.display = 'flex';
    // Set default due date to tomorrow
    document.getElementById('newTaskDueDate').value = getTomorrowDate();
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    clearTaskForm();
}

function saveNewTask() {
    const title = document.getElementById('newTaskTitle').value.trim();
    const description = document.getElementById('newTaskDesc').value.trim();
    const type = document.getElementById('newTaskType').value;
    const priority = document.getElementById('newTaskPriority').value;
    const assignee = document.getElementById('newTaskAssignee').value.trim();
    const dueDate = document.getElementById('newTaskDueDate').value;
    
    if (!title || !assignee || !dueDate) {
        alert('⚠️ Por favor completa todos los campos obligatorios');
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        title,
        description,
        type,
        status: 'pending',
        priority,
        assignee,
        dueDate,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    closeTaskModal();
    loadTasksData();
    
    if (window.showNotification) {
        window.showNotification(`✅ Tarea "${title}" creada exitosamente`, 'success');
    }
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = prompt(`Tarea: ${task.title}\nEstado actual: ${task.status}\n\nCambiar estado a:\n- pending (Pendiente)\n- in-progress (En Progreso)\n- completed (Completada)`, task.status);
    
    if (newStatus && ['pending', 'in-progress', 'completed'].includes(newStatus)) {
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        loadTasksData();
        
        if (window.showNotification) {
            window.showNotification(`✅ Tarea movida a: ${getStatusName(newStatus)}`, 'success');
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function calculateTaskStats() {
    const today = new Date();
    return {
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => new Date(t.dueDate) < today && t.status !== 'completed').length
    };
}

function getFilteredTasks() {
    let filtered = [...tasks];
    
    const typeFilter = document.getElementById('taskTypeFilter')?.value;
    const statusFilter = document.getElementById('taskStatusFilter')?.value;
    const assigneeFilter = document.getElementById('taskAssigneeFilter')?.value;
    
    if (typeFilter) filtered = filtered.filter(t => t.type === typeFilter);
    if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
    if (assigneeFilter) filtered = filtered.filter(t => t.assignee === assigneeFilter);
    
    return filtered;
}

function filterTasks() {
    const taskBoard = document.getElementById('taskBoard');
    if (taskBoard) {
        taskBoard.innerHTML = renderTaskColumns();
    }
}

function getUniqueAssignees() {
    return [...new Set(tasks.map(t => t.assignee))];
}

function formatTaskDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
    });
}

function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

function getStatusName(status) {
    const names = {
        'pending': 'Pendiente',
        'in-progress': 'En Progreso', 
        'completed': 'Completada'
    };
    return names[status] || status;
}

function clearTaskForm() {
    document.getElementById('newTaskTitle').value = '';
    document.getElementById('newTaskDesc').value = '';
    document.getElementById('newTaskAssignee').value = '';
    document.getElementById('newTaskDueDate').value = '';
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.loadTasksData = loadTasksData;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveNewTask = saveNewTask;
window.editTask = editTask;
window.filterTasks = filterTasks;

console.log('✅ Enhanced Task Management System loaded!');
