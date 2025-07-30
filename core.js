// core.js - FIREBASE INTEGRATED VERSION - ENHANCED WITH FUNCTION NUMBERING
// ===== CORE SYSTEM MODULE ENHANCED =====
// Authentication, initialization, and core functionality with Firebase
// ================================================================================

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let userRole = null;
let isInitialized = false;
let performanceMonitor = {
    startTime: performance.now(),
    loadTimes: [],
    errorCount: 0
};

// ===== FUNCIÓN 1: LOGIN WITH ENHANCED VALIDATION =====
async function login(event) {
    console.log('⚡ FUNCIÓN 1: Login with Enhanced Validation');
    
    if (event) {
        event.preventDefault();
    }
    
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    
    try {
        // Disable login button with loading state
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="loading-spinner" style="width: 12px; height: 12px; display: inline-block; margin-right: 0.5rem;"></div>Conectando...';
        
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Enhanced validation
        const validationResult = validateLoginCredentials(email, password);
        if (!validationResult.isValid) {
            throw new Error(validationResult.message);
        }
        
        console.log('🔐 Attempting Firebase login for:', email);
        
        // Attempt Firebase login with timeout
        const loginPromise = window.FirebaseData.login(email, password);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout - check connection')), 10000)
        );
        
        const userCredential = await Promise.race([loginPromise, timeoutPromise]);
        console.log('✅ Firebase login successful');
        
        // Store user info
        currentUser = userCredential.user;
        
        // Load user profile with retries
        const profile = await loadUserProfileWithRetry();
        if (!profile) {
            throw new Error('User profile not found. Contact administrator.');
        }
        
        userRole = profile.role;
        console.log('👤 User role loaded:', userRole);
        
        // Update last login timestamp
        await updateLastLogin();
        
        // Clear login error
        hideLoginError();
        
        // Initialize main application
        await initializeMainApplication();
        
        // Show success notification
        showNotification(`✅ ¡Bienvenido ${profile.name}!\n🔥 Conectado a Firebase\n👑 Rol: ${profile.role}`, 'success', 3000);
        
        console.log('🎉 Login process completed successfully');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 1 ERROR - Login failed:', error);
        
        let errorMessage = 'Error de autenticación';
        
        // Enhanced error handling
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado. Contacta al administrador.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Error de conexión. Verifica tu internet.';
        } else {
            errorMessage = error.message;
        }
        
        showLoginError(errorMessage);
        performanceMonitor.errorCount++;
        
    } finally {
        // Re-enable login button
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
    }
}

// ===== FUNCIÓN 2: VALIDATE LOGIN CREDENTIALS =====
function validateLoginCredentials(email, password) {
    console.log('⚡ FUNCIÓN 2: Validate Login Credentials');
    
    const errors = [];
    
    // Email validation
    if (!email) {
        errors.push('Email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Formato de email inválido');
    }
    
    // Password validation
    if (!password) {
        errors.push('Contraseña es requerida');
    } else if (password.length < 6) {
        errors.push('Contraseña debe tener al menos 6 caracteres');
    }
    
    const result = {
        isValid: errors.length === 0,
        message: errors.join(', ')
    };
    
    console.log('📋 Credential validation result:', result);
    return result;
}

// ===== FUNCIÓN 3: LOAD USER PROFILE WITH RETRY =====
async function loadUserProfileWithRetry(maxRetries = 3) {
    console.log('⚡ FUNCIÓN 3: Load User Profile with Retry');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`👤 Loading user profile, attempt ${attempt}/${maxRetries}`);
            
            const profile = await window.FirebaseData.loadUserProfile();
            if (profile) {
                console.log('✅ User profile loaded successfully:', profile.name);
                return profile;
            }
            
            // If no profile found, wait before retry
            if (attempt < maxRetries) {
                console.log('⏳ Profile not found, waiting 1 second before retry...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`❌ Profile load attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    
    return null;
}

// ===== FUNCIÓN 4: UPDATE LAST LOGIN =====
async function updateLastLogin() {
    try {
        console.log('⚡ FUNCIÓN 4: Update Last Login');
        
        if (!currentUser) return;
        
        await window.FirebaseData.updateContact(currentUser.uid, {
            lastLogin: new Date().toISOString(),
            loginCount: (await getLoginCount()) + 1
        });
        
        console.log('🕒 Last login timestamp updated');
    } catch (error) {
        console.error('❌ Error updating last login:', error);
        // Non-critical error, don't throw
    }
}

// ===== FUNCIÓN 5: GET LOGIN COUNT =====
async function getLoginCount() {
    try {
        console.log('⚡ FUNCIÓN 5: Get Login Count');
        
        const profile = await window.FirebaseData.loadUserProfile();
        return profile?.loginCount || 0;
    } catch (error) {
        console.error('❌ Error getting login count:', error);
        return 0;
    }
}

// ===== FUNCIÓN 6: SHOW/HIDE LOGIN ERROR =====
function showLoginError(message) {
    console.log('⚡ FUNCIÓN 6: Show Login Error');
    
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Add shake animation
        errorDiv.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            errorDiv.style.animation = '';
        }, 500);
    }
}

function hideLoginError() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

// ===== FUNCIÓN 7: INITIALIZE MAIN APPLICATION =====
async function initializeMainApplication() {
    try {
        console.log('⚡ FUNCIÓN 7: Initialize Main Application');
        
        // Hide login screen and show main app
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Load user profile for display
        const profile = await window.FirebaseData.loadUserProfile();
        
        // Update UI with user information
        updateUserInterface(profile);
        
        // Configure role-based access
        configureRoleBasedAccess(profile.role);
        
        // Initialize data and views
        await initializeDataAndViews();
        
        // Initialize enhanced features
        await initializeEnhancedFeatures();
        
        // Mark as initialized
        isInitialized = true;
        
        // Performance monitoring
        const initTime = performance.now() - performanceMonitor.startTime;
        console.log(`🚀 Application initialized in ${initTime.toFixed(2)}ms`);
        performanceMonitor.loadTimes.push(initTime);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 7 ERROR - Error initializing main application:', error);
        showNotification('❌ Error inicializando la aplicación', 'error');
    }
}

// ===== FUNCIÓN 8: UPDATE USER INTERFACE =====
function updateUserInterface(profile) {
    console.log('⚡ FUNCIÓN 8: Update User Interface');
    
    try {
        // Update user name display
        const userNameEl = document.getElementById('currentUserName');
        if (userNameEl) {
            userNameEl.textContent = profile.name || 'Usuario';
        }
        
        // Update user role display
        const userRoleEl = document.getElementById('userRole');
        if (userRoleEl) {
            const roleEmoji = profile.role === 'director' ? '👑' : '👤';
            userRoleEl.textContent = `${roleEmoji} ${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}`;
        }
        
        // Update page titles based on role
        updatePageTitles(profile);
        
        console.log('✅ User interface updated successfully');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 8 ERROR - Error updating UI:', error);
    }
}

// ===== FUNCIÓN 9: UPDATE PAGE TITLES =====
function updatePageTitles(profile) {
    console.log('⚡ FUNCIÓN 9: Update Page Titles');
    
    const titleMappings = {
        director: {
            'contactsTitle': '📞 Contactos del Equipo',
            'leadsTitle': '👥 Gestión de Leads del Equipo',
            'reportsTitle': '📊 Reportes Ejecutivos'
        },
        vendedor: {
            'contactsTitle': '📞 Mis Contactos del Día',
            'leadsTitle': '👥 Mis Leads',
            'reportsTitle': '📊 Mis Reportes'
        }
    };
    
    const titles = titleMappings[profile.role] || titleMappings.vendedor;
    
    Object.keys(titles).forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = titles[elementId];
        }
    });
}

// ===== FUNCIÓN 10: CONFIGURE ROLE-BASED ACCESS =====
function configureRoleBasedAccess(role) {
    console.log('⚡ FUNCIÓN 10: Configure Role-Based Access');
    
    try {
        // Show/hide tabs based on role
        const monitoringTab = document.getElementById('monitoringTab');
        const configTab = document.getElementById('configTab');
        const directorConfig = document.getElementById('directorConfig');
        const leadsFilters = document.getElementById('leadsFilters');
        
        if (role === 'director') {
            // Show director-only features
            if (monitoringTab) monitoringTab.style.display = 'block';
            if (configTab) configTab.style.display = 'block';
            if (directorConfig) directorConfig.classList.remove('hidden');
            if (leadsFilters) leadsFilters.style.display = 'flex';
            
            // Update leads table header for directors
            updateLeadsTableHeaderForDirector();
            
        } else {
            // Hide director-only features
            if (monitoringTab) monitoringTab.style.display = 'none';
            if (configTab) configTab.style.display = 'none';
            if (directorConfig) directorConfig.classList.add('hidden');
            if (leadsFilters) leadsFilters.style.display = 'none';
        }
        
        console.log('✅ Role-based access configured for:', role);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 10 ERROR - Error configuring role access:', error);
    }
}

// ===== FUNCIÓN 11: UPDATE LEADS TABLE HEADER FOR DIRECTOR =====
function updateLeadsTableHeaderForDirector() {
    console.log('⚡ FUNCIÓN 11: Update Leads Table Header for Director');
    
    const header = document.getElementById('leadsTableHeader');
    if (header) {
        header.innerHTML = `
            <th>👤 Nombre</th>
            <th>📞 Teléfono</th>
            <th>📍 Fuente</th>
            <th>📊 Estado</th>
            <th>📅 Fecha</th>
            <th>👨‍💼 Vendedor</th>
            <th>⚡ Acciones</th>
        `;
    }
}

// ===== FUNCIÓN 12: INITIALIZE DATA AND VIEWS =====
async function initializeDataAndViews() {
    try {
        console.log('⚡ FUNCIÓN 12: Initialize Data and Views');
        
        // Show loading indicators
        showLoadingStates();
        
        // Initialize data with parallel loading
        const initPromises = [
            updateStats(),
            updateLeadsTable(),
            loadConveniosSystem()
        ];
        
        // Add role-specific initializations
        const profile = await window.FirebaseData.loadUserProfile();
        if (profile.role === 'director') {
            initPromises.push(
                updateReports(),
                refreshMonitoring(),
                loadSalespersonFilter()
            );
        } else {
            initPromises.push(updateReports());
        }
        
        // Wait for all initializations
        await Promise.allSettled(initPromises);
        
        // Hide loading indicators
        hideLoadingStates();
        
        console.log('✅ Data and views initialized successfully');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 12 ERROR - Error initializing data and views:', error);
        showNotification('⚠️ Error cargando algunos datos', 'warning');
    }
}

// ===== FUNCIÓN 13: SHOW/HIDE LOADING STATES =====
function showLoadingStates() {
    console.log('⚡ FUNCIÓN 13: Show Loading States');
    
    // Add loading class to main container
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('loading');
    }
    
    // Show skeleton loading for stats
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        statsGrid.style.opacity = '0.6';
    }
}

function hideLoadingStates() {
    // Remove loading class
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('loading');
    }
    
    // Restore stats opacity
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        statsGrid.style.opacity = '1';
    }
}

// ===== FUNCIÓN 14: LOAD CONVENIOS SYSTEM =====
async function loadConveniosSystem() {
    try {
        console.log('⚡ FUNCIÓN 14: Load Convenios System');
        
        // Pre-load convenios for faster form interaction
        if (window.FirebaseData) {
            const convenios = await window.FirebaseData.getConvenios();
            
            // Cache convenios globally for quick access
            window.cachedConvenios = convenios || [];
            
            console.log('🤝 Convenios system loaded:', convenios?.length || 0, 'convenios');
            
            // Initialize convenios list in config if director
            const profile = await window.FirebaseData.loadUserProfile();
            if (profile.role === 'director') {
                await updateConveniosList();
            }
        }
        
    } catch (error) {
        console.error('❌ FUNCIÓN 14 ERROR - Error loading convenios system:', error);
        window.cachedConvenios = [];
    }
}

// ===== FUNCIÓN 15: LOAD SALESPERSON FILTER =====
async function loadSalespersonFilter() {
    try {
        console.log('⚡ FUNCIÓN 15: Load Salesperson Filter');
        
        const filter = document.getElementById('salespersonFilter');
        if (!filter) return;
        
        // Load all users
        const allUsers = await window.FirebaseData.getAllUsers();
        const salespeople = Object.entries(allUsers).filter(([uid, user]) => user.role === 'vendedor');
        
        // Populate filter
        filter.innerHTML = '<option value="">👥 Todos los vendedores</option>' +
            salespeople.map(([uid, user]) => 
                `<option value="${uid}">👤 ${user.name}</option>`
            ).join('');
        
        console.log('✅ Salesperson filter loaded with', salespeople.length, 'salespeople');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 15 ERROR - Error loading salesperson filter:', error);
    }
}

// ===== FUNCIÓN 16: INITIALIZE ENHANCED FEATURES =====
async function initializeEnhancedFeatures() {
    try {
        console.log('⚡ FUNCIÓN 16: Initialize Enhanced Features');
        
        // Initialize keyboard shortcuts
        initializeKeyboardShortcuts();
        
        // Initialize auto-save functionality
        initializeAutoSave();
        
        // Initialize performance monitoring
        initializePerformanceMonitoring();
        
        // Initialize offline detection
        initializeOfflineDetection();
        
        // Initialize activity tracking
        initializeActivityTracking();
        
        console.log('✅ Enhanced features initialized');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 16 ERROR - Error initializing enhanced features:', error);
    }
}

// ===== FUNCIÓN 17: INITIALIZE KEYBOARD SHORTCUTS =====
function initializeKeyboardShortcuts() {
    console.log('⚡ FUNCIÓN 17: Initialize Keyboard Shortcuts');
    
    document.addEventListener('keydown', (e) => {
        // Global shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'Enter':
                    // Submit active form
                    const activeForm = document.querySelector('form:focus-within');
                    if (activeForm) {
                        e.preventDefault();
                        activeForm.dispatchEvent(new Event('submit'));
                    }
                    break;
                    
                case 'r':
                    // Refresh data
                    e.preventDefault();
                    refreshData();
                    break;
                    
                case 'f':
                    // Focus search
                    e.preventDefault();
                    const searchInput = document.querySelector('input[type="search"], input[placeholder*="buscar" i]');
                    if (searchInput) {
                        searchInput.focus();
                    }
                    break;
                    
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                    // Switch tabs
                    e.preventDefault();
                    const tabIndex = parseInt(e.key) - 1;
                    const tabs = document.querySelectorAll('.tab');
                    if (tabs[tabIndex]) {
                        tabs[tabIndex].click();
                    }
                    break;
            }
        }
        
        // Escape key actions
        if (e.key === 'Escape') {
            // Close modals, clear forms, etc.
            const activeForm = document.querySelector('form:focus-within');
            if (activeForm) {
                activeForm.reset();
            }
        }
    });
    
    console.log('⌨️ Keyboard shortcuts enabled');
}

// ===== FUNCIÓN 18: INITIALIZE AUTO-SAVE =====
function initializeAutoSave() {
    console.log('⚡ FUNCIÓN 18: Initialize Auto-Save');
    
    // Auto-save form data to sessionStorage to prevent data loss
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Load saved data
            const savedValue = sessionStorage.getItem(`autosave_${input.id}`);
            if (savedValue && !input.value) {
                input.value = savedValue;
            }
            
            // Save data on change
            input.addEventListener('input', () => {
                sessionStorage.setItem(`autosave_${input.id}`, input.value);
            });
        });
        
        // Clear auto-save data on successful submission
        form.addEventListener('submit', () => {
            setTimeout(() => {
                inputs.forEach(input => {
                    sessionStorage.removeItem(`autosave_${input.id}`);
                });
            }, 1000);
        });
    });
    
    console.log('💾 Auto-save functionality enabled');
}

// ===== FUNCIÓN 19: INITIALIZE PERFORMANCE MONITORING =====
function initializePerformanceMonitoring() {
    console.log('⚡ FUNCIÓN 19: Initialize Performance Monitoring');
    
    // Monitor page visibility
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('👁️ Page became visible - refreshing data');
            refreshData();
        }
    });
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                console.warn('⚠️ High memory usage detected');
                // Could trigger cleanup operations here
            }
        }, 60000); // Check every minute
    }
    
    // Monitor network status
    if ('connection' in navigator) {
        const connection = navigator.connection;
        console.log('📡 Network type:', connection.effectiveType);
        
        connection.addEventListener('change', () => {
            console.log('📡 Network changed to:', connection.effectiveType);
            updateNetworkStatus(connection.effectiveType);
        });
    }
    
    console.log('📊 Performance monitoring enabled');
}

// ===== FUNCIÓN 20: INITIALIZE OFFLINE DETECTION =====
function initializeOfflineDetection() {
    console.log('⚡ FUNCIÓN 20: Initialize Offline Detection');
    
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const firebaseStatus = document.getElementById('firebaseStatus');
        
        if (firebaseStatus) {
            if (isOnline) {
                firebaseStatus.classList.remove('disconnected');
                firebaseStatus.innerHTML = '🔥 Firebase Conectado';
            } else {
                firebaseStatus.classList.add('disconnected');
                firebaseStatus.innerHTML = '📱 Modo Offline';
            }
        }
        
        console.log('🌐 Online status:', isOnline ? 'Online' : 'Offline');
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
    
    console.log('📱 Offline detection enabled');
}

// ===== FUNCIÓN 21: INITIALIZE ACTIVITY TRACKING =====
function initializeActivityTracking() {
    console.log('⚡ FUNCIÓN 21: Initialize Activity Tracking');
    
    let lastActivity = Date.now();
    let activityTimer;
    
    function resetActivityTimer() {
        lastActivity = Date.now();
        clearTimeout(activityTimer);
        
        // Auto-refresh data after 5 minutes of inactivity
        activityTimer = setTimeout(() => {
            console.log('🔄 Auto-refreshing due to inactivity');
            refreshData();
        }, 5 * 60 * 1000);
    }
    
    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetActivityTimer, true);
    });
    
    // Initial timer
    resetActivityTimer();
    
    console.log('👤 Activity tracking enabled');
}

// ===== FUNCIÓN 22: UPDATE NETWORK STATUS =====
function updateNetworkStatus(effectiveType) {
    console.log('⚡ FUNCIÓN 22: Update Network Status');
    
    const statusMap = {
        'slow-2g': { emoji: '🐌', text: 'Red Lenta' },
        '2g': { emoji: '📶', text: 'Red 2G' },
        '3g': { emoji: '📶', text: 'Red 3G' },
        '4g': { emoji: '📶', text: 'Red 4G' }
    };
    
    const status = statusMap[effectiveType] || { emoji: '📶', text: 'Red Desconocida' };
    
    // Could update UI to show network status
    console.log(`📡 Network status updated: ${status.emoji} ${status.text}`);
}

// ===== FUNCIÓN 23: REFRESH DATA =====
async function refreshData() {
    try {
        console.log('⚡ FUNCIÓN 23: Refresh Data');
        
        if (!isInitialized) {
            console.log('⚠️ Application not initialized yet');
            return;
        }
        
        // Show refresh indicator
        const refreshBtn = document.querySelector('[onclick="refreshData()"]');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '🔄 Sincronizando...';
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }, 2000);
        }
        
        // Refresh all data
        await Promise.allSettled([
            updateStats(),
            updateLeadsTable(),
            updateReports()
        ]);
        
        // Refresh role-specific data
        if (userRole === 'director') {
            await Promise.allSettled([
                refreshMonitoring(),
                updateConveniosList()
            ]);
        }
        
        showNotification('✅ Datos actualizados', 'success', 2000);
        console.log('✅ Data refresh completed');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 23 ERROR - Error refreshing data:', error);
        showNotification('❌ Error al actualizar datos', 'error');
    }
}

// ===== FUNCIÓN 24: LOGOUT WITH CLEANUP =====
async function logout() {
    try {
        console.log('⚡ FUNCIÓN 24: Logout with Cleanup');
        
        // Confirm logout
        const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
        if (!confirmLogout) return;
        
        // Show logout indicator
        const logoutBtn = document.querySelector('[onclick="logout()"]');
        if (logoutBtn) {
            logoutBtn.innerHTML = '🔄 Cerrando...';
            logoutBtn.disabled = true;
        }
        
        // Clear session data
        clearSessionData();
        
        // Firebase logout
        await window.FirebaseData.logout();
        
        // Reset application state
        resetApplicationState();
        
        // Show login screen
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        
        // Clear form fields
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        
        // Focus username field
        setTimeout(() => {
            document.getElementById('username').focus();
        }, 100);
        
        showNotification('👋 Sesión cerrada correctamente', 'info', 3000);
        console.log('✅ Logout completed successfully');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 24 ERROR - Logout error:', error);
        showNotification('❌ Error al cerrar sesión', 'error');
    }
}

// ===== FUNCIÓN 25: CLEAR SESSION DATA =====
function clearSessionData() {
    console.log('⚡ FUNCIÓN 25: Clear Session Data');
    
    // Clear auto-save data
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
        if (key.startsWith('autosave_')) {
            sessionStorage.removeItem(key);
        }
    });
    
    // Clear cached data
    if (window.AdminData) {
        window.AdminData.invalidateCache();
    }
    
    console.log('🗑️ Session data cleared');
}

// ===== FUNCIÓN 26: RESET APPLICATION STATE =====
function resetApplicationState() {
    console.log('⚡ FUNCIÓN 26: Reset Application State');
    
    // Reset global variables
    currentUser = null;
    userRole = null;
    isInitialized = false;
    
    // Reset UI state
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // Reset to default tab
    const defaultTab = document.getElementById('contactsTab');
    const defaultContent = document.getElementById('contacts');
    
    if (defaultTab) defaultTab.classList.add('active');
    if (defaultContent) defaultContent.classList.remove('hidden');
    
    console.log('🔄 Application state reset');
}

// ===== FUNCIÓN 27: UPDATE CONVENIOS LIST =====
async function updateConveniosList() {
    try {
        console.log('⚡ FUNCIÓN 27: Update Convenios List');
        
        const conveniosList = document.getElementById('conveniosList');
        if (!conveniosList) return;
        
        conveniosList.innerHTML = '<div class="loading-spinner"></div> Cargando convenios...';
        
        const convenios = await window.FirebaseData.getConvenios();
        
        if (!convenios || convenios.length === 0) {
            conveniosList.innerHTML = `
                <div style="text-align: center; color: #666; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🤝</div>
                    <p>No hay convenios registrados</p>
                    <small>Agrega el primer convenio arriba</small>
                </div>
            `;
            return;
        }
        
        conveniosList.innerHTML = convenios.map((convenio, index) => `
            <div class="convenio-item">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="background: #10b981; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                        ${index + 1}
                    </span>
                    <span style="font-weight: 500;">${convenio}</span>
                </div>
                <button onclick="deleteConvenio('${convenio}')" 
                        style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem;"
                        title="Eliminar convenio">
                    🗑️
                </button>
            </div>
        `).join('');
        
        console.log('✅ Convenios list updated with', convenios.length, 'items');
        
    } catch (error) {
        console.error('❌ FUNCIÓN 27 ERROR - Error updating convenios list:', error);
        const conveniosList = document.getElementById('conveniosList');
        if (conveniosList) {
            conveniosList.innerHTML = '<div style="color: #ef4444;">❌ Error cargando convenios</div>';
        }
    }
}

// ===== FUNCIÓN 28: ADD CONVENIO =====
async function addConvenio() {
    try {
        console.log('⚡ FUNCIÓN 28: Add Convenio');
        
        const input = document.getElementById('newConvenio');
        const convenioName = input.value.trim();
        
        if (!convenioName) {
            showNotification('⚠️ Ingresa el nombre del convenio', 'warning');
            input.focus();
            return;
        }
        
        if (convenioName.length < 3) {
            showNotification('⚠️ El nombre debe tener al menos 3 caracteres', 'warning');
            input.focus();
            return;
        }
        
        // Get current convenios
        const currentConvenios = await window.FirebaseData.getConvenios();
        
        // Check for duplicates
        if (currentConvenios.includes(convenioName)) {
            showNotification('⚠️ Este convenio ya existe', 'warning');
            input.focus();
            return;
        }
        
        // Add new convenio
        const updatedConvenios = [...currentConvenios, convenioName];
        await window.FirebaseData.updateConvenios(updatedConvenios);
        
        // Clear input
        input.value = '';
        
        // Update UI
        await updateConveniosList();
        
        // Update cached convenios
        window.cachedConvenios = updatedConvenios;
        
        showNotification(`✅ Convenio "${convenioName}" agregado correctamente`, 'success');
        console.log('✅ Convenio added successfully:', convenioName);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 28 ERROR - Error adding convenio:', error);
        showNotification('❌ Error al agregar convenio', 'error');
    }
}

// ===== FUNCIÓN 29: DELETE CONVENIO =====
async function deleteConvenio(convenioName) {
    try {
        console.log('⚡ FUNCIÓN 29: Delete Convenio');
        
        const confirmDelete = confirm(`¿Estás seguro de eliminar el convenio "${convenioName}"?\n\nEsta acción no se puede deshacer.`);
        if (!confirmDelete) return;
        
        // Get current convenios
        const currentConvenios = await window.FirebaseData.getConvenios();
        
        // Remove convenio
        const updatedConvenios = currentConvenios.filter(c => c !== convenioName);
        await window.FirebaseData.updateConvenios(updatedConvenios);
        
        // Update UI
        await updateConveniosList();
        
        // Update cached convenios
        window.cachedConvenios = updatedConvenios;
        
        showNotification(`✅ Convenio "${convenioName}" eliminado correctamente`, 'success');
        console.log('✅ Convenio deleted successfully:', convenioName);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 29 ERROR - Error deleting convenio:', error);
        showNotification('❌ Error al eliminar convenio', 'error');
    }
}

// ===== FUNCIÓN 30: DEBUG DATA =====
async function debugData() {
    try {
        console.log('⚡ FUNCIÓN 30: Debug Data');
        
        const debugInfo = {
            timestamp: new Date().toISOString(),
            user: {
                authenticated: !!currentUser,
                email: currentUser?.email,
                role: userRole,
                isInitialized: isInitialized
            },
            firebase: {
                available: !!window.FirebaseData,
                currentUser: !!window.FirebaseData?.currentUser
            },
            adminData: {
                available: !!window.AdminData,
                isReady: window.AdminData?.isReady,
                dataCount: window.AdminData?.data?.length || 0
            },
            convenios: {
                cached: window.cachedConvenios?.length || 0,
                systemAvailable: typeof window.FirebaseData?.getConvenios === 'function'
            },
            performance: {
                loadTimes: performanceMonitor.loadTimes,
                errorCount: performanceMonitor.errorCount,
                averageLoadTime: performanceMonitor.loadTimes.length > 0 ? 
                    (performanceMonitor.loadTimes.reduce((a, b) => a + b, 0) / performanceMonitor.loadTimes.length).toFixed(2) + 'ms' : 'N/A'
            }
        };
        
        console.log('🔍 DEBUG INFO:', debugInfo);
        
        alert(`🔍 DEBUG INFORMATION:

👤 USER:
- Authenticated: ${debugInfo.user.authenticated ? '✅' : '❌'}
- Email: ${debugInfo.user.email || 'N/A'}
- Role: ${debugInfo.user.role || 'N/A'}
- Initialized: ${debugInfo.user.isInitialized ? '✅' : '❌'}

🔥 FIREBASE:
- Available: ${debugInfo.firebase.available ? '✅' : '❌'}
- Current User: ${debugInfo.firebase.currentUser ? '✅' : '❌'}

📊 ADMIN DATA:
- Available: ${debugInfo.adminData.available ? '✅' : '❌'}
- Ready: ${debugInfo.adminData.isReady ? '✅' : '❌'}
- Data Count: ${debugInfo.adminData.dataCount}

🤝 CONVENIOS:
- Cached: ${debugInfo.convenios.cached}
- System Available: ${debugInfo.convenios.systemAvailable ? '✅' : '❌'}

⚡ PERFORMANCE:
- Average Load Time: ${debugInfo.performance.averageLoadTime}
- Error Count: ${debugInfo.performance.errorCount}

Check console for detailed information.`);
        
        return debugInfo;
        
    } catch (error) {
        console.error('❌ FUNCIÓN 30 ERROR - Debug error:', error);
        alert(`❌ Error en debug: ${error.message}`);
    }
}

// ===== INITIALIZATION WHEN DOM IS READY =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded - Core system ready');
    
    // Start performance monitoring
    performanceMonitor.startTime = performance.now();
    
    // Focus username field
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.focus();
    }
    
    // Add Enter key listener for password field
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    console.log('✅ Core.js Enhanced loaded with 30 organized functions');
});

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('💥 Global Error:', e.error);
    performanceMonitor.errorCount++;
    
    // Don't show notification for every error to avoid spam
    if (performanceMonitor.errorCount <= 3) {
        showNotification('⚠️ Se detectó un error. Verifica la consola.', 'warning');
    }
});

// ===== UNHANDLED PROMISE REJECTION HANDLER =====
window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled Promise Rejection:', e.reason);
    performanceMonitor.errorCount++;
    
    if (performanceMonitor.errorCount <= 3) {
        showNotification('⚠️ Error de conexión detectado', 'warning');
    }
});

console.log('✅ Core.js Enhanced loaded with comprehensive error handling and monitoring');
