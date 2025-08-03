// customers.js - Customer Registration & Management Module
// Integrates with existing Firebase structure

console.log('👥 Loading customers module...');

// ===== CUSTOMER DATA STRUCTURE =====
/*
/customers/{customerId}
  - id: unique identifier
  - personalInfo: {name, phone, email, birthDate, address}
  - studentInfo: {level, schedule, startDate, status}
  - contactInfo: {preferredContact, emergencyContact}
  - leadId: reference to original lead (if converted)
  - salespersonId: assigned salesperson
  - createdAt, updatedAt
  - tags: [] (for segmentation)
*/

class CustomerManager {
    constructor() {
        this.customersCache = new Map();
        this.listeners = [];
    }

    // ===== CREATE CUSTOMER FROM LEAD =====
    async convertLeadToCustomer(leadId, additionalInfo = {}) {
        try {
            // Get lead data
            const lead = await window.FirebaseData.getContactById(leadId);
            if (!lead) throw new Error('Lead not found');

            const customer = {
                id: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                personalInfo: {
                    name: lead.name,
                    phone: lead.phone,
                    email: lead.email,
                    birthDate: additionalInfo.birthDate || '',
                    address: additionalInfo.address || ''
                },
                studentInfo: {
                    level: additionalInfo.level || 'Beginner',
                    schedule: additionalInfo.schedule || '',
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'active'
                },
                contactInfo: {
                    preferredContact: additionalInfo.preferredContact || 'whatsapp',
                    emergencyContact: additionalInfo.emergencyContact || ''
                },
                leadId: leadId,
                salespersonId: lead.salespersonId || window.FirebaseData.currentUser?.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tags: additionalInfo.tags || []
            };

            // Save to Firebase
            await this.saveCustomer(customer);

            // Update lead status
            await window.FirebaseData.updateContact(leadId, { 
                status: 'Convertido',
                convertedDate: new Date().toISOString()
            });

            return customer;
        } catch (error) {
            console.error('❌ Error converting lead:', error);
            throw error;
        }
    }

    // ===== SAVE CUSTOMER =====
    async saveCustomer(customer) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `customers/${customer.id}`);
        await db.set(ref, customer);
        this.customersCache.set(customer.id, customer);
        return customer;
    }

    // ===== GET CUSTOMERS =====
    async getCustomers(filters = {}) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, 'customers');
        const snapshot = await db.get(ref);
        
        if (!snapshot.exists()) return [];
        
        let customers = Object.values(snapshot.val());
        
        // Apply filters
        if (filters.status) {
            customers = customers.filter(c => c.studentInfo?.status === filters.status);
        }
        
        if (filters.salespersonId) {
            customers = customers.filter(c => c.salespersonId === filters.salespersonId);
        }
        
        if (filters.tags && filters.tags.length > 0) {
            customers = customers.filter(c => 
                filters.tags.some(tag => c.tags?.includes(tag))
            );
        }

        return customers.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    // ===== UPDATE CUSTOMER =====
    async updateCustomer(customerId, updates) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `customers/${customerId}`);
        
        updates.updatedAt = new Date().toISOString();
        await db.update(ref, updates);
        
        // Update cache
        const cached = this.customersCache.get(customerId);
        if (cached) {
            this.customersCache.set(customerId, { ...cached, ...updates });
        }
        
        return true;
    }

    // ===== CUSTOMER METRICS =====
    async getCustomerMetrics() {
        const customers = await this.getCustomers();
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        return {
            total: customers.length,
            active: customers.filter(c => c.studentInfo?.status === 'active').length,
            inactive: customers.filter(c => c.studentInfo?.status === 'inactive').length,
            newThisMonth: customers.filter(c => {
                const created = new Date(c.createdAt);
                return created.getMonth() === thisMonth && 
                       created.getFullYear() === thisYear;
            }).length,
            byLevel: this.groupByLevel(customers),
            retentionRate: this.calculateRetentionRate(customers)
        };
    }

    // ===== HELPER METHODS =====
    groupByLevel(customers) {
        const levels = {};
        customers.forEach(c => {
            const level = c.studentInfo?.level || 'Unknown';
            levels[level] = (levels[level] || 0) + 1;
        });
