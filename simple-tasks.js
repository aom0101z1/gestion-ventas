// ===== SOLO AGREGA ESTAS LÍNEAS AL FINAL DE TU simple-tasks.js =====

// Funciones para drag & drop que faltan (agregar al final del archivo)
window.handleDragStart = function(event, taskId) {
    draggedTask = taskId;
    event.target.style.opacity = '0.5';
    event.dataTransfer.setData('text/plain', taskId);
    console.log('🎯 Task drag started:', taskId);
};

window.handleDragOver = function(event) {
    event.preventDefault();
    event.currentTarget.style.backgroundColor = '#e3f2fd';
};

window.handleDragLeave = function(event) {
    event.currentTarget.style.backgroundColor = '#f9fafb';
};

window.handleDrop = async function(event, newStatus) {
    event.preventDefault();
    event.currentTarget.style.backgroundColor = '#f9fafb';
    
    if (!draggedTask) return;
    
    try {
        const { ref, update } = window.firebaseModules.database;
        const taskRef = ref(window.firebaseDb, `tasks/${draggedTask}`);
        
        await update(taskRef, {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser.uid
        });
        
        console.log('✅ Task moved via drag & drop');
        showNotification('Tarea actualizada', 'success');
    } catch (error) {
        console.error('❌ Error updating task:', error);
        showNotification('Error al mover tarea', 'error');
    }
    
    draggedTask = null;
    document.querySelectorAll('.task-card').forEach(card => {
        card.style.opacity = '1';
    });
};

console.log('✅ Task drag & drop functions added');
