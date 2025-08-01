// pipeline.js - PIPELINE MANAGEMENT MODULE - COMPLETE VERSION
// ===== SALES PIPELINE AND LEAD MANAGEMENT =====

// Global variables for pipeline module
let pipelineData = [];
let pipelineInitialized = false;
let draggedLead = null;
let pipelineStats = {};

// Pipeline configuration
const PIPELINE_STAGES = {
    'Nuevo': { 
        color: '#fbbf24', 
        emoji: '🟡', 
        description: 'Leads recién ingresados',
        order: 1
    },
    'Contactado': { 
        color: '#3b82f6', 
        emoji: '🔵', 
        description: 'Primer contacto realizado',
        order: 2
    },
    'Interesado': { 
        color: '#10b981', 
        emoji: '🟢', 
        description: 'Mostraron interés en el servicio',
        order: 3
    },
    'Negociación': { 
        color: '#f97316', 
        emoji: '🟠', 
        description: 'En proceso de negociación',
        order: 4
    },
    'Convertido': { 
        color: '#22c55e', 
        emoji: '✅', 
        description: 'Clientes convertidos exitosamente',
        order: 5
    },
    'Perdido': { 
        color: '#ef4444', 
        emoji: '❌', 
        description: 'Leads perdidos o no interesados',
        order: 6
    }
};

// ===== MAIN PIPELINE LOADING FUNCTION =====
async function loadPipelineData() {
    try {
        console.log('🎯 Loading pipeline data');
        
        const container = document.getElementById('pipelineContainer');
        if (!container) {
            console.error('❌ Pipeline container not found');
            return;
        }
        
        // Show loading state
        showPipelineLoading();
        
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            showPipelineError('Firebase no disponible');
            return;
        }
        
        // Load contacts from Firebase
        const allContacts = await window.FirebaseData.getFilteredContacts();
        pipelineData = allContacts;
        
        if (allContacts.length === 0) {
            showEmptyPipeline();
            return;
        }
        
        // Calculate pipeline statistics
        calculatePipelineStats(allContacts);
        
        // Render pipeline view
        renderPipelineView(allContacts);
        
        // Initialize drag and drop if supported
        initializeDragAndDrop();
        
        console.log('✅ Pipeline data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading pipeline data:', error);
        showPipelineError(`Error cargando pipeline: ${error.message}`);
    }
}

// ===== PIPELINE RENDERING =====
function renderPipelineView(contacts) {
    const container = document.getElementById('pipelineContainer');
    if (!container) return;
    
    // Group contacts by status
    const statusGroups = groupContactsByStatus(contacts);
    
    container.innerHTML = `
        <div class="pipeline-grid" style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        ">
            ${Object.entries(PIPELINE_STAGES).map(([status, config]) => 
                renderPipelineColumn(status, config, statusGroups[status] || [])
            ).join('')}
        </div>
        
        ${renderPipelineSummary(contacts)}
        
        ${renderPipelineControls()}
    `;
    
    // Add event listeners after rendering
    setupPipelineEventListeners();
}

function renderPipelineColumn(status, config, leads) {
    const leadCount = leads.length;
    
    return `
        <div class="pipeline-column" 
             data-status="${status}"
             style="
                 background: white;
                 border-radius: 12px;
                 box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                 overflow: hidden;
                 border-top: 4px solid ${config.color};
                 min-height: 400px;
                 transition: all 0.3s ease;
             "
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event, '${status}')">
            
            <!-- Column Header -->
            <div class="pipeline-header" style="
                background: ${config.color}15;
                padding: 1.25rem;
                text-align: center;
                border-bottom: 1px solid #e5e7eb;
            ">
                <div style="
                    font-size: 1.3rem;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: #374151;
                ">
                    ${config.emoji} ${status}
                </div>
                <div style="
                    background: ${config.color};
                    color: white;
                    display: inline-block;
                    padding: 0.4rem 1rem;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-bottom: 0.5rem;
                ">
                    ${leadCount} leads
                </div>
                <div style="
                    font-size: 0.8rem;
                    color: #6b7280;
                    line-height: 1.3;
                ">
                    ${config.description}
                </div>
            </div>
            
            <!-- Column Body -->
            <div class="pipeline-body" style="
                padding: 1rem;
                max-height: 450px;
                overflow-y: auto;
                min-height: 300px;
            ">
                ${leadCount === 0 ? renderEmptyColumn(status, config.color) : leads.map(lead => renderLeadCard(lead, config.color)).join('')}
            </div>
            
            <!-- Column Footer -->
            <div style="
                padding: 0.75rem 1rem;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
                text-align: center;
            ">
                <button onclick="addNewLeadToStage('${status}')" 
                        class="add-lead-btn"
                        style="
                            background: ${config.color};
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 6px;
                            font-size: 0.8rem;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.opacity='0.8'"
                        onmouseout="this.style.opacity='1'">
                    ➕ Agregar Lead
                </button>
            </div>
        </div>
    `;
}

function renderLeadCard(lead, stageColor) {
    const priorityColor = getPriorityColor(lead.priority || 'Medium');
    const sourceIcon = getSourceIcon(lead.source);
    const timeAgo = getTimeAgo(lead.date, lead.time);
    
    return `
        <div class="lead-card" 
             data-lead-id="${lead.id}"
             draggable="true"
             style="
                 background: #f9fafb;
                 border: 1px solid #e5e7eb;
                 border-radius: 8px;
                 padding: 1rem;
                 margin-bottom: 0.75rem;
                 cursor: pointer;
                 transition: all 0.2s ease;
                 position: relative;
                 border-left: 3px solid ${priorityColor};
             "
             onclick="showLeadDetails('${lead.id}')"
             ondragstart="handleDragStart(event, '${lead.id}')"
             onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)'; this.style.transform='translateY(-2px)'"
             onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
            
            <!-- Lead Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div style="flex: 1; min-width: 0;">
                    <div style="
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 0.25rem;
                        font-size: 0.95rem;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    " title="${lead.name || 'Sin nombre'}">
                        ${lead.name || 'Sin nombre'}
                    </div>
                    <div style="
                        font-size: 0.8rem;
                        color: #6b7280;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    ">
                        ${sourceIcon} ${(lead.source || 'No especificado').length > 20 ? (lead.source || 'No especificado').substring(0, 20) + '...' : (lead.source || 'No especificado')}
                    </div>
                </div>
                <div style="
                    background: ${priorityColor};
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-top: 0.25rem;
                " title="Prioridad: ${lead.priority || 'Medium'}"></div>
            </div>
            
            <!-- Lead Details -->
            <div style="margin-bottom: 0.75rem;">
                <div style="
                    font-size: 0.85rem;
                    color: #10b981;
                    margin-bottom: 0.25rem;
                    font-weight: 500;
                ">
                    📞 ${lead.phone || 'Sin teléfono'}
                </div>
                ${lead.email ? `
                    <div style="
                        font-size: 0.8rem;
                        color: #6b7280;
                        margin-bottom: 0.25rem;
                    ">
                        ✉️ ${lead.email}
                    </div>
                ` : ''}
                <div style="
                    font-size: 0.8rem;
                    color: #6b7280;
                ">
                    📍 ${lead.location || 'Sin ubicación'}
                </div>
            </div>
            
            <!-- Lead Score and Time -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.75rem;
                color: #6b7280;
            ">
                <div style="
                    background: ${stageColor}20;
                    color: ${stageColor};
                    padding: 0.2rem 0.5rem;
                    border-radius: 12px;
                    font-weight: 500;
                ">
                    🎯 ${lead.score || 50}/100
                </div>
                <div>
                    ⏰ ${timeAgo}
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div style="
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                opacity: 0;
                transition: opacity 0.2s ease;
                display: flex;
                gap: 0.25rem;
            " class="quick-actions">
                <button onclick="event.stopPropagation(); openWhatsApp('${lead.phone}', '${lead.name}')" 
                        style="
                            background: #25d366;
                            border: none;
                            border-radius: 4px;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            font-size: 0.7rem;
                        " title="WhatsApp">
                    💬
                </button>
                <button onclick="event.stopPropagation(); editLeadQuick('${lead.id}')" 
                        style="
                            background: #3b82f6;
                            border: none;
                            border-radius: 4px;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            font-size: 0.7rem;
                            color: white;
                        " title="Editar">
                    ✏️
                </button>
            </div>
        </div>
        
        <style>
            .lead-card:hover .quick-actions {
                opacity: 1 !important;
            }
        </style>
    `;
}

function renderEmptyColumn(status, color) {
    return `
        <div style="
            text-align: center;
            color: #6b7280;
            padding: 3rem 1rem;
            border: 2px dashed #e5e7eb;
            border-radius: 8px;
            margin: 1rem 0;
        ">
            <div style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;">
                ${PIPELINE_STAGES[status].emoji}
            </div>
            <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">
                No hay leads en esta etapa
            </div>
            <div style="font-size: 0.8rem; opacity: 0.7;">
                Arrastra leads aquí o agrega nuevos
            </div>
        </div>
    `;
}

function renderPipelineSummary(contacts) {
    const conversionRate = contacts.length > 0 ? 
        ((contacts.filter(c => c.status === 'Convertido').length / contacts.length) * 100).toFixed(1) : 0;
    
    const averageScore = contacts.length > 0 ? 
        (contacts.reduce((sum, c) => sum + (c.score || 50), 0) / contacts.length).toFixed(1) : 50;
    
    const activeLeads = contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length;
    
    return `
        <div class="pipeline-summary" style="
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
        ">
            <h3 style="
                margin: 0 0 1.5rem 0;
                color: #374151;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            ">
                📊 Resumen del Pipeline
                <span style="
                    background: #f3f4f6;
                    color: #6b7280;
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: normal;
                ">
                    Actualizado ahora
                </span>
            </h3>
            
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
            ">
                <div class="summary-card" style="
                    text-align: center;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #3b82f6, #1e40af);
                    color: white;
                    border-radius: 12px;
                ">
                    <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${contacts.length}
                    </div>
                    <div style="opacity: 0.9;">Total Leads</div>
                </div>
                
                <div class="summary-card" style="
                    text-align: center;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border-radius: 12px;
                ">
                    <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${contacts.filter(c => c.status === 'Convertido').length}
                    </div>
                    <div style="opacity: 0.9;">Convertidos</div>
                </div>
                
                <div class="summary-card" style="
                    text-align: center;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    border-radius: 12px;
                ">
                    <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${conversionRate}%
                    </div>
                    <div style="opacity: 0.9;">Tasa Conversión</div>
                </div>
                
                <div class="summary-card" style="
                    text-align: center;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    color: white;
                    border-radius: 12px;
                ">
                    <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${activeLeads}
                    </div>
                    <div style="opacity: 0.9;">Leads Activos</div>
                </div>
            </div>
            
            <!-- Pipeline Health Indicator -->
            <div style="
                margin-top: 2rem;
                padding: 1rem;
                background: ${getPipelineHealthColor(conversionRate)}15;
                border-left: 4px solid ${getPipelineHealthColor(conversionRate)};
                border-radius: 8px;
            ">
                <div style="
                    font-weight: 600;
                    color: ${getPipelineHealthColor(conversionRate)};
                    margin-bottom: 0.5rem;
                ">
                    ${getPipelineHealthStatus(conversionRate)}
                </div>
                <div style="
                    font-size: 0.9rem;
                    color: #374151;
                    line-height: 1.4;
                ">
                    ${getPipelineHealthMessage(conversionRate, activeLeads)}
                </div>
            </div>
        </div>
    `;
}

function renderPipelineControls() {
    return `
        <div class="pipeline-controls" style="
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        ">
            <div style="display: flex; gap: 1rem; align-items: center;">
                <button onclick="refreshPipeline()" 
                        class="btn btn-primary"
                        style="padding: 0.75rem 1.5rem;">
                    🔄 Actualizar Pipeline
                </button>
                
                <button onclick="showPipelineFilters()" 
                        class="btn btn-secondary"
                        style="padding: 0.75rem 1.5rem;">
                    🔍 Filtros
                </button>
                
                <button onclick="exportPipelineData()" 
                        class="btn btn-success"
                        style="padding: 0.75rem 1.5rem;">
                    📥 Exportar
                </button>
            </div>
            
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <span style="font-size: 0.9rem; color: #6b7280;">Vista:</span>
                <button onclick="togglePipelineView('kanban')" 
                        class="view-toggle active"
                        style="
                            padding: 0.5rem 1rem;
                            border: 1px solid #e5e7eb;
                            background: #3b82f6;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                    📋 Kanban
                </button>
                <button onclick="togglePipelineView('list')" 
                        class="view-toggle"
                        style="
                            padding: 0.5rem 1rem;
                            border: 1px solid #e5e7eb;
                            background: white;
                            color: #374151;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                    📄 Lista
                </button>
            </div>
        </div>
    `;
}

// ===== UTILITY FUNCTIONS =====
function groupContactsByStatus(contacts) {
    const groups = {};
    
    // Initialize all stages
    Object.keys(PIPELINE_STAGES).forEach(stage => {
        groups[stage] = [];
    });
    
    // Group contacts
    contacts.forEach(contact => {
        const status = contact.status || 'Nuevo';
        if (groups[status]) {
            groups[status].push(contact);
        } else {
            groups['Nuevo'].push(contact);
        }
    });
    
    return groups;
}

function calculatePipelineStats(contacts) {
    pipelineStats = {
        total: contacts.length,
        byStage: {},
        conversionRate: 0,
        averageScore: 0,
        topSources: {}
    };
    
    // Count by stage
    Object.keys(PIPELINE_STAGES).forEach(stage => {
        pipelineStats.byStage[stage] = contacts.filter(c => (c.status || 'Nuevo') === stage).length;
    });
    
    // Calculate conversion rate
    if (contacts.length > 0) {
        const converted = contacts.filter(c => c.status === 'Convertido').length;
        pipelineStats.conversionRate = (converted / contacts.length * 100).toFixed(1);
    }
    
    // Calculate average score
    if (contacts.length > 0) {
        const totalScore = contacts.reduce((sum, c) => sum + (c.score || 50), 0);
        pipelineStats.averageScore = (totalScore / contacts.length).toFixed(1);
    }
    
    // Top sources
    contacts.forEach(contact => {
        const source = contact.source || 'No especificado';
        pipelineStats.topSources[source] = (pipelineStats.topSources[source] || 0) + 1;
    });
    
    console.log('📊 Pipeline stats calculated:', pipelineStats);
}

function getPriorityColor(priority) {
    const colors = {
        'High': '#ef4444',
        'Medium': '#f59e0b',
        'Low': '#6b7280'
    };
    return colors[priority] || colors['Medium'];
}

function getSourceIcon(source) {
    if (!source) return '📍';
    
    const icons = {
        'Facebook': '📘',
        'Instagram': '📸',
        'Google': '🔍',
        'Referido': '👥',
        'Volante': '📄',
        'Pasando por la sede': '🏢'
    };
    
    if (source.includes('CONVENIO')) return '🤝';
    return icons[source] || '📍';
}

function getTimeAgo(dateString, timeString = null) {
    try {
        const fullDateTime = timeString ? `${dateString} ${timeString}` : dateString;
        const date = new Date(fullDateTime);
        const now = new Date();
        
        if (isNaN(date.getTime())) return 'Fecha inválida';
        
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Ahora';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        return `${Math.floor(diffInSeconds / 2592000)}mes`;
        
    } catch (error) {
        return 'Error';
    }
}

function getPipelineHealthColor(conversionRate) {
    if (conversionRate >= 20) return '#10b981';
    if (conversionRate >= 10) return '#f59e0b';
    return '#ef4444';
}

function getPipelineHealthStatus(conversionRate) {
    if (conversionRate >= 20) return '🟢 Pipeline Saludable';
    if (conversionRate >= 10) return '🟡 Pipeline Regular';
    return '🔴 Pipeline Necesita Atención';
}

function getPipelineHealthMessage(conversionRate, activeLeads) {
    if (conversionRate >= 20) {
        return `Excelente tasa de conversión del ${conversionRate}%. Continúa con el buen trabajo y mantén el seguimiento de los ${activeLeads} leads activos.`;
    } else if (conversionRate >= 10) {
        return `Tasa de conversión del ${conversionRate}% es aceptable, pero hay oportunidad de mejora. Enfócate en los ${activeLeads} leads activos para aumentar las conversiones.`;
    } else {
        return `La tasa de conversión del ${conversionRate}% está por debajo del objetivo. Revisa las estrategias de seguimiento y considera capacitación adicional.`;
    }
}

// ===== DRAG AND DROP FUNCTIONALITY =====
function initializeDragAndDrop() {
    console.log('🖱️ Initializing drag and drop for pipeline');
    
    // Add drag and drop styles
    const style = document.createElement('style');
    style.textContent = `
        .lead-card.dragging {
            opacity: 0.5;
            transform: rotate(5deg);
        }
        
        .pipeline-column.drag-over {
            background: #f0f9ff !important;
            border: 2px dashed #3b82f6 !important;
        }
        
        .pipeline-column.drag-over .pipeline-header {
            background: #dbeafe !important;
        }
    `;
    
    if (!document.getElementById('pipeline-drag-styles')) {
        style.id = 'pipeline-drag-styles';
        document.head.appendChild(style);
    }
}

function handleDragStart(event, leadId) {
    console.log('🖱️ Drag started for lead:', leadId);
    
    draggedLead = leadId;
    event.dataTransfer.setData('text/plain', leadId);
    event.target.classList.add('dragging');
    
    // Add visual feedback to columns
    document.querySelectorAll('.pipeline-column').forEach(col => {
        col.style.transition = 'all 0.3s ease';
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event, newStatus) {
    event.preventDefault();
    
    const leadId = event.dataTransfer.getData('text/plain');
    const column = event.currentTarget;
    
    // Remove visual feedback
    column.classList.remove('drag-over');
    document.querySelectorAll('.lead-card').forEach(card => {
        card.classList.remove('dragging');
    });
    
    if (!leadId || !newStatus) {
        console.error('❌ Invalid drop operation');
        return;
    }
    
    try {
        console.log('🎯 Updating lead status:', leadId, 'to', newStatus);
        
        // Update in Firebase
        await window.FirebaseData.updateContact(leadId, { status: newStatus });
        
        // Show success feedback
        showNotification(`✅ Lead movido a "${newStatus}"`, 'success', 2000);
        
        // Refresh pipeline
        setTimeout(() => {
            loadPipelineData();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error updating lead status:', error);
        showNotification(`❌ Error al mover lead: ${error.message}`, 'error');
    }
    
    draggedLead = null;
}

// ===== PIPELINE ACTIONS =====
async function refreshPipeline() {
    console.log('🔄 Refreshing pipeline');
    
    // Show loading state
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.style.opacity = '0.6';
    }
    
    try {
        await loadPipelineData();
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Pipeline actualizado', 'success', 2000);
        }
    } catch (error) {
        if (typeof showNotification === 'function') {
            showNotification('❌ Error al actualizar pipeline', 'error');
        }
    } finally {
        if (container) {
            container.style.opacity = '1';
        }
    }
}

async function addNewLeadToStage(stage) {
    console.log('➕ Adding new lead to stage:', stage);
    
    // For now, just redirect to contacts tab
    if (typeof switchTab === 'function') {
        switchTab('contacts');
        showNotification(`ℹ️ Agrega un nuevo contacto y se ubicará en "${stage}"`, 'info', 3000);
    } else {
        alert(`➕ Para agregar un lead a "${stage}", ve a la pestaña de Contactos`);
    }
}

function showPipelineFilters() {
    // Implementation for pipeline filters
    alert('🔍 Filtros de pipeline - Funcionalidad por implementar');
}

function exportPipelineData() {
    try {
        if (!pipelineData || pipelineData.length === 0) {
            alert('⚠️ No hay datos de pipeline para exportar');
            return;
        }
        
        // Create CSV content
        const headers = ['ID', 'Nombre', 'Teléfono', 'Email', 'Fuente', 'Estado', 'Fecha', 'Prioridad', 'Score'];
        const csvContent = [
            headers.join(','),
            ...pipelineData.map(lead => [
                lead.id || '',
                `"${lead.name || ''}"`,
                lead.phone || '',
                lead.email || '',
                `"${lead.source || ''}"`,
                lead.status || '',
                lead.date || '',
                lead.priority || 'Medium',
                lead.score || 50
            ].join(','))
        ].join('\n');
        
        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pipeline_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        console.log('📥 Pipeline data exported');
        showNotification('📥 Pipeline exportado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting pipeline:', error);
        showNotification('❌ Error al exportar pipeline', 'error');
    }
}

function togglePipelineView(viewType) {
    console.log('👁️ Toggling pipeline view to:', viewType);
    
    // Update button states
    document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#374151';
    });
    
    event.target.style.background = '#3b82f6';
    event.target.style.color = 'white';
    
    if (viewType === 'list') {
        // Would implement list view
        alert('📄 Vista de lista - Funcionalidad por implementar');
    }
    // Kanban view is already implemented
}

// ===== LEAD ACTIONS =====
function editLeadQuick(leadId) {
    console.log('✏️ Quick edit for lead:', leadId);
    
    // For now, show lead details
    if (typeof showLeadDetails === 'function') {
        showLeadDetails(leadId);
    } else {
        alert(`✏️ Editar lead ${leadId} - Funcionalidad por implementar`);
    }
}

// ===== LOADING AND ERROR STATES =====
function showPipelineLoading() {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                color: #6b7280;
            ">
                <div style="text-align: center;">
                    <div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 1rem;"></div>
                    <div>Cargando pipeline desde Firebase...</div>
                </div>
            </div>
        `;
    }
}

function showPipelineError(message) {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="
                text-align: center;
                color: #dc2626;
                padding: 3rem;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            ">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin: 0 0 1rem 0;">Error en Pipeline</h3>
                <p style="margin: 0 0 1rem 0; color: #6b7280;">${message}</p>
                <button onclick="loadPipelineData()" class="btn btn-primary">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

function showEmptyPipeline() {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="
                text-align: center;
                color: #6b7280;
                padding: 4rem;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            ">
                <div style="font-size: 3rem; margin-bottom: 1.5rem;">🎯</div>
                <h3 style="margin: 0 0 1rem 0; color: #374151;">Pipeline Vacío</h3>
                <p style="margin: 0 0 2rem 0; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                    No hay leads en tu pipeline. Comienza agregando contactos para verlos organizados por etapas.
                </p>
                <button onclick="if (typeof switchTab === 'function') switchTab('contacts')" 
                        class="btn btn-primary" 
                        style="padding: 1rem 2rem; font-size: 1.1rem;">
                    ➕ Agregar Primer Contacto
                </button>
            </div>
        `;
    }
}

function setupPipelineEventListeners() {
    // Add global event listeners for drag and drop
    document.querySelectorAll('.pipeline-column').forEach(column => {
        column.addEventListener('dragleave', handleDragLeave);
    });
    
    console.log('🎧 Pipeline event listeners setup complete');
}

// ===== MODULE INITIALIZATION =====
function initializePipelineModule() {
    console.log('🚀 Initializing pipeline module');
    
    if (pipelineInitialized) {
        console.log('⚠️ Pipeline module already initialized');
        return;
    }
    
    try {
        // Initialize drag and drop
        initializeDragAndDrop();
        
        // Set initialization flag
        pipelineInitialized = true;
        
        console.log('✅ Pipeline module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing pipeline module:', error);
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Pipeline module DOM ready');
    
    // Initialize when Firebase is ready
    if (window.FirebaseData) {
        initializePipelineModule();
    } else {
        window.addEventListener('firebaseReady', initializePipelineModule);
    }
});

// ===== MODULE EXPORTS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadPipelineData,
        refreshPipeline,
        handleDragStart,
        handleDragOver,
        handleDrop,
        addNewLeadToStage,
        exportPipelineData,
        togglePipelineView,
        PIPELINE_STAGES,
        pipelineStats
    };
}
// Make drag and drop functions globally available
window.handleDragStart = function(event, leadId) {
    console.log('🖱️ Drag started for lead:', leadId);
    
    draggedLead = leadId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', leadId);
    event.target.classList.add('dragging');
    event.target.style.opacity = '0.5';
};

window.handleDragOver = function(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
    event.currentTarget.style.background = '#f0f9ff';
    event.currentTarget.style.border = '2px dashed #3b82f6';
};

window.handleDragLeave = function(event) {
    event.currentTarget.classList.remove('drag-over');
    event.currentTarget.style.background = '';
    event.currentTarget.style.border = '';
};

window.handleDrop = async function(event, newStatus) {
    event.preventDefault();
    event.stopPropagation();
    
    const leadId = event.dataTransfer.getData('text/plain');
    const column = event.currentTarget;
    
    // Remove visual feedback
    column.classList.remove('drag-over');
    column.style.background = '';
    column.style.border = '';
    
    // Reset all dragging cards
    document.querySelectorAll('.lead-card').forEach(card => {
        card.classList.remove('dragging');
        card.style.opacity = '';
    });
    
    if (!leadId || !newStatus) {
        console.error('❌ Invalid drop operation');
        return;
    }
    
    try {
        console.log('🎯 Updating lead status:', leadId, 'to', newStatus);
        
        // Update in Firebase
        await window.FirebaseData.updateContact(leadId, { status: newStatus });
        
        // Show success message
        alert(`✅ Lead movido a "${newStatus}"`);
        
        // Refresh pipeline
        setTimeout(() => {
            loadPipelineData();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error updating lead status:', error);
        alert(`❌ Error al mover lead: ${error.message}`);
    }
};

// Also fix the event listeners on columns
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Add event listeners to all pipeline columns
        document.querySelectorAll('.pipeline-column').forEach(column => {
            column.addEventListener('dragover', (e) => handleDragOver(e));
            column.addEventListener('dragleave', (e) => handleDragLeave(e));
            column.addEventListener('drop', (e) => {
                const status = column.getAttribute('data-status');
                handleDrop(e, status);
            });
        });
    }, 1000);
});
console.log('✅ Pipeline.js module loaded successfully');
