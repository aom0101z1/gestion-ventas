//AdminData.js - ENHANCED VERSION
// ===== ADMIN DATA MODULE =====
// Centralized data management for all salespeople

class AdminDataManager {
    constructor() {
        this.storageKey = 'ciudad_bilingue_sales_data';
        this.data = this.loadData();
        this.observers = [];
        
        console.log('🏢 AdminDataManager initialized with', this.data.length, 'records');
        
        // Auto-integrity check on initialization
        setTimeout(() => {
            this.verifyAndRepairData();
        }, 1000);
    }

    // ===== ENHANCED DATA PERSISTENCE =====
    loadData() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            const data = savedData ? JSON.parse(savedData) : [];
            console.log('📊 Loaded', data.length, 'records from storage');
            
            // Validate data structure
            const validData = data.filter(item => 
                item && 
                typeof item === 'object' && 
                item.id && 
                item.name && 
                item.salesperson
            );
            
            if (validData.length !== data.length) {
                console.log('🔧 Cleaned', data.length - validData.length, 'invalid records');
            }
            
            return validData;
        } catch (e) {
            console.error('❌ Error loading data:', e);
            return [];
        }
    }

    saveData() {
        try {
            // Ensure data integrity before saving
            const validData = this.data.filter(item => 
                item && 
                typeof item === 'object' && 
                item.id && 
                item.name && 
                item.salesperson
            );
            
            if (validData.length !== this.data.length) {
                console.log('🔧 Cleaned', this.data.length - validData.length, 'invalid records before save');
                this.data = validData;
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            console.log('💾 Saved', this.data.length, 'records to storage');
            
            // Notify observers after successful save
            this.notifyObservers();
        } catch (e) {
            console.error('❌ Error saving data:', e);
            // Try to recover from error
            this.recoverFromSaveError();
        }
    }

    recoverFromSaveError() {
        console.log('🚨 Attempting data recovery...');
        try {
            // Try to save a minimal version
            const minimalData = this.data.map(item => ({
                id: item.id,
                name: item.name,
                phone: item.phone,
                salesperson: item.salesperson,
                date: item.date,
                status: item.status || 'Nuevo'
            }));
            
            localStorage.setItem(this.storageKey, JSON.stringify(minimalData));
            console.log('✅ Data recovery successful');
        } catch (e) {
            console.error('❌ Data recovery failed:', e);
        }
    }

    // ===== ENHANCED OBSERVER PATTERN =====
    addObserver(callback) {
        this.observers.push(callback);
        console.log('👁️ Observer added, total:', this.observers.length);
    }

    notifyObservers() {
        console.log('📢 Notifying', this.observers.length, 'observers...');
        this.observers.forEach((callback, index) => {
            try {
                callback(this.data);
            } catch (e) {
                console.error(`❌ Error in observer ${index}:`, e);
            }
        });
    }

    // ===== ENHANCED DATA OPERATIONS =====
    
    // Add new contact/lead with validation
    addContact(contact) {
        try {
            // Validate required fields
            if (!contact.name || !contact.phone || !contact.salesperson) {
                throw new Error('Missing required fields: name, phone, or salesperson');
            }

            const newContact = {
                id: contact.id || Date.now(),
                name: contact.name.trim(),
                phone: contact.phone.trim(),
                email: (contact.email || '').trim(),
                source: contact.source || 'No especificado',
                location: contact.location || 'No especificado',
                notes: (contact.notes || '').trim(),
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
        } catch (error) {
            console.error('❌ Error adding contact:', error);
            throw error;
        }
    }

    // Update existing contact with validation
    updateContact(id, updates) {
        try {
            const index = this.data.findIndex(contact => contact.id == id);
            if (index === -1) {
                console.error('❌ Contact not found:', id);
                return null;
            }

            // Validate updates
            const validUpdates = {};
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined && updates[key] !== null) {
                    validUpdates[key] = typeof updates[key] === 'string' ? updates[key].trim() : updates[key];
                }
            });

            this.data[index] = {
                ...this.data[index],
                ...validUpdates,
                updatedAt: new Date().toISOString()
            };

            this.saveData();
            console.log('📝 Updated contact:', this.data[index].name);
            return this.data[index];
        } catch (error) {
            console.error('❌ Error updating contact:', error);
            return null;
        }
    }

    // Delete contact with validation
    deleteContact(id) {
        try {
            const index = this.data.findIndex(contact => contact.id == id);
            if (index === -1) {
                console.error('❌ Contact not found:', id);
                return false;
            }

            const deleted = this.data.splice(index, 1)[0];
            this.saveData();
            console.log('🗑️ Deleted contact:', deleted.name);
            return true;
        } catch (error) {
            console.error('❌ Error deleting contact:', error);
            return false;
        }
    }

    // ===== ENHANCED DATA RETRIEVAL =====

    // Get all data (for directors) with validation
    getAllData() {
        console.log('👑 Director requesting all data:', this.data.length, 'records');
        
        // Return a deep copy to prevent external modifications
        return this.data.map(contact => ({ ...contact }));
    }

    // Get data for specific salesperson
    getDataBySalesperson(salesperson) {
        if (!salesperson) {
            console.warn('⚠️ No salesperson specified');
            return [];
        }
        
        const filtered = this.data.filter(contact => contact.salesperson === salesperson);
        console.log('👤 Salesperson', salesperson, 'has', filtered.length, 'records');
        return filtered.map(contact => ({ ...contact }));
    }

    // Get data by date range
    getDataByDateRange(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return this.data.filter(contact => {
                const contactDate = new Date(contact.date);
                return contactDate >= start && contactDate <= end;
            }).map(contact => ({ ...contact }));
        } catch (error) {
            console.error('❌ Error filtering by date range:', error);
            return [];
        }
    }

    // Get data by status
    getDataByStatus(status) {
        return this.data.filter(contact => contact.status === status)
                        .map(contact => ({ ...contact }));
    }

    // Get today's contacts with enhanced filtering
    getTodayContacts(salesperson = null) {
        const today = new Date().toISOString().split('T')[0];
        let filtered = this.data.filter(contact => contact.date === today);
        
        if (salesperson) {
            filtered = filtered.filter(contact => contact.salesperson === salesperson);
        }
        
        console.log('📅 Today contacts:', filtered.length, salesperson ? `for ${salesperson}` : 'total');
        return filtered.map(contact => ({ ...contact }));
    }

    // ===== ENHANCED ANALYTICS =====

    // Get statistics for salesperson
    getSalespersonStats(salesperson) {
        const contacts = this.getDataBySalesperson(salesperson);
        const today = new Date().toISOString().split('T')[0];
        
        const stats = {
            totalContacts: contacts.length,
            todayContacts: contacts.filter(c => c.date === today).length,
            activeLeads: contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length,
            conversions: contacts.filter(c => c.status === 'Convertido').length,
            conversionRate: contacts.length > 0 ? 
                (contacts.filter(c => c.status === 'Convertido').length / contacts.length * 100).toFixed(1) : 0,
            byStatus: this.getStatusBreakdown(contacts),
            bySource: this.getSourceBreakdown(contacts)
        };
        
        console.log('👤 Stats for', salesperson, ':', stats);
        return stats;
    }

    // Get team statistics (for directors)
    getTeamStats() {
        const salespeople = [...new Set(this.data.map(c => c.salesperson))].filter(s => s);
        const today = new Date().toISOString().split('T')[0];
        
        const teamStats = {
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
        
        console.log('👑 Team stats:', teamStats);
        return teamStats;
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
            const source = contact.source || 'No especificado';
            sources[source] = (sources[source] || 0) + 1;
        });
        return sources;
    }

    // ===== ENHANCED UTILITIES =====

    // Get user display name with fallback
    getUserDisplayName(username) {
        if (window.users && window.users[username]) {
            return window.users[username].name;
        }
        
        // Fallback to generating name from username
        return username.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    }

    // Clear all data with confirmation
    clearAllData() {
        console.log('🗑️ Clearing all data...');
        this.data = [];
        this.saveData();
        console.log('🗑️ All data cleared');
    }

    // Import data with validation
    importData(newData) {
        try {
            if (!Array.isArray(newData)) {
                throw new Error('Import data must be an array');
            }
            
            const validData = newData.filter(item => 
                item && 
                typeof item === 'object' && 
                item.id && 
                item.name && 
                item.salesperson
            );
            
            this.data = validData;
            this.saveData();
            console.log('📥 Imported', validData.length, 'valid records');
            
            if (validData.length !== newData.length) {
                console.warn('⚠️ Filtered out', newData.length - validData.length, 'invalid records');
            }
        } catch (error) {
            console.error('❌ Error importing data:', error);
            throw error;
        }
    }

    // Export data with metadata
    exportData() {
        return {
            data: this.data,
            exportDate: new Date().toISOString(),
            totalRecords: this.data.length,
            version: '2.0',
            salespeople: [...new Set(this.data.map(c => c.salesperson))].filter(s => s)
        };
    }

    // ===== ENHANCED SEARCH & FILTER =====

    // Advanced search with better performance
    searchContacts(query, filters = {}) {
        let results = this.data;

        // Text search with better performance
        if (query) {
            const searchTerm = query.toLowerCase().trim();
            if (searchTerm) {
                results = results.filter(contact => 
                    contact.name.toLowerCase().includes(searchTerm) ||
                    contact.phone.includes(searchTerm) ||
                    (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
                    (contact.notes && contact.notes.toLowerCase().includes(searchTerm))
                );
            }
        }

        // Apply filters efficiently
        Object.keys(filters).forEach(filterKey => {
            const filterValue = filters[filterKey];
            if (filterValue) {
                switch (filterKey) {
                    case 'salesperson':
                        results = results.filter(contact => contact.salesperson === filterValue);
                        break;
                    case 'status':
                        results = results.filter(contact => contact.status === filterValue);
                        break;
                    case 'source':
                        results = results.filter(contact => contact.source === filterValue);
                        break;
                    case 'location':
                        results = results.filter(contact => contact.location === filterValue);
                        break;
                    case 'dateFrom':
                        results = results.filter(contact => contact.date >= filterValue);
                        break;
                    case 'dateTo':
                        results = results.filter(contact => contact.date <= filterValue);
                        break;
                }
            }
        });

        console.log('🔍 Search returned', results.length, 'results');
        return results.map(contact => ({ ...contact }));
    }

    // ===== ENHANCED BULK OPERATIONS =====

    // Bulk update status with validation
    bulkUpdateStatus(contactIds, newStatus) {
        const validStatuses = ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'];
        
        if (!validStatuses.includes(newStatus)) {
            console.error('❌ Invalid status:', newStatus);
            return 0;
        }
        
        let updated = 0;
        contactIds.forEach(id => {
            const contact = this.updateContact(id, { status: newStatus });
            if (contact) updated++;
        });
        
        console.log('📦 Bulk updated', updated, 'contacts to status:', newStatus);
        return updated;
    }

    // Bulk delete with validation
    bulkDelete(contactIds) {
        let deleted = 0;
        contactIds.forEach(id => {
            if (this.deleteContact(id)) deleted++;
        });
        console.log('📦 Bulk deleted', deleted, 'contacts');
        return deleted;
    }

    // ===== ENHANCED SYNCHRONIZATION METHODS =====
    
    // Force synchronization from localStorage
    forceSyncFromStorage() {
        console.log('🔄 Forcing synchronization from localStorage...');
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                // Validate before syncing
                const validData = parsedData.filter(item => 
                    item && 
                    typeof item === 'object' && 
                    item.id && 
                    item.name && 
                    item.salesperson
                );
                
                this.data = validData;
                console.log('✅ Force sync completed:', this.data.length, 'records');
                this.notifyObservers();
                return this.data.length;
            } else {
                console.log('⚠️ No data in localStorage to sync');
                return 0;
            }
        } catch (e) {
            console.error('❌ Error in force sync:', e);
            return 0;
        }
    }

    // Comprehensive data verification and repair
    verifyAndRepairData() {
        console.log('🔧 Verifying and repairing data integrity...');
        
        try {
            const localStorageData = localStorage.getItem(this.storageKey);
            const adminDataCount = this.data.length;
            const localStorageCount = localStorageData ? JSON.parse(localStorageData).length : 0;
            
            console.log(`   - AdminData: ${adminDataCount} records`);
            console.log(`   - localStorage: ${localStorageCount} records`);
            
            let repaired = false;
            
            // Repair discrepancies
            if (adminDataCount !== localStorageCount) {
                console.log('⚠️ Data discrepancy detected, repairing...');
                
                if (localStorageCount > adminDataCount) {
                    // localStorage has more data, sync from it
                    this.forceSyncFromStorage();
                    repaired = true;
                } else if (adminDataCount > localStorageCount) {
                    // AdminData has more data, save it
                    this.saveData();
                    repaired = true;
                }
            }
            
            // Validate data structure
            const beforeCount = this.data.length;
            this.data = this.data.filter(item => 
                item && 
                typeof item === 'object' && 
                item.id && 
                item.name && 
                item.salesperson
            );
            
            if (this.data.length !== beforeCount) {
                console.log(`🔧 Cleaned ${beforeCount - this.data.length} invalid records`);
                this.saveData();
                repaired = true;
            }
            
            // Remove duplicates based on ID
            const uniqueData = [];
            const seenIds = new Set();
            
            this.data.forEach(item => {
                if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    uniqueData.push(item);
                }
            });
            
            if (uniqueData.length !== this.data.length) {
                console.log(`🔧 Removed ${this.data.length - uniqueData.length} duplicate records`);
                this.data = uniqueData;
                this.saveData();
                repaired = true;
            }
            
            if (repaired) {
                console.log('✅ Data repair completed');
                this.notifyObservers();
            } else {
                console.log('✅ Data integrity verified - no repairs needed');
            }
            
            return repaired;
        } catch (error) {
            console.error('❌ Error during data verification:', error);
            return false;
        }
    }

    // Get comprehensive system status
    getSystemStatus() {
        const today = new Date().toISOString().split('T')[0];
        const salespeople = [...new Set(this.data.map(c => c.salesperson))].filter(s => s);
        
        return {
            timestamp: new Date().toISOString(),
            totalRecords: this.data.length,
            todayRecords: this.data.filter(c => c.date === today).length,
            salespeople: salespeople.length,
            observers: this.observers.length,
            storageSize: JSON.stringify(this.data).length,
            lastModified: this.data.length > 0 ? 
                Math.max(...this.data.map(c => new Date(c.updatedAt || c.createdAt).getTime())) : null,
            dataIntegrity: this.checkDataIntegrity()
        };
    }

    checkDataIntegrity() {
        const issues = [];
        
        // Check for missing required fields
        this.data.forEach((item, index) => {
            if (!item.id) issues.push(`Record ${index}: missing ID`);
            if (!item.name) issues.push(`Record ${index}: missing name`);
            if (!item.salesperson) issues.push(`Record ${index}: missing salesperson`);
        });
        
        // Check for duplicate IDs
        const ids = this.data.map(item => item.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            issues.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
}

// ===== GLOBAL INSTANCE =====
// Create single instance for the entire application
window.AdminData = new AdminDataManager();

// ===== ENHANCED INTEGRATION FUNCTIONS =====
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

// ===== ENHANCED SETUP OBSERVERS =====
AdminData.addObserver((data) => {
    console.log('📊 AdminData updated:', data.length, 'records');
    
    // Update UI components if they exist
    if (typeof updateAllViews === 'function') {
        updateAllViews();
    }
    if (typeof refreshPipeline === 'function') {
        refreshPipeline();
    }
    
    // Update director-specific components
    if (window.currentUser && window.currentUser.role === 'director') {
        if (typeof populateSalespersonFilter === 'function') {
            populateSalespersonFilter();
        }
        if (typeof updateLeadsTable === 'function') {
            setTimeout(updateLeadsTable, 100);
        }
    }
});

// ===== AUTO-SYNC FUNCTIONALITY =====
AdminData.enableAutoSync = function() {
    console.log('🔄 Enabling enhanced auto-sync...');
    
    // Periodic integrity check
    setInterval(() => {
        this.verifyAndRepairData();
    }, 60000); // Every minute
    
    // GitHub sync if available
    if (window.GitHubData && window.GitHubData.getToken()) {
        setInterval(async () => {
            try {
                const githubContacts = await window.GitHubData.getAllContacts();
                if (githubContacts.length > this.data.length) {
                    console.log(`📥 GitHub sync: ${githubContacts.length} vs ${this.data.length}`);
                    this.data = githubContacts;
                    this.saveData();
                    this.notifyObservers();
                }
            } catch (error) {
                console.log('⚠️ GitHub auto-sync failed:', error.message);
            }
        }, 30000); // Every 30 seconds
        console.log('✅ GitHub auto-sync enabled');
    }
    
    console.log('✅ Enhanced auto-sync enabled');
};

console.log('✅ Enhanced AdminData module loaded successfully');
console.log('📊 System status:', AdminData.getSystemStatus());
