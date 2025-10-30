// ==================================================================================
// AUDITLOG.JS - COMPREHENSIVE ACTIVITY TRACKING & AUDIT TRAIL
// Version: 1.0
// Purpose: Track all system activities with before/after values, user attribution, and filtering
// ==================================================================================

console.log('📋 Loading audit log module...');

// ==================================================================================
// SECTION 1: AUDIT LOG DATA STRUCTURE
// ==================================================================================

/**
 * Activity Types for categorization
 */
const ActivityTypes = {
    STUDENT_ADD: 'Estudiante añadido',
    STUDENT_EDIT: 'Estudiante editado',
    STUDENT_DELETE: 'Estudiante eliminado',
    STUDENT_STATUS: 'Estado de estudiante cambiado',
    PAYMENT_ADD: 'Pago registrado',
    PAYMENT_EDIT: 'Pago editado',
    PAYMENT_DELETE: 'Pago eliminado',
    EXPENSE_ADD: 'Gasto registrado',
    EXPENSE_DELETE: 'Gasto eliminado',
    RECONCILIATION_SAVE: 'Cierre diario guardado',
    RECONCILIATION_CLOSE: 'Día cerrado',
    USER_ADD: 'Usuario añadido',
    USER_EDIT: 'Usuario editado',
    USER_DELETE: 'Usuario eliminado',
    INVOICE_GENERATE: 'Factura generada',
    TASK_ADD: 'Tarea añadida',
    TASK_EDIT: 'Tarea editada',
    TASK_DELETE: 'Tarea eliminada',
    CONTACT_ADD: 'Contacto añadido',
    CONTACT_EDIT: 'Contacto editado',
    CONTACT_DELETE: 'Contacto eliminado'
};

/**
 * Activity Icons mapping
 */
const ActivityIcons = {
    'Estudiante añadido': '➕👥',
    'Estudiante editado': '✏️👥',
    'Estudiante eliminado': '🗑️👥',
    'Estado de estudiante cambiado': '🔄👥',
    'Pago registrado': '💰',
    'Pago editado': '✏️💰',
    'Pago eliminado': '🗑️💰',
    'Gasto registrado': '💸',
    'Gasto eliminado': '🗑️💸',
    'Cierre diario guardado': '💾',
    'Día cerrado': '🔒',
    'Usuario añadido': '➕👤',
    'Usuario editado': '✏️👤',
    'Usuario eliminado': '🗑️👤',
    'Factura generada': '🧾',
    'Tarea añadida': '➕📋',
    'Tarea editada': '✏️📋',
    'Tarea eliminada': '🗑️📋',
    'Contacto añadido': '➕📞',
    'Contacto editado': '✏️📞',
    'Contacto eliminado': '🗑️📞'
};

// ==================================================================================
// SECTION 2: AUDIT LOG MANAGER CLASS
// ==================================================================================

class AuditLogManager {
    constructor() {
        this.logs = new Map();
        this.initialized = false;
    }

    // Initialize module
    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing audit log manager');
        await this.loadLogs();
        this.initialized = true;
    }

    // Load logs from Firebase
    async loadLogs(startDate = null, endDate = null) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'auditLog');
            const snapshot = await db.get(ref);

            this.logs.clear();

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, log]) => {
                    // Filter by date if specified
                    if (startDate || endDate) {
                        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                        if (startDate && logDate < startDate) return;
                        if (endDate && logDate > endDate) return;
                    }
                    this.logs.set(id, log);
                });
            }
            console.log(`✅ Loaded ${this.logs.size} audit logs`);
        } catch (error) {
            console.error('❌ Error loading audit logs:', error);
        }
    }

    /**
     * Log an activity to the audit trail
     * @param {string} activityType - Type of activity from ActivityTypes
     * @param {string} entityType - Entity type (student, payment, expense, etc.)
     * @param {string} entityId - ID of the affected entity
     * @param {string} description - Human-readable description
     * @param {object} details - Additional details (before/after values, amounts, etc.)
     */
    async logActivity(activityType, entityType, entityId, description, details = {}) {
        try {
            const id = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const logEntry = {
                id,
                activityType,
                entityType,
                entityId,
                description,
                details: JSON.stringify(details), // Store as JSON string for Firebase
                userId: window.FirebaseData.currentUser?.uid || 'system',
                userName: window.FirebaseData.currentUser?.email || 'Sistema',
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0] // For easy date filtering
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `auditLog/${id}`);
            await db.set(ref, logEntry);

            this.logs.set(id, logEntry);
            console.log('✅ Activity logged:', activityType, description);
            return logEntry;
        } catch (error) {
            console.error('❌ Error logging activity:', error);
            throw error;
        }
    }

    // Get filtered logs
    getLogs(filters = {}) {
        let logs = Array.from(this.logs.values());

        // Filter by date range
        if (filters.startDate) {
            logs = logs.filter(log => log.date >= filters.startDate);
        }
        if (filters.endDate) {
            logs = logs.filter(log => log.date <= filters.endDate);
        }

        // Filter by user
        if (filters.userId && filters.userId !== 'all') {
            logs = logs.filter(log => log.userId === filters.userId);
        }

        // Filter by activity type
        if (filters.activityType && filters.activityType !== 'all') {
            logs = logs.filter(log => log.activityType === filters.activityType);
        }

        // Filter by entity type
        if (filters.entityType && filters.entityType !== 'all') {
            logs = logs.filter(log => log.entityType === filters.entityType);
        }

        // Search in description
        if (filters.search) {
            const search = filters.search.toLowerCase();
            logs = logs.filter(log =>
                log.description?.toLowerCase().includes(search) ||
                log.userName?.toLowerCase().includes(search) ||
                log.activityType?.toLowerCase().includes(search)
            );
        }

        // Sort by timestamp descending (newest first)
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Get activity summary for a date range
    async getActivitySummary(startDate, endDate) {
        const logs = this.getLogs({ startDate, endDate });

        const summary = {
            totalActivities: logs.length,
            byType: {},
            byUser: {},
            byEntity: {},
            byDate: {}
        };

        logs.forEach(log => {
            // Count by activity type
            summary.byType[log.activityType] = (summary.byType[log.activityType] || 0) + 1;

            // Count by user
            summary.byUser[log.userName] = (summary.byUser[log.userName] || 0) + 1;

            // Count by entity type
            summary.byEntity[log.entityType] = (summary.byEntity[log.entityType] || 0) + 1;

            // Count by date
            summary.byDate[log.date] = (summary.byDate[log.date] || 0) + 1;
        });

        return summary;
    }

    // Get unique users from logs
    getUniqueUsers() {
        const users = new Set();
        this.logs.forEach(log => {
            users.add(JSON.stringify({ id: log.userId, name: log.userName }));
        });
        return Array.from(users).map(u => JSON.parse(u));
    }

    // Get unique activity types from logs
    getUniqueActivityTypes() {
        const types = new Set();
        this.logs.forEach(log => types.add(log.activityType));
        return Array.from(types).sort();
    }
}

// ==================================================================================
// SECTION 3: UI RENDERING FUNCTIONS
// ==================================================================================

/**
 * Render the audit log view with timeline and filters
 */
function renderAuditLogView() {
    // Get current filters from localStorage or defaults
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const currentStartDate = localStorage.getItem('auditLogStartDate') || thirtyDaysAgo;
    const currentEndDate = localStorage.getItem('auditLogEndDate') || today;
    const currentUser = localStorage.getItem('auditLogUser') || 'all';
    const currentActivityType = localStorage.getItem('auditLogActivityType') || 'all';
    const currentEntityType = localStorage.getItem('auditLogEntityType') || 'all';

    const filters = {
        startDate: currentStartDate,
        endDate: currentEndDate,
        userId: currentUser,
        activityType: currentActivityType,
        entityType: currentEntityType
    };

    const logs = window.AuditLogManager.getLogs(filters);
    const uniqueUsers = window.AuditLogManager.getUniqueUsers();
    const uniqueActivityTypes = window.AuditLogManager.getUniqueActivityTypes();

    return `
        <div style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
            <!-- Header -->
            <div style="margin-bottom: 2rem;">
                <h1 style="margin: 0 0 0.5rem 0;">📋 Registro de Actividad</h1>
                <p style="color: #6b7280; margin: 0;">Historial completo de todas las actividades del sistema</p>
            </div>

            <!-- Filters -->
            <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <h3 style="margin: 0 0 1rem 0;">🔍 Filtros</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            Fecha Inicio
                        </label>
                        <input type="date" id="auditLogStartDate" value="${currentStartDate}"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div class="form-group">
                        <label style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            Fecha Fin
                        </label>
                        <input type="date" id="auditLogEndDate" value="${currentEndDate}"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>

                    <div class="form-group">
                        <label style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            Usuario
                        </label>
                        <select id="auditLogUser" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            <option value="all" ${currentUser === 'all' ? 'selected' : ''}>Todos</option>
                            ${uniqueUsers.map(user => `
                                <option value="${user.id}" ${currentUser === user.id ? 'selected' : ''}>
                                    ${user.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            Tipo de Actividad
                        </label>
                        <select id="auditLogActivityType" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            <option value="all" ${currentActivityType === 'all' ? 'selected' : ''}>Todas</option>
                            ${uniqueActivityTypes.map(type => `
                                <option value="${type}" ${currentActivityType === type ? 'selected' : ''}>
                                    ${type}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            Entidad
                        </label>
                        <select id="auditLogEntityType" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                            <option value="all" ${currentEntityType === 'all' ? 'selected' : ''}>Todas</option>
                            <option value="student" ${currentEntityType === 'student' ? 'selected' : ''}>Estudiantes</option>
                            <option value="payment" ${currentEntityType === 'payment' ? 'selected' : ''}>Pagos</option>
                            <option value="expense" ${currentEntityType === 'expense' ? 'selected' : ''}>Gastos</option>
                            <option value="reconciliation" ${currentEntityType === 'reconciliation' ? 'selected' : ''}>Cierres</option>
                            <option value="user" ${currentEntityType === 'user' ? 'selected' : ''}>Usuarios</option>
                            <option value="invoice" ${currentEntityType === 'invoice' ? 'selected' : ''}>Facturas</option>
                            <option value="task" ${currentEntityType === 'task' ? 'selected' : ''}>Tareas</option>
                            <option value="contact" ${currentEntityType === 'contact' ? 'selected' : ''}>Contactos</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">
                            Buscar
                        </label>
                        <input type="text" id="auditLogSearch" placeholder="Buscar..."
                               style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
                    </div>
                </div>

                <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                    <button onclick="applyAuditLogFilters()" class="btn btn-primary">
                        🔍 Aplicar Filtros
                    </button>
                    <button onclick="resetAuditLogFilters()" class="btn btn-secondary">
                        🔄 Limpiar Filtros
                    </button>
                </div>
            </div>

            <!-- Summary Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">Total Actividades</div>
                    <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${logs.length}</div>
                </div>
            </div>

            <!-- Timeline -->
            <div id="auditLogTimeline">
                ${renderAuditLogTimeline(logs)}
            </div>
        </div>
    `;
}

/**
 * Render audit log entries as timeline
 */
function renderAuditLogTimeline(logs) {
    if (!logs || logs.length === 0) {
        return `
            <div style="background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p style="color: #6b7280; font-size: 1.1rem;">No hay actividades registradas para los filtros seleccionados</p>
            </div>
        `;
    }

    // Group logs by date
    const logsByDate = {};
    logs.forEach(log => {
        if (!logsByDate[log.date]) {
            logsByDate[log.date] = [];
        }
        logsByDate[log.date].push(log);
    });

    return Object.entries(logsByDate)
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort dates descending
        .map(([date, dateLogs]) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dateLabel = dateObj.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return `
                <div style="margin-bottom: 2rem;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.75rem 1.5rem; border-radius: 8px; margin-bottom: 1rem; font-weight: 600;">
                        📅 ${dateLabel}
                    </div>

                    <div style="background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                        ${dateLogs.map(log => renderAuditLogEntry(log)).join('')}
                    </div>
                </div>
            `;
        }).join('');
}

/**
 * Render individual audit log entry
 */
function renderAuditLogEntry(log) {
    const time = new Date(log.timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const icon = ActivityIcons[log.activityType] || '📝';

    let details = {};
    try {
        details = JSON.parse(log.details);
    } catch (e) {
        details = {};
    }

    return `
        <div style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; gap: 1.5rem; align-items: start;">
            <!-- Time -->
            <div style="min-width: 80px; text-align: center;">
                <div style="font-size: 1.2rem; font-weight: bold; color: #667eea;">🕐</div>
                <div style="font-size: 0.9rem; color: #6b7280;">${time}</div>
            </div>

            <!-- Icon -->
            <div style="font-size: 2rem; line-height: 1;">
                ${icon}
            </div>

            <!-- Content -->
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">
                            ${log.activityType}
                        </div>
                        <div style="color: #4b5563; margin-bottom: 0.5rem;">
                            ${log.description}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 150px;">
                        <div style="font-size: 0.85rem; color: #6b7280;">
                            👤 ${log.userName}
                        </div>
                    </div>
                </div>

                <!-- Details -->
                ${Object.keys(details).length > 0 ? `
                    <button onclick="toggleAuditLogDetails('${log.id}')"
                            class="btn btn-sm"
                            style="background: #f3f4f6; color: #374151; padding: 0.25rem 0.75rem; font-size: 0.85rem;">
                        <span id="auditLogToggleIcon-${log.id}">▼</span> Ver Detalles
                    </button>
                    <div id="auditLogDetails-${log.id}" style="display: none; margin-top: 1rem; background: #f9fafb; padding: 1rem; border-radius: 6px; border-left: 3px solid #667eea;">
                        ${renderAuditLogDetails(details)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render details section with before/after values
 */
function renderAuditLogDetails(details) {
    let html = '<div style="font-family: monospace; font-size: 0.85rem;">';

    // Show before/after if exists
    if (details.before || details.after) {
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">';

        if (details.before) {
            html += `
                <div>
                    <div style="font-weight: 600; color: #ef4444; margin-bottom: 0.5rem;">❌ Antes:</div>
                    <div style="background: white; padding: 0.75rem; border-radius: 4px;">
                        ${formatDetailsObject(details.before)}
                    </div>
                </div>
            `;
        }

        if (details.after) {
            html += `
                <div>
                    <div style="font-weight: 600; color: #10b981; margin-bottom: 0.5rem;">✅ Después:</div>
                    <div style="background: white; padding: 0.75rem; border-radius: 4px;">
                        ${formatDetailsObject(details.after)}
                    </div>
                </div>
            `;
        }

        html += '</div>';
    }

    // Show other details
    Object.entries(details).forEach(([key, value]) => {
        if (key !== 'before' && key !== 'after') {
            html += `<div style="margin-bottom: 0.5rem;"><strong>${key}:</strong> ${formatDetailValue(value)}</div>`;
        }
    });

    html += '</div>';
    return html;
}

/**
 * Format details object for display
 */
function formatDetailsObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return formatDetailValue(obj);
    }

    return Object.entries(obj)
        .map(([key, value]) => `<div style="margin-bottom: 0.25rem;"><strong>${key}:</strong> ${formatDetailValue(value)}</div>`)
        .join('');
}

/**
 * Format individual detail value
 */
function formatDetailValue(value) {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
}

// ==================================================================================
// SECTION 4: WINDOW FUNCTIONS
// ==================================================================================

window.AuditLogManager = new AuditLogManager();

/**
 * Load audit log tab
 */
window.loadAuditLogTab = async function() {
    console.log('📋 Loading audit log tab');

    const container = document.getElementById('auditLogContainer');
    if (!container) {
        console.error('❌ Audit log container not found');
        return;
    }

    // Check if user is director
    const userProfile = await window.FirebaseData.loadUserProfile();
    if (userProfile?.role !== 'director') {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                <h2 style="color: #ef4444;">Acceso Denegado</h2>
                <p style="color: #6b7280;">Solo los directores pueden ver el registro de actividad.</p>
            </div>
        `;
        return;
    }

    await window.AuditLogManager.init();
    container.innerHTML = renderAuditLogView();
};

/**
 * Apply filters to audit log
 */
window.applyAuditLogFilters = function() {
    const startDate = document.getElementById('auditLogStartDate').value;
    const endDate = document.getElementById('auditLogEndDate').value;
    const userId = document.getElementById('auditLogUser').value;
    const activityType = document.getElementById('auditLogActivityType').value;
    const entityType = document.getElementById('auditLogEntityType').value;
    const search = document.getElementById('auditLogSearch').value;

    // Save to localStorage
    localStorage.setItem('auditLogStartDate', startDate);
    localStorage.setItem('auditLogEndDate', endDate);
    localStorage.setItem('auditLogUser', userId);
    localStorage.setItem('auditLogActivityType', activityType);
    localStorage.setItem('auditLogEntityType', entityType);

    // Get filtered logs
    const filters = {
        startDate,
        endDate,
        userId,
        activityType,
        entityType,
        search
    };

    const logs = window.AuditLogManager.getLogs(filters);

    // Update timeline
    document.getElementById('auditLogTimeline').innerHTML = renderAuditLogTimeline(logs);
};

/**
 * Reset all filters
 */
window.resetAuditLogFilters = function() {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    localStorage.setItem('auditLogStartDate', thirtyDaysAgo);
    localStorage.setItem('auditLogEndDate', today);
    localStorage.setItem('auditLogUser', 'all');
    localStorage.setItem('auditLogActivityType', 'all');
    localStorage.setItem('auditLogEntityType', 'all');

    loadAuditLogTab();
};

/**
 * Toggle details visibility
 */
window.toggleAuditLogDetails = function(logId) {
    const details = document.getElementById(`auditLogDetails-${logId}`);
    const icon = document.getElementById(`auditLogToggleIcon-${logId}`);

    if (details && icon) {
        if (details.style.display === 'none') {
            details.style.display = 'block';
            icon.textContent = '▲';
        } else {
            details.style.display = 'none';
            icon.textContent = '▼';
        }
    }
};

// ==================================================================================
// SECTION 5: EXPORT AUDIT LOG FUNCTION (FOR STUDENTS.JS, PAYMENTS.JS, ETC.)
// ==================================================================================

/**
 * Wrapper function for easy audit logging from other modules
 * Usage: window.logAudit('Estudiante añadido', 'student', studentId, 'María González - C.C 12345', { after: studentData })
 */
window.logAudit = async function(activityType, entityType, entityId, description, details = {}) {
    try {
        if (!window.AuditLogManager.initialized) {
            await window.AuditLogManager.init();
        }
        return await window.AuditLogManager.logActivity(activityType, entityType, entityId, description, details);
    } catch (error) {
        console.error('❌ Error logging audit:', error);
    }
};

console.log('✅ Audit log module loaded successfully');
