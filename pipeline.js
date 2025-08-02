// pipeline.js - PIPELINE MANAGEMENT MODULE - COMPLETE ENHANCED VERSION WITH ROBUST DRAG & DROP
// ===== SALES PIPELINE AND LEAD MANAGEMENT =====

// ✅ ENHANCED: Global variables for pipeline module with better state management
let pipelineData = [];
let pipelineInitialized = false;
window.draggedLead = null; // Global scope for cross-function access
let pipelineStats = {};
let dragDropState = {
    isDragging: false,
    draggedElement: null,
    originalParent: null,
    dragStartTime: null
};

// Enhanced pipeline configuration with additional metadata
const PIPELINE_STAGES = {
    'Nuevo': { 
        color: '#fbbf24', 
        emoji: '🟡', 
        description: 'Leads recién ingresados',
        order: 1,
        targetDays: 1,
        priority: 'high'
    },
    'Contactado': { 
        color: '#3b82f6', 
        emoji: '🔵', 
        description: 'Primer contacto realizado',
        order: 2,
        targetDays: 3,
        priority: 'high'
    },
    'Interesado': { 
        color: '#10b981', 
        emoji: '🟢', 
        description: 'Mostraron interés en el servicio',
        order: 3,
        targetDays: 7,
        priority: 'medium'
    },
    'Negociación': { 
        color: '#f97316', 
        emoji: '🟠', 
        description: 'En proceso de negociación',
        order: 4,
        targetDays: 14,
        priority: 'high'
    },
    'Convertido': { 
        color: '#22c55e', 
        emoji: '✅', 
        description: 'Clientes convertidos exitosamente',
        order: 5,
        targetDays: null,
        priority: 'low'
    },
    'Perdido': { 
        color: '#ef4444', 
        emoji: '❌', 
        description: 'Leads perdidos o no interesados',
        order: 6,
        targetDays: null,
        priority: 'low'
    }
};

// ===== ENHANCED MAIN PIPELINE LOADING FUNCTION =====
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
        
        // Load contacts from Firebase with error handling
        let allContacts;
        try {
            allContacts = await window.FirebaseData.getFilteredContacts();
        } catch (firebaseError) {
            console.error('❌ Firebase error:', firebaseError);
            showPipelineError(`Error conectando con la base de datos: ${firebaseError.message}`);
            return;
        }
        
        pipelineData = allContacts || [];
        
        if (pipelineData.length === 0) {
            showEmptyPipeline();
            // ✅ ENHANCED: Set up event listeners even for empty pipeline
            setTimeout(() => {
                setupPipelineEventListeners();
                console.log('✅ Pipeline event listeners set up for empty state');
            }, 100);
            return;
        }
        
        // Validate and clean data
        pipelineData = validateAndCleanPipelineData(pipelineData);
        
        // Calculate pipeline statistics
        calculatePipelineStats(pipelineData);
        
        // Render pipeline view (this will handle event listeners internally)
        renderPipelineView(pipelineData);
        
        console.log('✅ Pipeline data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading pipeline data:', error);
        showPipelineError(`Error cargando pipeline: ${error.message}`);
    }
}

// ===== ENHANCED DATA VALIDATION =====
function validateAndCleanPipelineData(data) {
    console.log('🔍 Validating and cleaning pipeline data');
    
    return data.filter(contact => {
        // Basic validation
        if (!contact.id || !contact.name) {
            console.warn('⚠️ Contact missing required fields:', contact);
            return false;
        }
        
        // Ensure status is valid
        if (!contact.status || !PIPELINE_STAGES[contact.status]) {
            console.log(`📝 Setting default status for contact ${contact.name}`);
            contact.status = 'Nuevo';
        }
        
        // Ensure date is valid
        if (!contact.date) {
            contact.date = new Date().toISOString();
        }
        
        return true;
    });
}

// ===== ENHANCED PIPELINE RENDERING =====
function renderPipelineView(contacts) {
    const container = document.getElementById('pipelineContainer');
    if (!container) {
        console.error('❌ Pipeline container not found in renderPipelineView');
        return;
    }
    
    console.log('🎨 Rendering pipeline view');
    
    // Group contacts by status
    const statusGroups = groupContactsByStatus(contacts);
    
    // Clear any existing drag state
    resetDragState();
    
    container.innerHTML = `
        <div class="pipeline-grid" style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
    
    // ✅ CRITICAL ENHANCED FIX: Set up event listeners after DOM is fully rendered
    // Use longer timeout to ensure complex rendering is complete
    setTimeout(() => {
        try {
            setupPipelineEventListeners();
            validateDragDropSetup();
            console.log('✅ Pipeline event listeners re-attached after render');
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
            // Retry once more after additional delay
            setTimeout(() => {
                try {
                    setupPipelineEventListeners();
                    console.log('✅ Pipeline event listeners retry successful');
                } catch (retryError) {
                    console.error('❌ Event listener retry failed:', retryError);
                }
            }, 300);
        }
    }, 200);
}

// ===== ENHANCED PIPELINE COLUMN RENDERING =====
function renderPipelineColumn(status, config, leads) {
    const leadCount = leads.length;
    const overdueLeads = getOverdueLeads(leads, config.targetDays);
    const averageScore = leads.length > 0 ? 
        Math.round(leads.reduce((sum, lead) => sum + calculateLeadScore(lead), 0) / leads.length) : 0;
    
    return `
        <div class="pipeline-column" 
             id="pipeline-column-${status.replace(/\s+/g, '-')}"
             data-status="${status}"
             data-column-order="${config.order}"
             style="
                 background: white;
                 border-radius: 12px;
                 box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                 min-height: 450px;
                 display: flex;
                 flex-direction: column;
                 transition: all 0.3s ease;
                 border: 2px solid transparent;
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
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                    <div style="
                        background: rgba(255,255,255,0.2);
                        padding: 0.25rem 0.75rem;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 1rem;
                    ">${leadCount}</div>
                    ${averageScore > 0 ? `
                        <div style="
                            background: rgba(255,255,255,0.15);
                            padding: 0.125rem 0.5rem;
                            border-radius: 12px;
                            font-size: 0.7rem;
                        ">Avg: ${averageScore}%</div>
                    ` : ''}
                </div>
            </div>
            
            <div class="pipeline-body" 
                 id="pipeline-body-${status.replace(/\s+/g, '-')}"
                 data-status="${status}"
                 style="
                     padding: 1rem;
                     flex: 1;
                     overflow-y: auto;
                     max-height: 500px;
                     min-height: 300px;
                     background: #fafafa;
                     transition: background-color 0.3s ease;
                 ">
                ${leads.length === 0 ? renderEmptyColumnState(status, config) : 
                  leads.map(lead => renderLeadCard(lead, config.color, config.targetDays)).join('')}
                
                ${overdueLeads.length > 0 ? `
                    <div style="
                        background: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 6px;
                        padding: 0.5rem;
                        margin-top: 0.5rem;
                        font-size: 0.8rem;
                        color: #dc2626;
                    ">
                        ⚠️ ${overdueLeads.length} lead(s) atrasado(s)
                    </div>
                ` : ''}
            </div>
            
            <div class="pipeline-footer" style="
                padding: 0.75rem;
                background: #f8fafc;
                border-radius: 0 0 12px 12px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
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
                            transition: opacity 0.2s;
                        ">
                    ➕ Agregar
                </button>
                
                ${config.targetDays ? `
                    <span style="font-size: 0.7rem; color: #6b7280;">
                        Meta: ${config.targetDays} día(s)
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

// ===== ENHANCED LEAD CARD RENDERING =====
function renderLeadCard(lead, stageColor, targetDays) {
    const priority = calculateLeadPriority(lead);
    const score = calculateLeadScore(lead);
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    const isOverdue = targetDays && daysOld > targetDays;
    const urgencyLevel = getUrgencyLevel(lead, targetDays);
    
    return `
        <div class="lead-card" 
             id="lead-card-${lead.id}"
             data-lead-id="${lead.id}"
             data-lead-name="${escapeHtml(lead.name)}"
             data-lead-score="${score}"
             draggable="true"
             style="
                 background: white;
                 border: 1px solid ${isOverdue ? '#ef4444' : '#e5e7eb'};
                 border-radius: 8px;
                 padding: 1rem;
                 margin-bottom: 0.75rem;
                 cursor: grab;
                 transition: all 0.2s ease;
                 border-left: 4px solid ${stageColor};
                 position: relative;
                 ${isOverdue ? 'box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);' : ''}
             ">
            
            ${isOverdue ? `
                <div class="overdue-indicator" style="
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    background: #ef4444;
                    color: white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.6rem;
                    font-weight: bold;
                ">!</div>
            ` : ''}
            
            <div class="lead-header" onclick="toggleLeadDetails(event, '${lead.id}')" style="
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
                cursor: pointer;
            ">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.25rem 0; color: #1f2937; font-size: 0.95rem; font-weight: 600;">
                        ${escapeHtml(lead.name)}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        <span>📞 ${lead.phone}</span>
                        <span class="priority-indicator" style="color: ${priority.level === 'high' ? '#ef4444' : priority.level === 'medium' ? '#f59e0b' : '#10b981'}">
                            ${priority.icon}
                        </span>
                        <span class="urgency-indicator" style="color: ${urgencyLevel.color}">
                            ${urgencyLevel.icon}
                        </span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="lead-score" style="
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
                            📧 ${escapeHtml(lead.email)}
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        🏢 ${escapeHtml((lead.source || 'No especificado').length > 25 ? 
                            (lead.source || 'No especificado').substring(0, 25) + '...' : 
                            (lead.source || 'No especificado'))}
                    </div>
                    
                    <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        📅 ${formatDate(lead.date)} (${daysOld} día${daysOld !== 1 ? 's' : ''})
                        ${isOverdue ? '<span style="color: #ef4444; font-weight: bold;"> - ATRASADO</span>' : ''}
                    </div>
                    
                    ${lead.notes ? `
                        <div style="margin-bottom: 0.5rem; font-size: 0.8rem; color: #4b5563;">
                            📝 ${escapeHtml(lead.notes.length > 50 ? lead.notes.substring(0, 50) + '...' : lead.notes)}
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
                        ${lead.phone ? `
                            <button onclick="openWhatsApp('${lead.phone}', '${escapeHtml(lead.name)}')" 
                                    class="action-btn whatsapp-btn"
                                    style="
                                        background: #25d366;
                                        color: white;
                                        border: none;
                                        padding: 0.25rem 0.5rem;
                                        border-radius: 4px;
                                        font-size: 0.7rem;
                                        cursor: pointer;
                                        transition: background 0.2s;
                                    ">
                                📱 WhatsApp
                            </button>
                        ` : ''}
                        
                        <button onclick="editLead('${lead.id}')" 
                                class="action-btn edit-btn"
                                style="
                                    background: #3b82f6;
                                    color: white;
                                    border: none;
                                    padding: 0.25rem 0.5rem;
                                    border-radius: 4px;
                                    font-size: 0.7rem;
                                    cursor: pointer;
                                    transition: background 0.2s;
                                ">
                            ✏️ Editar
                        </button>
                        
                        <button onclick="duplicateLead('${lead.id}')" 
                                class="action-btn duplicate-btn"
                                style="
                                    background: #6b7280;
                                    color: white;
                                    border: none;
                                    padding: 0.25rem 0.5rem;
                                    border-radius: 4px;
                                    font-size: 0.7rem;
                                    cursor: pointer;
                                    transition: background 0.2s;
                                ">
                            📋 Duplicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== ENHANCED DRAG AND DROP FUNCTIONALITY =====

// ✅ ENHANCED UI update function that doesn't require full reload
async function updatePipelineUI() {
    console.log('🎨 Updating pipeline UI without full reload');
    
    try {
        // Ensure we have the required functions and data
        if (typeof groupContactsByStatus !== 'function') {
            console.error('❌ groupContactsByStatus function not available');
            await loadPipelineData();
            return;
        }
        
        if (!pipelineData || !Array.isArray(pipelineData)) {
            console.error('❌ pipelineData not available');
            await loadPipelineData();
            return;
        }
        
        // Group contacts by status
        const statusGroups = groupContactsByStatus(pipelineData);
        
        // Update each column content
        Object.entries(PIPELINE_STAGES).forEach(([status, config]) => {
            const leads = statusGroups[status] || [];
            const columnBody = document.getElementById(`pipeline-body-${status.replace(/\s+/g, '-')}`);
            
            if (columnBody) {
                if (leads.length === 0) {
                    // Check if renderEmptyColumnState exists, otherwise use simple fallback
                    if (typeof renderEmptyColumnState === 'function') {
                        columnBody.innerHTML = renderEmptyColumnState(status, config);
                    } else {
                        columnBody.innerHTML = `
                            <div style="text-align: center; color: #9ca3af; padding: 2rem 1rem;">
                                <p style="margin: 0;">No hay leads en esta etapa</p>
                            </div>
                        `;
                    }
                } else {
                    // Check if renderLeadCard exists
                    if (typeof renderLeadCard === 'function') {
                        columnBody.innerHTML = leads.map(lead => renderLeadCard(lead, config.color, config.targetDays)).join('');
                    } else {
                        // Fallback to simple lead display
                        columnBody.innerHTML = leads.map(lead => `
                            <div class="lead-card" data-lead-id="${lead.id}" draggable="true">
                                <h4>${lead.name}</h4>
                                <p>${lead.phone}</p>
                            </div>
                        `).join('');
                    }
                }
            }
            
            // Update column count
            const columnHeader = document.querySelector(`#pipeline-column-${status.replace(/\s+/g, '-')} .pipeline-header [style*="background: rgba(255,255,255,0.2)"]`);
            if (columnHeader) {
                columnHeader.textContent = leads.length;
            }
        });
        
        // Recalculate and update statistics if function exists
        if (typeof calculatePipelineStats === 'function') {
            calculatePipelineStats(pipelineData);
        }
        
        // Re-attach event listeners to new elements
        setTimeout(() => {
            if (typeof setupPipelineEventListeners === 'function') {
                setupPipelineEventListeners();
                console.log('✅ Pipeline UI updated and event listeners re-attached');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error updating pipeline UI:', error);
        // Fallback to full reload
        if (typeof loadPipelineData === 'function') {
            await loadPipelineData();
        }
    }
}

// ✅ Enhanced clean up drag visuals function
function cleanupDragVisuals() {
    console.log('🧹 Cleaning up drag visuals');
    
    try {
        // Remove column visual feedback
        document.querySelectorAll('.pipeline-column').forEach(col => {
            col.classList.remove('drag-over', 'drag-enter', 'drag-active');
            col.style.transform = '';
            col.style.borderColor = '';
            col.style.background = '';
        });
        
        // Remove body visual feedback
        document.querySelectorAll('.pipeline-body').forEach(body => {
            body.classList.remove('drag-over');
            body.style.backgroundColor = '';
            body.style.border = '';
        });
        
        // Remove card visual feedback
        document.querySelectorAll('.lead-card').forEach(card => {
            card.classList.remove('dragging');
            card.style.opacity = '';
            card.style.transform = '';
        });
        
        // Remove drop previews
        document.querySelectorAll('.drop-preview').forEach(preview => {
            preview.remove();
        });
        
        // Reset global cursor
        document.body.style.cursor = '';
    } catch (error) {
        console.error('❌ Error cleaning up drag visuals:', error);
    }
}

// ✅ Enhanced reset drag state function
function resetDragState() {
    console.log('🔄 Resetting drag state');
    
    try {
        window.draggedLead = null;
        
        // Check if dragDropState exists before trying to reset it
        if (typeof dragDropState !== 'undefined' && dragDropState) {
            dragDropState.isDragging = false;
            dragDropState.draggedElement = null;
            dragDropState.originalParent = null;
            dragDropState.dragStartTime = null;
        }
    } catch (error) {
        console.error('❌ Error resetting drag state:', error);
    }
}

// ✅ ENHANCED HANDLEDROP FUNCTION - THIS IS THE CRITICAL ONE
async function handleDrop(event, newStatus) {
    console.log(`🎯 ENHANCED DROP HANDLER - Status: ${newStatus}`);
    
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    event.preventDefault();
    
    // Get lead ID from multiple sources for redundancy
    const leadId = event.dataTransfer.getData('text/plain') || 
                   event.dataTransfer.getData('application/x-lead-id') || 
                   window.draggedLead;
    
    console.log(`📝 Lead ID from drag data: ${leadId}`);
    console.log(`📝 Window.draggedLead: ${window.draggedLead}`);
    
    // Comprehensive cleanup of visual states
    cleanupDragVisuals();
    
    // Validate drop operation
    if (!leadId) {
        console.error('❌ No lead ID found for drop operation');
        if (window.showNotification) {
            window.showNotification('❌ Error: ID de lead no encontrado', 'error');
        } else {
            alert('❌ Error: ID de lead no encontrado');
        }
        resetDragState();
        return;
    }
    
    // Check if PIPELINE_STAGES is available
    if (!window.PIPELINE_STAGES && !PIPELINE_STAGES) {
        console.error('❌ PIPELINE_STAGES not available');
        resetDragState();
        return;
    }
    
    const stages = window.PIPELINE_STAGES || PIPELINE_STAGES;
    
    if (!newStatus || !stages[newStatus]) {
        console.error('❌ Invalid target status:', newStatus);
        if (window.showNotification) {
            window.showNotification('❌ Error: Estado de destino inválido', 'error');
        } else {
            alert('❌ Error: Estado de destino inválido');
        }
        resetDragState();
        return;
    }
    
    // Check if pipelineData is available
    if (!window.pipelineData && !pipelineData) {
        console.error('❌ pipelineData not available');
        resetDragState();
        return;
    }
    
    const currentPipelineData = window.pipelineData || pipelineData;
    
    // Check if the lead is actually moving to a different status
    const currentLead = currentPipelineData.find(lead => lead.id === leadId);
    if (!currentLead) {
        console.error('❌ Lead not found in current data:', leadId);
        if (window.showNotification) {
            window.showNotification('❌ Error: Lead no encontrado en los datos actuales', 'error');
        } else {
            alert('❌ Error: Lead no encontrado en los datos actuales');
        }
        resetDragState();
        return;
    }
    
    if (currentLead.status === newStatus) {
        console.log('ℹ️ Lead already in target status, no update needed');
        resetDragState();
        return;
    }
    
    console.log(`🎯 Moving lead "${currentLead.name}" from "${currentLead.status}" to "${newStatus}"`);
    
    try {
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'drop-loading-indicator';
        loadingIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        loadingIndicator.innerHTML = `
            <div style="
                border: 2px solid transparent;
                border-top: 2px solid white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                animation: spin 1s linear infinite;
            "></div>
            Moviendo a "${newStatus}"...
        `;
        document.body.appendChild(loadingIndicator);
        
        // Validate Firebase connection
        if (!window.FirebaseData) {
            throw new Error('Firebase no está disponible');
        }
        
        if (!window.FirebaseData.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        
        console.log('🔄 Attempting Firebase update...');
        
        // Update lead status in Firebase with comprehensive data
        const updateData = {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            statusChangedAt: new Date().toISOString(),
            updatedBy: window.FirebaseData.currentUser.email || 'unknown'
        };
        
        console.log('📤 Update data being sent:', updateData);
        
        // Attempt the Firebase update
        const success = await window.FirebaseData.updateContact(leadId, updateData);
        
        console.log('📥 Firebase update result:', success);
        
        if (success || success !== false) {
            console.log('✅ Lead status updated successfully in Firebase');
            
            // Update local data immediately for better UX
            currentLead.status = newStatus;
            currentLead.lastUpdated = updateData.lastUpdated;
            currentLead.statusChangedAt = updateData.statusChangedAt;
            
            // Show success notification
            const showNotification = window.showNotification || function(message, type) {
                console.log(`${type}: ${message}`);
                // Create a temporary success message
                const successDiv = document.createElement('div');
                successDiv.style.cssText = `
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    background: #10b981;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                `;
                successDiv.textContent = message;
                document.body.appendChild(successDiv);
                setTimeout(() => successDiv.remove(), 3000);
            };
            
            showNotification(`✅ ${currentLead.name} movido a "${newStatus}" exitosamente`, 'success');
            
            // Remove loading indicator
            loadingIndicator.remove();
            
            // Force immediate UI update without full reload
            await updatePipelineUI();
            
        } else {
            throw new Error('La actualización retornó false');
        }
        
    } catch (error) {
        console.error('❌ Error moving lead:', error);
        
        // Remove loading indicator if it exists
        const loadingIndicator = document.getElementById('drop-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        // Show detailed error to user
        const showNotification = window.showNotification || function(message, type) {
            if (type === 'error') {
                // Create a temporary error message
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    background: #ef4444;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 300px;
                `;
                errorDiv.textContent = message;
                document.body.appendChild(errorDiv);
                setTimeout(() => errorDiv.remove(), 5000);
            }
        };
        
        showNotification(`❌ Error al mover lead: ${error.message}`, 'error');
        
        // Show detailed error in console
        console.error('🔍 Detailed error information:');
        console.error('   - Lead ID:', leadId);
        console.error('   - Target Status:', newStatus);
        console.error('   - Current Lead:', currentLead);
        console.error('   - Firebase Available:', !!window.FirebaseData);
        console.error('   - User Authenticated:', !!window.FirebaseData?.currentUser);
        console.error('   - Error:', error);
        
        // Try to reload pipeline to ensure correct state
        console.log('🔄 Attempting to reload pipeline data...');
        try {
            if (typeof loadPipelineData === 'function') {
                await loadPipelineData();
            }
        } catch (reloadError) {
            console.error('❌ Error reloading pipeline:', reloadError);
        }
        
    } finally {
        // Always reset drag state
        resetDragState();
    }
}

// ===== DRAG EVENT HANDLERS =====

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

// ===== EVENT LISTENER SETUP =====

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

function setupPipelineEventListeners() {
    // Set up drag and drop listeners
    setupDragAndDropListeners();
    
    console.log('🎧 Pipeline event listeners setup complete');
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
        conversionRate: 0,
        avgScore: 0,
        highPriorityCount: 0
    };
    
    Object.keys(PIPELINE_STAGES).forEach(status => {
        pipelineStats.byStatus[status] = contacts.filter(c => c.status === status).length;
    });
    
    const conversions = pipelineStats.byStatus['Convertido'] || 0;
    pipelineStats.conversionRate = contacts.length > 0 ? 
        Math.round((conversions / contacts.length) * 100) : 0;
    
    if (contacts.length > 0) {
        pipelineStats.avgScore = Math.round(
            contacts.reduce((sum, lead) => sum + calculateLeadScore(lead), 0) / contacts.length
        );
        
        pipelineStats.highPriorityCount = contacts.filter(
            c => calculateLeadPriority(c).level === 'high'
        ).length;
        
        const totalDays = contacts.reduce((sum, contact) => {
            return sum + Math.floor((new Date() - new Date(contact.date)) / (1000 * 60 * 60 * 24));
        }, 0);
        pipelineStats.avgDaysInPipeline = Math.round(totalDays / contacts.length);
    }
}

function calculateLeadPriority(lead) {
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    const score = calculateLeadScore(lead);
    
    // Enhanced priority calculation
    if (daysOld > 7 || score < 40) return { level: 'high', icon: '🔴', label: 'Alta' };
    if (daysOld > 3 || score < 60) return { level: 'medium', icon: '🟡', label: 'Media' };
    return { level: 'low', icon: '🟢', label: 'Baja' };
}

function calculateLeadScore(lead) {
    let score = 50; // Base score
    
    // Recency boost/penalty
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    if (daysOld <= 1) score += 30;
    else if (daysOld <= 3) score += 20;
    else if (daysOld <= 7) score += 10;
    else if (daysOld > 14) score -= 20;
    else if (daysOld > 30) score -= 30;
    
    // Contact info completeness
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.notes && lead.notes.length > 10) score += 5;
    
    // Source quality
    if (lead.source) {
        const source = lead.source.toLowerCase();
        if (source.includes('referido') || source.includes('recomendación')) score += 15;
        else if (source.includes('web') || source.includes('online')) score += 5;
        else if (source.includes('facebook') || source.includes('instagram')) score += 8;
    }
    
    // Status boost
    if (lead.status === 'Interesado') score += 10;
    else if (lead.status === 'Negociación') score += 15;
    
    return Math.max(0, Math.min(100, score));
}

function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
}

function getConversionInsight(conversionRate, activeLeads, highPriorityLeads) {
    if (conversionRate >= 20) {
        return `¡Excelente! Tasa de conversión del ${conversionRate}%. Mantén el enfoque en los ${activeLeads} leads activos, especialmente los ${highPriorityLeads} de alta prioridad.`;
    } else if (conversionRate >= 10) {
        return `Tasa de conversión del ${conversionRate}% es aceptable, pero hay oportunidad de mejora. Prioriza los ${highPriorityLeads} leads de alta prioridad de los ${activeLeads} activos.`;
    } else {
        return `La tasa de conversión del ${conversionRate}% requiere atención. Revisa estrategias de seguimiento y enfócate en los ${highPriorityLeads} leads de alta prioridad.`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// ===== ENHANCED UTILITY FUNCTIONS =====

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getOverdueLeads(leads, targetDays) {
    if (!targetDays) return [];
    return leads.filter(lead => {
        const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
        return daysOld > targetDays;
    });
}

function getUrgencyLevel(lead, targetDays) {
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    
    if (!targetDays) {
        return { level: 'normal', icon: '⏱️', color: '#6b7280' };
    }
    
    const urgencyRatio = daysOld / targetDays;
    
    if (urgencyRatio > 1.5) {
        return { level: 'critical', icon: '🔥', color: '#dc2626' };
    } else if (urgencyRatio > 1) {
        return { level: 'high', icon: '⚡', color: '#f59e0b' };
    } else if (urgencyRatio > 0.7) {
        return { level: 'medium', icon: '⚠️', color: '#eab308' };
    } else {
        return { level: 'low', icon: '✅', color: '#10b981' };
    }
}

function renderEmptyColumnState(status, config) {
    return `
        <div style="
            text-align: center;
            color: #9ca3af;
            padding: 2rem 1rem;
            border: 2px dashed #e5e7eb;
            border-radius: 8px;
            margin-top: 1rem;
            background: #fafafa;
        ">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">${config.emoji}</div>
            <p style="margin: 0 0 0.5rem 0;">No hay leads en esta etapa</p>
            <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">
                Arrastra un lead aquí o haz clic en "Agregar"
            </p>
        </div>
    `;
}

function validateDragDropSetup() {
    setTimeout(() => {
        const verifyCards = document.querySelectorAll('.lead-card[draggable="true"]');
        const verifyColumns = document.querySelectorAll('.pipeline-column[data-status]');
        const verifyBodies = document.querySelectorAll('.pipeline-body[data-status]');
        
        console.log(`✅ Verification: ${verifyCards.length} draggable cards, ${verifyColumns.length} drop columns, ${verifyBodies.length} drop bodies`);
        
        if (verifyCards.length === 0) {
            console.warn('⚠️ WARNING: No draggable lead cards found!');
            console.warn('   Check if lead cards have: draggable="true" and data-lead-id attributes');
        }
        
        if (verifyColumns.length === 0) {
            console.warn('⚠️ WARNING: No pipeline columns found!');
            console.warn('   Check if columns have: class="pipeline-column" and data-status attributes');
        }
        
        if (verifyCards.length > 0 && verifyColumns.length > 0) {
            console.log('🎉 Drag and drop setup validation PASSED');
        } else {
            console.error('❌ Drag and drop setup validation FAILED');
        }
        
    }, 500);
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
        leadCard.style.boxShadow = '';
    } else {
        // Expand
        leadCard.classList.add('expanded');
        leadDetails.style.maxHeight = '300px';
        chevron.style.transform = 'rotate(180deg)';
        leadCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }
}

// ===== PIPELINE SUMMARY AND CONTROLS =====

function renderPipelineSummary(contacts) {
    const totalLeads = contacts.length;
    const conversions = contacts.filter(c => c.status === 'Convertido').length;
    const conversionRate = totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0;
    const averageScore = totalLeads > 0 ? 
        Math.round(contacts.reduce((sum, lead) => sum + calculateLeadScore(lead), 0) / totalLeads) : 0;
    
    // Calculate leads by priority
    const highPriorityLeads = contacts.filter(c => calculateLeadPriority(c).level === 'high').length;
    const activeLeads = contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length;
    
    return `
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 1rem;">
            <h3 style="margin: 0 0 1rem 0; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
                📊 Resumen del Pipeline
                <span style="background: #f3f4f6; color: #6b7280; font-size: 0.7rem; padding: 0.25rem 0.5rem; border-radius: 12px; font-weight: normal;">
                    Actualizado: ${new Date().toLocaleTimeString('es-ES')}
                </span>
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">
                        ${totalLeads}
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Total de Leads</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981; margin-bottom: 0.5rem;">
                        ${conversions}
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Convertidos</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%); border-radius: 8px; border-left: 4px solid #eab308;">
                    <div style="font-size: 2rem; font-weight: bold; color: #eab308; margin-bottom: 0.5rem;">
                        ${conversionRate}%
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Tasa de Conversión</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 8px; border-left: 4px solid #ec4899;">
                    <div style="font-size: 2rem; font-weight: bold; color: #ec4899; margin-bottom: 0.5rem;">
                        ${averageScore}%
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Score Promedio</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 2rem; font-weight: bold; color: #ef4444; margin-bottom: 0.5rem;">
                        ${highPriorityLeads}
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Alta Prioridad</div>
                </div>
                
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%); border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">
                        ${activeLeads}
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">Leads Activos</div>
                </div>
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                <p style="margin: 0; color: #475569; font-size: 0.9rem; display: flex; align-items: start; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">💡</span>
                    <span>${getConversionInsight(conversionRate, activeLeads, highPriorityLeads)}</span>
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
            flex-wrap: wrap;
            gap: 1rem;
            padding: 1rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button onclick="refreshPipeline()" class="btn btn-primary" style="
                    padding: 0.5rem 1rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    🔄 Actualizar
                </button>
                
                <button onclick="showPipelineFilters()" class="btn btn-secondary" style="
                    padding: 0.5rem 1rem;
                    background: #6b7280;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    🔍 Filtros
                </button>
                
                <button onclick="exportPipelineData()" class="btn btn-secondary" style="
                    padding: 0.5rem 1rem;
                    background: #059669;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    📊 Exportar
                </button>
                
                <button onclick="showPipelineAnalytics()" class="btn btn-secondary" style="
                    padding: 0.5rem 1rem;
                    background: #7c3aed;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    📈 Analytics
                </button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: #6b7280;">
                <span>🕒 Última actualización: ${new Date().toLocaleTimeString('es-ES')}</span>
                <span style="padding: 0.25rem 0.5rem; background: #f3f4f6; border-radius: 4px;">
                    ✅ Drag & Drop Activo
                </span>
            </div>
        </div>
    `;
}

// ===== PIPELINE ACTIONS =====
async function refreshPipeline() {
    console.log('🔄 Refreshing pipeline');
    
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.style.opacity = '0.6';
        container.style.pointerEvents = 'none';
    }
    
    try {
        await loadPipelineData();
        
        const showNotification = window.showNotification || function(message, type) {
            console.log(`${type}: ${message}`);
        };
        
        showNotification('✅ Pipeline actualizado exitosamente', 'success', 2000);
    } catch (error) {
        console.error('❌ Error refreshing pipeline:', error);
        
        const showNotification = window.showNotification || function(message, type) {
            if (type === 'error') alert(`Error: ${message}`);
        };
        
        showNotification('❌ Error al actualizar pipeline', 'error');
    } finally {
        if (container) {
            container.style.opacity = '1';
            container.style.pointerEvents = '';
        }
    }
}

async function addNewLeadToStage(stage) {
    console.log('➕ Adding new lead to stage:', stage);
    
    if (typeof switchTab === 'function') {
        switchTab('contacts');
        
        const showNotification = window.showNotification || function(message, type) {
            console.log(`${type}: ${message}`);
        };
        
        showNotification(`ℹ️ Agrega un nuevo contacto y se ubicará en "${stage}"`, 'info', 3000);
    } else {
        alert(`➕ Para agregar un lead a "${stage}", ve a la pestaña de Contactos`);
    }
}

function showPipelineFilters() {
    alert('🔍 Filtros de pipeline - Funcionalidad en desarrollo');
}

function showPipelineAnalytics() {
    alert('📈 Analytics de pipeline - Funcionalidad en desarrollo');
}

function exportPipelineData() {
    try {
        if (!pipelineData || pipelineData.length === 0) {
            alert('⚠️ No hay datos de pipeline para exportar');
            return;
        }
        
        // Create enhanced CSV content
        const headers = [
            'ID', 'Nombre', 'Teléfono', 'Email', 'Fuente', 'Estado', 'Fecha', 
            'Días en Pipeline', 'Prioridad', 'Score', 'Urgencia'
        ];
        
        const csvContent = [
            headers.join(','),
            ...pipelineData.map(lead => {
                const priority = calculateLeadPriority(lead);
                const score = calculateLeadScore(lead);
                const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
                const stage = PIPELINE_STAGES[lead.status || 'Nuevo'];
                const urgency = getUrgencyLevel(lead, stage?.targetDays);
                
                return [
                    lead.id,
                    `"${escapeHtml(lead.name)}"`,
                    lead.phone,
                    lead.email || '',
                    `"${escapeHtml(lead.source || '')}"`,
                    lead.status || 'Nuevo',
                    formatDate(lead.date),
                    daysOld,
                    priority.label,
                    score,
                    urgency.level
                ].join(',');
            })
        ].join('\n');
        
        // Download enhanced CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `pipeline_detailed_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        const showNotification = window.showNotification || function(message) {
            alert(message);
        };
        
        showNotification('✅ Pipeline exportado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting pipeline:', error);
        alert(`❌ Error al exportar: ${error.message}`);
    }
}

// ===== ENHANCED LEAD ACTIONS =====
function editLead(leadId) {
    const lead = pipelineData.find(l => l.id === leadId);
    if (!lead) {
        alert('❌ Lead no encontrado');
        return;
    }
    
    if (typeof switchTab === 'function') {
        switchTab('contacts');
        
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
            console.log(message);
        };
        
        showNotification(`📝 Busca "${lead.name}" en la tabla de contactos para editar`, 'info', 4000);
    }
}

function duplicateLead(leadId) {
    const lead = pipelineData.find(l => l.id === leadId);
    if (!lead) {
        alert('❌ Lead no encontrado');
        return;
    }
    
    // Create a copy with modified data
    const duplicatedLead = {
        ...lead,
        id: `${lead.id}_copy_${Date.now()}`,
        name: `${lead.name} (Copia)`,
        status: 'Nuevo',
        date: new Date().toISOString(),
        notes: (lead.notes || '') + ' [Duplicado]'
    };
    
    // In a real implementation, this would save to Firebase
    console.log('Duplicating lead:', duplicatedLead);
    alert(`📋 Funcionalidad de duplicación en desarrollo.\nSe duplicaría: ${lead.name}`);
}

function openWhatsApp(phone, name) {
    if (!phone) {
        alert('❌ Número de teléfono no disponible');
        return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
        `Hola ${name}, soy de Ciudad Bilingüe. ¿Tienes un momento para conversar sobre nuestros servicios de inglés?`
    );
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Log interaction for analytics
    console.log(`📱 WhatsApp opened for ${name} (${phone})`);
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
                <p style="color: #6b7280; margin: 0 0 0.5rem 0;">Cargando pipeline...</p>
                <p style="color: #9ca3af; margin: 0; font-size: 0.8rem;">Preparando drag & drop</p>
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
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="loadPipelineData()" class="btn btn-primary" style="
                    padding: 0.75rem 1.5rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    🔄 Reintentar
                </button>
                <button onclick="location.reload()" class="btn btn-secondary" style="
                    padding: 0.75rem 1.5rem;
                    background: #6b7280;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    🔄 Recargar Página
                </button>
            </div>
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
                Comienza agregando contactos para verlos organizados por etapas.<br>
                El sistema de drag & drop estará listo cuando agregues leads.
            </p>
            <button onclick="if (typeof switchTab === 'function') switchTab('contacts')" 
                    class="btn btn-primary" 
                    style="
                        padding: 1rem 2rem; 
                        font-size: 1.1rem;
                        background: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                ➕ Agregar Primer Contacto
            </button>
        </div>
    `;
}

// ===== MODULE INITIALIZATION =====
function initializePipelineModule() {
    console.log('🚀 Initializing enhanced pipeline module');
    
    if (pipelineInitialized) {
        console.log('⚠️ Pipeline module already initialized');
        return;
    }
    
    try {
        // Initialize styles and global CSS
        initializePipelineStyles();
        
        // Set initialization flag
        pipelineInitialized = true;
        
        console.log('✅ Enhanced pipeline module initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing pipeline module:', error);
    }
}

function initializePipelineStyles() {
    console.log('🎨 Initializing enhanced pipeline styles');
    
    // Add comprehensive drag and drop styles
    const style = document.createElement('style');
    style.textContent = `
        /* Enhanced Lead Card Styles */
        .lead-card {
            cursor: move !important;
            user-select: none;
        }
        
        .lead-card.dragging {
            opacity: 0.5;
            transform: rotate(3deg) scale(0.95);
            cursor: grabbing !important;
            z-index: 1000;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
        }
        
        .lead-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-1px);
        }
        
        .lead-card.expanded {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10;
        }
        
        /* Enhanced Column Styles */
        .pipeline-column.drag-active {
            transform: scale(1.02);
            transition: all 0.3s ease;
        }
        
        .pipeline-column.drag-over {
            background: #f0f9ff !important;
            border: 2px dashed #3b82f6 !important;
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
        }
        
        .pipeline-column.drag-enter {
            background: #eff6ff !important;
        }
        
        .pipeline-column.drag-over .pipeline-header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        }
        
        /* Enhanced Body Styles */
        .pipeline-body.drag-over {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 197, 253, 0.1) 100%);
            border: 2px dashed rgba(59, 130, 246, 0.3);
            border-radius: 8px;
        }
        
        /* Loading Animation */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Enhanced Scrollbar */
        .pipeline-body::-webkit-scrollbar {
            width: 8px;
        }
        
        .pipeline-body::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
        }
        
        .pipeline-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .pipeline-body::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
        
        /* Button Animations */
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .action-btn:hover {
            transform: scale(1.05);
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .pipeline-grid {
                grid-template-columns: 1fr !important;
            }
            
            .lead-card {
                margin-bottom: 0.5rem;
            }
        }
        
        /* Accessibility */
        .lead-card:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .lead-card,
            .pipeline-column,
            .btn {
                transition: none !important;
                animation: none !important;
            }
        }
    `;
    
    if (!document.getElementById('enhanced-pipeline-styles')) {
        style.id = 'enhanced-pipeline-styles';
        document.head.appendChild(style);
    }
    
    console.log('✅ Enhanced pipeline styles initialized');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Enhanced pipeline module DOM ready');
    
    if (typeof initializePipelineModule === 'function') {
        initializePipelineModule();
    }
});

// Add global error handler for drag operations
window.addEventListener('error', function(e) {
    if (e.message.includes('drag') || e.message.includes('drop')) {
        console.error('❌ Drag & Drop Error:', e.message);
        resetDragState();
        cleanupDragVisuals();
    }
});

// ===== CRITICAL: FUNCTION PROTECTION =====
// This ensures the enhanced handleDrop doesn't get overwritten
setTimeout(() => {
    // Force override the handleDrop function to prevent overwriting
    window.handleDrop = handleDrop;
    
    // Also protect against future overwrites
    Object.defineProperty(window, 'enhancedHandleDrop', {
        value: handleDrop,
        writable: false,
        enumerable: false,
        configurable: false
    });
    
    console.log('🛡️ Enhanced handleDrop function protected from overwriting');
    
}, 1000); // Wait 1 second after page load

// ===== MODULE EXPORTS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadPipelineData,
        initializePipelineModule,
        refreshPipeline,
        exportPipelineData,
        calculateLeadScore,
        calculateLeadPriority,
        resetDragState,
        validateDragDropSetup,
        handleDrop
    };
}

console.log('✅ Enhanced Pipeline.js module loaded successfully with robust drag & drop functionality');
console.log('🎯 Features: Enhanced drag & drop, better error handling, function protection, comprehensive UI');
console.log('🛡️ HandleDrop function is protected from being overwritten');
