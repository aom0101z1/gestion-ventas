// Fix for Monitoring Tab - Override the loadMonitoringData function
window.loadMonitoringData = async function() {
    try {
        console.log('👀 Loading monitoring data (fixed version)');
        
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
        
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (userProfile.role !== 'director') {
            const warningMsg = '<div style="text-align: center; color: #f59e0b; padding: 2rem;">⚠️ Solo directores pueden ver el monitoreo</div>';
            if (teamOverview) teamOverview.innerHTML = warningMsg;
            if (individualActivity) individualActivity.innerHTML = warningMsg;
            if (recentActivity) recentActivity.innerHTML = warningMsg;
            return;
        }
        
        // Get data
        const [allUsers, allContacts] = await Promise.all([
            window.FirebaseData.getAllUsers(),
            window.FirebaseData.getAllContacts()
        ]);
        
        const today = new Date().toISOString().split('T')[0];
        const todayContacts = allContacts.filter(c => c.date === today);
        const salespeople = Object.entries(allUsers).filter(([uid, user]) => user.role === 'vendedor');
        
        // Team Overview
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
        
        // Individual Activity
        if (individualActivity) {
            const salespeopleStats = salespeople.map(([uid, user]) => {
                const userContacts = allContacts.filter(c => c.salespersonId === uid);
                const userTodayContacts = userContacts.filter(c => c.date === today);
                const userConversions = userContacts.filter(c => c.status === 'Convertido');
                
                return {
                    name: user.name || user.email.split('@')[0],
                    email: user.email,
                    totalContacts: userContacts.length,
                    todayContacts: userTodayContacts.length,
                    conversions: userConversions.length,
                    conversionRate: userContacts.length > 0 ? (userConversions.length / userContacts.length * 100).toFixed(1) : 0
                };
            }).sort((a, b) => b.todayContacts - a.todayContacts);
            
            individualActivity.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 1.5rem 0;">👥 Actividad Individual</h3>
                    ${salespeopleStats.length === 0 ? `
                        <div style="text-align: center; color: #6b7280; padding: 2rem;">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">👥</div>
                            <p>No hay vendedores registrados</p>
                        </div>
                    ` : `
                        <div style="display: grid; gap: 1rem;">
                            ${salespeopleStats.map((person, index) => `
                                <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: ${index === 0 ? '#f0f9ff' : '#f9fafb'};">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <h4 style="margin: 0 0 0.25rem 0;">${person.name} ${index === 0 ? '🏆' : ''}</h4>
                                            <div style="font-size: 0.9rem; color: #6b7280;">${person.email}</div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: bold; color: #3b82f6;">${person.todayContacts} hoy</div>
                                            <div style="font-size: 0.9rem; color: #6b7280;">${person.totalContacts} total</div>
                                        </div>
                                    </div>
                                    <div style="margin-top: 0.5rem; font-size: 0.9rem;">
                                        <span style="color: #10b981;">✅ ${person.conversions} conversiones</span>
                                        <span style="margin-left: 1rem; color: #f59e0b;">📊 ${person.conversionRate}% tasa</span>
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
                .sort((a, b) => {
                    const dateA = new Date(a.date + ' ' + (a.time || '00:00:00'));
                    const dateB = new Date(b.date + ' ' + (b.time || '00:00:00'));
                    return dateB - dateA;
                })
                .slice(0, 10);
            
            recentActivity.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 1.5rem 0;">🕒 Actividad Reciente del Equipo</h3>
                    ${recentContacts.length === 0 ? `
                        <div style="text-align: center; color: #6b7280; padding: 2rem;">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">📝</div>
                            <p>No hay actividad reciente</p>
                        </div>
                    ` : `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${recentContacts.map((contact, index) => {
                                const salesperson = salespeople.find(([uid]) => uid === contact.salespersonId);
                                const salespersonName = salesperson ? salesperson[1].name || salesperson[1].email.split('@')[0] : 'Vendedor';
                                
                                return `
                                    <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div style="font-weight: 600;">${contact.name}</div>
                                            <div style="font-size: 0.9rem; color: #6b7280;">📞 ${contact.phone}</div>
                                            <div style="font-size: 0.8rem; color: #8b5cf6;">👤 ${salespersonName}</div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 0.8rem; color: #6b7280;">${formatDate(contact.date)}</div>
                                            <span class="status-badge status-${(contact.status || 'nuevo').toLowerCase().replace(' ', '').replace('ó', 'o')}" style="font-size: 0.8rem;">
                                                ${contact.status || 'Nuevo'}
                                            </span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        }
        
        console.log('✅ Monitoring data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading monitoring data:', error);
        showNotification('❌ Error cargando monitoreo: ' + error.message, 'error');
    }
};

// Fix for missing parts of Reports
window.loadDirectorReports = async function(contacts) {
    try {
        const teamPerformanceEl = document.getElementById('teamPerformance');
        const salesRankingEl = document.getElementById('salesRanking');
        const executiveSummaryEl = document.getElementById('executiveSummary');
        const directorReportsEl = document.getElementById('directorReports');
        const personalReportsEl = document.getElementById('personalReports');
        
        if (directorReportsEl) directorReportsEl.classList.remove('hidden');
        if (personalReportsEl) personalReportsEl.classList.add('hidden');
        
        const allUsers = await window.FirebaseData.getAllUsers();
        const salespeople = Object.entries(allUsers).filter(([uid, user]) => user.role === 'vendedor');
        
        // Team Performance
        if (teamPerformanceEl) {
            const today = new Date().toISOString().split('T')[0];
            const todayContacts = contacts.filter(c => c.date === today);
            const conversions = contacts.filter(c => c.status === 'Convertido');
            const activeLeads = contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
            
            teamPerformanceEl.innerHTML = `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h4 style="margin: 0 0 1rem 0; color: #374151;">👥 Rendimiento del Equipo</h4>
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">
                            ${contacts.length}
                        </div>
                        <div style="color: #6b7280;">Total Leads</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                        <div>Hoy: <strong>${todayContacts.length}</strong></div>
                        <div>Activos: <strong>${activeLeads.length}</strong></div>
                        <div>Convertidos: <strong>${conversions.length}</strong></div>
                        <div>Tasa: <strong>${contacts.length > 0 ? ((conversions.length / contacts.length) * 100).toFixed(1) : 0}%</strong></div>
                    </div>
                </div>
            `;
        }
        
        // Executive Summary
        if (executiveSummaryEl) {
            const sourcesBreakdown = {};
            contacts.forEach(contact => {
                const source = contact.source || 'No especificado';
                sourcesBreakdown[source] = (sourcesBreakdown[source] || 0) + 1;
            });
            
            const topSource = Object.entries(sourcesBreakdown).sort((a, b) => b[1] - a[1])[0];
            const conversions = contacts.filter(c => c.status === 'Convertido');
            const activeLeads = contacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
            
            executiveSummaryEl.innerHTML = `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h4 style="margin: 0 0 1rem 0; color: #374151;">📈 Resumen Ejecutivo</h4>
                    <div style="font-size: 0.9rem; line-height: 1.6;">
                        <div style="margin-bottom: 1rem;">
                            <strong>Estado General:</strong><br>
                            El equipo tiene ${contacts.length} leads totales con una tasa de conversión del ${contacts.length > 0 ? ((conversions.length / contacts.length) * 100).toFixed(1) : 0}%.
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
        
        console.log('✅ Director reports loaded completely');
        
    } catch (error) {
        console.error('❌ Error loading director reports:', error);
    }
};

// Auto-call monitoring when tab is clicked
const monitoringTab = document.getElementById('monitoringTab');
if (monitoringTab) {
    monitoringTab.addEventListener('click', () => {
        setTimeout(loadMonitoringData, 100);
    });
}

// Call monitoring if already on that tab
if (document.getElementById('monitoring') && !document.getElementById('monitoring').classList.contains('hidden')) {
    setTimeout(loadMonitoringData, 500);
}
