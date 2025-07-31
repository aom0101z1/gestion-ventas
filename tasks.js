// tasks.js - WORKING VERSION FOR YOUR SETUP
console.log('📋 Tasks.js starting...');

// Store tasks data
let allTasks = [];

// Main function called when clicking Tasks tab
window.loadTasksData = function() {
    console.log('📋 Tasks tab clicked - loadTasksData called');
    
    // Get the tasks tab content area
    const tabContent = document.querySelector('.tab-content[data-tab="tasks"]');
    if (!tabContent) {
        console.error('❌ Tasks tab content area not found');
        return;
    }
    
    // Create the UI
    tabContent.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">📋 Gestión de Tareas</h2>
                <button onclick="createNewTask()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    ➕ Nueva Tarea
                </button>
            </div>
            
            <div id="tasksContainer" style="min-height: 200px;">
                <p>Cargando tareas...</p>
            </div>
        </div>
    `;
    
    // Load tasks from Firebase
    loadTasksFromFirebase();
};

// Load tasks from Firebase
function loadTasksFromFirebase() {
    console.log('🔥 Loading tasks from Firebase...');
    
    try {
        // Check if we have the required modules
        if (!window.firebaseModules || !window.firebaseModules.database) {
            console.error('❌ Firebase modules not found');
            showError('Firebase no está configurado correctamente');
            return;
        }
        
        // Get the database functions
        const { ref, onValue } = window.firebaseModules.database;
        
        // Get reference to tasks
        const tasksRef = ref(window.firebaseDb, 'tasks');
        
        // Listen for changes
        onValue(tasksRef, (snapshot) => {
            console.log('📥 Data received from Firebase');
            
            const data = snapshot.val() || {};
            allTasks = [];
            
            // Convert to array
            Object.keys(data).forEach(key => {
                allTasks.push({
                    id: key,
                    ...data[key]
                });
            });
            
            console.log(`✅ Loaded ${allTasks.length} tasks`);
            displayTasks();
        }, (error) => {
            console.error('❌ Firebase error:', error);
            showError('Error al cargar las tareas: ' + error.message);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Error: ' + error.message);
    }
}

// Display tasks
function displayTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    if (allTasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3>No hay tareas todavía</h3>
                <p>Crea tu primera tarea para comenzar</p>
            </div>
        `;
        return;
    }
    
    // Show tasks
    container.innerHTML = allTasks.map(task => `
        <div style="background: white; border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
            <h4 style="margin: 0 0 10px 0;">${task.title || 'Sin título'}</h4>
            <p style="margin: 5px 0;">Estado: ${task.status || 'pending'}</p>
            <p style="margin: 5px 0;">Creado por: ${task.createdByName || 'Unknown'}</p>
            <small>ID: ${task.id}</small>
        </div>
    `).join('');
}

// Create new task
window.createNewTask = async function() {
    const title = prompt('Título de la tarea:');
    if (!title) return;
    
    try {
        // Get current user info
        const currentUser = window.FirebaseData.currentUser;
        const userProfile = await window.FirebaseData.loadUserProfile();
        
        if (!currentUser) {
            alert('❌ No hay usuario autenticado');
            return;
        }
        
        // Task data
        const taskData = {
            title: title,
            status: 'pending',
            createdBy: currentUser.uid,
            createdByName: userProfile?.name || currentUser.email,
            createdAt: new Date().toISOString()
        };
        
        // Save to Firebase
        const { ref, push } = window.firebaseModules.database;
        const tasksRef = ref(window.firebaseDb, 'tasks');
        await push(tasksRef, taskData);
        
        alert('✅ Tarea creada exitosamente');
        
    } catch (error) {
        console.error('❌ Error creating task:', error);
        alert('❌ Error: ' + error.message);
    }
};

// Show error message
function showError(message) {
    const container = document.getElementById('tasksContainer');
    if (container) {
        container.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }
}

console.log('✅ Tasks.js loaded successfully');
console.log('ℹ️ Click the Tasks tab to see this module in action');
