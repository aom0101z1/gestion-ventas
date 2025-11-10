// firebase-config.js - Firebase Setup & Configuration
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, update, remove, onValue, off } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuq1z8eTo9rufdEDXQFfvoxOkce-kBWOY",
  authDomain: "ciudad-bilingue-crm.firebaseapp.com",
  databaseURL: "https://ciudad-bilingue-crm-default-rtdb.firebaseio.com",
  projectId: "ciudad-bilingue-crm",
  storageBucket: "ciudad-bilingue-crm.firebasestorage.app",
  messagingSenderId: "690594486040",
  appId: "1:690594486040:web:e8fffcffcee68a4d94f06d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Firebase Database Structure:
/*
/users/{userId}
  - profile: {name, email, role, createdAt, lastLogin}
  - settings: {preferences}

/contacts/{contactId}
  - id: unique identifier
  - name, phone, email, source, location, notes
  - salespersonId: reference to user
  - salespersonName: for easy filtering
  - date, time, status
  - createdAt, updatedAt

/system/
  - convenios: [array of agreements]
  - settings: global settings
*/

class FirebaseDataManager {
    constructor() {
        this.database = database;
        this.auth = auth;
        this.currentUser = null;
        this.observers = [];
        this.contactsListener = null;
        
        console.log('🔥 Firebase DataManager initialized');
        
        // Listen for auth state changes
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.loadUserProfile();
                this.setupContactsListener();
            } else {
                this.currentUser = null;
                this.cleanup();
            }
        });
    }

    // ===== AUTHENTICATION =====
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log('✅ Firebase login successful:', userCredential.user.email);
            
            // Update last login
            await this.updateUserProfile({ lastLogin: new Date().toISOString() });
            
            return userCredential.user;
        } catch (error) {
            console.error('❌ Firebase login error:', error);
            throw new Error(this.getAuthErrorMessage(error.code));
        }
    }

    async createUser(email, password, profile) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            // Create user profile in database
            await set(ref(this.database, `users/${user.uid}/profile`), {
                name: profile.name,
                email: email,
                role: profile.role,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            
            console.log('✅ User created successfully:', email);
            return user;
        } catch (error) {
            console.error('❌ User creation error:', error);
            throw new Error(this.getAuthErrorMessage(error.code));
        }
    }

    async logout() {
        try {
            this.cleanup();
            await signOut(this.auth);
            console.log('✅ Firebase logout successful');
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }

    // ===== USER PROFILE MANAGEMENT =====
    async loadUserProfile() {
        if (!this.currentUser) return null;
        
        try {
            const snapshot = await get(ref(this.database, `users/${this.currentUser.uid}/profile`));
            if (snapshot.exists()) {
                const profile = snapshot.val();
                console.log('👤 User profile loaded:', profile);
                return profile;
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            return null;
        }
    }

    async updateUserProfile(updates) {
        if (!this.currentUser) throw new Error('User not authenticated');
        
        try {
            await update(ref(this.database, `users/${this.currentUser.uid}/profile`), {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            console.log('✅ User profile updated');
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            const snapshot = await get(ref(this.database, 'users'));
            if (snapshot.exists()) {
                const users = {};
                snapshot.forEach((childSnapshot) => {
                    const userId = childSnapshot.key;
                    const userData = childSnapshot.val();
                    if (userData.profile) {
                        users[userId] = userData.profile;
                    }
                });
                return users;
            }
            return {};
        } catch (error) {
            console.error('❌ Error loading all users:', error);
            return {};
        }
    }

    // ===== CONTACT MANAGEMENT =====
    async addContact(contactData) {
        if (!this.currentUser) throw new Error('User not authenticated');
        
        try {
            const contactRef = push(ref(this.database, 'contacts'));
            const contactId = contactRef.key;
            
            const contact = {
                id: contactId,
                ...contactData,
                salespersonId: this.currentUser.uid,
                salespersonEmail: this.currentUser.email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await set(contactRef, contact);
            console.log('✅ Contact added to Firebase:', contactId);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Contacto añadido',
                    'contact',
                    contactId,
                    `${contact.name} - ${contact.phone} - ${contact.source}`,
                    {
                        after: {
                            nombre: contact.name,
                            telefono: contact.phone,
                            email: contact.email,
                            fuente: contact.source,
                            ubicacion: contact.location
                        }
                    }
                );
            }

            return contact;
        } catch (error) {
            console.error('❌ Error adding contact:', error);
            throw error;
        }
    }

    async updateContact(contactId, updates) {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            // RESTRICTION: Only admin/director can update leads
            const userProfile = await this.loadUserProfile();
            if (!userProfile || (userProfile.role !== 'director' && userProfile.role !== 'admin')) {
                throw new Error('Solo administradores pueden modificar leads');
            }

            // Get contact details for audit log
            const contactSnapshot = await get(ref(this.database, `contacts/${contactId}`));
            const contact = contactSnapshot.val();

            await update(ref(this.database, `contacts/${contactId}`), {
                ...updates,
                updatedAt: new Date().toISOString()
            });

            console.log('✅ Contact updated in Firebase:', contactId);

            // Audit log
            if (typeof window.logAudit === 'function' && contact) {
                await window.logAudit(
                    'Contacto editado',
                    'contact',
                    contactId,
                    `${contact.name} - Campos actualizados`,
                    {
                        after: updates
                    }
                );
            }

            return true;
        } catch (error) {
            console.error('❌ Error updating contact:', error);
            throw error;
        }
    }

    async deleteContact(contactId) {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            // RESTRICTION: Only admin/director can delete leads
            const userProfile = await this.loadUserProfile();
            if (!userProfile || (userProfile.role !== 'director' && userProfile.role !== 'admin')) {
                throw new Error('Solo administradores pueden eliminar leads');
            }

            // Get contact details before deleting for audit log
            const contactSnapshot = await get(ref(this.database, `contacts/${contactId}`));
            const contact = contactSnapshot.val();

            await remove(ref(this.database, `contacts/${contactId}`));
            console.log('✅ Contact deleted from Firebase:', contactId);

            // Audit log
            if (typeof window.logAudit === 'function' && contact) {
                await window.logAudit(
                    'Contacto eliminado',
                    'contact',
                    contactId,
                    `${contact.name} - ${contact.phone} - ${contact.source}`,
                    {
                        before: {
                            nombre: contact.name,
                            telefono: contact.phone,
                            email: contact.email,
                            fuente: contact.source,
                            estado: contact.status
                        }
                    }
                );
            }

            return true;
        } catch (error) {
            console.error('❌ Error deleting contact:', error);
            throw error;
        }
    }

    async canUserAccessContact(contactId) {
        try {
            const snapshot = await get(ref(this.database, `contacts/${contactId}`));
            if (!snapshot.exists()) return false;
            
            const contact = snapshot.val();
            const userProfile = await this.loadUserProfile();
            
            // Directors can access all contacts, salespeople only their own
            return userProfile.role === 'director' || contact.salespersonId === this.currentUser.uid;
        } catch (error) {
            console.error('❌ Error checking contact access:', error);
            return false;
        }
    }

    // ===== DATA RETRIEVAL =====
    async getAllContacts() {
        try {
            const snapshot = await get(ref(this.database, 'contacts'));
            if (snapshot.exists()) {
                const contacts = [];
                snapshot.forEach((childSnapshot) => {
                    contacts.push(childSnapshot.val());
                });
                console.log('📊 Loaded all contacts from Firebase:', contacts.length);
                return contacts;
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading contacts:', error);
            return [];
        }
    }

    async getFilteredContacts() {
        const userProfile = await this.loadUserProfile();
        if (!userProfile) return [];
        
        const allContacts = await this.getAllContacts();
        
        if (userProfile.role === 'director') {
            console.log('👑 Director - returning all contacts:', allContacts.length);
            return allContacts;
        } else {
            const filtered = allContacts.filter(contact => contact.salespersonId === this.currentUser.uid);
            console.log('👤 Salesperson - filtered contacts:', filtered.length);
            return filtered;
        }
    }

    // ===== REAL-TIME LISTENERS =====
    setupContactsListener() {
        if (!this.currentUser) return;
        
        // Remove existing listener
        if (this.contactsListener) {
            off(ref(this.database, 'contacts'), 'value', this.contactsListener);
        }
        
        // Setup new listener
        this.contactsListener = onValue(ref(this.database, 'contacts'), (snapshot) => {
            console.log('🔄 Firebase contacts updated');
            this.notifyObservers();
        });
        
        console.log('👂 Firebase contacts listener setup');
    }

    cleanup() {
        if (this.contactsListener) {
            off(ref(this.database, 'contacts'), 'value', this.contactsListener);
            this.contactsListener = null;
        }
        console.log('🧹 Firebase listeners cleaned up');
    }

    // ===== OBSERVER PATTERN =====
    addObserver(callback) {
        this.observers.push(callback);
        console.log('👁️ Firebase observer added');
    }

    notifyObservers() {
        this.observers.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('❌ Observer error:', error);
            }
        });
    }

    // ===== STATISTICS =====
    async getStats(userId = null) {
        const contacts = await this.getAllContacts();
        const userProfile = await this.loadUserProfile();
        
        let filteredContacts = contacts;
        if (userProfile.role !== 'director' || userId) {
            const targetUserId = userId || this.currentUser.uid;
            filteredContacts = contacts.filter(c => c.salespersonId === targetUserId);
        }
        
        const today = new Date().toISOString().split('T')[0];
        const todayContacts = filteredContacts.filter(c => c.date === today);
        const activeLeads = filteredContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
        const conversions = filteredContacts.filter(c => c.status === 'Convertido');
        
        return {
            totalContacts: filteredContacts.length,
            todayContacts: todayContacts.length,
            activeLeads: activeLeads.length,
            conversions: conversions.length,
            conversionRate: filteredContacts.length > 0 ? 
                (conversions.length / filteredContacts.length * 100).toFixed(1) : 0
        };
    }

    async getTeamStats() {
        const userProfile = await this.loadUserProfile();
        if (userProfile.role !== 'director') {
            throw new Error('Only directors can access team stats');
        }
        
        const contacts = await this.getAllContacts();
        const users = await this.getAllUsers();
        
        const teamStats = {
            totalContacts: contacts.length,
            todayContacts: contacts.filter(c => c.date === new Date().toISOString().split('T')[0]).length,
            activeLeads: contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status)).length,
            conversions: contacts.filter(c => c.status === 'Convertido').length,
            salespeople: []
        };
        
        // Get stats for each salesperson
        for (const [userId, userInfo] of Object.entries(users)) {
            if (userInfo.role === 'vendedor') {
                const userStats = await this.getStats(userId);
                teamStats.salespeople.push({
                    userId,
                    name: userInfo.name,
                    email: userInfo.email,
                    stats: userStats
                });
            }
        }
        
        teamStats.conversionRate = teamStats.totalContacts > 0 ? 
            (teamStats.conversions / teamStats.totalContacts * 100).toFixed(1) : 0;
        
        return teamStats;
    }

    // ===== SYSTEM SETTINGS =====
    async getConvenios() {
        try {
            const snapshot = await get(ref(this.database, 'system/convenios'));
            return snapshot.exists() ? snapshot.val() : [];
        } catch (error) {
            console.error('❌ Error loading convenios:', error);
            return [];
        }
    }

    async updateConvenios(convenios) {
        try {
            await set(ref(this.database, 'system/convenios'), convenios);
            console.log('✅ Convenios updated');
        } catch (error) {
            console.error('❌ Error updating convenios:', error);
            throw error;
        }
    }

    // ===== UTILITY FUNCTIONS =====
    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/email-already-in-use': 'El email ya está en uso',
            'auth/weak-password': 'La contraseña es muy débil',
            'auth/invalid-email': 'Email inválido',
            'auth/network-request-failed': 'Error de conexión'
        };
        return errorMessages[errorCode] || 'Error de autenticación';
    }

    // ===== MIGRATION HELPER =====
    async migrateFromLocalStorage() {
        try {
            const localData = localStorage.getItem('ciudad_bilingue_sales_data');
            if (localData) {
                const contacts = JSON.parse(localData);
                console.log('🔄 Migrating', contacts.length, 'contacts from localStorage');
                
                for (const contact of contacts) {
                    // Map salesperson username to current user
                    const contactData = {
                        ...contact,
                        salespersonEmail: this.currentUser.email // Map to current user for now
                    };
                    delete contactData.salesperson; // Remove old field
                    
                    await this.addContact(contactData);
                }
                
                console.log('✅ Migration completed');
                return contacts.length;
            }
            return 0;
        } catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        }
    }
}

// Create global instance
window.FirebaseData = new FirebaseDataManager();

export default FirebaseDataManager;
