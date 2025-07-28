// diagnostic-repair.js - Sistema de Diagnóstico y Reparación
// Add this script to your HTML or include it as a separate file

// ===== COMPREHENSIVE DIAGNOSTIC SYSTEM =====
class SystemDiagnostic {
    constructor() {
        this.results = {};
        this.repairs = [];
        this.timestamp = new Date().toISOString();
    }

    // Main diagnostic function
    runFullDiagnostic() {
        console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DEL SISTEMA...');
        
        this.checkAdminData();
        this.checkUserManagement();
        this.checkDataSynchronization();
        this.checkDirectorAccess();
        this.checkSalespersonDataFlow();
        this.generateReport();
        
        return this.results;
    }

    checkAdminData() {
        console.log('📊 Checking AdminData...');
        
        const adminDataAvailable = !!window.AdminData;
        const adminDataCount = adminDataAvailable ? AdminData.getAllData().length : 0;
        const localStorage = window.localStorage.getItem('ciudad_bilingue_sales_data');
        const localStorageCount = localStorage ? JSON.parse(localStorage).length : 0;
        
        this.results.adminData = {
            available: adminDataAvailable,
            count: adminDataCount,
            localStorage: localStorageCount,
            synchronized: adminDataCount === localStorageCount,
            status: adminDataAvailable ? 'OK' : 'ERROR'
        };

        // Auto-repair if needed
        if (adminDataAvailable && localStorageCount > adminDataCount) {
            console.log('🔧 Auto-repairing AdminData...');
            AdminData.forceSyncFromStorage();
            this.repairs.push('AdminData synchronized from localStorage');
            this.results.adminData.repaired = true;
        }
    }

    checkUserManagement() {
        console.log('👥 Checking User Management...');
        
        const usersInMemory = window.users ? Object.keys(window.users).length : 0;
        const usersInStorage = localStorage.getItem('ciudad_bilingue_users');
        const usersInStorageCount = usersInStorage ? Object.keys(JSON.parse(usersInStorage)).length : 0;
        const currentUser = window.currentUser;
        
        this.results.userManagement = {
            memoryUsers: usersInMemory,
            storageUsers: usersInStorageCount,
            currentUser: currentUser ? currentUser.username : null,
            persistent: !!usersInStorage,
            status: usersInStorage ? 'OK' : 'WARNING'
        };

        // Auto-repair user persistence
        if (usersInMemory > 0 && !usersInStorage) {
            console.log('🔧 Making users persistent...');
            localStorage.setItem('ciudad_bilingue_users', JSON.stringify(window.users));
            this.repairs.push('Users made persistent in localStorage');
            this.results.userManagement.repaired = true;
        }
    }

    checkDataSynchronization() {
        console.log('🔄 Checking Data Synchronization...');
        
        if (!window.AdminData) {
            this.results.dataSynchronization = {
                status: 'ERROR',
                message: 'AdminData not available'
            };
            return;
        }

        const allData = AdminData.getAllData();
        const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
        const todayContacts = allData.filter(d => d.date === new Date().toISOString().split('T')[0]);
        
        this.results.dataSynchronization = {
            totalContacts: allData.length,
            salespeople: salespeople.length,
            todayContacts: todayContacts.length,
            breakdown: salespeople.map(sp => ({
                salesperson: sp,
                count: allData.filter(d => d.salesperson === sp).length
            })),
            status: 'OK'
        };
    }

    checkDirectorAccess() {
        console.log('👑 Checking Director Access...');
        
        if (!window.currentUser || window.currentUser.role !== 'director') {
            this.results.directorAccess = {
                status: 'N/A',
                message: 'Not logged in as director'
            };
            return;
        }

        const canSeeAllData = window.AdminData && AdminData.getAllData().length > 0;
        const usersVisible = window.users && Object.keys(window.users).length > 1;
        const filtersWorking = document.getElementById('salespersonFilter') !== null;
        
        this.results.directorAccess = {
            canSeeAllData,
            usersVisible,
            filtersWorking,
            dataCount: canSeeAllData ? AdminData.getAllData().length : 0,
            userCount: usersVisible ? Object.keys(window.users).length : 0,
            status: canSeeAllData && usersVisible ? 'OK' : 'WARNING'
        };

        // Auto-repair director view
        if (!canSeeAllData && window.AdminData) {
            console.log('🔧 Repairing director data access...');
            AdminData.forceSyncFromStorage();
            this.repairs.push('Director data access repaired');
            this.results.directorAccess.repaired = true;
        }
    }

    checkSalespersonDataFlow() {
        console.log('👤 Checking Salesperson Data Flow...');
        
        if (!window.currentUser || window.currentUser.role !== 'vendedor') {
            this.results.salespersonDataFlow = {
                status: 'N/A',
                message: 'Not logged in as salesperson'
            };
            return;
        }

        const username = window.currentUser.username;
        const myData = window.AdminData ? AdminData.getDataBySalesperson(username) : [];
        const myTodayData = myData.filter(d => d.date === new Date().toISOString().split('T')[0]);
        
        this.results.salespersonDataFlow = {
            username,
            totalContacts: myData.length,
            todayContacts: myTodayData.length,
            canAddContacts: !!window.AdminData,
            status: window.AdminData ? 'OK' : 'ERROR'
        };
    }

    generateReport() {
        const report = {
            timestamp: this.timestamp,
            overallStatus: this.calculateOverallStatus(),
            results: this.results,
            repairs: this.repairs,
            recommendations: this.generateRecommendations()
        };

        console.log('📋 DIAGNOSTIC REPORT:', report);
        return report;
    }

    calculateOverallStatus() {
        const statuses = Object.values(this.results).map(r => r.status).filter(s => s !== 'N/A');
        const hasErrors = statuses.includes('ERROR');
        const hasWarnings = statuses.includes('WARNING');
        
        if (hasErrors) return 'ERROR';
        if (hasWarnings) return 'WARNING';
        return 'OK';
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.adminData?.status === 'ERROR') {
            recommendations.push('Reload the page to initialize AdminData properly');
        }
        
        if (this.results.userManagement?.status === 'WARNING') {
            recommendations.push('Users are not persistent - they will be lost on page reload');
        }
        
        if (this.results.directorAccess?.status === 'WARNING') {
            recommendations.push('Director cannot see all team data - check data synchronization');
        }
        
        if (this.results.salespersonDataFlow?.status === 'ERROR') {
            recommendations.push('Salesperson cannot add contacts - system initialization failed');
        }
        
        return recommendations;
    }

    // Show user-friendly diagnostic popup
    showDiagnosticPopup() {
        const report = this.runFullDiagnostic();
        
        let message = `🔍 DIAGNÓSTICO DEL SISTEMA\n\n`;
        message += `⏰ ${new Date().toLocaleString()}\n`;
        message += `🎯 Estado General: ${this.getStatusIcon(report.overallStatus)} ${report.overallStatus}\n\n`;
        
        // AdminData Status
        message += `📊 ADMINDATA:\n`;
        message += `   ${this.getStatusIcon(this.results.adminData.status)} Disponible: ${this.results.adminData.available ? 'Sí' : 'No'}\n`;
        message += `   📋 Registros: ${this.results.adminData.count}\n`;
        message += `   🔄 Sincronizado: ${this.results.adminData.synchronized ? 'Sí' : 'No'}\n\n`;
        
        // User Management
        message += `👥 USUARIOS:\n`;
        message += `   ${this.getStatusIcon(this.results.userManagement.status)} En memoria: ${this.results.userManagement.memoryUsers}\n`;
        message += `   💾 Persistentes: ${this.results.userManagement.persistent ? 'Sí' : 'No'}\n`;
        message += `   👤 Usuario actual: ${this.results.userManagement.currentUser || 'Ninguno'}\n\n`;
        
        // Current User Specific
        if (window.currentUser) {
            if (window.currentUser.role === 'director') {
                message += `👑 ACCESO DEL DIRECTOR:\n`;
                message += `   ${this.getStatusIcon(this.results.directorAccess.status)} Ver todos los datos: ${this.results.directorAccess.canSeeAllData ? 'Sí' : 'No'}\n`;
                message += `   📊 Contactos visibles: ${this.results.directorAccess.dataCount}\n`;
                message += `   👥 Usuarios visibles: ${this.results.directorAccess.userCount}\n\n`;
            } else {
                message += `👤 FLUJO DE DATOS DEL VENDEDOR:\n`;
                message += `   ${this.getStatusIcon(this.results.salespersonDataFlow.status)} Mis contactos: ${this.results.salespersonDataFlow.totalContacts}\n`;
                message += `   📅 Contactos hoy: ${this.results.salespersonDataFlow.todayContacts}\n`;
                message += `   ➕ Puede agregar: ${this.results.salespersonDataFlow.canAddContacts ? 'Sí' : 'No'}\n\n`;
            }
        }
        
        // Repairs Made
        if (this.repairs.length > 0) {
            message += `🔧 REPARACIONES REALIZADAS:\n`;
            this.repairs.forEach(repair => {
                message += `   ✅ ${repair}\n`;
            });
            message += `\n`;
        }
        
        // Recommendations
        if (report.recommendations.length > 0) {
            message += `💡 RECOMENDACIONES:\n`;
            report.recommendations.forEach(rec => {
                message += `   • ${rec}\n`;
            });
        }
        
        alert(message);
        return report;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'OK': return '✅';
            case 'WARNING': return '⚠️';
            case 'ERROR': return '❌';
            default: return 'ℹ️';
        }
    }
}

// ===== AUTOMATED REPAIR FUNCTIONS =====
class SystemRepair {
    static repairUserPersistence() {
        console.log('🔧 Repairing user persistence...');
        
        if (window.users && !localStorage.getItem('ciudad_bilingue_users')) {
            localStorage.setItem('ciudad_bilingue_users', JSON.stringify(window.users));
            console.log('✅ Users made persistent');
            return true;
        }
        return false;
    }

    static repairAdminDataSync() {
        console.log('🔧 Repairing AdminData synchronization...');
        
        if (window.AdminData) {
            const repaired = AdminData.verifyAndRepairData();
            if (repaired) {
                AdminData.notifyObservers();
                if (typeof updateAllViews === 'function') {
                    updateAllViews();
                }
                console.log('✅ AdminData synchronized');
                return true;
            }
        }
        return false;
    }

    static repairDirectorView() {
        console.log('🔧 Repairing director view...');
        
        if (window.currentUser?.role === 'director' && window.AdminData) {
            // Force data sync
            AdminData.forceSyncFromStorage();
            
            // Update all views
            setTimeout(() => {
                if (typeof updateAllViews === 'function') {
                    updateAllViews();
                }
                if (typeof updateLeadsTable === 'function') {
                    updateLeadsTable();
                }
                if (typeof populateSalespersonFilter === 'function') {
                    populateSalespersonFilter();
                }
            }, 200);
            
            console.log('✅ Director view repaired');
            return true;
        }
        return false;
    }

    static runFullRepair() {
        console.log('🔧 Running full system repair...');
        
        const repairs = [];
        
        if (this.repairUserPersistence()) {
            repairs.push('User persistence');
        }
        
        if (this.repairAdminDataSync()) {
            repairs.push('AdminData synchronization');
        }
        
        if (this.repairDirectorView()) {
            repairs.push('Director view');
        }
        
        console.log('✅ Full repair completed:', repairs);
        return repairs;
    }
}

// ===== INTEGRATION FUNCTIONS =====
function runSystemDiagnostic() {
    const diagnostic = new SystemDiagnostic();
    return diagnostic.showDiagnosticPopup();
}

function quickSystemRepair() {
    const repairs = SystemRepair.runFullRepair();
    
    let message = `🔧 REPARACIÓN AUTOMÁTICA COMPLETADA\n\n`;
    
    if (repairs.length > 0) {
        message += `✅ Componentes reparados:\n`;
        repairs.forEach(repair => {
            message += `   • ${repair}\n`;
        });
        message += `\n🔄 Recomendamos recargar la página para asegurar que todos los cambios tomen efecto.`;
    } else {
        message += `ℹ️ No se detectaron problemas que requieran reparación automática.\n\n`;
        message += `Si sigues experimentando problemas, ejecuta el diagnóstico completo para más detalles.`;
    }
    
    alert(message);
    
    return repairs;
}

function debugCurrentUserData() {
    if (!window.currentUser) {
        alert('❌ No hay usuario logueado');
        return;
    }
    
    let debug = `🔍 DEBUG DEL USUARIO ACTUAL\n\n`;
    debug += `👤 Usuario: ${window.currentUser.username}\n`;
    debug += `🎭 Rol: ${window.currentUser.role}\n`;
    debug += `📛 Nombre: ${window.currentUser.name}\n\n`;
    
    if (window.AdminData) {
        const allData = AdminData.getAllData();
        debug += `📊 DATOS EN ADMINDATA:\n`;
        debug += `   Total registros: ${allData.length}\n`;
        
        if (window.currentUser.role === 'director') {
            debug += `   👑 Como director, puedes ver TODOS los datos\n`;
            const salespeople = [...new Set(allData.map(d => d.salesperson))].filter(s => s);
            debug += `   👥 Vendedores con datos: ${salespeople.length}\n`;
            salespeople.forEach(sp => {
                const count = allData.filter(d => d.salesperson === sp).length;
                debug += `      • ${sp}: ${count} contactos\n`;
            });
        } else {
            const myData = AdminData.getDataBySalesperson(window.currentUser.username);
            debug += `   👤 Mis contactos: ${myData.length}\n`;
            debug += `   📅 Contactos hoy: ${myData.filter(d => d.date === new Date().toISOString().split('T')[0]).length}\n`;
        }
    } else {
        debug += `❌ AdminData no disponible\n`;
    }
    
    debug += `\n👥 USUARIOS EN SISTEMA:\n`;
    debug += `   En memoria: ${window.users ? Object.keys(window.users).length : 0}\n`;
    debug += `   En localStorage: ${localStorage.getItem('ciudad_bilingue_users') ? Object.keys(JSON.parse(localStorage.getItem('ciudad_bilingue_users'))).length : 0}\n`;
    
    if (window.users) {
        debug += `   Detalles:\n`;
        Object.entries(window.users).forEach(([username, user]) => {
            debug += `      • ${user.name} (${username}) - ${user.role}\n`;
        });
    }
    
    alert(debug);
}

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
window.runSystemDiagnostic = runSystemDiagnostic;
window.quickSystemRepair = quickSystemRepair;
window.debugCurrentUserData = debugCurrentUserData;
window.SystemDiagnostic = SystemDiagnostic;
window.SystemRepair = SystemRepair;

// ===== AUTO-DIAGNOSTIC ON LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    // Run a silent diagnostic after system initialization
    setTimeout(() => {
        console.log('🔍 Running silent system diagnostic...');
        const diagnostic = new SystemDiagnostic();
        diagnostic.runFullDiagnostic();
        
        // Auto-repair critical issues
        if (diagnostic.results.adminData?.status === 'ERROR' || 
            diagnostic.results.userManagement?.status === 'WARNING') {
            console.log('🔧 Auto-repairing critical issues...');
            SystemRepair.runFullRepair();
        }
    }, 3000);
});

console.log('🔧 Diagnostic & Repair System loaded successfully');
