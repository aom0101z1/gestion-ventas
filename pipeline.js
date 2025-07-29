// ===== PIPELINE ENHANCED WITH DEBUGGING =====

// Add this to your pipeline.js file - replace the problematic functions

// ===== ENHANCED INITIALIZATION WITH DEBUG ALERTS =====
async function initializePipeline() {
    console.log('🎯 Initializing Firebase Pipeline...');
    
    try {
        // Step 1: Check Firebase
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            throw new Error('Firebase not available or user not authenticated');
        }
        
        // Step 2: Get user profile
        console.log('👤 Loading user profile...');
        currentUserProfile = await window.FirebaseData.loadUserProfile();
        isDirector = currentUserProfile?.role === 'director';
        
        console.log('✅ User loaded:', currentUserProfile?.name, '- Role:', currentUserProfile?.role);
        
        // Step 3: Load data
        console.log('📊 Loading pipeline data...');
        await loadPipelineData();
        
        console.log('✅ Data loaded:', pipelineData.length, 'contacts');
        
        // Step 4: Render
        console.log('🎨 Rendering pipeline...');
        renderPipeline();
        
        console.log('✅ Pipeline initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing pipeline:', error);
        showPipelineError(`Error de inicialización: ${error.message}`);
    }
}

// ===== ENHANCED DATA LOADING =====
async function loadPipelineData() {
    try {
        console.log('📊 Loading pipeline data from Firebase...');
        
        if (!window.FirebaseData) {
            throw new Error('Firebase not available');
        }
        
        let allContacts = [];
        
        // Try multiple methods to get contacts
        if (typeof window.FirebaseData.getFilteredContacts === 'function') {
            console.log('✅ Using getFilteredContacts()');
            allContacts = await window.FirebaseData.getFilteredContacts();
        } else if (window.FirebaseData.contacts) {
            console.log('✅ Using direct contacts access');
            allContacts = Object.entries(window.FirebaseData.contacts).map(([id, contact]) => ({
                id,
                ...contact
            }));
            
            // Filter by user if not director
            if (!isDirector && currentUserProfile && window.FirebaseData.currentUser) {
                allContacts = allContacts.filter(contact => 
                    contact.salespersonId === window.FirebaseData.currentUser.uid
                );
            }
        } else {
            throw new Error('No contacts data available');
        }
        
        // Normalize status
        pipelineData = allContacts.map(contact => ({
            ...contact,
            status: normalizeStatus(contact.status || 'Nuevo')
        }));
        
        console.log(`✅ Loaded ${pipelineData.length} contacts for pipeline`);
        
        // Debug: show first contact
        if (pipelineData.length > 0) {
            console.log('📋 Sample contact:', pipelineData[0]);
        }
        
    } catch (error) {
        console.error('❌ Error loading pipeline data:', error);
        pipelineData = [];
        throw error;
    }
}

// ===== ENHANCED RENDERING WITH ERROR HANDLING =====
function renderPipeline() {
    const container = document.getElementById('pipelineContainer');
    if (!container) {
        console.error('❌ Pipeline container not found');
        showPipelineError('Container #pipelineContainer no encontrado');
        return;
    }
    
    try {
        console.log('🎨 Rendering pipeline with', pipelineData.length, 'contacts');
        
        if (pipelineData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #6b7280;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <h3>No hay contactos disponibles</h3>
                    <p>Agrega algunos contactos en la pestaña "Leads" para verlos aquí.</p>
                    <button onclick="refreshPipeline()" class="btn btn-primary" style="margin-top: 1rem;">
                        🔄 Actualizar
                    </button>
                </div>
            `;
            return;
        }
        
        // Create pipeline columns
        const pipelineHTML = PIPELINE_STAGES.map(stage => {
            const stageContacts = pipelineData.filter(contact => 
                normalizeStatus(contact.status) === stage.id
            );
            
            console.log(`📊 Stage ${stage.name}: ${stageContacts.length} contacts`);
            
            return `
                <div class="pipeline-column" data-stage="${stage.id}">
                    <div class="pipeline-header" style="background: ${stage.color}; color: ${stage.textColor};">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span>${stage.icon}</span>
                            <span style="font-weight: 600;">${stage.name}</span>
                        </div>
                        <span style="background: rgba(0,0,0,0.1); padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">
                            ${stageContacts.length}
                        </span>
                    </div>
                    <div class="pipeline-cards" id="cards-${stage.id}">
                        ${stageContacts.map(contact => renderPipelineCard(contact)).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = pipelineHTML;
        
        // Setup drag and drop
        setupDragAndDrop();
        
        console.log('✅ Pipeline rendered successfully');
        console.log('📊 Columns created:', document.querySelectorAll('.pipeline-column').length);
        console.log('📋 Cards created:', document.querySelectorAll('.pipeline-card').length);
        
    } catch (error) {
        console.error('❌ Error rendering pipeline:', error);
        showPipelineError(`Error al renderizar: ${error.message}`);
    }
}

// ===== ENHANCED ERROR DISPLAY =====
function showPipelineError(message) {
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 2rem; color: #dc2626; max-width: 500px; margin: 0 auto;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 1rem;">Error en Pipeline</h3>
                    <p style="margin-bottom: 1.5rem;">${message}</p>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="refreshPipeline()" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            🔄 Reintentar
                        </button>
                        <button onclick="showDebugInfo()" style="background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            🔍 Ver Info
                        </button>
                        <button onclick="forceReload()" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            🚨 Forzar Recarga
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// ===== DEBUG INFO FUNCTION =====
function showDebugInfo() {
    const info = `🔍 INFORMACIÓN DE DEBUG

📊 DATOS:
- Contactos cargados: ${pipelineData.length}
- Usuario: ${currentUserProfile?.name || 'No disponible'}
- Rol: ${currentUserProfile?.role || 'No disponible'}
- Es Director: ${isDirector ? 'SÍ' : 'NO'}

🔥 FIREBASE:
- Firebase disponible: ${window.FirebaseData ? 'SÍ' : 'NO'}
- Usuario autenticado: ${window.FirebaseData?.currentUser ? 'SÍ' : 'NO'}
- Email: ${window.FirebaseData?.currentUser?.email || 'No disponible'}

📋 CONTACTOS:
${PIPELINE_STAGES.map(stage => {
    const count = pipelineData.filter(c => normalizeStatus(c.status) === stage.id).length;
    return `- ${stage.name}: ${count}`;
}).join('\n')}

🎯 DOM:
- Container encontrado: ${document.getElementById('pipelineContainer') ? 'SÍ' : 'NO'}
- Columnas renderizadas: ${document.querySelectorAll('.pipeline-column').length}

🚨 POSIBLES PROBLEMAS:
${pipelineData.length === 0 ? '⚠️ No hay contactos\n' : ''}
${!window.FirebaseData ? '⚠️ Firebase no disponible\n' : ''}
${!currentUserProfile ? '⚠️ Perfil de usuario no cargado\n' : ''}
${!document.getElementById('pipelineContainer') ? '⚠️ Container no encontrado\n' : ''}`;

    alert(info);
}

// ===== FORCE RELOAD FUNCTION =====
function forceReload() {
    if (confirm('¿Estás seguro de que quieres recargar la página? Esto puede solucionar problemas de sincronización.')) {
        window.location.reload();
    }
}

// ===== ENHANCED REFRESH =====
async function refreshPipeline() {
    console.log('🔄 Refreshing pipeline...');
    
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div class="loading-spinner"></div>
                <br>
                <div style="margin-top: 1rem;">Actualizando pipeline...</div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                    Cargando ${pipelineData.length} contactos...
                </div>
            </div>
        `;
    }
    
    try {
        await loadPipelineData();
        renderPipeline();
        console.log('✅ Pipeline refreshed successfully');
    } catch (error) {
        console.error('❌ Error refreshing pipeline:', error);
        showPipelineError(`Error al actualizar: ${error.message}`);
    }
}

// ===== MAKE FUNCTIONS AVAILABLE =====
window.refreshPipeline = refreshPipeline;
window.showDebugInfo = showDebugInfo;
window.forceReload = forceReload;

// ===== INITIALIZATION WITH BETTER TIMING =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready, initializing pipeline...');
    
    // Multiple initialization attempts
    const tryInit = async () => {
        if (window.FirebaseData && window.FirebaseData.currentUser) {
            await initializePipeline();
        } else {
            console.log('⏳ Firebase not ready, waiting...');
            setTimeout(tryInit, 2000);
        }
    };
    
    // Start trying immediately
    setTimeout(tryInit, 1000);
    
    // Also listen for firebase ready event
    window.addEventListener('firebaseReady', () => {
        console.log('🔥 Firebase ready event received');
        setTimeout(initializePipeline, 500);
    });
});

console.log('✅ Enhanced Pipeline with debug loaded');
