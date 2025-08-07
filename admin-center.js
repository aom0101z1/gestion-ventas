// admin-center.js - Centro de Administración de Usuarios y Permisos
// Sistema completo de gestión con auditoría
console.log('🔐 Loading Admin Center module...');

// Configuración de módulos disponibles
const SYSTEM_MODULES = [
  { id: 'contacts', name: 'Contactos', icon: '📇', color: '#3b82f6' },
  { id: 'leads', name: 'Leads', icon: '🎯', color: '#10b981' },
  { id: 'pipeline', name: 'Pipeline', icon: '🔄', color: '#8b5cf6' },
  { id: 'reports', name: 'Reportes', icon: '📊', color: '#f59e0b' },
  { id: 'monitoring', name: 'Monitoreo', icon: '📡', color: '#ef4444' },
  { id: 'tasks', name: 'Tareas', icon: '📋', color: '#06b6d4' },
  { id: 'students', name: 'Estudiantes', icon: '👥', color: '#ec4899' },
  { id: 'payments', name: 'Pagos', icon: '💰', color: '#10b981' },
  { id: 'groups', name: 'Grupos', icon: '📚', color: '#8b5cf6' },
  { id: 'teachers', name: 'Profesores', icon: '👩‍🏫', color: '#f59e0b' },
  { id: 'attendance', name: 'Asistencia', icon: '✅', color: '#06b6d4' }
];

// Admin Center Manager
class AdminCenterManager {
  constructor() {
    this.users = new Map();
    this.auditLog = [];
    this.initialized = false;
    this.currentAdmin = null;
  }

  // Initialize
  async init() {
    if (this.initialized) {
      console.log('Admin Center already initialized');
      return true;
    }
    
    console.log('🚀 Initializing Admin Center');
    
    // Check if Firebase is loaded
    if (!window.FirebaseData || !window.firebaseModules) {
      console.error('Firebase not loaded yet');
      return false;
    }
    
    // Check admin permission
    const user = window.FirebaseData?.currentUser;
    if (!user) {
      console.error('No user authenticated');
      return false;
    }

    // Load current user role
    try {
      const profile = await window.FirebaseData.loadUserProfile();
      console.log('User profile loaded:', profile);
      
      if (!profile?.role || (profile.role !== 'admin' && profile.role !== 'director')) {
        console.error('Insufficient permissions. Role:', profile?.role);
        return false;
      }

      this.currentAdmin = user;
      await this.loadUsers();
      await this.loadAuditLog();
      this.initialized = true;
      console.log('✅ Admin Center initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Admin Center:', error);
      return false;
    }
  }

  // Load all users
  async loadUsers() {
    try {
      const db = window.firebaseModules.database;
      const ref = db.ref(window.FirebaseData.database, 'users');
      const snapshot = await db.get(ref);
      
      this.users.clear(); // Clear existing users
      
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const userId = child.key;
          const userData = child.val();
          this.users.set(userId, {
            id: userId,
            ...userData.profile,
            permissions: userData.permissions || {}
          });
        });
      }
      console.log(`✅ Loaded ${this.users.size} users`);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Load audit log
  async loadAuditLog() {
    try {
      const db = window.firebaseModules.database;
      const ref = db.ref(window.FirebaseData.database, 'auditLog');
      const snapshot = await db.get(ref);
      
      if (snapshot.exists()) {
        this.auditLog = Object.values(snapshot.val())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 100);
      } else {
        this.auditLog = [];
        console.log('📋 No audit log entries yet');
      }
    } catch (error) {
      if (error.message && error.message.includes('Permission denied')) {
        console.log('⚠️ No permission to read audit log - continuing without it');
        this.auditLog = [];
      } else {
        console.error('Error loading audit log:', error);
        this.auditLog = [];
      }
    }
  }

  // Create user
  async createUser(userData) {
    try {
      const { email, password, name, permissions } = userData;
      
      // Create auth user
      const userCredential = await window.FirebaseData.auth
        .createUserWithEmailAndPassword(email, password);
      
      const userId = userCredential.user.uid;
      
      // Save user profile
      const db = window.firebaseModules.database;
      const userRef = db.ref(window.FirebaseData.database, `users/${userId}`);
      
      const newUser = {
        profile: {
          email,
          name,
          role: 'custom',
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: this.currentAdmin.email
        },
        permissions: {
          modules: permissions || {}
        }
      };
      
      await db.set(userRef, newUser);
      
      // Add to local cache
      this.users.set(userId, {
        id: userId,
        ...newUser.profile,
        permissions: newUser.permissions
      });
      
      // Log action
      await this.logAction('CREATE_USER', { userId, email });
      
      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updates) {
    try {
      const db = window.firebaseModules.database;
      const userRef = db.ref(window.FirebaseData.database, `users/${userId}`);
      
      await db.update(userRef, updates);
      
      // Update local cache
      const user = this.users.get(userId);
      if (user) {
        Object.assign(user, updates.profile || {});
        if (updates.permissions) {
          user.permissions = updates.permissions;
        }
      }
      
      // Log action
      await this.logAction('UPDATE_USER', { userId, updates });
      
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Toggle user status
  async toggleUserStatus(userId) {
    const user = this.users.get(userId);
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await this.updateUser(userId, {
      'profile/status': newStatus,
      'profile/statusChangedAt': new Date().toISOString()
    });
    
    await this.logAction('TOGGLE_STATUS', { userId, newStatus });
    return newStatus;
  }

  // Delete user
  async deleteUser(userId) {
    try {
      // Soft delete - mark as deleted
      await this.updateUser(userId, {
        'profile/status': 'deleted',
        'profile/deletedAt': new Date().toISOString(),
        'profile/deletedBy': this.currentAdmin.email
      });
      
      await this.logAction('DELETE_USER', { userId });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Update module permission
  async setModulePermission(userId, moduleId, allowed) {
    try {
      const db = window.firebaseModules.database;
      const permRef = db.ref(window.FirebaseData.database, 
        `users/${userId}/permissions/modules/${moduleId}`);
      
      await db.set(permRef, allowed);
      
      // Update local cache
      const user = this.users.get(userId);
      if (user) {
        if (!user.permissions) user.permissions = { modules: {} };
        if (!user.permissions.modules) user.permissions.modules = {};
        user.permissions.modules[moduleId] = allowed;
      }
      
      await this.logAction('UPDATE_PERMISSION', { userId, moduleId, allowed });
      return true;
    } catch (error) {
      console.error('Error updating permission:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await window.FirebaseData.auth.sendPasswordResetEmail(email);
      await this.logAction('RESET_PASSWORD', { email });
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // Log action for audit
  async logAction(action, details) {
    try {
      const db = window.firebaseModules.database;
      const logRef = db.push(db.ref(window.FirebaseData.database, 'auditLog'));
      
      const entry = {
        action,
        details,
        performedBy: this.currentAdmin.email,
        timestamp: new Date().toISOString()
      };
      
      await db.set(logRef, entry);
      this.auditLog.unshift(entry);
      
      // Keep only last 100 entries locally
      if (this.auditLog.length > 100) {
        this.auditLog = this.auditLog.slice(0, 100);
      }
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }

  // Get user statistics
  getUserStats() {
    const stats = {
      total: this.users.size,
      active: 0,
      blocked: 0,
      deleted: 0,
      withCustomPermissions: 0
    };
    
    this.users.forEach(user => {
      if (user.status === 'active') stats.active++;
      else if (user.status === 'blocked') stats.blocked++;
      else if (user.status === 'deleted') stats.deleted++;
      
      if (user.permissions?.modules) {
        stats.withCustomPermissions++;
      }
    });
    
    return stats;
  }
}

// UI Rendering Functions
function renderAdminCenter() {
  const container = document.getElementById('adminContainer');
  if (!container) {
    console.error('Admin container not found');
    return;
  }

  if (!window.AdminCenter || !window.AdminCenter.initialized) {
    console.error('Admin Center not initialized');
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #dc2626;">
        ❌ Error: Centro de administración no inicializado
      </div>
    `;
    return;
  }

  const stats = window.AdminCenter.getUserStats();
  
  container.innerHTML = `
    <div style="padding: 1.5rem; max-width: 1400px; margin: 0 auto;">
      <!-- Header -->
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.8rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem;">
          🔐 Centro de Administración
        </h1>
        <p style="color: #6b7280;">Gestión de usuarios y permisos del sistema</p>
      </div>

      <!-- Stats Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${stats.total}</div>
          <div style="color: #6b7280;">Usuarios Totales</div>
        </div>
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${stats.active}</div>
          <div style="color: #6b7280;">Activos</div>
        </div>
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">${stats.blocked}</div>
          <div style="color: #6b7280;">Bloqueados</div>
        </div>
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${SYSTEM_MODULES.length}</div>
          <div style="color: #6b7280;">Módulos</div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem;">
        <!-- Left: Modules List -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem;">📦 Módulos del Sistema</h2>
          <div id="modulesList">${renderModulesList()}</div>
        </div>

        <!-- Right: Users -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
            <h2 style="font-size: 1.2rem; font-weight: bold; flex: 1;">👥 Usuarios</h2>
            <button onclick="showCreateUserModal()" style="
              background: #3b82f6; 
              color: white; 
              padding: 0.5rem 1rem; 
              border: none; 
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">➕ Nuevo Usuario</button>
          </div>
          <div id="usersList">${renderUserCards()}</div>
        </div>
      </div>

      <!-- Audit Log -->
      <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-top: 1.5rem;">
        <h2 style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem;">📋 Registro de Auditoría</h2>
        <div id="auditLog">${renderAuditLog()}</div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="adminModal"></div>
  `;
}

function renderModulesList() {
  return SYSTEM_MODULES.map(module => `
    <div style="
      display: flex; 
      align-items: center; 
      padding: 0.75rem; 
      border-radius: 8px;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, ${module.color}15, ${module.color}05);
      border-left: 3px solid ${module.color};
    ">
      <span style="font-size: 1.5rem; margin-right: 0.75rem;">${module.icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 500; color: #374151;">${module.name}</div>
        <div style="font-size: 0.75rem; color: #6b7280;">ID: ${module.id}</div>
      </div>
      <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
    </div>
  `).join('');
}

function renderUserCards() {
  const users = Array.from(window.AdminCenter.users.values())
    .filter(u => u.status !== 'deleted');
  
  if (users.length === 0) {
    return '<p style="color: #6b7280; text-align: center;">No hay usuarios registrados</p>';
  }

  return users.map(user => {
    const moduleCount = Object.values(user.permissions?.modules || {})
      .filter(v => v === true).length;
    
    const statusColor = user.status === 'active' ? '#10b981' : '#ef4444';
    const statusText = user.status === 'active' ? 'Activo' : 'Bloqueado';
    
    // FIXED: Safe handling of missing name/email
    const userName = user.name || user.email || 'Usuario';
    const firstLetter = userName && userName[0] ? userName[0].toUpperCase() : 'U';
    
    return `
      <div id="userCard-${user.id}" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 1rem;
        transition: all 0.2s;
      " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
         onmouseout="this.style.boxShadow='none'">
        
        <!-- User Header -->
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
          <div style="
            width: 40px; 
            height: 40px; 
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 1rem;
          ">${firstLetter}</div>
          
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #1f2937;">${userName}</div>
            <div style="font-size: 0.875rem; color: #6b7280;">${user.email || 'Sin email'}</div>
          </div>
          
          <div style="display: flex; gap: 0.5rem;">
            <span style="
              background: ${statusColor}20;
              color: ${statusColor};
              padding: 0.25rem 0.75rem;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 500;
            ">${statusText}</span>
            <span style="
              background: #3b82f620;
              color: #3b82f6;
              padding: 0.25rem 0.75rem;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 500;
            ">${moduleCount} módulos</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <button onclick="toggleUserPermissions('${user.id}')" style="
            flex: 1;
            padding: 0.5rem;
            background: #f3f4f6;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
          ">👁️ Ver Permisos</button>
          
          <button onclick="toggleUserStatus('${user.id}')" style="
            flex: 1;
            padding: 0.5rem;
            background: #fef3c7;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
          ">${user.status === 'active' ? '🔒 Bloquear' : '🔓 Activar'}</button>
          
          <button onclick="resetUserPassword('${user.email}')" style="
            flex: 1;
            padding: 0.5rem;
            background: #dbeafe;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
          ">🔑 Reset Pass</button>
          
          <button onclick="deleteUser('${user.id}')" style="
            padding: 0.5rem 1rem;
            background: #fee2e2;
            color: #dc2626;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
          ">🗑️</button>
        </div>
        
        <!-- Permissions Grid (Initially Hidden) -->
        <div id="permissions-${user.id}" style="display: none;">
          <div style="
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
          ">
            <div style="font-weight: 500; margin-bottom: 0.75rem; color: #374151;">Permisos de Módulos:</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              ${renderUserPermissions(user.id, user.permissions?.modules || {})}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderUserPermissions(userId, permissions) {
  return SYSTEM_MODULES.map(module => {
    const hasAccess = permissions[module.id] === true;
    const checkboxId = `perm-${userId}-${module.id}`;
    
    return `
      <label style="
        display: flex;
        align-items: center;
        padding: 0.5rem;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      " onmouseover="this.style.background='#f3f4f6'" 
         onmouseout="this.style.background='white'">
        <input type="checkbox" 
          id="${checkboxId}"
          ${hasAccess ? 'checked' : ''}
          onchange="updatePermission('${userId}', '${module.id}', this.checked)"
          style="margin-right: 0.5rem; cursor: pointer;">
        <span style="margin-right: 0.5rem;">${module.icon}</span>
        <span style="font-size: 0.875rem; color: #374151;">${module.name}</span>
      </label>
    `;
  }).join('');
}

function renderAuditLog() {
  const logs = window.AdminCenter.auditLog.slice(0, 10);
  
  if (logs.length === 0) {
    return '<p style="color: #6b7280;">No hay registros de auditoría</p>';
  }

  return `
    <div style="max-height: 300px; overflow-y: auto;">
      ${logs.map(log => `
        <div style="
          display: flex;
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        ">
          <div style="color: #6b7280; margin-right: 1rem; min-width: 150px;">
            ${new Date(log.timestamp).toLocaleString('es-ES')}
          </div>
          <div style="font-weight: 500; color: #374151; margin-right: 1rem;">
            ${log.action}
          </div>
          <div style="color: #6b7280; flex: 1;">
            Por: ${log.performedBy}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Modal for creating user
function showCreateUserModal() {
  const modal = document.getElementById('adminModal');
  if (!modal) {
    console.error('Modal container not found');
    return;
  }
  
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    ">
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
      ">
        <h2 style="margin-bottom: 1.5rem; color: #1f2937;">➕ Crear Nuevo Usuario</h2>
        
        <form id="createUserForm" onsubmit="handleCreateUser(event)">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
              Nombre Completo
            </label>
            <input type="text" id="newUserName" required style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #d1d5db;
              border-radius: 6px;
            ">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
              Email
            </label>
            <input type="email" id="newUserEmail" required style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #d1d5db;
              border-radius: 6px;
            ">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
              Contraseña
            </label>
            <input type="password" id="newUserPassword" required minlength="6" style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #d1d5db;
              border-radius: 6px;
            ">
            <small style="color: #6b7280;">Mínimo 6 caracteres</small>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.75rem; color: #374151; font-weight: 500;">
              Permisos de Módulos
            </label>
            <div style="
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 0.5rem;
              padding: 1rem;
              background: #f9fafb;
              border-radius: 8px;
            ">
              ${SYSTEM_MODULES.map(module => `
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="checkbox" name="modules" value="${module.id}" style="margin-right: 0.5rem;">
                  <span style="margin-right: 0.5rem;">${module.icon}</span>
                  <span style="font-size: 0.875rem;">${module.name}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem;">
            <button type="button" onclick="closeModal()" style="
              flex: 1;
              padding: 0.75rem;
              background: #f3f4f6;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Cancelar</button>
            <button type="submit" style="
              flex: 1;
              padding: 0.75rem;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Crear Usuario</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Event Handlers
async function handleCreateUser(event) {
  event.preventDefault();
  
  const name = document.getElementById('newUserName').value;
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  
  const checkboxes = document.querySelectorAll('input[name="modules"]:checked');
  const permissions = {};
  SYSTEM_MODULES.forEach(module => {
    permissions[module.id] = false;
  });
  checkboxes.forEach(cb => {
    permissions[cb.value] = true;
  });
  
  try {
    await window.AdminCenter.createUser({ name, email, password, permissions });
    
    if (window.showNotification) {
      window.showNotification('✅ Usuario creado exitosamente', 'success');
    } else {
      alert('✅ Usuario creado exitosamente');
    }
    
    closeModal();
    await window.AdminCenter.init();
    renderAdminCenter();
  } catch (error) {
    if (window.showNotification) {
      window.showNotification('❌ Error: ' + error.message, 'error');
    } else {
      alert('❌ Error: ' + error.message);
    }
  }
}

async function toggleUserPermissions(userId) {
  const permDiv = document.getElementById(`permissions-${userId}`);
  if (permDiv) {
    permDiv.style.display = permDiv.style.display === 'none' ? 'block' : 'none';
  }
}

async function updatePermission(userId, moduleId, allowed) {
  try {
    await window.AdminCenter.setModulePermission(userId, moduleId, allowed);
    
    if (window.showNotification) {
      window.showNotification(`✅ Permiso ${allowed ? 'otorgado' : 'revocado'}`, 'success');
    }
  } catch (error) {
    if (window.showNotification) {
      window.showNotification('❌ Error actualizando permiso', 'error');
    } else {
      console.error('Error updating permission:', error);
    }
  }
}

async function toggleUserStatus(userId) {
  if (!confirm('¿Cambiar estado del usuario?')) return;
  
  try {
    const newStatus = await window.AdminCenter.toggleUserStatus(userId);
    
    if (window.showNotification) {
      window.showNotification(`✅ Usuario ${newStatus === 'active' ? 'activado' : 'bloqueado'}`, 'success');
    }
    
    renderAdminCenter();
  } catch (error) {
    if (window.showNotification) {
      window.showNotification('❌ Error: ' + error.message, 'error');
    } else {
      alert('❌ Error: ' + error.message);
    }
  }
}

async function resetUserPassword(email) {
  if (!confirm(`¿Enviar email de reseteo de contraseña a ${email}?`)) return;
  
  try {
    await window.AdminCenter.resetPassword(email);
    
    if (window.showNotification) {
      window.showNotification('✅ Email de reseteo enviado', 'success');
    } else {
      alert('✅ Email de reseteo enviado');
    }
  } catch (error) {
    if (window.showNotification) {
      window.showNotification('❌ Error: ' + error.message, 'error');
    } else {
      alert('❌ Error: ' + error.message);
    }
  }
}

async function deleteUser(userId) {
  if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
  
  try {
    await window.AdminCenter.deleteUser(userId);
    
    if (window.showNotification) {
      window.showNotification('✅ Usuario eliminado', 'success');
    } else {
      alert('✅ Usuario eliminado');
    }
    
    renderAdminCenter();
  } catch (error) {
    if (window.showNotification) {
      window.showNotification('❌ Error: ' + error.message, 'error');
    } else {
      alert('❌ Error: ' + error.message);
    }
  }
}

function closeModal() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.innerHTML = '';
  }
}

// Initialize Admin Center
window.AdminCenter = new AdminCenterManager();

// Expose functions globally
window.renderAdminCenter = renderAdminCenter;
window.showCreateUserModal = showCreateUserModal;
window.handleCreateUser = handleCreateUser;
window.toggleUserPermissions = toggleUserPermissions;
window.updatePermission = updatePermission;
window.toggleUserStatus = toggleUserStatus;
window.resetUserPassword = resetUserPassword;
window.deleteUser = deleteUser;
window.closeModal = closeModal;

// Load admin tab function
// Load admin tab function - REPLACE THE EXISTING ONE WITH THIS
window.loadAdminTab = async function() {
  console.log('🔐 Loading Admin tab');
  
  // Try both possible container IDs
  let container = document.getElementById('adminContainer') || document.getElementById('admin');
  
  if (!container) {
    console.error('No admin container found');
    return;
  }
  
  // Remove hidden class (your system uses this)
  container.classList.remove('hidden');
  // Also ensure display block
  container.style.display = 'block';
  
  // Check if already initialized
  if (window.AdminCenter.initialized) {
    console.log('Admin already initialized, rendering...');
    window.renderAdminCenter();
    return;
  }
  
  // Show loading message while initializing
  container.innerHTML = '<div style="text-align: center; padding: 3rem;"><div class="loading-spinner"></div> Cargando centro de administración...</div>';
  
  try {
    // Initialize and render
    const initialized = await window.AdminCenter.init();
    
    if (!initialized) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #dc2626;">
          ❌ No tienes permisos para acceder a esta sección
        </div>
      `;
      return;
    }
    
    // THIS IS THE KEY FIX - Call renderAdminCenter after successful init
    console.log('Admin initialized, now rendering...');
    window.renderAdminCenter();
    
  } catch (error) {
    console.error('Error loading admin tab:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #dc2626;">
        ❌ Error al cargar: ${error.message}
      </div>
    `;
  }
};
    
    // Render the admin center
    renderAdminCenter();
  } catch (error) {
    console.error('Error loading admin tab:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #dc2626;">
        ❌ Error al cargar el centro de administración: ${error.message}
      </div>
    `;
  }
};

// Add debug function
window.debugAdminModule = function() {
  console.log('=== Admin Module Debug ===');
  console.log('AdminCenter loaded:', !!window.AdminCenter);
  console.log('loadAdminTab loaded:', !!window.loadAdminTab);
  console.log('renderAdminCenter loaded:', !!window.renderAdminCenter);
  
  if (window.AdminCenter) {
    console.log('AdminCenter initialized:', window.AdminCenter.initialized);
    console.log('Current admin:', window.AdminCenter.currentAdmin);
    console.log('Users loaded:', window.AdminCenter.users.size);
    console.log('Audit log entries:', window.AdminCenter.auditLog.length);
  }
  
  const container = document.getElementById('adminContainer');
  console.log('Admin container exists:', !!container);
  console.log('Container display:', container?.style.display);
  
  if (window.FirebaseData) {
    console.log('Current user:', window.FirebaseData.currentUser?.email);
    window.FirebaseData.loadUserProfile().then(profile => {
      console.log('User profile:', profile);
      console.log('User role:', profile?.role);
    });
  }
};

console.log('✅ Admin Center module loaded successfully');
console.log('Use window.debugAdminModule() to debug');
