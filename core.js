// core.js - FIREBASE INTEGRATED VERSION
// ===== FIREBASE VARIABLES GLOBALES =====
let users = {}; // Will be loaded from Firebase
let convenios = []; // Will be loaded from Firebase
let currentUser = null;
let currentUserProfile = null;

// ===== FIREBASE USER MANAGEMENT =====
async function loadUsers() {
    try {
        if (window.FirebaseData) {
            users = await window.FirebaseData.getAllUsers();
            console.log('✅ Loading users from Firebase:', Object.keys(users).length);
            return users;
        } else {
            console.log('⚠️ Firebase not available, using empty users');
            return {};
        }
    } catch (error) {
        console.error('❌ Error loading users from Firebase:', error);
        return {};
    }
}

async function saveUser(email, password, profile) {
    try {
        if (!window.FirebaseData) {
            throw new Error('Firebase not available');
        }
        
        const user = await window.FirebaseData.createUser(email, password, profile);
        console.log('✅ User saved to Firebase:', email);
        
        // Reload users list
        await loadUsers();
        return user;
    } catch (error) {
        console.error('❌ Error saving user to Firebase:', error);
        throw error;
    }
}

// ===== CENTRALIZED DATA ACCESS =====
function getAllData() {
    if (window.AdminData && window.AdminData.isReady) {
        return AdminData.getAllData();
    } else {
        console.warn('⚠️ Firebase AdminData not ready');
        return [];
    }
}

function getFilteredData() {
    console.log('🔍 Getting filtered Firebase data for:', currentUserProfile?.role, currentUserProfile?.email);
    
    if (!window.AdminData || !window.AdminData.isReady) {
        console.log('⚠️ Firebase AdminData not ready');
        return [];
    }
    
    const data = AdminData.getAllData();
    
    if (currentUserProfile?.role === 'director') {
        console.log('👑 Director - returning ALL Firebase data:', data.length, 'records');
        return data;
    } else if (currentUser?.uid) {
        const filtered = AdminData.getDataBySalesperson(currentUser.uid);
        console.log('👤 Salesperson - filtered Firebase data:', filtered.length, 'records');
        return filtered;
    }
    
    console.log('⚠️ No user context available');
    return [];
}

// ===== ENHANCED DATA INTEGRITY FUNCTIONS =====
async function verifyDataIntegrity() {
    if (!window.AdminData || !window.AdminData.isReady) {
        console.error('❌ Firebase AdminData not available');
        return false;
    }
    
    console.log('🔍 VERIFICANDO INTEGRIDAD DE DATOS FIREBASE...');
    
    const data = AdminData.getAllData();
    console.log('📊 Firebase AdminData:', data.length, 'registros');
    
    // Check if data is consistent
    const issues = [];
    data.forEach((item, index) => {
        if (!item.id) issues.push(`Record ${index}: missing ID`);
        if (!item.name) issues.push(`Record ${index}: missing name`);
        if (!item.salespersonId && !item.salesperson) issues.push(`Record ${index}: missing salesperson`);
    });
    
    if (issues.length > 0) {
        console.warn('⚠️ Data integrity issues found:', issues);
        return false;
    }
    
    console.log('✅ Firebase data integrity verified');
    return true;
}

async function forceFullSync() {
    console.log('🔄 INICIANDO SINCRONIZACIÓN COMPLETA FIREBASE...');
    
    if (!window.AdminData) {
        console.error('❌ Firebase AdminData not available');
        return false;
    }
    
    try {
        // Reload data from Firebase
        await AdminData.loadData();
        
        // Update all views
        setTimeout(() => {
            updateAllViews();
            updateLeadsTable();
            if (typeof refreshPipeline === 'function') refreshPipeline();
        }, 200);
        
        console.log('✅ Firebase synchronization complete');
        return true;
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        return false;
    }
}

// ===== INICIALIZACIÓN FIREBASE =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing Ciudad Bilingue CRM with Firebase');
    
    // Check if Firebase scripts are loaded
    if (!window.FirebaseData) {
        console.error('❌ Firebase not loaded! Make sure to include Firebase scripts.');
        return;
    }
    
    // Setup Firebase auth state listener
    setupFirebaseAuthListener();
    
    // Load initial data
    await loadUsers();
    await loadConvenios();
    
    console.log('✅ Firebase initialization complete');
});

function setupFirebaseAuthListener() {
    // Listen for Firebase auth state changes
    if (window.FirebaseData && window.FirebaseData.auth) {
        window.FirebaseData.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ Firebase user authenticated:', user.email);
                currentUser = user;
                currentUserProfile = await window.FirebaseData.loadUserProfile();
                
                // Hide login screen and show main app
                showMainApp();
            } else {
                console.log('ℹ️ No Firebase user authenticated');
                currentUser = null;
                currentUserProfile = null;
                
                // Show login screen
                showLoginScreen();
            }
        });
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

// Setup AdminData observers for automatic UI updates
function setupAdminDataObservers() {
    if (window.AdminData) {
        AdminData.addObserver((data) => {
            console.log('📊 Firebase AdminData changed, updating all views...');
            updateAllViews();
        });
        console.log('✅ Firebase AdminData observers setup complete');
    }
}

// ===== FIREBASE AUTHENTICATION =====
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('username').value.trim(); // Using email instead of username
    const password = document.getElementById('password').value;
    
    console.log('🔐 Attempting Firebase login:', email);
    
    try {
        await window.FirebaseData.login(email, password);
        // Auth state listener will handle the UI update
        document.getElementById('loginError').classList.add('hidden');
    } catch (error) {
        console.error('❌ Firebase login failed:', error);
        document.getElementById('loginError').textContent = `❌ ${error.message}`;
        document.getElementById('loginError').classList.remove('hidden');
    }
}

async function logout() {
    try {
        await window.FirebaseData.logout();
        // Auth state listener will handle the UI update
        console.log('✅ Firebase logout successful');
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Force reload as fallback
        location.reload();
    }
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    setupUserInterface();
}

async function setupUserInterface() {
    console.log('🎨 Configurando interfaz Firebase para:', currentUserProfile?.role);
    
    if (!currentUserProfile) {
        console.error('❌ No user profile available');
        return;
    }
    
    document.getElementById('currentUserName').textContent = currentUserProfile.name;
    document.getElementById('userRole').textContent = `(${currentUserProfile.role === 'director' ? 'Director' : 'Vendedor'})`;
    
    if (currentUserProfile.role === 'director') {
        console.log('👑 Configurando interfaz de DIRECTOR Firebase');
        
        // Director-specific setup
        document.getElementById('directorConfig').classList.remove('hidden');
        document.getElementById('reportsTab').textContent = '📊 Dashboard Ejecutivo';
        document.getElementById('reportsTitle').textContent = '📊 Dashboard Ejecutivo';
        document.getElementById('monitoringTab').style.display = 'block';
        
        // Update tab labels for director
        document.getElementById('contactsTab').textContent = '📞 Todos los Contactos';
        document.getElementById('leadsTab').textContent = '👥 Todos los Leads';
        document.getElementById('pipelineTab').textContent = '🎯 Pipeline del Equipo';
        document.getElementById('leadsTitle').textContent = '👥 Gestión de Todos los Leads';
        document.getElementById('contactsTitle').textContent = '📞 Contactos del Equipo';
        document.getElementById('todayContactsTitle').textContent = '📋 Contactos de Hoy (Todos)';
        
        // Show director filters
        document.getElementById('leadsFilters').style.display = 'block';
        
        // Add salesperson column to leads table
        const leadsHeader = document.getElementById('leadsTableHeader');
        if (!document.getElementById('salespersonColumn')) {
            const salespersonTh = document.createElement('th');
            salespersonTh.id = 'salespersonColumn';
            salespersonTh.textContent = 'Vendedor';
            leadsHeader.insertBefore(salespersonTh, leadsHeader.children[5]);
        }
        
        await updateUsersList();
        await updateConveniosList();
        
    } else {
        console.log('👤 Configurando interfaz de VENDEDOR Firebase');
        
        // Vendedor-specific setup
        document.getElementById('directorConfig').classList.add('hidden');
        document.getElementById('reportsTab').textContent = '📊 Mi Dashboard';
        document.getElementById('reportsTitle').textContent = '📊 Mi Dashboard Personal';
        document.getElementById('monitoringTab').style.display = 'none';
        document.getElementById('leadsFilters').style.display = 'none';
        
        // Reset tab labels for vendedor
        document.getElementById('contactsTab').textContent = '📞 Mis Contactos';
        document.getElementById('leadsTab').textContent = '👥 Mis Leads';
        document.getElementById('pipelineTab').textContent = '🎯 Pipeline';
        document.getElementById('leadsTitle').textContent = '👥 Gestión de Mis Leads';
        document.getElementById('contactsTitle').textContent = '📞 Registrar Contactos del Día';
        document.getElementById('todayContactsTitle').textContent = '📋 Mis Contactos de Hoy';
        
        // Remove salesperson column if it exists
        const salespersonColumn = document.getElementById('salespersonColumn');
        if (salespersonColumn) {
            salespersonColumn.remove();
        }
    }
    
    await loadConveniosInSelect();
    
    // Setup AdminData observers
    setupAdminDataObservers();
    
    // ENHANCED DATA LOADING WITH FIREBASE
    setTimeout(async () => {
        if (window.AdminData) {
            console.log('🔄 Iniciando carga de datos Firebase...');
            
            // Wait for AdminData to be ready
            while (!window.AdminData.isReady) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Initial data load and UI update
            setTimeout(async () => {
                console.log('🎯 Actualizando todas las vistas Firebase...');
                updateAllViews();
                
                if (currentUserProfile.role === 'director') {
                    await populateSalespersonFilter();
                    setTimeout(() => {
                        updateLeadsTable();
                        console.log('✅ Vista del director Firebase completamente actualizada');
                    }, 300);
                }
                
                if (typeof refreshPipeline === 'function') {
                    setTimeout(() => {
                        refreshPipeline();
                    }, 500);
                }
            }, 200);
            
        } else {
            console.log('❌ Firebase AdminData no disponible, reintentando...');
            setTimeout(setupUserInterface, 500);
        }
    }, 100);
}

// ===== FIREBASE USER MANAGEMENT =====
async function addUser() {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Solo el director puede agregar usuarios');
        return;
    }
    
    const email = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    
    if (!email || !password) {
        alert('⚠️ Completa todos los campos');
        return;
    }
    
    if (!email.includes('@')) {
        alert('⚠️ Ingresa un email válido');
        return;
    }
    
    try {
        // Create display name from email
        const name = email.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
        
        // Create user in Firebase
        await saveUser(email, password, { name, role });
        
        // Clear form
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        
        // Update UI
        await updateUsersList();
        await populateSalespersonFilter();
        
        alert(`✅ Usuario agregado correctamente en Firebase!

👤 Email: ${email}
🏷️ Nombre: ${name}
🎭 Rol: ${role === 'director' ? 'Director' : 'Vendedor'}

El usuario ya puede iniciar sesión con su email y contraseña.`);
        
        console.log('✅ New Firebase user added:', email);
    } catch (error) {
        console.error('❌ Error adding Firebase user:', error);
        alert(`❌ Error al crear usuario: ${error.message}`);
    }
}

async function deleteUser(userId) {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Solo el director puede eliminar usuarios');
        return;
    }
    
    // Don't allow deleting self
    if (userId === currentUser?.uid) {
        alert('❌ No puedes eliminar tu propia cuenta');
        return;
    }
    
    const userToDelete = users[userId];
    if (!userToDelete) {
        alert('❌ Usuario no encontrado');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar al usuario ${userToDelete.name}?

⚠️ Esta acción también eliminará todos los contactos asociados a este vendedor.
⚠️ Esta acción NO se puede deshacer.`)) {
        
        try {
            // Remove user's data from AdminData
            if (window.AdminData && window.AdminData.isReady) {
                const userData = AdminData.getDataBySalesperson(userId);
                for (const contact of userData) {
                    await AdminData.deleteContact(contact.id);
                }
                console.log(`🗑️ Deleted ${userData.length} contacts for user ${userId}`);
            }
            
            // Note: Firebase Auth doesn't allow deleting users from client side
            // In production, you'd need a Cloud Function for this
            console.log('⚠️ Firebase user deletion requires server-side implementation');
            
            // Remove from local users list (temporary solution)
            delete users[userId];
            
            // Update UI
            await updateUsersList();
            await populateSalespersonFilter();
            updateAllViews();
            
            alert('✅ Usuario y sus datos eliminados localmente.\n\n⚠️ Para eliminar completamente de Firebase Auth, se requiere implementación servidor.');
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            alert(`❌ Error al eliminar usuario: ${error.message}`);
        }
    }
}

async function updateUsersList() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    // Reload users from Firebase
    await loadUsers();
    
    container.innerHTML = Object.entries(users).map(([userId, user]) => `
        <div class="user-card">
            <div>
                <strong>${user.name}</strong>
                <span style="color: #666; font-size: 0.9rem;">(${user.email})</span>
                <span style="background: ${user.role === 'director' ? '#667eea' : '#10b981'}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">
                    ${user.role === 'director' ? 'Director' : 'Vendedor'}
                </span>
            </div>
            <button onclick="deleteUser('${userId}')" class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" ${userId === currentUser?.uid ? 'disabled' : ''}>
                🗑️ Eliminar
            </button>
        </div>
    `).join('');
    
    console.log('👥 Firebase users list updated with', Object.keys(users).length, 'users');
}

// ===== CONVENIOS FIREBASE =====
async function loadConvenios() {
    try {
        if (window.FirebaseData) {
            convenios = await window.FirebaseData.getConvenios();
            console.log('✅ Loading convenios from Firebase:', convenios.length);
        } else {
            // Default convenios if Firebase not available
            convenios = [
                'Remigio', 'Hogar Nazaret', 'Empresa de Energía', 'Coats Cadena', 'Efigas', 'Cooperativa'
            ];
            console.log('⚠️ Using default convenios');
        }
        return convenios;
    } catch (error) {
        console.error('❌ Error loading convenios:', error);
        return [];
    }
}

async function addConvenio() {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Solo el director puede agregar convenios');
        return;
    }
    
    const convenioName = document.getElementById('newConvenio').value.trim();
    if (!convenioName) {
        alert('⚠️ Ingresa el nombre del convenio');
        return;
    }
    
    if (convenios.includes(convenioName)) {
        alert('⚠️ Este convenio ya existe');
        return;
    }
    
    try {
        convenios.push(convenioName);
        await window.FirebaseData.updateConvenios(convenios);
        
        document.getElementById('newConvenio').value = '';
        await updateConveniosList();
        await loadConveniosInSelect();
        alert('✅ Convenio agregado correctamente en Firebase');
    } catch (error) {
        console.error('❌ Error adding convenio:', error);
        alert(`❌ Error al agregar convenio: ${error.message}`);
    }
}

async function deleteConvenio(convenioName) {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Solo el director puede eliminar convenios');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar el convenio "${convenioName}"?`)) {
        try {
            convenios = convenios.filter(c => c !== convenioName);
            await window.FirebaseData.updateConvenios(convenios);
            
            await updateConveniosList();
            await loadConveniosInSelect();
            alert('✅ Convenio eliminado de Firebase');
        } catch (error) {
            console.error('❌ Error deleting convenio:', error);
            alert(`❌ Error al eliminar convenio: ${error.message}`);
        }
    }
}

async function updateConveniosList() {
    const container = document.getElementById('conveniosList');
    if (!container) return;
    
    // Reload convenios from Firebase
    await loadConvenios();
    
    container.innerHTML = convenios.map(convenio => `
        <div class="convenio-item">
            <span style="font-size: 0.9rem; font-weight: 500;">${convenio}</span>
            <button onclick="deleteConvenio('${convenio}')" class="btn btn-warning" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">🗑️</button>
        </div>
    `).join('');
}

async function loadConveniosInSelect() {
    const convenioSelect = document.getElementById('contactConvenio');
    if (!convenioSelect) return;
    
    // Reload convenios from Firebase
    await loadConvenios();
    
    convenioSelect.innerHTML = '<option value="">Seleccionar convenio...</option>';
    convenios.forEach(convenio => {
        const option = document.createElement('option');
        option.value = convenio;
        option.textContent = convenio;
        convenioSelect.appendChild(option);
    });
    
    console.log('✅ Firebase convenios cargados en select:', convenios.length);
}

// ===== UTILIDADES =====
function getUserDisplayName(userId) {
    if (users[userId]) {
        return users[userId].name;
    }
    
    // Fallback for legacy format
    if (userId && userId.includes('.')) {
        return userId.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    }
    
    return userId || 'Unknown User';
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('es-CO');
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName).classList.remove('hidden');
    event.target.classList.add('active');
    
    // Force refresh specific views when tabs are shown
    setTimeout(() => {
        if (tabName === 'pipeline') {
            if (typeof refreshPipeline === 'function') refreshPipeline();
        } else if (tabName === 'monitoring' && currentUserProfile?.role === 'director') {
            if (typeof refreshMonitoring === 'function') refreshMonitoring();
        } else if (tabName === 'leads') {
            updateLeadsTable();
        } else if (tabName === 'reports') {
            updateReports();
        }
    }, 100);
}

async function refreshData() {
    console.log('🔄 Refreshing Firebase data...');
    
    if (window.AdminData && window.AdminData.isReady) {
        await AdminData.loadData();
        updateAllViews();
    }
    
    console.log('✅ Firebase data refresh completed');
}

function debugData() {
    if (!window.AdminData || !window.AdminData.isReady) {
        alert('❌ Firebase AdminData not available');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const allData = AdminData.getAllData();
    const filtered = getFilteredData();
    const todayContacts = filtered.filter(c => c.date === today);
    
    let debugInfo = `🔍 FIREBASE ADMIN DATA DEBUG INFO:\n\n`;
    debugInfo += `Usuario actual: ${currentUserProfile?.name} (${currentUserProfile?.email})\n`;
    debugInfo += `Rol: ${currentUserProfile?.role}\n`;
    debugInfo += `Firebase UID: ${currentUser?.uid}\n`;
    debugInfo += `Fecha de hoy: ${today}\n`;
    debugInfo += `Total contactos en Firebase: ${allData.length}\n`;
    debugInfo += `Total usuarios en sistema: ${Object.keys(users).length}\n\n`;
    
    // Show all users
    debugInfo += `👥 USUARIOS EN FIREBASE:\n`;
    Object.entries(users).forEach(([userId, user]) => {
        const userContacts = allData.filter(d => d.salespersonId === userId || d.salesperson === userId).length;
        debugInfo += `   - ${user.name} (${user.email}): ${userContacts} contactos\n`;
    });
    
    if (currentUserProfile?.role === 'director') {
        debugInfo += `\n👑 VISTA DEL DIRECTOR:\n`;
        debugInfo += `Viendo TODOS los contactos: ${filtered.length}\n`;
        debugInfo += `Contactos de hoy (equipo): ${todayContacts.length}\n`;
    } else {
        debugInfo += `\n👤 MI VISTA:\n`;
        debugInfo += `Mis contactos (filtrados): ${filtered.length}\n`;
        debugInfo += `Mis contactos de hoy: ${todayContacts.length}\n`;
    }
    
    // Add Firebase system status
    const systemStatus = AdminData.getSystemStatus();
    debugInfo += `\n🔥 ESTADO DEL SISTEMA FIREBASE:\n`;
    debugInfo += `Firebase Ready: ${systemStatus.isReady}\n`;
    debugInfo += `Authenticated: ${systemStatus.authenticated}\n`;
    debugInfo += `Source: ${systemStatus.source}\n`;
    debugInfo += `Last Update: ${systemStatus.lastUpdate ? new Date(systemStatus.lastUpdate).toLocaleString() : 'N/A'}\n`;
    
    alert(debugInfo);
}

// ===== UTILIDADES ADICIONALES =====

function updateAllViews() {
    console.log('🔄 Updating all Firebase views...');
    if (typeof updateStats === 'function') updateStats();
    if (typeof updateTodayContacts === 'function') updateTodayContacts();
    if (typeof updateLeadsTable === 'function') updateLeadsTable();
    if (typeof updateReports === 'function') updateReports();
    
    // Director-specific updates
    if (currentUserProfile && currentUserProfile.role === 'director') {
        populateSalespersonFilter();
        // Update monitoring if the tab is currently active
        const monitoringTab = document.getElementById('monitoring');
        if (monitoringTab && !monitoringTab.classList.contains('hidden')) {
            if (typeof refreshMonitoring === 'function') refreshMonitoring();
        }
    }
    
    console.log('✅ All Firebase views updated');
}

async function populateSalespersonFilter() {
    const filter = document.getElementById('salespersonFilter');
    if (!filter) return;
    
    // Reload users from Firebase
    await loadUsers();
    
    // Use the Firebase users object
    const salespeople = Object.entries(users)
        .filter(([userId, user]) => user.role === 'vendedor')
        .map(([userId, user]) => ({ userId, name: user.name }));
    
    filter.innerHTML = '<option value="">Todos los vendedores</option>';
    
    salespeople.forEach(sp => {
        const option = document.createElement('option');
        option.value = sp.userId;
        option.textContent = sp.name;
        filter.appendChild(option);
    });
    
    console.log('📋 Populated Firebase salesperson filter with', salespeople.length, 'salespeople');
}

async function clearLocalData() {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Solo el director puede eliminar todos los datos');
        return;
    }
    
    if (confirm('⚠️ ¿Estás seguro de eliminar TODOS los contactos de Firebase?\n\nEsta acción eliminará todos los datos del sistema.\n\n⚠️ Esta acción NO se puede deshacer.')) {
        try {
            if (window.AdminData && window.AdminData.isReady) {
                await AdminData.clearAllData();
                alert('🗑️ Todos los datos han sido eliminados de Firebase');
            } else {
                alert('❌ Firebase AdminData no disponible');
            }
        } catch (error) {
            console.error('❌ Error clearing Firebase data:', error);
            alert(`❌ Error al eliminar datos: ${error.message}`);
        }
    }
}

// ===== MIGRATION HELPERS =====

async function migrateFromLocalStorage() {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Solo el director puede realizar la migración');
        return;
    }
    
    if (!window.AdminData || !window.AdminData.isReady) {
        alert('❌ Firebase AdminData no disponible');
        return;
    }
    
    try {
        const migrated = await AdminData.migrateFromLocalStorage();
        if (migrated > 0) {
            alert(`✅ Migración completada!\n\n📊 ${migrated} contactos migrados de localStorage a Firebase\n🔄 Los datos están ahora sincronizados en tiempo real`);
            updateAllViews();
        } else {
            alert('ℹ️ No se encontraron datos en localStorage para migrar');
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
        alert(`❌ Error en la migración: ${error.message}`);
    }
}

async function diagnoseDirectorData() {
    if (currentUserProfile?.role !== 'director') {
        alert('❌ Esta función es solo para el director');
        return;
    }
    
    console.log('🔍 DIAGNÓSTICO COMPLETO DE DATOS FIREBASE DEL DIRECTOR');
    
    const allData = AdminData.getAllData();
    const filteredData = getFilteredData();
    const usersCount = Object.keys(users).length;
    
    let diagnostic = `🔍 DIAGNÓSTICO FIREBASE DEL DIRECTOR\n\n`;
    diagnostic += `👥 Usuarios en Firebase: ${usersCount}\n`;
    diagnostic += `📊 Total contactos Firebase: ${allData.length}\n`;
    diagnostic += `📊 Vista filtrada: ${filteredData.length}\n`;
    diagnostic += `🔥 Firebase Ready: ${AdminData.isReady}\n`;
    diagnostic += `🔐 Authenticated: ${!!currentUser}\n\n`;
    
    // Show all users and their data
    diagnostic += `👥 DETALLES POR USUARIO:\n`;
    Object.entries(users).forEach(([userId, user]) => {
        const userContacts = allData.filter(d => 
            d.salespersonId === userId || d.salesperson === userId
        ).length;
        diagnostic += `   - ${user.name} (${user.email}): ${userContacts} contactos\n`;
    });
    
    // Firebase system status
    const systemStatus = AdminData.getSystemStatus();
    diagnostic += `\n🔥 ESTADO DEL SISTEMA:\n`;
    diagnostic += `   - Source: ${systemStatus.source}\n`;
    diagnostic += `   - Ready: ${systemStatus.isReady}\n`;
    diagnostic += `   - Observers: ${systemStatus.observers}\n`;
    diagnostic += `   - Last Update: ${systemStatus.lastUpdate ? new Date(systemStatus.lastUpdate).toLocaleString() : 'N/A'}\n`;
    
    alert(diagnostic);
}

console.log('✅ Firebase Core module loaded successfully');
