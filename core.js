// ===== VARIABLES GLOBALES =====
const users = {
    'director': { password: 'admin123', role: 'director', name: 'Director General' },
    'maria.garcia': { password: 'maria123', role: 'vendedor', name: 'María García' },
    'juan.perez': { password: 'juan123', role: 'vendedor', name: 'Juan Pérez' }
};

let convenios = JSON.parse(localStorage.getItem('convenios')) || [
    'Remigio', 'Hogar Nazaret', 'Empresa de Energía', 'Coats Cadena', 'Efigas', 'Cooperativa'
];

let currentUser = null;
let autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false';

// ===== CENTRALIZED DATA ACCESS =====
function getAllData() {
    if (window.AdminData) {
        return AdminData.getAllData();
    } else {
        console.warn('⚠️ AdminData not available, using localStorage fallback');
        try {
            const savedData = localStorage.getItem('ciudad_bilingue_sales_data');
            return savedData ? JSON.parse(savedData) : [];
        } catch (e) {
            console.error('Error loading fallback data:', e);
            return [];
        }
    }
}

function getFilteredData() {
    console.log('🔍 Getting filtered data for:', currentUser?.role, currentUser?.username);
    
    if (!window.AdminData) {
        console.log('⚠️ AdminData not available, using localStorage fallback');
        return getFilteredDataFallback();
    }
    
    if (currentUser?.role === 'director') {
        const data = AdminData.getAllData();
        console.log('👑 Director - returning ALL data:', data.length, 'records');
        return data;
    } else {
        const data = AdminData.getDataBySalesperson(currentUser.username);
        console.log('👤 Salesperson - filtered data:', data.length, 'records');
        return data;
    }
}

function getFilteredDataFallback() {
    let allData = [];
    try {
        const savedData = localStorage.getItem('ciudad_bilingue_sales_data');
        if (savedData) {
            allData = JSON.parse(savedData);
        }
    } catch (e) {
        console.error('Error loading fallback data:', e);
    }
    
    if (currentUser?.role === 'director') {
        console.log('👑 Director fallback - returning ALL data:', allData.length, 'records');
        return allData;
    } else {
        const filtered = allData.filter(item => item.salesperson === currentUser.username);
        console.log('👤 Salesperson fallback - filtered data:', filtered.length, 'records');
        return filtered;
    }
}

// ===== VERIFICACIÓN DE INTEGRIDAD DE DATOS =====
function verifyDataIntegrity() {
    if (!window.AdminData) {
        console.error('❌ AdminData no disponible');
        return false;
    }
    
    console.log('🔍 VERIFICANDO INTEGRIDAD DE DATOS...');
    
    const adminData = AdminData.getAllData();
    const localStorage = JSON.parse(window.localStorage.getItem('ciudad_bilingue_sales_data') || '[]');
    
    console.log('📊 AdminData:', adminData.length, 'registros');
    console.log('📊 localStorage:', localStorage.length, 'registros');
    
    // Verificar sincronización
    if (adminData.length !== localStorage.length) {
        console.warn('⚠️ Desincronización detectada');
        return false;
    }
    
    // Verificar que los últimos IDs coinciden
    if (adminData.length > 0 && localStorage.length > 0) {
        const lastAdminId = Math.max(...adminData.map(d => d.id));
        const lastLocalId = Math.max(...localStorage.map(d => d.id));
        
        console.log('🆔 Último ID AdminData:', lastAdminId);
        console.log('🆔 Último ID localStorage:', lastLocalId);
        
        if (lastAdminId !== lastLocalId) {
            console.warn('⚠️ IDs no coinciden');
            return false;
        }
    }
    
    console.log('✅ Integridad de datos verificada');
    return true;
}

// ===== FUNCIÓN DE DEBUG EN TIEMPO REAL =====
function realTimeDataDebug() {
    console.log('🔴 INICIANDO DEBUG EN TIEMPO REAL...');
    
    if (!window.AdminData) {
        alert('❌ AdminData no disponible');
        return;
    }
    
    const currentData = AdminData.getAllData();
    const localStorage = JSON.parse(window.localStorage.getItem('ciudad_bilingue_sales_data') || '[]');
    
    let debugInfo = `🔍 DEBUG EN TIEMPO REAL - ${new Date().toLocaleTimeString()}\n\n`;
    debugInfo += `👤 Usuario: ${currentUser.username} (${currentUser.role})\n`;
    debugInfo += `📊 AdminData: ${currentData.length} registros\n`;
    debugInfo += `📊 localStorage: ${localStorage.length} registros\n`;
    debugInfo += `🔄 Sincronización: ${currentData.length === localStorage.length ? '✅ OK' : '❌ ERROR'}\n\n`;
    
    if (currentUser.role === 'director') {
        debugInfo += `👑 VISTA DEL DIRECTOR:\n`;
        const teamStats = AdminData.getTeamStats();
        debugInfo += `   - Vendedores: ${teamStats.salespeople.length}\n`;
        teamStats.salespeople.forEach(sp => {
            debugInfo += `   - ${sp.displayName}: ${sp.stats.totalContacts} contactos\n`;
        });
    } else {
        const myData = AdminData.getDataBySalesperson(currentUser.username);
        debugInfo += `👤 MIS DATOS:\n`;
        debugInfo += `   - Mis contactos: ${myData.length}\n`;
        debugInfo += `   - Contactos hoy: ${myData.filter(c => c.date === new Date().toISOString().split('T')[0]).length}\n`;
    }
    
    // Últimos 3 contactos agregados
    const recentContacts = [...currentData]
        .sort((a, b) => b.id - a.id)
        .slice(0, 3);
    
    debugInfo += `\n📋 ÚLTIMOS 3 CONTACTOS:\n`;
    recentContacts.forEach((contact, index) => {
        debugInfo += `   ${index + 1}. ${contact.name} (${contact.salesperson}) - ID: ${contact.id}\n`;
    });
    
    alert(debugInfo);
    
    // También log detallado en consola
    console.log('📊 AdminData completo:', currentData);
    console.log('📊 localStorage completo:', localStorage);
    
    return {
        adminDataCount: currentData.length,
        localStorageCount: localStorage.length,
        synchronized: currentData.length === localStorage.length,
        user: currentUser,
        timestamp: new Date().toISOString()
    };
}

// ===== FUNCIONES DE SINCRONIZACIÓN CROSS-DEVICE =====
function showSyncNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#667eea'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
    `;
    
    notification.innerHTML = `<div>${message}</div>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function forceCrossDeviceSync() {
    if (!window.GitHubData || !window.GitHubData.getToken()) {
        alert('⚠️ GitHub no configurado. Para sincronización cross-device, configura GitHub en la sección del director.');
        return;
    }
    
    showSyncNotification('🔄 Sincronizando...', 'info');
    
    window.GitHubData.getAllContacts().then(githubContacts => {
        if (githubContacts.length > AdminData.getAllData().length) {
            AdminData.data = githubContacts;
            AdminData.saveData();
            AdminData.notifyObservers();
            updateAllViews();
            showSyncNotification('✅ Sincronización completada', 'success');
        } else {
            showSyncNotification('ℹ️ No hay nuevos datos', 'info');
        }
    }).catch(error => {
        showSyncNotification('❌ Error: ' + error.message, 'warning');
    });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Ciudad Bilingue Sales System');
    
    // Wait for AdminData to be available
    const checkAdminData = () => {
        if (window.AdminData) {
            console.log('✅ AdminData loaded successfully');
            setupAdminDataObservers();
        } else {
            console.log('⏳ Waiting for AdminData...');
            setTimeout(checkAdminData, 100);
        }
    };
    checkAdminData();
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }
});

// Setup AdminData observers for automatic UI updates
function setupAdminDataObservers() {
    if (window.AdminData) {
        AdminData.addObserver((data) => {
            console.log('📊 AdminData changed, updating all views...');
            updateAllViews();
        });
        console.log('✅ AdminData observers setup complete');
    }
}

// ===== DATA MANAGEMENT =====
function loadLocalData() {
    if (window.AdminData) {
        const data = AdminData.getAllData();
        console.log('✅ AdminData available with', data.length, 'records');
        
        // DEBUG: Show breakdown by salesperson
        const salespeople = [...new Set(data.map(d => d.salesperson))].filter(s => s);
        console.log('📊 Salespeople in AdminData:', salespeople.length);
        salespeople.forEach(sp => {
            const count = data.filter(d => d.salesperson === sp).length;
            console.log(`   - ${sp}: ${count} contacts`);
        });
        
        // Force update all views after loading data
        setTimeout(() => {
            updateAllViews();
        }, 100);
    } else {
        console.log('⚠️ AdminData not yet available');
    }
}

function saveLocalData() {
    // AdminData handles all data saving automatically
    console.log('💾 Data saving handled by AdminData');
}

// ===== AUTENTICACIÓN =====
function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('🔐 Intento de login:', username);
    
    if (users[username] && users[username].password === password) {
        currentUser = { username: username, ...users[username] };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('loginError').classList.add('hidden');
        console.log('✅ Login exitoso:', currentUser);
        showMainApp();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        console.log('❌ Credenciales incorrectas');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    setupUserInterface();
}

function setupUserInterface() {
    console.log('🎨 Configurando interfaz para:', currentUser.role);
    
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = `(${currentUser.role === 'director' ? 'Director' : 'Vendedor'})`;
    
    if (currentUser.role === 'director') {
        console.log('👑 Configurando interfaz de DIRECTOR');
        
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
        
        updateUsersList();
        updateConveniosList();
        
        // Initialize GitHub integration if available
        setTimeout(initializeGitHubIntegration, 1000);
    } else {
        console.log('👤 Configurando interfaz de VENDEDOR');
        
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
    
    loadConveniosInSelect();
    
    // CARGA DE DATOS MEJORADA CON AUTO-SYNC
    setTimeout(() => {
        if (window.AdminData) {
            console.log('🔄 Iniciando carga de datos con auto-sync...');
            
            // Habilitar auto-sync
            setTimeout(() => {
                if (window.AdminData.enableAutoSync) {
                    AdminData.enableAutoSync();
                }
            }, 2000);
            
            // Sincronización inicial desde GitHub
            if (window.GitHubData && window.GitHubData.getToken()) {
                window.GitHubData.getAllContacts().then(githubContacts => {
                    if (githubContacts.length > AdminData.getAllData().length) {
                        AdminData.data = githubContacts;
                        AdminData.saveData();
                        AdminData.notifyObservers();
                        updateAllViews();
                        showSyncNotification(`📥 ${githubContacts.length} contactos sincronizados al inicio`);
                    }
                }).catch(error => {
                    console.log('⚠️ Sync inicial falló:', error.message);
                });
            }
            
            // Paso 1: Verificar y reparar datos
            const wasRepaired = AdminData.verifyAndRepairData();
            
            // Paso 2: Forzar sincronización si es director
            if (currentUser.role === 'director') {
                console.log('👑 Director detectado - forzando sincronización
