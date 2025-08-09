// permission-enforcer.js - Lightweight Permission Enforcement System
// Works with admin-center.js to control module visibility
console.log('🔒 Loading Permission Enforcer...');

// ============ IMMEDIATE SECURITY CSS ============
// Inject CSS to hide modules immediately as backup
(function() {
    const style = document.createElement('style');
    style.id = 'permission-enforcer-hide';
    style.innerHTML = `
        /* Hide school modules until authenticated */
        #schoolButtonBar, #schoolFloatBtn, #schoolModuleView {
            display: none !important;
            visibility: hidden !important;
        }
        /* Hide any element containing school module text */
        div:not(.login-form):not(.login-container) {
            button:not([onclick*="Firebase"]) {
                display: none !important;
            }
        }
        /* Hide navigation tabs */
        #contactsTab, #leadsTab, #pipelineTab, #reportsTab,
        #tasksTab, #monitoringTab, #socialMediaTab, #configTab, #adminTab {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    console.log('🛡️ Security CSS injected');
})();

// ============ IMMEDIATE HIDE - ADD THIS BLOCK ============
// Hide everything immediately until we verify authentication
(function() {
    // Block school-buttons.js from running until authenticated
    window.addSchoolButtons = function() {
        if (!window.FirebaseData?.currentUser) {
            console.log('🚫 Blocked addSchoolButtons - not authenticated');
            return;
        }
        // Will be replaced by the real function once authenticated
    };
    
    // Hide all tabs immediately
    const elementsToHide = [
        'schoolButtonBar', 'schoolFloatBtn',
        'contactsTab', 'leadsTab', 'pipelineTab', 'reportsTab', 
        'tasksTab', 'monitoringTab', 'socialMediaTab', 'configTab', 'adminTab'
    ];
    
    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Monitor DOM for school modules being added and hide them immediately
    const observer = new MutationObserver(function(mutations) {
        // Only hide if we're not authenticated yet
        if (!window.FirebaseData?.currentUser) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        // Check if this is a school module by ID, class, or content
                        const shouldHide = 
                            node.id === 'schoolButtonBar' || 
                            node.id === 'schoolFloatBtn' ||
                            node.id === 'schoolModuleView' ||
                            (node.className && typeof node.className === 'string' && 
                             (node.className.includes('school') || node.className.includes('module'))) ||
                            (node.textContent && 
                             (node.textContent.includes('Módulos Escolares') ||
                              node.textContent.includes('Estudiantes') ||
                              node.textContent.includes('Pagos') ||
                              node.textContent.includes('Grupos') ||
                              node.textContent.includes('Profesores') ||
                              node.textContent.includes('Asistencia')));
                        
                        if (shouldHide) {
                            node.style.display = 'none';
                            node.style.visibility = 'hidden';
                            console.log('🚫 Blocked module from appearing:', node.id || node.className || 'school element');
                        }
                        
                        // Also check children for school-related elements
                        if (node.querySelectorAll) {
                            const schoolElements = node.querySelectorAll('#schoolButtonBar, #schoolFloatBtn, .school-module, [class*="school"]');
                            schoolElements.forEach(el => {
                                el.style.display = 'none';
                                el.style.visibility = 'hidden';
                            });
                            
                            // Check for buttons with school module text
                            const buttons = node.querySelectorAll('button');
                            buttons.forEach(btn => {
                                const text = btn.textContent || '';
                                if (text.includes('Estudiantes') || text.includes('Pagos') || 
                                    text.includes('Grupos') || text.includes('Profesores') || 
                                    text.includes('Asistencia')) {
                                    btn.style.display = 'none';
                                    btn.style.visibility = 'hidden';
                                    // Also hide parent container if it only contains school buttons
                                    if (btn.parentElement) {
                                        btn.parentElement.style.display = 'none';
                                    }
                                }
                            });
                        }
                    }
                });
            });
        }
    });
    
    // Start observing immediately
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Store observer reference to stop it later when authenticated
    window._moduleHideObserver = observer;
    
    // Also periodically check for any visible school modules (belt and suspenders)
    const hideInterval = setInterval(function() {
        if (!window.FirebaseData?.currentUser) {
            // Find and hide any school-related elements
            document.querySelectorAll('#schoolButtonBar, #schoolFloatBtn, [class*="school"]').forEach(el => {
                el.style.display = 'none';
            });
            // Find buttons with school text
            document.querySelectorAll('button').forEach(btn => {
                const text = btn.textContent || '';
                if (text.includes('Estudiantes') || text.includes('Pagos') || 
                    text.includes('Grupos') || text.includes('Profesores') || 
                    text.includes('Asistencia')) {
                    btn.style.display = 'none';
                    if (btn.parentElement && btn.parentElement.id !== 'root') {
                        btn.parentElement.style.display = 'none';
                    }
                }
            });
        } else {
            // Stop checking once authenticated
            clearInterval(hideInterval);
        }
    }, 100); // Check every 100ms
    
    // Store interval reference
    window._moduleHideInterval = hideInterval;
    
    console.log('🔒 Modules hidden and aggressive monitoring active');
})();
// ============ END OF NEW BLOCK ============

// Permission Enforcer Class
class PermissionEnforcer {
    constructor() {
        this.userPermissions = {};
        this.userRole = null;
        this.isReady = false;
        this.defaultModules = []; // CHANGED: Empty array - no defaults until logged in
        
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
            
            // Stop the initial hide observer now that we're authenticated
            if (window._moduleHideObserver) {
                window._moduleHideObserver.disconnect();
                window._moduleHideObserver = null;
                console.log('🔓 Stopped initial security monitoring');
            }
            
            // Stop the hide interval
            if (window._moduleHideInterval) {
                clearInterval(window._moduleHideInterval);
                window._moduleHideInterval = null;
                console.log('🔓 Stopped security interval');
            }
            
            // Remove the hide CSS now that we're authenticated
            const hideStyle = document.getElementById('permission-enforcer-hide');
            if (hideStyle) {
                hideStyle.remove();
                console.log('🔓 Removed security CSS');
            }
            
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
            // ADDED: Keep everything hidden if there's an error
            this.hideAllModules();
        }
    }
    
    // ADDED: Simple hide all function
    hideAllModules() {
        Object.values(this.moduleMapping).forEach(config => {
            const element = document.getElementById(config.elementId);
            if (element) element.style.display = 'none';
        });
        
        const buttonBar = document.getElementById('schoolButtonBar');
        if (buttonBar) buttonBar.style.display = 'none';
        
        const floatBtn = document.getElementById('schoolFloatBtn');
        if (floatBtn) floatBtn.style.display = 'none';
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
            
            // Directors and admins see everything - ADDED 'admin' role
            if (this.userRole === 'director' || this.userRole === 'admin') {
                console.log('👑 Director/Admin role - all permissions granted');
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
                console.log('⚠️ No permissions found - no default access');
                this.userPermissions = {}; // CHANGED: Empty permissions instead of defaults
            }
            
        } catch (error) {
            console.error('❌ Error loading permissions:', error);
            this.userPermissions = {}; // CHANGED: Empty permissions instead of defaults
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
        // Directors and admins always have permission - ADDED 'admin' check
        if (this.userRole === 'director' || this.userRole === 'admin') {
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

// Initialize when DOM is ready - CHANGED: No delay!
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.PermissionEnforcer.init(); // REMOVED setTimeout
    });
} else {
    // DOM already loaded
    window.PermissionEnforcer.init(); // REMOVED setTimeout
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
