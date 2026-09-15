// permission-enforcer.js - Lightweight Permission Enforcement System
// Works with admin-center.js to control module visibility
console.log('🔒 Loading Permission Enforcer...');

// ============ IMMEDIATE SECURITY CSS ============
// Inject CSS to hide modules immediately as backup
(function() {
    const style = document.createElement('style');
    style.id = 'permission-enforcer-hide';
    style.innerHTML = `
        /* Hide school modules until authenticated - DON'T change positioning */
        #schoolButtonBar {
            display: none !important;
        }
        #schoolFloatBtn {
            display: none !important;
        }
        /* Hide navigation tabs until authenticated */
        #contactsTab, #leadsTab, #pipelineTab, #trialsTab, #reportsTab,
        #tasksTab, #monitoringTab, #socialMediaTab, #configTab, #adminTab {
            display: none !important;
        }
        /* When authorized, ensure modules use their original positioning */
        #schoolButtonBar.authorized {
            display: flex !important;
            flex-direction: column !important;
        }
    `;
    document.head.appendChild(style);
    console.log('🛡️ Security CSS injected');
})();

// ============ IMMEDIATE HIDE - ADD THIS BLOCK ============
// Hide everything immediately until we verify authentication
(function() {
    // Save original addSchoolButtons if it exists
    if (typeof window.addSchoolButtons === 'function') {
        window.originalAddSchoolButtons = window.addSchoolButtons;
    }
    
    // Block school-buttons.js from running until authenticated
    window.addSchoolButtons = function() {
        if (!window.FirebaseData?.currentUser) {
            console.log('🚫 Blocked addSchoolButtons - not authenticated');
            return;
        }
        // Call original if authenticated
        if (window.originalAddSchoolButtons) {
            window.originalAddSchoolButtons();
        }
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
                    if (node.nodeType === 1 && node.id) { // Element node with ID
                        // Check if this is a school module by ID
                        if (node.id === 'schoolButtonBar' || 
                            node.id === 'schoolFloatBtn' ||
                            node.id === 'schoolModuleView') {
                            node.style.display = 'none';
                            console.log('🚫 Blocked module from appearing:', node.id);
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
            // Find and hide school button bar only
            const schoolBar = document.getElementById('schoolButtonBar');
            if (schoolBar && schoolBar.style.display !== 'none') {
                schoolBar.style.display = 'none';
                console.log('🚫 Re-hiding school button bar');
            }
            
            const floatBtn = document.getElementById('schoolFloatBtn');
            if (floatBtn && floatBtn.style.display !== 'none') {
                floatBtn.style.display = 'none';
            }
        } else {
            // Stop checking once authenticated
            clearInterval(hideInterval);
        }
    }, 250); // Check every 250ms
    
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
        this.isAuthenticated = false; // Track authentication status
        this.defaultModules = []; // CHANGED: Empty array - no defaults until logged in
        
        // Module to UI element mapping
        this.moduleMapping = {
            // Main navigation tabs
            contacts: { elementId: 'contactsTab', type: 'tab' },
            leads: { elementId: 'leadsTab', type: 'tab' },
            pipeline: { elementId: 'pipelineTab', type: 'tab' },
            trials: { elementId: 'trialsTab', type: 'tab' },            // 🧪 Clases de prueba (15 Sep 2026)
            reports: { elementId: 'reportsTab', type: 'tab' },
            tasks: { elementId: 'tasksTab', type: 'tab' },
            monitoring: { elementId: 'monitoringTab', type: 'tab' },
            socialMedia: { elementId: 'socialMediaTab', type: 'tab' },
            classProgress: { elementId: 'classProgressTab', type: 'tab' },   // gated since 15 Sep 2026
            tutorboxAdmin: { elementId: 'tutorboxAdminTab', type: 'tab' },   // gated since 15 Sep 2026
            config: { elementId: 'configTab', type: 'tab' },
            admin: { elementId: 'adminTab', type: 'tab' },

            // School modules (button bar) — matched by button TEXT in
            // enforceSchoolButtonPermissions (school-buttons.js sets no ids)
            students: { elementId: 'studentsBtn', type: 'school' },
            payments: { elementId: 'paymentsBtn', type: 'school' },
            tienda: { elementId: 'tiendaBtn', type: 'school' },
            finance: { elementId: 'financeBtn', type: 'school' },
            groups: { elementId: 'groupsBtn', type: 'school' },
            teachers: { elementId: 'teachersBtn', type: 'school' },
            attendance: { elementId: 'attendanceBtn', type: 'school' }
        };
        
        console.log('✅ Permission Enforcer initialized');
    }
    
    // Initialize the permission system
    async init() {
        try {
            console.log('🔐 Starting secure initialization...');
            
            // Wait for Firebase and user authentication
            await this.waitForFirebase();
            
            console.log('✅ User authenticated:', window.FirebaseData.currentUser.email);
            
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
            
            // For admin/director, ensure school buttons are created with original positioning
            if (this.userRole === 'admin' || this.userRole === 'director') {
                console.log('🔓 Admin/Director detected - ensuring all modules visible');
                
                // Wait a bit then ensure visibility and VERTICAL layout
                setTimeout(() => {
                    // Try to create school buttons if they don't exist
                    if (!document.getElementById('schoolButtonBar')) {
                        if (window.originalAddSchoolButtons) {
                            console.log('🏫 Creating school buttons for admin');
                            window.originalAddSchoolButtons();
                        } else if (typeof window.addSchoolButtons === 'function') {
                            console.log('🏫 Creating school buttons for admin (alt)');
                            window.addSchoolButtons();
                        }
                    }
                    
                    // Ensure visibility and correct vertical layout
                    const buttonBar = document.getElementById('schoolButtonBar');
                    if (buttonBar) {
                        buttonBar.style.display = 'flex';
                        buttonBar.style.flexDirection = 'column'; // FORCE vertical
                        buttonBar.classList.add('authorized');
                        console.log('📐 Forced vertical layout for school buttons');
                    }
                }, 500);
            }
            
            this.isReady = true;
            console.log('✅ Permission enforcement active - Role:', this.userRole);
            
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
                this.isAuthenticated = true; // Set authenticated flag
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
            console.log('📧 User email:', window.FirebaseData.currentUser.email);
            
            // Check if user is admin by email as fallback
            const isAdminEmail = window.FirebaseData.currentUser.email.includes('admin');
            
            // Directors and admins see everything
            if (this.userRole === 'director' || this.userRole === 'admin' || isAdminEmail) {
                console.log('👑 Admin/Director role detected - granting all permissions');
                this.userPermissions = this.getAllModulesPermission();
                
                // If detected as admin by email but role isn't set, update role
                if (isAdminEmail && !this.userRole) {
                    this.userRole = 'admin';
                }
                
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
        // Check if user is admin by email
        const isAdminEmail = window.FirebaseData?.currentUser?.email?.includes('admin');
        
        // Directors, admins, and admin emails always have permission
        if (this.userRole === 'director' || this.userRole === 'admin' || isAdminEmail) {
            return true;
        }
        
        // Modules that were never gated before 15 Sep 2026 stay open for existing
        // staff whose permission node does not mention them — except for the
        // sales role, which only sees what is explicitly granted.
        if (this.userPermissions[module] === undefined && this.userRole !== 'ventas' &&
            ['tasks', 'socialMedia', 'classProgress', 'tutorboxAdmin', 'tienda', 'finance'].includes(module)) {
            return true;
        }

        // Check specific permission
        return this.userPermissions[module] === true;
    }
    
    // Main enforcement function
    enforcePermissions() {
        console.log('🎯 Enforcing permissions on UI...');
        
        // First, make sure to remove any lingering hide styles
        const hideStyle = document.getElementById('permission-enforcer-hide');
        if (hideStyle) {
            hideStyle.remove();
            console.log('🔓 Removed lingering security CSS');
        }
        
        // Process navigation tabs
        Object.entries(this.moduleMapping).forEach(([module, config]) => {
            if (config.type === 'tab') {
                const element = document.getElementById(config.elementId);
                if (element) {
                    if (this.hasPermission(module)) {
                        console.log(`✅ Showing ${module} tab`);
                        // Only change display if it's hidden
                        if (element.style.display === 'none') {
                            element.style.display = '';
                        }
                        element.classList.add('authorized');
                    } else {
                        console.log(`🚫 Hiding ${module} tab`);
                        element.style.display = 'none';
                        element.classList.remove('authorized');
                    }
                }
            }
        });
        
        // Check if user has any school permissions
        const schoolModules = ['students', 'payments', 'tienda', 'finance', 'groups', 'teachers', 'attendance'];
        const hasAnySchoolPermission = schoolModules.some(module => this.hasPermission(module));

        // Control school button bar visibility
        this.controlSchoolButtonBar(hasAnySchoolPermission);

        // Never leave the user on a tab they cannot see (15 Sep 2026): Contactos is
        // the tab open at login; a user without that module lands on the first
        // permitted tab instead.
        this.ensureVisibleActiveTab();
        
        // Force re-run school buttons script if it exists and user has permissions
        if (hasAnySchoolPermission) {
            // Ensure vertical layout is preserved
            setTimeout(() => {
                const buttonBar = document.getElementById('schoolButtonBar');
                if (buttonBar && !buttonBar.style.flexDirection) {
                    console.log('📐 Ensuring vertical layout');
                    buttonBar.style.flexDirection = 'column';
                }
            }, 100);
            
            if (typeof window.originalAddSchoolButtons === 'function') {
                console.log('🏫 Re-running school buttons script');
                window.originalAddSchoolButtons();
            }
        }
    }
    
    // If the active tab is hidden by permissions, switch to the first visible one
    ensureVisibleActiveTab() {
        try {
            const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
            if (!tabs.length) return;
            const visible = (el) => el.style.display !== 'none' && el.offsetParent !== null;
            const active = tabs.find(t => t.classList.contains('active'));
            if (active && visible(active)) return;
            const first = tabs.find(visible);
            if (!first) {
                console.warn('🚫 No visible tabs for this user');
                return;
            }
            const target = (first.id || '').replace(/Tab$/, '');
            if (target && typeof window.switchTab === 'function') {
                console.log(`↪️ Active tab not permitted — switching to ${target}`);
                window.switchTab(target);
            }
        } catch (e) {
            console.warn('ensureVisibleActiveTab:', e.message);
        }
    }

    // Control school button bar visibility
    controlSchoolButtonBar(shouldShow) {
        const buttonBar = document.getElementById('schoolButtonBar');
        const floatBtn = document.getElementById('schoolFloatBtn');
        
        if (!shouldShow) {
            console.log('🚫 Hiding school button bar - no permissions');
            if (buttonBar) {
                buttonBar.style.display = 'none';
                buttonBar.classList.remove('authorized');
            }
            if (floatBtn) {
                floatBtn.style.display = 'none';
                floatBtn.classList.remove('authorized');
            }
        } else {
            console.log('✅ School modules accessible');
            // Show the button bar with ORIGINAL flex display and vertical layout
            if (buttonBar) {
                // Restore to flex display (needed for flex-direction to work)
                buttonBar.style.display = 'flex';
                // Ensure vertical layout is preserved
                if (!buttonBar.style.flexDirection || buttonBar.style.flexDirection !== 'column') {
                    buttonBar.style.flexDirection = 'column';
                }
                buttonBar.classList.add('authorized');
            }
            if (floatBtn) {
                floatBtn.style.display = 'block'; // Float button uses block
                floatBtn.classList.add('authorized');
            }
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
            'Tienda': 'tienda',
            'Finanzas': 'finance',
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
        
        // First, try to run school buttons if they haven't been created yet
        if (typeof window.originalAddSchoolButtons === 'function' || typeof window.addSchoolButtons === 'function') {
            const schoolModules = ['students', 'payments', 'groups', 'teachers', 'attendance'];
            const hasAnySchoolPermission = schoolModules.some(module => this.hasPermission(module));
            
            if (hasAnySchoolPermission) {
                console.log('🏫 User has school permissions, ensuring buttons are created');
                // Try to run the original function
                if (window.originalAddSchoolButtons) {
                    window.originalAddSchoolButtons();
                } else if (window.addSchoolButtons) {
                    window.addSchoolButtons();
                }
            }
        }
        
        // Check periodically for school button bar
        const checkInterval = setInterval(() => {
            const buttonBar = document.getElementById('schoolButtonBar');
            if (buttonBar) {
                console.log('📦 School button bar detected');
                clearInterval(checkInterval);
                
                // Check if user should see it
                const schoolModules = ['students', 'payments', 'groups', 'teachers', 'attendance'];
                const hasAnySchoolPermission = schoolModules.some(module => this.hasPermission(module));
                
                // Show with proper flex display and vertical layout
                if (hasAnySchoolPermission) {
                    buttonBar.style.display = 'flex';
                    buttonBar.style.flexDirection = 'column'; // ENSURE vertical
                    buttonBar.classList.add('authorized');
                }
                
                this.controlSchoolButtonBar(hasAnySchoolPermission);
            }
        }, 500); // Check every 500ms
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    // Refresh permissions (call this after admin changes permissions)
    async refresh() {
        console.log('🔄 Refreshing permissions...');
        await this.loadUserPermissions();
        this.enforcePermissions();
    }
    
    // Reset on logout
    reset() {
        console.log('🔒 Resetting permissions - user logged out');
        this.isAuthenticated = false;
        this.isReady = false;
        this.userRole = null;
        this.userPermissions = {};
        this.hideAllModules();
        
        // Re-inject hide CSS
        if (!document.getElementById('permission-enforcer-hide')) {
            const style = document.createElement('style');
            style.id = 'permission-enforcer-hide';
            style.innerHTML = `
                #schoolButtonBar, #schoolFloatBtn { display: none !important; }
                #contactsTab, #leadsTab, #pipelineTab, #reportsTab,
                #tasksTab, #monitoringTab, #socialMediaTab, #configTab, #adminTab {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Debug function
    debug() {
        console.log('=== Permission Enforcer Debug ===');
        console.log('Authenticated:', this.isAuthenticated);
        console.log('Role:', this.userRole);
        console.log('Email:', window.FirebaseData?.currentUser?.email);
        console.log('Is Admin:', this.userRole === 'admin' || this.userRole === 'director' || window.FirebaseData?.currentUser?.email?.includes('admin'));
        console.log('Permissions:', this.userPermissions);
        console.log('Is Ready:', this.isReady);
        
        // Check each module
        console.log('=== Module Permissions ===');
        Object.keys(this.moduleMapping).forEach(module => {
            console.log(`${module}: ${this.hasPermission(module) ? '✅' : '🚫'}`);
        });
        
        // Check DOM visibility
        console.log('=== DOM Element Visibility ===');
        console.log('schoolButtonBar:', document.getElementById('schoolButtonBar')?.style.display || 'not found');
        console.log('contactsTab:', document.getElementById('contactsTab')?.style.display || 'not found');
        console.log('Hide CSS present:', document.getElementById('permission-enforcer-hide') ? 'Yes' : 'No');
    }
    
    // Force show all modules (for debugging)
    forceShowAll() {
        console.log('🔓 Force showing all modules...');
        
        // Remove CSS hide
        const hideStyle = document.getElementById('permission-enforcer-hide');
        if (hideStyle) hideStyle.remove();
        
        // Show all tabs by only changing display property
        const allTabs = ['contactsTab', 'leadsTab', 'pipelineTab', 'reportsTab', 
                        'tasksTab', 'monitoringTab', 'socialMediaTab', 'configTab', 'adminTab'];
        
        allTabs.forEach(tabId => {
            const element = document.getElementById(tabId);
            if (element && element.style.display === 'none') {
                element.style.display = ''; // Reset display only if hidden
                element.classList.add('authorized');
                console.log(`✅ Forced show: ${tabId}`);
            }
        });
        
        // Show school button bar with VERTICAL layout preserved
        const buttonBar = document.getElementById('schoolButtonBar');
        if (buttonBar) {
            buttonBar.style.display = 'flex';
            buttonBar.style.flexDirection = 'column'; // ENSURE vertical
            buttonBar.classList.add('authorized');
            console.log('✅ Forced show: schoolButtonBar (vertical)');
        }
        
        const floatBtn = document.getElementById('schoolFloatBtn');
        if (floatBtn && floatBtn.style.display === 'none') {
            floatBtn.style.display = 'block';
            floatBtn.classList.add('authorized');
            console.log('✅ Forced show: schoolFloatBtn');
        }
        
        console.log('✅ All modules forced visible');
    }
    
    // Restore original school button positioning (VERTICAL layout)
    restoreSchoolButtonPosition() {
        console.log('🔧 Restoring school button bar to vertical layout...');
        const buttonBar = document.getElementById('schoolButtonBar');
        if (buttonBar) {
            // Restore the EXACT original styles from school-buttons.js
            buttonBar.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: white;
                border: 2px solid #3b82f6;
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;
            console.log('✅ School button bar restored to vertical layout');
        }
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

// Also check authentication state changes
setTimeout(() => {
    if (window.FirebaseData?.auth) {
        window.FirebaseData.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('🔑 Auth state: User logged in -', user.email);
                if (window.PermissionEnforcer && !window.PermissionEnforcer.isReady) {
                    console.log('🔄 Initializing permissions for authenticated user');
                    window.PermissionEnforcer.init();
                } else if (window.PermissionEnforcer?.isReady && window.PermissionEnforcer.userRole) {
                    // Double-check modules are visible for admin
                    if (window.PermissionEnforcer.userRole === 'admin' || 
                        window.PermissionEnforcer.userRole === 'director' ||
                        user.email.includes('admin')) {
                        console.log('🔓 Ensuring admin modules are visible with vertical layout');
                        // Ensure proper display and vertical layout
                        const buttonBar = document.getElementById('schoolButtonBar');
                        if (buttonBar) {
                            buttonBar.style.display = 'flex';
                            buttonBar.style.flexDirection = 'column'; // FORCE vertical
                            buttonBar.classList.add('authorized');
                        }
                    }
                }
            } else {
                // User logged out
                console.log('🔒 Auth state: User logged out');
                if (window.PermissionEnforcer) {
                    window.PermissionEnforcer.reset();
                }
            }
        });
    }
}, 1000); // Wait 1 second for Firebase to be ready

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

// Force show all modules (for admin debugging)
window.forceShowModules = function() {
    if (window.PermissionEnforcer) {
        window.PermissionEnforcer.forceShowAll();
    } else {
        console.log('❌ Permission Enforcer not loaded');
    }
};

// Restore school button position
window.fixSchoolButtonPosition = function() {
    if (window.PermissionEnforcer) {
        window.PermissionEnforcer.restoreSchoolButtonPosition();
    } else {
        console.log('❌ Permission Enforcer not loaded');
    }
};

console.log('✅ Permission Enforcer loaded');
console.log('📝 Commands:');
console.log('  debugPermissions() - Check current permissions');
console.log('  forceShowModules() - Force show all modules');
console.log('  fixSchoolButtonPosition() - Restore floating position & vertical layout');
console.log('');
console.log('🔧 Quick fix if modules are horizontal:');
console.log("  document.getElementById('schoolButtonBar').style.flexDirection = 'column'");
