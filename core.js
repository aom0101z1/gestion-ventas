// core.js - FIXED VERSION
// ===== VARIABLES GLOBALES =====
let users = loadUsers(); // Load from localStorage instead of hardcoded
let convenios = JSON.parse(localStorage.getItem('convenios')) || [
    'Remigio', 'Hogar Nazaret', 'Empresa de Energía', 'Coats Cadena', 'Efigas', 'Cooperativa'
];

let currentUser = null;
let autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false';

// ===== PERSISTENT USER MANAGEMENT =====
function loadUsers() {
    const savedUsers = localStorage.getItem('ciudad_bilingue_users');
    if (savedUsers) {
        console.log('✅ Loading users from localStorage');
        return JSON.parse(savedUsers);
    } else {
        console.log('🔧 Creating default users');
        const defaultUsers = {
            'director': { password: 'admin123', role: 'director', name: 'Director General' },
            'maria.garcia': { password: 'maria123', role: 'vendedor', name: 'María García' },
            'juan.perez': { password: 'juan123', role: 'vendedor', name: 'Juan Pérez' }
        };
        saveUsers(defaultUsers);
        return defaultUsers;
    }
}

function saveUsers(usersData = users) {
    localStorage.setItem('ciudad_bilingue_users', JSON.stringify(usersData));
    console.log('💾 Users saved to localStorage');
}

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
    
    // FORCE SYNC FOR DIRECTOR
    if (currentUser?.role === 'director') {
        console.log('👑 Director detected - forcing data sync');
        const currentCount = AdminData.getAllData().length;
        const storageData = localStorage.getItem('ciudad_bilingue_sales_data');
        const storageCount = storageData ? JSON.parse(storageData).length : 0;
        
        if (storageCount > currentCount) {
            console.log(`🔄 Syncing ${storageCount} records from storage`);
            AdminData.forceSyncFromStorage();
        }
        
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

// ===== ENHANCED DATA INTEGRITY FUNCTIONS =====
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
    
    // Auto-repair if discrepancy detected
    if (adminData.length !== localStorage.length) {
        console.warn('⚠️ Desincronización detectada - auto-reparando...');
        const largerDataset = localStorage.length > adminData.length ? localStorage : adminData;
        
        if (localStorage.length > adminData.length) {
            AdminData.importData(localStorage);
            console.log('✅ AdminData actualizado desde localStorage');
        }
        
        return false;
    }
    
    console.log('✅ Integridad de datos verificada');
    return true;
}

function forceFullSync() {
    console.log('🔄 INICIANDO SINCRONIZACIÓN COMPLETA...');
    
    if (!window.AdminData) {
        console.error('❌ AdminData no disponible');
        return false;
    }
    
    // Step 1: Force sync from localStorage
    AdminData.forceSyncFromStorage();
    
    // Step 2: Update all views
    setTimeout(() => {
        updateAllViews();
        updateLeadsTable();
        if (typeof refreshPipeline === 'function') refreshPipeline();
    }, 200);
    
    // Step 3: Verify integrity
    setTimeout(() => {
        verifyDataIntegrity();
    }, 500);
    
    console.log('✅ Sincronización completa finalizada');
    return true;
}

// ===== INICIALIZACIÓN MEJORADA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Ciudad Bilingue Sales System');
    
    // Load users first
    users = loadUsers();
    console.log('👥 Users loaded:', Object.keys(users).length);
    
    // Wait for AdminData to be available
    const checkAdminData = () => {
        if (window.AdminData) {
            console.log('✅ AdminData loaded successfully');
            setupAdminDataObservers();
            
            // Auto-repair data integrity on startup
            setTimeout(() => {
                verifyDataIntegrity();
            }, 1000);
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
    
    // ENHANCED DATA LOADING WITH AUTO-SYNC
    setTimeout(() => {
        if (window.AdminData) {
            console.log('🔄 Iniciando carga de datos con auto-sync mejorado...');
            
            // Force full synchronization
            forceFullSync();
            
            // Enable auto-sync
            setTimeout(() => {
                if (window.AdminData.enableAutoSync) {
                    AdminData.enableAutoSync();
                }
            }, 2000);
            
            // GitHub sync if available
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
            
            // Final setup with staggered updates
            setTimeout(() => {
                console.log('🎯 Actualizando todas las vistas...');
                updateAllViews();
                
                if (currentUser.role === 'director') {
                    populateSalespersonFilter();
                    setTimeout(() => {
                        updateLeadsTable();
                        console.log('✅ Vista del director completamente actualizada');
                    }, 300);
                }
                
                if (typeof refreshPipeline === 'function') {
                    setTimeout(() => {
                        refreshPipeline();
                    }, 500);
                }
            }, 200);
            
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

// ===== USUARIOS MEJORADOS =====
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
    
    // Create display name from username
    const name = username.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    
    // Add user to users object
    users[username] = { password, role, name };
    
    // Save to localStorage
    saveUsers(users);
    
    // Clear form
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    
    // Update UI
    updateUsersList();
    populateSalespersonFilter(); // Update director filters
    
    alert(`✅ Usuario agregado correctamente!

👤 Usuario: ${username}
🏷️ Nombre: ${name}
🎭 Rol: ${role === 'director' ? 'Director' : 'Vendedor'}

El usuario ya puede iniciar sesión y aparecerá en los filtros del director.`);
    
    console.log('✅ New user added:', username, users[username]);
}

function deleteUser(username) {
    if (username === 'director') {
        alert('❌ No se puede eliminar al director principal');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar al usuario ${users[username].name}?

⚠️ Esta acción también eliminará todos los contactos asociados a este vendedor.`)) {
        
        // Remove user's data from AdminData
        if (window.AdminData) {
            const userData = AdminData.getDataBySalesperson(username);
            userData.forEach(contact => {
                AdminData.deleteContact(contact.id);
            });
            console.log(`🗑️ Deleted ${userData.length} contacts for user ${username}`);
        }
        
        // Remove user
        delete users[username];
        saveUsers(users);
        
        // Update UI
        updateUsersList();
        populateSalespersonFilter();
        updateAllViews();
        
        alert('✅ Usuario y sus datos eliminados correctamente');
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
    
    console.log('👥 Users list updated with', Object.keys(users).length, 'users');
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
    
    console.log('✅ Convenios cargados en select:', convenios.length);
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
    console.log('🔄 Refreshing all data...');
    
    // Force full sync
    forceFullSync();
    
    // Sync with GitHub if available
    if (window.GitHubData && window.GitHubData.getToken() && currentUser.role === 'director') {
        window.GitHubData.syncWithLocal().catch(error => {
            console.log('GitHub sync failed during refresh:', error.message);
        });
    }
    
    console.log('✅ Data refresh completed');
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
    debugInfo += `Total usuarios en sistema: ${Object.keys(users).length}\n\n`;
    
    // Show all users
    debugInfo += `👥 USUARIOS EN SISTEMA:\n`;
    Object.entries(users).forEach(([username, user]) => {
        const userContacts = allData.filter(d => d.salesperson === username).length;
        debugInfo += `   - ${user.name} (${username}): ${userContacts} contactos\n`;
    });
    
    if (currentUser.role === 'director') {
        debugInfo += `\n👑 VISTA DEL DIRECTOR:\n`;
        debugInfo += `Viendo TODOS los contactos: ${filtered.length}\n`;
        debugInfo += `Contactos de hoy (equipo): ${todayContacts.length}\n`;
        
        const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
        debugInfo += `\nVendedores con datos: ${salespeople.length}\n`;
        salespeople.forEach(sp => {
            const count = allData.filter(d => d.salesperson === sp).length;
            const displayName = getUserDisplayName(sp);
            debugInfo += `   - ${displayName}: ${count} contactos\n`;
        });
    } else {
        debugInfo += `\n👤 MI VISTA:\n`;
        debugInfo += `Mis contactos (filtrados): ${filtered.length}\n`;
        debugInfo += `Mis contactos de hoy: ${todayContacts.length}\n`;
    }
    
    // Add AdminData stats
    const teamStats = AdminData.getTeamStats();
    debugInfo += `\n📊 ESTADÍSTICAS ADMINDATA:\n`;
    debugInfo += `Total contactos: ${teamStats.totalContacts}\n`;
    debugInfo += `Contactos hoy: ${teamStats.todayContacts}\n`;
    debugInfo += `Leads activos: ${teamStats.activeLeads}\n`;
    debugInfo += `Conversiones: ${teamStats.conversions}\n`;
    debugInfo += `Tasa conversión: ${teamStats.conversionRate}%\n`;
    
    alert(debugInfo);
}

// ===== SINCRONIZACIÓN MEJORADA =====

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
    const usersCount = Object.keys(users).length;
    
    let diagnostic = `🔍 DIAGNÓSTICO DEL DIRECTOR\n\n`;
    diagnostic += `👥 Usuarios en sistema: ${usersCount}\n`;
    diagnostic += `📊 localStorage: ${localStorageCount} registros\n`;
    diagnostic += `📊 AdminData: ${adminDataCount} registros\n`;
    diagnostic += `📊 Vista filtrada: ${filteredDataCount} registros\n\n`;
    
    // Show all users and their data
    diagnostic += `👥 DETALLES POR USUARIO:\n`;
    Object.entries(users).forEach(([username, user]) => {
        const userContacts = adminDataCount > 0 ? 
            AdminData.getAllData().filter(d => d.salesperson === username).length : 0;
        diagnostic += `   - ${user.name} (${username}): ${userContacts} contactos\n`;
    });
    
    if (window.AdminData) {
        const teamStats = AdminData.getTeamStats();
        diagnostic += `\n📈 Estadísticas del equipo:\n`;
        diagnostic += `   - Total contactos: ${teamStats.totalContacts}\n`;
        diagnostic += `   - Contactos hoy: ${teamStats.todayContacts}\n`;
        diagnostic += `   - Leads activos: ${teamStats.activeLeads}\n`;
        diagnostic += `   - Conversiones: ${teamStats.conversions}\n`;
        
        if (teamStats.salespeople.length > 0) {
            diagnostic += `\n👥 Vendedores detectados por AdminData:\n`;
            teamStats.salespeople.forEach(sp => {
                diagnostic += `   - ${sp.displayName}: ${sp.stats.totalContacts} contactos\n`;
            });
        }
    }
    
    alert(diagnostic);
    
    // Auto-fix if needed
    if (localStorageCount > adminDataCount) {
        if (confirm('🔧 Se detectaron más datos en localStorage que en AdminData. ¿Quieres sincronizar?')) {
            forceFullSync();
            setTimeout(() => {
                updateAllViews();
                updateLeadsTable();
                alert('✅ Datos sincronizados. La vista debería actualizarse ahora.');
            }, 500);
        }
    }
}

function forceDataSync() {
    if (!window.AdminData) {
        alert('❌ Sistema no disponible');
        return;
    }
    
    console.log('🔄 Iniciando sincronización forzada...');
    
    const result = forceFullSync();
    
    if (result) {
        const syncedCount = AdminData.getAllData().length;
        alert(`✅ Sincronización forzada completada!

📊 Registros en sistema: ${syncedCount}
👥 Usuarios: ${Object.keys(users).length}
🔄 Vistas actualizadas
📋 Tablas refrescadas

Si aún no ves los datos, verifica que los vendedores hayan guardado correctamente los contactos y que tengan los roles apropiados.`);
    } else {
        alert('❌ Error durante la sincronización');
    }
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
    if (!filter) return;
    
    // Use the users object instead of deriving from data
    const salespeople = Object.entries(users)
        .filter(([username, user]) => user.role === 'vendedor')
        .map(([username, user]) => ({ username, name: user.name }));
    
    filter.innerHTML = '<option value="">Todos los vendedores</option>';
    
    salespeople.forEach(sp => {
        const option = document.createElement('option');
        option.value = sp.username;
        option.textContent = sp.name;
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
