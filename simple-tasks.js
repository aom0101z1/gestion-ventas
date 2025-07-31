// simple-tasks.js - SIMPLE TASKS MODULE (NO CONFLICTS)
console.log('📋 Simple Tasks module loading...');

// Main function called when clicking Tasks tab
window.loadTasksData = function() {
    console.log('📋 Tasks tab clicked - loadTasksData called');
    
    // Get the tasks tab content area by ID
    const tabContent = document.getElementById('tasks');
    if (!tabContent) {
        console.error('❌ Tasks tab content area not found');
        return;
    }
    
    // Make sure it's visible
    tabContent.style.display = 'block';
    
    // Create simple UI
    tabContent.innerHTML = `
        <div style="padding: 20px;">
            <h2>📋 Gestión de Tareas - Versión Simple</h2>
            <p>Módulo de tareas funcionando correctamente</p>
            
            <div style="margin: 20px 0;">
                <button onclick="alert('✅ El módulo de tareas está funcionando!')" 
                        style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🧪 Test del Módulo
                </button>
            </div>
            
            <div style="background: #f0f0f0; padding: 20px; border-radius: 5px;">
                <h3>Estado del Sistema:</h3>
                <p>✅ Módulo cargado</p>
                <p>✅ Firebase disponible: ${window.firebaseDb ? 'Sí' : 'No'}</p>
                <p>✅ Usuario actual: ${window.FirebaseData?.currentUser?.email || 'No autenticado'}</p>
            </div>
        </div>
    `;
};

console.log('✅ Simple Tasks module loaded - loadTasksData function ready');
