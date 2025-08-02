// simple-tasks.js - WORKING VERSION FOR CIUDAD BILINGUE CRM
// ===== GUARANTEED WORKING TASK MANAGEMENT =====

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

// ===== MAIN FUNCTION - CALLED FROM TAB SWITCH =====
function loadTasksData() {
    console.log('📋 Loading tasks data - WORKING VERSION');
    
    // Find the container
    const container = document.getElementById('tasksContainer');
    if (!container) {
        console.error('❌ tasksContainer not found');
        return;
    }
    
    console.log('✅ Found tasksContainer, rendering...');
    
    // Clear and render content
    container.innerHTML = renderTaskInterface();
    
    console.log('✅ Task interface rendered successfully');
}

// ===== RENDER COMPLETE INTERFACE =====
function renderTaskInterface() {
    return `
        <!-- Task Dashboard -->
        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
                    📋 Panel de Tareas del Equipo
                    <span style="background: #f3f4f6; color: #6b7280; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: normal;">
                        ${taskData.length} tareas totales
                    </span>
                </h3>
                <button onclick="openNewTaskModal()" class="btn btn-primary">
                    ➕ Nueva Tarea
                </button>
            </div>
            
            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 2rem; font-weight: bold; color: #92400e; margin-bottom: 0.5rem;">
                        ${taskData.filter(t => t.status === 'pending').length}
                    </div>
                    <div style="color: #6b7280; font-weight: 600;">Tareas Pendientes</div>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 2rem; font-weight: bold; color: #1e40af; margin-bottom: 0.5rem;">
                        ${taskData.filter(t => t.status === 'in-progress').length}
                    </div>
                    <div style="color: #6b7280; font-weight: 600;">En Progreso</div>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 12px; border-left: 4px solid #10b981;">
                    <div style="font-size: 2rem; font-weight: bold; color: #166534; margin-bottom: 0.5rem;">
                        ${taskData.filter(t => t.status === 'completed').length}
                    </div>
                    <div style="color: #6b7280; font-weight: 600;">Completadas</div>
                </div>
                <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #fee2e2, #fecaca); border-radius: 12px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 2rem; font-weight: bold; color: #dc2626; margin-bottom: 0.5rem;">
                        ${getOverdueTasks().length}
                    </div>
                    <div style="color: #6b7280; font-weight: 600;">Vencidas</div>
                </div>
            </div>
        </div>

        <!-- Task Board -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            ${renderTaskColumn('pending', '⏳ Pendientes', '#f59e0b')}
            ${renderTaskColumn('in-progress', '🔄 En Progreso', '#3b82f6')}
            ${renderTaskColumn('completed', '✅ Completadas', '#10b981')}
        </div>

        <!-- Quick Actions -->
        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <h3 style="margin: 0 0 1.5rem 0; color: #1f2937;">🚀 Acciones Rápidas</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <button onclick="createQuickTask('sales')" class="btn btn-primary" style="padding: 1rem; text-align: left;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📞</div>
                    <div style="font-weight: 600;">Tarea de Ventas</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">Seguimiento de leads</div>
                </button>
                <button onclick="createQuickTask('payment')" class="btn btn-warning" style="padding: 1rem; text-align: left;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💰</div>
                    <div style="font-weight: 600;">Recordatorio de Pago</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">Gestión de cobros</div>
                </button>
                <button onclick="createQuickTask('admin')" class="btn btn-secondary" style="padding: 1rem; text-align: left;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚙️</div>
                    <div style="font-weight: 600;">Tarea Administrativa</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">Reportes y gestión</div>
                </button>
            </div>
        </div>

        <!-- Task Modal -->
        <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 2rem; border-radius: 12px; width: 500px; max-width: 90%; max-height: 90%; overflow-y: auto;">
                <h3 style="margin: 0 0 1.5rem 0; color: #1f2937;">➕ Nueva Tarea</h3>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Título de la tarea:</label>
                    <input type="text" id="modalTaskTitle" placeholder="Ej: Llamar a María González para clase muestra" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Descripción:</label>
                    <textarea id="modalTaskDesc" placeholder="Descripción detallada de la tarea..." style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; height: 100px; resize: vertical;"></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Tipo:</label>
                        <select id="modalTaskType" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="sales">📞 Ventas</option>
                            <option value="payment">💰 Pagos</option>
                            <option value="admin">⚙️ Administración</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Prioridad:</label>
                        <select id="modalTaskPriority" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
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
                        <select id="modalTaskAssignee" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="">Seleccionar responsable...</option>
                            <option value="Ana López">Ana López</option>
                            <option value="Carlos Ruiz">Carlos Ruiz</option>
                            <option value="María González">María González</option>
                            <option value="Director">Director</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Fecha límite:</label>
                        <input type="date" id="modalTaskDueDate" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
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

// ===== RENDER TASK COLUMN =====
function renderTaskColumn(status, title, color) {
    const columnTasks = taskData.filter(task => task.status === status);
    
    return `
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; border-top: 4px solid ${color};">
            <div style="background: ${color}20; color: ${color}; padding: 1rem; text-align: center; font-weight: 600; border-bottom: 1px solid ${color}30;">
                ${title} (${columnTasks.length})
            </div>
            <div style="padding: 1rem; min-height: 300px; max-height: 500px; overflow-y: auto;">
                ${columnTasks.length === 0 ? 
                    `<div style="text-align: center; color: #9ca3af; padding: 3rem; font-style: italic;">No hay tareas en esta columna</div>` :
                    columnTasks.map(task => renderTaskCard(task)).join('')
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
    
    const typeIcons = {
        sales: '📞',
        payment: '💰',
        admin: '⚙️'
    };
    
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
    
    return `
        <div onclick="showTaskDetails('${task.id}')" style="
            background: ${isOverdue ? '#fef2f2' : '#f9fafb'};
            border: 1px solid ${isOverdue ? '#fecaca' : '#e5e7eb'};
            border-left: 4px solid ${priorityColors[task.priority]};
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
        " 
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; color: #1f2937; flex: 1; line-height: 1.3;">
                    ${typeIcons[task.type]} ${task.title}
                </div>
                <span style="
                    background: ${priorityColors[task.priority]};
                    color: white;
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    white-space: nowrap;
                    margin-left: 0.5rem;
                ">
                    ${task.priority}
                </span>
            </div>
            
            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 1rem; line-height: 1.4;">
                ${task.description}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.5rem; border-radius: 12px; font-weight: 500;">
                    👤 ${task.assignee}
                </span>
                <span style="color: ${isOverdue ? '#dc2626' : '#6b7280'}; font-weight: ${isOverdue ? '600' : 'normal'};">
                    📅 ${formatDate(task.dueDate)} ${isOverdue ? '(VENCIDA)' : ''}
                </span>
            </div>
        </div>
    `;
}

// ===== TASK MANAGEMENT FUNCTIONS =====
function openNewTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
        // Set default due date to tomorrow
        document.getElementById('modalTaskDueDate').value = getTomorrowDate();
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
        clearModalForm();
    }
}

function saveNewTask() {
    const title = document.getElementById('modalTaskTitle').value.trim();
    const description = document.getElementById('modalTaskDesc').value.trim();
    const type = document.getElementById('modalTaskType').value;
    const priority = document.getElementById('modalTaskPriority').value;
    const assignee = document.getElementById('modalTaskAssignee').value;
    const dueDate = document.getElementById('modalTaskDueDate').value;
    
    if (!title || !assignee || !dueDate) {
        alert('⚠️ Por favor completa título, responsable y fecha límite');
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
        dueDate
    };
    
    taskData.push(newTask);
    closeTaskModal();
    loadTasksData(); // Refresh the interface
    
    if (window.showNotification) {
        window.showNotification(`✅ Tarea "${title}" creada para ${assignee}`, 'success');
    } else {
        alert(`✅ Tarea "${title}" creada para ${assignee}`);
    }
}

function createQuickTask(type) {
    openNewTaskModal();
    document.getElementById('modalTaskType').value = type;
    
    const titles = {
        sales: 'Seguimiento de lead - ',
        payment: 'Recordatorio de pago - ',
        admin: 'Tarea administrativa - '
    };
    
    document.getElementById('modalTaskTitle').value = titles[type] || '';
}

function showTaskDetails(taskId) {
    const task = taskData.find(t => t.id === taskId);
    if (!task) return;
    
    const statusOptions = ['pending', 'in-progress', 'completed'];
    const newStatus = prompt(`
TAREA: ${task.title}

Responsable: ${task.assignee}
Estado actual: ${task.status}
Prioridad: ${task.priority}
Vence: ${task.dueDate}

Descripción: ${task.description}

Cambiar estado a:
- pending (Pendiente)
- in-progress (En Progreso)  
- completed (Completada)

Escribe el nuevo estado:`, task.status);
    
    if (newStatus && statusOptions.includes(newStatus)) {
        task.status = newStatus;
        loadTasksData(); // Refresh interface
        
        if (window.showNotification) {
            window.showNotification(`✅ Tarea movida a: ${getStatusName(newStatus)}`, 'success');
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function getOverdueTasks() {
    const today = new Date();
    return taskData.filter(task => 
        new Date(task.dueDate) < today && task.status !== 'completed'
    );
}

function formatDate(dateString) {
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

function clearModalForm() {
    document.getElementById('modalTaskTitle').value = '';
    document.getElementById('modalTaskDesc').value = '';
    document.getElementById('modalTaskAssignee').value = '';
    document.getElementById('modalTaskDueDate').value = '';
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.loadTasksData = loadTasksData;
window.openNewTaskModal = openNewTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveNewTask = saveNewTask;
window.createQuickTask = createQuickTask;
window.showTaskDetails = showTaskDetails;

console.log('✅ WORKING Task Management System loaded successfully!');
