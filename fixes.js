// fixes.js - SIMPLIFIED VERSION - Works with existing Firebase rules
console.log('🔧 Loading simplified fixes...');

// Wait for the main system to be ready
function waitForMainSystem() {
    return new Promise((resolve) => {
        const checkReady = () => {
            if (window.FirebaseData && document.querySelector('.tab')) {
                resolve();
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

// Initialize fixes when system is ready
waitForMainSystem().then(() => {
    console.log('✅ Main system ready, applying simplified fixes...');
    
    // Fix 1: showNotification function
    window.showNotification = function(message, type = 'info', duration = 5000) {
        console.log('📢 Notification:', message, type);
        
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
    };

    // Fix 2: getUserDisplayNameFirebase function
    window.getUserDisplayNameFirebase = async function(userId) {
        try {
            if (!userId) return 'Usuario Desconocido';
            
            // If it's the current user, get from profile
            if (window.FirebaseData && window.FirebaseData.currentUser && userId === window.FirebaseData.currentUser.uid) {
                const profile = await window.FirebaseData.loadUserProfile();
                return profile ? profile.name : 'Usuario Actual';
            }
            
            // For other users, don't try to access Firebase (causes permission errors)
            // Instead, extract from email if it's an email format
            if (userId && userId.includes('@')) {
                return userId.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
            
            return 'Usuario Desconocido';
        } catch (error) {
            console.error('❌ Error getting user display name:', error);
            return 'Error Usuario';
        }
    };

    // Fix 3: SIMPLIFIED loadMonitoringData function (works with existing permissions)
    window.loadMonitoringData = async function() {
        try {
            console.log('👀 Loading monitoring data (simplified)');
            
            const teamOverview = document.getElementById('teamActivityOverview');
            const individualActivity = document.getElementById('individualSalespeopleActivity');
            const recentActivity = document.getElementById('recentTeamActivity');
            
            if (!window.FirebaseData || !window.FirebaseData.currentUser) {
                const errorMsg = '<div style="text-align: center; color: #dc2626; padding: 2rem;">❌ Firebase no disponible</div>';
                if (teamOverview) teamOverview.innerHTML = errorMsg;
                if (individualActivity) individualActivity.innerHTML = errorMsg;
                if (recentActivity) recentActivity.innerHTML = errorMsg;
                return;
            }
            
            // Check if user is director
            const userProfile = await window.FirebaseData.loadUserProfile();
            if (userProfile.role !== 'director') {
                const warningMsg = '<div style="text-align: center; color: #f59e0b; padding: 2rem;">⚠️ Solo directores pueden ver el monitoreo</div>';
                if (teamOverview) teamOverview.innerHTML = warningMsg;
                if (individualActivity) individualActivity.innerHTML = warningMsg;
                if (recentActivity) recentActivity.innerHTML = warningMsg;
                return;
            }
            
            // Load data (using only what we have permission for)
            const allContacts = await window.FirebaseData.getAllContacts(); // This works with current permissions
            const today = new Date().toISOString().split('T')[0];
            const todayContacts = allContacts.filter(c => c.date === today);
            
            // Team Overview - using contact data only
            if (teamOverview) {
                const conversions = allContacts.filter(c => c.status === 'Convertido');
                const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
                
                teamOverview.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0;">📊 Vista General del Equipo</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <div style="text-align: center; padding: 1rem; background: #f0f9ff; border-radius: 8px;">
                                <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${allContacts.length}</div>
                                <div style="color: #6b7280;">Total Leads</div>
                            </div>
                            <div style="text-align: center; padding: 1rem; background: #f0fdf4; border-radius: 8px;">
                                <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${todayContacts.length}</div>
                                <div style="color: #6b7280;">Contactos Hoy</div>
                            </div>
                            <div style="text-align: center; padding: 1rem; background: #fefce8; border-radius: 8px;">
                                <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${conversions.length}</div>
                                <div style="color: #6b7280;">Conversiones</div>
                            </div>
                            <div style="text-align: center; padding: 1rem; background: #f3e8ff; border-radius: 8px;">
                                <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${activeLeads.length}</div>
                                <div style="color: #6b7280;">Leads Activos</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Individual Activity - using contact data to infer salespeople
            if (individualActivity) {
                // Get unique salespeople from contacts
                const salespeopleData = {};
                allContacts.forEach(contact => {
                    const key = contact.salespersonEmail || contact.salespersonId || 'Desconocido';
                    const name = contact.salespersonEmail ? contact.salespersonEmail.split('@')[0] : 'Vendedor';
                    
                    if (!salespeopleData[key]) {
                        salespeopleData[key] = {
                            name: name,
                            email: contact.salespersonEmail || key,
                            totalContacts: 0,
                            todayContacts: 0,
                            conversions: 0
                        };
                    }
                    
                    salespeopleData[key].totalContacts++;
                    if (contact.date === today) salespeopleData[key].todayContacts++;
                    if (contact.status === 'Convertido') salespeopleData[key].conversions++;
                });
                
                const salespeople = Object.values(salespeopleData);
                
                individualActivity.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0;">👥 Actividad Individual del Equipo</h3>
                        ${salespeople.length === 0 ? `
                            <div style="text-align: center; color: #6b7280; padding: 2rem;">
                                <div style="font-size: 2rem; margin-bottom: 1rem;">👥</div>
                                <p>No hay datos de vendedores disponibles</p>
                            </div>
                        ` : `
                            <div style="display: grid; gap: 1rem;">
                                ${salespeople.map(person => `
                                    <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <h4 style="margin: 0 0 0.25rem 0; text-transform: capitalize;">${person.name}</h4>
                                                <div style="font-size: 0.9rem; color: #6b7280;">${person.email}</div>
                                            </div>
                                            <div style="text-align: right;">
                                                <div style="font-weight: bold; color: #3b82f6;">${person.todayContacts} hoy</div>
                                                <div style="font-size: 0.9rem; color: #6b7280;">${person.totalContacts} total</div>
                                            </div>
                                        </div>
                                        <div style="margin-top: 0.5rem; font-size: 0.9rem;">
                                            <span style="color: #10b981;">✅ ${person.conversions} conversiones</span>
                                            <span style="margin-left: 1rem; color: #f59e0b;">📊 ${person.totalContacts > 0 ? ((person.conversions / person.totalContacts) * 100).toFixed(1) : 0}% tasa</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                `;
            }
            
            // Recent Activity
            if (recentActivity) {
                const recentContacts = allContacts
                    .sort((a, b) => new Date(b.date + ' ' + (b.time || '00:00:00')) - new Date(a.date + ' ' + (a.time || '00:00:00')))
                    .slice(0, 15);
                
                recentActivity.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0;">🕒 Actividad Reciente del Equipo</h3>
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${recentContacts.length === 0 ? `
                                <div style="text-align: center; color: #6b7280; padding: 2rem;">
                                    <div style="font-size: 2rem; margin-bottom: 1rem;">📝</div>
                                    <p>No hay actividad reciente</p>
                                </div>
                            ` : recentContacts.map(contact => `
                                <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600;">${contact.name}</div>
                                        <div style="font-size: 0.9rem; color: #6b7280;">📞 ${contact.phone}</div>
                                        <div style="font-size: 0.8rem; color: #8b5cf6;">👤 ${contact.salespersonEmail ? contact.salespersonEmail.split('@')[0] : 'Vendedor'}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 0.8rem; color: #6b7280;">${formatDate(contact.date)}</div>
                                        <span class="status-badge status-${(contact.status || 'nuevo').toLowerCase().replace(' ', '').replace('ó', 'o')}" style="font-size: 0.8rem;">
                                            ${contact.status || 'Nuevo'}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            showNotification('✅ Monitoreo cargado correctamente', 'success', 2000);
            
        } catch (error) {
            console.error('❌ Error loading monitoring data:', error);
            showNotification('❌ Error cargando monitoreo', 'error');
            
            // Show error in containers
            const containers = ['teamActivityOverview', 'individualSalespeopleActivity', 'recentTeamActivity'];
            containers.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = `
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; color: #dc2626;">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                            <h3>Error en Monitoreo</h3>
                            <p>Error: ${error.message}</p>
                            <button onclick="loadMonitoringData()" class="btn btn-primary" style="margin-top: 1rem;">🔄 Reintentar</button>
                        </div>
                    `;
                }
            });
        }
    };

    // Fix 4: Enhanced showLeadDetails function
    window.showLeadDetails = async function(leadId) {
        try {
            console.log('📋 Showing lead details for:', leadId);
            
            if (!window.FirebaseData) {
                showNotification('❌ Sistema no disponible', 'error');
                return;
            }
            
            // Get lead data
            const allContacts = await window.FirebaseData.getAllContacts();
            const lead = allContacts.find(c => c.id === leadId);
            
            if (!lead) {
                showNotification('❌ Lead no encontrado', 'error');
                return;
            }
            
            // Get salesperson name (simplified)
            const salespersonName = lead.salespersonEmail ? 
                lead.salespersonEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                'Vendedor Desconocido';
            
            // Show details
            const details = `📋 DETALLES DEL LEAD:

👤 Nombre: ${lead.name}
📞 Teléfono: ${lead.phone}
✉️ Email: ${lead.email || 'No proporcionado'}
📍 Ubicación: ${lead.location}
🔗 Fuente: ${lead.source}
📊 Estado: ${lead.status}
🗓️ Fecha: ${formatDate(lead.date)}
👨‍💼 Vendedor: ${salespersonName}

📝 Notas:
${lead.notes || 'Sin notas'}`;
            
            alert(details);
            
        } catch (error) {
            console.error('❌ Error showing lead details:', error);
            showNotification('❌ Error al mostrar detalles', 'error');
        }
    };

    // Fix 5: runSystemDiagnostic function
    window.runSystemDiagnostic = async function() {
        try {
            const diagnostics = {
                timestamp: new Date().toISOString(),
                firebase: !!window.FirebaseData,
                authenticated: !!window.FirebaseData?.currentUser,
                userProfile: !!currentUser,
                totalContacts: 0
            };
            
            if (window.FirebaseData) {
                try {
                    const contacts = await window.FirebaseData.getAllContacts();
                    diagnostics.totalContacts = contacts.length;
                } catch (error) {
                    diagnostics.dataError = error.message;
                }
            }
            
            const report = `🔍 DIAGNÓSTICO DEL SISTEMA:

🔥 Firebase: ${diagnostics.firebase ? '✅' : '❌'}
👤 Autenticado: ${diagnostics.authenticated ? '✅' : '❌'}
📊 Total Contactos: ${diagnostics.totalContacts}
⏰ ${new Date().toLocaleString()}

${diagnostics.dataError ? `❌ Error: ${diagnostics.dataError}` : '✅ Sistema funcionando'}`;
            
            alert(report);
            showNotification('✅ Diagnóstico completado', 'success');
            
        } catch (error) {
            console.error('❌ Error running diagnostics:', error);
            showNotification('❌ Error en diagnóstico', 'error');
        }
    };

    console.log('✅ All simplified fixes applied successfully!');
    showNotification('🔧 Sistema reparado correctamente', 'success', 3000);
});

console.log('✅ Simplified fixes.js loaded');
