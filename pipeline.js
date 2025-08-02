// ===== DRAG AND DROP PIPELINE - CÓDIGO MÍNIMO QUE FUNCIONA =====

async function loadPipelineData() {
    try {
        const container = document.getElementById('pipelineContainer');
        if (!container) return;
        
        if (!window.FirebaseData?.currentUser) {
            container.innerHTML = '<div>❌ Firebase no disponible</div>';
            return;
        }
        
        const allContacts = await window.FirebaseData.getFilteredContacts();
        if (!allContacts || allContacts.length === 0) {
            container.innerHTML = '<div>No hay leads</div>';
            return;
        }
        
        // Agrupar por status
        const groups = {
            'Nuevo': allContacts.filter(c => c.status === 'Nuevo'),
            'Contactado': allContacts.filter(c => c.status === 'Contactado'),
            'Interesado': allContacts.filter(c => c.status === 'Interesado'),
            'Negociación': allContacts.filter(c => c.status === 'Negociación'),
            'Convertido': allContacts.filter(c => c.status === 'Convertido'),
            'Perdido': allContacts.filter(c => c.status === 'Perdido')
        };
        
        // Render 2 filas x 3 columnas
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1rem; height: 80vh;">
                ${renderColumn('Nuevo', groups['Nuevo'], '#fbbf24')}
                ${renderColumn('Contactado', groups['Contactado'], '#3b82f6')}
                ${renderColumn('Interesado', groups['Interesado'], '#10b981')}
                ${renderColumn('Negociación', groups['Negociación'], '#f97316')}
                ${renderColumn('Convertido', groups['Convertido'], '#22c55e')}
                ${renderColumn('Perdido', groups['Perdido'], '#ef4444')}
            </div>
        `;
        
        // Setup drag and drop
        setupDragDrop();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderColumn(status, leads, color) {
    return `
        <div class="drop-zone" data-status="${status}" style="
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        ">
            <div style="
                background: ${color};
                color: white;
                padding: 1rem;
                font-weight: bold;
                text-align: center;
            ">
                ${status} (${leads.length})
            </div>
            
            <div style="padding: 0.5rem; height: calc(100% - 60px); overflow-y: auto;">
                ${leads.map(lead => `
                    <div class="lead-item" draggable="true" data-id="${lead.id}" style="
                        background: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 6px;
                        padding: 0.75rem;
                        margin-bottom: 0.5rem;
                        cursor: move;
                    ">
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">${lead.name}</div>
                        <div style="font-size: 0.8rem; color: #6c757d;">${lead.phone}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function setupDragDrop() {
    let draggedElement = null;
    
    // Drag start
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('lead-item')) {
            draggedElement = e.target;
            e.target.style.opacity = '0.5';
        }
    });
    
    // Drag end
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('lead-item')) {
            e.target.style.opacity = '1';
            draggedElement = null;
        }
    });
    
    // Drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.backgroundColor = '#e3f2fd';
        });
        
        zone.addEventListener('dragleave', () => {
            zone.style.backgroundColor = '';
        });
        
        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.style.backgroundColor = '';
            
            if (!draggedElement) return;
            
            const leadId = draggedElement.dataset.id;
            const newStatus = zone.dataset.status;
            
            // Actualizar en Firebase
            try {
                await window.FirebaseData.updateContact(leadId, { status: newStatus });
                
                // Mostrar notificación si existe
                if (window.showNotification) {
                    window.showNotification(`Lead movido a ${newStatus}`, 'success');
                }
                
                // Recargar pipeline
                setTimeout(() => loadPipelineData(), 500);
                
            } catch (error) {
                console.error('Error updating:', error);
                if (window.showNotification) {
                    window.showNotification('Error al mover lead', 'error');
                }
            }
        });
    });
}

// Hacer función global
window.loadPipelineData = loadPipelineData;
