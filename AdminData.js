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

    // ===== IMPROVED SYNCHRONIZATION METHODS =====
    
    // Forzar sincronización de datos al cargar
    forceSyncFromStorage() {
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
    }

    // Verificar y reparar datos si es necesario
    verifyAndRepairData() {
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
// 1. AGREGAR AL FINAL DE AdminData.js
AdminData.enableAutoSync = function() {
    console.log('🔄 Habilitando auto-sincronización...');
    
    if (window.GitHubData && window.GitHubData.getToken()) {
        setInterval(async () => {
            try {
                const githubContacts = await window.GitHubData.getAllContacts();
                if (githubContacts.length > this.data.length) {
                    console.log(`📥 Nuevos datos: ${githubContacts.length} vs ${this.data.length}`);
                    this.data = githubContacts;
                    this.saveData();
                    this.notifyObservers();
                    showSyncNotification(`📥 ${githubContacts.length - this.data.length} nuevos contactos`);
                }
            } catch (error) {
                console.log('⚠️ Auto-sync failed:', error.message);
            }
        }, 30000);
        console.log('✅ Auto-sync habilitado (cada 30 segundos)');
    }
};
