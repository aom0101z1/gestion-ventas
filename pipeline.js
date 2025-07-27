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
    console.log('🎯 Actualizando pipeline');
    createPipelineBoard();
    loadPipelineData();
    setupDragAndDrop();
}

function createPipelineBoard() {
    const container = document.getElementById('pipelineContainer');
    if (!container) {
        console.log('❌ Contenedor de pipeline no encontrado');
        return;
    }

    console.log('🏗️ Creando tablero de pipeline');
    container.innerHTML = pipelineStages.map(stage => `
        <div class="pipeline-column" id="column-${stage.id}" data-stage="${stage.id}">
            <div class="pipeline-header" style="border-left: 4px solid ${stage.color};">
                <strong>${stage.name}</strong>
                <span id="count-${stage.id}" style="background: ${stage.color}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">0</span>
            </div>
            <div class="pipeline-cards" id="cards-${stage.id}"></div>
        </div>
    `).join('');
    
    console.log('✅ Tablero de pipeline creado');
}

function loadPipelineData() {
    if (!window.AdminData) {
        console.log('❌ AdminData not available for pipeline');
        return;
    }
    
    const data = getFilteredData();
    
    console.log('📊 Loading pipeline data from AdminData');
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
        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">📍 ${lead.source}</div>
        ${lead.notes ? `<div style="font-size: 0.75rem; color: #888; background: #f9fafb; padding: 0.3rem; border-radius: 4px; margin-top: 0.5rem;">💬 ${lead.notes.substring(0, 50)}${lead.notes.length > 50 ? '...' : ''}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.7rem; color: #888;">
            <span>${currentUser.role === 'director' ? '📅' : '👤'} ${currentUser.role === 'director' ? formatDate(lead.date) : getUserDisplayName(lead.salesperson)}</span>
            <span>${currentUser.role === 'director' ? lead.time : formatDate(lead.date)}</span>
        </div>
    `;
    return card;
}

// ===== DRAG & DROP FUNCTIONS =====
function setupDragAndDrop() {
    console.log('🖱️ Configurando drag & drop');
    
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
    
    console.log('✅ Drag & drop configurado');
}

function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    console.log('🖱️ Drag iniciado para lead:', this.dataset.leadId);
    
    // Store the lead ID for transfer
    e.dataTransfer.setData('text/plain', this.dataset.leadId);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedCard = null;
    console.log('🖱️ Drag terminado');
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
    
    console.log('🎯 Drop detectado - Lead ID:', leadId, 'Nueva etapa:', newStage);
    
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
        
        // Refresh pipeline to show updated positions
        refreshPipeline();
        
        // Update other views (AdminData observers will handle this automatically)
        
        // Show success message
        console.log(`✅ ${updatedLead.name} moved to ${stage.name}`);
        
        // Show notification
        showNotification(`✅ ${updatedLead.name} → ${stage.name}`, 'success');
    } else {
        console.error('❌ Failed to update lead status');
        refreshPipeline(); // Refresh to restore original position
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
}
