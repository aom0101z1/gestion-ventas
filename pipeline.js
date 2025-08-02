// ===== WORKING PIPELINE.JS - INTEGRATES WITH YOUR FIREBASE SYSTEM =====

const PIPELINE_STAGES = {
    'Nuevo': { color: '#fbbf24', emoji: '🟡' },
    'Contactado': { color: '#3b82f6', emoji: '🔵' },
    'Interesado': { color: '#10b981', emoji: '🟢' },
    'Negociación': { color: '#f97316', emoji: '🟠' },
    'Convertido': { color: '#22c55e', emoji: '✅' },
    'Perdido': { color: '#ef4444', emoji: '❌' }
};

let pipelineData = [];
let draggedLead = null;

// ===== MAIN PIPELINE FUNCTION =====
async function loadPipelineData() {
    try {
        console.log('🎯 Loading pipeline data');
        
        const container = document.getElementById('pipelineContainer');
        if (!container) {
            console.error('❌ Pipeline container not found');
            return;
        }
        
        // Check Firebase
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            container.innerHTML = `
                <div style="text-align: center; color: #dc2626; padding: 2rem;">
                    ❌ Firebase no disponible
                </div>
            `;
            return;
        }
        
        // Get data from Firebase
        const allContacts = await window.FirebaseData.getFilteredContacts();
        pipelineData = allContacts || [];
        
        if (pipelineData.length === 0) {
            showEmptyPipeline(container);
            return;
        }
        
        // Group contacts by status
        const statusGroups = groupContactsByStatus(pipelineData);
        
        // Render pipeline
        container.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: #1f2937;">📊 Pipeline de Ventas</h3>
                <div style="display: flex; gap: 2rem; margin-bottom: 1rem; font-size: 0.9rem; color: #6b7280;">
                    <span><strong>Total:</strong> ${pipelineData.length} leads</span>
                    <span><strong>Conversiones:</strong> ${statusGroups['Convertido'].length}</span>
                    <span><strong>Tasa de conversión:</strong> ${calculateConversionRate(pipelineData)}%</span>
                    <span><strong>En proceso:</strong> ${pipelineData.length - statusGroups['Convertido'].length - statusGroups['Perdido'].length}</span>
                </div>
            </div>
            
            <div style="
                display: grid; 
                grid-template-columns: repeat(6, 1fr); 
                gap: 1rem;
                min-height: 70vh;
                padding: 0.5rem;
                background: #f8fafc;
                border-radius: 12px;
            ">
                ${Object.entries(PIPELINE_STAGES).map(([status, config]) => 
                    renderPipelineColumn(status, config, statusGroups[status])
                ).join('')}
            </div>
            
            <style>
                @keyframes slideDown {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 200px; }
                }
                
                .lead-card.compact:hover {
                    cursor: pointer !important;
                }
                
                .lead-card.compact[draggable="true"]:hover {
                    cursor: grab !important;
                }
                
                .lead-card.compact[draggable="true"]:active {
                    cursor: grabbing !important;
                }
                
                @media (max-width: 1200px) {
                    .pipeline-container {
                        grid-template-columns: repeat(3, 1fr) !important;
                    }
                }
                
                @media (max-width: 768px) {
                    .pipeline-container {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .pipeline-container {
                        grid-template-columns: 1fr !important;
                    }
                }
            </style>
        `;
        
        // Setup drag & drop
        setupDragAndDrop();
        
        console.log('✅ Pipeline loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading pipeline:', error);
        document.getElementById('pipelineContainer').innerHTML = `
            <div style="text-align: center; color: #dc2626; padding: 2rem;">
                ❌ Error: ${error.message}
            </div>
        `;
    }
}

// ===== RENDER FUNCTIONS =====
function renderPipelineColumn(status, config, leads) {
    return `
        <div class="pipeline-column" style="
            background: linear-gradient(135deg, ${config.color}15, ${config.color}05);
            border: 2px solid ${config.color}30;
            border-radius: 12px;
            overflow: hidden;
            min-height: 500px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
        ">
            <div class="pipeline-header" style="
                background: ${config.color};
                color: white;
                padding: 1rem;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            ">
                <span style="font-size: 1.1rem;">${config.emoji} ${status}</span>
                <span style="
                    background: rgba(255,255,255,0.3);
                    padding: 0.4rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: bold;
                ">${leads.length} leads</span>
            </div>
            
            <div class="pipeline-body" data-status="${status}" style="
                padding: 0.5rem;
                min-height: 400px;
                overflow-y: auto;
                flex: 1;
                background: rgba(255,255,255,0.7);
            ">
                ${leads.length > 0 ? 
                    leads.map(lead => renderCompactLeadCard(lead)).join('') : 
                    `<div style="
                        text-align: center; 
                        color: #9ca3af; 
                        padding: 3rem 1rem;
                        font-style: italic;
                    ">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">${config.emoji}</div>
                        Sin leads en esta etapa
                    </div>`
                }
            </div>
        </div>
    `;
}

function renderCompactLeadCard(lead) {
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    const isUrgent = daysOld > 7;
    
    return `
        <div class="lead-card compact" 
             draggable="true" 
             data-lead-id="${lead.id}"
             onclick="toggleLeadDetails('${lead.id}')"
             style="
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 0.75rem;
                margin-bottom: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                ${isUrgent ? 'border-left: 4px solid #ef4444;' : ''}
             "
             onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
             onmouseleave="this.style.transform=''; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
            
            <!-- Compact View (Always Visible) -->
            <div class="lead-compact-info">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4 style="margin: 0; color: #1f2937; font-size: 0.95rem; font-weight: 600;">
                        ${lead.name}
                    </h4>
                    ${isUrgent ? `<span style="
                        background: #fee2e2; 
                        color: #dc2626; 
                        padding: 0.2rem 0.4rem; 
                        border-radius: 12px; 
                        font-size: 0.7rem;
                        font-weight: 600;
                    ">🔥 ${daysOld}d</span>` : ''}
                </div>
                
                <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: #6b7280;">
                    <span>📞 ${lead.phone}</span>
                    <span>🏷️ ${(lead.source || 'No especificado').substring(0, 15)}${(lead.source || '').length > 15 ? '...' : ''}</span>
                    <span>📅 ${formatDate(lead.date)}</span>
                </div>
            </div>
            
            <!-- Expanded Details (Hidden by default) -->
            <div class="lead-details" id="details-${lead.id}" style="
                display: none;
                margin-top: 0.75rem;
                padding-top: 0.75rem;
                border-top: 1px solid #e5e7eb;
                animation: slideDown 0.3s ease;
            ">
                ${lead.email ? `
                    <div style="margin-bottom: 0.5rem; font-size: 0.85rem; color: #4b5563;">
                        📧 ${lead.email}
                    </div>
                ` : ''}
                
                ${lead.notes ? `
                    <div style="
                        background: #f9fafb;
                        padding: 0.5rem;
                        border-radius: 6px;
                        font-size: 0.8rem;
                        color: #4b5563;
                        margin-bottom: 0.75rem;
                        border-left: 3px solid #e5e7eb;
                    ">
                        💬 ${lead.notes}
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                    <button onclick="event.stopPropagation(); editLead('${lead.id}')" style="
                        padding: 0.3rem 0.6rem;
                        font-size: 0.7rem;
                        border: 1px solid #d1d5db;
                        border-radius: 5px;
                        background: white;
                        color: #374151;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                        ✏️ Editar
                    </button>
                    <button onclick="event.stopPropagation(); deleteLead('${lead.id}')" style="
                        padding: 0.3rem 0.6rem;
                        font-size: 0.7rem;
                        border: 1px solid #fca5a5;
                        border-radius: 5px;
                        background: #fee2e2;
                        color: #dc2626;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== TOGGLE LEAD DETAILS =====
function toggleLeadDetails(leadId) {
    const detailsElement = document.getElementById(`details-${leadId}`);
    if (!detailsElement) return;
    
    const isVisible = detailsElement.style.display !== 'none';
    
    if (isVisible) {
        // Hide details
        detailsElement.style.display = 'none';
    } else {
        // Show details
        detailsElement.style.display = 'block';
    }
}

// ===== DRAG & DROP SETUP =====
function setupDragAndDrop() {
    console.log('🎯 Setting up drag & drop');
    
    let dragStartTime = null;
    
    // Setup drag start
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('lead-card')) {
            dragStartTime = Date.now();
            draggedLead = e.target.dataset.leadId;
            e.target.style.opacity = '0.6';
            e.target.style.transform = 'rotate(2deg)';
            e.dataTransfer.setData('text/plain', draggedLead);
            
            // Add visual feedback to all columns
            document.querySelectorAll('.pipeline-body').forEach(body => {
                body.style.outline = '2px dashed #3b82f6';
                body.style.outlineOffset = '4px';
            });
        }
    });
    
    // Setup drag end
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('lead-card')) {
            e.target.style.opacity = '';
            e.target.style.transform = '';
            draggedLead = null;
            
            // Remove visual feedback
            document.querySelectorAll('.pipeline-body').forEach(body => {
                body.style.outline = '';
                body.style.outlineOffset = '';
                body.style.backgroundColor = '';
                body.style.border = '';
            });
        }
    });
    
    // Setup drop zones
    document.querySelectorAll('.pipeline-body').forEach(body => {
        body.addEventListener('dragover', (e) => {
            e.preventDefault();
            body.style.backgroundColor = '#e0f2fe';
            body.style.border = '2px solid #0ea5e9';
            body.style.borderRadius = '8px';
        });
        
        body.addEventListener('dragleave', (e) => {
            // Only remove styling if we're actually leaving the drop zone
            if (!body.contains(e.relatedTarget)) {
                body.style.backgroundColor = '';
                body.style.border = '';
            }
        });
        
        body.addEventListener('drop', async (e) => {
            e.preventDefault();
            body.style.backgroundColor = '';
            body.style.border = '';
            
            const newStatus = body.dataset.status;
            const leadId = e.dataTransfer.getData('text/plain') || draggedLead;
            
            // Only proceed if this was a drag operation (not a click)
            if (leadId && newStatus && dragStartTime && (Date.now() - dragStartTime > 100)) {
                await handleDrop(leadId, newStatus);
            }
            
            dragStartTime = null;
        });
    });
    
    console.log('✅ Drag & drop setup complete');
}

// ===== HANDLE DROP - CORE FUNCTION =====
async function handleDrop(leadId, newStatus) {
    try {
        console.log(`🎯 Moving lead ${leadId} to ${newStatus}`);
        
        // Find the lead
        const lead = pipelineData.find(l => l.id === leadId);
        if (!lead) {
            console.error('❌ Lead not found:', leadId);
            return;
        }
        
        const oldStatus = lead.status;
        if (oldStatus === newStatus) {
            console.log('Lead already in target status');
            return;
        }
        
        // Show loading
        if (window.showNotification) {
            window.showNotification(`🔄 Moviendo ${lead.name} a ${newStatus}...`, 'info');
        }
        
        // Update in Firebase
        const updateData = {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            updatedBy: window.FirebaseData.currentUser.email || 'unknown'
        };
        
        const success = await window.FirebaseData.updateContact(leadId, updateData);
        
        if (success !== false) {
            // Update local data
            lead.status = newStatus;
            lead.lastUpdated = updateData.lastUpdated;
            
            // Show success
            if (window.showNotification) {
                window.showNotification(`✅ ${lead.name} movido a ${newStatus}`, 'success');
            }
            
            // Reload pipeline
            setTimeout(() => loadPipelineData(), 500);
            
        } else {
            throw new Error('Firebase update failed');
        }
        
    } catch (error) {
        console.error('❌ Error moving lead:', error);
        if (window.showNotification) {
            window.showNotification(`❌ Error moviendo lead: ${error.message}`, 'error');
        }
    }
}

// ===== LEAD ACTIONS =====
async function editLead(leadId) {
    const lead = pipelineData.find(l => l.id === leadId);
    if (!lead) return;
    
    // Try to use existing edit function
    if (window.editContact) {
        window.editContact(lead);
    } else {
        // Simple edit modal
        const name = prompt('Nombre:', lead.name);
        const phone = prompt('Teléfono:', lead.phone);
        const email = prompt('Email:', lead.email || '');
        
        if (name && phone) {
            try {
                await window.FirebaseData.updateContact(leadId, {
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    lastUpdated: new Date().toISOString()
                });
                
                if (window.showNotification) {
                    window.showNotification('✅ Lead actualizado', 'success');
                }
                
                loadPipelineData();
            } catch (error) {
                if (window.showNotification) {
                    window.showNotification('❌ Error actualizando lead', 'error');
                }
            }
        }
    }
}

async function deleteLead(leadId) {
    const lead = pipelineData.find(l => l.id === leadId);
    if (!lead) return;
    
    if (!confirm(`¿Estás seguro de eliminar a ${lead.name}?`)) return;
    
    try {
        if (window.FirebaseData.deleteContact) {
            await window.FirebaseData.deleteContact(leadId);
        }
        
        // Remove from local data
        pipelineData = pipelineData.filter(l => l.id !== leadId);
        
        if (window.showNotification) {
            window.showNotification('✅ Lead eliminado', 'success');
        }
        
        loadPipelineData();
        
    } catch (error) {
        console.error('❌ Error deleting lead:', error);
        if (window.showNotification) {
            window.showNotification('❌ Error eliminando lead', 'error');
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function groupContactsByStatus(contacts) {
    const groups = {};
    Object.keys(PIPELINE_STAGES).forEach(status => {
        groups[status] = contacts.filter(c => c.status === status);
    });
    return groups;
}

function calculateConversionRate(contacts) {
    if (contacts.length === 0) return 0;
    const converted = contacts.filter(c => c.status === 'Convertido').length;
    return Math.round((converted / contacts.length) * 100);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

function showEmptyPipeline(container) {
    container.innerHTML = `
        <div style="text-align: center; color: #666; padding: 4rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
            <h3>No hay leads en el pipeline</h3>
            <p>Agrega contactos para verlos aquí</p>
            <button onclick="if(typeof switchTab === 'function') switchTab('contacts')" 
                    style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin-top: 1rem;
                    ">
                ➕ Agregar Contactos
            </button>
        </div>
    `;
}

// ===== GLOBAL EXPORTS =====
window.loadPipelineData = loadPipelineData;
window.handleDrop = handleDrop;
window.editLead = editLead;
window.deleteLead = deleteLead;
window.toggleLeadDetails = toggleLeadDetails;

// ===== AUTO-INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pipelineContainer')) {
        console.log('🚀 Pipeline module ready');
        loadPipelineData();
    }
});

console.log('✅ Working Pipeline.js loaded - integrates with your Firebase system!');
