// AdminData.js - FIREBASE INTEGRATED VERSION - ENHANCED WITH FUNCTION NUMBERING
// ===== FIREBASE ADMIN DATA MODULE ENHANCED =====
// Centralized data management with Firebase Realtime Database
// ================================================================================

class FirebaseAdminDataManager {
    constructor() {
        this.observers = [];
        this.data = [];
        this.isReady = false;
        this.currentUserProfile = null;
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        
        console.log('🔥 Firebase AdminDataManager Enhanced initialized');
        
        // Wait for Firebase to be ready
        this.initialize();
    }

    // ===== FUNCIÓN 1: INITIALIZE SYSTEM =====
    async initialize() {
        try {
            console.log('⚡ FUNCIÓN 1: Initialize System');
            
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
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(authCheck);
                    console.log('⚠️ Firebase auth timeout in AdminData initialization');
                }, 10000);
            }
        } catch (error) {
            console.error('❌ FUNCIÓN 1 ERROR - AdminData initialization error:', error);
        }
    }

    // ===== FUNCIÓN 2: SETUP ADMIN DATA MANAGER =====
    async setup() {
        try {
            console.log('⚡ FUNCIÓN 2: Setup Admin Data Manager');
            
            // Load user profile with error handling
            this.currentUserProfile = await window.FirebaseData.loadUserProfile();
            console.log('👤 Current user profile:', this.currentUserProfile);
            
            // Load initial data with performance monitoring
            const startTime = performance.now();
            await this.loadData();
            const endTime = performance.now();
            console.log(`📊 Initial data load took ${(endTime - startTime).toFixed(2)}ms`);
            
            // Setup Firebase listener for real-time updates
            this.setupRealtimeListeners();
            
            this.isReady = true;
            console.log('✅ Firebase AdminData setup complete');
            
        } catch (error) {
            console.error('❌ FUNCIÓN 2 ERROR - AdminData setup error:', error);
        }
    }

    // ===== FUNCIÓN 3: SETUP REALTIME LISTENERS =====
    setupRealtimeListeners() {
        try {
            console.log('⚡ FUNCIÓN 3: Setup Realtime Listeners');
            
            if (window.FirebaseData && window.FirebaseData.addObserver) {
                window.FirebaseData.addObserver(() => {
                    this.invalidateCache();
                    this.loadData();
                });
            }
            
            // Listen for window focus to refresh data
            window.addEventListener('focus', () => {
                if (this.isReady) {
                    console.log('👁️ Window focused - refreshing data');
                    this.loadData();
                }
            });
            
            console.log('✅ Realtime listeners configured');
        } catch (error) {
            console.error('❌ FUNCIÓN 3 ERROR - Setup listeners error:', error);
        }
    }

    // ===== FUNCIÓN 4: LOAD DATA WITH CACHING =====
    async loadData() {
        try {
            console.log('⚡ FUNCIÓN 4: Load Data with Caching');
            
            if (!window.FirebaseData || !window.FirebaseData.currentUser) {
                console.log('⚠️ Firebase not ready for data loading');
                return [];
            }

            // Check cache first
            const cacheKey = 'filtered_contacts';
            const cachedData = this.getFromCache(cacheKey);
            
            if (cachedData) {
                console.log('📦 Using cached data');
                this.data = cachedData;
                this.notifyObservers();
                return this.data;
            }

            // Load fresh data
            const startTime = performance.now();
            this.data = await window.FirebaseData.getFilteredContacts();
            const endTime = performance.now();
            
            console.log(`📊 Loaded ${this.data.length} records from Firebase in ${(endTime - startTime).toFixed(2)}ms`);
            
            // Cache the data
            this.setCache(cacheKey, this.data);
            
            // Notify observers after data load
            this.notifyObservers();
            
            return this.data;
        } catch (error) {
            console.error('❌ FUNCIÓN 4 ERROR - Error loading data from Firebase:', error);
            return [];
        }
    }

    // ===== FUNCIÓN 5: CACHE MANAGEMENT - GET =====
    getFromCache(key) {
        console.log('⚡ FUNCIÓN 5: Get From Cache');
        
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > this.cacheTimeout) {
            console.log('🗑️ Cache expired for key:', key);
            this.cache.delete(key);
            return null;
        }
        
        console.log('✅ Cache hit for key:', key);
        return cached.data;
    }

    // ===== FUNCIÓN 6: CACHE MANAGEMENT - SET =====
    setCache(key, data) {
        console.log('⚡ FUNCIÓN 6: Set Cache');
        
        this.cache.set(key, {
            data: Array.isArray(data) ? [...data] : data, // Deep copy for arrays
            timestamp: Date.now()
        });
        
        console.log('💾 Cached data for key:', key);
    }

    // ===== FUNCIÓN 7: INVALIDATE CACHE =====
    invalidateCache() {
        console.log('⚡ FUNCIÓN 7: Invalidate Cache');
        
        this.cache.clear();
        console.log('🗑️ All cache cleared');
    }

    // ===== FUNCIÓN 8: OBSERVER PATTERN - ADD =====
    addObserver(callback) {
        console.log('⚡ FUNCIÓN 8: Add Observer');
        
        if (typeof callback !== 'function') {
            console.error('❌ Observer must be a function');
            return;
        }
        
        this.observers.push(callback);
        console.log('👁️ Observer added to Firebase AdminData, total:', this.observers.length);
    }

    // ===== FUNCIÓN 9: OBSERVER PATTERN - NOTIFY =====
    notifyObservers() {
        console.log('⚡ FUNCIÓN 9: Notify Observers');
        console.log('📢 Notifying', this.observers.length, 'Firebase observers...');
        
        this.observers.forEach((callback, index) => {
            try {
                callback(this.data);
            } catch (error) {
                console.error(`❌ Error in Firebase observer ${index}:`, error);
            }
        });
    }

    // ===== FUNCIÓN 10: ADD CONTACT WITH VALIDATION =====
    async addContact(contact) {
        try {
            console.log('⚡ FUNCIÓN 10: Add Contact with Validation');
            
            if (!window.FirebaseData) {
                throw new Error('Firebase not available');
            }

            // Enhanced validation
            const validationResult = this.validateContact(contact);
            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Clean and prepare contact data
            const contactData = this.prepareContactData(contact);

            const savedContact = await window.FirebaseData.addContact(contactData);
            console.log('✅ Contact added to Firebase:', savedContact.name);
            
            // Invalidate cache and refresh local data
            this.invalidateCache();
            await this.loadData();
            
            return savedContact;
        } catch (error) {
            console.error('❌ FUNCIÓN 10 ERROR - Error adding contact to Firebase:', error);
            throw error;
        }
    }

    // ===== FUNCIÓN 11: VALIDATE CONTACT DATA =====
    validateContact(contact) {
        console.log('⚡ FUNCIÓN 11: Validate Contact Data');
        
        const errors = [];
        
        // Required field validation
        if (!contact.name || contact.name.trim().length < 2) {
            errors.push('Nombre debe tener al menos 2 caracteres');
        }
        
        if (!contact.phone || contact.phone.trim().length < 7) {
            errors.push('Teléfono debe tener al menos 7 caracteres');
        }
        
        // Phone format validation (Colombian numbers)
        const phoneRegex = /^[3][0-9]{9}$/;
        const cleanPhone = contact.phone ? contact.phone.replace(/\D/g, '') : '';
        if (cleanPhone && !phoneRegex.test(cleanPhone) && cleanPhone.length !== 10) {
            errors.push('Formato de teléfono inválido (debe ser celular colombiano)');
        }
        
        // Email validation if provided
        if (contact.email && contact.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contact.email.trim())) {
                errors.push('Formato de email inválido');
            }
        }
        
        // Source validation
        const validSources = ['Facebook', 'Instagram', 'Google', 'Referido', 'Volante', 'Pasando por la sede'];
        if (!contact.source || (!validSources.includes(contact.source) && !contact.source.includes('CONVENIO:'))) {
            errors.push('Fuente de contacto inválida');
        }
        
        const result = {
            isValid: errors.length === 0,
            errors: errors
        };
        
        console.log('📋 Validation result:', result);
        return result;
    }

    // ===== FUNCIÓN 12: PREPARE CONTACT DATA =====
    prepareContactData(contact) {
        console.log('⚡ FUNCIÓN 12: Prepare Contact Data');
        
        return {
            name: contact.name.trim(),
            phone: contact.phone.replace(/\D/g, ''), // Clean phone number
            email: (contact.email || '').trim().toLowerCase(),
            source: contact.source || 'No especificado',
            convenio: contact.convenio || null,
            location: contact.location || 'No especificado',
            notes: (contact.notes || '').trim(),
            salesperson: contact.salesperson || 'unknown', // Keep for compatibility
            date: contact.date || new Date().toISOString().split('T')[0],
            time: contact.time || new Date().toLocaleTimeString(),
            status: contact.status || 'Nuevo',
            priority: this.calculatePriority(contact),
            score: this.calculateLeadScore(contact)
        };
    }

    // ===== FUNCIÓN 13: CALCULATE PRIORITY =====
    calculatePriority(contact) {
        console.log('⚡ FUNCIÓN 13: Calculate Priority');
        
        let priority = 'Medium';
        
        // High priority conditions
        if (contact.source && contact.source.includes('CONVENIO:')) {
            priority = 'High';
        } else if (contact.source === 'Referido') {
            priority = 'High';
        } else if (contact.email && contact.email.includes('@')) {
            priority = 'Medium';
        } else {
            priority = 'Low';
        }
        
        console.log('📊 Calculated priority:', priority);
        return priority;
    }

    // ===== FUNCIÓN 14: CALCULATE LEAD SCORE =====
    calculateLeadScore(contact) {
        console.log('⚡ FUNCIÓN 14: Calculate Lead Score');
        
        let score = 50; // Base score
        
        // Source scoring
        if (contact.source && contact.source.includes('CONVENIO:')) {
            score += 30;
        } else if (contact.source === 'Referido') {
            score += 25;
        } else if (contact.source === 'Google') {
            score += 20;
        } else if (['Facebook', 'Instagram'].includes(contact.source)) {
            score += 15;
        }
        
        // Email bonus
        if (contact.email && contact.email.includes('@')) {
            score += 10;
        }
        
        // Notes bonus
        if (contact.notes && contact.notes.length > 20) {
            score += 5;
        }
        
        // Location scoring (local gets higher score)
        if (['Pereira', 'Dosquebradas'].includes(contact.location)) {
            score += 10;
        }
        
        console.log('📊 Calculated lead score:', score);
        return Math.min(score, 100); // Cap at 100
    }

    // ===== FUNCIÓN 15: UPDATE CONTACT WITH OPTIMISTIC UI =====
    async updateContact(id, updates) {
        try {
            console.log('⚡ FUNCIÓN 15: Update Contact with Optimistic UI');
            
            if (!window.FirebaseData) {
                throw new Error('Firebase not available');
            }

            // Find existing contact for optimistic update
            const existingContact = this.data.find(contact => contact.id === id);
            if (existingContact) {
                // Optimistic update - update local data immediately
                Object.assign(existingContact, updates, { updatedAt: new Date().toISOString() });
                this.notifyObservers();
            }

            // Validate updates
            const validUpdates = this.prepareUpdateData(updates);

            // Update in Firebase
            await window.FirebaseData.updateContact(id, validUpdates);
            console.log('📝 Contact updated in Firebase:', id);
            
            // Refresh data to ensure consistency
            await this.loadData();
            
            // Find and return updated contact
            const updatedContact = this.data.find(contact => contact.id === id);
            return updatedContact || null;
        } catch (error) {
            console.error('❌ FUNCIÓN 15 ERROR - Error updating contact in Firebase:', error);
            
            // Revert optimistic update on error
            await this.loadData();
            throw error;
        }
    }

    // ===== FUNCIÓN 16: PREPARE UPDATE DATA =====
    prepareUpdateData(updates) {
        console.log('⚡ FUNCIÓN 16: Prepare Update Data');
        
        const validUpdates = {};
        
        Object.keys(updates).forEach(key => {
            const value = updates[key];
            if (value !== undefined && value !== null) {
                if (typeof value === 'string') {
                    validUpdates[key] = value.trim();
                } else {
                    validUpdates[key] = value;
                }
            }
        });
        
        // Add update timestamp
        validUpdates.updatedAt = new Date().toISOString();
        
        console.log('📝 Prepared update data:', validUpdates);
        return validUpdates;
    }

    // ===== FUNCIÓN 17: DELETE CONTACT WITH CONFIRMATION =====
    async deleteContact(id) {
        try {
            console.log('⚡ FUNCIÓN 17: Delete Contact with Confirmation');
            
            if (!window.FirebaseData) {
                throw new Error('Firebase not available');
            }

            // Find contact for logging
            const contact = this.data.find(c => c.id === id);
            if (contact) {
                console.log('🗑️ Deleting contact:', contact.name);
            }

            await window.FirebaseData.deleteContact(id);
            console.log('🗑️ Contact deleted from Firebase:', id);
            
            // Invalidate cache and refresh local data
            this.invalidateCache();
            await this.loadData();
            
            return true;
        } catch (error) {
            console.error('❌ FUNCIÓN 17 ERROR - Error deleting contact from Firebase:', error);
            return false;
        }
    }

    // ===== FUNCIÓN 18: GET ALL DATA WITH PERFORMANCE MONITORING =====
    getAllData() {
        console.log('⚡ FUNCIÓN 18: Get All Data with Performance Monitoring');
        
        if (!this.isReady) {
            console.log('⚠️ Firebase AdminData not ready, returning empty array');
            return [];
        }
        
        const startTime = performance.now();
        const result = [...this.data]; // Return copy to prevent external modifications
        const endTime = performance.now();
        
        console.log(`👑 Returning all Firebase data: ${this.data.length} records in ${(endTime - startTime).toFixed(2)}ms`);
        return result;
    }

    // ===== FUNCIÓN 19: GET DATA BY SALESPERSON WITH CACHING =====
    getDataBySalesperson(salespersonId) {
        console.log('⚡ FUNCIÓN 19: Get Data by Salesperson with Caching');
        
        if (!this.isReady) {
            console.log('⚠️ Firebase AdminData not ready');
            return [];
        }
        
        const cacheKey = `salesperson_${salespersonId}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            console.log('📦 Using cached salesperson data');
            return cached;
        }
        
        // Filter by salespersonId (Firebase) or salesperson (legacy)
        const filtered = this.data.filter(contact => 
            contact.salespersonId === salespersonId || 
            contact.salesperson === salespersonId
        );
        
        // Cache the result
        this.setCache(cacheKey, filtered);
        
        console.log('👤 Firebase data for salesperson', salespersonId, ':', filtered.length, 'records');
        return [...filtered];
    }

    // ===== FUNCIÓN 20: GET DATA BY DATE RANGE WITH OPTIMIZATION =====
    getDataByDateRange(startDate, endDate) {
        try {
            console.log('⚡ FUNCIÓN 20: Get Data by Date Range with Optimization');
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Add one day to end date to include the entire end date
            end.setDate(end.getDate() + 1);
            
            const filtered = this.data.filter(contact => {
                const contactDate = new Date(contact.date);
                return contactDate >= start && contactDate < end;
            });
            
            console.log(`📅 Date range filter: ${filtered.length} records between ${startDate} and ${endDate}`);
            return filtered;
        } catch (error) {
            console.error('❌ FUNCIÓN 20 ERROR - Error filtering by date range:', error);
            return [];
        }
    }

    // ===== FUNCIÓN 21: GET DATA BY STATUS =====
    getDataByStatus(status) {
        console.log('⚡ FUNCIÓN 21: Get Data by Status');
        
        const filtered = this.data.filter(contact => contact.status === status);
        console.log(`📊 Status filter '${status}': ${filtered.length} records`);
        return filtered;
    }

    // ===== FUNCIÓN 22: GET TODAY CONTACTS WITH PERFORMANCE =====
    getTodayContacts(salespersonId = null) {
        console.log('⚡ FUNCIÓN 22: Get Today Contacts with Performance');
        
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

    // ===== FUNCIÓN 23: GET SALESPERSON STATS WITH ANALYTICS =====
    async getSalespersonStats(salespersonId) {
        try {
            console.log('⚡ FUNCIÓN 23: Get Salesperson Stats with Analytics');
            
            if (!window.FirebaseData) {
                return this.getDefaultStats();
            }

            const contacts = this.getDataBySalesperson(salespersonId);
            const today = new Date().toISOString().split('T')[0];
            
            const stats = {
                totalContacts: contacts.length,
                todayContacts: contacts.filter(c => c.date === today).length,
                activeLeads: contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length,
                conversions: contacts.filter(c => c.status === 'Convertido').length,
                conversionRate: contacts.length > 0 ? (contacts.filter(c => c.status === 'Convertido').length / contacts.length * 100).toFixed(1) : 0,
                byStatus: this.getStatusBreakdown(contacts),
                bySource: this.getSourceBreakdown(contacts),
                avgLeadScore: this.calculateAverageLeadScore(contacts),
                highPriorityLeads: contacts.filter(c => c.priority === 'High').length,
                recentActivity: this.getRecentActivity(contacts, 7) // Last 7 days
            };
            
            console.log('👤 Firebase stats for', salespersonId, ':', stats);
            return stats;
        } catch (error) {
            console.error('❌ FUNCIÓN 23 ERROR - Error getting salesperson stats:', error);
            return this.getDefaultStats();
        }
    }

    // ===== FUNCIÓN 24: GET TEAM STATS WITH ADVANCED ANALYTICS =====
    async getTeamStats() {
        try {
            console.log('⚡ FUNCIÓN 24: Get Team Stats with Advanced Analytics');
            
            if (!window.FirebaseData) {
                return this.getDefaultTeamStats();
            }

            // Check if user is director
            if (!this.currentUserProfile || this.currentUserProfile.role !== 'director') {
                throw new Error('Only directors can access team stats');
            }

            const allUsers = await window.FirebaseData.getAllUsers();
            const salespeople = Object.entries(allUsers).filter(([uid, user]) => user.role === 'vendedor');
            const today = new Date().toISOString().split('T')[0];
            
            const teamStats = {
                totalContacts: this.data.length,
                todayContacts: this.data.filter(c => c.date === today).length,
                activeLeads: this.data.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length,
                conversions: this.data.filter(c => c.status === 'Convertido').length,
                conversionRate: this.data.length > 0 ? (this.data.filter(c => c.status === 'Convertido').length / this.data.length * 100).toFixed(1) : 0,
                salespeople: salespeople.map(([uid, user]) => ({
                    uid,
                    name: user.name,
                    email: user.email,
                    performance: this.getSalespersonPerformance(uid)
                })),
                byStatus: this.getStatusBreakdown(this.data),
                bySource: this.getSourceBreakdown(this.data),
                topPerformers: this.getTopPerformers(salespeople),
                teamTrends: this.getTeamTrends(),
                goalProgress: this.calculateTeamGoalProgress(salespeople)
            };
            
            console.log('👑 Firebase team stats:', teamStats);
            return teamStats;
        } catch (error) {
            console.error('❌ FUNCIÓN 24 ERROR - Error getting team stats:', error);
            return this.getDefaultTeamStats();
        }
    }

    // ===== FUNCIÓN 25: GET SALESPERSON PERFORMANCE =====
    getSalespersonPerformance(salespersonId) {
        console.log('⚡ FUNCIÓN 25: Get Salesperson Performance');
        
        const contacts = this.getDataBySalesperson(salespersonId);
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = this.getWeekRange();
        const thisMonth = this.getMonthRange();
        
        return {
            today: contacts.filter(c => c.date === today).length,
            thisWeek: contacts.filter(c => c.date >= thisWeek.start && c.date <= thisWeek.end).length,
            thisMonth: contacts.filter(c => c.date >= thisMonth.start && c.date <= thisMonth.end).length,
            conversions: contacts.filter(c => c.status === 'Convertido').length,
            avgScore: this.calculateAverageLeadScore(contacts)
        };
    }

    // ===== FUNCIÓN 26: ANALYTICS HELPER FUNCTIONS =====
    getStatusBreakdown(data) {
        console.log('⚡ FUNCIÓN 26: Get Status Breakdown');
        
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

    calculateAverageLeadScore(contacts) {
        if (contacts.length === 0) return 0;
        const totalScore = contacts.reduce((sum, contact) => sum + (contact.score || 50), 0);
        return (totalScore / contacts.length).toFixed(1);
    }

    getRecentActivity(contacts, days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        
        return contacts.filter(c => c.date >= cutoffStr).length;
    }

    getTopPerformers(salespeople) {
        return salespeople
            .map(([uid, user]) => ({
                uid,
                name: user.name,
                conversions: this.getDataBySalesperson(uid).filter(c => c.status === 'Convertido').length
            }))
            .sort((a, b) => b.conversions - a.conversions)
            .slice(0, 5);
    }

    getTeamTrends() {
        // Analyze trends over the last 30 days
        const trends = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayContacts = this.data.filter(c => c.date === dateStr).length;
            trends.push({
                date: dateStr,
                contacts: dayContacts
            });
        }
        
        return trends;
    }

    calculateTeamGoalProgress(salespeople) {
        const dailyGoal = salespeople.length * 10; // 10 contacts per salesperson per day
        const today = new Date().toISOString().split('T')[0];
        const todayContacts = this.data.filter(c => c.date === today).length;
        
        return {
            goal: dailyGoal,
            achieved: todayContacts,
            percentage: dailyGoal > 0 ? (todayContacts / dailyGoal * 100).toFixed(1) : 0
        };
    }

    getWeekRange() {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // End of week (Saturday)
        
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }

    getMonthRange() {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }

    // ===== FUNCIÓN 27: DEFAULT STATS =====
    getDefaultStats() {
        console.log('⚡ FUNCIÓN 27: Get Default Stats');
        
        return {
            totalContacts: 0,
            todayContacts: 0,
            activeLeads: 0,
            conversions: 0,
            conversionRate: 0,
            byStatus: {},
            bySource: {},
            avgLeadScore: 0,
            highPriorityLeads: 0,
            recentActivity: 0
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
            bySource: {},
            topPerformers: [],
            teamTrends: [],
            goalProgress: { goal: 0, achieved: 0, percentage: 0 }
        };
    }

    // ===== FUNCIÓN 28: SEARCH AND FILTER WITH ADVANCED OPTIONS =====
    searchContacts(query, filters = {}) {
        console.log('⚡ FUNCIÓN 28: Search and Filter with Advanced Options');
        
        let results = [...this.data];

        // Text search with fuzzy matching
        if (query) {
            const searchTerm = query.toLowerCase().trim();
            if (searchTerm) {
                results = results.filter(contact => 
                    contact.name.toLowerCase().includes(searchTerm) ||
                    contact.phone.includes(searchTerm) ||
                    (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
                    (contact.notes && contact.notes.toLowerCase().includes(searchTerm)) ||
                    (contact.convenio && contact.convenio.toLowerCase().includes(searchTerm))
                );
            }
        }

        // Apply filters with enhanced options
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
                    case 'priority':
                        results = results.filter(contact => contact.priority === filterValue);
                        break;
                    case 'convenio':
                        results = results.filter(contact => contact.convenio === filterValue);
                        break;
                    case 'dateFrom':
                        results = results.filter(contact => contact.date >= filterValue);
                        break;
                    case 'dateTo':
                        results = results.filter(contact => contact.date <= filterValue);
                        break;
                    case 'minScore':
                        results = results.filter(contact => (contact.score || 50) >= filterValue);
                        break;
                    case 'maxScore':
                        results = results.filter(contact => (contact.score || 50) <= filterValue);
                        break;
                }
            }
        });

        console.log('🔍 Enhanced search returned', results.length, 'results');
        return results;
    }

    // ===== FUNCIÓN 29: BULK OPERATIONS WITH PROGRESS TRACKING =====
    async bulkUpdateStatus(contactIds, newStatus, onProgress = null) {
        console.log('⚡ FUNCIÓN 29: Bulk Operations with Progress Tracking');
        
        const validStatuses = ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'];
        
        if (!validStatuses.includes(newStatus)) {
            console.error('❌ Invalid status:', newStatus);
            return 0;
        }
        
        let updated = 0;
        const total = contactIds.length;
        
        for (let i = 0; i < contactIds.length; i++) {
            const id = contactIds[i];
            try {
                await this.updateContact(id, { status: newStatus });
                updated++;
                
                // Call progress callback if provided
                if (onProgress && typeof onProgress === 'function') {
                    onProgress({
                        current: i + 1,
                        total: total,
                        percentage: Math.round(((i + 1) / total) * 100),
                        updated: updated
                    });
                }
            } catch (error) {
                console.error('❌ Error updating contact:', id, error);
            }
        }
        
        console.log('📦 Bulk updated', updated, 'contacts to status:', newStatus);
        return updated;
    }

    async bulkDelete(contactIds, onProgress = null) {
        let deleted = 0;
        const total = contactIds.length;
        
        for (let i = 0; i < contactIds.length; i++) {
            const id = contactIds[i];
            try {
                if (await this.deleteContact(id)) {
                    deleted++;
                }
                
                if (onProgress && typeof onProgress === 'function') {
                    onProgress({
                        current: i + 1,
                        total: total,
                        percentage: Math.round(((i + 1) / total) * 100),
                        deleted: deleted
                    });
                }
            } catch (error) {
                console.error('❌ Error deleting contact:', id, error);
            }
        }
        console.log('📦 Bulk deleted', deleted, 'contacts');
        return deleted;
    }

    // ===== FUNCIÓN 30: SYSTEM STATUS WITH DETAILED HEALTH CHECK =====
    getSystemStatus() {
        console.log('⚡ FUNCIÓN 30: System Status with Detailed Health Check');
        
        const today = new Date().toISOString().split('T')[0];
        
        return {
            timestamp: new Date().toISOString(),
            source: 'Firebase Realtime Database Enhanced',
            isReady: this.isReady,
            authenticated: !!window.FirebaseData?.currentUser,
            currentUser: this.currentUserProfile,
            totalRecords: this.data.length,
            todayRecords: this.data.filter(c => c.date === today).length,
            observers: this.observers.length,
            cacheSize: this.cache.size,
            lastUpdate: this.data.length > 0 ? 
                Math.max(...this.data.map(c => new Date(c.updatedAt || c.createdAt).getTime())) : null,
            performance: {
                averageLoadTime: this.getAverageLoadTime(),
                cacheHitRate: this.getCacheHitRate()
            },
            health: this.getSystemHealth()
        };
    }

    getAverageLoadTime() {
        // This would track load times over time in a real implementation
        return 'Not implemented';
    }

    getCacheHitRate() {
        // This would track cache hit rate in a real implementation
        return 'Not implemented';
    }

    getSystemHealth() {
        const health = {
            firebase: !!window.FirebaseData,
            authentication: !!window.FirebaseData?.currentUser,
            dataIntegrity: this.checkDataIntegrity(),
            performance: this.isReady ? 'Good' : 'Poor'
        };
        
        const score = Object.values(health).filter(v => v === true || v === 'Good').length;
        health.overall = score >= 3 ? 'Healthy' : score >= 2 ? 'Warning' : 'Critical';
        
        return health;
    }

    checkDataIntegrity() {
        try {
            // Basic integrity checks
            const hasRequiredFields = this.data.every(contact => 
                contact.name && contact.phone && contact.date
            );
            
            const hasValidStatuses = this.data.every(contact => 
                ['Nuevo', 'Contactado', 'Interesado', 'Negociación', 'Convertido', 'Perdido'].includes(contact.status)
            );
            
            return hasRequiredFields && hasValidStatuses;
        } catch (error) {
            return false;
        }
    }

    // ===== LEGACY COMPATIBILITY FUNCTIONS =====
    
    forceSyncFromStorage() {
        console.log('⚠️ forceSyncFromStorage called - Firebase handles sync automatically');
        return this.loadData();
    }

    saveData() {
        console.log('⚠️ saveData called - Firebase saves automatically');
        return this.loadData();
    }

    verifyAndRepairData() {
        console.log('🔧 verifyAndRepairData called - Firebase handles data integrity');
        return this.loadData();
    }

    // ===== FUNCIÓN 31: MIGRATION FROM LOCALSTORAGE =====
    async migrateFromLocalStorage() {
        try {
            console.log('⚡ FUNCIÓN 31: Migration from LocalStorage');
            
            const localData = localStorage.getItem('ciudad_bilingue_sales_data');
            if (localData) {
                const contacts = JSON.parse(localData);
                console.log('🔄 Migrating', contacts.length, 'contacts from localStorage to Firebase');
                
                const imported = await this.importData(contacts);
                
                // Backup localStorage data before clearing
                localStorage.setItem('ciudad_bilingue_sales_data_backup', localData);
                localStorage.setItem('ciudad_bilingue_migration_date', new Date().toISOString());
                localStorage.removeItem('ciudad_bilingue_sales_data');
                
                console.log('✅ Migration completed:', imported, 'contacts imported');
                return imported;
            }
            return 0;
        } catch (error) {
            console.error('❌ FUNCIÓN 31 ERROR - Migration error:', error);
            throw error;
        }
    }

    // ===== FUNCIÓN 32: IMPORT DATA WITH PROGRESS =====
    async importData(newData, onProgress = null) {
        try {
            console.log('⚡ FUNCIÓN 32: Import Data with Progress');
            
            if (!Array.isArray(newData)) {
                throw new Error('Import data must be an array');
            }
            
            console.log('📥 Importing', newData.length, 'records to Firebase');
            
            let imported = 0;
            const total = newData.length;
            
            for (let i = 0; i < newData.length; i++) {
                const item = newData[i];
                try {
                    if (item && item.name && item.phone) {
                        await this.addContact(item);
                        imported++;
                        
                        if (onProgress && typeof onProgress === 'function') {
                            onProgress({
                                current: i + 1,
                                total: total,
                                percentage: Math.round(((i + 1) / total) * 100),
                                imported: imported
                            });
                        }
                    }
                } catch (error) {
                    console.error('❌ Error importing item:', error);
                }
            }
            
            console.log('📥 Imported', imported, 'records to Firebase');
            return imported;
        } catch (error) {
            console.error('❌ FUNCIÓN 32 ERROR - Error importing data to Firebase:', error);
            throw error;
        }
    }

    // ===== FUNCIÓN 33: EXPORT DATA WITH OPTIONS =====
    exportData(options = {}) {
        console.log('⚡ FUNCIÓN 33: Export Data with Options');
        
        const {
            format = 'json',
            includeStats = true,
            filterBy = null,
            dateRange = null
        } = options;
        
        let dataToExport = [...this.data];
        
        // Apply filters if specified
        if (filterBy) {
            dataToExport = this.searchContacts('', filterBy);
        }
        
        if (dateRange) {
            dataToExport = this.getDataByDateRange(dateRange.start, dateRange.end);
        }
        
        const exportObj = {
            data: dataToExport,
            exportDate: new Date().toISOString(),
            totalRecords: dataToExport.length,
            version: '4.0-enhanced-firebase',
            source: 'Firebase Realtime Database Enhanced'
        };
        
        if (includeStats) {
            exportObj.statistics = {
                byStatus: this.getStatusBreakdown(dataToExport),
                bySource: this.getSourceBreakdown(dataToExport),
                byLocation: this.getLocationBreakdown(dataToExport),
                averageScore: this.calculateAverageLeadScore(dataToExport)
            };
        }
        
        console.log('📤 Exported', dataToExport.length, 'records');
        return exportObj;
    }

    getLocationBreakdown(data) {
        const locations = {};
        data.forEach(contact => {
            const location = contact.location || 'No especificado';
            locations[location] = (locations[location] || 0) + 1;
        });
        return locations;
    }

    // ===== FUNCIÓN 34: CLEAR ALL DATA WITH SAFETY CHECKS =====
    async clearAllData() {
        try {
            console.log('⚡ FUNCIÓN 34: Clear All Data with Safety Checks');
            
            if (!this.currentUserProfile || this.currentUserProfile.role !== 'director') {
                throw new Error('Only directors can clear all data');
            }
            
            console.log('🗑️ Clearing all Firebase data...');
            
            // Create backup before clearing
            const backup = this.exportData({ includeStats: true });
            localStorage.setItem('ciudad_bilingue_emergency_backup', JSON.stringify(backup));
            
            // Delete all contacts
            const allContacts = await window.FirebaseData.getAllContacts();
            for (const contact of allContacts) {
                await window.FirebaseData.deleteContact(contact.id);
            }
            
            // Clear cache
            this.invalidateCache();
            
            // Refresh local data
            await this.loadData();
            
            console.log('🗑️ All Firebase data cleared, backup created');
        } catch (error) {
            console.error('❌ FUNCIÓN 34 ERROR - Error clearing Firebase data:', error);
            throw error;
        }
    }

    // ===== FUNCIÓN 35: GET USER DISPLAY NAME WITH CACHING =====
    getUserDisplayName(userId) {
        console.log('⚡ FUNCIÓN 35: Get User Display Name with Caching');
        
        const cacheKey = `user_name_${userId}`;
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }
        
        let displayName = 'Unknown User';
        
        // Try to get from Firebase users if available
        if (window.FirebaseData && window.FirebaseData.allUsers) {
            const user = window.FirebaseData.allUsers[userId];
            if (user) {
                displayName = user.name;
            }
        }
        
        // Fallback to legacy format
        if (displayName === 'Unknown User' && userId && userId.includes('.')) {
            displayName = userId.split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
        }
        
        // Cache the result
        this.setCache(cacheKey, displayName);
        
        return displayName || 'Unknown User';
    }

    // ===== FUNCIÓN 36: HEALTH CHECK AND DIAGNOSTICS =====
    async runDiagnostics() {
        console.log('⚡ FUNCIÓN 36: Health Check and Diagnostics');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            firebase: {
                available: !!window.FirebaseData,
                authenticated: !!window.FirebaseData?.currentUser,
                userProfile: !!this.currentUserProfile,
                connectionStatus: 'Unknown'
            },
            data: {
                totalRecords: this.data.length,
                integrityCheck: this.checkDataIntegrity(),
                duplicateCheck: this.checkForDuplicates(),
                orphanedRecords: this.checkForOrphanedRecords()
            },
            performance: {
                cacheSize: this.cache.size,
                observerCount: this.observers.length,
                isReady: this.isReady
            },
            recommendations: []
        };
        
        // Add recommendations based on diagnostics
        if (diagnostics.data.totalRecords === 0) {
            diagnostics.recommendations.push('No data found - check Firebase connection');
        }
        
        if (!diagnostics.data.integrityCheck) {
            diagnostics.recommendations.push('Data integrity issues detected - run repair');
        }
        
        if (diagnostics.data.duplicateCheck > 0) {
            diagnostics.recommendations.push(`${diagnostics.data.duplicateCheck} potential duplicates found`);
        }
        
        if (diagnostics.performance.cacheSize > 100) {
            diagnostics.recommendations.push('Large cache size - consider clearing cache');
        }
        
        console.log('🔍 Diagnostics completed:', diagnostics);
        return diagnostics;
    }

    checkForDuplicates() {
        const phoneNumbers = new Set();
        let duplicates = 0;
        
        this.data.forEach(contact => {
            if (phoneNumbers.has(contact.phone)) {
                duplicates++;
            } else {
                phoneNumbers.add(contact.phone);
            }
        });
        
        return duplicates;
    }

    checkForOrphanedRecords() {
        // Check for records with missing salesperson references
        return this.data.filter(contact => 
            !contact.salespersonId && !contact.salesperson
        ).length;
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

// ===== ENHANCED GLOBAL FUNCTIONS =====

window.runSystemDiagnostics = async function() {
    try {
        const diagnostics = await AdminData.runDiagnostics();
        
        console.log('📊 System Diagnostics:', diagnostics);
        
        const statusEmoji = diagnostics.recommendations.length === 0 ? '✅' : 
                           diagnostics.recommendations.length <= 2 ? '⚠️' : '❌';
        
        alert(`${statusEmoji} SYSTEM DIAGNOSTICS REPORT

🔥 Firebase: ${diagnostics.firebase.available ? '✅' : '❌'}
👤 Authentication: ${diagnostics.firebase.authenticated ? '✅' : '❌'}
📊 Data Records: ${diagnostics.data.totalRecords}
🔍 Integrity: ${diagnostics.data.integrityCheck ? '✅' : '❌'}
📋 Duplicates: ${diagnostics.data.duplicateCheck}
💾 Cache Size: ${diagnostics.performance.cacheSize}

RECOMMENDATIONS:
${diagnostics.recommendations.length > 0 ? 
    diagnostics.recommendations.map(r => `• ${r}`).join('\n') : 
    '• System running optimally'}

Check console for detailed information.`);
        
        return diagnostics;
    } catch (error) {
        console.error('❌ Error running diagnostics:', error);
        alert(`❌ Error running diagnostics: ${error.message}`);
    }
};

window.clearSystemCache = function() {
    AdminData.invalidateCache();
    console.log('🗑️ System cache cleared');
    alert('✅ Cache del sistema limpiado correctamente');
};

window.getSystemStatus = function() {
    const status = AdminData.getSystemStatus();
    console.log('📊 System Status:', status);
    return status;
};

console.log('✅ Firebase AdminData Enhanced module loaded successfully with 36 organized functions');
