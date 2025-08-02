// ===== CÓDIGO MÍNIMO QUE FUNCIONA - USA TU handleDrop EXISTENTE =====

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
    
    // Agrupar por status
    const groups = {
        'Nuevo': allContacts.filter(c => c.status === 'Nuevo'),
        'Contactado': allContacts.filter(c => c.status === 'Contactado'), 
        'Interesado': allContacts.filter(c => c.status === 'Interesado'),
        'Negociación': allContacts.filter(c => c.status === 'Negociación'),
        'Convertido': allContacts.filter(c => c.status === 'Convertido'),
        'Perdido': allContacts.filter(c => c.status === 'Perdido')
    };
    
    // Grid 2x3
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1rem; height: 70vh;">
            ${renderColumn('Nuevo', groups['Nuevo'], '#fbbf24', '🟡')}
            ${renderColumn('Contactado', groups['Contactado'], '#3b82f6', '🔵')}
            ${renderColumn('Interesado', groups['Interesado'], '#10b981', '🟢')}
            ${renderColumn('Negociación', groups['Negociación'], '#f97316', '🟠')}
            ${renderColumn('Convertido', groups['Convertido'], '#22c55e', '✅')}
            ${renderColumn('Perdido', groups['Perdido'], '#ef4444', '❌')}
        </div>
    `;
    
    // CLAVE: Configurar drag & drop después del render
    setTimeout(setupDragDrop, 100);
}

function renderColumn(status, leads, color, emoji) {
    return `
        <div class="pipeline-column" data-status="${status}" style="
            background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden; border: 2px solid transparent;
        ">
            <div style="background: ${color}; color: white; padding: 1rem; text-align: center; font-weight: bold;">
                ${emoji} ${status} (${leads.length})
            </div>
            <div class="pipeline-body" data-status="${status}" style="padding: 0.5rem; height: calc(100% - 60px); overflow-y: auto;">
                ${leads.map(lead => `
                    <div class="lead-card" draggable="true" data-lead-id="${lead.id}" 
                         onclick="toggleDetails('${lead.id}')" style="
                        background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;
                        padding: 0.75rem; margin-bottom: 0.5rem; cursor: pointer;
                    ">
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">${lead.name}</div>
                        <div id="details-${lead.id}" style="display: none; font-size: 0.8rem; color: #6c757d;">
                            <div>📞 ${lead.phone}</div>
                            ${lead.email ? `<div>📧 ${lead.email}</div>` : ''}
                            <div>🏷️ ${lead.source || 'No especificado'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function toggleDetails(leadId) {
    const details = document.getElementById(`details-${leadId}`);
    if (details) {
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
    }
}

function setupDragDrop() {
    // Limpiar eventos anteriores
    document.querySelectorAll('.lead-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            window.draggedLead = e.target.dataset.leadId;
            e.target.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', window.draggedLead);
        });
        
        card.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
            window.draggedLead = null;
        });
    });
    
    // Drop zones
    document.querySelectorAll('.pipeline-body').forEach(body => {
        body.addEventListener('dragover', (e) => {
            e.preventDefault();
            body.style.backgroundColor = '#e3f2fd';
        });
        
        body.addEventListener('dragleave', () => {
            body.style.backgroundColor = '';
        });
        
        // USA TU handleDrop EXISTENTE
        body.addEventListener('drop', (e) => {
            e.preventDefault();
            body.style.backgroundColor = '';
            
            const newStatus = body.dataset.status;
            if (window.handleDrop && window.draggedLead) {
                window.handleDrop(e, newStatus);
            }
        });
    });
    
    console.log('✅ Drag & Drop configurado');
}

// Exportar
window.loadPipelineData = loadPipelineData;
window.toggleDetails = toggleDetails;
