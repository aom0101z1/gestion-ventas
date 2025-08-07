// permission-enforcer.js - Lightweight Permission Enforcement System
// Works with admin-center.js to control module visibility
console.log('🔒 Loading Permission Enforcer...');

// Permission Enforcer Class
class PermissionEnforcer {
    constructor() {
        this.userPermissions = {};
        this.userRole = null;
        this.isReady = false;
        this.defaultModules = ['contacts', 'leads']; // Default visible modules
        
        // Module to UI element mapping
        this.moduleMapping = {
            // Main navigation tabs
            contacts: { elementId: 'contactsTab', type: 'tab' },
            leads: { elementId: 'leadsTab', type: 'tab' },
            pipeline: { elementId: 'pipelineTab', type: 'tab' },
            reports: { elementId: 'reportsTab', type: 'tab' },
            tasks: { elementId: 'tasksTab', type: 'tab' },
            monitoring: { elementId: 'monitoringTab', type: 'tab' },
            socialMedia: { elementId: 'socialMediaTab', type: 'tab' },
            config: { elementId: 'configTab', type: 'tab' },
            admin: { elementId: 'adminTab', type: 'tab' },
            
            // School modules (button bar)
            students: { elementId: 'studentsBtn', type: 'school' },
            payments: { elementId: 'paymentsBtn', type: 'school' },
            groups: { elementId: 'groupsBtn', type: 'school' },
            teachers: { elementId: 'teachersBtn', type: 'school' },
            attendance: { elementId: 'attendanceBtn', type: 'school' }
        };
        
        console.log('✅ Permission Enforcer initialized');
    }
    
    // Initialize the permission system
    async init() {
        try {
            console.log('🔐 Initializing permission enforcement...');
            
            // Wait for Firebase and user authentication
            await this.waitForFirebase();
            
            // Load user permissions
            await this.loadUserPermissions();
            
            // Apply permissions to UI
            this.enforcePermissions();
            
            // Set up observer for school buttons
            this.observeSchoolButtons();
            
            this.isReady = true;
            console.log('✅ Permission enforcement active');
            
        } catch (error) {
            console.error('❌ Permission Enforcer initialization error:', error);
        }
    }
    
    // Wait for Firebase to be ready
    async waitForFirebase() {
        console.log('⏳ Waiting for Firebase...');
        
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds timeout
        
        while (attempts < maxAttempts) {
            if (window.FirebaseData && window.FirebaseData.currentUser) {
                console.log('✅ Firebase ready');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        throw new Error('Firebase timeout');
    }
    
    // Load user permissions from Firebase
    async loadUserPermissions() {
        try {
            console.log('📥 Loading user permissions...');
            
            // Get user profile
            const profile = await window.FirebaseData.loadUserProfile();
            if (!profile) {
                console.log('⚠️ No user profile found');
                return;
            }
            
            this.userRole = profile.role;
            console.log('👤 User role:', this.userRole);
            
            // Directors see everything
            if (this.userRole === 'director') {
                console.log('👑 Director role - all permissions granted');
                this.userPermissions = this.getAllModulesPermission();
                return;
            }
            
            // Load specific permissions for this user
            const userId = window.FirebaseData.currentUser.uid;
            const db = window.firebaseModules.database;
            const permRef = db.ref(window.FirebaseData.database, `users/${userId}/permissions/modules`);
            const snapshot = await db.get(permRef);
            
            if (snapshot.exists()) {
                this.userPermissions = snapshot.val() || {};
                console.log('📋 User permissions loaded:', this.userPermissions);
            } else {
                console.log('⚠️ No permissions found - using defaults');
                this.userPermissions = this.getDefaultPermissions();
            }
            
        } catch (error) {
            console.error('❌ Error loading permissions:', error);
            this.userPermissions = this.getDefaultPermissions();
        }
    }
    
    // Get all modules permission (for directors)
    getAllModulesPermission() {
        const allPermissions = {};
        Object.keys(this.moduleMapping).forEach(module => {
            allPermissions[module] = true;
        });
        return allPermissions;
    }
    
    // Get default permissions (contacts and leads only)
    getDefaultPermissions() {
        const defaultPerms = {};
        this.defaultModules.forEach(module => {
            defaultPerms[module] = true;
        });
        return defaultPerms;
    }
    
    // Check if user has permission for a module
    hasPermission(module) {
        // Directors always have permission
        if (this.userRole === 'director') {
            return true;
        }
        
        // Check specific permission
        return this.userPermissions[module] === true;
    }
    
    // Main enforcement function
    enforcePermissions() {
        console.log('🎯 Enforcing permissions on UI...');
        
        // Hide all navigation tabs first, then show allowed ones
        Object.entries(this.moduleMapping).forEach(([module, config]) => {
            if (config.type === 'tab') {
                const element = document.getElementById(config.elementId);
                if (element) {
                    if (this.hasPermission(module)) {
                        console.log(`✅ Showing ${module} tab`);
                        element.style.display = '';
                    } else {
                        console.log(`🚫 Hiding ${module} tab`);
                        element.style.display = 'none';
                    }
                }
            }
        });
        
        // Check if user has any school permissions
        const schoolModules = ['students', 'payments', 'groups', 'teachers', 'attendance'];
        const hasAnySchoolPermission = schoolModules.some(module => this.hasPermission(module));
        
        // Control school button bar visibility
        this.controlSchoolButtonBar(hasAnySchoolPermission);
    }
    
    // Control school button bar visibility
    controlSchoolButtonBar(shouldShow) {
        const buttonBar = document.getElementById('schoolButtonBar');
        const floatBtn = document.getElementById('schoolFloatBtn');
        
        if (!shouldShow) {
            console.log('🚫 Hiding school button bar - no permissions');
            if (buttonBar) {
                buttonBar.style.display = 'none';
            }
            if (floatBtn) {
                floatBtn.style.display = 'none';
            }
        } else {
            console.log('✅ School modules accessible');
            // Hide individual buttons user doesn't have permission for
            this.enforceSchoolButtonPermissions();
        }
    }
    
    // Enforce permissions on individual school buttons
    enforceSchoolButtonPermissions() {
        const buttonBar = document.getElementById('schoolButtonBar');
        if (!buttonBar) return;
        
        // Map of button text to module permission
        const buttonModuleMap = {
            'Estudiantes': 'students',
            'Pagos': 'payments',
            'Grupos': 'groups',
            'Profesores': 'teachers',
            'Asistencia': 'attendance'
        };
        
        // Find all buttons in the button bar
        const buttons = buttonBar.querySelectorAll('button');
        buttons.forEach(button => {
            const buttonText = button.textContent.trim();
            
            // Check each module
            Object.entries(buttonModuleMap).forEach(([text, module]) => {
                if (buttonText.includes(text)) {
                    if (this.hasPermission(module)) {
                        console.log(`✅ Showing ${module} button`);
                        button.style.display = '';
                    } else {
                        console.log(`🚫 Hiding ${module} button`);
                        button.style.display = 'none';
                    }
                }
            });
        });
    }
    
    // Observer for school buttons (they load after page load)
    observeSchoolButtons() {
        console.log('👁️ Setting up school button observer...');
        
        // Check periodically for school button bar
        const checkInterval = setInterval(() => {
            const buttonBar = document.getElementById('schoolButtonBar');
            if (buttonBar) {
                console.log('📦 School button bar detected');
                clearInterval(checkInterval);
                
                // Check if user should see it
                const schoolModules = ['students', 'payments', 'groups', 'teachers', 'attendance'];
                const hasAnySchoolPermission = schoolModules.some(module => this.hasPermission(module));
                
                this.controlSchoolButtonBar(hasAnySchoolPermission);
            }
        }, 1000);
        
        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }
    
    // Refresh permissions (call this after admin changes permissions)
    async refresh() {
        console.log('🔄 Refreshing permissions...');
        await this.loadUserPermissions();
        this.enforcePermissions();
    }
    
    // Debug function
    debug() {
        console.log('=== Permission Enforcer Debug ===');
        console.log('Role:', this.userRole);
        console.log('Permissions:', this.userPermissions);
        console.log('Is Ready:', this.isReady);
        
        // Check each module
        Object.keys(this.moduleMapping).forEach(module => {
            console.log(`${module}: ${this.hasPermission(module) ? '✅' : '🚫'}`);
        });
    }
}

// Create global instance
window.PermissionEnforcer = new PermissionEnforcer();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.PermissionEnforcer.init(), 2000);
    });
} else {
    // DOM already loaded
    setTimeout(() => window.PermissionEnforcer.init(), 2000);
}

// Provide global functions for admin-center integration
window.refreshUserPermissions = function() {
    if (window.PermissionEnforcer && window.PermissionEnforcer.isReady) {
        window.PermissionEnforcer.refresh();
    }
};

// Debug helper
window.debugPermissions = function() {
    if (window.PermissionEnforcer) {
        window.PermissionEnforcer.debug();
    } else {
        console.log('❌ Permission Enforcer not loaded');
    }
};

console.log('✅ Permission Enforcer loaded');
console.log('Use debugPermissions() to check current permissions');
