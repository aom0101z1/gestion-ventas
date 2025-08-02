// ===== PIPELINE CON DRAG & DROP QUE FUNCIONA + DETALLES COLAPSABLES =====

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
        
        // Render pipeline con colores correctos
        container.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3>📊 Pipeline Overview</h3>
                <div>Total: ${allContacts.length} | Conversiones: ${groups['Convertido'].length} | Activos: ${allContacts.length - groups['Convertido'].length - groups['Perdido'].length}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1rem; height: 70vh;">
                ${renderColumn('Nuevo', groups['Nuevo'], '#fbbf24', '🟡')}
                ${renderColumn('Contactado', groups['Contactado'], '#3b82f6', '🔵')}
                ${renderColumn('Interesado', groups['Interesado'], '#10b981', '🟢')}
                ${renderColumn('Negociación', groups['Negociación'], '#f97316', '🟠')}
                ${renderColumn('Convertido', groups['Convertido'], '#22c55e', '✅')}
                ${renderColumn('Perdido', groups['Perdido'], '#ef4444', '❌')}
            </div>
        `;
        
        // Setup drag and drop DESPUÉS de que el DOM esté listo
        setTimeout(() => {
            setupDragDrop();
            console.log('✅ Drag & Drop configurado');
        }, 100);
        
    } catch (error) {
        console.error('Error cargando pipeline:', error);
    }
}

function renderColumn(status, leads, color, emoji) {
    return `
        <div class="pipeline-column" 
             ondrop="handleDrop(event)" 
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)"
             data-status="${status}" 
             style="
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                border: 2px solid transparent;
             ">
            <div style="
                background: ${color};
                color: white;
                padding: 1rem;
                font-weight: bold;
                text-align: center;
            ">
                ${emoji} ${status} <span style="background: rgba(255,255,255,0.3); padding: 0.2rem 0.5rem; border-radius: 10px; margin-left: 0.5rem;">${leads.length}</span>
            </div>
            
            <div style="padding: 0.5rem; height: calc(100% - 70px); overflow-y: auto;">
                ${leads.map(lead => renderLeadCard(lead)).join('')}
                ${leads.length === 0 ? `<div style="text-align: center; color: #999; padding: 2rem; font-style: italic;">Sin leads<br>en esta etapa</div>` : ''}
            </div>
        </div>
    `;
}

function renderLeadCard(lead) {
    return `
        <div class="lead-card" 
             draggable="true" 
             data-lead-id="${lead.id}" 
             onclick="toggleDetails('${lead.id}')"
             style="
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 0.75rem;
                margin-bottom: 0.5rem;
                cursor: pointer;
                transition: all 0.2s ease;
             "
             onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'"
             onmouseout="this.style.transform=''; this.style.boxShadow=''">
            
            <!-- Info siempre visible -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 600; font-size: 0.9rem;">${lead.name}</div>
                <div style="color: #6c757d; font-size: 0.8rem;">📞</div>
            </div>
            
            <!-- Detalles colapsables -->
            <div id="details-${lead.id}" style="display: none; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #dee2e6;">
                <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.3rem;">📞 ${lead.phone}</div>
                ${lead.email ? `<div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.3rem;">📧 ${lead.email}</div>` : ''}
                <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.3rem;">🏷️ ${lead.source || 'No especificado'}</div>
                <div style="font-size: 0.8rem; color: #6c757d;">📅 ${lead.date || 'Sin fecha'}</div>
                ${lead.notes ? `<div style="font-size: 0.8rem; color: #6c757d; margin-top: 0.3rem; padding: 0.3rem; background: #f1f3f4; border-radius: 4px;">💬 ${lead.notes}</div>` : ''}
            </div>
        </div>
    `;
}

// Función para expandir/colapsar detalles
function toggleDetails(leadId) {
    const details = document.getElementById(`details-${leadId}`);
    if (details) {
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
    }
}

// Setup drag and drop que SÍ funciona
function setupDragDrop() {
    // Variables globales para drag & drop
    let draggedElement = null;
    
    // Limpiar eventos anteriores
    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('dragend', handleDragEnd);
    
    // Agregar eventos
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    
    function handleDragStart(e) {
        if (e.target.classList.contains('lead-card')) {
            draggedElement = e.target;
            e.target.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.outerHTML);
            console.log('🎯 Drag iniciado:', e.target.dataset.leadId);
        }
    }
    
    function handleDragEnd(e) {
        if (e.target.classList.contains('lead-card')) {
            e.target.style.opacity = '1';
            draggedElement = null;
        }
    }
}

// Handlers para drop zones
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.style.borderColor = '#007bff';
    e.currentTarget.style.backgroundColor = '#f8f9ff';
}

function handleDragLeave(e) {
    e.currentTarget.style.borderColor = 'transparent';
    e.currentTarget.style.backgroundColor = '';
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'transparent';
    e.currentTarget.style.backgroundColor = '';
    
    const dropZone = e.currentTarget;
    const newStatus = dropZone.dataset.status;
    
    // Buscar el lead card arrastrado
    const leadCard = document.querySelector('.lead-card[style*="opacity: 0.5"]');
    if (!leadCard) return;
    
    const leadId = leadCard.dataset.leadId;
    
    console.log(`🎯 Drop: Moving lead ${leadId} to ${newStatus}`);
    
    try {
        // Actualizar en Firebase
        const success = await window.FirebaseData.updateContact(leadId, { 
            status: newStatus,
            lastUpdated: new Date().toISOString()
        });
        
        if (success !== false) {
            console.log('✅ Lead actualizado en Firebase');
            
            // Mostrar notificación
            if (window.showNotification) {
                window.showNotification(`Lead movido a ${newStatus}`, 'success');
            }
            
            // Recargar pipeline
            setTimeout(() => loadPipelineData(), 300);
        }
        
    } catch (error) {
        console.error('❌ Error actualizando lead:', error);
        if (window.showNotification) {
            window.showNotification('Error al mover lead', 'error');
        }
    }
}

// Exportar funciones globales
window.loadPipelineData = loadPipelineData;
window.toggleDetails = toggleDetails;
window.handleDrop = handleDrop;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
