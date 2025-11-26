// tasks-enhanced.js - Enhanced Task Management with Accountability Features
// Phase 1: Firebase Integration + Activity Log + Read Receipts + Notifications + Overdue Tracking

console.log('📋 Loading Enhanced Task Management System...');

// ==================================================================================
// TASK MANAGER CLASS - Handles all task operations with Firebase
// ==================================================================================

class TaskManager {
    constructor() {
        this.tasks = new Map();
        this.initialized = false;
        this.currentUserEmail = null;
        this.currentUserName = null;
        this.notificationPermission = false;
    }

    // Initialize
    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing Enhanced Task Manager');

        // Get current user info
        if (window.FirebaseData?.currentUser) {
            this.currentUserEmail = window.FirebaseData.currentUser.email;
            this.currentUserName = window.FirebaseData.currentUser.email.split('@')[0];
        }

        // Request notification permission
        await this.requestNotificationPermission();

        // Load tasks from Firebase
        await this.loadTasks();

        // Check for overdue tasks periodically
        this.startOverdueChecker();

        this.initialized = true;
        console.log('✅ Task Manager initialized');
    }

    // Request browser notification permission
    async requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log('⚠️ Browser does not support notifications');
            return;
        }

        if (Notification.permission === "granted") {
            this.notificationPermission = true;
            console.log('✅ Notification permission already granted');
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            this.notificationPermission = (permission === "granted");
            console.log('🔔 Notification permission:', permission);
        }
    }

    // Show browser notification
    showNotification(title, body) {
        if (!this.notificationPermission) return;

        try {
            new Notification(title, {
                body: body,
                icon: '📋',
                tag: 'task-notification'
            });
        } catch (error) {
            console.error('❌ Error showing notification:', error);
        }
    }

    // Load tasks from Firebase
    async loadTasks() {
        try {
            console.log('📂 Loading tasks from Firebase...');

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'tasks');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log('✅ Tasks data received:', Object.keys(data || {}).length, 'tasks');

                this.tasks.clear();
                Object.entries(data).forEach(([id, task]) => {
                    this.tasks.set(id, task);
                });

                // Auto-mark task as viewed for assigned user
                await this.markViewedTasks();
            } else {
                console.log('⚠️ No tasks exist in database');
            }

            console.log(`✅ Successfully loaded ${this.tasks.size} tasks`);

        } catch (error) {
            console.error('❌ Error loading tasks:', error);
        }
    }

    // Automatically mark tasks as viewed when user opens the module
    async markViewedTasks() {
        const unviewedTasks = Array.from(this.tasks.values()).filter(task =>
            task.assignedTo === this.currentUserEmail &&
            task.status !== 'completed' &&
            !task.viewedAt
        );

        for (const task of unviewedTasks) {
            await this.markTaskAsViewed(task.id);
        }
    }

    // Mark task as viewed (READ RECEIPT)
    async markTaskAsViewed(taskId) {
        try {
            const task = this.tasks.get(taskId);
            if (!task || task.viewedAt) return;

            const now = new Date().toISOString();
            task.viewedAt = now;
            task.viewedBy = this.currentUserEmail;

            // Add activity log entry
            await this.addActivityLog(taskId, {
                action: 'viewed',
                timestamp: now,
                user: this.currentUserEmail,
                userName: this.currentUserName,
                details: `Task viewed by ${this.currentUserName}`
            });

            // Update in Firebase
            const db = window.firebaseModules.database;
            const taskRef = db.ref(window.FirebaseData.database, `tasks/${taskId}`);
            await db.update(taskRef, {
                viewedAt: now,
                viewedBy: this.currentUserEmail
            });

            console.log('👁️ Task marked as viewed:', taskId);

        } catch (error) {
            console.error('❌ Error marking task as viewed:', error);
        }
    }

    // Add activity log entry
    async addActivityLog(taskId, logEntry) {
        try {
            const db = window.firebaseModules.database;
            const logRef = db.ref(window.FirebaseData.database, `tasks/${taskId}/activityLog`);

            // Get existing logs
            const snapshot = await db.get(logRef);
            let logs = [];

            if (snapshot.exists()) {
                logs = snapshot.val() || [];
            }

            // Add new log entry
            logs.push(logEntry);

            // Save back to Firebase
            await db.set(logRef, logs);

            console.log('📝 Activity logged:', logEntry.action);

        } catch (error) {
            console.error('❌ Error adding activity log:', error);
        }
    }

    // Create new task
    async createTask(taskData) {
        try {
            const taskId = Date.now().toString();
            const now = new Date().toISOString();

            const task = {
                id: taskId,
                title: taskData.title,
                description: taskData.description,
                status: 'pending',
                priority: taskData.priority || 'medium',
                assignedTo: taskData.assignedTo,
                assignedBy: this.currentUserEmail,
                type: taskData.type || 'admin',
                dueDate: taskData.dueDate || this.getNextWorkDay(),
                createdAt: now,
                createdBy: this.currentUserEmail,
                createdByName: this.currentUserName,
                viewedAt: null,
                viewedBy: null,
                completedAt: null,
                completedBy: null,
                activityLog: [
                    {
                        action: 'created',
                        timestamp: now,
                        user: this.currentUserEmail,
                        userName: this.currentUserName,
                        details: `Task created and assigned to ${taskData.assignedTo}`
                    }
                ]
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const taskRef = db.ref(window.FirebaseData.database, `tasks/${taskId}`);
            await db.set(taskRef, task);

            // Add to local cache
            this.tasks.set(taskId, task);

            // Send notification to assignee (if not assigning to self)
            if (taskData.assignedTo !== this.currentUserEmail) {
                this.showNotification(
                    '📋 Nueva tarea asignada',
                    `${taskData.title} - Vence: ${this.formatDate(task.dueDate)}`
                );
            }

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Tarea creada',
                    'task',
                    taskId,
                    `"${taskData.title}" asignada a ${taskData.assignedTo}`,
                    { after: { taskId, title: taskData.title, assignedTo: taskData.assignedTo } }
                );
            }

            console.log('✅ Task created:', taskId);
            return task;

        } catch (error) {
            console.error('❌ Error creating task:', error);
            throw error;
        }
    }

    // Update task status
    async updateTaskStatus(taskId, newStatus, completionNotes = '') {
        try {
            const task = this.tasks.get(taskId);
            if (!task) {
                console.error('❌ Task not found:', taskId);
                return;
            }

            const now = new Date().toISOString();
            const oldStatus = task.status;
            task.status = newStatus;

            // Prepare update data
            const updates = {
                status: newStatus,
                updatedAt: now,
                updatedBy: this.currentUserEmail
            };

            // If completing task
            if (newStatus === 'completed') {
                updates.completedAt = now;
                updates.completedBy = this.currentUserEmail;
                updates.completionNotes = completionNotes;

                task.completedAt = now;
                task.completedBy = this.currentUserEmail;
                task.completionNotes = completionNotes;
            }

            // Add activity log
            await this.addActivityLog(taskId, {
                action: 'status_changed',
                timestamp: now,
                user: this.currentUserEmail,
                userName: this.currentUserName,
                details: `Status changed from ${oldStatus} to ${newStatus}`,
                oldStatus: oldStatus,
                newStatus: newStatus,
                completionNotes: completionNotes || null
            });

            // Update in Firebase
            const db = window.firebaseModules.database;
            const taskRef = db.ref(window.FirebaseData.database, `tasks/${taskId}`);
            await db.update(taskRef, updates);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Tarea actualizada',
                    'task',
                    taskId,
                    `"${task.title}" - Estado: ${oldStatus} → ${newStatus}`,
                    {
                        before: { status: oldStatus },
                        after: { status: newStatus, completionNotes }
                    }
                );
            }

            console.log('✅ Task status updated:', taskId, oldStatus, '→', newStatus);

        } catch (error) {
            console.error('❌ Error updating task status:', error);
            throw error;
        }
    }

    // Delete task
    async deleteTask(taskId) {
        try {
            const task = this.tasks.get(taskId);
            if (!task) return;

            // Add final activity log
            await this.addActivityLog(taskId, {
                action: 'deleted',
                timestamp: new Date().toISOString(),
                user: this.currentUserEmail,
                userName: this.currentUserName,
                details: `Task deleted by ${this.currentUserName}`
            });

            // Delete from Firebase
            const db = window.firebaseModules.database;
            const taskRef = db.ref(window.FirebaseData.database, `tasks/${taskId}`);
            await db.remove(taskRef);

            // Remove from cache
            this.tasks.delete(taskId);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Tarea eliminada',
                    'task',
                    taskId,
                    `"${task.title}" eliminada`,
                    { before: { taskId, title: task.title } }
                );
            }

            console.log('🗑️ Task deleted:', taskId);

        } catch (error) {
            console.error('❌ Error deleting task:', error);
            throw error;
        }
    }

    // Get overdue tasks
    getOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        return Array.from(this.tasks.values()).filter(task =>
            task.status !== 'completed' &&
            task.dueDate < today
        );
    }

    // Get tasks assigned to current user
    getMyTasks() {
        return Array.from(this.tasks.values()).filter(task =>
            task.assignedTo === this.currentUserEmail
        );
    }

    // Get tasks by status
    getTasksByStatus(status) {
        return Array.from(this.tasks.values()).filter(task => task.status === status);
    }

    // Start overdue checker (runs every hour)
    startOverdueChecker() {
        setInterval(() => {
            this.checkOverdueTasks();
        }, 60 * 60 * 1000); // Check every hour

        // Check immediately
        this.checkOverdueTasks();
    }

    // Check for overdue tasks and notify
    async checkOverdueTasks() {
        const overdueTasks = this.getOverdueTasks();
        const myOverdueTasks = overdueTasks.filter(task =>
            task.assignedTo === this.currentUserEmail
        );

        if (myOverdueTasks.length > 0) {
            this.showNotification(
                '⚠️ Tareas vencidas',
                `Tienes ${myOverdueTasks.length} tarea(s) vencida(s)`
            );
            console.log('⚠️ Overdue tasks detected:', myOverdueTasks.length);
        }
    }

    // Utility functions
    getNextWorkDay() {
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

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (error) {
            return dateString;
        }
    }
}

// Create global instance
window.TaskManagerEnhanced = new TaskManager();

// ==================================================================================
// UI RENDERING FUNCTIONS
// ==================================================================================

// Main load function
window.loadTasksTabEnhanced = async function() {
    console.log('📚 Loading Enhanced Tasks tab');

    const container = document.getElementById('tasksContainer');
    if (!container) {
        console.error('❌ tasksContainer not found!');
        return;
    }

    try {
        // Initialize if not already
        if (!window.TaskManagerEnhanced.initialized) {
            await window.TaskManagerEnhanced.init();
        }

        // Render view
        container.innerHTML = await renderEnhancedTasksView();
        console.log('✅ Enhanced Tasks tab loaded successfully');

    } catch (error) {
        console.error('❌ Error loading Enhanced Tasks tab:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                <p>❌ Error al cargar Tareas: ${error.message}</p>
                <button onclick="loadTasksTabEnhanced()" class="btn btn-primary" style="margin-top: 1rem;">
                    Reintentar
                </button>
            </div>
        `;
    }
};

// Render main tasks view
async function renderEnhancedTasksView() {
    const tasks = Array.from(window.TaskManagerEnhanced.tasks.values());
    const myTasks = window.TaskManagerEnhanced.getMyTasks();
    const overdueTasks = window.TaskManagerEnhanced.getOverdueTasks();
    const myOverdueTasks = overdueTasks.filter(t => t.assignedTo === window.TaskManagerEnhanced.currentUserEmail);

    return `
        <div style="padding: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white;">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 1.75rem;">
                        📋 Gestión de Tareas
                        ${myOverdueTasks.length > 0 ? `<span style="background: #ef4444; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem; margin-left: 0.5rem;">⚠️ ${myOverdueTasks.length} vencida(s)</span>` : ''}
                    </h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Sistema avanzado con seguimiento de responsabilidades</p>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="refreshTasksEnhanced()" class="btn" style="background: white; color: #667eea; font-weight: bold; padding: 0.75rem 1.5rem;">
                        🔄 Actualizar
                    </button>
                    <button onclick="openTaskModalEnhanced()" class="btn" style="background: #10b981; color: white; font-weight: bold; padding: 0.75rem 1.5rem;">
                        ➕ Nueva Tarea
                    </button>
                </div>
            </div>

            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                ${renderTaskStatsEnhanced(tasks, myTasks, overdueTasks)}
            </div>

            <!-- Overdue Alert -->
            ${myOverdueTasks.length > 0 ? `
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; margin-bottom: 2rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <strong style="color: #dc2626;">Tareas Vencidas</strong>
                    </div>
                    <p style="margin: 0; color: #7f1d1d;">Tienes ${myOverdueTasks.length} tarea(s) vencida(s) que requieren atención inmediata.</p>
                </div>
            ` : ''}

            <!-- Task Board -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
                ${renderTaskColumnEnhanced('pending', '⏳ Pendientes', '#f59e0b')}
                ${renderTaskColumnEnhanced('in-progress', '🔄 En Progreso', '#3b82f6')}
                ${renderTaskColumnEnhanced('completed', '✅ Completadas', '#10b981')}
            </div>
        </div>

        <!-- Task Detail Modal -->
        <div id="taskDetailModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; align-items: center; justify-content: center; overflow-y: auto;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 700px; margin: 2rem auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div id="taskDetailContent"></div>
            </div>
        </div>

        <!-- New Task Modal -->
        <div id="taskModalEnhanced" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: white; padding: 2rem; border-radius: 12px; width: 500px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                ${renderNewTaskFormEnhanced()}
            </div>
        </div>
    `;
}

// Render task stats
function renderTaskStatsEnhanced(allTasks, myTasks, overdueTasks) {
    const pending = allTasks.filter(t => t.status === 'pending').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const myPending = myTasks.filter(t => t.status !== 'completed').length;

    return `
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${pending}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Pendientes (Total)</div>
        </div>

        <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${inProgress}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">En Progreso</div>
        </div>

        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${completed}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Completadas</div>
        </div>

        <div style="background: linear-gradient(135deg, ${overdueTasks.length > 0 ? '#ef4444, #dc2626' : '#6b7280, #4b5563'}); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${overdueTasks.length}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Vencidas</div>
        </div>

        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem;">${myPending}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">Mis Tareas Activas</div>
        </div>
    `;
}

// Render task column
function renderTaskColumnEnhanced(status, title, color) {
    const tasks = window.TaskManagerEnhanced.getTasksByStatus(status);
    const today = new Date().toISOString().split('T')[0];

    return `
        <div class="drop-zone-tasks-enhanced"
             ondrop="dropTaskEnhanced(event)"
             ondragover="allowDropTaskEnhanced(event)"
             data-status="${status}"
             style="
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                border-top: 4px solid ${color};
             ">

            <div style="background: ${color}; color: white; padding: 1rem; text-align: center; font-weight: bold;">
                ${title}
                <span style="background: rgba(255,255,255,0.2); margin-left: 8px; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">
                    ${tasks.length}
                </span>
            </div>

            <div style="padding: 1rem; min-height: 400px; max-height: 600px; overflow-y: auto;">
                ${tasks.length === 0 ?
                    `<div style="text-align: center; color: #9ca3af; padding: 2rem; font-style: italic; border: 2px dashed #e5e7eb; border-radius: 8px; background: #f9fafb;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
                        No hay tareas aquí
                    </div>` :
                    tasks.map(task => renderTaskCardEnhanced(task, today)).join('')
                }
            </div>
        </div>
    `;
}

// Render task card
function renderTaskCardEnhanced(task, today) {
    const priorityColors = {
        low: '#10b981',
        medium: '#3b82f6',
        high: '#f59e0b',
        urgent: '#ef4444'
    };

    const priorityLabels = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente'
    };

    const isOverdue = task.dueDate < today && task.status !== 'completed';
    const isAssignedToMe = task.assignedTo === window.TaskManagerEnhanced.currentUserEmail;
    const hasBeenViewed = !!task.viewedAt;

    return `
        <div id="task-${task.id}"
             draggable="true"
             ondragstart="dragTaskEnhanced(event)"
             onclick="openTaskDetailEnhanced('${task.id}')"
             style="
                background: white;
                border: 2px solid ${isOverdue ? '#ef4444' : '#e5e7eb'};
                border-left: 4px solid ${priorityColors[task.priority]};
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                ${isOverdue ? 'background: #fef2f2;' : ''}
             "
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">

            <!-- Priority Badge -->
            <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: ${priorityColors[task.priority]}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">
                ${priorityLabels[task.priority]}
            </div>

            <!-- Title -->
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; padding-right: 4rem; line-height: 1.3;">
                ${task.title}
                ${isOverdue ? '<span style="color: #ef4444; margin-left: 0.25rem;">⚠️</span>' : ''}
            </div>

            <!-- Assignee -->
            <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.5rem;">
                👤 ${task.assignedTo}
                ${isAssignedToMe ? '<span style="color: #3b82f6; font-weight: 600;">(Tú)</span>' : ''}
            </div>

            <!-- Due Date -->
            <div style="font-size: 0.85rem; color: ${isOverdue ? '#ef4444' : '#6b7280'}; margin-bottom: 0.5rem;">
                📅 ${formatTaskDateEnhanced(task.dueDate)}
                ${isOverdue ? ' <strong>(VENCIDA)</strong>' : ''}
            </div>

            <!-- Status Indicators -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                ${!hasBeenViewed && isAssignedToMe && task.status !== 'completed' ?
                    '<span style="background: #fef2f2; color: #dc2626; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">👁️ No vista</span>' :
                    ''}
                ${hasBeenViewed && task.status === 'pending' ?
                    '<span style="background: #f0fdf4; color: #16a34a; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">✓ Vista</span>' :
                    ''}
            </div>
        </div>
    `;
}

// Render new task form
function renderNewTaskFormEnhanced() {
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; color: #1f2937;">➕ Nueva Tarea</h3>
            <button onclick="closeTaskModalEnhanced()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
        </div>

        <form id="newTaskFormEnhanced" onsubmit="saveTaskEnhanced(event)">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Título de la tarea *</label>
                <input type="text" id="newTaskTitleEnhanced" placeholder="Ej: Llamar cliente importante..." style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;" required>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Descripción *</label>
                <textarea id="newTaskDescEnhanced" placeholder="Detalles de la tarea..." style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; height: 80px; resize: vertical;" required></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Prioridad</label>
                    <select id="newTaskPriorityEnhanced" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <option value="low">🟢 Baja</option>
                        <option value="medium" selected>🔵 Media</option>
                        <option value="high">🟠 Alta</option>
                        <option value="urgent">🔴 Urgente</option>
                    </select>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Tipo</label>
                    <select id="newTaskTypeEnhanced" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                        <option value="admin">📋 Administrativo</option>
                        <option value="sales">💰 Ventas</option>
                        <option value="payment">💳 Pagos</option>
                        <option value="marketing">📢 Marketing</option>
                        <option value="support">🛠️ Soporte</option>
                        <option value="teaching">👩‍🏫 Docente</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Asignado a (Email) *</label>
                <input type="email" id="newTaskAssigneeEnhanced" placeholder="email@example.com" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;" required>
                <small style="color: #6b7280; font-size: 0.85rem;">Debe ser el email registrado del usuario</small>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Fecha de vencimiento</label>
                <input type="date" id="newTaskDueDateEnhanced" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
            </div>

            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" onclick="closeTaskModalEnhanced()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cancelar
                </button>
                <button type="submit" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    💾 Crear Tarea
                </button>
            </div>
        </form>
    `;
}

// Format date for display
function formatTaskDateEnhanced(dateString) {
    try {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        if (diffDays === -1) return 'Ayer';
        if (diffDays < 0) return `Hace ${Math.abs(diffDays)} día(s)`;
        if (diffDays < 7) return `En ${diffDays} día(s)`;

        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (error) {
        return dateString;
    }
}

// ==================================================================================
// MODAL & INTERACTION FUNCTIONS
// ==================================================================================

window.openTaskModalEnhanced = function() {
    const modal = document.getElementById('taskModalEnhanced');
    if (modal) {
        modal.style.display = 'flex';
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('newTaskDueDateEnhanced').value = tomorrow.toISOString().split('T')[0];
        // Focus first input
        setTimeout(() => document.getElementById('newTaskTitleEnhanced').focus(), 100);
    }
};

window.closeTaskModalEnhanced = function() {
    const modal = document.getElementById('taskModalEnhanced');
    if (modal) {
        modal.style.display = 'none';
        // Clear form
        document.getElementById('newTaskFormEnhanced').reset();
    }
};

window.saveTaskEnhanced = async function(event) {
    event.preventDefault();

    const title = document.getElementById('newTaskTitleEnhanced').value.trim();
    const description = document.getElementById('newTaskDescEnhanced').value.trim();
    const priority = document.getElementById('newTaskPriorityEnhanced').value;
    const type = document.getElementById('newTaskTypeEnhanced').value;
    const assignedTo = document.getElementById('newTaskAssigneeEnhanced').value.trim().toLowerCase();
    const dueDate = document.getElementById('newTaskDueDateEnhanced').value;

    if (!title || !description || !assignedTo) {
        alert('⚠️ Por favor completa todos los campos obligatorios');
        return;
    }

    try {
        await window.TaskManagerEnhanced.createTask({
            title,
            description,
            priority,
            type,
            assignedTo,
            dueDate: dueDate || window.TaskManagerEnhanced.getNextWorkDay()
        });

        closeTaskModalEnhanced();
        await loadTasksTabEnhanced();

        if (window.showNotification) {
            window.showNotification(`✅ Tarea "${title}" creada exitosamente`, 'success');
        }
    } catch (error) {
        console.error('❌ Error creating task:', error);
        alert('❌ Error al crear la tarea. Por favor intenta de nuevo.');
    }
};

window.refreshTasksEnhanced = async function() {
    console.log('🔄 Refreshing enhanced tasks...');
    await window.TaskManagerEnhanced.loadTasks();
    await loadTasksTabEnhanced();

    if (window.showNotification) {
        window.showNotification('🔄 Tareas actualizadas', 'success', 2000);
    }
};

// ==================================================================================
// DRAG & DROP FUNCTIONS
// ==================================================================================

window.allowDropTaskEnhanced = function(ev) {
    ev.preventDefault();
    ev.currentTarget.style.background = '#f0f9ff';
};

window.dragTaskEnhanced = function(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.style.opacity = '0.5';
};

window.dropTaskEnhanced = async function(ev) {
    ev.preventDefault();
    ev.currentTarget.style.background = 'white';

    const taskElementId = ev.dataTransfer.getData("text");
    const taskId = taskElementId.replace('task-', '');
    const newStatus = ev.currentTarget.dataset.status;

    const task = window.TaskManagerEnhanced.tasks.get(taskId);
    if (!task || task.status === newStatus) {
        document.querySelectorAll('[id^="task-"]').forEach(el => el.style.opacity = '1');
        return;
    }

    // If moving to completed, ask for completion notes
    if (newStatus === 'completed') {
        const notes = prompt('📝 Notas de finalización (opcional):\n\n¿Qué se hizo para completar esta tarea?');
        if (notes === null) {
            document.querySelectorAll('[id^="task-"]').forEach(el => el.style.opacity = '1');
            return; // User cancelled
        }
        await window.TaskManagerEnhanced.updateTaskStatus(taskId, newStatus, notes);
    } else {
        await window.TaskManagerEnhanced.updateTaskStatus(taskId, newStatus);
    }

    await loadTasksTabEnhanced();

    if (window.showNotification) {
        const statusLabels = {
            'pending': 'Pendientes',
            'in-progress': 'En Progreso',
            'completed': 'Completadas'
        };
        window.showNotification(`✅ Tarea movida a ${statusLabels[newStatus]}`, 'success', 3000);
    }

    document.querySelectorAll('[id^="task-"]').forEach(el => el.style.opacity = '1');
};

// Open task detail modal with activity log
window.openTaskDetailEnhanced = async function(taskId) {
    const task = window.TaskManagerEnhanced.tasks.get(taskId);
    if (!task) return;

    // Mark as viewed if assigned to current user and not viewed yet
    if (task.assignedTo === window.TaskManagerEnhanced.currentUserEmail && !task.viewedAt) {
        await window.TaskManagerEnhanced.markTaskAsViewed(taskId);
        // Reload to update UI
        await window.TaskManagerEnhanced.loadTasks();
    }

    const modal = document.getElementById('taskDetailModal');
    const content = document.getElementById('taskDetailContent');

    if (!modal || !content) return;

    const priorityColors = {
        low: '#10b981',
        medium: '#3b82f6',
        high: '#f59e0b',
        urgent: '#ef4444'
    };

    const priorityLabels = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente'
    };

    const statusLabels = {
        'pending': 'Pendiente',
        'in-progress': 'En Progreso',
        'completed': 'Completada'
    };

    content.innerHTML = `
        <div style="padding: 2rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                <div style="flex: 1;">
                    <h2 style="margin: 0 0 0.5rem 0; color: #1f2937;">${task.title}</h2>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="background: ${priorityColors[task.priority]}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                            ${priorityLabels[task.priority]}
                        </span>
                        <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                            ${statusLabels[task.status]}
                        </span>
                    </div>
                </div>
                <button onclick="closeTaskDetailModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
            </div>

            <!-- Task Info -->
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <div style="margin-bottom: 0.75rem;">
                    <strong style="color: #374151;">Descripción:</strong>
                    <p style="margin: 0.25rem 0 0 0; color: #6b7280;">${task.description}</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <strong style="color: #374151;">Asignado a:</strong>
                        <p style="margin: 0.25rem 0 0 0; color: #6b7280;">👤 ${task.assignedTo}</p>
                    </div>
                    <div>
                        <strong style="color: #374151;">Creado por:</strong>
                        <p style="margin: 0.25rem 0 0 0; color: #6b7280;">👤 ${task.createdByName || task.createdBy}</p>
                    </div>
                    <div>
                        <strong style="color: #374151;">Fecha límite:</strong>
                        <p style="margin: 0.25rem 0 0 0; color: #6b7280;">📅 ${formatTaskDateEnhanced(task.dueDate)}</p>
                    </div>
                    <div>
                        <strong style="color: #374151;">Creada:</strong>
                        <p style="margin: 0.25rem 0 0 0; color: #6b7280;">🕐 ${new Date(task.createdAt).toLocaleString('es-ES')}</p>
                    </div>
                </div>
            </div>

            <!-- Read Receipt -->
            ${task.viewedAt ? `
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span style="font-size: 1.25rem;">✓</span>
                        <strong style="color: #16a34a;">Tarea Vista</strong>
                    </div>
                    <p style="margin: 0; color: #15803d; font-size: 0.9rem;">
                        Vista por ${task.viewedBy} el ${new Date(task.viewedAt).toLocaleString('es-ES')}
                    </p>
                </div>
            ` : task.assignedTo === window.TaskManagerEnhanced.currentUserEmail ? `
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span style="font-size: 1.25rem;">👁️</span>
                        <strong style="color: #dc2626;">No Vista</strong>
                    </div>
                    <p style="margin: 0; color: #991b1b; font-size: 0.9rem;">
                        Esta tarea aún no ha sido vista por el asignado
                    </p>
                </div>
            ` : ''}

            <!-- Completion Info -->
            ${task.completedAt ? `
                <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.25rem;">✅</span>
                        <strong style="color: #059669;">Tarea Completada</strong>
                    </div>
                    <p style="margin: 0 0 0.5rem 0; color: #047857; font-size: 0.9rem;">
                        Completada por ${task.completedBy} el ${new Date(task.completedAt).toLocaleString('es-ES')}
                    </p>
                    ${task.completionNotes ? `
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #a7f3d0;">
                            <strong style="color: #047857; font-size: 0.9rem;">Notas de finalización:</strong>
                            <p style="margin: 0.25rem 0 0 0; color: #065f46; font-size: 0.9rem;">${task.completionNotes}</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Activity Log -->
            <div style="margin-top: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.1rem;">📜 Registro de Actividad</h3>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: white;">
                    ${task.activityLog && task.activityLog.length > 0 ?
                        task.activityLog.map((log, index) => `
                            <div style="padding: 0.75rem; background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; border-radius: 6px; margin-bottom: 0.5rem;">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.25rem;">
                                    <strong style="color: #1f2937; font-size: 0.9rem;">${log.action === 'created' ? '✨ Creada' : log.action === 'viewed' ? '👁️ Vista' : log.action === 'status_changed' ? '🔄 Estado cambiado' : log.action === 'deleted' ? '🗑️ Eliminada' : log.action}</strong>
                                    <span style="color: #6b7280; font-size: 0.8rem;">${new Date(log.timestamp).toLocaleString('es-ES')}</span>
                                </div>
                                <p style="margin: 0; color: #6b7280; font-size: 0.85rem;">${log.details}</p>
                                <p style="margin: 0.25rem 0 0 0; color: #9ca3af; font-size: 0.75rem;">Por: ${log.userName || log.user}</p>
                            </div>
                        `).reverse().join('') :
                        '<p style="color: #6b7280; text-align: center; padding: 1rem;">No hay actividad registrada</p>'
                    }
                </div>
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
                ${task.status !== 'completed' && task.assignedTo === window.TaskManagerEnhanced.currentUserEmail ? `
                    <button onclick="completeTaskFromDetail('${task.id}')" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ✅ Marcar Completada
                    </button>
                ` : ''}
                <button onclick="deleteTaskEnhanced('${task.id}')" style="padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🗑️ Eliminar Tarea
                </button>
                <button onclick="closeTaskDetailModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeTaskDetailModal = function() {
    const modal = document.getElementById('taskDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.completeTaskFromDetail = async function(taskId) {
    const notes = prompt('📝 Notas de finalización (opcional):\n\n¿Qué se hizo para completar esta tarea?');
    if (notes === null) return; // User cancelled

    try {
        await window.TaskManagerEnhanced.updateTaskStatus(taskId, 'completed', notes || '');
        closeTaskDetailModal();
        await loadTasksTabEnhanced();

        if (window.showNotification) {
            window.showNotification('✅ Tarea marcada como completada', 'success');
        }
    } catch (error) {
        console.error('❌ Error completing task:', error);
        alert('❌ Error al completar la tarea');
    }
};

window.deleteTaskEnhanced = async function(taskId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        await window.TaskManagerEnhanced.deleteTask(taskId);
        closeTaskDetailModal();
        await loadTasksTabEnhanced();

        if (window.showNotification) {
            window.showNotification('🗑️ Tarea eliminada', 'info');
        }
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        alert('❌ Error al eliminar la tarea');
    }
};

// ==================================================================================
// INITIALIZATION
// ==================================================================================

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Enhanced Tasks module DOM ready');

    // Check if tasks tab is active and initialize
    const tasksContainer = document.getElementById('tasksContainer');
    if (tasksContainer && tasksContainer.offsetParent !== null) {
        await window.TaskManagerEnhanced.init();
    }
});

console.log('✅ Enhanced Task Management System loaded successfully!');
