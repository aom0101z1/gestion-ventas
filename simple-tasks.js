// ===== FIXED TASK MANAGEMENT - ROBUST CONTAINER DETECTION =====

let tasks = [
    {
        id: '1',
        title: 'Follow up with Laura Pineda',
        description: 'Contact interested lead from pipeline',
        status: 'todo',
        priority: 'high',
        assignee: 'John Doe',
        dueDate: '2024-08-14'
    },
    {
        id: '2',
        title: 'Prepare marketing materials',
        description: 'Create flyers for new English courses',
        status: 'in-progress',
        priority: 'medium',
        assignee: 'Jane Smith',
        dueDate: '2024-08-10'
    },
    {
        id: '3',
        title: 'Update CRM system',
        description: 'Add new lead sources to system',
        status: 'completed',
        priority: 'low',
        assignee: 'Admin',
        dueDate: '2024-08-05'
    }
];

// ===== IMPROVED LOADING FUNCTION WITH BETTER CONTAINER DETECTION =====
function loadTasksData() {
    console.log('📋 STARTING loadTasksData...');
    
    try {
        // Multiple strategies to find the container
        let container = null;
        
        // Strategy 1: Look for tasksContainer inside tasks tab
        const tasksTab = document.getElementById('tasks');
        if (tasksTab) {
            console.log('✅ Found tasks tab:', tasksTab);
            container = tasksTab.querySelector('#tasksContainer') || 
                       tasksTab.querySelector('.tasksContainer') ||
                       tasksTab;
        }
        
        // Strategy 2: Direct ID lookup
        if (!container) {
            container = document.getElementById('tasksContainer');
            console.log('📦 Direct container lookup:', container);
        }
        
        // Strategy 3: Create container if not found
        if (!container && tasksTab) {
            console.log('🔧 Creating tasksContainer...');
            container = document.createElement('div');
            container.id = 'tasksContainer';
            tasksTab.appendChild(container);
        }
        
        if (!container) {
            console.error('❌ NO CONTAINER FOUND - Creating emergency container');
            // Emergency: create container in body
            container = document.createElement('div');
            container.id = 'emergencyTasksContainer';
            container.style.cssText = 'position: fixed; top: 100px; left: 20px; right: 20px; bottom: 20px; background: white; z-index: 1000; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
            document.body.appendChild(container);
        }
        
        console.log('📦 Using container:', container.id);
        
        // Force container to be visible
        container.style.display = 'block';
        container.classList.remove('hidden');
        if (tasksTab) {
            tasksTab.classList.remove('hidden');
            tasksTab.style.display = 'block';
        }
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Group tasks by status
        const taskGroups = {
            'todo': tasks.filter(t => t.status === 'todo'),
            'in-progress': tasks.filter(t => t.status === 'in-progress'),
            'review': tasks.filter(t => t.status === 'review'),
            'completed': tasks.filter(t => t.status === 'completed')
        };
        
        console.log('📊 Task groups:', taskGroups);
        
        // Render the task board
        const taskBoardHTML = createTaskBoard(taskGroups);
        container.innerHTML = taskBoardHTML;
        
        console.log('✅ Task board rendered successfully');
        
        // Show success message
        if (window.showNotification) {
            window.showNotification('📋 Task management loaded successfully!', 'success', 2000);
        }
        
    } catch (error) {
        console.error('❌ ERROR in loadTasksData:', error);
        
        // Emergency fallback
        const fallbackHTML = `
            <div style="padding: 20px; background: white; border-radius: 10px; margin: 20px;">
                <h2>❌ Error Loading Tasks</h2>
                <p>Error: ${error.message}</p>
                <button onclick="location.reload()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    🔄 Reload Page
                </button>
                
                <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px;">
                    <h3>Manual Task Board (Fallback)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
                        <div style="background: #fff3cd; padding: 10px; border-radius: 5px;">
                            <h4>📝 To Do</h4>
                            <div>• Follow up with Laura Pineda</div>
                        </div>
                        <div style="background: #cce5ff; padding: 10px; border-radius: 5px;">
                            <h4>🔄 In Progress</h4>
                            <div>• Prepare marketing materials</div>
                        </div>
                        <div style="background: #d4edda; padding: 10px; border-radius: 5px;">
                            <h4>✅ Completed</h4>
                            <div>• Update CRM system</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Try to put fallback somewhere
        const anyContainer = document.getElementById('tasks') || document.getElementById('tasksContainer') || document.body;
        if (anyContainer) {
            anyContainer.innerHTML = fallbackHTML;
        }
    }
}

// ===== SIMPLIFIED TASK BOARD =====
function createTaskBoard(taskGroups) {
    return `
        <div style="padding: 20px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1f2937;">
                    📋 Task Management
                    <span style="background: #e5e7eb; color: #6b7280; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; margin-left: 10px;">
                        ${Object.values(taskGroups).flat().length} tasks
                    </span>
                </h2>
                <button onclick="createNewTask()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    ➕ Nueva Tarea
                </button>
            </div>
            
            <!-- Task Board Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; min-height: 60vh;">
                ${renderTaskColumn('todo', '📝 Todo', taskGroups['todo'], '#fbbf24')}
                ${renderTaskColumn('in-progress', '🔄 En Progreso', taskGroups['in-progress'], '#3b82f6')}
                ${renderTaskColumn('review', '👀 Revisión', taskGroups['review'], '#f97316')}
                ${renderTaskColumn('completed', '✅ Completado', taskGroups['completed'], '#10b981')}
            </div>
        </div>
        
        <!-- Simple Modal -->
        <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000;">
            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                <div style="background: white; padding: 30px; border-radius: 12px; width: 500px; max-width: 90%;">
                    <h3 style="margin: 0 0 20px 0;">✨ Nueva Tarea</h3>
                    
                    <input type="text" id="newTaskTitle" placeholder="Título de la tarea..." style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #e5e7eb; border-radius: 8px;">
                    
                    <textarea id="newTaskDesc" placeholder="Descripción..." style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #e5e7eb; border-radius: 8px; height: 80px; resize: vertical;"></textarea>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <select id="newTaskPriority" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="low">🟢 Baja</option>
                            <option value="medium" selected>🔵 Media</option>
                            <option value="high">🟠 Alta</option>
                            <option value="urgent">🔴 Urgente</option>
                        </select>
                        
                        <input type="text" id="newTaskAssignee" placeholder="Asignado a..." style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                    
                    <input type="date" id="newTaskDueDate" style="width: 100%; padding: 12px; margin-bottom: 20px; border: 2px solid #e5e7eb; border-radius: 8px;">
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="closeTaskModal()" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button onclick="saveNewTask()" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            💾 Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== RENDER TASK COLUMN =====
function renderTaskColumn(status, title, taskList, color) {
    return `
        <div class="drop-zone" 
             ondrop="dropTask(event)" 
             ondragover="allowDropTask(event)"
             data-status="${status}"
             style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; border-top: 4px solid ${color}; min-height: 400px;">
            
            <!-- Column Header -->
            <div style="background: ${color}15; padding: 1rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">${title}</div>
                <div style="background: ${color}; color: white; display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">
                    ${taskList.length}
                </div>
            </div>
            
            <!-- Tasks Container -->
            <div style="padding: 1rem; max-height: 350px; overflow-y: auto;">
                ${taskList.length === 0 ? `
                    <div style="text-align: center; color: #9ca3af; padding: 2rem;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📝</div>
                        <div>Sin tareas</div>
                    </div>
                ` : taskList.map(task => renderTaskCard(task)).join('')}
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
        urgent: '#dc2626'
    };
    
    const priorityColor = priorityColors[task.priority] || '#3b82f6';
    
    return `
        <div id="task-${task.id}" 
             draggable="true" 
             ondragstart="dragTask(event)"
             style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${priorityColor}; border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: move; transition: all 0.2s;"
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 6px;">${task.title}</div>
            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 8px;">${task.description}</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 12px;">
                    👤 ${task.assignee}
                </span>
                ${task.dueDate ? `
                    <span style="background: #f3f4f6; color: #6b7280; padding: 3px 8px; border-radius: 12px;">
                        📅 ${new Date(task.dueDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

// ===== DRAG & DROP FUNCTIONS =====
function allowDropTask(ev) {
    ev.preventDefault();
}

function dragTask(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    console.log('🎯 Dragging task:', ev.target.id);
}

function dropTask(ev) {
    ev.preventDefault();
    
    const taskElementId = ev.dataTransfer.getData("text");
    const taskId = taskElementId.replace('task-', '');
    const newStatus = ev.currentTarget.dataset.status;
    
    console.log('🎯 Dropping task:', taskId, 'to', newStatus);
    
    // Find and update task
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus;
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(`Tarea movida a ${newStatus} ✅`, 'success', 2000);
        }
        
        // Reload board
        setTimeout(() => loadTasksData(), 200);
    }
}

// ===== MODAL FUNCTIONS =====
function createNewTask() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('newTaskTitle').value = '';
        document.getElementById('newTaskDesc').value = '';
        document.getElementById('newTaskAssignee').value = '';
        document.getElementById('newTaskDueDate').value = '';
    }
}

function saveNewTask() {
    const title = document.getElementById('newTaskTitle').value.trim();
    const description = document.getElementById('newTaskDesc').value.trim();
    const priority = document.getElementById('newTaskPriority').value;
    const assignee = document.getElementById('newTaskAssignee').value.trim();
    const dueDate = document.getElementById('newTaskDueDate').value;
    
    if (!title) {
        alert('⚠️ Por favor ingresa un título');
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        description: description || 'Sin descripción',
        status: 'todo',
        priority: priority,
        assignee: assignee || 'Sin asignar',
        dueDate: dueDate || null
    };
    
    tasks.push(newTask);
    closeTaskModal();
    loadTasksData();
    
    if (window.showNotification) {
        window.showNotification(`✅ Tarea "${title}" creada`, 'success');
    }
}

// ===== EXPORT FUNCTIONS =====
window.loadTasksData = loadTasksData;
window.createNewTask = createNewTask;
window.closeTaskModal = closeTaskModal;
window.saveNewTask = saveNewTask;
window.allowDropTask = allowDropTask;
window.dragTask = dragTask;
window.dropTask = dropTask;

// ===== MANUAL TEST FUNCTION =====
window.testTasksManually = function() {
    console.log('🧪 MANUAL TASK TEST STARTING...');
    
    // Force run loadTasksData
    try {
        loadTasksData();
        console.log('✅ Manual test successful');
    } catch (error) {
        console.error('❌ Manual test failed:', error);
    }
};

console.log('✅ FIXED Task Management loaded - Try window.testTasksManually() in console');
