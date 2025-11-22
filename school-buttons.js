// school-buttons.js - Simple solution that adds visible buttons
console.log('🏫 Adding school buttons...');

// Create a simple button bar
function addSchoolButtons() {
    // Check if buttons already exist
    if (document.getElementById('schoolButtonBar')) {
        console.log('✅ School buttons already exist');
        return;
    }
    
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
        { name: 'Estudiantes', icon: '👥', color: '#3b82f6', func: 'Students' },
        { name: 'Pagos', icon: '💰', color: '#10b981', func: 'Payments' },
        { name: 'Tienda', icon: '🏪', color: '#ec4899', func: 'Tienda' },
        { name: 'Finanzas', icon: '💵', color: '#6366f1', func: 'Finance', directorOnly: true },
        { name: 'Nómina', icon: '💼', color: '#0ea5e9', func: 'Payroll', directorOnly: true },
        { name: 'Grupos', icon: '📚', color: '#8b5cf6', func: 'Groups' },
        { name: 'Grupos 2.0', icon: '🎓', color: '#667eea', func: 'Grupos2', directorOnly: true },
        { name: 'Profesores', icon: '👩‍🏫', color: '#f59e0b', func: 'Teachers' },
        { name: 'Asistencia', icon: '📋', color: '#ef4444', func: 'Attendance' }
    ];
    
    modules.forEach(module => {
        // Skip director-only modules if user is not director
        if (module.directorOnly) {
            const userRole = window.userRole || '';
            if (userRole !== 'director' && userRole !== 'admin') {
                console.log(`⚠️ Skipping ${module.name} - director only`);
                return; // Skip this module
            }
        }

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
    
    document.body.appendChild(buttonBar);
    console.log('✅ School button bar added!');
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
            <h2 style="margin: 0;">📚 ${moduleName} Module</h2>
            <button onclick="document.getElementById('schoolModuleView').style.display='none'" 
                    style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                ✖️ Cerrar
            </button>
        </div>
        <div id="${moduleName.toLowerCase()}Container" style="padding: 1rem;">
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
        document.getElementById(`${moduleName.toLowerCase()}Container`).innerHTML = `
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
