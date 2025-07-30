// core.js - CORE APPLICATION LOGIC - COMPLETE VERSION
// ===== MAIN APPLICATION CORE FUNCTIONS =====

// Global variables
let currentUser = null;
let userRole = null;
let isInitialized = false;
let appState = {
    currentTab: 'contacts',
    isLoading: false,
    lastSync: null
};

// ===== AUTHENTICATION MANAGEMENT =====
async function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }
    
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    
    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="loading-spinner" style="width: 12px; height: 12px; display: inline-block; margin-right: 0.5rem;"></div>Conectando...';
        
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            throw new Error('Email y contraseña son requeridos');
        }
        
        console.log('🔐 Attempting Firebase login for:', email);
        
        const userCredential = await window.FirebaseData.login(email, password);
        console.log('✅ Firebase login successful');
        
        currentUser = userCredential.user;
        
        const profile = await window.FirebaseData.loadUserProfile();
        if (!profile) {
            throw new Error('User profile not found. Contact administrator.');
        }
        
        userRole = profile.role;
        console.log('👤 User role loaded:', userRole);
        
        document.getElementById('loginError').classList.add('hidden');
        
        await initializeMainApplication();
        
        showNotification(`✅ ¡Bienvenido ${profile.name}!\n🔥 Sistema completamente funcional\n👑 Rol: ${profile.role}`, 'success');
        
    } catch (error) {
        console.error('❌ Login failed:', error);
        
        let errorMessage = 'Error de autenticación';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado. Contacta al administrador.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta.';
        } else {
            errorMessage = error.message;
        }
        
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = errorMessage;
        errorEl.classList.remove('hidden');
        
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
    }
}

async function handleLogout() {
    try {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            await window.FirebaseData.logout();
            
            // Reset application state
            currentUser = null;
            userRole = null;
            isInitialized = false;
            appState = {
                currentTab: 'contacts',
                isLoading: false,
                lastSync: null
            };
            
            // Show login screen
            document.getElementById('mainApp').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
            
            // Clear form fields
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
            showNotification('👋 Sesión cerrada correctamente', 'info');
        }
    } catch (error) {
        console.error('❌ Logout error:', error);
        showNotification('❌ Error al cerrar sesión', 'error');
    }
}

// ===== MAIN APPLICATION INITIALIZATION =====
async function initializeMainApplication() {
    try {
        console.log('🚀 Initializing main application');
        
        setAppLoading(true);
        
        // Hide login screen and show main app
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        const profile = await window.FirebaseData.loadUserProfile();
        
        // Update UI components
        updateUserInterface(profile);
        configureRoleBasedAccess(profile.role);
        await loadInitialData();
        
        // Initialize modules
        await initializeAppModules();
        
        isInitialized = true;
        setAppLoading(false);
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing main application:', error);
        setAppLoading(false);
        showNotification('❌ Error inicializando la aplicación', 'error');
    }
}

// ===== USER INTERFACE MANAGEMENT =====
function updateUserInterface(profile) {
    console.log('🎨 Updating user interface');
    
    // Update user information
    const userNameEl = document.getElementById('currentUserName');
    if (userNameEl) {
        userNameEl.textContent = profile.name || 'Usuario';
    }
    
    const userRoleEl = document.getElementById('userRole');
    if (userRoleEl) {
        const roleEmoji = profile.role === 'director' ? '👑' : '👤';
        userRoleEl.textContent = `${roleEmoji} ${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}`;
    }
    
    // Update page titles based on role
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

function configureRoleBasedAccess(role) {
    console.log('🔐 Configuring role-based access for:', role);
    
    const monitoringTab = document.getElementById('monitoringTab');
    const configTab = document.getElementById('configTab');
    const directorConfig = document.getElementById('directorConfig');
    const leadsFilters = document.getElementById('leadsFilters');
    const directorReports = document.getElementById('directorReports');
    
    if (role === 'director') {
        // Show director-only elements
        if (monitoringTab) monitoringTab.style.display = 'block';
        if (configTab) configTab.style.display = 'block';
        if (directorConfig) directorConfig.classList.remove('hidden');
        if (leadsFilters) leadsFilters.style.display = 'flex';
        
        // Update leads table header for directors
        const header = document.getElementById('leadsTableHeader');
        if (header) {
            header.innerHTML = `
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Fuente</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Vendedor</th>
                <th>Acciones</th>
            `;
        }
    } else {
        // Hide director-only elements
        if (monitoringTab) monitoringTab.style.display = 'none';
        if (configTab) configTab.style.display = 'none';
        if (directorConfig) directorConfig.classList.add('hidden');
        if (leadsFilters) leadsFilters.style.display = 'none';
        if (directorReports) directorReports.classList.add('hidden');
    }
}

// ===== TAB NAVIGATION SYSTEM =====
async function switchTab(tabName) {
    console.log('📑 Switching to tab:', tabName);

    try {
        // Prevent switching if loading
        if (appState.isLoading) {
            console.log('⚠️ App is loading, tab switch prevented');
            return;
        }

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show target content
        const targetContent = document.getElementById(tabName);
        const targetTab = document.getElementById(tabName + 'Tab');

        if (targetContent) {
            targetContent.classList.remove('hidden');
            console.log('✅ Tab content shown:', tabName);
        } else {
            console.error('❌ Tab content not found:', tabName);
            showNotification(`❌ Tab "${tabName}" no encontrada`, 'error');
            return;
        }

        if (targetTab) {
            targetTab.classList.add('active');
            console.log('✅ Tab activated:', tabName);
        }

        // Update app state
        appState.currentTab = tabName;

        // Cambia aquí: Si es la pestaña 'socialMedia', llama la función especial
        if (tabName === 'socialMedia') {
            if (typeof loadSocialMediaData === 'function') {
                await loadSocialMediaData();
            }
        }

        // Load tab-specific data (esto lo puedes dejar después del bloque anterior)
        await loadTabData(tabName);

        console.log('✅ Tab switched successfully:', tabName);

    } catch (error) {
        console.error('❌ Error switching tab:', error);
        showNotification('❌ Error al cambiar de pestaña', 'error');
    }
}

async function loadTabData(tabName) {
    try {
        console.log('📊 Loading data for tab:', tabName);
        
        switch (tabName) {
            case 'leads':
                if (typeof updateLeadsTable === 'function') {
                    await updateLeadsTable();
                }
                break;
                
            case 'config':
                if (typeof loadConfigData === 'function') {
                    await loadConfigData();
                }
                break;
                
            case 'pipeline':
                if (typeof loadPipelineData === 'function') {
                    await loadPipelineData();
                }
                break;
                
            case 'reports':
                if (typeof loadReportsData === 'function') {
                    await loadReportsData();
                }
                break;
                
            case 'monitoring':
                if (typeof loadMonitoringData === 'function') {
                    await loadMonitoringData();
                }
                break;
                
            default:
                console.log('ℹ️ No specific data loading for tab:', tabName);
        }
    } catch (error) {
        console.error('❌ Error loading tab data:', error);
    }
}

// ===== DATA LOADING AND MANAGEMENT =====
async function loadInitialData() {
    try {
        console.log('📊 Loading initial data');
        
        // Load convenios if sales module exists
        if (typeof loadConvenios === 'function') {
            await loadConvenios();
        }
        
        // Update statistics
        await updateStats();
        
        // Load initial leads table
        if (typeof updateLeadsTable === 'function') {
            await updateLeadsTable();
        }
        
        // Mark last sync time
        appState.lastSync = new Date().toISOString();
        
        console.log('✅ Initial data loaded');
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        throw error;
    }
}

async function updateStats() {
    try {
        console.log('📊 Updating stats');
        
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            console.log('⚠️ Firebase not available for stats');
            return;
        }
        
        const allContacts = await window.FirebaseData.getFilteredContacts();
        const today = new Date().toISOString().split('T')[0];
        
        const todayContacts = allContacts.filter(c => c.date === today);
        const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status || 'Nuevo'));
        const conversions = allContacts.filter(c => c.status === 'Convertido');
        
        // Update stat cards with animation
        updateStatCard('totalLeads', allContacts.length);
        updateStatCard('activeLeads', activeLeads.length);
        updateStatCard('conversions', conversions.length);
        
        console.log('✅ Stats updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating stats:', error);
    }
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== value) {
            // Animate value change
            element.style.transform = 'scale(1.1)';
            element.textContent = value;
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    }
}

// ===== REFRESH AND SYNC FUNCTIONS =====
async function refreshAllData() {
    try {
        console.log('🔄 Refreshing all data');
        
        setAppLoading(true);
        
        // Update stats
        await updateStats();
        
        // Refresh current tab data
        await loadTabData(appState.currentTab);
        
        // Update sync time
        appState.lastSync = new Date().toISOString();
        
        setAppLoading(false);
        
        showNotification('✅ Datos actualizados correctamente', 'success', 2000);
        
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        setAppLoading(false);
        showNotification('❌ Error al actualizar datos', 'error');
    }
}

// ===== LOADING STATE MANAGEMENT =====
function setAppLoading(isLoading) {
    appState.isLoading = isLoading;
    
    // Update UI to show/hide loading state
    const loadingElements = document.querySelectorAll('.loading-spinner');
    const buttons = document.querySelectorAll('.btn');
    
    if (isLoading) {
        buttons.forEach(btn => {
            if (!btn.disabled) {
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            }
        });
    } else {
        buttons.forEach(btn => {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-size: 0.9rem;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        white-space: pre-line;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: 1rem; opacity: 0.8;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// ===== UTILITY FUNCTIONS =====
async function getUserDisplayName(userId) {
    try {
        if (!userId) return 'Unknown User';
        
        const allUsers = await window.FirebaseData.getAllUsers();
        const user = allUsers[userId];
        
        if (user && user.name) {
            return user.name;
        }
        
        if (user && user.email) {
            return user.email.split('@')[0];
        }
        
        return 'Unknown User';
    } catch (error) {
        console.error('❌ Error getting user display name:', error);
        return 'Unknown User';
    }
}

function formatDate(dateString) {
    try {
        if (!dateString) return 'Sin fecha';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('es-ES');
    } catch (error) {
        return dateString || 'Sin fecha';
    }
}

function formatDateTime(dateString, timeString = null) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        
        const dateFormatted = date.toLocaleDateString('es-ES');
        const timeFormatted = timeString ? timeString.substring(0, 5) : date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        return `${dateFormatted} ${timeFormatted}`;
    } catch (error) {
        return 'Fecha inválida';
    }
}

// ===== ERROR HANDLING =====
function handleError(error, context = 'Unknown') {
    console.error(`❌ Error in ${context}:`, error);
    
    let message = 'Ha ocurrido un error inesperado';
    
    if (error.message) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    }
    
    showNotification(`❌ ${message}`, 'error');
}

// ===== APP INITIALIZATION =====
async function initializeAppModules() {
    try {
        console.log('🔧 Initializing app modules');
        
        // Initialize sales module if available
        if (typeof initializeSalesModule === 'function') {
            await initializeSalesModule();
        }
        
        // Initialize pipeline module if available
        if (typeof initializePipelineModule === 'function') {
            await initializePipelineModule();
        }
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('✅ App modules initialized');
        
    } catch (error) {
        console.error('❌ Error initializing app modules:', error);
    }
}

function setupEventListeners() {
    console.log('🎧 Setting up event listeners');
    
    // Window focus refresh
    window.addEventListener('focus', () => {
        if (isInitialized && appState.lastSync) {
            const timeSinceSync = Date.now() - new Date(appState.lastSync).getTime();
            // Auto-refresh if more than 5 minutes since last sync
            if (timeSinceSync > 300000) {
                console.log('🔄 Auto-refreshing due to window focus');
                refreshAllData();
            }
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + R to refresh data (prevent default browser refresh)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshAllData();
        }
        
        // Escape to close modals/notifications
        if (e.key === 'Escape') {
            document.querySelectorAll('.notification-toast').forEach(n => n.remove());
            document.querySelectorAll('.modal').forEach(m => m.remove());
        }
        
        // Tab navigation shortcuts (Ctrl/Cmd + number)
        if ((e.ctrlKey || e.metaKey) && /^[1-6]$/.test(e.key)) {
            e.preventDefault();
            const tabs = ['contacts', 'leads', 'pipeline', 'reports', 'monitoring', 'config'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                switchTab(tabs[tabIndex]);
            }
        }
    });
    
    // Handle beforeunload
    window.addEventListener('beforeunload', (e) => {
        if (appState.isLoading) {
            e.preventDefault();
            e.returnValue = 'Hay operaciones en progreso. ¿Estás seguro de que quieres salir?';
        }
    });
}

// ===== STATUS AND MONITORING =====
function getAppStatus() {
    return {
        isInitialized,
        currentUser: currentUser ? currentUser.email : null,
        userRole,
        currentTab: appState.currentTab,
        isLoading: appState.isLoading,
        lastSync: appState.lastSync,
        firebaseConnected: !!window.FirebaseData?.currentUser
    };
}

function logAppStatus() {
    const status = getAppStatus();
    console.log('📊 App Status:', status);
    return status;
}

// ===== TESTING FUNCTIONS =====
async function testTabSystem() {
    try {
        const tabs = ['contacts', 'leads', 'pipeline', 'reports'];
        let working = 0;
        
        for (const tab of tabs) {
            try {
                switchTab(tab);
                const content = document.getElementById(tab);
                if (content && !content.classList.contains('hidden')) {
                    working++;
                }
            } catch (error) {
                console.error('Error testing tab:', tab, error);
            }
        }
        
        // Reset to contacts tab
        switchTab('contacts');
        
        const message = `🧪 TEST TAB SYSTEM:

📑 Tabs Funcionando: ${working}/${tabs.length}
🎯 Estado: ${working === tabs.length ? '✅ TODAS LAS TABS FUNCIONAN' : '⚠️ ALGUNAS TABS TIENEN PROBLEMAS'}

Tabs Probadas:
${tabs.map(tab => `- ${tab}: ${document.getElementById(tab) ? '✅' : '❌'}`).join('\n')}`;
        
        alert(message);
        return working === tabs.length;
        
    } catch (error) {
        alert(`❌ Error testing tabs: ${error.message}`);
        return false;
    }
}

async function runSystemDiagnostics() {
    try {
        const diagnostics = {
            firebase: !!window.FirebaseData,
            authenticated: !!window.FirebaseData?.currentUser,
            userProfile: !!currentUser,
            tabNavigation: await testTabSystem(),
            modules: {
                sales: typeof handleAddContact === 'function',
                pipeline: typeof loadPipelineData === 'function',
                reports: typeof loadReportsData === 'function'
            },
            lastSync: appState.lastSync,
            isInitialized
        };
        
        console.log('🔍 System Diagnostics:', diagnostics);
        
        const allWorking = Object.values(diagnostics).every(v => 
            typeof v === 'boolean' ? v : true
        );
        
        const message = `🔍 DIAGNÓSTICO DEL SISTEMA:

🔥 Firebase: ${diagnostics.firebase ? '✅' : '❌'}
👤 Autenticado: ${diagnostics.authenticated ? '✅' : '❌'}
📑 Navegación Tabs: ${diagnostics.tabNavigation ? '✅' : '❌'}
📊 Inicializado: ${diagnostics.isInitialized ? '✅' : '❌'}

MÓDULOS:
- Sales: ${diagnostics.modules.sales ? '✅' : '❌'}
- Pipeline: ${diagnostics.modules.pipeline ? '✅' : '❌'}
- Reports: ${diagnostics.modules.reports ? '✅' : '❌'}

🎯 ESTADO GENERAL: ${allWorking ? '✅ SISTEMA FUNCIONANDO' : '⚠️ REVISAR PROBLEMAS'}

Última sincronización: ${diagnostics.lastSync || 'Nunca'}`;
        
        alert(message);
        return diagnostics;
        
    } catch (error) {
        console.error('❌ Error running diagnostics:', error);
        alert(`❌ Error en diagnóstico: ${error.message}`);
    }
}

// ===== MODULE EXPORTS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleLogout,
        initializeMainApplication,
        switchTab,
        updateStats,
        refreshAllData,
        showNotification,
        getUserDisplayName,
        formatDate,
        formatDateTime,
        getAppStatus,
        testTabSystem,
        runSystemDiagnostics
    };
}

console.log('✅ Core.js module loaded successfully');
