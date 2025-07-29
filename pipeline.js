// ===== ENHANCED PIPELINE INITIALIZATION WITH BETTER ERROR HANDLING =====

// ===== PIPELINE STATE =====
let pipelineData = [];
let currentUserProfile = null;
let isDirector = false;
let isLoading = false;

// ===== ENHANCED INITIALIZATION WITH TIMEOUT =====
async function initializePipeline() {
    console.log('🎯 Initializing Firebase Pipeline...');
    
    // Prevent multiple initializations
    if (isLoading) {
        console.log('⚠️ Pipeline already loading, skipping...');
        return;
    }
    
    isLoading = true;
    
    try {
        // Check Firebase availability with timeout
        await waitForFirebase(10000); // 10 second timeout
        
        console.log('🔥 Firebase available, loading user profile...');
        
        // Get user profile with timeout
        currentUserProfile = await Promise.race([
            window.FirebaseData.loadUserProfile(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('User profile timeout')), 8000))
        ]);
        
        isDirector = currentUserProfile?.role === 'director';
        
        console.log('👤 Pipeline user:', currentUserProfile?.name, '- Role:', currentUserProfile?.role);
        
        // Load and render pipeline with timeout
        await Promise.race([
            loadPipelineData(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Data loading timeout')), 10000))
        ]);
        
        renderPipeline();
        
        console.log('✅ Pipeline initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing pipeline:', error);
        showPipelineError(error.message);
    } finally {
        isLoading = false;
    }
}

// ===== WAIT FOR FIREBASE FUNCTION =====
function waitForFirebase(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function checkFirebase() {
            if (window.FirebaseData && window.FirebaseData.currentUser) {
                console.log('✅ Firebase ready!');
                resolve();
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                reject(new Error('Firebase timeout - not available after ' + timeout + 'ms'));
                return;
            }
            
            console.log('⏳ Waiting for Firebase...');
            setTimeout(checkFirebase, 500);
        }
        
        checkFirebase();
    });
}

// ===== ENHANCED DATA LOADING WITH BETTER ERROR HANDLING =====
async function loadPipelineData() {
    try {
        console.log('📊 Loading pipeline data from Firebase...');
        
        if (!window.FirebaseData) {
            throw new Error('Firebase not available');
        }
        
        if (!window.FirebaseData.currentUser) {
            throw new Error('User not authenticated');
        }
        
        // Check if getFilteredContacts function exists
        if (typeof window.FirebaseData.getFilteredContacts !== 'function') {
            console.log('⚠️ getFilteredContacts not available, trying alternative methods...');
            
            // Alternative: try to get contacts directly
            if (window.FirebaseData.contacts) {
                const allContacts = Object.entries(window.FirebaseData.contacts).map(([id, contact]) => ({
                    id,
                    ...contact
                }));
                
                // Filter by user if not director
                if (!isDirector && currentUserProfile) {
                    pipelineData = allContacts.filter(contact => 
                        contact.salespersonId === window.FirebaseData.currentUser.uid
                    );
                } else {
                    pipelineData = allContacts;
                }
            } else {
                throw new Error('No contacts data available');
            }
        } else {
            // Use the getFilteredContacts function
            const allContacts = await window.FirebaseData.getFilteredContacts();
            pipelineData = allContacts;
        }
        
        // Normalize status for all contacts
        pipelineData = pipelineData.map(contact => ({
            ...contact,
            status: normalizeStatus(contact.status || 'Nuevo')
        }));
        
        console.log(`✅ Loaded ${pipelineData.length} contacts for pipeline`);
        
    } catch (error) {
        console.error('❌ Error loading pipeline data:', error);
        pipelineData = [];
        throw error;
    }
}

// ===== ENHANCED REFRESH WITH BETTER FEEDBACK =====
async function refreshPipeline() {
    console.log('🔄 Refreshing pipeline...');
    
    const container = document.getElementById('pipelineContainer');
    if (!container) {
        console.error('❌ Pipeline container not found');
        return;
    }
    
    // Show loading with timeout indicator
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div class="loading-spinner"></div>
            <br>
            <div style="margin-top: 1rem;">Actualizando pipeline...</div>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                Si tarda más de 30 segundos, 
                <button onclick="forceRefreshPipeline()" style="background: none; border: none; color: #3b82f6; cursor: pointer; text-decoration: underline;">
                    haz clic aquí
                </button>
            </div>
        </div>
    `;
    
    try {
        // Add timeout to refresh
        await Promise.race([
            (async () => {
                await loadPipelineData();
                renderPipeline();
            })(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Refresh timeout after 30 seconds')), 30000)
            )
        ]);
        
        console.log('✅ Pipeline refreshed successfully');
        
    } catch (error) {
        console.error('❌ Error refreshing pipeline:', error);
        showPipelineError(`Error al actualizar: ${error.message}`);
    }
}

// ===== FORCE REFRESH FUNCTION =====
async function forceRefreshPipeline() {
    console.log('🚨 Force refreshing pipeline...');
    
    const container = document.getElementById('pipelineContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 1.2rem; margin-bottom: 1rem;">🔄 Reiniciando sistema...</div>
                <div class="loading-spinner"></div>
                <div style="margin-top: 1rem; font-size: 0.9rem; color: #6b7280;">
                    Verificando conexión con Firebase...
                </div>
            </div>
        `;
    }
    
    try {
        // Reset state
        pipelineData = [];
        currentUserProfile = null;
        isDirector = false;
        isLoading = false;
        
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await initializePipeline();
        
    } catch (error) {
        console.error('❌ Force refresh failed:', error);
        showPipelineError(`Fuerza de refresco falló: ${error.message}`);
    }
}

// ===== DIAGNOSTIC FUNCTION =====
async function diagnosePipelineIssues() {
    console.log('🔍 DIAGNOSING PIPELINE ISSUES...');
    
    const diagnosis = {
        timestamp: new Date().toISOString(),
        firebase: {},
        user: {},
        data: {},
        dom: {}
    };
    
    // Check Firebase
    diagnosis.firebase.available = !!window.FirebaseData;
    diagnosis.firebase.authenticated = !!(window.FirebaseData?.currentUser);
    diagnosis.firebase.userId = window.FirebaseData?.currentUser?.uid || null;
    diagnosis.firebase.functions = {};
    
    if (window.FirebaseData) {
        diagnosis.firebase.functions.loadUserProfile = typeof window.FirebaseData.loadUserProfile === 'function';
        diagnosis.firebase.functions.getFilteredContacts = typeof window.FirebaseData.getFilteredContacts === 'function';
        diagnosis.firebase.functions.contacts = !!window.FirebaseData.contacts;
        diagnosis.firebase.contactsCount = window.FirebaseData.contacts ? Object.keys(window.FirebaseData.contacts).length : 0;
    }
    
    // Check User
    diagnosis.user.profile = currentUserProfile;
    diagnosis.user.isDirector = isDirector;
    diagnosis.user.isLoading = isLoading;
    
    // Check Data
    diagnosis.data.pipelineDataLength = pipelineData.length;
    diagnosis.data.sampleContact = pipelineData[0] || null;
    
    // Check DOM
    diagnosis.dom.container = !!document.getElementById('pipelineContainer');
    diagnosis.dom.columns = document.querySelectorAll('.pipeline-column').length;
    diagnosis.dom.cards = document.querySelectorAll('.pipeline-card').length;
    
    console.log('📋 DIAGNOSIS RESULTS:', diagnosis);
    
    // Show user-friendly summary
    const issues = [];
    const solutions = [];
    
    if (!diagnosis.firebase.available) {
        issues.push('Firebase no está disponible');
        solutions.push('Verifica que Firebase esté cargado correctamente');
    }
    
    if (!diagnosis.firebase.authenticated) {
        issues.push('Usuario no autenticado');
        solutions.push('Inicia sesión nuevamente');
    }
    
    if (!diagnosis.firebase.functions.getFilteredContacts && !diagnosis.firebase.functions.contacts) {
        issues.push('Funciones de datos no disponibles');
        solutions.push('Verifica la configuración de Firebase');
    }
    
    if (diagnosis.firebase.contactsCount === 0) {
        issues.push('No hay contactos en la base de datos');
        solutions.push('Agrega algunos contactos primero');
    }
    
    if (!diagnosis.dom.container) {
        issues.push('Contenedor del pipeline no encontrado');
        solutions.push('Verifica que el HTML tenga el elemento #pipelineContainer');
    }
    
    const summary = `🔍 DIAGNÓSTICO DEL PIPELINE

❌ PROBLEMAS ENCONTRADOS:
${issues.length > 0 ? issues.map(issue => `- ${issue}`).join('\n') : '✅ No se encontraron problemas obvios'}

💡 SOLUCIONES SUGERIDAS:
${solutions.length > 0 ? solutions.map(sol => `- ${sol}`).join('\n') : '✅ Todo parece estar bien'}

📊 DATOS TÉCNICOS:
- Firebase disponible: ${diagnosis.firebase.available ? 'SÍ' : 'NO'}
- Usuario autenticado: ${diagnosis.firebase.authenticated ? 'SÍ' : 'NO'}
- Contactos en DB: ${diagnosis.firebase.contactsCount}
- Contactos en pipeline: ${diagnosis.data.pipelineDataLength}
- Columnas renderizadas: ${diagnosis.dom.columns}

🔧 ACCIONES RECOMENDADAS:
1. ${!diagnosis.firebase.available ? 'Recarga la página' : 'Firebase OK'}
2. ${!diagnosis.firebase.authenticated ? 'Vuelve a iniciar sesión' : 'Autenticación OK'}
3. ${diagnosis.firebase.contactsCount === 0 ? 'Agrega contactos en la pestaña Leads' : 'Datos OK'}
4. ${diagnosis.dom.columns === 0 ? 'Usa forceRefreshPipeline()' : 'Render OK'}`;

    alert(summary);
    
    return diagnosis;
}

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
window.refreshPipeline = refreshPipeline;
window.forceRefreshPipeline = forceRefreshPipeline;
window.diagnosePipelineIssues = diagnosePipelineIssues;
window.initializePipeline = initializePipeline;

// ===== AUTO-INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready, checking for Firebase...');
    
    // Try immediate initialization
    if (window.FirebaseData && window.FirebaseData.currentUser) {
        setTimeout(initializePipeline, 1000);
    } else {
        // Wait for Firebase ready event
        window.addEventListener('firebaseReady', () => {
            console.log('🔥 Firebase ready event received');
            setTimeout(initializePipeline, 1000);
        });
        
        // Fallback: keep checking for Firebase every 2 seconds
        const checkInterval = setInterval(() => {
            if (window.FirebaseData && window.FirebaseData.currentUser) {
                clearInterval(checkInterval);
                setTimeout(initializePipeline, 1000);
            }
        }, 2000);
        
        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }
});

console.log('✅ Enhanced Pipeline module loaded successfully');
