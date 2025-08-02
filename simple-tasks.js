// ===== MINIMAL TASK TEST - GUARANTEED TO WORK =====

function loadTasksData() {
    console.log('📋 MINIMAL TASK TEST STARTING...');
    
    // Find any possible container
    let container = document.getElementById('tasks') || 
                   document.getElementById('tasksContainer') || 
                   document.querySelector('#tasks');
    
    if (!container) {
        console.error('❌ No container found at all');
        return;
    }
    
    console.log('✅ Using container:', container.id);
    
    // Force visibility
    container.classList.remove('hidden');
    container.style.display = 'block';
    
    // Simple test content
    container.innerHTML = `
        <div style="padding: 20px; background: white; border-radius: 10px;">
            <h2>📋 Task Management Test</h2>
            <p style="color: green;">✅ Container found and working!</p>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h3>📝 To Do</h3>
                    <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 5px; cursor: pointer;" 
                         onclick="alert('Task clicked!')">
                        Follow up with leads
                    </div>
                    <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 5px; cursor: pointer;"
                         onclick="alert('Task clicked!')">
                        Prepare materials
                    </div>
                </div>
                
                <div style="background: #cce5ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
                    <h3>🔄 In Progress</h3>
                    <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 5px; cursor: pointer;"
                         onclick="alert('Task clicked!')">
                        Update CRM system
                    </div>
                </div>
                
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
                    <h3>✅ Completed</h3>
                    <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 5px; cursor: pointer;"
                         onclick="alert('Task clicked!')">
                        Team meeting
                    </div>
                </div>
            </div>
            
            <button onclick="alert('New task feature coming soon!')" 
                    style="background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 8px; margin-top: 20px; cursor: pointer; font-size: 16px;">
                ➕ Add New Task
            </button>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <h4>🧪 Debug Info:</h4>
                <p>Container ID: ${container.id}</p>
                <p>Container classes: ${container.className}</p>
                <p>Time loaded: ${new Date().toLocaleTimeString()}</p>
            </div>
        </div>
    `;
    
    console.log('✅ Minimal task test completed successfully');
}

// Export globally
window.loadTasksData = loadTasksData;

console.log('✅ Minimal task test loaded - Try clicking the Tasks tab now');
