// add-school-menu.js - Simple solution that adds a visible menu
console.log('🏫 Adding school menu...');

// Wait for page to load
setTimeout(function() {
    // Create a floating menu for school modules
    const schoolMenu = document.createElement('div');
    schoolMenu.id = 'schoolModulesMenu';
    schoolMenu.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        max-width: 200px;
    `;
    
    schoolMenu.innerHTML = `
        <h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1rem;">
            🏫 Módulos Escolares
        </h3>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <button onclick="openStudentsModule()" style="
                padding: 0.75rem;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                text-align: left;
            ">👥 Estudiantes</button>
            
            <button onclick="openPaymentsModule()" style="
                padding: 0.75rem;
                background: #10b981;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                text-align: left;
            ">💰 Pagos</button>
            
            <button onclick="openGroupsModule()" style="
                padding: 0.75rem;
                background: #8b5cf6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                text-align: left;
            ">📚 Grupos</button>
            
            <button onclick="openTeachersModule()" style="
                padding: 0.75rem;
                background: #f59e0b;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                text-align: left;
            ">👩‍🏫 Profesores</button>
            
            <button onclick="openAttendanceModule()" style="
                padding: 0.75rem;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                text-align: left;
            ">📋 Asistencia</button>
            
            <button onclick="document.getElementById('schoolModulesMenu').style.display='none'" style="
                padding: 0.5rem;
                background: #6b7280;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                margin-top: 0.5rem;
                width: 100%;
            ">✖️ Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(schoolMenu);
    
    // Create container for school modules
    const moduleContainer = document.createElement('div');
    moduleContainer.id = 'schoolModuleContainer';
    moduleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        z-index: 10000;
        display: none;
        overflow-y: auto;
    `;
    
    moduleContainer.innerHTML = `
        <div style="background: #f3f4f6; padding: 1rem; border-bottom: 1px solid #e5e7eb;">
            <button onclick="closeSchoolModule()" style="
                float: right;
                padding: 0.5rem 1rem;
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">✖️ Cerrar</button>
            <h2 id="moduleTitle" style="margin: 0;">Módulo</h2>
        </div>
        <div id="moduleContent" style="padding: 1rem;">
            <!-- Module content will be loaded here -->
        </div>
    `;
    
    document.body.appendChild(moduleContainer);
    
    console.log('✅ School menu added successfully!');
    
    // Show a notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10001;
    `;
    notification.innerHTML = '✅ Módulos escolares listos! Ver menú en la esquina inferior derecha →';
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
    
}, 2000);

// Module opening functions
window.openStudentsModule = function() {
    const container = document.getElementById('schoolModuleContainer');
    const content = document.getElementById('moduleContent');
    const title = document.getElementById('moduleTitle');
    
    container.style.display = 'block';
    title.textContent = '👥 Gestión de Estudiantes';
    
    if (typeof window.loadStudentsTab === 'function') {
        content.innerHTML = '<div id="studentsContainer"></div>';
        window.loadStudentsTab();
    } else {
        content.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <h3>⚠️ Módulo de Estudiantes no encontrado</h3>
                <p>Asegúrate de que el archivo <code>students.js</code> está cargado.</p>
                <button onclick="location.reload()" style="
                    padding: 0.5rem 1rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 1rem;
                ">🔄 Recargar página</button>
            </div>
        `;
    }
};

window.openPaymentsModule = function() {
    const container = document.getElementById('schoolModuleContainer');
    const content = document.getElementById('moduleContent');
    const title = document.getElementById('moduleTitle');
    
    container.style.display = 'block';
    title.textContent = '💰 Control de Pagos';
    
    if (typeof window.loadPaymentsTab === 'function') {
        content.innerHTML = '<div id="paymentsContainer"></div>';
        window.loadPaymentsTab();
    } else {
        content.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <h3>⚠️ Módulo de Pagos no encontrado</h3>
                <p>Asegúrate de que el archivo <code>payments.js</code> está cargado.</p>
            </div>
        `;
    }
};

window.openGroupsModule = function() {
    const container = document.getElementById('schoolModuleContainer');
    const content = document.getElementById('moduleContent');
    const title = document.getElementById('moduleTitle');
    
    container.style.display = 'block';
    title.textContent = '📚 Gestión de Grupos';
    
    if (typeof window.loadGroupsTab === 'function') {
        content.innerHTML = '<div id="groupsContainer"></div>';
        window.loadGroupsTab();
    } else {
        content.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <h3>⚠️ Módulo de Grupos no encontrado</h3>
                <p>Asegúrate de que el archivo <code>groups.js</code> está cargado.</p>
            </div>
        `;
    }
};

window.openTeachersModule = function() {
    const container = document.getElementById('schoolModuleContainer');
    const content = document.getElementById('moduleContent');
    const title = document.getElementById('moduleTitle');
    
    container.style.display = 'block';
    title.textContent = '👩‍🏫 Gestión de Profesores';
    
    if (typeof window.loadTeachersTab === 'function') {
        content.innerHTML = '<div id="teachersContainer"></div>';
        window.loadTeachersTab();
    } else {
        content.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <h3>⚠️ Módulo de Profesores no encontrado</h3>
                <p>Asegúrate de que el archivo <code>teachers.js</code> está cargado.</p>
            </div>
        `;
    }
};

window.openAttendanceModule = function() {
    const container = document.getElementById('schoolModuleContainer');
    const content = document.getElementById('moduleContent');
    const title = document.getElementById('moduleTitle');
    
    container.style.display = 'block';
    title.textContent = '📋 Control de Asistencia';
    
    if (typeof window.loadAttendanceTab === 'function') {
        content.innerHTML = '<div id="attendanceContainer"></div>';
        window.loadAttendanceTab();
    } else {
        content.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <h3>⚠️ Módulo de Asistencia no encontrado</h3>
                <p>Asegúrate de que el archivo <code>attendance.js</code> está cargado.</p>
            </div>
        `;
    }
};

window.closeSchoolModule = function() {
    document.getElementById('schoolModuleContainer').style.display = 'none';
};

// Add keyboard shortcut to show/hide menu
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'm') {
        const menu = document.getElementById('schoolModulesMenu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }
});

// Check which modules are loaded
setTimeout(function() {
    console.log('📦 Checking loaded modules:');
    console.log('Students:', typeof window.loadStudentsTab === 'function' ? '✅' : '❌');
    console.log('Payments:', typeof window.loadPaymentsTab === 'function' ? '✅' : '❌');
    console.log('Groups:', typeof window.loadGroupsTab === 'function' ? '✅' : '❌');
    console.log('Teachers:', typeof window.loadTeachersTab === 'function' ? '✅' : '❌');
    console.log('Attendance:', typeof window.loadAttendanceTab === 'function' ? '✅' : '❌');
}, 3000);
