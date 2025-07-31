// simple-tasks.js - DIRECT OVERRIDE VERSION
console.log('📋 Simple Tasks module loading...');

// Wait a moment to ensure everything is loaded, then override
setTimeout(() => {
    console.log('📋 Overriding loadTasksData function...');
    
    // Override the loadTasksData function
    window.loadTasksData = function() {
        console.log('✅ Simple tasks loadTasksData called!');
        
        // Get the tasks tab content area by ID
        const tabContent = document.getElementById('tasks');
        if (!tabContent) {
            console.error('❌ Tasks tab content area not found');
            return;
        }
        
        // Clear any existing content and make visible
        tabContent.innerHTML = '';
        tabContent.style.display = 'block';
        tabContent.classList.remove('hidden');
        
        // Create simple UI
        tabContent.innerHTML = `
            <div style="padding: 20px; background: white; min-height: 500px;">
                <h2 style="color: #333; margin-bottom: 20px;">📋 Gestión de Tareas</h2>
                
                <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>✅ ¡El módulo de tareas está funcionando!</strong>
                    <br>
                    Esta es una versión simplificada del módulo de tareas.
                </div>
                
                <div style="margin: 20px 0;">
                    <button onclick="alert('✅ Botón funcionando!')" 
                            style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        🧪 Probar Funcionalidad
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6;">
                    <h3 style="margin-top: 0; color: #495057;">Información del Sistema:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Estado:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">✅ Activo</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Firebase:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${window.firebaseDb ? '✅ Conectado' : '❌ No conectado'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Usuario:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${window.FirebaseData?.currentUser?.email || 'No autenticado'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>Hora:</strong></td>
                            <td style="padding: 8px;">${new Date().toLocaleString('es-CO')}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
        
        console.log('✅ Tasks UI rendered successfully');
    };
    
    console.log('✅ loadTasksData function overridden');
}, 100);

console.log('✅ Simple Tasks module loaded');
