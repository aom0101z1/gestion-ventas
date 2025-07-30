// ===== COMPLETE FIXES FOR CRM REPORTS & MONITORING =====
// This file contains all the fixes needed for the permission errors and missing functionality

// ===== FIX 1: ENHANCED getUserDisplayName FUNCTION =====
async function getUserDisplayNameFirebase(userId) {
    try {
        if (!userId) return 'Usuario Desconocido';
        
        // If it's the current user, get from profile
        if (window.FirebaseData && window.FirebaseData.currentUser && userId === window.FirebaseData.currentUser.uid) {
            const profile = await window.FirebaseData.loadUserProfile();
            return profile ? profile.name : 'Usuario Actual';
        }
        
        // For other users, try to get from Firebase (may fail due to permissions)
        try {
            const allUsers = await window.FirebaseData.getAllUsers();
            const user = allUsers[userId];
            if (user && user.name) return user.name;
            if (user && user.email) return user.email.split('@')[0];
        } catch (error) {
            console.log('⚠️ Cannot access other users data due to permissions');
        }
        
        // Fallback to extracting name from email pattern
        if (userId.includes('@')) {
            return userId.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return 'Usuario Desconocido';
    } catch (error) {
        console.error('❌ Error getting user display name:', error);
        return 'Error Usuario';
    }
}

// ===== FIX 2: ENHANCED loadMonitoringData FUNCTION =====
async function loadMonitoringData() {
    try {
        console.log('👀 Loading monitoring data');
        
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
        
        // Load data
        const allContacts = await window.FirebaseData.getFilteredContacts();
        const today = new Date().toISOString().split('T')[0];
        const todayContacts = allContacts.filter(c => c.date === today);
        
        // Team Overview
        if (teamOverview) {
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
                            <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">
                                ${allContacts.filter(c => c.status === 'Convertido').length}
                            </div>
                            <div style="color: #6b7280;">Conversiones</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Individual Activity - Simplified for permission limitations
        if (individualActivity) {
            individualActivity.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 1.5rem 0;">👥 Actividad del Equipo</h3>
                    <div style="text-align: center; color: #6b7280; padding: 2rem;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">👥</div>
                        <p>Actividad individual disponible solo con permisos extendidos</p>
                        <p>Total de contactos del equipo: <strong>${allContacts.length}</strong></p>
                    </div>
                </div>
            `;
        }
        
        // Recent Activity
        if (recentActivity) {
            const recentContacts = allContacts
                .sort((a, b) => new Date(b.date + ' ' + (b.time || '00:00:00')) - new Date(a.date + ' ' + (a.time || '00:00:00')))
                .slice(0, 10);
            
            recentActivity.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 1.5rem 0;">🕒 Actividad Reciente</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${recentContacts.map(contact => `
                            <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 600;">${contact.name}</div>
                                    <div style="font-size: 0.9rem; color: #6b7280;">📞 ${contact.phone}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 0.8rem; color: #6b7280;">${formatDate(contact.date)}</div>
                                    <div style="font-size: 0.8rem; color: #10b981;">${contact.status}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        showNotification('✅ Datos de monitoreo cargados', 'success', 2000);
        
    } catch (error) {
        console.error('❌ Error loading monitoring data:', error);
        showNotification('❌ Error cargando monitoreo', 'error');
    }
}

// ===== FIX 3: ENHANCED loadDirectorReports FOR RANKING =====
async function loadDirectorReports(contacts) {
    try {
        const salesRankingEl = document.getElementById('salesRanking');
        if (!salesRankingEl) return;
        
        // Simple ranking based on available contact data
        const salespeopleStats = {};
        
        contacts.forEach(contact => {
            const key = contact.salespersonEmail || contact.salesperson || 'Desconocido';
            if (!salespeopleStats[key]) {
                salespeopleStats[key] = {
                    name: key.includes('@') ? key.split('@')[0] : key,
                    email: key,
                    contacts: 0,
                    conversions: 0,
                    todayContacts: 0
                };
            }
            
            salespeopleStats[key].contacts++;
            if (contact.status === 'Convertido') salespeopleStats[key].conversions++;
            if (contact.date === new Date().toISOString().split('T')[0]) salespeopleStats[key].todayContacts++;
        });
        
        const rankings = Object.values(salespeopleStats)
            .sort((a, b) => b.conversions - a.conversions);
        
        salesRankingEl.innerHTML = `
            <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <h4 style="margin: 0 0 1rem 0; color: #374151;">🏆 Ranking de Ventas</h4>
                ${rankings.length === 0 ? `
                    <div style="text-align: center; color: #6b7280; padding: 1rem;">
                        No hay datos de ventas disponibles
                    </div>
                ` : rankings.map((person, index) => `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1rem;
                        margin-bottom: 0.5rem;
                        background: ${index === 0 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 
                                     index === 1 ? 'linear-gradient(135deg, #e5e7eb, #d1d5db)' : 
                                     index === 2 ? 'linear-gradient(135deg, #fecaca, #fca5a5)' : '#f9fafb'};
                        border-radius: 8px;
                        border-left: 4px solid ${index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : index === 2 ? '#ef4444' : '#e5e7eb'};
                    ">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <span style="font-size: 1.2rem;">
                                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                </span>
                                <strong style="color: #374151;">${person.name}</strong>
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280;">${person.email}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #10b981; margin-bottom: 0.25rem;">
                                ${person.conversions} conversiones
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280;">
                                ${person.contacts} contactos
                            </div>
                            <div style="font-size: 0.8rem; color: #3b82f6;">
                                ${person.todayContacts} hoy
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error loading director reports:', error);
        const salesRankingEl = document.getElementById('salesRanking');
        if (salesRankingEl) {
            salesRankingEl.innerHTML = `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h4 style="margin: 0 0 1rem 0; color: #374151;">🏆 Ranking de Ventas</h4>
                    <div style="text-align: center; color: #dc2626; padding: 1rem;">
                        ❌ Error cargando ranking
                    </div>
                </div>
            `;
        }
    }
}

// ===== FIX 4: ENHANCED REPORTS DATA LOADING =====
async function loadReportsData() {
    try {
        console.log('📊 Loading reports data');
        
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            console.log('⚠️ Firebase not available for reports');
            return;
        }
        
        const userProfile = await window.FirebaseData.loadUserProfile();
        const allContacts = await window.FirebaseData.getFilteredContacts();
        
        if (userProfile.role === 'director') {
            await loadDirectorReports(allContacts);
            
            // Show director reports section
            const directorReports = document.getElementById('directorReports');
            const personalReports = document.getElementById('personalReports');
            
            if (directorReports) directorReports.classList.remove('hidden');
            if (personalReports) personalReports.classList.add('hidden');
            
            // Load team performance
            const teamPerformanceEl = document.getElementById('teamPerformance');
            const executiveSummaryEl = document.getElementById('executiveSummary');
            
            if (teamPerformanceEl) {
                const today = new Date().toISOString().split('T')[0];
                const todayContacts = allContacts.filter(c => c.date === today);
                const conversions = allContacts.filter(c => c.status === 'Convertido');
                const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
                
                teamPerformanceEl.innerHTML = `
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <h4 style="margin: 0 0 1rem 0; color: #374151;">👥 Rendimiento del Equipo</h4>
                        <div style="text-align: center; margin-bottom: 1rem;">
                            <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">
                                ${allContacts.length}
                            </div>
                            <div style="color: #6b7280;">Total Leads</div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                            <div>Hoy: <strong>${todayContacts.length}</strong></div>
                            <div>Activos: <strong>${activeLeads.length}</strong></div>
                            <div>Convertidos: <strong>${conversions.length}</strong></div>
                            <div>Tasa: <strong>${allContacts.length > 0 ? ((conversions.length / allContacts.length) * 100).toFixed(1) : 0}%</strong></div>
                        </div>
                    </div>
                `;
            }
            
            if (executiveSummaryEl) {
                // Calculate source breakdown
                const sourcesBreakdown = {};
                allContacts.forEach(contact => {
                    const source = contact.source || 'No especificado';
                    sourcesBreakdown[source] = (sourcesBreakdown[source] || 0) + 1;
                });
                
                const topSource = Object.entries(sourcesBreakdown).sort((a, b) => b[1] - a[1])[0];
                
                executiveSummaryEl.innerHTML = `
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <h4 style="margin: 0 0 1rem 0; color: #374151;">📈 Resumen Ejecutivo</h4>
                        <div style="font-size: 0.9rem; line-height: 1.6;">
                            <div style="margin-bottom: 1rem;">
                                <strong>Estado General:</strong><br>
                                El equipo tiene ${allContacts.length} leads totales con una tasa de conversión del ${allContacts.length > 0 ? ((conversions.length / allContacts.length) * 100).toFixed(1) : 0}%.
                            </div>
                            ${topSource ? `
                                <div style="margin-bottom: 1rem;">
                                    <strong>Mejor Fuente:</strong><br>
                                    ${topSource[0]} con ${topSource[1]} leads.
                                </div>
                            ` : ''}
                            <div>
                                <strong>Recomendación:</strong><br>
                                ${activeLeads.length > 0 ? 
                                    `Seguir con los ${activeLeads.length} leads activos en pipeline.` : 
                                    'Enfocar esfuerzos en generar nuevos leads.'
                                }
                            </div>
                        </div>
                    </div>
                `;
            }
            
        } else {
            await loadPersonalReports(allContacts);
        }
        
        showNotification('✅ Reportes cargados correctamente', 'success', 2000);
        
    } catch (error) {
        console.error('❌ Error loading reports data:', error);
        showNotification('❌ Error cargando reportes', 'error');
    }
}

// ===== FIX 5: PERSONAL REPORTS FUNCTION =====
async function loadPersonalReports(contacts) {
    const weeklyPerformanceEl = document.getElementById('weeklyPerformance');
    const personalTargetsEl = document.getElementById('personalTargets');
    const personalReportsEl = document.getElementById('personalReports');
    const directorReportsEl = document.getElementById('directorReports');
    
    if (personalReportsEl) personalReportsEl.classList.remove('hidden');
    if (directorReportsEl) directorReportsEl.classList.add('hidden');
    
    if (!weeklyPerformanceEl || !personalTargetsEl) return;
    
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const thisWeekContacts = contacts.filter(c => {
        const contactDate = new Date(c.date);
        return contactDate >= weekStart;
    });
    
    const conversions = contacts.filter(c => c.status === 'Convertido');
    const conversionRate = contacts.length > 0 ? (conversions.length / contacts.length * 100).toFixed(1) : 0;
    
    weeklyPerformanceEl.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <h4 style="margin: 0 0 1rem 0; color: #374151;">📈 Rendimiento Semanal</h4>
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Contactos esta semana:</span>
                    <strong>${thisWeekContacts.length}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Total contactos:</span>
                    <strong>${contacts.length}</strong>  
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Conversiones:</span>
                    <strong>${conversions.length}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Tasa de conversión:</span>
                    <strong style="color: #10b981;">${conversionRate}%</strong>
                </div>
            </div>
        </div>
    `;
    
    const dailyGoal = 10;
    const todayContacts = contacts.filter(c => c.date === today.toISOString().split('T')[0]).length;
    const goalProgress = (todayContacts / dailyGoal * 100).toFixed(1);
    
    personalTargetsEl.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <h4 style="margin: 0 0 1rem 0; color: #374151;">🎯 Objetivos Personales</h4>
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Meta diaria:</span>
                    <strong>${dailyGoal} contactos</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Contactos hoy:</span>
                    <strong>${todayContacts}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <span>Progreso:</span>
                    <strong style="color: ${goalProgress >= 100 ? '#10b981' : '#f59e0b'};">${goalProgress}%</strong>
                </div>
                <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="
                        background: ${goalProgress >= 100 ? '#10b981' : '#f59e0b'};
                        height: 8px;
                        width: ${Math.min(goalProgress, 100)}%;
                        transition: width 0.5s ease;
                    "></div>
                </div>
            </div>
        </div>
    `;
}

// ===== FIX 6: DIAGNOSTIC FUNCTION =====
async function runSystemDiagnostic() {
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
                const contacts = await window.FirebaseData.getFilteredContacts();
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
}

// ===== FIX 7: ENHANCED showNotification FUNCTION =====
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

// ===== AUTO-APPLY FIXES ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Applying CRM fixes...');
    
    // Override existing functions with fixed versions
    window.loadMonitoringData = loadMonitoringData;
    window.loadReportsData = loadReportsData;
    window.loadDirectorReports = loadDirectorReports;
    window.loadPersonalReports = loadPersonalReports;
    window.getUserDisplayNameFirebase = getUserDisplayNameFirebase;
    window.runSystemDiagnostic = runSystemDiagnostic;
    window.showNotification = showNotification;
    
    console.log('✅ All CRM fixes applied successfully!');
});

console.log('🔧 CRM Complete Fixes loaded - Reports & Monitoring will work correctly now!');
