// disable-permissions-temporarily.js - Use this to disable permission checks while setting up

// This file completely disables permission checking temporarily
// Remove this file once permissions are properly configured

console.log('⚠️ DISABLING PERMISSION CHECKS TEMPORARILY');

// Override AuthManager to always return true
if (window.AuthManager) {
    window.AuthManager.hasAccess = function() {
        return true;
    };
    
    window.AuthManager.getAccessibleModules = function() {
        return [
            { id: 'social', name: 'Social', icon: '💬', color: '#3b82f6' },
            { id: 'pipeline', name: 'Pipeline', icon: '🔄', color: '#10b981' },
            { id: 'tasks', name: 'Tareas', icon: '📋', color: '#f59e0b' },
            { id: 'students', name: 'Estudiantes', icon: '👥', color: '#3b82f6' },
            { id: 'payments', name: 'Pagos', icon: '💰', color: '#10b981' },
            { id: 'groups', name: 'Grupos', icon: '📚', color: '#8b5cf6' },
            { id: 'teachers', name: 'Profesores', icon: '👩‍🏫', color: '#f59e0b' },
            { id: 'attendance', name: 'Asistencia', icon: '📋', color: '#ef4444' }
        ];
    };
}

// Override checkUserNeedsLanding to always return false
window.checkUserNeedsLanding = async function() {
    return false;
};

// Remove any permission checks from openModule
const originalOpenModule = window.openModule;
window.openModule = function(moduleName) {
    console.log(`Opening module: ${moduleName} (permissions disabled)`);
    
    // Just switch modules without any permission checks
    const containers = ['socialContainer', 'pipelineContainer', 'tasksContainer', 
                       'studentsContainer', 'paymentsContainer', 'groupsContainer', 
                       'teachersContainer', 'attendanceContainer'];
    
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Show the selected module
    const moduleMap = {
        'Social': 'socialContainer',
        'Pipeline': 'pipelineContainer', 
        'Tasks': 'tasksContainer',
        'Students': 'studentsContainer',
        'Payments': 'paymentsContainer',
        'Groups': 'groupsContainer',
        'Teachers': 'teachersContainer',
        'Attendance': 'attendanceContainer'
    };
    
    const containerId = moduleMap[moduleName];
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        }
    }
    
    // Call the appropriate load function
    const loadFunctions = {
        'Social': 'loadSocialMediaData',
        'Pipeline': 'loadPipelineData',
        'Tasks': 'loadTasksData',
        'Students': 'loadStudentsData',
        'Payments': 'loadPaymentsTab',
        'Groups': 'loadGroupsTab',
        'Teachers': 'loadTeachersTab',
        'Attendance': 'loadAttendanceTab'
    };
    
    const loadFunc = loadFunctions[moduleName];
    if (loadFunc && window[loadFunc]) {
        window[loadFunc]();
    }
};

console.log('✅ Permission checks disabled - all modules accessible');
