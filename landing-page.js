// landing-page.js - Professional landing page for users without full access

// Auth state manager
const AuthManager = {
    isReady: false,
    currentUser: null,
    permissions: null,
    
    async init() {
        console.log('🔐 Initializing auth manager...');
        
        return new Promise((resolve) => {
            const auth = window.FirebaseData?.auth;
            if (!auth) {
                console.error('Firebase auth not found');
                resolve(false);
                return;
            }
            
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('✅ User authenticated:', user.email);
                    this.currentUser = user;
                    await this.loadPermissions(user.uid);
                    this.isReady = true;
                    resolve(true);
                } else {
                    console.log('❌ No user authenticated');
                    this.isReady = true;
                    resolve(false);
                }
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.isReady) {
                    console.warn('Auth check timeout');
                    this.isReady = true;
                    resolve(false);
                }
            }, 5000);
        });
    },
    
    async loadPermissions(userId) {
        try {
            const db = window.firebaseModules.database;
            
            // Load user permissions
            const userRef = db.ref(window.FirebaseData.database, `permissions/users/${userId}`);
            const userSnap = await db.get(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.val();
                
                // Load role permissions
                if (userData.role) {
                    const roleRef = db.ref(window.FirebaseData.database, `permissions/roles/${userData.role}`);
                    const roleSnap = await db.get(roleRef);
                    
                    if (roleSnap.exists()) {
                        const roleData = roleSnap.val();
                        this.permissions = {
                            role: userData.role,
                            modules: roleData.modules || [],
                            additionalModules: userData.additionalModules || [],
                            restrictedModules: userData.restrictedModules || []
                        };
                    }
                }
            }
            
            console.log('📋 Permissions loaded:', this.permissions);
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    },
    
    hasAccess(module) {
        if (!this.permissions) return false;
        
        // Admin has access to everything
        if (this.permissions.role === 'admin' || this.permissions.modules.includes('*')) {
            return true;
        }
        
        // Check restrictions first
        if (this.permissions.restrictedModules.includes(module)) {
            return false;
        }
        
        // Check role modules and additional modules
        return this.permissions.modules.includes(module) || 
               this.permissions.additionalModules.includes(module);
    },
    
    getAccessibleModules() {
        const allModules = [
            { id: 'social', name: 'Social', icon: '💬', color: '#3b82f6' },
            { id: 'pipeline', name: 'Pipeline', icon: '🔄', color: '#10b981' },
            { id: 'tasks', name: 'Tareas', icon: '📋', color: '#f59e0b' },
            { id: 'students', name: 'Estudiantes', icon: '👥', color: '#3b82f6' },
            { id: 'payments', name: 'Pagos', icon: '💰', color: '#10b981' },
            { id: 'groups', name: 'Grupos', icon: '📚', color: '#8b5cf6' },
            { id: 'teachers', name: 'Profesores', icon: '👩‍🏫', color: '#f59e0b' },
            { id: 'attendance', name: 'Asistencia', icon: '📋', color: '#ef4444' }
        ];
        
        if (!this.permissions) return [];
        
        if (this.permissions.role === 'admin' || this.permissions.modules.includes('*')) {
            return allModules;
        }
        
        return allModules.filter(module => this.hasAccess(module.id));
    }
};

// Landing page component
function createLandingPage() {
    const modules = AuthManager.getAccessibleModules();
    const user = AuthManager.currentUser;
    
    return `
        <div style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="padding: 2rem;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 3rem;">
                    <h1 style="color: white; font-size: 2.5rem; margin-bottom: 0.5rem;">
                        🎓 Ciudad Bilingüe
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); font-size: 1.2rem;">
                        English School Management System
                    </p>
                </div>
                
                <!-- User Welcome -->
                <div style="background: white; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; 
                            box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto 2rem;">
                    <h2 style="margin: 0 0 1rem 0; color: #374151;">
                        ${user ? `¡Bienvenido, ${user.email}! 👋` : 'Bienvenido'}
                    </h2>
                    
                    ${modules.length > 0 ? `
                        <p style="color: #6b7280; margin-bottom: 1.5rem;">
                            Tienes acceso a ${modules.length} módulo${modules.length > 1 ? 's' : ''}. 
                            Selecciona uno para comenzar:
                        </p>
                        
                        <!-- Module Grid -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
                                    gap: 1rem;">
                            ${modules.map(module => `
                                <button onclick="openModuleFromLanding('${module.id}')" 
                                        style="background: white; border: 2px solid ${module.color}; 
                                               border-radius: 8px; padding: 1.5rem; cursor: pointer;
                                               transition: all 0.3s; text-align: center;"
                                        onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'"
                                        onmouseout="this.style.transform=''; this.style.boxShadow=''">
                                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${module.icon}</div>
                                    <div style="font-weight: bold; color: ${module.color};">${module.name}</div>
                                </button>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 3rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                            <h3 style="color: #374151; margin-bottom: 1rem;">
                                Acceso Pendiente
                            </h3>
                            <p style="color: #6b7280; max-width: 400px; margin: 0 auto 2rem;">
                                Tu cuenta ha sido creada exitosamente. Un administrador te asignará 
                                los permisos necesarios próximamente.
                            </p>
                            <div style="background: #f3f4f6; border-radius: 8px; padding: 1.5rem;">
                                <p style="margin: 0 0 0.5rem 0; color: #374151; font-weight: bold;">
                                    ¿Necesitas acceso inmediato?
                                </p>
                                <p style="margin: 0; color: #6b7280;">
                                    Contacta al administrador: <br>
                                    📧 admin@ciudadbilingue.com<br>
                                    📱 WhatsApp: +57 300 123 4567
                                </p>
                            </div>
                        </div>
                    `}
                </div>
                
                <!-- Info Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                            gap: 1rem; max-width: 800px; margin: 0 auto;">
                    <div style="background: rgba(255,255,255,0.9); border-radius: 8px; padding: 1.5rem;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #374151;">📚 Sobre Nosotros</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">
                            Ciudad Bilingüe es una escuela de inglés comprometida con la excelencia 
                            educativa y el desarrollo integral de nuestros estudiantes.
                        </p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.9); border-radius: 8px; padding: 1.5rem;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #374151;">🎯 Tu Estado</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">
                            ${AuthManager.permissions ? 
                                `Rol: <strong>${AuthManager.permissions.role}</strong><br>
                                 Módulos: ${modules.length}` : 
                                'Sin permisos asignados'}
                        </p>
                    </div>
                </div>
                
                <!-- Logout button -->
                <div style="text-align: center; margin-top: 3rem;">
                    <button onclick="logoutUser()" 
                            style="background: rgba(255,255,255,0.2); color: white; border: 1px solid white;
                                   padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer;
                                   transition: all 0.3s;"
                            onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        🚪 Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Initialize landing page on auth ready
async function initLandingPage() {
    console.log('🚀 Initializing landing page...');
    
    // Show loading screen
    const mainContainer = document.querySelector('main') || document.body;
    mainContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="text-align: center; color: white;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎓</div>
                <h2>Ciudad Bilingüe</h2>
                <p>Verificando permisos...</p>
                <div class="spinner" style="margin: 2rem auto;"></div>
            </div>
        </div>
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Wait for auth to be ready
    const isAuthenticated = await AuthManager.init();
    
    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
        // The auth state change will handle this
        return;
    }
    
    // Show landing page
    mainContainer.innerHTML = createLandingPage();
    
    // Track page view
    logUserAction('viewed', 'landing_page');
}

// Module opener from landing page
function openModuleFromLanding(moduleId) {
    if (!AuthManager.hasAccess(moduleId)) {
        window.showNotification('❌ No tienes acceso a este módulo', 'error');
        return;
    }
    
    // Log the action
    logUserAction('opened', moduleId);
    
    // Hide landing page and show normal UI
    document.querySelector('main').innerHTML = '';
    
    // Re-show the navigation
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'block';
    
    // Show school buttons if available
    if (window.addSchoolButtons) {
        window.addSchoolButtons();
    }
    
    // Open the module
    if (window.openModule) {
        window.openModule(moduleId.charAt(0).toUpperCase() + moduleId.slice(1));
    }
}

// Logout function
async function logoutUser() {
    try {
        await window.FirebaseData.auth.signOut();
        window.showNotification('👋 Sesión cerrada', 'success');
        window.location.reload();
    } catch (error) {
        console.error('Error logging out:', error);
        window.showNotification('❌ Error al cerrar sesión', 'error');
    }
}

// Activity logger
async function logUserAction(action, module, details = {}) {
    if (!AuthManager.currentUser) return;
    
    try {
        const db = window.firebaseModules.database;
        const timestamp = new Date().toISOString();
        const logId = `${timestamp}-${AuthManager.currentUser.uid}`;
        
        const logEntry = {
            userId: AuthManager.currentUser.uid,
            userEmail: AuthManager.currentUser.email,
            timestamp,
            action,
            module,
            ...details
        };
        
        const logRef = db.ref(window.FirebaseData.database, `auditLog/${logId}`);
        await db.set(logRef, logEntry);
        
        console.log('📝 Action logged:', action, module);
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

// Export to global scope
window.AuthManager = AuthManager;
window.initLandingPage = initLandingPage;
window.openModuleFromLanding = openModuleFromLanding;
window.logoutUser = logoutUser;
window.logUserAction = logUserAction;

console.log('✅ Landing page system loaded');
