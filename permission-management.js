// permission-management.js - UI for managing roles and permissions

// Permission Manager
const PermissionManager = {
    roles: new Map(),
    userPermissions: new Map(),
    
    async init() {
        await this.loadRoles();
        await this.loadUserPermissions();
    },
    
    async loadRoles() {
        try {
            const db = window.firebaseModules.database;
            const rolesRef = db.ref(window.FirebaseData.database, 'permissions/roles');
            const snapshot = await db.get(rolesRef);
            
            if (snapshot.exists()) {
                const roles = snapshot.val();
                Object.entries(roles).forEach(([id, role]) => {
                    this.roles.set(id, role);
                });
            } else {
                // Create default roles
                await this.createDefaultRoles();
            }
        } catch (error) {
            console.error('Error loading roles:', error);
        }
    },
    
    async loadUserPermissions() {
        try {
            const db = window.firebaseModules.database;
            const usersRef = db.ref(window.FirebaseData.database, 'permissions/users');
            const snapshot = await db.get(usersRef);
            
            if (snapshot.exists()) {
                const users = snapshot.val();
                Object.entries(users).forEach(([uid, perms]) => {
                    this.userPermissions.set(uid, perms);
                });
            }
        } catch (error) {
            console.error('Error loading user permissions:', error);
        }
    },
    
    async createDefaultRoles() {
        const defaultRoles = {
            admin: {
                name: 'Administrador',
                modules: ['*'],
                description: 'Acceso completo al sistema',
                canCreateRoles: true,
                canAssignPermissions: true
            },
            sales: {
                name: 'Ventas',
                modules: ['social', 'pipeline', 'tasks'],
                description: 'Gestión de ventas y contactos',
                canCreateRoles: false,
                canAssignPermissions: false
            }
        };
        
        for (const [id, role] of Object.entries(defaultRoles)) {
            await this.saveRole(id, role);
        }
    },
    
    async saveRole(roleId, roleData) {
        try {
            const db = window.firebaseModules.database;
            const roleRef = db.ref(window.FirebaseData.database, `permissions/roles/${roleId}`);
            await db.set(roleRef, roleData);
            this.roles.set(roleId, roleData);
            console.log('✅ Role saved:', roleId);
        } catch (error) {
            console.error('Error saving role:', error);
            throw error;
        }
    },
    
    async deleteRole(roleId) {
        if (roleId === 'admin' || roleId === 'sales') {
            throw new Error('No se pueden eliminar roles del sistema');
        }
        
        try {
            const db = window.firebaseModules.database;
            const roleRef = db.ref(window.FirebaseData.database, `permissions/roles/${roleId}`);
            await db.remove(roleRef);
            this.roles.delete(roleId);
        } catch (error) {
            console.error('Error deleting role:', error);
            throw error;
        }
    },
    
    async assignUserRole(userId, roleId, additionalModules = [], restrictedModules = []) {
        try {
            const db = window.firebaseModules.database;
            const userPermRef = db.ref(window.FirebaseData.database, `permissions/users/${userId}`);
            
            const permissions = {
                role: roleId,
                additionalModules,
                restrictedModules,
                assignedAt: new Date().toISOString(),
                assignedBy: window.FirebaseData.currentUser.uid
            };
            
            await db.set(userPermRef, permissions);
            this.userPermissions.set(userId, permissions);
            
            console.log('✅ User permissions updated:', userId);
        } catch (error) {
            console.error('Error assigning user role:', error);
            throw error;
        }
    }
};

// UI Functions
function renderPermissionManagement() {
    return `
        <div style="padding: 1rem;">
            <h2 style="margin-bottom: 1.5rem;">🔐 Control de Acceso</h2>
            
            <!-- Tabs -->
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid #e5e7eb;">
                <button onclick="showPermissionTab('roles')" id="rolesTab" 
                        style="padding: 0.75rem 1.5rem; background: none; border: none; 
                               cursor: pointer; border-bottom: 3px solid #3b82f6;">
                    👥 Roles
                </button>
                <button onclick="showPermissionTab('users')" id="usersTab"
                        style="padding: 0.75rem 1.5rem; background: none; border: none; 
                               cursor: pointer; border-bottom: 3px solid transparent;">
                    🧑 Usuarios
                </button>
                <button onclick="showPermissionTab('audit')" id="auditTab"
                        style="padding: 0.75rem 1.5rem; background: none; border: none; 
                               cursor: pointer; border-bottom: 3px solid transparent;">
                    📊 Actividad
                </button>
            </div>
            
            <!-- Tab Content -->
            <div id="permissionTabContent"></div>
        </div>
    `;
}

function renderRolesTab() {
    const roles = Array.from(PermissionManager.roles.entries());
    
    return `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3>Gestión de Roles</h3>
                <button onclick="showCreateRoleForm()" class="btn btn-primary">
                    ➕ Crear Rol
                </button>
            </div>
            
            <div id="roleFormContainer"></div>
            
            <div style="display: grid; gap: 1rem;">
                ${roles.map(([id, role]) => `
                    <div style="background: white; border-radius: 8px; padding: 1.5rem; 
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4 style="margin: 0 0 0.5rem 0;">${role.name}</h4>
                                <p style="color: #6b7280; margin: 0 0 1rem 0; font-size: 0.875rem;">
                                    ${role.description || 'Sin descripción'}
                                </p>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                    ${role.modules.includes('*') ? 
                                        '<span style="background: #dc2626; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem;">Acceso Total</span>' :
                                        role.modules.map(m => 
                                            `<span style="background: #3b82f6; color: white; padding: 0.25rem 0.75rem; 
                                                         border-radius: 4px; font-size: 0.875rem;">${m}</span>`
                                        ).join('')
                                    }
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                ${id !== 'admin' && id !== 'sales' ? `
                                    <button onclick="editRole('${id}')" class="btn btn-sm"
                                            style="background: #3b82f6; color: white;">
                                        ✏️
                                    </button>
                                    <button onclick="deleteRole('${id}')" class="btn btn-sm"
                                            style="background: #ef4444; color: white;">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderUsersTab() {
    return `
        <div>
            <h3 style="margin-bottom: 1.5rem;">Asignación de Permisos</h3>
            
            <div id="userPermissionsContainer">
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    Cargando usuarios...
                </div>
            </div>
        </div>
    `;
}

function renderAuditTab() {
    return `
        <div>
            <h3 style="margin-bottom: 1.5rem;">Registro de Actividad</h3>
            
            <div style="margin-bottom: 1rem;">
                <input type="date" id="auditDateFilter" onchange="filterAuditLog()"
                       style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                <select id="auditUserFilter" onchange="filterAuditLog()"
                        style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; margin-left: 0.5rem;">
                    <option value="">Todos los usuarios</option>
                </select>
            </div>
            
            <div id="auditLogContainer" style="background: white; border-radius: 8px; 
                                               max-height: 500px; overflow-y: auto;">
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    Cargando registro...
                </div>
            </div>
        </div>
    `;
}

// Global functions
window.PermissionManager = PermissionManager;

window.loadPermissionManagement = async function() {
    const container = document.getElementById('configContainer');
    if (!container) return;
    
    await PermissionManager.init();
    container.innerHTML = renderPermissionManagement();
    showPermissionTab('roles');
};

window.showPermissionTab = function(tab) {
    // Update tab styles
    ['roles', 'users', 'audit'].forEach(t => {
        const tabBtn = document.getElementById(`${t}Tab`);
        if (tabBtn) {
            tabBtn.style.borderBottomColor = t === tab ? '#3b82f6' : 'transparent';
        }
    });
    
    // Show content
    const content = document.getElementById('permissionTabContent');
    switch(tab) {
        case 'roles':
            content.innerHTML = renderRolesTab();
            break;
        case 'users':
            content.innerHTML = renderUsersTab();
            loadUserPermissions();
            break;
        case 'audit':
            content.innerHTML = renderAuditTab();
            loadAuditLog();
            break;
    }
};

window.showCreateRoleForm = function(roleId = null) {
    const role = roleId ? PermissionManager.roles.get(roleId) : null;
    const allModules = [
        { id: 'social', name: 'Social' },
        { id: 'pipeline', name: 'Pipeline' },
        { id: 'tasks', name: 'Tareas' },
        { id: 'students', name: 'Estudiantes' },
        { id: 'payments', name: 'Pagos' },
        { id: 'groups', name: 'Grupos' },
        { id: 'teachers', name: 'Profesores' },
        { id: 'attendance', name: 'Asistencia' }
    ];
    
    document.getElementById('roleFormContainer').innerHTML = `
        <div style="background: #f3f4f6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 1rem 0;">${roleId ? 'Editar' : 'Crear'} Rol</h4>
            <form id="roleForm" onsubmit="saveRole(event, '${roleId || ''}')">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">ID del Rol (sin espacios)</label>
                    <input type="text" id="roleId" value="${roleId || ''}" 
                           ${roleId ? 'readonly' : ''} required
                           pattern="[a-z0-9_]+" title="Solo letras minúsculas, números y guión bajo"
                           style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Nombre del Rol</label>
                    <input type="text" id="roleName" value="${role?.name || ''}" required
                           style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Descripción</label>
                    <input type="text" id="roleDescription" value="${role?.description || ''}"
                           style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Módulos</label>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                        ${allModules.map(module => `
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" name="modules" value="${module.id}"
                                       ${role?.modules?.includes(module.id) ? 'checked' : ''}>
                                ${module.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-primary">
                        💾 Guardar
                    </button>
                    <button type="button" onclick="cancelRoleForm()" class="btn"
                            style="background: #6b7280; color: white;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
};

window.saveRole = async function(event, existingId) {
    event.preventDefault();
    
    try {
        const roleId = existingId || document.getElementById('roleId').value;
        const selectedModules = Array.from(document.querySelectorAll('input[name="modules"]:checked'))
            .map(cb => cb.value);
        
        const roleData = {
            name: document.getElementById('roleName').value,
            description: document.getElementById('roleDescription').value,
            modules: selectedModules,
            canCreateRoles: false,
            canAssignPermissions: false
        };
        
        await PermissionManager.saveRole(roleId, roleData);
        window.showNotification('✅ Rol guardado', 'success');
        
        cancelRoleForm();
        showPermissionTab('roles');
    } catch (error) {
        window.showNotification('❌ Error: ' + error.message, 'error');
    }
};

window.cancelRoleForm = function() {
    document.getElementById('roleFormContainer').innerHTML = '';
};

window.editRole = function(roleId) {
    showCreateRoleForm(roleId);
};

window.deleteRole = async function(roleId) {
    if (!confirm(`¿Eliminar el rol ${roleId}?`)) return;
    
    try {
        await PermissionManager.deleteRole(roleId);
        window.showNotification('✅ Rol eliminado', 'success');
        showPermissionTab('roles');
    } catch (error) {
        window.showNotification('❌ Error: ' + error.message, 'error');
    }
};

// Load user permissions for assignment
async function loadUserPermissions() {
    try {
        const db = window.firebaseModules.database;
        const usersRef = db.ref(window.FirebaseData.database, 'users');
        const snapshot = await db.get(usersRef);
        
        if (!snapshot.exists()) {
            document.getElementById('userPermissionsContainer').innerHTML = 
                '<p style="text-align: center; color: #6b7280;">No hay usuarios</p>';
            return;
        }
        
        const users = snapshot.val();
        const userList = Object.entries(users).map(([uid, data]) => ({
            uid,
            email: data.email || data.profile?.email,
            currentPermissions: PermissionManager.userPermissions.get(uid)
        }));
        
        document.getElementById('userPermissionsContainer').innerHTML = `
            <div style="display: grid; gap: 1rem;">
                ${userList.map(user => `
                    <div style="background: white; border-radius: 8px; padding: 1rem; 
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${user.email}</strong>
                                ${user.currentPermissions ? `
                                    <div style="margin-top: 0.5rem;">
                                        <span style="background: #3b82f6; color: white; 
                                                     padding: 0.25rem 0.5rem; border-radius: 4px; 
                                                     font-size: 0.75rem;">
                                            ${user.currentPermissions.role}
                                        </span>
                                    </div>
                                ` : '<div style="color: #6b7280; font-size: 0.875rem;">Sin permisos</div>'}
                            </div>
                            <button onclick="assignUserPermissions('${user.uid}', '${user.email}')" 
                                    class="btn btn-sm" style="background: #10b981; color: white;">
                                ⚙️ Configurar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading user permissions:', error);
    }
}

window.assignUserPermissions = function(userId, userEmail) {
    const roles = Array.from(PermissionManager.roles.entries());
    const currentPerms = PermissionManager.userPermissions.get(userId);
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 2rem; 
                    max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 1rem 0;">Asignar Permisos</h3>
            <p style="margin: 0 0 1.5rem 0; color: #6b7280;">${userEmail}</p>
            
            <form onsubmit="saveUserPermissions(event, '${userId}')">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Rol</label>
                    <select id="userRole" required
                            style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; 
                                   border-radius: 4px;">
                        <option value="">Seleccionar rol...</option>
                        ${roles.map(([id, role]) => `
                            <option value="${id}" ${currentPerms?.role === id ? 'selected' : ''}>
                                ${role.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="submit" class="btn btn-primary">
                        💾 Guardar
                    </button>
                    <button type="button" onclick="this.closest('.modal').remove()" 
                            class="btn" style="background: #6b7280; color: white;">
                        ❌ Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
};

window.saveUserPermissions = async function(event, userId) {
    event.preventDefault();
    
    try {
        const roleId = document.getElementById('userRole').value;
        await PermissionManager.assignUserRole(userId, roleId);
        
        window.showNotification('✅ Permisos actualizados', 'success');
        document.querySelector('.modal').remove();
        loadUserPermissions();
    } catch (error) {
        window.showNotification('❌ Error: ' + error.message, 'error');
    }
};

// Load audit log
async function loadAuditLog() {
    try {
        const db = window.firebaseModules.database;
        const logRef = db.ref(window.FirebaseData.database, 'auditLog');
        const snapshot = await db.get(logRef);
        
        if (!snapshot.exists()) {
            document.getElementById('auditLogContainer').innerHTML = 
                '<p style="text-align: center; padding: 2rem; color: #6b7280;">No hay actividad registrada</p>';
            return;
        }
        
        const logs = [];
        snapshot.forEach(child => {
            logs.push(child.val());
        });
        
        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Take last 100 entries
        const recentLogs = logs.slice(0, 100);
        
        document.getElementById('auditLogContainer').innerHTML = `
            <table style="width: 100%; font-size: 0.875rem;">
                <thead style="background: #f3f4f6;">
                    <tr>
                        <th style="padding: 0.75rem; text-align: left;">Fecha/Hora</th>
                        <th style="padding: 0.75rem; text-align: left;">Usuario</th>
                        <th style="padding: 0.75rem; text-align: left;">Acción</th>
                        <th style="padding: 0.75rem; text-align: left;">Módulo</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentLogs.map(log => `
                        <tr style="border-top: 1px solid #e5e7eb;">
                            <td style="padding: 0.75rem;">
                                ${new Date(log.timestamp).toLocaleString('es-CO')}
                            </td>
                            <td style="padding: 0.75rem;">${log.userEmail || 'Unknown'}</td>
                            <td style="padding: 0.75rem;">
                                <span style="background: ${log.action === 'opened' ? '#3b82f6' : '#10b981'}; 
                                             color: white; padding: 0.25rem 0.5rem; 
                                             border-radius: 4px; font-size: 0.75rem;">
                                    ${log.action}
                                </span>
                            </td>
                            <td style="padding: 0.75rem;">${log.module}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error loading audit log:', error);
    }
}

console.log('✅ Permission management loaded');
