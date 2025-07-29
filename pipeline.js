// ===== PIPELINE MANAGEMENT =====

// Pipeline stages
const pipelineStages = [
    { id: 'nuevo', name: 'Nuevo', color: '#f59e0b', status: 'Nuevo' },
    { id: 'contactado', name: 'Contactado', color: '#3b82f6', status: 'Contactado' },
    { id: 'interesado', name: 'Interesado', color: '#8b5cf6', status: 'Interesado' },
    { id: 'negociacion', name: 'Negociación', color: '#f97316', status: 'Negociación' },
    { id: 'convertido', name: 'Convertido', color: '#10b981', status: 'Convertido' },
    { id: 'perdido', name: 'Perdido', color: '#ef4444', status: 'Perdido' }
];

// Drag and drop variables
let draggedCard = null;

// ===== PIPELINE FUNCTIONS =====
function refreshPipeline() {
    console.log('🎯 Refreshing pipeline for user:', currentUser?.username, currentUser?.role);
    
    if (!window.AdminData) {
        console.log('❌ AdminData not available, cannot refresh pipeline');
        return;
    }
    
    createPipelineBoard();
    loadPipelineData();
    setupDragAndDrop();
    
    console.log('✅ Pipeline refreshed successfully');
}

function createPipelineBoard() {
    const container = document.getElementById('pipelineContainer');
    if (!container) {
        console.log('❌ Pipeline container not found');
        return;
    }

    console.log('🏗️ Creating pipeline board');
    container.innerHTML = pipelineStages.map(stage => `
        <div class="pipeline-column" id="column-${stage.id}" data-stage="${stage.id}">
            <div class="pipeline-header" style="border-left: 4px solid ${stage.color};">
                <strong>${stage.name}</strong>
                <span id="count-${stage.id}" style="background: ${stage.color}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">0</span>
            </div>
            <div class="pipeline-cards" id="cards-${stage.id}"></div>
        </div>
    `).join('');
    
    console.log('✅ Pipeline board created');
}

function loadPipelineData() {
    if (!window.AdminData) {
        console.log('❌ AdminData not available for pipeline data loading');
        return;
    }
    
    console.log('📊 Loading pipeline data from AdminData');
    
    // Get filtered data based on user role
    const data = getFilteredData();
    
    console.log(`   - Total leads for pipeline: ${data.length}`);
    console.log(`   - User: ${currentUser.role} (${currentUser.username})`);
    
    // Clear all containers first
    pipelineStages.forEach(stage => {
        const container = document.getElementById(`cards-${stage.id}`);
        if (container) container.innerHTML = '';
    });

    // Add leads to appropriate stages
    data.forEach(lead => {
        const stageId = getStageIdFromStatus(lead.status);
        const container = document.getElementById(`cards-${stageId}`);
        if (container) {
            const card = createLeadCard(lead);
            container.appendChild(card);
        } else {
            console.warn('⚠️ Container not found for stage:', stageId);
        }
    });

    updatePipelineCounters();
    
    console.log('✅ Pipeline data loaded from AdminData');
    
    // Debug: Show leads per stage
    pipelineStages.forEach(stage => {
        const container = document.getElementById(`cards-${stage.id}`);
        const count = container ? container.children.length : 0;
        console.log(`   - ${stage.name}: ${count} leads`);
    });
}

function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'pipeline-card';
    card.dataset.leadId = lead.id;
    card.draggable = true;
    
    const daysSinceContact = getDaysSinceContact(lead.date);
    const urgencyColor = daysSinceContact > 3 ? '#ef4444' : daysSinceContact > 1 ? '#f59e0b' : '#10b981';
    
    // Show salesperson info only for directors
    const salespersonInfo = currentUser.role === 'director' 
        ? `<div style="font-size: 0.7rem; color: #667eea; margin-bottom: 0.5rem; font-weight: 600;">👤 ${getUserDisplayName(lead.salesperson)}</div>`
        : '';
    
    card.innerHTML = `
        ${salespersonInfo}
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <strong style="font-size: 0.9rem; line-height: 1.2;">${lead.name}</strong>
            <span style="background: ${urgencyColor}; color: white; padding: 0.1rem 0.3rem; border-radius: 8px; font-size: 0.7rem;">
                ${daysSinceContact}d
            </span>
        </div>
        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">📞 ${lead.phone}</div>
        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">📍 ${lead.source.length > 20 ? lead.source.substring(0, 20) + '...' : lead.source}</div>
        ${lead.notes ? `<div style="font-size: 0.75rem; color: #888; background: #f9fafb; padding: 0.3rem; border-radius: 4px; margin-top: 0.5rem;">💬 ${lead.notes.substring(0, 50)}${lead.notes.length > 50 ? '...' : ''}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.7rem; color: #888;">
            <span>📅 ${formatDate(lead.date)}</span>
            <span>⏰ ${lead.time || '00:00'}</span>
        </div>
    `;
    return card;
}

// ===== DRAG & DROP FUNCTIONS =====
function setupDragAndDrop() {
    console.log('🖱️ Setting up drag & drop');
    
    // Add drag event listeners to all cards
    document.querySelectorAll('.pipeline-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    // Add drop event listeners to all columns
    document.querySelectorAll('.pipeline-column').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
    
    console.log('✅ Drag & drop configured');
}

function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    console.log('🖱️ Drag started for lead:', this.dataset.leadId);
    
    // Store the lead ID for transfer
    e.dataTransfer.setData('text/plain', this.dataset.leadId);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedCard = null;
    console.log('🖱️ Drag ended');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    if (e.target.classList.contains('pipeline-column') || e.target.classList.contains('pipeline-cards')) {
        const column = e.target.classList.contains('pipeline-column') ? e.target : e.target.closest('.pipeline-column');
        if (column) {
            column.classList.add('drag-over');
        }
    }
}

function handleDragLeave(e) {
    // Only remove drag-over if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const leadId = e.dataTransfer.getData('text/plain');
    const column = e.currentTarget;
    const newStage = column.dataset.stage;
    
    console.log('🎯 Drop detected - Lead ID:', leadId, 'New stage:', newStage);
    
    if (leadId && newStage) {
        updateLeadStatus(leadId, newStage);
    }
}

function updateLeadStatus(leadId, newStageId) {
    console.log('🔄 Updating lead status in AdminData:', leadId, 'to stage:', newStageId);
    
    if (!window.AdminData) {
        console.error('❌ AdminData not available');
        alert('❌ Sistema no disponible');
        return;
    }
    
    // Find the lead in AdminData
    const allData = AdminData.getAllData();
    const lead = allData.find(lead => lead.id == leadId);
    if (!lead) {
        console.error('❌ Lead not found:', leadId);
        return;
    }

    // Check permissions - salespeople can only update their own leads
    if (currentUser.role !== 'director' && lead.salesperson !== currentUser.username) {
        alert('❌ Solo puedes modificar tus propios leads');
        refreshPipeline(); // Refresh to restore original position
        return;
    }

    // Get new status from stage
    const stage = pipelineStages.find(s => s.id === newStageId);
    if (!stage) {
        console.error('❌ Stage not found:', newStageId);
        return;
    }

    // Update the lead status using AdminData
    const oldStatus = lead.status;
    const updatedLead = AdminData.updateContact(leadId, { status: stage.status });
    
    if (updatedLead) {
        console.log(`✅ Status updated in AdminData from "${oldStatus}" to "${stage.status}"`);
        
        // Save to GitHub if available
        if (window.GitHubData && window.GitHubData.getToken()) {
            window.GitHubData.updateContact(leadId, { status: stage.status }).catch(error => {
                console.log('⚠️ GitHub update failed, but local update succeeded:', error.message);
            });
        }
        
        // Refresh pipeline to show updated positions
        setTimeout(() => {
            refreshPipeline();
            // Also update other views
            if (typeof updateAllViews === 'function') {
                updateAllViews();
            }
        }, 100);
        
        // Show notification
        showNotification(`✅ ${updatedLead.name} → ${stage.name}`, 'success');
    } else {
        console.error('❌ Failed to update lead status');
        refreshPipeline(); // Refresh to restore original position
        alert('❌ Error al actualizar el estado del lead');
    }
}

// ===== UTILITY FUNCTIONS =====
function getStageIdFromStatus(status) {
    const mapping = {
        'Nuevo': 'nuevo',
        'Contactado': 'contactado', 
        'Interesado': 'interesado',
        'Negociación': 'negociacion',
        'Convertido': 'convertido',
        'Perdido': 'perdido'
    };
    return mapping[status] || 'nuevo';
}

function getDaysSinceContact(dateString) {
    const contactDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - contactDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function updatePipelineCounters() {
    pipelineStages.forEach(stage => {
        const container = document.getElementById(`cards-${stage.id}`);
        const counter = document.getElementById(`count-${stage.id}`);
        if (container && counter) {
            counter.textContent = container.children.length;
        }
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#667eea'};
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ===== DEBUGGING =====
function debugPipeline() {
    console.log('🔍 PIPELINE DEBUG INFO WITH ADMINDATA:');
    console.log(`   - Usuario: ${currentUser.role} (${currentUser.username})`);
    
    if (!window.AdminData) {
        console.log('❌ AdminData not available');
        return;
    }
    
    const allData = AdminData.getAllData();
    console.log(`   - Total leads en AdminData: ${allData.length}`);
    
    const filtered = getFilteredData();
    console.log(`   - Leads filtrados para usuario: ${filtered.length}`);
    
    // Show leads by status
    pipelineStages.forEach(stage => {
        const leadsInStage = filtered.filter(l => l.status === stage.status);
        console.log(`   - ${stage.name}: ${leadsInStage.length} leads`);
        leadsInStage.forEach(lead => {
            console.log(`     * ${lead.name} (${lead.salesperson})`);
        });
    });
    
    // Show salespeople data if director
    if (currentUser.role === 'director') {
        const teamStats = AdminData.getTeamStats();
        console.log(`   - Vendedores en AdminData: ${teamStats.salespeople.length}`);
        teamStats.salespeople.forEach(sp => {
            console.log(`     * ${sp.displayName}: ${sp.stats.totalContacts} leads totales`);
        });
    }
    
    // Show AdminData stats
    const stats = currentUser.role === 'director' 
        ? AdminData.getTeamStats() 
        : AdminData.getSalespersonStats(currentUser.username);
    console.log('📊 AdminData Stats:', stats);
    
    // Return debug info for alert
    return {
        user: currentUser,
        totalInAdmin: allData.length,
        filteredForUser: filtered.length,
        stageBreakdown: pipelineStages.map(stage => ({
            stage: stage.name,
            count: filtered.filter(l => l.status === stage.status).length
        })),
        stats: stats
    };
}

// Add a manual debug function that can be called from the UI
function showPipelineDebug() {
    const debugInfo = debugPipeline();
    if (debugInfo) {
        let message = `🔍 PIPELINE DEBUG\n\n`;
        message += `Usuario: ${debugInfo.user.username} (${debugInfo.user.role})\n`;
        message += `Total en AdminData: ${debugInfo.totalInAdmin}\n`;
        message += `Filtrado para usuario: ${debugInfo.filteredForUser}\n\n`;
        message += `Distribución por etapa:\n`;
        debugInfo.stageBreakdown.forEach(item => {
            message += `• ${item.stage}: ${item.count}\n`;
        });
        message += `\nEstadísticas:\n`;
        message += `• Total contactos: ${debugInfo.stats.totalContacts}\n`;
        message += `• Contactos hoy: ${debugInfo.stats.todayContacts}\n`;
        message += `• Leads activos: ${debugInfo.stats.activeLeads}\n`;
        message += `• Conversiones: ${debugInfo.stats.conversions}\n`;
        
        alert(message);
    }
}

// ===== MOBILE SUPPORT =====
function setupMobileTouch() {
    // Add touch support for mobile devices
    document.querySelectorAll('.pipeline-card').forEach(card => {
        let isDragging = false;
        let startY = 0;
        let startX = 0;
        
        card.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
            card.classList.add('dragging');
        });
        
        card.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaY = touch.clientY - startY;
            const deltaX = touch.clientX - startX;
            
            card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });
        
        card.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            card.classList.remove('dragging');
            card.style.transform = '';
            
            // Find column under touch point
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const column = elementBelow?.closest('.pipeline-column');
            
            if (column && column.dataset.stage) {
                const leadId = card.dataset.leadId;
                const newStage = column.dataset.stage;
                updateLeadStatus(leadId, newStage);
            }
        });
    });
}
