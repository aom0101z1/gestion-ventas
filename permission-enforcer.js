// permission-enforcer.js - Enhanced Security Permission System
// Single file solution with immediate lockdown and comprehensive security

console.log('🔒 Loading Enhanced Permission Enforcer...');

// ============ IMMEDIATE SECURITY LOCKDOWN ============
// This runs instantly before anything else
(function immediateSecurityLockdown() {
    // Hide all modules immediately
    const elementsToHide = [
        'schoolButtonBar', 'schoolFloatBtn', 'schoolModuleView',
        'contactsTab', 'leadsTab', 'pipelineTab', 'reportsTab', 
        'tasksTab', 'monitoringTab', 'socialMediaTab', 'configTab', 'adminTab'
    ];
    
    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.setAttribute('data-security-hidden', 'true');
        }
    });
    
    // Hide any elements that might be module-related
    document.querySelectorAll('[id*="Tab"], [id*="Module"], [class*="module"]').forEach(el => {
        el.style.display = 'none';
    });
    
    console.log('🚨 Immediate security lockdown applied - all modules hidden');
})();

// ============ CSS FALLBACK INJECTION ============
// Inject critical security CSS in case JavaScript fails later
(function injectSecurityCSS() {
    const style = document.createElement('style');
    style.id = 'permission-enforcer-security';
    style.innerHTML = `
        /* Critical Security CSS - Hide everything by default */
        #schoolButtonBar, #schoolFloatBtn, #schoolModuleView,
        [id$="Tab"], [id*="Module"], .module-container {
            display: none !important;
        }
        
        /* Only show when explicitly authorized */
        .authenticated [data-permission-granted="true"] {
            display: block !important;
        }
        
        /* Loading indicator styles */
        .permission-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
        }
        
        .permission-loader {
            text-align: center;
            color: white;
        }
        
        .permission-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #374151;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Security warning styles */
        .security-warning {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 100000;
            display: none;
        }
        
        .security-warning.active {
            display: block;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Security CSS injected');
})();

// ============ PERMISSION ENFORCER CLASS ============
class PermissionEnforcer {
    constructor() {
        this.userPermissions = {};
        this.userRole = null;
        this.isReady = false;
        this.isAuthenticated = false;
        this.defaultModules = []; // No default modules for non-authenticated users
        this.securityLog = [];
        this.loadingOverlay = null;
        
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
        
        // Start security monitoring
        this.startSecurityMonitoring();
        
        console.log('✅ Permission Enforcer initialized with enhanced security');
    }
    
    // Show loading indicator
    showLoadingIndicator() {
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.className = 'permission-loading-overlay';
            this.loadingOverlay.innerHTML = `
                <div class="permission-loader">
                    <div class="permission-spinner"></div>
                    <div>🔒 Verificando permisos...</div>
                    <div style="font-size: 0.9em; opacity: 0.8; margin-top: 10px;">
                        Por favor espere...
                    </div>
                </div>
            `;
            document.body.appendChild(this.loadingOverlay);
        }
    }
    
    // Hide loading indicator
    hideLoadingIndicator() {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
    
    // Security event logging
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            user: window.FirebaseData?.currentUser?.email || 'anonymous',
            details: details
        };
        
        this.securityLog.push(logEntry);
        console.log(`🔐 Security Event: ${event}`, details);
        
        // Send to Firebase if critical event
        if (event.includes('VIOLATION') || event.includes('FAILED')) {
            this.sendToFirebase(logEntry);
        }
        
        // Keep only last 100 events in memory
        if (this.securityLog.length > 100) {
            this.securityLog.shift();
        }
    }
    
    // Send security events to Firebase
    async sendToFirebase(logEntry) {
        try {
            if (window.FirebaseData?.database && window.firebaseModules?.database) {
                const db = window.firebaseModules.database;
                const logRef = db.ref(window.FirebaseData.database, 'security_logs');
                await db.push(logRef, logEntry);
            }
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }
    
    // Initialize the permission system
    async init() {
        try {
            console.log('🔐 Starting secure initialization...');
            this.logSecurityEvent('INIT_START');
            
            // Show loading indicator
            this.showLoadingIndicator();
            
            // Check if we're on login page
            if (this.isLoginPage()) {
                console.log('📋 Login page detected - maintaining lockdown');
                this.logSecurityEvent('LOGIN_PAGE_DETECTED');
                this.hideLoadingIndicator();
                return;
            }
            
            // Wait for Firebase and user authentication
            const authResult = await this.waitForFirebase();
            
            if (!authResult) {
                console.log('❌ No authenticated user - maintaining lockdown');
                this.logSecurityEvent('AUTH_FAILED', { reason: 'No user found' });
                this.showSecurityWarning('No autorizado - Por favor inicie sesión');
                this.hideLoadingIndicator();
                return;
            }
            
            this.isAuthenticated = true;
            this.logSecurityEvent('AUTH_SUCCESS', { user: window.FirebaseData.currentUser.email });
            
            // Add authenticated class to body
            document.body.classList.add('authenticated');
            
            // Load user permissions
            await this.loadUserPermissions();
            
            // Apply permissions to UI
            this.enforcePermissions();
            
            // Set up observer for school buttons
            this.observeSchoolButtons();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            this.isReady = true;
            this.logSecurityEvent('INIT_COMPLETE', { role: this.userRole });
            console.log('✅ Permission enforcement active');
            
        } catch (error) {
            console.error('❌ Permission Enforcer initialization error:', error);
            this.logSecurityEvent('INIT_ERROR', { error: error.message });
            this.showSecurityWarning('Error de seguridad - Contacte al administrador');
            this.hideLoadingIndicator();
        }
    }
    
    // Check if on login page
    isLoginPage() {
        return !window.FirebaseData?.currentUser && 
               (document.querySelector('.login-form') || 
                document.querySelector('#loginForm') ||
                document.querySelector('[data-login-page]'));
    }
    
    // Show security warning
    showSecurityWarning(message) {
        const warning = document.createElement('div');
        warning.className = 'security-warning active';
        warning.textContent = `⚠️ ${message}`;
        document.body.appendChild(warning);
        
        setTimeout(() => warning.remove(), 5000);
    }
    
    // Wait for Firebase to be ready
    async waitForFirebase() {
        console.log('⏳ Waiting for Firebase authentication...');
        
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds timeout (reduced from 15)
        
        while (attempts < maxAttempts) {
            if (window.FirebaseData && window.FirebaseData.currentUser) {
                console.log('✅ Firebase ready');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        this.logSecurityEvent('AUTH_TIMEOUT');
        return false;
    }
    
    // Load user permissions from Firebase
    async loadUserPermissions() {
        try {
            console.log('📥 Loading user permissions...');
            
            // Get user profile
            const profile = await window.FirebaseData.loadUserProfile();
            if (!profile) {
                console.log('⚠️ No user profile found - no access granted');
                this.logSecurityEvent('PROFILE_NOT_FOUND');
                return;
            }
            
            this.userRole = profile.role;
            console.log('👤 User role:', this.userRole);
            
            // Directors see everything
            if (this.userRole === 'director' || this.userRole === 'admin') {
                console.log('👑 Admin role - all permissions granted');
                this.userPermissions = this.getAllModulesPermission();
                this.logSecurityEvent('ADMIN_ACCESS_GRANTED');
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
                this.logSecurityEvent('PERMISSIONS_LOADED', { modules: Object.keys(this.userPermissions).filter(k => this.userPermissions[k]) });
            } else {
                console.log('⚠️ No permissions found - no modules granted');
                this.userPermissions = {};
                this.logSecurityEvent('NO_PERMISSIONS');
            }
            
        } catch (error) {
            console.error('❌ Error loading permissions:', error);
            this.userPermissions = {};
            this.logSecurityEvent('PERMISSION_LOAD_ERROR', { error: error.message });
        }
    }
    
    // Get all modules permission (for directors/admins)
    getAllModulesPermission() {
        const allPermissions = {};
        Object.keys(this.moduleMapping).forEach(module => {
            allPermissions[module] = true;
        });
        return allPermissions;
    }
    
    // Check if user has permission for a module
    hasPermission(module) {
        // Must be authenticated
        if (!this.isAuthenticated) {
            return false;
        }
        
        // Directors/admins always have permission
        if (this.userRole === 'director' || this.userRole === 'admin') {
            return true;
        }
        
        // Check specific permission
        return this.userPermissions[module] === true;
    }
    
    // Main enforcement function
    enforcePermissions() {
        console.log('🎯 Enforcing permissions on UI...');
        
        if (!this.isAuthenticated) {
            console.log('🚫 Not authenticated - hiding all modules');
            this.hideAllModules();
            return;
        }
        
        // Process each module
        Object.entries(this.moduleMapping).forEach(([module, config]) => {
            const element = document.getElementById(config.elementId);
            if (element) {
                if (this.hasPermission(module)) {
                    console.log(`✅ Showing ${module}`);
                    element.style.display = '';
                    element.setAttribute('data-permission-granted', 'true');
                    element.removeAttribute('data-security-hidden');
                } else {
                    console.log(`🚫 Hiding ${module}`);
                    element.style.display = 'none';
                    element.setAttribute('data-permission-granted', 'false');
                    
                    // Log attempted access to restricted module
                    element.addEventListener('click', () => {
                        this.logSecurityEvent('ACCESS_DENIED', { module: module });
                        this.showSecurityWarning(`Sin acceso al módulo: ${module}`);
                    }, { once: true });
                }
            }
        });
        
        // Handle school button bar
        this.controlSchoolButtonBar();
    }
    
    // Hide all modules
    hideAllModules() {
        Object.values(this.moduleMapping).forEach(config => {
            const element = document.getElementById(config.elementId);
            if (element) {
                element.style.display = 'none';
                element.setAttribute('data-permission-granted', 'false');
            }
        });
        
        const buttonBar = document.getElementById('schoolButtonBar');
        if (buttonBar) buttonBar.style.display = 'none';
        
        const floatBtn = document.getElementById('schoolFloatBtn');
        if (floatBtn) floatBtn.style.display = 'none';
    }
    
    // Control school button bar visibility
    controlSchoolButtonBar() {
        const schoolModules = ['students', 'payments', 'groups', 'teachers', 'attendance'];
        const hasAnySchoolPermission = schoolModules.some(module => this.hasPermission(module));
        
        const buttonBar = document.getElementById('schoolButtonBar');
        const floatBtn = document.getElementById('schoolFloatBtn');
        
        if (!hasAnySchoolPermission) {
            console.log('🚫 No school permissions - hiding school UI');
            if (buttonBar) buttonBar.style.display = 'none';
            if (floatBtn) floatBtn.style.display = 'none';
        } else {
            console.log('✅ School modules accessible');
            if (buttonBar) {
                buttonBar.style.display = 'flex';
                buttonBar.setAttribute('data-permission-granted', 'true');
            }
            this.enforceSchoolButtonPermissions();
        }
    }
    
    // Enforce permissions on individual school buttons
    enforceSchoolButtonPermissions() {
        const buttonBar = document.getElementById('schoolButtonBar');
        if (!buttonBar) return;
        
        const buttonModuleMap = {
            'Estudiantes': 'students',
            'Pagos': 'payments',
            'Grupos': 'groups',
            'Profesores': 'teachers',
            'Asistencia': 'attendance'
        };
        
        const buttons = buttonBar.querySelectorAll('button');
        buttons.forEach(button => {
            const buttonText = button.textContent.trim();
            
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
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.id === 'schoolButtonBar' || node.id === 'schoolFloatBtn') {
                        if (!this.isAuthenticated) {
                            node.style.display = 'none';
                            this.logSecurityEvent('BLOCKED_UNAUTHORIZED_MODULE', { element: node.id });
                        } else {
                            this.controlSchoolButtonBar();
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Start security monitoring
    startSecurityMonitoring() {
        // Monitor for authentication state changes
        if (window.FirebaseData?.auth) {
            window.FirebaseData.auth.onAuthStateChanged((user) => {
                if (user && !this.isAuthenticated) {
                    console.log('🔄 User logged in - refreshing permissions');
                    this.init();
                } else if (!user && this.isAuthenticated) {
                    console.log('🔒 User logged out - locking down');
                    this.logSecurityEvent('USER_LOGOUT');
                    this.lockdown();
                }
            });
        }
        
        // Periodic authentication check (every 60 seconds)
        setInterval(() => {
            if (this.isAuthenticated && !window.FirebaseData?.currentUser) {
                console.log('⚠️ Authentication lost - locking down');
                this.logSecurityEvent('AUTH_LOST');
                this.lockdown();
            }
        }, 60000);
        
        // Detect suspicious activity
        this.detectSuspiciousActivity();
    }
    
    // Detect suspicious activity
    detectSuspiciousActivity() {
        let clickCount = 0;
        let lastClickTime = Date.now();
        
        document.addEventListener('click', (e) => {
            const now = Date.now();
            
            // Reset counter if more than 1 second has passed
            if (now - lastClickTime > 1000) {
                clickCount = 0;
            }
            
            clickCount++;
            lastClickTime = now;
            
            // Detect rapid clicking (potential attack)
            if (clickCount > 10) {
                this.logSecurityEvent('SUSPICIOUS_ACTIVITY', { 
                    type: 'rapid_clicking',
                    count: clickCount 
                });
                clickCount = 0;
            }
            
            // Detect attempts to access hidden elements
            if (e.target.style.display === 'none' || 
                e.target.getAttribute('data-permission-granted') === 'false') {
                this.logSecurityEvent('SUSPICIOUS_ACCESS_ATTEMPT', {
                    element: e.target.id || e.target.className
                });
            }
        });
        
        // Detect console opening (F12 or right-click inspect)
        let devtools = { open: false, orientation: null };
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || 
                window.outerWidth - window.innerWidth > 200) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('DEVTOOLS_OPENED');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }
    
    // Lockdown system
    lockdown() {
        this.isAuthenticated = false;
        this.userPermissions = {};
        this.userRole = null;
        document.body.classList.remove('authenticated');
        this.hideAllModules();
        this.showSecurityWarning('Sesión cerrada - Por favor inicie sesión nuevamente');
    }
    
    // Refresh permissions (call this after admin changes permissions)
    async refresh() {
        console.log('🔄 Refreshing permissions...');
        this.logSecurityEvent('PERMISSION_REFRESH');
        await this.loadUserPermissions();
        this.enforcePermissions();
    }
    
    // Debug function
    debug() {
        console.log('=== Permission Enforcer Debug ===');
        console.log('Authenticated:', this.isAuthenticated);
        console.log('Role:', this.userRole);
        console.log('Permissions:', this.userPermissions);
        console.log('Is Ready:', this.isReady);
        console.log('Security Log (last 10):', this.securityLog.slice(-10));
        
        if (this.isAuthenticated) {
            console.log('=== Module Access ===');
            Object.keys(this.moduleMapping).forEach(module => {
                console.log(`${module}: ${this.hasPermission(module) ? '✅' : '🚫'}`);
            });
        } else {
            console.log('🚫 Not authenticated - no permissions');
        }
        
        return {
            authenticated: this.isAuthenticated,
            role: this.userRole,
            permissions: this.userPermissions,
            securityLog: this.securityLog
        };
    }
}

// Create global instance
window.PermissionEnforcer = new PermissionEnforcer();

// Initialize immediately when DOM is ready - NO DELAYS!
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.PermissionEnforcer.init();
    });
} else {
    // DOM already loaded - init immediately
    window.PermissionEnforcer.init();
}

// Provide global functions for admin-center integration
window.refreshUserPermissions = function() {
    if (window.PermissionEnforcer && window.PermissionEnforcer.isReady) {
        window.PermissionEnforcer.refresh();
    }
};

// Enhanced debug helper
window.debugPermissions = function() {
    if (window.PermissionEnforcer) {
        return window.PermissionEnforcer.debug();
    } else {
        console.log('❌ Permission Enforcer not loaded');
        return null;
    }
};

// Security log viewer
window.viewSecurityLog = function(last = 20) {
    if (window.PermissionEnforcer) {
        const logs = window.PermissionEnforcer.securityLog.slice(-last);
        console.table(logs);
        return logs;
    }
    return [];
};

// Export security report
window.exportSecurityReport = function() {
    if (window.PermissionEnforcer) {
        const report = {
            timestamp: new Date().toISOString(),
            authenticated: window.PermissionEnforcer.isAuthenticated,
            user: window.FirebaseData?.currentUser?.email,
            role: window.PermissionEnforcer.userRole,
            permissions: window.PermissionEnforcer.userPermissions,
            securityEvents: window.PermissionEnforcer.securityLog
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${Date.now()}.json`;
        a.click();
        
        console.log('📊 Security report exported');
        return report;
    }
    return null;
};

console.log('✅ Enhanced Permission Enforcer loaded');
console.log('🔐 Security features enabled:');
console.log('  - Immediate module hiding');
console.log('  - CSS fallback protection');
console.log('  - Loading indicators');
console.log('  - Security event logging');
console.log('  - Suspicious activity detection');
console.log('  - Automatic lockdown on logout');
console.log('');
console.log('📊 Available commands:');
console.log('  debugPermissions() - View current permissions');
console.log('  viewSecurityLog(20) - View last 20 security events');
console.log('  exportSecurityReport() - Export full security report');
