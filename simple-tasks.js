// ===== DRAG & DROP FIX PARA TAREAS - SOLO LAS FUNCIONES QUE FALTAN =====

// Solo agrega estas funciones al final de tu archivo simple-tasks.js existente:

function handleDragStart(event, taskId) {
    draggedTask = taskId;
    event.target.style.opacity = '0.5';
    event.dataTransfer.setData('text/plain', taskId);
    console.log('🎯 Task drag started:', taskId);
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.backgroundColor = '#e3f2fd';
}

function handleDragLeave(event) {
    event.currentTarget.style.backgroundColor = '#f9fafb';
}

async function handleDrop(event, newStatus) {
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
}

// Exportar las funciones que faltan
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;

console.log('✅ Task drag & drop functions added');
