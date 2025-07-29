// pipeline.js - FIREBASE INTEGRATED VERSION WITH DRAG & DROP
// ===== PIPELINE CONFIGURATION =====
const PIPELINE_STAGES = [
    { 
        id: 'nuevo', 
        name: 'Nuevo', 
        color: '#fef3c7', 
        textColor: '#92400e',
        icon: '📋'
    },
    { 
        id: 'contactado', 
        name: 'Contactado', 
        color: '#dbeafe', 
        textColor: '#1e40af',
        icon: '📞'
    },
    { 
        id: 'interesado', 
        name: 'Interesado', 
        color: '#d1fae5', 
        textColor: '#065f46',
        icon: '👍'
    },
    { 
        id: 'negociacion', 
        name: 'Negociación', 
        color: '#fed7aa', 
        textColor: '#c2410c',
        icon: '🤝'
    },
    { 
        id: 'convertido', 
        name: 'Convertido', 
        color: '#dcfce7', 
        textColor: '#166534',
        icon: '✅'
    },
    { 
        id: 'perdido', 
        name: 'Perdido', 
        color: '#fee2e2', 
        textColor: '#dc2626',
        icon: '❌'
    }
];

// ===== PIPELINE STATE =====
let pipelineData = [];
let currentUserProfile = null;
let isDirector = false;

// ===== PIPELINE INITIALIZATION =====
async function initializePipeline() {
    console.log('🎯 Initializing Firebase Pipeline...');
    
    if (!window.FirebaseData || !window.FirebaseData.currentUser) {
        console.log('❌ Firebase not available for pipeline');
        return;
    }
    
    try {
        // Get user profile
        currentUserProfile = await window.FirebaseData.loadUserProfile();
        isDirector = currentUserProfile?.role === 'director';
        
        console.log('👤 Pipeline user:', currentUserProfile?.name, '- Role:', currentUserProfile?.role);
        
        // Load and render pipeline
        await loadPipelineData();
        renderPipeline();
        
        console.log('✅ Pipeline initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing pipeline:', error);
        showPipelineError(error.message);
    }
}

// ===== DATA LOADING =====
async function loadPipelineData() {
    try {
        console.log('📊 Loading pipeline data from Firebase...');
        
        if (!window.FirebaseData) {
            throw new Error('Firebase not available');
        }
        
        // Get filtered contacts based on user role
        const allContacts = await window.FirebaseData.getFilteredContacts();
        
        // Filter out contacts without proper status
        pipelineData = allContacts.map(contact => ({
            ...contact,
            status: normalizeStatus(contact.status || 'Nuevo')
        }));
        
        console.log(`✅ Loaded ${pipelineData.length} contacts for pipeline`);
        
    } catch (error) {
        console.error('❌ Error loading pipeline data:', error);
        pipelineData = [];
        throw error;
    }
}

// ===== STATUS NORMALIZATION =====
function normalizeStatus(status) {
    const statusMap = {
        'nuevo': 'nuevo',
        'contactado': 'contactado', 
        'interesado': 'interesado',
        'negociacion': 'negociacion',
        'negociación': 'negociacion',
        'convertido': 'convertido',
        'perdido': 'perdido'
    };
    
    return statusMap[status.toLowerCase()] || 'nuevo';
}

// ===== PIPELINE RENDERING =====
function renderPipeline() {
    const container = document.getElementById('pipelineContainer');
    if (!container) {
        console.log('❌ Pipeline container not found');
        return;
    }
    
    try {
        console.log('🎨 Rendering pipeline with', pipelineData.length, 'contacts');
        
        // Create pipeline columns
        const pipelineHTML = PIPELINE_STAGES.map(stage => {
            const stageContacts = pipelineData.filter(contact => 
                normalizeStatus(contact.status) === stage.id
            );
            
            return `
                <div class="pipeline-column" data-stage="${stage.id}">
                    <div class="pipeline-header" style="background: ${stage.color}; color: ${stage.textColor};">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span>${stage.icon}</span>
                            <span style="font-weight: 600;">${stage.name}</span>
                        </div>
                        <span style="background: rgba(0,0,0,0.1); padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
                            ${stageContacts.length}
                        </span>
                    </div>
                    <div class="pipeline-cards" id="cards-${stage.id}">
                        ${stageContacts.map(contact => renderPipelineCard(contact)).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = pipelineHTML;
        
        // Setup drag and drop
        setupDragAndDrop();
        
        console.log('✅ Pipeline rendered successfully');
        
    } catch (error) {
        console.error('❌ Error rendering pipeline:', error);
        showPipelineError('Error al renderizar pipeline');
    }
}

// ===== PIPELINE CARD RENDERING =====
function renderPipelineCard(contact) {
    const timeAgo = getTimeAgo(contact.date || contact.createdAt);
    const salespersonName = isDirector ? getSalespersonName(contact.salespersonId) : '';
    
    return `
        <div class="pipeline-card" 
             draggable="true" 
             data-contact-id="${contact.id}"
             data-current-status="${normalizeStatus(contact.status)}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; color: #1f2937; flex: 1;">${contact.name}</div>
                <button onclick="showContactDetails('${contact.id}')" 
                        style="background: none; border: none; color: #6b7280; cursor: pointer; padding: 0.2rem;">
                    ⋯
                </button>
            </div>
            
            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">
                📞 ${contact.phone}
            </div>
            
            <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem;">
                📍 ${contact.source.length > 25 ? contact.source.substring(0, 25) + '...' : contact.source}
            </div>
            
            ${salespersonName ? `
                <div style="font-size: 0.8rem; color: #667eea; margin-bottom: 0.5rem;">
                    👤 ${salespersonName}
                </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                <span style="font-size: 0.7rem; color: #9ca3af;">${timeAgo}</span>
                <div style="display: flex; gap: 0.25rem;">
                    <button onclick="editContactInPipeline('${contact.id}')" 
                            style="background: #f3f4f6; border: none; border-radius: 4px; padding: 0.2rem 0.4rem; font-size: 0.7rem; cursor: pointer;"
                            title="Editar">
                        ✏️
                    </button>
                    <button onclick="openWhatsAppFromPipeline('${contact.phone}', '${contact.name}')" 
                            style="background: #dcfce7; border: none; border-radius: 4px; padding: 0.2rem 0.4rem; font-size: 0.7rem; cursor: pointer;"
                            title="WhatsApp">
                        💬
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== DRAG AND DROP SETUP =====
function setupDragAndDrop() {
    console.log('🔄 Setting up drag and drop...');
    
    // Setup draggable cards
    const cards = document.querySelectorAll('.pipeline-card[draggable="true"]');
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
    
    // Setup drop zones
    const columns = document.querySelectorAll('.pipeline-column');
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
    
    console.log('✅ Drag and drop setup complete');
}

// ===== DRAG AND DROP HANDLERS =====
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedElement = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (e.target.classList.contains('pipeline-column')) {
        e.target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('pipeline-column')) {
        e.target.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    
    const column = e.target.closest('.pipeline-column');
    if (!column || !draggedElement) return;
    
    column.classList.remove('drag-over');
    
    const newStage = column.dataset.stage;
    const contactId = draggedElement.dataset.contactId;
    const currentStatus = draggedElement.dataset.currentStatus;
    
    // Don't update if dropped in same column
    if (newStage === currentStatus) return;
    
    try {
        console.log(`🔄 Moving contact ${contactId} from ${currentStatus} to ${newStage}`);
        
        // Update in Firebase
        await updateContactStatus(contactId, newStage);
        
        // Update local data
        const contact = pipelineData.find(c => c.id === contactId);
        if (contact) {
            contact.status = capitalizeStatus(newStage);
        }
        
        // Re-render pipeline
        renderPipeline();
        
        // Show success notification
        showStatusUpdateNotification(newStage);
        
        console.log('✅ Contact status updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating contact status:', error);
        alert(`❌ Error al actualizar estado: ${error.message}`);
        
        // Revert on error
        renderPipeline();
    }
}

// ===== STATUS UPDATES =====
async function updateContactStatus(contactId, newStatus) {
    if (!window.FirebaseData) {
        throw new Error('Firebase not available');
    }
    
    const statusMap = {
        'nuevo': 'Nuevo',
        'contactado': 'Contactado',
        'interesado': 'Interesado', 
        'negociacion': 'Negociación',
        'convertido': 'Convertido',
        'perdido': 'Perdido'
    };
    
    const updates = {
        status: statusMap[newStatus] || 'Nuevo',
        updatedAt: new Date().toISOString(),
        lastStatusChange: new Date().toISOString()
    };
    
    await window.FirebaseData.updateContact(contactId, updates);
}

function capitalizeStatus(status) {
    const statusMap = {
        'nuevo': 'Nuevo',
        'contactado': 'Contactado',
        'interesado': 'Interesado',
        'negociacion': 'Negociación', 
        'convertido': 'Convertido',
        'perdido': 'Perdido'
    };
    
    return statusMap[status] || 'Nuevo';
}

// ===== UTILITY FUNCTIONS =====
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace minutos';
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    if (diffInHours < 48) return 'Ayer';
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} días`;
}

function getSalespersonName(salespersonId) {
    // This would need to be implemented based on your user management
    // For now, return a placeholder
    return 'Vendedor';
}

// ===== PIPELINE ACTIONS =====
async function showContactDetails(contactId) {
    try {
        const contact = pipelineData.find(c => c.id === contactId);
        if (!contact) {
            alert('❌ Contacto no encontrado');
            return;
        }
        
        const salespersonName = isDirector ? getSalespersonName(contact.salespersonId) : 'Tu contacto';
        
        alert(`📋 DETALLES DEL CONTACTO

👤 Nombre: ${contact.name}
📞 Teléfono: ${contact.phone}
📧 Email: ${contact.email || 'No proporcionado'}
📍 Fuente: ${contact.source}
🏘️ Ubicación: ${contact.location || 'No especificada'}
📝 Estado: ${contact.status}
${isDirector ? `👨‍💼 Vendedor: ${salespersonName}` : ''}
📅 Fecha: ${new Date(contact.date || contact.createdAt).toLocaleDateString()}
⏰ Última actualización: ${contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : 'N/A'}

💬 Notas:
${contact.notes || 'Sin notas'}

💡 Tip: Arrastra la tarjeta a otra columna para cambiar el estado`);
        
    } catch (error) {
        console.error('❌ Error showing contact details:', error);
        alert(`❌ Error al mostrar detalles: ${error.message}`);
    }
}

function editContactInPipeline(contactId) {
    alert(`✏️ Funcionalidad de edición
    
Contacto ID: ${contactId}

Para editar este contacto:
1. Ve a la pestaña "Leads" 
2. Busca el contacto en la tabla
3. Usa el botón "Ver" para más opciones

O implementa la función de edición según tus necesidades.`);
}

function openWhatsAppFromPipeline(phone, name) {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Hola ${name}, te contacto desde Ciudad Bilingüe. ¿Cómo va todo?`;
    const url = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// ===== NOTIFICATIONS =====
function showStatusUpdateNotification(newStatus) {
    const statusNames = {
        'nuevo': 'Nuevo',
        'contactado': 'Contactado', 
        'interesado': 'Interesado',
        'negociacion': 'Negociación',
        'convertido': 'Convertido',
        'perdido': 'Perdido'
    };
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.innerHTML = `✅ Estado actualizado: ${statusNames[newStatus]}`;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// ===== ERROR HANDLING =====
function showPipelineError(message) {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Error en Pipeline</h3>
                <p>${message}</p>
                <button onclick="refreshPipeline()" class="btn btn-primary" style="margin-top: 1rem;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

// ===== PUBLIC FUNCTIONS =====
async function refreshPipeline() {
    console.log('🔄 Refreshing pipeline...');
    
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="loading-spinner"></div><br>Actualizando pipeline...</div>';
    }
    
    try {
        await loadPipelineData();
        renderPipeline();
        console.log('✅ Pipeline refreshed successfully');
    } catch (error) {
        console.error('❌ Error refreshing pipeline:', error);
        showPipelineError(error.message);
    }
}

function showPipelineDebug() {
    const debugInfo = `🔍 PIPELINE DEBUG INFO:

📊 Datos:
- Total contactos: ${pipelineData.length}
- Usuario: ${currentUserProfile?.name || 'No disponible'}
- Rol: ${currentUserProfile?.role || 'No disponible'}
- Es Director: ${isDirector}

📋 Distribución por estado:
${PIPELINE_STAGES.map(stage => {
    const count = pipelineData.filter(c => normalizeStatus(c.status) === stage.id).length;
    return `- ${stage.name}: ${count} contactos`;
}).join('\n')}

🔥 Firebase:
- FirebaseData disponible: ${window.FirebaseData ? 'SÍ' : 'NO'}
- Usuario autenticado: ${window.FirebaseData?.currentUser ? 'SÍ' : 'NO'}

🎯 Pipeline:
- Columnas renderizadas: ${document.querySelectorAll('.pipeline-column').length}
- Cards arrastrables: ${document.querySelectorAll('.pipeline-card[draggable="true"]').length}`;

    alert(debugInfo);
}

// ===== INITIALIZATION =====
// Auto-initialize when DOM is ready and Firebase is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    if (window.FirebaseData) {
        setTimeout(initializePipeline, 1000);
    } else {
        window.addEventListener('firebaseReady', () => {
            setTimeout(initializePipeline, 1000);
        });
    }
});

// Export functions for global access
window.refreshPipeline = refreshPipeline;
window.showPipelineDebug = showPipelineDebug;

console.log('✅ Pipeline module loaded successfully');
