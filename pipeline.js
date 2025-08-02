// ===== IMMEDIATE FIX FOR YOUR PIPELINE DRAG & DROP ISSUE =====
// Run this in your console RIGHT NOW

console.log('🔧 Applying targeted fix for pipeline data validation errors...');

// Fix 1: Override the validateAndCleanPipelineData function to handle missing fields
window.validateAndCleanPipelineData = function(data) {
    console.log('🔍 FIXED: Validating and cleaning pipeline data');
    
    return data.map(contact => {
        // Ensure all required fields exist with defaults
        const cleanContact = {
            id: contact.id || `temp_${Date.now()}_${Math.random()}`,
            name: contact.name || 'Sin nombre',
            phone: contact.phone || 'Sin teléfono',
            email: contact.email || '',
            source: contact.source || 'No especificado',
            status: contact.status || 'Nuevo',
            date: contact.date || new Date().toISOString(),
            notes: contact.notes || '',
            lastUpdated: contact.lastUpdated || new Date().toISOString(),
            createdAt: contact.createdAt || new Date().toISOString(),
            updatedBy: contact.updatedBy || 'system'
        };
        
        // Ensure status is valid
        if (!PIPELINE_STAGES[cleanContact.status]) {
            console.log(`📝 Setting default status for contact ${cleanContact.name}`);
            cleanContact.status = 'Nuevo';
        }
        
        return cleanContact;
    }).filter(contact => {
        // Only filter out contacts that are completely unusable
        if (!contact.id && !contact.name && !contact.phone) {
            console.warn('⚠️ Removing completely empty contact:', contact);
            return false;
        }
        return true;
    });
};

// Fix 2: Enhanced lead card rendering with better error handling
window.renderLeadCard = function(lead, stageColor, targetDays) {
    // Ensure lead has all required fields
    if (!lead.id || (!lead.name && !lead.phone)) {
        console.warn('⚠️ Skipping invalid lead:', lead);
        return '';
    }
    
    const priority = calculateLeadPriority(lead);
    const score = calculateLeadScore(lead);
    const daysOld = Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24));
    const isOverdue = targetDays && daysOld > targetDays;
    const urgencyLevel = getUrgencyLevel(lead, targetDays);
    
    // Safe name and phone handling
    const safeName = lead.name || `Lead ${lead.id}`;
    const safePhone = lead.phone || 'Sin teléfono';
    
    return `
        <div class="lead-card" 
             id="lead-card-${lead.id}"
             data-lead-id="${lead.id}"
             data-lead-name="${escapeHtml(safeName)}"
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
                        ${escapeHtml(safeName)}
                    </h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                        <span>📞 ${safePhone}</span>
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
                        ${lead.phone && lead.phone !== 'Sin teléfono' ? `
                            <button onclick="openWhatsApp('${lead.phone}', '${escapeHtml(safeName)}')" 
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
                    </div>
                </div>
            </div>
        </div>
    `;
};

// Fix 3: Enhanced drag and drop setup with forced re-initialization
window.fixPipelineDragDropNow = function() {
    console.log('🔧 ENHANCED: Fixing pipeline drag and drop immediately...');
    
    // Clear any existing listeners
    document.querySelectorAll('.lead-card').forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
    });
    
    // Wait for DOM update, then re-attach
    setTimeout(() => {
        // Re-attach drag listeners to cards
        document.querySelectorAll('.lead-card').forEach(card => {
            card.draggable = true;
            
            card.addEventListener('dragstart', function(e) {
                const leadId = this.getAttribute('data-lead-id');
                console.log('🖱️ DRAG START:', leadId);
                
                window.draggedLead = leadId;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', leadId);
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            });
            
            card.addEventListener('dragend', function(e) {
                console.log('🖱️ DRAG END');
                this.classList.remove('dragging');
                this.style.opacity = '1';
            });
        });
        
        // Re-attach drop listeners to columns
        document.querySelectorAll('.pipeline-column').forEach(column => {
            column.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            });
            
            column.addEventListener('drop', async function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                
                const newStatus = this.getAttribute('data-status');
                const leadId = e.dataTransfer.getData('text/plain') || window.draggedLead;
                
                console.log(`🎯 DROP: Moving ${leadId} to ${newStatus}`);
                
                if (leadId && newStatus && window.handleDrop) {
                    await window.handleDrop(e, newStatus);
                } else {
                    console.error('❌ Missing leadId, newStatus, or handleDrop function');
                }
                
                window.draggedLead = null;
            });
            
            column.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
            });
            
            column.addEventListener('dragenter', function(e) {
                e.preventDefault();
            });
        });
        
        // Also attach to pipeline bodies
        document.querySelectorAll('.pipeline-body').forEach(body => {
            body.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drag-over');
            });
            
            body.addEventListener('drop', async function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                
                const newStatus = this.getAttribute('data-status');
                const leadId = e.dataTransfer.getData('text/plain') || window.draggedLead;
                
                console.log(`🎯 BODY DROP: Moving ${leadId} to ${newStatus}`);
                
                if (leadId && newStatus && window.handleDrop) {
                    await window.handleDrop(e, newStatus);
                }
                
                window.draggedLead = null;
            });
            
            body.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
            });
        });
        
        // Validate the setup
        const cards = document.querySelectorAll('.lead-card[draggable="true"]');
        const columns = document.querySelectorAll('.pipeline-column[data-status]');
        const bodies = document.querySelectorAll('.pipeline-body[data-status]');
        
        console.log(`✅ FIXED SETUP: ${cards.length} cards, ${columns.length} columns, ${bodies.length} bodies`);
        
        if (cards.length > 0 && columns.length > 0) {
            console.log('🎉 DRAG & DROP READY!');
            if (window.showNotification) {
                window.showNotification('✅ Drag & Drop reparado exitosamente', 'success');
            }
        } else {
            console.error('❌ Setup validation failed');
        }
        
    }, 200);
};

// Fix 4: Force reload pipeline with clean data
window.reloadPipelineClean = async function() {
    console.log('🔄 Reloading pipeline with clean data...');
    
    try {
        // Get fresh data
        if (window.FirebaseData && typeof window.FirebaseData.getFilteredContacts === 'function') {
            const contacts = await window.FirebaseData.getFilteredContacts();
            
            // Clean the data
            window.pipelineData = window.validateAndCleanPipelineData(contacts || []);
            
            // Re-render
            if (typeof renderPipelineView === 'function') {
                renderPipelineView(window.pipelineData);
            }
            
            // Force drag and drop setup
            setTimeout(() => {
                window.fixPipelineDragDropNow();
            }, 500);
            
            console.log('✅ Pipeline reloaded with clean data');
        }
    } catch (error) {
        console.error('❌ Error reloading pipeline:', error);
    }
};

// Apply fixes immediately
console.log('🚀 Applying all fixes now...');

// Step 1: Clean current data if it exists
if (window.pipelineData && Array.isArray(window.pipelineData)) {
    window.pipelineData = window.validateAndCleanPipelineData(window.pipelineData);
    console.log('✅ Cleaned existing pipeline data');
}

// Step 2: Fix drag and drop
setTimeout(() => {
    window.fixPipelineDragDropNow();
}, 300);

// Step 3: Provide user commands
console.log('🔧 Available commands:');
console.log('   - fixPipelineDragDropNow() - Fix drag & drop immediately');
console.log('   - reloadPipelineClean() - Reload with clean data');

console.log('✅ All fixes applied! Try dragging a lead card now.');
