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

// Working solution for collapsible Usuarios Actuales
setTimeout(() => {
    const setupCollapsible = () => {
        console.log('🔍 Starting collapsible setup...');
        
        // Find the Usuarios Actuales section more flexibly
        const allElements = document.querySelectorAll('*');
        let usuariosTitle = null;
        
        allElements.forEach(el => {
            // Check text content and ensure it's not a script or style tag
            if (el.textContent && 
                el.textContent.trim() === 'Usuarios Actuales' && 
                el.tagName !== 'SCRIPT' && 
                el.tagName !== 'STYLE' &&
                el.children.length === 0) {  // Ensure it's the actual text element
                console.log('Found element with Usuarios Actuales text:', el);
                usuariosTitle = el;
            }
        });
        
        if (!usuariosTitle) {
            // Alternative: Look for the icon + text pattern
            const possibleTitles = document.querySelectorAll('.flex.items-center');
            possibleTitles.forEach(el => {
                if (el.textContent.includes('Usuarios Actuales')) {
                    console.log('Found via flex pattern:', el);
                    usuariosTitle = el;
                }
            });
        }
        
        if (!usuariosTitle) {
            console.log('❌ Usuarios Actuales title still not found, retrying...');
            setTimeout(setupCollapsible, 2000);
            return;
        }
        
        // Check if already setup
        if (usuariosTitle.querySelector('.toggle-arrow') || usuariosTitle.classList.contains('collapsible-setup')) {
            console.log('Already setup, skipping...');
            return;
        }
        
        console.log('✅ Found Usuarios Actuales title!', usuariosTitle);
        
        // Find the container - go up until we find the section container
        let container = usuariosTitle.parentElement;
        while (container && !container.classList.contains('mt-6')) {
            container = container.parentElement;
        }
        
        if (!container) {
            container = usuariosTitle.closest('.mt-6') || usuariosTitle.parentElement;
        }
        
        console.log('Container found:', container);
        
        // Find all user rows - they contain email addresses
        const userRows = [];
        const allDivs = container.querySelectorAll('div');
        
        allDivs.forEach(div => {
            // Check if this div contains an email
            if (div.textContent.includes('@') && 
                div.textContent.includes('Rol:') && 
                !div.contains(usuariosTitle)) {
                userRows.push(div);
            }
        });
        
        console.log(`Found ${userRows.length} user rows`);
        
        if (userRows.length === 0) {
            console.log('No user rows found, aborting...');
            return;
        }
        
        // Create wrapper for user list
        const wrapper = document.createElement('div');
        wrapper.id = 'usuarios-list-wrapper';
        wrapper.style.overflow = 'hidden';
        wrapper.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
        
        // Clone and move user rows to wrapper
        const parent = userRows[0].parentNode;
        userRows.forEach(row => {
            wrapper.appendChild(row);
        });
        
        // Insert wrapper after title's container
        const titleContainer = usuariosTitle.closest('div');
        titleContainer.parentNode.insertBefore(wrapper, titleContainer.nextSibling);
        
        // Make title clickable
        usuariosTitle.style.cursor = 'pointer';
        usuariosTitle.style.userSelect = 'none';
        usuariosTitle.classList.add('collapsible-setup');
        
        // Add arrow - create it separately to avoid innerHTML issues
        const arrow = document.createElement('span');
        arrow.className = 'toggle-arrow';
        arrow.textContent = ' ▼';
        arrow.style.fontSize = '0.9em';
        arrow.style.marginLeft = '10px';
        arrow.style.display = 'inline-block';
        arrow.style.transition = 'transform 0.3s ease';
        usuariosTitle.appendChild(arrow);
        
        // Add hover effect to the whole title container
        const titleDiv = usuariosTitle.closest('div');
        titleDiv.addEventListener('mouseenter', () => {
            titleDiv.style.backgroundColor = '#f3f4f6';
            titleDiv.style.borderRadius = '4px';
        });
        
        titleDiv.addEventListener('mouseleave', () => {
            titleDiv.style.backgroundColor = 'transparent';
        });
        
        // Toggle function
        let isCollapsed = false;
        
        const toggleFunction = () => {
            isCollapsed = !isCollapsed;
            
            if (isCollapsed) {
                wrapper.style.maxHeight = '0px';
                wrapper.style.opacity = '0';
                wrapper.style.padding = '0';
                arrow.style.transform = 'rotate(-90deg)';
            } else {
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                wrapper.style.opacity = '1';
                wrapper.style.padding = '';
                arrow.style.transform = 'rotate(0deg)';
                
                // After animation, set to auto for dynamic content
                setTimeout(() => {
                    if (!isCollapsed) {
                        wrapper.style.maxHeight = 'none';
                    }
                }, 300);
            }
        };
        
        // Add click to both title and its container
        usuariosTitle.addEventListener('click', toggleFunction);
        titleDiv.addEventListener('click', (e) => {
            if (e.target !== usuariosTitle) {
                toggleFunction();
            }
        });
        
        // Start collapsed (change to false to start expanded)
        if (true) {
            isCollapsed = true;
            wrapper.style.maxHeight = '0px';
            wrapper.style.opacity = '0';
            wrapper.style.padding = '0';
            arrow.style.transform = 'rotate(-90deg)';
        }
        
        console.log('✅ Collapsible setup complete!');
    };
    
    // Try after a delay to ensure Config is loaded
    const attemptSetup = () => {
        const configSection = document.querySelector('#config');
        if (configSection && configSection.style.display !== 'none') {
            console.log('Config is visible, setting up collapsible...');
            setTimeout(setupCollapsible, 500);
        } else {
            console.log('Config not visible yet...');
        }
    };
    
    // Try immediately
    attemptSetup();
    
    // Also monitor for Config being opened
    const observer = new MutationObserver(() => {
        const configSection = document.querySelector('#config');
        if (configSection && configSection.style.display !== 'none') {
            setupCollapsible();
        }
    });
    
    const config = document.querySelector('#config');
    if (config) {
        observer.observe(config, { attributes: true, attributeFilter: ['style'] });
    }
    
    // Also hook into showConfig if it exists
    if (window.showConfig) {
        const originalShowConfig = window.showConfig;
        window.showConfig = function() {
            originalShowConfig.apply(this, arguments);
            setTimeout(setupCollapsible, 1000);
        };
    }
    
}, 2000);

// Add console helpers
console.log('👔 Simple Permissions loaded!');
console.log('Use SimplePermissions.disable() to turn off');
console.log('Use SimplePermissions.enable() to turn on');
