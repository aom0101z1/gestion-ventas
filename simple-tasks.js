// simple-tasks.js - FIXED VERSION WITH DRAG & DROP
// ===== WORKING TASK MANAGEMENT WITH DRAG & DROP =====

console.log('📋 Loading simple-tasks.js...');

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
    },
    {
        id: '4',
        title: 'Revisar contratos pendientes',
        description: 'Validar documentos de nuevos estudiantes',
        status: 'pending',
        priority: 'medium',
        assignee: 'Director',
        dueDate: '2024-08-16',
        type: 'admin'
    }
];

// ===== MAIN FUNCTION - LOAD TASKS DATA =====
function loadTasksData() {
    console.log('📋 Loading tasks data with drag & drop');
    
    const container = document.getElementById('tasksContainer');
    if (!container) {
        console.error('❌ tasksContainer not found');
        return;
    }
    
    console.log('✅ Found tasksContainer, rendering task board...');
    container.innerHTML = createTaskBoard();
    console.log('✅ Task board rendered successfully');
    
    // Add some sample data if needed
    if (taskData.length === 0) {
        addSampleTasks();
    }
}

// ===== CREATE TASK BOARD =====
function createTaskBoard() {
    return `
        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
                    📋 Gestión de Tareas
                    <span style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
                        ${taskData.length} tareas
                    </span>
                </h2>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="refreshTasks()" style="
                        background: #10b981; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                        🔄 Actualizar
                    </button>
                    <button onclick="openTaskModal()" style="
                        background: #3b82f6; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        ➕ Nueva Tarea
                    </button>
                </div>
            </div>
            
            <!-- DRAG & DROP BOARD -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; min-height: 500px;">
                ${renderTaskColumn('pending', '⏳ Pendientes', '#f59e0b')}
                ${renderTaskColumn('in-progress', '🔄 En Progreso', '#3b82f6')}
                ${renderTaskColumn('completed', '✅ Completadas', '#10b981')}
            </div>
            
            <!-- Task Stats -->
            <div style="margin-top: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                ${renderTaskStats()}
            </div>
        </div>
        
        <!-- Task Modal -->
        <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; width: 450px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #1f2937;">➕ Crear Nueva Tarea</h3>
                    <button onclick="closeTaskModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
                </div>
                
                <form onsubmit="saveTask(event)">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Título de la tarea:</label>
                        <input type="text" id="newTaskTitle" placeholder="Ej: Llamar cliente importante..." style="width: 100%; padding: 12px; margin: 0; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;" required>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Descripción:</label>
                        <textarea id="newTaskDesc" placeholder="Detalles de la tarea..." style="width: 100%; padding: 12px; margin: 0; border: 2px solid #e5e7eb; border-radius: 8px; height: 80px; font-size: 1rem; resize: vertical;" required></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Prioridad:</label>
                            <select id="newTaskPriority" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                <option value="low">🟢 Baja</option>
                                <option value="medium" selected>🔵 Media</option>
                                <option value="high">🟠 Alta</option>
                                <option value="urgent">🔴 Urgente</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Tipo:</label>
                            <select id="newTaskType" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                <option value="sales">💰 Ventas</option>
                                <option value="admin">📋 Administrativo</option>
                                <option value="payment">💳 Pagos</option>
                                <option value="marketing">📢 Marketing</option>
                                <option value="support">🛠️ Soporte</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #374151;">Asignado a:</label>
                        <input type="text" id="newTaskAssignee" placeholder="Nombre del responsable..." style="width: 100%; padding: 12px; margin: 0; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;" required>
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: flex-end;">
                        <button type="button" onclick="closeTaskModal()" style="
                            padding: 12px 24px; 
                            background: #6b7280; 
                            color: white; 
                            border: none; 
                            border-radius: 8px; 
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        ">Cancelar</button>
                        <button type="submit" style="
                            padding: 12px 24px; 
                            background: #3b82f6; 
                            color: white; 
                            border: none; 
                            border-radius: 8px; 
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.2s ease;
                        ">💾 Guardar Tarea</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ===== RENDER TASK COLUMN =====
function renderTaskColumn(status, title, color) {
    const tasks = taskData.filter(task => task.status === status);
    
    return `
        <div class="drop-zone-tasks" 
             ondrop="dropTask(event)" 
             ondragover="allowDropTask(event)"
             data-status="${status}"
             style="
                background: white; 
                border-radius: 12px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                overflow: hidden; 
                border-top: 4px solid ${color};
                transition: all 0.2s ease;
             "
             onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)'"
             onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
            
            <div style="background: ${color}; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 1rem;">
                ${title}
                <span style="
                    background: rgba(255,255,255,0.2);
                    margin-left: 8px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                ">
                    ${tasks.length}
                </span>
            </div>
            
            <div style="padding: 15px; height: calc(100% - 70px); overflow-y: auto; min-height: 400px;">
                ${tasks.length === 0 ? 
                    `<div style="
                        text-align: center; 
                        color: #9ca3af; 
                        padding: 40px 20px; 
                        font-style: italic;
                        border: 2px dashed #e5e7eb;
                        border-radius: 8px;
                        background: #f9fafb;
                    ">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
                        Arrastra tareas aquí
                    </div>` :
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
    
    const typeIcons = {
        sales: '💰',
        admin: '📋',
        payment: '💳',
        marketing: '📢',
        support: '🛠️'
    };
    
    const priorityLabels = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente'
    };
    
    return `
        <div id="task-${task.id}" 
             draggable="true" 
             ondragstart="dragTask(event)"
             onclick="toggleTaskDetails('${task.id}')"
             style="
                background: white; 
                border: 1px solid #e5e7eb; 
                border-left: 4px solid ${priorityColors[task.priority]}; 
                border-radius: 8px; 
                padding: 15px; 
                margin-bottom: 12px; 
                cursor: grab;
                transition: all 0.2s ease;
                position: relative;
             "
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.borderColor='${priorityColors[task.priority]}'"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e5e7eb'"
             ondragstart="this.style.cursor='grabbing'"
             ondragend="this.style.cursor='grab'">
            
            <!-- Task Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px; line-height: 1.3;">
                        ${typeIcons[task.type] || '📋'} ${task.title}
                    </div>
                </div>
                <div style="
                    background: ${priorityColors[task.priority]};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    white-space: nowrap;
                    margin-left: 8px;
                ">
                    ${priorityLabels[task.priority]}
                </div>
            </div>
            
            <!-- Task Description (Hidden by default) -->
            <div id="details-${task.id}" style="
                display: none; 
                font-size: 0.9rem; 
                color: #6b7280; 
                margin-bottom: 12px; 
                line-height: 1.4;
                background: #f9fafb;
                padding: 10px;
                border-radius: 6px;
                border-left: 3px solid ${priorityColors[task.priority]};
            ">
                ${task.description}
            </div>
            
            <!-- Task Footer -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-top: 10px;">
                <span style="
                    background: #e0e7ff; 
                    color: #3730a3; 
                    padding: 4px 8px; 
                    border-radius: 12px;
                    font-weight: 500;
                ">
                    👤 ${task.assignee}
                </span>
                
                ${task.dueDate ? `
                    <span style="
                        color: #6b7280;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        📅 ${formatTaskDate(task.dueDate)}
                    </span>
                ` : ''}
            </div>
            
            <!-- Quick Actions (Hidden by default, shown on hover) -->
            <div style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255,255,255,0.95);
                border-radius: 6px;
                padding: 4px;
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
            " onmouseenter="this.style.opacity='1'; this.style.pointerEvents='auto'"
               onmouseleave="this.style.opacity='0'; this.style.pointerEvents='none'">
                <button onclick="event.stopPropagation(); deleteTask('${task.id}')" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 6px;
                    cursor: pointer;
                    font-size: 0.7rem;
                " title="Eliminar tarea">🗑️</button>
            </div>
        </div>
    `;
}

// ===== RENDER TASK STATS =====
function renderTaskStats() {
    const pending = taskData.filter(t => t.status === 'pending').length;
    const inProgress = taskData.filter(t => t.status === 'in-progress').length;
    const completed = taskData.filter(t => t.status === 'completed').length;
    const urgent = taskData.filter(t => t.priority === 'urgent').length;
    
    return `
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">${pending}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">Pendientes</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">${inProgress}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">En Progreso</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">${completed}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">Completadas</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold;">${urgent}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">Urgentes</div>
        </div>
    `;
}

// ===== DRAG & DROP FUNCTIONS =====
function allowDropTask(ev) {
    ev.preventDefault();
    ev.currentTarget.style.background = '#f0f9ff';
    ev.currentTarget.style.transform = 'scale(1.02)';
}

function dragTask(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.style.opacity = '0.5';
    console.log('🎯 Drag started:', ev.target.id);
}

function dropTask(ev) {
    ev.preventDefault();
    
    // Reset visual effects
    ev.currentTarget.style.background = 'white';
    ev.currentTarget.style.transform = 'scale(1)';
    
    const taskElementId = ev.dataTransfer.getData("text");
    const taskId = taskElementId.replace('task-', '');
    const newStatus = ev.currentTarget.dataset.status;
    
    console.log('🎯 Drop:', taskId, 'to', newStatus);
    
    // Find and update task
    const task = taskData.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        task.status = newStatus;
        
        // Save to localStorage
        saveTasksToStorage();
        
        // Refresh board
        loadTasksData();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(`✅ Tarea movida de ${getStatusLabel(oldStatus)} a ${getStatusLabel(newStatus)}`, 'success', 3000);
        }
        
        console.log('✅ Task updated successfully');
    }
    
    // Reset dragged element opacity
    document.querySelectorAll('[id^="task-"]').forEach(el => {
        el.style.opacity = '1';
    });
}

function toggleTaskDetails(taskId) {
    const details = document.getElementById(`details-${taskId}`);
    if (details) {
        const isVisible = details.style.display !== 'none';
        details.style.display = isVisible ? 'none' : 'block';
        
        // Add animation
        if (!isVisible) {
            details.style.opacity = '0';
            details.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                details.style.transition = 'all 0.3s ease';
                details.style.opacity = '1';
                details.style.transform = 'translateY(0)';
            }, 10);
        }
    }
}

// ===== MODAL FUNCTIONS =====
function openTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Animate modal
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '1';
        }, 10);
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('newTaskTitle').focus();
        }, 100);
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            // Clear form
            document.getElementById('newTaskTitle').value = '';
            document.getElementById('newTaskDesc').value = '';
            document.getElementById('newTaskAssignee').value = '';
            document.getElementById('newTaskPriority').value = 'medium';
            document.getElementById('newTaskType').value = 'sales';
        }, 300);
    }
}

function saveTask(event) {
    if (event) {
        event.preventDefault();
    }
    
    const title = document.getElementById('newTaskTitle').value.trim();
    const description = document.getElementById('newTaskDesc').value.trim();
    const priority = document.getElementById('newTaskPriority').value;
    const assignee = document.getElementById('newTaskAssignee').value.trim();
    const type = document.getElementById('newTaskType').value;
    
    if (!title || !description || !assignee) {
        alert('⚠️ Por favor completa todos los campos obligatorios');
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        description: description,
        status: 'pending',
        priority: priority,
        assignee: assignee,
        dueDate: getNextWorkDay(),
        type: type,
        createdAt: new Date().toISOString()
    };
    
    taskData.push(newTask);
    saveTasksToStorage();
    closeTaskModal();
    loadTasksData();
    
    if (window.showNotification) {
        window.showNotification(`✅ Tarea "${title}" creada exitosamente`, 'success');
    }
    
    console.log('✅ New task created:', newTask);
}

// ===== UTILITY FUNCTIONS =====
function deleteTask(taskId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
        taskData = taskData.filter(task => task.id !== taskId);
        saveTasksToStorage();
        loadTasksData();
        
        if (window.showNotification) {
            window.showNotification('🗑️ Tarea eliminada', 'info');
        }
    }
}

function refreshTasks() {
    console.log('🔄 Refreshing tasks...');
    loadTasksFromStorage();
    loadTasksData();
    
    if (window.showNotification) {
        window.showNotification('🔄 Tareas actualizadas', 'success', 2000);
    }
}

function formatTaskDate(dateString) {
    try {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        if (diffDays === -1) return 'Ayer';
        if (diffDays < 0) return `Hace ${Math.abs(diffDays)}d`;
        if (diffDays < 7) return `En ${diffDays}d`;
        
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (error) {
        return dateString;
    }
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendientes',
        'in-progress': 'En Progreso',
        'completed': 'Completadas'
    };
    return labels[status] || status;
}

function getNextWorkDay() {
    const today = new Date();
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    
    // If next day is weekend, move to Monday
    if (nextDay.getDay() === 6) { // Saturday
        nextDay.setDate(nextDay.getDate() + 2);
    } else if (nextDay.getDay() === 0) { // Sunday
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay.toISOString().split('T')[0];
}

function addSampleTasks() {
    const sampleTasks = [
        {
            id: Date.now().toString(),
            title: 'Revisar leads del día',
            description: 'Analizar y contactar leads generados hoy',
            status: 'pending',
            priority: 'high',
            assignee: 'Equipo Ventas',
            dueDate: new Date().toISOString().split('T')[0],
            type: 'sales'
        }
    ];
    
    taskData.push(...sampleTasks);
    saveTasksToStorage();
}

// ===== STORAGE FUNCTIONS =====
function saveTasksToStorage() {
    try {
        localStorage.setItem('crm_tasks', JSON.stringify(taskData));
        console.log('💾 Tasks saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving tasks:', error);
    }
}

function loadTasksFromStorage() {
    try {
        const stored = localStorage.getItem('crm_tasks');
        if (stored) {
            taskData = JSON.parse(stored);
            console.log('📂 Tasks loaded from localStorage:', taskData.length);
        }
    } catch (error) {
        console.error('❌ Error loading tasks:', error);
    }
}

// ===== INITIALIZATION =====
function initializeTasksModule() {
    console.log('🚀 Initializing Tasks Module...');
    
    // Load tasks from storage
    loadTasksFromStorage();
    
    // Load the task board
    loadTasksData();
    
    console.log('✅ Tasks Module initialized successfully');
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.loadTasksData = loadTasksData;
window.initializeTasksModule = initializeTasksModule;
window.allowDropTask = allowDropTask;
window.dragTask = dragTask;
window.dropTask = dropTask;
window.toggleTaskDetails = toggleTaskDetails;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.refreshTasks = refreshTasks;

// ===== AUTO-INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Tasks module DOM ready');
    loadTasksFromStorage();
});

console.log('✅ FIXED Task Management System with Drag & Drop loaded successfully!');
