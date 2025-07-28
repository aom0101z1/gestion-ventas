// AdminData.js - FIREBASE INTEGRATED VERSION
// ===== FIREBASE ADMIN DATA MODULE =====
// Centralized data management with Firebase Realtime Database

class FirebaseAdminDataManager {
    constructor() {
        this.observers = [];
        this.data = [];
        this.isReady = false;
        this.currentUserProfile = null;
        
        console.log('🔥 Firebase AdminDataManager initialized');
        
        // Wait for Firebase to be ready
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for Firebase auth state
            if (window.FirebaseData && window.FirebaseData.currentUser) {
                await this.setup();
            } else {
                // Listen for auth state changes
                const checkAuth = () => {
                    if (window.FirebaseData && window.FirebaseData.currentUser) {
                        clearInterval(authCheck);
                        this.setup();
                    }
                };
                const authCheck = setInterval(checkAuth, 100);
            }
        } catch (error) {
            console.error('❌ AdminData initialization error:', error);
        }
    }

    async setup() {
        try {
            // Load user profile
            this.currentUserProfile = await window.FirebaseData.loadUserProfile();
            console.log('👤 Current user profile:', this.currentUserProfile);
            
            // Load initial data
            await this.loadData();
            
            // Setup Firebase listener for real-time updates
            window.FirebaseData.addObserver(() => {
                this.loadData();
            });
            
            this.isReady = true;
            console.log('✅ Firebase AdminData setup complete');
            
        } catch (error) {
            console.error('❌ AdminData setup error:', error);
        }
    }

    // ===== DATA LOADING =====
    async loadData() {
        try {
            if (!window.FirebaseData || !window.FirebaseData.currentUser) {
                console.log('⚠️ Firebase not ready for data loading');
                return [];
            }

            this.data = await window.FirebaseData.getFilteredContacts();
            console.log('📊 Loaded', this.data.length, 'records from Firebase');
            
            // Notify observers after data load
            this.notifyObservers();
            
            return this.data;
        } catch (error) {
            console.error('❌ Error loading data from Firebase:', error);
            return [];
        }
    }

    // ===== OBSERVER PATTERN =====
    addObserver(callback) {
        this.observers.push(callback);
        console.log('👁️ Observer added to Firebase AdminData, total:', this.observers.length);
    }

    notifyObservers() {
        console.log('📢 Notifying', this.observers.length, 'Firebase observers...');
        this.observers.forEach((callback, index) => {
            try {
                callback(this.data);
            } catch (error) {
                console.error(`❌ Error in Firebase observer ${index}:`, error);
            }
        });
    }

    // ===== DATA OPERATIONS =====
    
    async addContact(contact) {
        try {
            if (!window.FirebaseData) {
                throw new Error('Firebase not available');
            }

            // Validate required fields
            if (!contact.name || !contact.phone) {
                throw new Error('Missing required fields: name or phone');
            }

            const contactData = {
                name: contact.name.trim(),
                phone: contact.phone.trim(),
                email: (contact.email || '').trim(),
                source: contact.source || 'No especificado',
                location: contact.location || 'No especificado',
                notes: (contact.notes || '').trim(),
                salesperson: contact.salesperson || 'unknown', // Keep for compatibility
                date: contact.date || new Date().toISOString().split('T')[0],
                time: contact.time || new Date().toLocaleTimeString(),
                status: contact.status || 'Nuevo'
            };

            const savedContact = await window.FirebaseData.addContact(contactData);
            console.log('✅ Contact added to Firebase:', savedContact.name);
            
            // Refresh local data
            await this.loadData();
            
            return savedContact;
        } catch (error) {
            console.error('❌ Error adding contact to Firebase:', error);
            throw error;
        }
    }

    async updateContact(id, updates) {
        try {
            if (!window.FirebaseData) {
                throw new Error('Firebase not available');
            }

            // Validate updates
            const validUpdates = {};
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined && updates[key] !== null) {
                    validUpdates[key] = typeof updates[key] === 'string' ? updates[key].trim() : updates[key];
                }
            });

            await window.FirebaseData.updateContact(id, validUpdates);
            console.log('📝 Contact updated in Firebase:', id);
            
            // Refresh local data
            await this.loadData();
            
            // Find and return updated contact
            const updatedContact = this.data.find(contact => contact.id === id);
            return updatedContact || null;
        } catch (error) {
            console.error('❌ Error updating contact in Firebase:', error);
            throw error;
        }
    }

    async deleteContact(id) {
        try {
            if (!window.FirebaseData) {
                throw new Error('Firebase not available');
            }

            await window.FirebaseData.deleteContact(id);
            console.log('🗑️ Contact deleted from Firebase:', id);
            
            // Refresh local data
            await this.loadData();
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting contact from Firebase:', error);
            return false;
        }
    }

    // ===== DATA RETRIEVAL =====

    getAllData() {
        if (!this.isReady) {
            console.log('⚠️ Firebase AdminData not ready, returning empty array');
            return [];
        }
        
        console.log('👑 Returning all Firebase data:', this.data.length, 'records');
        return [...this.data]; // Return copy to prevent external modifications
    }

    getDataBySalesperson(salespersonId) {
        if (!this.isReady) {
            console.log('⚠️ Firebase AdminData not ready');
            return [];
        }
        
        // Filter by salespersonId (Firebase) or salesperson (legacy)
        const filtered = this.data.filter(contact => 
            contact.salespersonId === salespersonId || 
            contact.salesperson === salespersonId
        );
        
        console.log('👤 Firebase data for salesperson', salespersonId, ':', filtered.length, 'records');
        return [...filtered];
    }

    getDataByDateRange(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return this.data.filter(contact => {
                const contactDate = new Date(contact.date);
                return contactDate >= start && contactDate <= end;
            });
        } catch (error) {
            console.error('❌ Error filtering by date range:', error);
            return [];
        }
    }

    getDataByStatus(status) {
        return this.data.filter(contact => contact.status === status);
    }

    getTodayContacts(salespersonId = null) {
        const today = new Date().toISOString().split('T')[0];
        let filtered = this.data.filter(contact => contact.date === today);
        
        if (salespersonId) {
            filtered = filtered.filter(contact => 
                contact.salespersonId === salespersonId || 
                contact.salesperson === salespersonId
            );
        }
        
        console.log('📅 Today Firebase contacts:', filtered.length, salespersonId ? `for ${salespersonId}` : 'total');
        return [...filtered];
    }

    // ===== ANALYTICS =====

    async getSalespersonStats(salespersonId) {
        try {
            if (!window.FirebaseData) {
                return this.getDefaultStats();
            }

            // Use Firebase stats method
            const stats = await window.FirebaseData.getStats(salespersonId);
            
            // Add additional computed stats
            const contacts = this.getDataBySalesperson(salespersonId);
            stats.byStatus = this.getStatusBreakdown(contacts);
            stats.bySource = this.getSourceBreakdown(contacts);
            
            console.log('👤 Firebase stats for', salespersonId, ':', stats);
            return stats;
        } catch (error) {
            console.error('❌ Error getting salesperson stats:', error);
            return this.getDefaultStats();
        }
    }

    async getTeamStats() {
        try {
            if (!window.FirebaseData) {
                return this.getDefaultTeamStats();
            }

            // Check if user is director
            if (!this.currentUserProfile || this.currentUserProfile.role !== 'director') {
                throw new Error('Only directors can access team stats');
            }

            const teamStats = await window.FirebaseData.getTeamStats();
            
            // Add additional computed stats
            teamStats.byStatus = this.getStatusBreakdown(this.data);
            teamStats.bySource = this.getSourceBreakdown(this.data);
            
            console.log('👑 Firebase team stats:', teamStats);
            return teamStats;
        } catch (error) {
            console.error('❌ Error getting team stats:', error);
            return this.getDefaultTeamStats();
        }
    }

    getStatusBreakdown(data) {
        const statuses = ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'];
        return statuses.reduce((acc, status) => {
            acc[status] = data.filter(c => c.status === status).length;
            return acc;
        }, {});
    }

    getSourceBreakdown(data) {
        const sources = {};
        data.forEach(contact => {
            const source = contact.source || 'No especificado';
            sources[source] = (sources[source] || 0) + 1;
        });
        return sources;
    }

    getDefaultStats() {
        return {
            totalContacts: 0,
            todayContacts: 0,
            activeLeads: 0,
            conversions: 0,
            conversionRate: 0,
            byStatus: {},
            bySource: {}
        };
    }

    getDefaultTeamStats() {
        return {
            totalContacts: 0,
            todayContacts: 0,
            activeLeads: 0,
            conversions: 0,
            conversionRate: 0,
            salespeople: [],
            byStatus: {},
            bySource: {}
        };
    }

    // ===== UTILITIES =====

    getUserDisplayName(userId) {
        // Try to get from Firebase users if available
        if (window.FirebaseData && window.FirebaseData.allUsers) {
            const user = window.FirebaseData.allUsers[userId];
            if (user) return user.name;
        }
        
        // Fallback to legacy format
        if (userId && userId.includes('.')) {
            return userId.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
        }
        
        return userId || 'Unknown User';
    }

    async clearAllData() {
        try {
            if (!this.currentUserProfile || this.currentUserProfile.role !== 'director') {
                throw new Error('Only directors can clear all data');
            }
            
            console.log('🗑️ Clearing all Firebase data...');
            
            // Delete all contacts
            const allContacts = await window.FirebaseData.getAllContacts();
            for (const contact of allContacts) {
                await window.FirebaseData.deleteContact(contact.id);
            }
            
            // Refresh local data
            await this.loadData();
            
            console.log('🗑️ All Firebase data cleared');
        } catch (error) {
            console.error('❌ Error clearing Firebase data:', error);
            throw error;
        }
    }

    async importData(newData) {
        try {
            if (!Array.isArray(newData)) {
                throw new Error('Import data must be an array');
            }
            
            console.log('📥 Importing', newData.length, 'records to Firebase');
            
            let imported = 0;
            for (const item of newData) {
                try {
                    if (item && item.name && item.phone) {
                        await this.addContact(item);
                        imported++;
                    }
                } catch (error) {
                    console.error('❌ Error importing item:', error);
                }
            }
            
            console.log('📥 Imported', imported, 'records to Firebase');
            return imported;
        } catch (error) {
            console.error('❌ Error importing data to Firebase:', error);
            throw error;
        }
    }

    exportData() {
        return {
            data: this.data,
            exportDate: new Date().toISOString(),
            totalRecords: this.data.length,
            version: '3.0-firebase',
            source: 'Firebase Realtime Database'
        };
    }

    // ===== SEARCH & FILTER =====

    searchContacts(query, filters = {}) {
        let results = [...this.data];

        // Text search
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

        // Apply filters
        Object.keys(filters).forEach(filterKey => {
            const filterValue = filters[filterKey];
            if (filterValue) {
                switch (filterKey) {
                    case 'salesperson':
                        results = results.filter(contact => 
                            contact.salespersonId === filterValue || 
                            contact.salesperson === filterValue
                        );
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

        console.log('🔍 Firebase search returned', results.length, 'results');
        return results;
    }

    // ===== BULK OPERATIONS =====

    async bulkUpdateStatus(contactIds, newStatus) {
        const validStatuses = ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'];
        
        if (!validStatuses.includes(newStatus)) {
            console.error('❌ Invalid status:', newStatus);
            return 0;
        }
        
        let updated = 0;
        for (const id of contactIds) {
            try {
                await this.updateContact(id, { status: newStatus });
                updated++;
            } catch (error) {
                console.error('❌ Error updating contact:', id, error);
            }
        }
        
        console.log('📦 Bulk updated', updated, 'contacts to status:', newStatus);
        return updated;
    }

    async bulkDelete(contactIds) {
        let deleted = 0;
        for (const id of contactIds) {
            try {
                if (await this.deleteContact(id)) {
                    deleted++;
                }
            } catch (error) {
                console.error('❌ Error deleting contact:', id, error);
            }
        }
        console.log('📦 Bulk deleted', deleted, 'contacts');
        return deleted;
    }

    // ===== SYSTEM STATUS =====

    getSystemStatus() {
        const today = new Date().toISOString().split('T')[0];
        
        return {
            timestamp: new Date().toISOString(),
            source: 'Firebase Realtime Database',
            isReady: this.isReady,
            authenticated: !!window.FirebaseData?.currentUser,
            currentUser: this.currentUserProfile,
            totalRecords: this.data.length,
            todayRecords: this.data.filter(c => c.date === today).length,
            observers: this.observers.length,
            lastUpdate: this.data.length > 0 ? 
                Math.max(...this.data.map(c => new Date(c.updatedAt || c.createdAt).getTime())) : null
        };
    }

    // ===== LEGACY COMPATIBILITY =====

    // These methods maintain compatibility with existing code
    forceSyncFromStorage() {
        console.log('⚠️ forceSyncFromStorage called - Firebase handles sync automatically');
        return this.loadData();
    }

    saveData() {
        console.log('⚠️ saveData called - Firebase saves automatically');
        // Firebase saves automatically, but we can trigger a refresh
        return this.loadData();
    }

    verifyAndRepairData() {
        console.log('🔧 verifyAndRepairData called - Firebase handles data integrity');
        return this.loadData();
    }

    // ===== MIGRATION FROM LOCALSTORAGE =====

    async migrateFromLocalStorage() {
        try {
            const localData = localStorage.getItem('ciudad_bilingue_sales_data');
            if (localData) {
                const contacts = JSON.parse(localData);
                console.log('🔄 Migrating', contacts.length, 'contacts from localStorage to Firebase');
                
                const imported = await this.importData(contacts);
                
                // Backup localStorage data before clearing
                localStorage.setItem('ciudad_bilingue_sales_data_backup', localData);
                localStorage.removeItem('ciudad_bilingue_sales_data');
                
                console.log('✅ Migration completed:', imported, 'contacts imported');
                return imported;
            }
            return 0;
        } catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        }
    }
}

// ===== GLOBAL INSTANCE =====
// Create single instance for the entire application
window.AdminData = new FirebaseAdminDataManager();

// ===== INTEGRATION FUNCTIONS =====
// Maintain API compatibility with existing code

function getAdminFilteredData(userRole, username) {
    if (userRole === 'director') {
        return AdminData.getAllData();
    } else {
        return AdminData.getDataBySalesperson(username);
    }
}

async function addContactToAdminData(contact) {
    return await AdminData.addContact(contact);
}

async function updateContactInAdminData(id, updates) {
    return await AdminData.updateContact(id, updates);
}

async function getAdminStats(userRole, username) {
    if (userRole === 'director') {
        return await AdminData.getTeamStats();
    } else {
        return await AdminData.getSalespersonStats(username);
    }
}

console.log('✅ Firebase AdminData module loaded successfully');
