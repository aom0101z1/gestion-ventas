// ===================================================================
// CORE.JS - Funcionalidades Base del Sistema
// ===================================================================

// ===================================================================
// MÓDULO DE APLICACIÓN PRINCIPAL
// ===================================================================
const App = {
    currentUser: null,
    allData: [],
    isConnected: false,

    init() {
        console.log('🚀 Iniciando Sistema de Ventas...');
        
        // Verificar si hay sesión activa
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showMainApp();
        }
        
        // Auto-refresh cada 30 segundos
        setInterval(() => {
            if (this.isConnected && document.visibilityState === 'visible') {
                Sales.refreshData();
            }
        }, 30000);
    },

    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Configurar interfaz según rol
        Auth.setupUserInterface();
        
        // Si hay configuración de sheet, conectar
        const sheetConfig = Sheets.getConfig();
        if (sheetConfig.id) {
            Sheets.connect();
        }
    },

    setCurrentUser(user) {
        this.currentUser = user;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    setData(data) {
        this.allData = data;
    },

    getData() {
        return this.allData;
    },

    setConnected(status) {
        this.isConnected = status;
    },

    isSystemConnected() {
        return this.isConnected;
    }
};

// ===================================================================
// MÓDULO DE AUTENTICACIÓN
// ===================================================================
const Auth = {
    users: {
        'director': { password: 'admin123', role: 'director', name: 'Director General' },
        'maria.garcia': { password: 'maria123', role: 'vendedor', name: 'María García' },
        'juan.perez': { password: 'juan123', role: 'vendedor', name: 'Juan Pérez' }
    },

    login(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (this.users[username] && this.users[username].password === password) {
            const currentUser = {
                username: username,
                ...this.users[username]
            };
            
            App.setCurrentUser(currentUser);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('loginError').classList.add('hidden');
            App.showMainApp();
        } else {
            document.getElementById('loginError').classList.remove('hidden');
        }
    },

    logout() {
        localStorage.removeItem('currentUser');
        location.reload();
    },

    setupUserInterface() {
        const currentUser = App.getCurrentUser();
        document.getElementById('currentUserName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = `(${currentUser.role === 'director' ? 'Director' : 'Vendedor'})`;
        
        if (currentUser.role === 'director') {
            // Mostrar configuraciones de director
            document.getElementById('directorConfig').classList.remove('hidden');
            document.getElementById('reportsTab').textContent = '📊 Dashboard Ejecutivo';
            document.getElementById('reportsTitle').textContent = '📊 Dashboard Ejecutivo';
            
            // Cargar configuración guardada
            const sheetConfig = Sheets.getConfig();
            if (sheetConfig.id) {
                document.getElementById('sheetId').value = sheetConfig.id;
                document.getElementById('sheetName').value = sheetConfig.name;
            }
            
            Sales.updateUsersList();
            Sales.updateConveniosList();
        } else {
            // Vista de vendedor - ocultar configuraciones
            document.getElementById('directorConfig').classList.add('hidden');
            document.getElementById('reportsTab').textContent = '📊 Mi Dashboard';
            document.getElementById('reportsTitle').textContent = '📊 Mi Dashboard Personal';
        }
        
        // Cargar convenios en el select
        Sales.loadConveniosInSelect();
    },

    getUsers() {
        return this.users;
    },

    addUser(username, password, role, name) {
        this.users[username] = { password, role, name };
    },

    deleteUser(username) {
        delete this.users[username];
    }
};

// ===================================================================
// MÓDULO DE GOOGLE SHEETS
// ===================================================================
const Sheets = {
    config: {
        id: localStorage.getItem('sheetId') || '',
        name: localStorage.getItem('sheetName') || 'Hoja1'
    },

    getConfig() {
        return this.config;
    },

    configure() {
        const currentUser = App.getCurrentUser();
        if (currentUser.role !== 'director') {
            alert('❌ Solo el director puede configurar el sistema');
            return;
        }
        
        const sheetId = document.getElementById('sheetId').value.trim();
        const sheetName = document.getElementById('sheetName').value.trim();
        
        if (!sheetId) {
            alert('⚠️ Por favor ingresa el ID del Google Sheet');
            return;
        }

        this.config.id = sheetId;
        this.config.name = sheetName;
        
        localStorage.setItem('sheetId', sheetId);
        localStorage.setItem('sheetName', sheetName);
        
        document.getElementById('configResult').innerHTML = '<div class="success-message">✅ Configuración guardada. Conectando...</div>';
        
        setTimeout(() => {
            this.connect();
        }, 1000);
    },

    async connect() {
        try {
            if (!this.config.id) {
                document.getElementById('connectionStatus').textContent = '🔴 Sin Configurar';
                document.getElementById('connectionStatus').className = 'connection-status disconnected';
                return;
            }

            const url = `https://docs.google.com/spreadsheets/d/${this.config.id}/gviz/tq?tqx=out:json&sheet=${this.config.name}`;
            const response = await fetch(url);
            const text = await response.text();
            
            const jsonData = text.substring(47).slice(0, -2);
            const data = JSON.parse(jsonData);
            
            if (data.table && data.table.rows) {
                App.setConnected(true);
                document.getElementById('connectionStatus').textContent = '🟢 Conectado';
                document.getElementById('connectionStatus').className = 'connection-status connected';
                this.parseData(data.table.rows);
            } else {
                throw new Error('No se pudo leer el Google Sheet');
            }
        } catch (error) {
            console.error('Error conectando con Google Sheets:', error);
            App.setConnected(false);
            document.getElementById('connectionStatus').textContent = '🔴 Error de Conexión';
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            
            const currentUser = App.getCurrentUser();
            if (currentUser && currentUser.role === 'director') {
                alert('⚠️ Error conectando con Google Sheets. Verifica la configuración.');
            }
        }
    },

    parseData(rows) {
        const allData = [];
        rows.forEach((row, index) => {
            if (index === 0 || !row.c || !row.c[1]) return;
            
            const contact = {
                id: row.c[0] ? row.c[0].v : '',
                name: row.c[1] ? row.c[1].v : '',
                phone: row.c[2] ? row.c[2].v : '',
                email: row.c[3] ? row.c[3].v : '',
                source: row.c[4] ? row.c[4].v : '',
                location: row.c[5] ? row.c[5].v : '',
                notes: row.c[6] ? row.c[6].v : '',
                salesperson: row.c[7] ? row.c[7].v : '',
                date: row.c[8] ? row.c[8].v : '',
                time: row.c[9] ? row.c[9].v : '',
                status: row.c[10] ? row.c[10].v : 'Nuevo'
            };
            allData.push(contact);
        });
        
        App.setData(allData);
        Sales.updateAllViews();
        Pipeline.refresh();
    }
};

// ===================================================================
// MÓDULO DE UTILIDADES
// ===================================================================
const Utils = {
    showTab(tabName) {
        // Ocultar todos los contenidos de tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Desactivar todos los botones de tabs
        document.querySelectorAll('.tab').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar el tab seleccionado
        document.getElementById(tabName).classList.remove('hidden');
        event.target.classList.add('active');
        
        // Refrescar pipeline si es necesario
        if (tabName === 'pipeline') {
            Pipeline.refresh();
        }
    },

    formatDate(date) {
        return new Date(date).toLocaleDateString('es-CO');
    },

    formatTime(time) {
        return new Date(`1970-01-01T${time}`).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getUserDisplayName(username) {
        const users = Auth.getUsers();
        return users[username] ? users[username].name : username;
    },

    generateId() {
        return Date.now();
    },

    showAlert(message, type = 'info') {
        alert(message);
    },

    showSuccess(message) {
        this.showAlert(`✅ ${message}`);
    },

    showError(message) {
        this.showAlert(`❌ ${message}`);
    },

    showWarning(message) {
        this.showAlert(`⚠️ ${message}`);
    }
};

// ===================================================================
// INICIALIZACIÓN
// ===================================================================
console.log('✅ Core.js cargado correctamente');