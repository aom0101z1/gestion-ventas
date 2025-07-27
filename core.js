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
let sheetConfig = {
    id: localStorage.getItem('sheetId') || '',
    name: localStorage.getItem('sheetName') || 'Hoja1'
};
let isConnected = false;
let autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false';
let autoSyncInterval = null;

// ===== CENTRALIZED DATA ACCESS =====
function getAllData() {
    if (window.AdminData) {
        return AdminData.getAllData();
    } else {
        console.warn('⚠️ AdminData not available, using localStorage fallback');
        try {
            const savedData = localStorage.getItem('allData');
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
        const savedData = localStorage.getItem('allData');
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
    
    // Auto-refresh cada 5 minutos
    setInterval(() => {
        if (isConnected && document.visibilityState === 'visible') {
            console.log('Auto-refresh: syncing with Google Sheets...');
            refreshData();
        }
    }, 300000);
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
    // AdminData handles all data loading now
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
    if (sheetConfig.id) connectToSheet();
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
        
        if (sheetConfig.id) {
            document.getElementById('sheetId').value = sheetConfig.id;
            document.getElementById('sheetName').value = sheetConfig.name;
        }
        updateUsersList();
        updateConveniosList();
        populateSalespersonFilter();
        
        // Add test data button for director
        setTimeout(addTestDataButton, 500);
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
    
    // LOAD DATA AND UPDATE VIEWS - WITH PROPER TIMING
    setTimeout(() => {
        loadLocalData();
        updateAllViews();
        // Force pipeline refresh if we're on that tab
        if (typeof refreshPipeline === 'function') {
            refreshPipeline();
        }
        console.log('✅ Interfaz configurada completamente con datos cargados');
    }, 200);
}

// ===== GOOGLE SHEETS =====
function configureSheet() {
    if (currentUser.role !== 'director') {
        alert('❌ Solo el director puede configurar el sistema');
        return;
    }
    
    const sheetId = document.getElementById('sheetId').value.trim();
    const sheetName = document.getElementById('sheetName').value.trim();
    
    if (!sheetId) {
        alert('⚠️ Por favor ingresa el ID del Google Sheet');
        return;
    }

    sheetConfig.id = sheetId;
    sheetConfig.name = sheetName;
    localStorage.setItem('sheetId', sheetId);
    localStorage.setItem('sheetName', sheetName);
    
    document.getElementById('configResult').innerHTML = '<div class="success-message">✅ Configuración guardada. Conectando...</div>';
    setTimeout(() => connectToSheet(), 1000);
}

async function connectToSheet() {
    try {
        if (!sheetConfig.id) {
            document.getElementById('connectionStatus').textContent = '🔴 Sin Configurar';
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            return;
        }

        // Use the published CSV URL instead of the API endpoint to avoid CORS issues
        const url = `https://docs.google.com/spreadsheets/d/${sheetConfig.id}/export?format=csv&gid=0`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('No se pudo acceder al Google Sheet');
        }
        
        const csvText = await response.text();
        
        if (csvText && csvText.length > 0) {
            isConnected = true;
            document.getElementById('connectionStatus').textContent = '🟢 Conectado';
            document.getElementById('connectionStatus').className = 'connection-status connected';
            parseCSVData(csvText);
        } else {
            throw new Error('El Google Sheet está vacío');
        }
    } catch (error) {
        console.error('Error conectando con Google Sheets:', error);
        isConnected = false;
        document.getElementById('connectionStatus').textContent = '🔴 Error de Conexión';
        document.getElementById('connectionStatus').className = 'connection-status disconnected';
        
        if (currentUser && currentUser.role === 'director') {
            alert('⚠️ Error conectando con Google Sheets. Asegúrate de que:\n\n1. El Google Sheet sea público\n2. El ID sea correcto\n3. El sheet tenga datos');
        }
    }
}

function parseCSVData(csvText) {
    console.log('📊 Parsing CSV data from Google Sheets');
    
    if (!window.AdminData) {
        console.log('❌ AdminData not available for sheet parsing');
        return;
    }
    
    const lines = csvText.split('\n');
    const sheetData = [];
    
    // Skip header row and process data
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
        
        if (columns.length >= 11 && columns[1]) { // Make sure we have enough columns and a name
            const contact = {
                id: columns[0] || Date.now() + i,
                name: columns[1],
                phone: columns[2] || '',
                email: columns[3] || '',
                source: columns[4] || '',
                location: columns[5] || '',
                notes: columns[6] || '',
                salesperson: columns[7] || '',
                date: columns[8] || new Date().toISOString().split('T')[0],
                time: columns[9] || new Date().toLocaleTimeString(),
                status: columns[10] || 'Nuevo'
            };
            
            sheetData.push(contact);
        }
    }
    
    console.log('✅ CSV data parsed:', sheetData.length, 'valid contacts');
    
    if (sheetData.length > 0) {
        // Import data to AdminData (this will merge with existing data)
        AdminData.importData(sheetData);
        console.log('📥 Sheet data imported to AdminData');
        updateAllViews();
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
    if (isConnected) {
        const originalText = document.getElementById('connectionStatus').textContent;
        document.getElementById('connectionStatus').textContent = '🔄 Sincronizando...';
        document.getElementById('connectionStatus').className = 'connection-status';
        document.getElementById('connectionStatus').style.background = '#fbbf24';
        document.getElementById('connectionStatus').style.color = '#92400e';
        
        connectToSheet();
        
        setTimeout(() => {
            if (isConnected) {
                document.getElementById('connectionStatus').textContent = '🟢 Conectado';
                document.getElementById('connectionStatus').className = 'connection-status connected';
            }
        }, 2000);
    } else {
        // Even without sheet connection, refresh local data views
        updateAllViews();
        if (typeof refreshPipeline === 'function') refreshPipeline();
        console.log('🔄 Data refreshed locally');
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

// ===== TEST DATA GENERATOR =====
function generateTestData() {
    console.log('🧪 Generating test data...');
    
    if (!window.AdminData) {
        alert('❌ AdminData not available. Please refresh the page.');
        return;
    }
    
    const testContacts = [
        // María García's data
        {
            name: "Carlos Rodríguez",
            phone: "3001234567",
            email: "carlos.rodriguez@email.com",
            source: "Facebook",
            location: "Pereira",
            notes: "Interesado en curso de inglés intensivo",
            salesperson: "maria.garcia",
            status: "Contactado"
        },
        {
            name: "Ana Martínez",
            phone: "3109876543",
            email: "ana.martinez@gmail.com",
            source: "Instagram",
            location: "Dosquebradas", 
            notes: "Quiere clases para su hijo de 12 años",
            salesperson: "maria.garcia",
            status: "Interesado"
        },
        {
            name: "Luis Gómez",
            phone: "3156789012",
            email: "luis.gomez@hotmail.com",
            source: "Google",
            location: "La Virginia",
            notes: "Necesita certificación para trabajo",
            salesperson: "maria.garcia",
            date: getYesterdayDate(),
            status: "Convertido"
        },
        // Juan Pérez's data
        {
            name: "Patricia López",
            phone: "3187654321",
            email: "patricia.lopez@empresa.com",
            source: "CONVENIO: Empresa de Energía",
            location: "Pereira",
            notes: "Curso corporativo para 5 empleados",
            salesperson: "juan.perez",
            status: "Negociación"
        },
        {
            name: "Roberto Silva",
            phone: "3203456789",
            email: "roberto.silva@yahoo.com",
            source: "Referido",
            location: "Santa Rosa",
            notes: "Recomendado por Ana Martínez",
            salesperson: "juan.perez",
            status: "Nuevo"
        },
        {
            name: "Carmen Fernández",
            phone: "3134567890",
            email: "carmen.fernandez@gmail.com",
            source: "Volante",
            location: "Dosquebradas",
            notes: "Interesada en clases nocturnas",
            salesperson: "juan.perez",
            date: getYesterdayDate(),
            status: "Contactado"
        }
    ];
    
    // Add test contacts to AdminData
    testContacts.forEach(contact => {
        AdminData.addContact(contact);
    });
    
    console.log(`✅ ${testContacts.length} test contacts added to AdminData`);
    
    // Force update all views
    updateAllViews();
    
    // Get updated stats
    const teamStats = AdminData.getTeamStats();
    
    alert(`🧪 ¡Test data generated successfully!

✅ Added ${testContacts.length} sample contacts:
   • María García: ${testContacts.filter(c => c.salesperson === 'maria.garcia').length} contacts
   • Juan Pérez: ${testContacts.filter(c => c.salesperson === 'juan.perez').length} contacts

📊 Total in system: ${teamStats.totalContacts} contacts

🎯 Now the DIRECTOR can see:
   • 👀 Team Monitoring
   • 👥 All Leads with filters  
   • 🎯 Complete Team Pipeline
   • 📊 Executive Dashboard

✨ Data is automatically shared between all users!`);
}

function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

function getTwoDaysAgoDate() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return twoDaysAgo.toISOString().split('T')[0];
}

// Add test data button for director
function addTestDataButton() {
    if (currentUser?.role === 'director') {
        const userInfo = document.querySelector('.user-info');
        if (userInfo && !document.getElementById('testDataBtn')) {
            const button = document.createElement('button');
            button.id = 'testDataBtn';
            button.textContent = '🧪 Datos de Prueba';
            button.className = 'btn btn-warning';
            button.style.cssText = 'width: auto; padding: 0.5rem 1rem; margin-left: 1rem; font-size: 0.8rem;';
            button.onclick = generateTestData;
            userInfo.appendChild(button);
        }
    }
}
