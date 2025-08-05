// simple-permissions.js - Simple role-based module access
// Add this ONE file to your index.html after all other scripts

// Simple role configuration
const SIMPLE_ROLES = {
  admin: {
    name: 'Administrador',
    modules: ['*'], // Access to everything
    description: 'Acceso completo'
  },
  director: {
    name: 'Director', 
    modules: ['*'], // Also full access
    description: 'Acceso completo'
  },
  teacher: {
    name: 'Profesor',
    modules: ['students', 'groups', 'attendance'],
    description: 'Gestión académica'
  },
  sales: {
    name: 'Ventas',
    modules: ['social', 'pipeline', 'tasks', 'leads'],
    description: 'Gestión comercial'
  },
  accounting: {
    name: 'Contabilidad',
    modules: ['students', 'payments'],
    description: 'Gestión financiera'
  },
  reception: {
    name: 'Recepción',
    modules: ['students', 'social'],
    description: 'Atención al cliente'
  }
};

// Simple permission manager
window.SimplePermissions = {
  enabled: true, // Easy on/off switch
  currentUserRole: null,
  
  // Initialize permissions
  init() {
    if (!this.enabled) return;
    
    console.log('🔐 Initializing simple permissions...');
    
    // Wait for Firebase auth
    window.FirebaseData?.auth?.onAuthStateChanged(async (user) => {
      if (user) {
        await this.loadUserRole(user.uid);
        this.applyPermissions();
      }
    });
  },
  
  // Load user role from Firebase
  async loadUserRole(userId) {
    try {
      const db = window.firebaseModules.database;
      const userRef = db.ref(window.FirebaseData.database, `users/${userId}/profile/role`);
      const snapshot = await db.get(userRef);
      
      if (snapshot.exists()) {
        this.currentUserRole = snapshot.val();
        console.log('👤 User role:', this.currentUserRole);
      } else {
        this.currentUserRole = 'guest';
        console.log('👤 No role found, using guest');
      }
    } catch (error) {
      console.error('Error loading role:', error);
      this.currentUserRole = 'guest';
    }
  },
  
  // Check if user has access to a module
  hasAccess(module) {
    if (!this.enabled) return true;
    if (!this.currentUserRole) return false;
    
    const role = SIMPLE_ROLES[this.currentUserRole];
    if (!role) return false;
    
    // Admin and director have access to everything
    if (role.modules.includes('*')) return true;
    
    // Check specific module access
    return role.modules.includes(module.toLowerCase());
  },
  
  // Apply permissions by hiding/showing modules
  applyPermissions() {
    if (!this.enabled) return;
    
    console.log('🎨 Applying permissions for role:', this.currentUserRole);
    
    // Module button mappings
    const moduleButtons = {
      'students': ['👥 Estudiantes', 'Students'],
      'payments': ['💰 Pagos', 'Payments'],
      'groups': ['📚 Grupos', 'Groups'],
      'teachers': ['👩‍🏫 Profesores', 'Teachers'],
      'attendance': ['📋 Asistencia', 'Attendance'],
      'social': ['Social Media', 'Social'],
      'pipeline': ['Pipeline', 'Pipeline'],
      'tasks': ['Tareas', 'Tasks'],
      'leads': ['Leads', 'Leads']
    };
    
    // Hide/show school module buttons
    Object.entries(moduleButtons).forEach(([moduleId, buttonTexts]) => {
      const hasAccess = this.hasAccess(moduleId);
      
      buttonTexts.forEach(text => {
        // Find buttons by text content
        const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent.includes(text)
        );
        
        buttons.forEach(btn => {
          btn.style.display = hasAccess ? '' : 'none';
        });
      });
      
      // Also hide/show nav tabs if they exist
      const navTabs = document.querySelectorAll(`[onclick*="${moduleId}"], [onclick*="${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}"]`);
      navTabs.forEach(tab => {
        tab.style.display = hasAccess ? '' : 'none';
      });
    });
    
    // Add role indicator
    this.showRoleIndicator();
  },
  
  // Show current role in UI
  showRoleIndicator() {
    if (!this.enabled || !this.currentUserRole) return;
    
    // Remove existing indicator
    const existing = document.getElementById('roleIndicator');
    if (existing) existing.remove();
    
    // Create role indicator
    const indicator = document.createElement('div');
    indicator.id = 'roleIndicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #4b5563;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    
    const role = SIMPLE_ROLES[this.currentUserRole] || { name: 'Invitado' };
    indicator.innerHTML = `👤 ${role.name}`;
    
    document.body.appendChild(indicator);
  },
  
  // Add role management to config (for admin only)
  addRoleManagement() {
    if (this.currentUserRole !== 'admin' && this.currentUserRole !== 'director') return;
    
    // Wait for config to load
    const checkConfig = setInterval(() => {
      const configContainer = document.getElementById('configContainer');
      if (configContainer && !document.getElementById('roleManagementSection')) {
        clearInterval(checkConfig);
        this.createRoleManagementUI();
      }
    }, 1000);
  },
  
  // Create simple role management UI
  async createRoleManagementUI() {
    const configContainer = document.getElementById('configContainer');
    if (!configContainer) return;
    
    // Create role management section
    const section = document.createElement('div');
    section.id = 'roleManagementSection';
    section.style.cssText = 'margin-top: 2rem; padding: 1rem; background: #f3f4f6; border-radius: 8px;';
    
    section.innerHTML = `
      <h3 style="margin: 0 0 1rem 0;">🔐 Gestión de Roles</h3>
      <div id="userRolesList">Cargando usuarios...</div>
    `;
    
    configContainer.appendChild(section);
    
    // Load users and their roles
    await this.loadAllUserRoles();
  },
  
  // Load all users for role management
  async loadAllUserRoles() {
    try {
      const db = window.firebaseModules.database;
      const usersRef = db.ref(window.FirebaseData.database, 'users');
      const snapshot = await db.get(usersRef);
      
      if (!snapshot.exists()) return;
      
      const users = [];
      snapshot.forEach(child => {
        const data = child.val();
        users.push({
          uid: child.key,
          email: data.email || data.profile?.email || 'Sin email',
          role: data.profile?.role || 'guest'
        });
      });
      
      // Create simple table
      document.getElementById('userRolesList').innerHTML = `
        <table style="width: 100%; background: white; border-radius: 4px;">
          <thead>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="padding: 0.5rem; text-align: left;">Usuario</th>
              <th style="padding: 0.5rem; text-align: left;">Rol Actual</th>
              <th style="padding: 0.5rem; text-align: left;">Cambiar Rol</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 0.5rem;">${user.email}</td>
                <td style="padding: 0.5rem;">
                  <span style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; 
                               border-radius: 4px; font-size: 0.875rem;">
                    ${SIMPLE_ROLES[user.role]?.name || user.role}
                  </span>
                </td>
                <td style="padding: 0.5rem;">
                  <select onchange="SimplePermissions.updateUserRole('${user.uid}', this.value)"
                          style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 4px;">
                    ${Object.entries(SIMPLE_ROLES).map(([id, role]) => `
                      <option value="${id}" ${user.role === id ? 'selected' : ''}>
                        ${role.name}
                      </option>
                    `).join('')}
                    <option value="guest" ${user.role === 'guest' ? 'selected' : ''}>
                      Sin rol
                    </option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      console.error('Error loading users:', error);
    }
  },
  
  // Update user role
  async updateUserRole(userId, newRole) {
    try {
      const db = window.firebaseModules.database;
      const roleRef = db.ref(window.FirebaseData.database, `users/${userId}/profile/role`);
      await db.set(roleRef, newRole);
      
      window.showNotification('✅ Rol actualizado', 'success');
      
      // Reload the list
      await this.loadAllUserRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      window.showNotification('❌ Error actualizando rol', 'error');
    }
  },
  
  // Disable permissions (for testing)
  disable() {
    this.enabled = false;
    location.reload();
  },
  
  // Enable permissions
  enable() {
    this.enabled = true;
    location.reload();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    SimplePermissions.init();
    
// Add role management when config is opened
document.addEventListener('click', (e) => {
  if (e.target.textContent?.includes('Config') || e.target.id?.includes('config')) {
    setTimeout(() => {
      SimplePermissions.addRoleManagement();
      // Also check for the config tab specifically
      const configTab = document.querySelector('[onclick*="config"]');
      if (configTab) {
        setTimeout(() => SimplePermissions.addRoleManagement(), 1000);
      }
    }, 500);
  }
});

// Also check when switching tabs
if (window.switchTab) {
  const originalSwitchTab = window.switchTab;
  window.switchTab = function(tab) {
    originalSwitchTab(tab);
    if (tab === 'config') {
      setTimeout(() => SimplePermissions.addRoleManagement(), 1000);
    }
  };
}
  }, 2000);
});

// Simple Collapsible for Usuarios Actuales
let usuariosCollapsibleDone = false;

function makeUsuariosCollapsible() {
    // Prevent multiple runs
    if (usuariosCollapsibleDone) return;
    
    // Only run in Config
    if (!document.querySelector('#config') || document.querySelector('#config').style.display === 'none') {
        return;
    }
    
    // Look for the container with "Usuarios Actuales"
    const containers = document.querySelectorAll('.flex.items-center');
    let titleContainer = null;
    
    for (let container of containers) {
        if (container.textContent && container.textContent.includes('Usuarios Actuales')) {
            titleContainer = container;
            break;
        }
    }
    
    if (!titleContainer) {
        // Try again later
        setTimeout(makeUsuariosCollapsible, 1000);
        return;
    }
    
    // Find the section that contains all users
    const section = titleContainer.closest('.mt-6') || titleContainer.parentElement.parentElement;
    
    // Find all user divs (they contain emails)
    const userDivs = [];
    section.querySelectorAll('div').forEach(div => {
        if (div.textContent.includes('@') && 
            div.textContent.includes('Rol:') && 
            !div.contains(titleContainer)) {
            userDivs.push(div);
        }
    });
    
    if (userDivs.length === 0) return;
    
    // Create wrapper for users
    const wrapper = document.createElement('div');
    wrapper.style.overflow = 'hidden';
    wrapper.style.transition = 'all 0.3s ease';
    wrapper.style.maxHeight = '0';
    
    // Move users to wrapper
    userDivs.forEach(div => wrapper.appendChild(div));
    section.appendChild(wrapper);
    
    // Add arrow to title
    const arrow = document.createElement('span');
    arrow.textContent = ' ▶';
    arrow.style.fontSize = '14px';
    arrow.style.transition = 'transform 0.3s ease';
    titleContainer.appendChild(arrow);
    
    // Make title clickable
    titleContainer.style.cursor = 'pointer';
    let isOpen = false;
    
    titleContainer.addEventListener('click', function(e) {
        e.stopPropagation();
        isOpen = !isOpen;
        
        if (isOpen) {
            wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
            arrow.style.transform = 'rotate(90deg)';
        } else {
            wrapper.style.maxHeight = '0';
            arrow.style.transform = 'rotate(0deg)';
        }
    });
    
    // Mark as done
    usuariosCollapsibleDone = true;
    console.log('✅ Usuarios Actuales is now collapsible!');
}

// Run when Config is shown
const originalShowConfig = window.showConfig;
if (originalShowConfig) {
    window.showConfig = function() {
        usuariosCollapsibleDone = false; // Reset flag
        originalShowConfig.apply(this, arguments);
        setTimeout(makeUsuariosCollapsible, 1500);
    };
}

// Also check periodically if Config is open
setInterval(() => {
    if (document.querySelector('#config') && 
        document.querySelector('#config').style.display !== 'none' && 
        !usuariosCollapsibleDone) {
        makeUsuariosCollapsible();
    }
}, 2000);

// Add console helpers
console.log('👔 Simple Permissions loaded!');
console.log('Use SimplePermissions.disable() to turn off');
console.log('Use SimplePermissions.enable() to turn on');
