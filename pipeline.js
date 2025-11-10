// ===== WORKING DRAG & DROP - BASED ON W3SCHOOLS PATTERN =====

async function loadPipelineData() {
    const container = document.getElementById('pipelineContainer');
    if (!container) return;

    if (!window.FirebaseData?.currentUser) {
        container.innerHTML = '<div>❌ Firebase no disponible</div>';
        return;
    }

    const allContacts = await window.FirebaseData.getFilteredContacts();
    if (!allContacts?.length) {
        container.innerHTML = '<div>No hay leads</div>';
        return;
    }

    // Agrupar leads por status
    const groups = {
        'Nuevo': allContacts.filter(c => c.status === 'Nuevo'),
        'Contactado': allContacts.filter(c => c.status === 'Contactado'),
        'Interesado': allContacts.filter(c => c.status === 'Interesado'),
        'Negociación': allContacts.filter(c => c.status === 'Negociación'),
        'Convertido': allContacts.filter(c => c.status === 'Convertido'),
        'Perdido': allContacts.filter(c => c.status === 'Perdido')
    };

    // Render grid 2x3
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1rem; height: 70vh;">
            ${Object.entries(groups).map(([status, leads]) => renderColumn(status, leads)).join('')}
        </div>
    `;
}

function renderColumn(status, leads) {
    const colors = {
        'Nuevo': '#fbbf24', 'Contactado': '#3b82f6', 'Interesado': '#10b981',
        'Negociación': '#f97316', 'Convertido': '#22c55e', 'Perdido': '#ef4444'
    };
    
    return `
        <div class="drop-zone" 
             ondrop="drop(event)" 
             ondragover="allowDrop(event)"
             data-status="${status}"
             style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
            
            <div style="background: ${colors[status]}; color: white; padding: 1rem; text-align: center; font-weight: bold;">
                ${status} (${leads.length})
            </div>
            
            <div style="padding: 0.5rem; height: calc(100% - 60px); overflow-y: auto;">
                ${leads.map(lead => `
                    <div id="lead-${lead.id}" 
                         draggable="true" 
                         ondragstart="drag(event)"
                         onclick="toggleInfo('${lead.id}')"
                         style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; 
                                padding: 0.75rem; margin-bottom: 0.5rem; cursor: pointer;">
                        
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">${lead.name}</div>
                        
                        <div id="info-${lead.id}" style="display: none; font-size: 0.8rem; color: #6c757d; margin-top: 0.5rem;">
                            <div>📞 ${lead.phone}</div>
                            ${lead.email ? `<div>📧 ${lead.email}</div>` : ''}
                            <div>🏷️ ${lead.source || 'No especificado'}</div>
                            <div>📅 ${lead.date || 'Sin fecha'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Función para permitir drop (OBLIGATORIA)
function allowDrop(ev) {
    ev.preventDefault();
}

// Función drag start (guarda el ID)
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    console.log('🎯 Drag started:', ev.target.id);
}

// Función drop (procesa el drop)
async function drop(ev) {
    ev.preventDefault();

    const leadElementId = ev.dataTransfer.getData("text");
    const leadId = leadElementId.replace('lead-', '');
    const newStatus = ev.currentTarget.dataset.status;

    console.log('🎯 Drop:', leadId, 'to', newStatus);

    try {
        // Actualizar en Firebase
        await window.FirebaseData.updateContact(leadId, {
            status: newStatus,
            lastUpdated: new Date().toISOString()
        });

        console.log('✅ Lead actualizado');

        if (window.showNotification) {
            window.showNotification(`Lead movido a ${newStatus}`, 'success');
        }

        // Recargar pipeline
        setTimeout(() => loadPipelineData(), 300);

    } catch (error) {
        console.error('❌ Error:', error);

        // Show specific error message
        let errorMessage = 'Error al mover lead';
        if (error.message && error.message.includes('administradores')) {
            errorMessage = '⚠️ Solo administradores pueden modificar leads';
        }

        if (window.showNotification) {
            window.showNotification(errorMessage, 'error');
        }

        // Reload pipeline to reset the UI
        setTimeout(() => loadPipelineData(), 300);
    }
}

// Toggle información del lead
function toggleInfo(leadId) {
    const info = document.getElementById(`info-${leadId}`);
    if (info) {
        info.style.display = info.style.display === 'none' ? 'block' : 'none';
    }
}

// Exportar funciones globalmente
window.loadPipelineData = loadPipelineData;
window.allowDrop = allowDrop;
window.drag = drag;
window.drop = drop;
window.toggleInfo = toggleInfo;
