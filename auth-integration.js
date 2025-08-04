// auth-integration.js - Integrate landing page with existing system

// Override the existing window.onload to add auth checking
const originalOnload = window.onload;
window.onload = async function() {
    console.log('🚀 Starting CRM with auth check...');
    
    // Initialize Firebase first
    if (originalOnload) {
        await originalOnload();
    }
    
    // Wait a bit for Firebase to fully initialize
    setTimeout(async () => {
        // Check if user needs landing page
        const needsLanding = await checkUserNeedsLanding();
        
        if (needsLanding) {
            // Hide normal UI elements
            const nav = document.querySelector('nav');
            if (nav) nav.style.display = 'none';
            
            // Hide school buttons if they exist
            const schoolButtons = document.getElementById('schoolButtonBar');
            if (schoolButtons) schoolButtons.style.display = 'none';
            
            // Show landing page
            await initLandingPage();
        } else {
            // User has full access, continue normally
            console.log('✅ User has permissions, loading normal interface');
            
            // Make sure school buttons are visible
            if (window.addSchoolButtons) {
                setTimeout(() => {
                    window.addSchoolButtons();
                }, 1000);
            }
        }
    }, 1000);
};

// Check if user needs landing page
async function checkUserNeedsLanding() {
    // Wait for auth
    const isAuthenticated = await AuthManager.init();
    
    if (!isAuthenticated) {
        return false; // Let Firebase auth handle redirect
    }
    
    // Check if user has any module access
    const modules = AuthManager.getAccessibleModules();
    
    // If user is admin or has sales role (existing system), show normal interface
    if (AuthManager.permissions?.role === 'admin' || 
        AuthManager.permissions?.role === 'sales') {
        return false;
    }
    
    // If user has no modules or limited modules, show landing page
    return modules.length === 0 || 
           (modules.length < 8 && !AuthManager.permissions?.modules.includes('*'));
}

// Fix for Usuarios Actuales in config
window.fixUsuariosActuales = async function() {
    console.log('🔧 Fixing Usuarios Actuales...');
    
    const container = document.querySelector('.usuarios-actuales-container');
    if (!container) {
        console.error('Container not found');
        return;
    }
    
    try {
        // Make sure we're authenticated
        const auth = window.FirebaseData?.auth;
        if (!auth?.currentUser) {
            container.innerHTML = '<p style="color: #dc2626;">No autenticado</p>';
            return;
        }
        
        // Load users from Firebase
        const db = window.firebaseModules.database;
        const usersRef = db.ref(window.FirebaseData.database, 'users');
        const snapshot = await db.get(usersRef);
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="color: #6b7280;">No hay usuarios registrados</p>';
            return;
        }
        
        const users = snapshot.val();
        const userList = Object.entries(users).map(([uid, userData]) => ({
            uid,
            email: userData.email || userData.profile?.email || 'Sin email',
            role: userData.profile?.role || 'Sin rol',
            createdAt: userData.createdAt || userData.profile?.createdAt
        }));
        
        // Render users table
        container.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 1rem;">
                <h3 style="margin: 0 0 1rem 0;">👥 Usuarios Actuales (${userList.length})</h3>
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <th style="text-align: left; padding: 0.5rem;">Email</th>
                            <th style="text-align: left; padding: 0.5rem;">Rol</th>
                            <th style="text-align: left; padding: 0.5rem;">Creado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userList.map(user => `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 0.5rem;">${user.email}</td>
                                <td style="padding: 0.5rem;">
                                    <span style="background: ${user.role === 'admin' ? '#dc2626' : '#3b82f6'}; 
                                                 color: white; padding: 0.25rem 0.5rem; 
                                                 border-radius: 4px; font-size: 0.75rem;">
                                        ${user.role}
                                    </span>
                                </td>
                                <td style="padding: 0.5rem; color: #6b7280;">
                                    ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `<p style="color: #dc2626;">Error: ${error.message}</p>`;
    }
};

// Override openModule to check permissions
const originalOpenModule = window.openModule;
window.openModule = function(moduleName) {
    // Map module names to IDs
    const moduleMap = {
        'Social': 'social',
        'Pipeline': 'pipeline',
        'Tasks': 'tasks',
        'Students': 'students',
        'Payments': 'payments',
        'Groups': 'groups',
        'Teachers': 'teachers',
        'Attendance': 'attendance'
    };
    
    const moduleId = moduleMap[moduleName] || moduleName.toLowerCase();
    
    // Check permissions
    if (AuthManager.isReady && !AuthManager.hasAccess(moduleId)) {
        window.showNotification('❌ No tienes acceso a este módulo', 'error');
        return;
    }
    
    // Log the action
    if (window.logUserAction) {
        window.logUserAction('opened', moduleId);
    }
    
    // Call original function
    if (originalOpenModule) {
        originalOpenModule(moduleName);
    }
};

// Auto-fix Usuarios Actuales when config is opened
const originalLoadConfigData = window.loadConfigData;
window.loadConfigData = async function() {
    // Call original function if it exists
    if (originalLoadConfigData) {
        await originalLoadConfigData();
    }
    
    // Fix usuarios actuales after a delay
    setTimeout(() => {
        fixUsuariosActuales();
    }, 1000);
};

// Add fix to DOM ready as well
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're in config section
    setInterval(() => {
        const usuariosContainer = document.querySelector('.usuarios-actuales-container');
        if (usuariosContainer && usuariosContainer.textContent.includes('Cargando')) {
            fixUsuariosActuales();
        }
    }, 5000);
});

console.log('✅ Auth integration loaded');
