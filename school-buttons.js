// school-buttons.js - Simple solution that adds visible buttons
console.log('🏫 Adding school buttons...');

// Create a simple button bar
function addSchoolButtons() {
    // Remove existing buttons first (to allow refresh with updated role)
    const existingBar = document.getElementById('schoolButtonBar');
    if (existingBar) {
        console.log('🔄 Removing existing school buttons to refresh with role');
        existingBar.remove();
    }

    console.log('🏫 Creating school buttons for role:', window.userRole || 'not set');
    
    // Create button bar
    const buttonBar = document.createElement('div');
    buttonBar.id = 'schoolButtonBar';
    buttonBar.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // Add title
    const title = document.createElement('div');
    title.innerHTML = '<strong>🏫 Módulos Escolares</strong>';
    title.style.marginBottom = '10px';
    buttonBar.appendChild(title);
    
    // Create buttons
    const modules = [
        { name: 'Estudiantes', icon: '👥', color: '#3b82f6', func: 'Students', perm: 'students' },
        // 🧪 people sent by sales for a test class (trials.js) — badge = pending count
        { name: 'Clases de prueba', icon: '🧪', color: '#f59e0b', func: 'Trials', perm: 'trials', badge: 'trials' },
        { name: 'Pagos', icon: '💰', color: '#10b981', func: 'Payments', perm: 'payments' },
        { name: 'Tienda', icon: '🏪', color: '#ec4899', func: 'Tienda', perm: 'tienda' },
        { name: 'Finanzas', icon: '💵', color: '#6366f1', func: 'Finance', perm: 'finance' },
        { name: 'Nómina', icon: '💼', color: '#0ea5e9', func: 'Payroll', perm: 'nomina', adminOnly: true },
        // { name: 'Grupos', icon: '📚', color: '#8b5cf6', func: 'Groups' }, // Hidden - replaced by Grupos 2.0, but groups.js still loaded for attendance.js dependency
        { name: 'Grupos 2.0', icon: '🎓', color: '#667eea', func: 'Grupos2', perm: 'groups', directorOnly: true },
        { name: 'Empleados 2.0', icon: '👔', color: '#14b8a6', func: 'Employees', perm: 'employees', directorOnly: true },
        { name: 'Profesores 2.0', icon: '👩‍🏫', color: '#f59e0b', func: 'Teachers', perm: 'teachers' },
        { name: 'Asistencia', icon: '📋', color: '#ef4444', func: 'Attendance', perm: 'attendance' },
        // App module removed — replaced by TutorBox tab in top menu
    ];

    // 🔐 Module permissions (15 Sep 2026). The bar is rebuilt several times after
    // login, so it gates itself instead of relying on the enforcer's first pass:
    //  - the sales role (`ventas`) never gets the bar;
    //  - once PermissionEnforcer has loaded users/{uid}/permissions/modules, each
    //    button needs its module (admins/directors always pass);
    //  - admin-only / director-only modules also open for a user whose module was
    //    ticked EXPLICITLY in Admin → Ver Permisos.
    if (window.userRole === 'ventas') {
        console.log('🚫 Sales role — no school modules');
        return;
    }
    const pe = window.PermissionEnforcer;
    const permsReady = !!(pe && pe.isReady);
    // Tell the enforcer this bar already applied the module + role/email rules, so
    // its text-based pass must not hide role-granted buttons (Grupos 2.0 / Empleados
    // 2.0 for contacto@, Nómina for the superadmin) again.
    buttonBar.dataset.selfGated = permsReady ? '1' : '0';
    const allowed = (perm) => !permsReady || pe.hasPermission(perm);
    const explicit = (perm) => permsReady && pe.userPermissions && pe.userPermissions[perm] === true;
    let visibleCount = 0;

    modules.forEach(module => {
        const userRole = window.userRole || '';
        const userEmail = window.FirebaseData?.currentUser?.email || '';

        // Skip admin-only modules (only admin@ciudadbilingue.com, or an explicit grant)
        if (module.adminOnly) {
            if (userEmail !== 'admin@ciudadbilingue.com' && !explicit(module.perm)) {
                console.log(`⚠️ Skipping ${module.name} - admin only`);
                return; // Skip this module
            }
        }

        // Skip director-only modules if user is not director (or explicitly granted)
        if (module.directorOnly) {
            // Allow director, admin, or specific email accounts
            const allowedEmails = ['admin@ciudadbilingue.com', 'contacto@ciudadbilingue.com'];
            if (userRole !== 'director' && userRole !== 'admin' && !allowedEmails.includes(userEmail) && !explicit(module.perm)) {
                console.log(`⚠️ Skipping ${module.name} - director only`);
                return; // Skip this module
            }
        }

        // Module permission (Admin → Ver Permisos)
        if (!module.adminOnly && !module.directorOnly && !allowed(module.perm)) {
            console.log(`🚫 Skipping ${module.name} - module not permitted`);
            return;
        }
        visibleCount += 1;

        const btn = document.createElement('button');
        btn.innerHTML = `${module.icon} ${module.name}`;
        btn.style.cssText = `
            padding: 8px 16px;
            background: ${module.color};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;

        if (module.badge === 'trials') {
            btn.dataset.trialsBtn = '1';   // trials.js paints the pending-count badge here
            btn.style.position = 'relative';
        }

        btn.onmouseover = () => btn.style.opacity = '0.8';
        btn.onmouseout = () => btn.style.opacity = '1';

        btn.onclick = () => {
            console.log(`Opening ${module.name}...`);
            openModule(module.func);
        };

        buttonBar.appendChild(btn);
    });
    
    // Add minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '➖ Minimizar';
    minimizeBtn.style.cssText = `
        margin-top: 10px;
        padding: 6px;
        background: #6b7280;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    minimizeBtn.onclick = () => {
        buttonBar.style.display = 'none';
        showFloatingButton();
    };
    buttonBar.appendChild(minimizeBtn);
    
    if (permsReady && visibleCount === 0) {
        console.log('🚫 No school modules permitted — bar not added');
        return;
    }
    document.body.appendChild(buttonBar);
    console.log('✅ School button bar added!');
    if (typeof window.trialsUpdateBadges === 'function') window.trialsUpdateBadges();
}

// Create floating button when minimized
function showFloatingButton() {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'schoolFloatBtn';
    floatBtn.innerHTML = '🏫';
    floatBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
    `;
    floatBtn.onclick = () => {
        document.getElementById('schoolButtonBar').style.display = 'flex';
        floatBtn.remove();
    };
    document.body.appendChild(floatBtn);
}

// Open module function
function openModule(moduleName) {
    // Create container if it doesn't exist
    let container = document.getElementById('schoolModuleView');
    if (!container) {
        container = document.createElement('div');
        container.id = 'schoolModuleView';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 10000;
            overflow: auto;
            display: none;
        `;
        document.body.appendChild(container);
    }
    
    // Create header
    container.innerHTML = `
        <div style="background: #f3f4f6; padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0;">${moduleName === 'Trials' ? '🧪 Clases de prueba' : `📚 ${moduleName} Module`}</h2>
            <button onclick="document.getElementById('schoolModuleView').style.display='none'"
                    style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                ✖️ Cerrar
            </button>
        </div>
        <div id="${moduleName.charAt(0).toLowerCase() + moduleName.slice(1)}Container" style="padding: 1rem;">
            <div style="text-align: center; padding: 3rem;">
                <div class="loading-spinner"></div>
                <p>Cargando módulo...</p>
            </div>
        </div>
    `;
    
    container.style.display = 'block';
    
    // Load the module
    const loadFunction = window[`load${moduleName}Tab`];
    if (typeof loadFunction === 'function') {
        setTimeout(() => {
            loadFunction();
        }, 100);
    } else {
        const containerId = moduleName.charAt(0).toLowerCase() + moduleName.slice(1) + 'Container';
        document.getElementById(containerId).innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h3>⚠️ Módulo no encontrado</h3>
                <p>La función load${moduleName}Tab no está disponible</p>
                <p>Verifica que ${moduleName.toLowerCase()}.js está cargado correctamente</p>
            </div>
        `;
    }
}

// Add CSS for spinner
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSchoolButtons);
} else {
    // DOM already loaded
    setTimeout(addSchoolButtons, 1000);
}

// Add keyboard shortcut (Ctrl+M)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'm') {
        const bar = document.getElementById('schoolButtonBar');
        if (bar) {
            bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
        } else {
            addSchoolButtons();
        }
    }
});

console.log('✅ School buttons script loaded! Press Ctrl+M to toggle menu.');
