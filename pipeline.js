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
            <div style="margin-bottom: 2rem;">
                <h3>📊 Pipeline Overview</h3>
                <div style="display: flex; gap: 2rem; margin-bottom: 1rem;">
                    <span>Total: ${pipelineData.length}</span>
                    <span>Conversiones: ${statusGroups['Convertido'].length}</span>
                    <span>Tasa: ${calculateConversionRate(pipelineData)}%</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                ${Object.entries(PIPELINE_STAGES).map(([status, config]) => 
                    renderPipelineColumn(status, config, statusGroups[status])
                ).join('')}
            </div>
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
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
            min-height: 400px;
        ">
            <div class="pipeline-header" style="
                background: ${config.color};
                color: white;
                padding: 1rem;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span>${config.emoji} ${status}</span>
                <span style="
                    background: rgba(255,255,255,0.2);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                ">${leads.length}</span>
            </div>
            
            <div class="pipeline-body" data-status="${status}" style="
                padding: 1rem;
                min-height: 300px;
            ">
                ${leads.length > 0 ? 
                    leads.map(lead => renderLeadCard(lead)).join('') : 
                    '<div style="text-align: center; color: #9ca3af; padding: 2rem;">No hay leads</div>'
                }
            </div>
        </div>
    `;
}

function renderLeadCard(lead) {
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    
    return `
        <div class="lead-card" 
             draggable="true" 
             data-lead-id="${lead.id}"
             style="
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                cursor: move;
                transition: all 0.2s;
             "
             onmouseenter="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'; this.style.transform='translateY(-1px)'"
             onmouseleave="this.style.boxShadow=''; this.style.transform=''">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <h4 style="margin: 0; color: #1f2937; font-size: 1rem;">${lead.name}</h4>
                ${daysOld > 7 ? `<span style="background: #fee2e2; color: #dc2626; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">🔥 ${daysOld}d</span>` : ''}
            </div>
            
            <div style="margin-bottom: 0.75rem;">
                <p style="margin: 0.25rem 0; font-size: 0.875rem; color: #6b7280;">📞 ${lead.phone}</p>
                ${lead.email ? `<p style="margin: 0.25rem 0; font-size: 0.875rem; color: #6b7280;">📧 ${lead.email}</p>` : ''}
                <p style="margin: 0.25rem 0; font-size: 0.875rem; color: #6b7280;">🏷️ ${lead.source || 'No especificado'}</p>
                <p style="margin: 0.25rem 0; font-size: 0.875rem; color: #6b7280;">📅 ${formatDate(lead.date)}</p>
            </div>
            
            ${lead.notes ? `
                <div style="
                    background: #f9fafb;
                    padding: 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    color: #4b5563;
                    margin-bottom: 0.75rem;
                    border-left: 3px solid #e5e7eb;
                ">${lead.notes}</div>
            ` : ''}
            
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button onclick="editLead('${lead.id}')" style="
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    background: white;
                    color: #374151;
                    cursor: pointer;
                ">Editar</button>
                <button onclick="deleteLead('${lead.id}')" style="
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    border: 1px solid #fca5a5;
                    border-radius: 4px;
                    background: #fee2e2;
                    color: #dc2626;
                    cursor: pointer;
                ">Eliminar</button>
            </div>
        </div>
    `;
}

// ===== DRAG & DROP SETUP =====
function setupDragAndDrop() {
    console.log('🎯 Setting up drag & drop');
    
    // Setup drag start
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('lead-card')) {
            draggedLead = e.target.dataset.leadId;
            e.target.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', draggedLead);
        }
    });
    
    // Setup drag end
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('lead-card')) {
            e.target.style.opacity = '';
            draggedLead = null;
        }
    });
    
    // Setup drop zones
    document.querySelectorAll('.pipeline-body').forEach(body => {
        body.addEventListener('dragover', (e) => {
            e.preventDefault();
            body.style.backgroundColor = '#f0f9ff';
            body.style.border = '2px dashed #3b82f6';
        });
        
        body.addEventListener('dragleave', (e) => {
            body.style.backgroundColor = '';
            body.style.border = '';
        });
        
        body.addEventListener('drop', async (e) => {
            e.preventDefault();
            body.style.backgroundColor = '';
            body.style.border = '';
            
            const newStatus = body.dataset.status;
            const leadId = e.dataTransfer.getData('text/plain') || draggedLead;
            
            if (leadId && newStatus) {
                await handleDrop(leadId, newStatus);
            }
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

// ===== AUTO-INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pipelineContainer')) {
        console.log('🚀 Pipeline module ready');
        loadPipelineData();
    }
});

console.log('✅ Working Pipeline.js loaded - integrates with your Firebase system!');
