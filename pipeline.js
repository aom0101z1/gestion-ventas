// pipeline.js - PIPELINE MANAGEMENT MODULE - COMPLETE VERSION WITH TARGETED DRAG & DROP FIX
// ===== SALES PIPELINE AND LEAD MANAGEMENT =====

// ✅ FIXED: Global variables for pipeline module - Changed draggedLead to global scope
let pipelineData = [];
let pipelineInitialized = false;
window.draggedLead = null; // ✅ FIXED: Changed from `let draggedLead = null;` to global scope
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
            // ✅ FIXED: Set up event listeners even for empty pipeline
            setTimeout(() => {
                setupPipelineEventListeners();
                console.log('✅ Pipeline event listeners set up for empty state');
            }, 100);
            return;
        }
        
        // Calculate pipeline statistics
        calculatePipelineStats(allContacts);
        
        // Render pipeline view
        renderPipelineView(allContacts);
        
        // ✅ REMOVED: Don't call initializeDragAndDrop() here
        // The event listeners will be set up in renderPipelineView()
        // initializeDragAndDrop(); // ❌ REMOVE THIS LINE
        
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
    
    // ✅ CRITICAL FIX: Add event listeners AFTER rendering
    setTimeout(() => {
        setupPipelineEventListeners();
        console.log('✅ Pipeline event listeners re-attached after render');
    }, 100);
}

function renderPipelineColumn(status, config, leads) {
    const leadCount = leads.length;
    
    return `
        <div class="pipeline-column" 
             id="pipeline-column-${status.replace(/\s+/g, '-')}"
             data-status="${status}"
             style="
                 background: white;
                 border-radius: 12px;
                 box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                 min-height: 400px;
                 display: flex;
                 flex-direction: column;
             ">
            <div class="pipeline-header" style="
                background: ${config.color};
                color: white;
                padding: 1rem;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">${config.emoji}</span>
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">${status}</h3>
                        <p style="margin: 0; font-size: 0.8rem; opacity: 0.9;">${config.description}</p>
                    </div>
                </div>
                <div style="
                    background: rgba(255,255,255,0.2);
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-weight: bold;
                ">${leadCount}</div>
            </div>
            
            <div class="pipeline-body" style="
                padding: 1rem;
                flex: 1;
                overflow-y: auto;
                max-height: 500px;
            ">
                ${leads.length === 0 ? `
                    <div style="
                        text-align: center;
                        color: #9ca3af;
                        padding: 2rem 1rem;
                        border: 2px dashed #e5e7eb;
                        border-radius: 8px;
                        margin-top: 1rem;
                    ">
                        <p style="margin: 0;">No hay leads en esta etapa</p>
                        <button onclick="addNewLeadToStage('${status}')" 
                                style="
                                    background: none;
                                    border: none;
                                    color: ${config.color};
                                    font-size: 0.9rem;
                                    cursor: pointer;
                                    margin-top: 0.5rem;
                                ">
                            ➕ Agregar lead
                        </button>
                    </div>
                ` : leads.map(lead => renderLeadCard(lead, config.color)).join('')}
            </div>
        </div>
    `;
}

function renderLeadCard(lead, stageColor) {
    const priority = calculateLeadPriority(lead);
    const score = calculateLeadScore(lead);
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    
    return `
        <div class="lead-card" 
             id="lead-card-${lead.id}"
             data-lead-id="${lead.id}"
             draggable="true"
             style="
                 background: white;
                 border: 1px solid #e5e7eb;
                 border-radius: 8px;
                 padding: 1rem;
                 margin-bottom: 0.75rem;
                 cursor: grab;
                 transition: all 0.2s ease;
                 border-left: 4px solid ${stageColor};
             ">
            
            <div class="lead-header" onclick="toggleLeadDetails(event, '${lead.id}')" style="
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
                cursor: pointer;
            ">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.25rem 0; color: #1f2937; font-size: 0.95rem; font-weight: 600;">
                        ${lead.name}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        <span>📞 ${lead.phone}</span>
                        ${priority.icon}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="
                        background: ${getScoreColor(score)};
                        color: white;
                        padding: 0.125rem 0.5rem;
                        border-radius: 12px;
                        font-size: 0.7rem;
                        font-weight: bold;
                    ">${score}%</div>
                    <span class="chevron" style="
                        color: #9ca3af;
                        transition: transform 0.2s;
                        font-size: 0.8rem;
                    ">▼</span>
                </div>
            </div>
            
            <div class="lead-details" style="
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            ">
                <div style="padding-top: 0.5rem; border-top: 1px solid #f3f4f6;">
                    ${lead.email ? `
                        <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                            📧 ${lead.email}
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        🏢 ${(lead.source || 'No especificado').length > 25 ? 
                            (lead.source || 'No especificado').substring(0, 25) + '...' : 
                            (lead.source || 'No especificado')}
                    </div>
                    
                    <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        📅 ${formatDate(lead.date)} (${daysOld} días)
                    </div>
                    
                    ${lead.notes ? `
                        <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #4b5563;">
                            📝 ${lead.notes.length > 50 ? lead.notes.substring(0, 50) + '...' : lead.notes}
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        ${lead.phone ? `
                            <button onclick="openWhatsApp('${lead.phone}', '${lead.name}')" 
                                    style="
                                        background: #25d366;
                                        color: white;
                                        border: none;
                                        padding: 0.25rem 0.5rem;
                                        border-radius: 4px;
                                        font-size: 0.7rem;
                                        cursor: pointer;
                                    ">
                                📱 WhatsApp
                            </button>
                        ` : ''}
                        
                        <button onclick="editLead('${lead.id}')" 
                                style="
                                    background: #3b82f6;
                                    color: white;
                                    border: none;
                                    padding: 0.25rem 0.5rem;
                                    border-radius: 4px;
                                    font-size: 0.7rem;
                                    cursor: pointer;
                                ">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPipelineSummary(contacts) {
    const totalLeads = contacts.length;
    const conversions = contacts.filter(c => c.status === 'Convertido').length;
    const conversionRate = totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0;
    
    return `
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <h3 style="margin: 0 0 1rem 0; color: #1f2937;">📊 Resumen del Pipeline</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div style="text-align: center; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">
                        ${totalLeads}
                    </div>
                    <div style="color: #6b7280;">Total de Leads</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981; margin-bottom: 0.5rem;">
                        ${conversions}
                    </div>
                    <div style="color: #6b7280;">Convertidos</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: #fefce8; border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: bold; color: #eab308; margin-bottom: 0.5rem;">
                        ${conversionRate}%
                    </div>
                    <div style="color: #6b7280;">Tasa de Conversión</div>
                </div>
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #475569; font-size: 0.9rem;">
                    ${getConversionInsight(conversionRate, totalLeads - conversions)}
                </p>
            </div>
        </div>
    `;
}

function renderPipelineControls() {
    return `
        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5rem;
            padding: 1rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <div style="display: flex; gap: 0.75rem;">
                <button onclick="refreshPipeline()" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                    🔄 Actualizar
                </button>
                
                <button onclick="showPipelineFilters()" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                    🔍 Filtros
                </button>
                
                <button onclick="exportPipelineData()" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                    📊 Exportar
                </button>
            </div>
            
            <div style="font-size: 0.9rem; color: #6b7280;">
                Última actualización: ${new Date().toLocaleTimeString('es-ES')}
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
        byStatus: {},
        avgDaysInPipeline: 0,
        conversionRate: 0
    };
    
    Object.keys(PIPELINE_STAGES).forEach(status => {
        pipelineStats.byStatus[status] = contacts.filter(c => c.status === status).length;
    });
    
    const conversions = pipelineStats.byStatus['Convertido'] || 0;
    pipelineStats.conversionRate = contacts.length > 0 ? 
        Math.round((conversions / contacts.length) * 100) : 0;
}

function calculateLeadPriority(lead) {
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    
    if (daysOld > 7) return { level: 'high', icon: '🔴', label: 'Alta' };
    if (daysOld > 3) return { level: 'medium', icon: '🟡', label: 'Media' };
    return { level: 'low', icon: '🟢', label: 'Baja' };
}

function calculateLeadScore(lead) {
    let score = 50; // Base score
    
    // Recency boost
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    if (daysOld <= 1) score += 30;
    else if (daysOld <= 3) score += 20;
    else if (daysOld <= 7) score += 10;
    else if (daysOld > 14) score -= 20;
    
    // Contact info completeness
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.notes) score += 5;
    
    // Source quality
    if (lead.source && lead.source.toLowerCase().includes('referido')) score += 15;
    
    return Math.max(0, Math.min(100, score));
}

function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
}

function getConversionInsight(conversionRate, activeLeads) {
    if (conversionRate >= 20) {
        return `Excelente tasa de conversión del ${conversionRate}%. Continúa con el buen trabajo y mantén el seguimiento de los ${activeLeads} leads activos.`;
    } else if (conversionRate >= 10) {
        return `Tasa de conversión del ${conversionRate}% es aceptable, pero hay oportunidad de mejora. Enfócate en los ${activeLeads} leads activos para aumentar las conversiones.`;
    } else {
        return `La tasa de conversión del ${conversionRate}% está por debajo del objetivo. Revisa las estrategias de seguimiento y considera capacitación adicional.`;
    }
}

// ===== LEAD DETAILS TOGGLE =====
function toggleLeadDetails(event, leadId) {
    event.stopPropagation(); // Prevent drag from triggering
    
    const leadCard = document.getElementById(`lead-card-${leadId}`);
    if (!leadCard) return;
    
    const isExpanded = leadCard.classList.contains('expanded');
    const leadDetails = leadCard.querySelector('.lead-details');
    const chevron = leadCard.querySelector('.chevron');
    
    if (isExpanded) {
        // Collapse
        leadCard.classList.remove('expanded');
        leadDetails.style.maxHeight = '0';
        chevron.style.transform = 'rotate(0deg)';
        leadCard.style.boxShadow = 'none';
    } else {
        // Expand
        leadCard.classList.add('expanded');
        leadDetails.style.maxHeight = '300px'; // Adjust based on content
        chevron.style.transform = 'rotate(180deg)';
        leadCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }
}

// ===== DRAG AND DROP FUNCTIONALITY - FIXED =====
function initializeDragAndDrop() {
    console.log('🖱️ Initializing drag and drop for pipeline');
    
    // Add drag and drop styles
    const style = document.createElement('style');
    style.textContent = `
        .lead-card {
            cursor: move !important;
        }
        
        .lead-card.dragging {
            opacity: 0.5;
            transform: rotate(2deg);
            cursor: grabbing !important;
        }
        
        .lead-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .lead-card.expanded {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .lead-header:hover {
            background: #f3f4f6 !important;
        }
        
        .pipeline-column.drag-over {
            background: #f0f9ff !important;
            border: 2px dashed #3b82f6 !important;
        }
        
        .pipeline-column.drag-over .pipeline-header {
            background: #dbeafe !important;
        }
        
        .pipeline-body.drag-over {
            background: rgba(59, 130, 246, 0.05);
        }
        
        /* Scrollbar styling for vertical scroll */
        .pipeline-body::-webkit-scrollbar {
            width: 6px;
        }
        
        .pipeline-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }
        
        .pipeline-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        
        .pipeline-body::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    `;
    
    if (!document.getElementById('pipeline-drag-styles')) {
        style.id = 'pipeline-drag-styles';
        document.head.appendChild(style);
    }
    
    console.log('✅ Drag and drop styles initialized');
}

function setupDragAndDropListeners() {
    console.log('📌 Setting up drag and drop listeners');
    
    // Add listeners to all lead cards
    document.querySelectorAll('.lead-card').forEach(card => {
        card.addEventListener('dragstart', function(e) {
            const leadId = this.getAttribute('data-lead-id');
            handleDragStart(e, leadId);
        });
        
        card.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
        });
    });
    
    // Add listeners to all pipeline columns
    document.querySelectorAll('.pipeline-column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', function(e) {
            const status = this.getAttribute('data-status');
            handleDrop(e, status);
        });
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('dragenter', function(e) {
            e.preventDefault();
        });
    });
    
    // Add listeners to pipeline bodies
    document.querySelectorAll('.pipeline-body').forEach(body => {
        body.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        body.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        body.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
        });
    });
    
    console.log('✅ Drag and drop listeners set up');
}

function handleDragStart(event, leadId) {
    console.log('🖱️ Drag started for lead:', leadId);
    
    // Collapse any expanded cards before dragging
    const leadCard = document.getElementById(`lead-card-${leadId}`);
    if (leadCard && leadCard.classList.contains('expanded')) {
        toggleLeadDetails(event, leadId);
    }
    
    // ✅ FIXED: Use global window variable
    window.draggedLead = leadId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', leadId);
    
    // Add dragging class
    if (leadCard) {
        leadCard.classList.add('dragging');
    }
    
    // Add visual feedback to columns
    document.querySelectorAll('.pipeline-column').forEach(col => {
        col.style.transition = 'all 0.3s ease';
    });
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }
    
    event.dataTransfer.dropEffect = 'move';
    
    const column = event.currentTarget;
    if (column.classList.contains('pipeline-column')) {
        column.classList.add('drag-over');
    }
    
    return false;
}

function handleDragLeave(event) {
    const column = event.currentTarget;
    
    // Check if we're actually leaving the column
    const rect = column.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
        column.classList.remove('drag-over');
    }
}

// ✅ FIXED: Updated handleDrop to use global window variable
async function handleDrop(event, newStatus) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    
    event.preventDefault();
    
    const leadId = event.dataTransfer.getData('text/plain') || window.draggedLead;
    
    // Remove all visual feedback
    document.querySelectorAll('.pipeline-column').forEach(col => {
        col.classList.remove('drag-over');
    });
    
    document.querySelectorAll('.pipeline-body').forEach(body => {
        body.classList.remove('drag-over');
    });
    
    document.querySelectorAll('.lead-card').forEach(card => {
        card.classList.remove('dragging');
    });
    
    // ✅ FIXED: Check global window variable
    if (!leadId || !window.draggedLead) {
        console.error('❌ No lead ID found for drop');
        window.draggedLead = null; // Reset
        return;
    }
    
    console.log(`🎯 Dropping lead ${leadId} into ${newStatus}`);
    
    try {
        // Update lead status in Firebase
        const success = await window.FirebaseData.updateContact(leadId, {
            status: newStatus,
            lastUpdated: new Date().toISOString()
        });
        
        if (success) {
            const showNotification = window.showNotification || function(message) {
                console.log(message);
            };
            
            showNotification(`✅ Lead movido a "${newStatus}"`, 'success');
            
            // Reload pipeline data to reflect changes
            await loadPipelineData();
        } else {
            throw new Error('Failed to update contact');
        }
        
    } catch (error) {
        console.error('❌ Error moving lead:', error);
        
        const showNotification = window.showNotification || function(message) {
            alert(message);
        };
        
        showNotification(`❌ Error al mover lead: ${error.message}`, 'error');
        
        // Reload pipeline to ensure correct state
        await loadPipelineData();
    }
    
    // ✅ FIXED: Reset global window variable
    window.draggedLead = null;
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
        
        const showNotification = window.showNotification || function(message) {
            console.log(message);
        };
        
        showNotification('✅ Pipeline actualizado', 'success', 2000);
    } catch (error) {
        const showNotification = window.showNotification || function(message) {
            alert(message);
        };
        
        showNotification('❌ Error al actualizar pipeline', 'error');
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
        
        const showNotification = window.showNotification || function(message) {
            alert(message);
        };
        
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
                lead.id,
                `"${lead.name}"`,
                lead.phone,
                lead.email || '',
                `"${lead.source || ''}"`,
                lead.status || 'Nuevo',
                lead.date,
                calculateLeadPriority(lead).label,
                calculateLeadScore(lead)
            ].join(','))
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `pipeline_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('✅ Pipeline exportado exitosamente');
        
    } catch (error) {
        console.error('❌ Error exporting pipeline:', error);
        alert(`❌ Error al exportar: ${error.message}`);
    }
}

// ===== LEAD ACTIONS =====
function editLead(leadId) {
    // Find the lead data
    const lead = pipelineData.find(l => l.id === leadId);
    if (!lead) {
        alert('❌ Lead no encontrado');
        return;
    }
    
    // For now, just redirect to contacts tab and highlight the lead
    if (typeof switchTab === 'function') {
        switchTab('contacts');
        
        // Try to scroll to and highlight the lead in the contacts table
        setTimeout(() => {
            const leadRow = document.querySelector(`[data-contact-id="${leadId}"]`);
            if (leadRow) {
                leadRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                leadRow.style.background = '#fef3c7';
                setTimeout(() => {
                    leadRow.style.background = '';
                }, 3000);
            }
        }, 500);
        
        const showNotification = window.showNotification || function(message) {
            alert(message);
        };
        
        showNotification(`📝 Busca "${lead.name}" en la tabla de contactos para editar`, 'info', 4000);
    }
}

function openWhatsApp(phone, name) {
    if (!phone) {
        alert('❌ Número de teléfono no disponible');
        return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${name}, soy de Ciudad Bilingüe. ¿Tienes un momento para conversar sobre nuestros servicios?`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
}

// ===== LOADING AND ERROR STATES =====
function showPipelineLoading() {
    const container = document.getElementById('pipelineContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <div style="text-align: center;">
                <div class="loading-spinner" style="
                    border: 4px solid #f3f4f6;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem auto;
                "></div>
                <p style="color: #6b7280; margin: 0;">Cargando pipeline...</p>
            </div>
        </div>
    `;
}

function showPipelineError(message) {
    const container = document.getElementById('pipelineContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="
            padding: 2rem;
            text-align: center;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <div style="color: #dc2626; font-size: 3rem; margin-bottom: 1rem;">❌</div>
            <h3 style="color: #1f2937; margin-bottom: 0.5rem;">Error cargando pipeline</h3>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">${message}</p>
            <button onclick="loadPipelineData()" class="btn btn-primary">
                🔄 Reintentar
            </button>
        </div>
    `;
}

function showEmptyPipeline() {
    const container = document.getElementById('pipelineContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="
            padding: 3rem;
            text-align: center;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
            <h3 style="color: #1f2937; margin-bottom: 0.5rem;">Pipeline vacío</h3>
            <p style="color: #6b7280; margin-bottom: 2rem;">
                Comienza agregando contactos para verlos organizados por etapas.
            </p>
            <button onclick="if (typeof switchTab === 'function') switchTab('contacts')" 
                    class="btn btn-primary" 
                    style="padding: 1rem 2rem; font-size: 1.1rem;">
                ➕ Agregar Primer Contacto
            </button>
        </div>
    `;
}

function setupPipelineEventListeners() {
    // Set up drag and drop listeners
    setupDragAndDropListeners();
    
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
        // Only initialize styles here, NOT the event listeners
        initializePipelineStyles();
        
        // Set initialization flag
        pipelineInitialized = true;
        
        console.log('✅ Pipeline module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing pipeline module:', error);
    }
}

// ===== NEW FUNCTION: Initialize only styles =====
function initializePipelineStyles() {
    console.log('🎨 Initializing pipeline styles');
    
    // Add drag and drop styles
    const style = document.createElement('style');
    style.textContent = `
        .lead-card {
            cursor: move !important;
        }
        
        .lead-card.dragging {
            opacity: 0.5;
            transform: rotate(2deg);
            cursor: grabbing !important;
        }
        
        .lead-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .lead-card.expanded {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .lead-header:hover {
            background: #f3f4f6 !important;
        }
        
        .pipeline-column.drag-over {
            background: #f0f9ff !important;
            border: 2px dashed #3b82f6 !important;
        }
        
        .pipeline-column.drag-over .pipeline-header {
            background: #dbeafe !important;
        }
        
        .pipeline-body.drag-over {
            background: rgba(59, 130, 246, 0.05);
        }
        
        .pipeline-body::-webkit-scrollbar {
            width: 6px;
        }
        
        .pipeline-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }
        
        .pipeline-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        
        .pipeline-body::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    `;
    
    if (!document.getElementById('pipeline-drag-styles')) {
        style.id = 'pipeline-drag-styles';
        document.head.appendChild(style);
    }
    
    console.log('✅ Pipeline styles initialized');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Pipeline module DOM ready');
    
    if (typeof initializePipelineModule === 'function') {
        initializePipelineModule();
    }
});

// ===== MODULE EXPORTS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadPipelineData,
        initializePipelineModule,
        refreshPipeline,
        exportPipelineData,
        calculateLeadScore,
        calculateLeadPriority
    };
}

console.log('✅ Pipeline.js module loaded successfully with drag & drop fixed');


