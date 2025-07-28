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
    
    // CARGA DE DATOS MEJORADA
    setTimeout(() => {
        if (window.AdminData) {
            console.log('🔄 Iniciando carga de datos mejorada...');
            
            // Paso 1: Verificar y reparar datos
            const wasRepaired = AdminData.verifyAndRepairData();
            
            // Paso 2: Forzar sincronización si es director
            if (currentUser.role === 'director') {
                console.log('👑 Director detectado - forzando sincronización completa');
                const syncedCount = AdminData.forceSyncFromStorage();
                console.log(`✅ Director sincronizado con ${syncedCount} registros`);
            }
            
            // Paso 3: Cargar datos y actualizar vistas
            loadLocalData();
            
            // Paso 4: Actualizar todas las vistas con delay escalonado
            setTimeout(() => {
                console.log('🎯 Actualizando todas las vistas...');
                updateAllViews();
                
                // Paso 5: Actualizar filtros del director
                if (currentUser.role === 'director') {
                    populateSalespersonFilter();
                    
                    // Forzar actualización de la tabla de leads
                    setTimeout(() => {
                        updateLeadsTable();
                        console.log('✅ Vista del director completamente actualizada');
                    }, 300);
                }
                
                // Paso 6: Refresh pipeline
                if (typeof refreshPipeline === 'function') {
                    setTimeout(() => {
                        refreshPipeline();
                    }, 500);
                }
                
            }, 200);
            
            // Paso 7: Verificar integridad final
            setTimeout(() => {
                if (window.AdminData) {
                    console.log('🔍 Verificando integridad al cargar interfaz...');
                    const isIntegre = verifyDataIntegrity();
                    if (!isIntegre) {
                        console.warn('⚠️ Problemas de integridad detectados al cargar');
                        AdminData.forceSyncFromStorage();
                    }
                }
            }, 1000);
            
        } else {
            console.log('❌ AdminData no disponible, reintentando...');
            setTimeout(setupUserInterface, 500);
        }
    }, 100);
}

// ===== GITHUB INTEGRATION =====
async function initializeGitHubIntegration() {
    if (currentUser.role === 'director' && window.GitHubData && window.GitHubData.getToken()) {
        try {
            console.log('🔄 Initializing GitHub integration...');
            await window.GitHubData.syncWithLocal();
            console.log('✅ GitHub integration ready');
            if (typeof updateGitHubStatus === 'function') {
                updateGitHubStatus();
            }
        } catch (error) {
            console.log('⚠️ GitHub sync failed, continuing with local data:', error.message);
        }
    }
}

// ===== USUARIOS =====
function addUser() {
    if (currentUser.role !== 'director') {
        alert('❌ Solo el director puede agregar usuarios');
        return;
    }
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    
    if (!username || !password) {
        alert('⚠️ Completa todos los campos');
        return;
    }
    
    if (users[username]) {
        alert('⚠️ El usuario ya existe');
        return;
    }
    
    const name = username.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    users[username] = { password, role, name };
    
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    updateUsersList();
    alert('✅ Usuario agregado correctamente');
}

function deleteUser(username) {
    if (username === 'director') {
        alert('❌ No se puede eliminar al director principal');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar al usuario ${users[username].name}?`)) {
        delete users[username];
        updateUsersList();
        alert('✅ Usuario eliminado');
    }
}

function updateUsersList() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    container.innerHTML = Object.entries(users).map(([username, user]) => `
        <div class="user-card">
            <div>
                <strong>${user.name}</strong>
                <span style="color: #666; font-size: 0.9rem;">(${username})</span>
                <span style="background: ${user.role === 'director' ? '#667eea' : '#10b981'}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-left: 0.5rem;">
                    ${user.role === 'director' ? 'Director' : 'Vendedor'}
                </span>
            </div>
            <button onclick="deleteUser('${username}')" class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" ${username === 'director' ? 'disabled' : ''}>
                🗑️ Eliminar
            </button>
        </div>
    `).join('');
}

// ===== CONVENIOS =====
function addConvenio() {
    if (currentUser.role !== 'director') {
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
    
    convenios.push(convenioName);
    localStorage.setItem('convenios', JSON.stringify(convenios));
    document.getElementById('newConvenio').value = '';
    updateConveniosList();
    loadConveniosInSelect();
    alert('✅ Convenio agregado correctamente');
}

function deleteConvenio(convenioName) {
    if (currentUser.role !== 'director') {
        alert('❌ Solo el director puede eliminar convenios');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar el convenio "${convenioName}"?`)) {
        convenios = convenios.filter(c => c !== convenioName);
        localStorage.setItem('convenios', JSON.stringify(convenios));
        updateConveniosList();
        loadConveniosInSelect();
        alert('✅ Convenio eliminado');
    }
}

function updateConveniosList() {
    const container = document.getElementById('conveniosList');
    if (!container) return;
    
    container.innerHTML = convenios.map(convenio => `
        <div class="convenio-item">
            <span style="font-size: 0.9rem; font-weight: 500;">${convenio}</span>
            <button onclick="deleteConvenio('${convenio}')" class="btn btn-warning" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">🗑️</button>
        </div>
    `).join('');
}

function loadConveniosInSelect() {
    const convenioSelect = document.getElementById('contactConvenio');
    if (!convenioSelect) return;
    
    convenioSelect.innerHTML = '<option value="">Seleccionar convenio...</option>';
    convenios.forEach(convenio => {
        const option = document.createElement('option');
        option.value = convenio;
        option.textContent = convenio;
        convenioSelect.appendChild(option);
    });
}

// ===== UTILIDADES =====
function getUserDisplayName(username) {
    return users[username] ? users[username].name : username;
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
        } else if (tabName === 'monitoring' && currentUser.role === 'director') {
            if (typeof refreshMonitoring === 'function') refreshMonitoring();
        } else if (tabName === 'leads') {
            updateLeadsTable();
        } else if (tabName === 'reports') {
            updateReports();
        }
    }, 100);
}

function refreshData() {
    // Refresh local data views
    updateAllViews();
    if (typeof refreshPipeline === 'function') refreshPipeline();
    console.log('🔄 Data refreshed locally');
    
    // Sync with GitHub if available
    if (window.GitHubData && window.GitHubData.getToken() && currentUser.role === 'director') {
        window.GitHubData.syncWithLocal().catch(error => {
            console.log('GitHub sync failed during refresh:', error.message);
        });
    }
}

function debugData() {
    if (!window.AdminData) {
        alert('❌ AdminData not available');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const allData = AdminData.getAllData();
    const filtered = getFilteredData();
    const todayContacts = filtered.filter(c => c.date === today);
    
    let debugInfo = `🔍 ADMIN DATA DEBUG INFO:\n\n`;
    debugInfo += `Usuario actual: ${currentUser.username} (${currentUser.role})\n`;
    debugInfo += `Fecha de hoy: ${today}\n`;
    debugInfo += `Total contactos en AdminData: ${allData.length}\n`;
    
    if (currentUser.role === 'director') {
        debugInfo += `Vista del director - viendo TODOS los contactos\n`;
        const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
        debugInfo += `\nVendedores en sistema: ${salespeople.length}\n`;
        salespeople.forEach(sp => {
            const count = allData.filter(d => d.salesperson === sp).length;
            debugInfo += `   - ${getUserDisplayName(sp)}: ${count} contactos\n`;
        });
    } else {
        debugInfo += `Mis contactos (filtrados): ${filtered.length}\n`;
        debugInfo += `Mis contactos de hoy: ${todayContacts.length}\n\n`;
        debugInfo += `Detalles de mis contactos de hoy:\n`;
        debugInfo += todayContacts.map(c => `- ${c.name} (${c.time})`).join('\n') || 'Ninguno';
    }
    
    // Add AdminData stats
    const teamStats = AdminData.getTeamStats();
    debugInfo += `\n\n📊 ESTADÍSTICAS ADMINDATA:\n`;
    debugInfo += `Total contactos: ${teamStats.totalContacts}\n`;
    debugInfo += `Contactos hoy: ${teamStats.todayContacts}\n`;
    debugInfo += `Leads activos: ${teamStats.activeLeads}\n`;
    debugInfo += `Conversiones: ${teamStats.conversions}\n`;
    debugInfo += `Tasa conversión: ${teamStats.conversionRate}%\n`;
    
    alert(debugInfo);
}

// ===== FUNCIONES DE SINCRONIZACIÓN =====

// Función de diagnóstico para el director
function diagnoseDirectorData() {
    if (currentUser.role !== 'director') {
        alert('❌ Esta función es solo para el director');
        return;
    }
    
    console.log('🔍 DIAGNÓSTICO COMPLETO DE DATOS DEL DIRECTOR');
    
    const localStorageData = localStorage.getItem('ciudad_bilingue_sales_data');
    const localStorageCount = localStorageData ? JSON.parse(localStorageData).length : 0;
    const adminDataCount = window.AdminData ? AdminData.getAllData().length : 0;
    const filteredDataCount = getFilteredData().length;
    
    let diagnostic = `🔍 DIAGNÓSTICO DEL DIRECTOR\n\n`;
    diagnostic += `📊 localStorage: ${localStorageCount} registros\n`;
    diagnostic += `📊 AdminData: ${adminDataCount} registros\n`;
    diagnostic += `📊 Vista filtrada: ${filteredDataCount} registros\n\n`;
    
    if (window.AdminData) {
        const teamStats = AdminData.getTeamStats();
        diagnostic += `👥 Vendedores detectados: ${teamStats.salespeople.length}\n`;
        teamStats.salespeople.forEach(sp => {
            diagnostic += `   - ${sp.displayName}: ${sp.stats.totalContacts} contactos\n`;
        });
        
        diagnostic += `\n📈 Estadísticas del equipo:\n`;
        diagnostic += `   - Total contactos: ${teamStats.totalContacts}\n`;
        diagnostic += `   - Contactos hoy: ${teamStats.todayContacts}\n`;
        diagnostic += `   - Leads activos: ${teamStats.activeLeads}\n`;
        diagnostic += `   - Conversiones: ${teamStats.conversions}\n`;
    }
    
    alert(diagnostic);
    
    // También forzar una reparación de datos
    if (window.AdminData && localStorageCount > adminDataCount) {
        if (confirm('🔧 Se detectaron más datos en localStorage que en AdminData. ¿Quieres sincronizar?')) {
            AdminData.forceSyncFromStorage();
            updateAllViews();
            setTimeout(() => {
                updateLeadsTable();
                alert('✅ Datos sincronizados. La vista debería actualizarse ahora.');
            }, 500);
        }
    }
}

// Función de sincronización forzada
function forceDataSync() {
    if (currentUser.role !== 'director') {
        alert('❌ Solo el director puede usar esta función');
        return;
    }
    
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    console.log('🔄 Iniciando sincronización forzada...');
    
    // Paso 1: Forzar carga desde localStorage
    const syncedCount = AdminData.forceSyncFromStorage();
    
    // Paso 2: Actualizar todas las vistas
    updateAllViews();
    
    // Paso 3: Actualizar tabla de leads específicamente
    setTimeout(() => {
        updateLeadsTable();
    }, 200);
    
    // Paso 4: Actualizar pipeline
    setTimeout(() => {
        if (typeof refreshPipeline === 'function') {
            refreshPipeline();
        }
    }, 400);
    
    alert(`✅ Sincronización forzada completada!

📊 Registros sincronizados: ${syncedCount}
🔄 Vistas actualizadas
📋 Tabla de leads refrescada

Si aún no ves los datos, verifica que los vendedores hayan guardado correctamente los contactos.`);
}

function updateAllViews() {
    console.log('🔄 Updating all views...');
    if (typeof updateStats === 'function') updateStats();
    if (typeof updateTodayContacts === 'function') updateTodayContacts();
    if (typeof updateLeadsTable === 'function') updateLeadsTable();
    if (typeof updateReports === 'function') updateReports();
    
    // Director-specific updates
    if (currentUser && currentUser.role === 'director') {
        populateSalespersonFilter();
        // Update monitoring if the tab is currently active
        const monitoringTab = document.getElementById('monitoring');
        if (monitoringTab && !monitoringTab.classList.contains('hidden')) {
            if (typeof refreshMonitoring === 'function') refreshMonitoring();
        }
    }
    
    console.log('✅ All views updated');
}

function populateSalespersonFilter() {
    const filter = document.getElementById('salespersonFilter');
    if (!filter || !window.AdminData) return;
    
    const allData = AdminData.getAllData();
    const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
    filter.innerHTML = '<option value="">Todos los vendedores</option>';
    
    salespeople.forEach(salesperson => {
        const option = document.createElement('option');
        option.value = salesperson;
        option.textContent = getUserDisplayName(salesperson);
        filter.appendChild(option);
    });
    
    console.log('📋 Populated salesperson filter with', salespeople.length, 'salespeople');
}

function toggleAutoSync() {
    autoSyncEnabled = !autoSyncEnabled;
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled.toString());
    
    const btn = document.getElementById('autoSyncBtn');
    if (autoSyncEnabled) {
        btn.style.background = '#10b981';
        btn.textContent = '⚡ Auto';
    } else {
        btn.style.background = '#6b7280';
        btn.textContent = '⏸️ Auto';
    }
    
    console.log('Auto-sync toggled:', autoSyncEnabled);
}

function clearLocalData() {
    if (confirm('⚠️ ¿Estás seguro de eliminar TODOS los contactos?\n\nEsta acción eliminará todos los datos del sistema.\n\nAsegúrate de haber exportado los datos primero.')) {
        if (window.AdminData) {
            AdminData.clearAllData();
            alert('🗑️ Todos los datos han sido eliminados del sistema');
        } else {
            alert('❌ AdminData no disponible');
        }
    }
}
