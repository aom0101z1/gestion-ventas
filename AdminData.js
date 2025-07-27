// ===== ADMIN DATA MODULE =====
// Centralized data management for all salespeople

class AdminDataManager {
    constructor() {
        this.storageKey = 'ciudad_bilingue_sales_data';
        this.data = this.loadData();
        this.observers = [];
        
        console.log('🏢 AdminDataManager initialized with', this.data.length, 'records');
    }

    // ===== DATA PERSISTENCE =====
    loadData() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            const data = savedData ? JSON.parse(savedData) : [];
            console.log('📊 Loaded', data.length, 'records from storage');
            return data;
        } catch (e) {
            console.error('❌ Error loading data:', e);
            return [];
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            console.log('💾 Saved', this.data.length, 'records to storage');
            this.notifyObservers();
        } catch (e) {
            console.error('❌ Error saving data:', e);
        }
    }

    // ===== OBSERVER PATTERN =====
    addObserver(callback) {
        this.observers.push(callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => {
            try {
                callback(this.data);
            } catch (e) {
                console.error('❌ Error in observer callback:', e);
            }
        });
    }

    // ===== DATA OPERATIONS =====
    
    // Add new contact/lead
    addContact(contact) {
        const newContact = {
            id: contact.id || Date.now(),
            name: contact.name,
            phone: contact.phone,
            email: contact.email || '',
            source: contact.source,
            location: contact.location,
            notes: contact.notes || '',
            salesperson: contact.salesperson,
            date: contact.date || new Date().toISOString().split('T')[0],
            time: contact.time || new Date().toLocaleTimeString(),
            status: contact.status || 'Nuevo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.push(newContact);
        this.saveData();
        
        console.log('➕ Added contact:', newContact.name, 'by', newContact.salesperson);
        return newContact;
    }

    // Update existing contact
    updateContact(id, updates) {
        const index = this.data.findIndex(contact => contact.id == id);
        if (index === -1) {
            console.error('❌ Contact not found:', id);
            return null;
        }

        this.data[index] = {
            ...this.data[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveData();
        console.log('📝 Updated contact:', this.data[index].name);
        return this.data[index];
    }

    // Delete contact
    deleteContact(id) {
        const index = this.data.findIndex(contact => contact.id == id);
        if (index === -1) {
            console.error('❌ Contact not found:', id);
            return false;
        }

        const deleted = this.data.splice(index, 1)[0];
        this.saveData();
        console.log('🗑️ Deleted contact:', deleted.name);
        return true;
    }

    // ===== DATA RETRIEVAL =====

    // Get all data (for directors)
    getAllData() {
        console.log('👑 Director requesting all data:', this.data.length, 'records');
        return [...this.data];
    }

    // Get data for specific salesperson
    getDataBySalesperson(salesperson) {
        const filtered = this.data.filter(contact => contact.salesperson === salesperson);
        console.log('👤 Salesperson', salesperson, 'has', filtered.length, 'records');
        return filtered;
    }

    // Get data by date range
    getDataByDateRange(startDate, endDate) {
        return this.data.filter(contact => {
            const contactDate = new Date(contact.date);
            return contactDate >= new Date(startDate) && contactDate <= new Date(endDate);
        });
    }

    // Get data by status
    getDataByStatus(status) {
        return this.data.filter(contact => contact.status === status);
    }

    // Get today's contacts
    getTodayContacts(salesperson = null) {
        const today = new Date().toISOString().split('T')[0];
        let filtered = this.data.filter(contact => contact.date === today);
        
        if (salesperson) {
            filtered = filtered.filter(contact => contact.salesperson === salesperson);
        }
        
        return filtered;
    }

    // ===== ANALYTICS =====

    // Get statistics for salesperson
    getSalespersonStats(salesperson) {
        const contacts = this.getDataBySalesperson(salesperson);
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalContacts: contacts.length,
            todayContacts: contacts.filter(c => c.date === today).length,
            activeLeads: contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length,
            conversions: contacts.filter(c => c.status === 'Convertido').length,
            conversionRate: contacts.length > 0 ? 
                (contacts.filter(c => c.status === 'Convertido').length / contacts.length * 100).toFixed(1) : 0,
            byStatus: this.getStatusBreakdown(contacts),
            bySource: this.getSourceBreakdown(contacts)
        };
    }

    // Get team statistics (for directors)
    getTeamStats() {
        const salespeople = [...new Set(this.data.map(c => c.salesperson))].filter(s => s);
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalContacts: this.data.length,
            todayContacts: this.data.filter(c => c.date === today).length,
            activeLeads: this.data.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length,
            conversions: this.data.filter(c => c.status === 'Convertido').length,
            conversionRate: this.data.length > 0 ? 
                (this.data.filter(c => c.status === 'Convertido').length / this.data.length * 100).toFixed(1) : 0,
            salespeople: salespeople.map(sp => ({
                name: sp,
                displayName: this.getUserDisplayName(sp),
                stats: this.getSalespersonStats(sp)
            })),
            byStatus: this.getStatusBreakdown(this.data),
            bySource: this.getSourceBreakdown(this.data)
        };
    }

    // Get status breakdown
    getStatusBreakdown(data) {
        const statuses = ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'];
        return statuses.reduce((acc, status) => {
            acc[status] = data.filter(c => c.status === status).length;
            return acc;
        }, {});
    }

    // Get source breakdown
    getSourceBreakdown(data) {
        const sources = {};
        data.forEach(contact => {
            sources[contact.source] = (sources[contact.source] || 0) + 1;
        });
        return sources;
    }

    // ===== UTILITIES =====

    // Get user display name (you'll need to implement this based on your users object)
    getUserDisplayName(username) {
        // This should be connected to your users object from core.js
        const userMap = {
            'director': 'Director General',
            'maria.garcia': 'María García',
            'juan.perez': 'Juan Pérez'
        };
        return userMap[username] || username;
    }

    // Clear all data (for testing)
    clearAllData() {
        this.data = [];
        this.saveData();
        console.log('🗑️ All data cleared');
    }

    // Import data (for migration)
    importData(newData) {
        this.data = [...newData];
        this.saveData();
        console.log('📥 Imported', newData.length, 'records');
    }

    // Export data
    exportData() {
        return {
            data: this.data,
            exportDate: new Date().toISOString(),
            totalRecords: this.data.length
        };
    }

    // ===== SEARCH & FILTER =====

    // Search contacts
    searchContacts(query, filters = {}) {
        let results = this.data;

        // Text search
        if (query) {
            const searchTerm = query.toLowerCase();
            results = results.filter(contact => 
                contact.name.toLowerCase().includes(searchTerm) ||
                contact.phone.includes(searchTerm) ||
                contact.email.toLowerCase().includes(searchTerm) ||
                contact.notes.toLowerCase().includes(searchTerm)
            );
        }

        // Apply filters
        if (filters.salesperson) {
            results = results.filter(contact => contact.salesperson === filters.salesperson);
        }
        if (filters.status) {
            results = results.filter(contact => contact.status === filters.status);
        }
        if (filters.source) {
            results = results.filter(contact => contact.source === filters.source);
        }
        if (filters.location) {
            results = results.filter(contact => contact.location === filters.location);
        }
        if (filters.dateFrom) {
            results = results.filter(contact => contact.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            results = results.filter(contact => contact.date <= filters.dateTo);
        }

        return results;
    }

    // ===== BULK OPERATIONS =====

    // Bulk update status
    bulkUpdateStatus(contactIds, newStatus) {
        let updated = 0;
        contactIds.forEach(id => {
            const contact = this.updateContact(id, { status: newStatus });
            if (contact) updated++;
        });
        console.log('📦 Bulk updated', updated, 'contacts to status:', newStatus);
        return updated;
    }

    // Bulk delete
    bulkDelete(contactIds) {
        let deleted = 0;
        contactIds.forEach(id => {
            if (this.deleteContact(id)) deleted++;
        });
        console.log('📦 Bulk deleted', deleted, 'contacts');
        return deleted;
    }
}

// ===== GLOBAL INSTANCE =====
// Create single instance for the entire application
window.AdminData = new AdminDataManager();

// ===== INTEGRATION FUNCTIONS =====
// These functions integrate with your existing code

function getAdminFilteredData(userRole, username) {
    if (userRole === 'director') {
        return AdminData.getAllData();
    } else {
        return AdminData.getDataBySalesperson(username);
    }
}

function addContactToAdminData(contact) {
    return AdminData.addContact(contact);
}

function updateContactInAdminData(id, updates) {
    return AdminData.updateContact(id, updates);
}

function getAdminStats(userRole, username) {
    if (userRole === 'director') {
        return AdminData.getTeamStats();
    } else {
        return AdminData.getSalespersonStats(username);
    }
}

// ===== SETUP OBSERVERS =====
// Automatically update UI when data changes
AdminData.addObserver((data) => {
    console.log('📊 Data updated, refreshing views...');
    if (typeof updateAllViews === 'function') {
        updateAllViews();
    }
    if (typeof refreshPipeline === 'function') {
        refreshPipeline();
    }
});

console.log('✅ AdminData module loaded successfully');
console.log('📊 Current data summary:', AdminData.getTeamStats());
// ===== SOLUCIÓN: SISTEMA DE SINCRONIZACIÓN MEJORADO =====

// 1. MEJORA EN AdminData.js - Agregar al final del archivo AdminData.js

// Forzar sincronización de datos al cargar
AdminData.forceSyncFromStorage = function() {
    console.log('🔄 Forzando sincronización desde localStorage...');
    try {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            this.data = parsedData;
            console.log('✅ Datos forzadamente sincronizados:', this.data.length, 'registros');
            this.notifyObservers();
            return this.data.length;
        } else {
            console.log('⚠️ No hay datos en localStorage para sincronizar');
            return 0;
        }
    } catch (e) {
        console.error('❌ Error en sincronización forzada:', e);
        return 0;
    }
};

// Verificar y reparar datos si es necesario
AdminData.verifyAndRepairData = function() {
    console.log('🔧 Verificando integridad de datos...');
    
    const localStorageData = localStorage.getItem(this.storageKey);
    const adminDataCount = this.data.length;
    const localStorageCount = localStorageData ? JSON.parse(localStorageData).length : 0;
    
    console.log(`   - AdminData: ${adminDataCount} registros`);
    console.log(`   - localStorage: ${localStorageCount} registros`);
    
    if (adminDataCount !== localStorageCount) {
        console.log('⚠️ Discrepancia detectada, reparando...');
        this.forceSyncFromStorage();
        return true;
    }
    
    console.log('✅ Datos íntegros');
    return false;
};

// 2. MEJORA EN core.js - Reemplazar la función setupUserInterface

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
        
        // Add test data button for director
        setTimeout(addTestDataButton, 500);
        
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
    
    // CARGA DE DATOS MEJORADA PARA DIRECTOR
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
            
        } else {
            console.log('❌ AdminData no disponible, reintentando...');
            setTimeout(setupUserInterface, 500);
        }
    }, 100);
}

// 3. NUEVA FUNCIÓN - Agregar a core.js

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

// 4. MEJORA EN sales.js - Mejorar la función updateLeadsTable

function updateLeadsTable() {
    console.log('📋 Updating leads table for user:', currentUser?.username, currentUser?.role);
    
    // PASO CRÍTICO: Verificar datos antes de continuar
    if (!window.AdminData) {
        console.log('❌ AdminData not available');
        const tbody = document.getElementById('leadsTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">❌ Sistema no disponible</td></tr>';
        }
        return;
    }
    
    // PASO CRÍTICO: Para director, forzar sincronización si no hay datos
    if (currentUser.role === 'director') {
        const currentDataCount = AdminData.getAllData().length;
        console.log('👑 Director - verificando datos actuales:', currentDataCount);
        
        if (currentDataCount === 0) {
            console.log('⚠️ Director no tiene datos, forzando sincronización...');
            const syncedCount = AdminData.forceSyncFromStorage();
            console.log('🔄 Sincronizados', syncedCount, 'registros para el director');
        }
    }
    
    let data = getFilteredData();
    
    console.log('   - Base data:', data.length, 'records');
    
    // Apply director filters if director is logged in
    if (currentUser.role === 'director') {
        const salespersonFilter = document.getElementById('salespersonFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (salespersonFilter && salespersonFilter.value) {
            data = data.filter(lead => lead.salesperson === salespersonFilter.value);
            console.log('   - Filtered by salesperson:', data.length, 'records');
        }
        if (statusFilter && statusFilter.value) {
            data = data.filter(lead => lead.status === statusFilter.value);
            console.log('   - Filtered by status:', data.length, 'records');
        }
    }
    
    const tbody = document.getElementById('leadsTable');
    if (!tbody) {
        console.log('❌ Leads table not found');
        return;
    }
    
    if (data.length === 0) {
        const colSpan = currentUser.role === 'director' ? '7' : '6';
        const message = currentUser.role === 'director' 
            ? `No hay leads registrados por el equipo. <button onclick="diagnoseDirectorData()" style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; margin-left: 1rem; cursor: pointer;">🔍 Diagnosticar</button>`
            : 'No hay leads registrados';
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666; padding: 2rem;">${message}</td></tr>`;
        return;
    }
    
    // Sort by date (newest first)
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = data.map(lead => {
        const salespersonCell = currentUser.role === 'director' 
            ? `<td><span style="background: #667eea; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${getUserDisplayName(lead.salesperson)}</span></td>`
            : '';
        
        return `
            <tr>
                <td style="font-weight: 500;">${lead.name}</td>
                <td>${lead.phone}</td>
                <td style="font-size: 0.9rem;">${lead.source}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '').replace('ó', 'o')}">${lead.status}</span></td>
                <td style="font-size: 0.9rem;">${formatDate(lead.date)}</td>
                ${salespersonCell}
                <td>
                    <button onclick="showLeadDetails('${lead.id}')" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        📋 Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Leads table updated with', data.length, 'records');
}

// 5. BOTÓN DE EMERGENCIA PARA EL DIRECTOR - Agregar al HTML en la sección del director

// Agregar este botón en el directorConfig section después de la GitHub integration:
/*
<div style="margin-top: 2rem; padding: 1rem; background: #fee2e2; border-radius: 8px; border-left: 4px solid #dc2626;">
    <h4 style="color: #dc2626; margin-bottom: 1rem;">🚨 Herramientas de Emergencia</h4>
    <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">Si no ves los datos de tus vendedores, usa estas herramientas:</p>
    <button onclick="diagnoseDirectorData()" class="btn btn-warning" style="margin-right: 1rem;">🔍 Diagnosticar Datos</button>
    <button onclick="forceDataSync()" class="btn btn-primary">🔄 Forzar Sincronización</button>
</div>
*/

// 6. FUNCIÓN DE SINCRONIZACIÓN FORZADA - Agregar a core.js

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
