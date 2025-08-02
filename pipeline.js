// ===== PIPELINE.JS - CLEAN & FUNCTIONAL =====

const PIPELINE_STAGES = {
    'Nuevo': { color: '#3b82f6', icon: '👤', targetDays: 1 },
    'Contactado': { color: '#10b981', icon: '📞', targetDays: 3 },
    'Calificado': { color: '#f59e0b', icon: '✅', targetDays: 5 },
    'Propuesta': { color: '#8b5cf6', icon: '📋', targetDays: 7 },
    'Negociación': { color: '#ef4444', icon: '🤝', targetDays: 10 },
    'Convertido': { color: '#059669', icon: '🎉', targetDays: null },
    'Perdido': { color: '#6b7280', icon: '❌', targetDays: null }
};

let pipelineData = [];
let draggedLead = null;

// ===== INITIALIZATION =====
async function loadPipelineData() {
    try {
        console.log('🎯 Loading pipeline data');
        
        const container = document.getElementById('pipelineContainer');
        if (!container) {
            console.error('❌ Pipeline container not found');
            return;
        }
        
        showLoading();
        
        // Load data from Firebase
        if (window.FirebaseData?.getFilteredContacts) {
            pipelineData = await window.FirebaseData.getFilteredContacts() || [];
            pipelineData = validateData(pipelineData);
        } else {
            pipelineData = [];
        }
        
        renderPipeline();
        setupEventListeners();
        
        console.log('✅ Pipeline loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading pipeline:', error);
        showError(`Error loading pipeline: ${error.message}`);
    }
}

// ===== DATA VALIDATION =====
function validateData(data) {
    return data.map(contact => ({
        id: contact.id || `temp_${Date.now()}_${Math.random()}`,
        name: contact.name || 'Sin nombre',
        phone: contact.phone || 'Sin teléfono',
        email: contact.email || '',
        source: contact.source || 'No especificado',
        status: PIPELINE_STAGES[contact.status] ? contact.status : 'Nuevo',
        date: contact.date || new Date().toISOString(),
        notes: contact.notes || '',
        lastUpdated: contact.lastUpdated || new Date().toISOString()
    })).filter(contact => contact.id && (contact.name || contact.phone));
}

// ===== RENDERING =====
function renderPipeline() {
    const container = document.getElementById('pipelineContainer');
    if (!container) return;
    
    const statusGroups = groupByStatus(pipelineData);
    
    container.innerHTML = `
        <div class="pipeline-summary">
            <h3>Pipeline Overview</h3>
            <div class="stats">
                <span>Total Leads: ${pipelineData.length}</span>
                <span>Conversion Rate: ${calculateConversionRate()}%</span>
            </div>
        </div>
        
        <div class="pipeline-grid">
            ${Object.entries(PIPELINE_STAGES).map(([status, config]) => 
                renderColumn(status, config, statusGroups[status] || [])
            ).join('')}
        </div>
    `;
}

function renderColumn(status, config, leads) {
    return `
        <div class="pipeline-column" data-status="${status}">
            <div class="pipeline-header" style="background: ${config.color}">
                <span>${config.icon} ${status}</span>
                <span class="count">${leads.length}</span>
            </div>
            
            <div class="pipeline-body" data-status="${status}">
                ${leads.map(lead => renderLeadCard(lead)).join('')}
                ${leads.length === 0 ? '<div class="empty-message">No leads</div>' : ''}
            </div>
        </div>
    `;
}

function renderLeadCard(lead) {
    const priority = calculatePriority(lead);
    const daysInStage = getDaysInStage(lead);
    
    return `
        <div class="lead-card" 
             draggable="true" 
             data-lead-id="${lead.id}"
             data-priority="${priority}">
            
            <div class="lead-header">
                <h4>${lead.name}</h4>
                <span class="priority priority-${priority}">${priority}</span>
            </div>
            
            <div class="lead-info">
                <p>📞 ${lead.phone}</p>
                ${lead.email ? `<p>📧 ${lead.email}</p>` : ''}
                <p>📅 ${daysInStage} days in stage</p>
                <p>🏷️ ${lead.source}</p>
            </div>
            
            ${lead.notes ? `<div class="lead-notes">${lead.notes}</div>` : ''}
            
            <div class="lead-actions">
                <button onclick="editLead('${lead.id}')" class="btn-small">Edit</button>
                <button onclick="deleteLead('${lead.id}')" class="btn-small btn-danger">Delete</button>
            </div>
        </div>
    `;
}

// ===== DRAG & DROP =====
function setupEventListeners() {
    // Drag start
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('lead-card')) {
            draggedLead = e.target.dataset.leadId;
            e.target.style.opacity = '0.5';
            e.dataTransfer.setData('text/plain', draggedLead);
        }
    });
    
    // Drag end
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('lead-card')) {
            e.target.style.opacity = '';
            draggedLead = null;
        }
    });
    
    // Drop zones
    document.querySelectorAll('.pipeline-body').forEach(body => {
        body.addEventListener('dragover', (e) => {
            e.preventDefault();
            body.classList.add('drag-over');
        });
        
        body.addEventListener('dragleave', () => {
            body.classList.remove('drag-over');
        });
        
        body.addEventListener('drop', async (e) => {
            e.preventDefault();
            body.classList.remove('drag-over');
            
            const newStatus = body.dataset.status;
            const leadId = e.dataTransfer.getData('text/plain') || draggedLead;
            
            if (leadId && newStatus) {
                await moveLeadToStatus(leadId, newStatus);
            }
        });
    });
    
    console.log('✅ Event listeners setup complete');
}

async function moveLeadToStatus(leadId, newStatus) {
    try {
        console.log(`🎯 Moving lead ${leadId} to ${newStatus}`);
        
        // Find and update the lead
        const lead = pipelineData.find(l => l.id === leadId);
        if (!lead) {
            console.error('❌ Lead not found:', leadId);
            return;
        }
        
        const oldStatus = lead.status;
        lead.status = newStatus;
        lead.lastUpdated = new Date().toISOString();
        
        // Update in Firebase
        if (window.FirebaseData?.updateContact) {
            await window.FirebaseData.updateContact(leadId, { status: newStatus, lastUpdated: lead.lastUpdated });
        }
        
        // Re-render pipeline
        renderPipeline();
        setupEventListeners();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(`✅ Moved ${lead.name} from ${oldStatus} to ${newStatus}`, 'success');
        }
        
        console.log('✅ Lead moved successfully');
        
    } catch (error) {
        console.error('❌ Error moving lead:', error);
        if (window.showNotification) {
            window.showNotification('❌ Error moving lead', 'error');
        }
    }
}

// ===== LEAD ACTIONS =====
async function editLead(leadId) {
    const lead = pipelineData.find(l => l.id === leadId);
    if (!lead) return;
    
    if (window.editContact) {
        window.editContact(lead);
    } else {
        console.log('Edit function not available');
    }
}

async function deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
        // Delete from Firebase
        if (window.FirebaseData?.deleteContact) {
            await window.FirebaseData.deleteContact(leadId);
        }
        
        // Remove from local data
        pipelineData = pipelineData.filter(l => l.id !== leadId);
        
        // Re-render
        renderPipeline();
        setupEventListeners();
        
        if (window.showNotification) {
            window.showNotification('✅ Lead deleted', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error deleting lead:', error);
        if (window.showNotification) {
            window.showNotification('❌ Error deleting lead', 'error');
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function groupByStatus(contacts) {
    const groups = {};
    Object.keys(PIPELINE_STAGES).forEach(stage => {
        groups[stage] = contacts.filter(c => c.status === stage);
    });
    return groups;
}

function calculatePriority(lead) {
    const daysInStage = getDaysInStage(lead);
    const targetDays = PIPELINE_STAGES[lead.status]?.targetDays;
    
    if (!targetDays) return 'low';
    if (daysInStage > targetDays * 1.5) return 'high';
    if (daysInStage > targetDays) return 'medium';
    return 'low';
}

function getDaysInStage(lead) {
    const lastUpdate = new Date(lead.lastUpdated);
    const now = new Date();
    return Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
}

function calculateConversionRate() {
    if (pipelineData.length === 0) return 0;
    const converted = pipelineData.filter(l => l.status === 'Convertido').length;
    return Math.round((converted / pipelineData.length) * 100);
}

// ===== UI HELPERS =====
function showLoading() {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = '<div class="loading">Loading pipeline...</div>';
    }
}

function showError(message) {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `<div class="error">❌ ${message}</div>`;
    }
}

// ===== GLOBAL EXPORTS =====
window.loadPipelineData = loadPipelineData;
window.moveLeadToStatus = moveLeadToStatus;
window.editLead = editLead;
window.deleteLead = deleteLead;

// ===== AUTO-INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pipelineContainer')) {
        loadPipelineData();
    }
});

console.log('✅ Clean Pipeline.js loaded - Under 500 lines!');
