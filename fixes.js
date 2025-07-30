// fixes.js - COMPLETE FIX
console.log('🔧 Loading complete fixes...');

// Wait for system to be ready
function waitForSystem() {
    return new Promise((resolve) => {
        const checkReady = () => {
            if (window.FirebaseData && 
                typeof switchTab === 'function' && 
                document.getElementById('monitoringTab')) {
                resolve();
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

// Apply fixes after system is ready
waitForSystem().then(() => {
    console.log('✅ System ready, applying fixes...');
    
    // Fix 1: Override switchTab to handle monitoring and reports
    const originalSwitchTab = window.switchTab;
    window.switchTab = function(tabName) {
        console.log('📑 Enhanced switchTab:', tabName);
        
        // Call original function
        originalSwitchTab(tabName);
        
        // Handle specific tabs
        setTimeout(() => {
            if (tabName === 'monitoring') {
                loadMonitoringDataFixed();
            } else if (tabName === 'reports') {
                loadReportsDataFixed();
            }
        }, 100);
    };

    // Fix 2: Complete monitoring data loader
    window.loadMonitoringDataFixed = async function() {
        console.log('👀 Loading monitoring data FIXED');
        
        try {
            // Check Firebase
            if (!window.FirebaseData || !window.FirebaseData.currentUser) {
                console.error('Firebase not available');
                return;
            }
            
            // Check if director
            const userProfile = await window.FirebaseData.loadUserProfile();
            if (!userProfile || userProfile.role !== 'director') {
                console.log('Not a director');
                return;
            }
            
            // Get data
            console.log('Getting all users and contacts...');
            const allUsers = await window.FirebaseData.getAllUsers();
            const allContacts = await window.FirebaseData.getAllContacts();
            
            console.log('Users found:', Object.keys(allUsers).length);
            console.log('Contacts found:', allContacts.length);
            
            const today = new Date().toISOString().split('T')[0];
            const todayContacts = allContacts.filter(c => c.date === today);
            const conversions = allContacts.filter(c => c.status === 'Convertido');
            const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
            
            // Update Team Overview
            const teamOverview = document.getElementById('teamActivityOverview');
            if (teamOverview) {
                console.log('Updating team overview...');
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
            
            // Update Individual Activity
            const individualActivity = document.getElementById('individualSalespeopleActivity');
            if (individualActivity) {
                console.log('Updating individual activity...');
                const salespeople = Object.entries(allUsers).filter(([uid, user]) => user.role === 'vendedor');
                
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
                    </div>
                `;
            }
            
            // Update Recent Activity
            const recentActivity = document.getElementById('recentTeamActivity');
            if (recentActivity) {
                console.log('Updating recent activity...');
                const recentContacts = allContacts
                    .sort((a, b) => new Date(b.date + ' ' + (b.time || '00:00:00')) - new Date(a.date + ' ' + (a.time || '00:00:00')))
                    .slice(0, 10);
                
                recentActivity.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <h3 style="margin: 0 0 1.5rem 0;">🕒 Actividad Reciente del Equipo</h3>
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${recentContacts.map(contact => `
                                <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                                    <div style="font-weight: 600;">${contact.name}</div>
                                    <div style="font-size: 0.9rem; color: #6b7280;">📞 ${contact.phone} • ${contact.status}</div>
                                    <div style="font-size: 0.8rem; color: #8b5cf6;">📅 ${formatDate(contact.date)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            console.log('✅ Monitoring loaded successfully');
            
        } catch (error) {
            console.error('❌ Error in monitoring:', error);
        }
    };

    // Fix 3: Complete reports data loader
    window.loadReportsDataFixed = async function() {
        console.log('📊 Loading reports data FIXED');
        
        try {
            if (!window.FirebaseData || !window.FirebaseData.currentUser) {
                return;
            }
            
            const userProfile = await window.FirebaseData.loadUserProfile();
            const allContacts = await window.FirebaseData.getFilteredContacts();
            
            if (userProfile.role === 'director') {
                // Show director reports
                document.getElementById('directorReports')?.classList.remove('hidden');
                document.getElementById('personalReports')?.classList.add('hidden');
                
                // Team Performance
                const teamPerformanceEl = document.getElementById('teamPerformance');
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
                
                // Executive Summary
                const executiveSummaryEl = document.getElementById('executiveSummary');
                if (executiveSummaryEl) {
                    const conversions = allContacts.filter(c => c.status === 'Convertido');
                    const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
                    
                    executiveSummaryEl.innerHTML = `
                        <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                            <h4 style="margin: 0 0 1rem 0; color: #374151;">📈 Resumen Ejecutivo</h4>
                            <div style="font-size: 0.9rem; line-height: 1.6;">
                                <div style="margin-bottom: 1rem;">
                                    <strong>Estado General:</strong><br>
                                    El equipo tiene ${allContacts.length} leads totales con una tasa de conversión del ${allContacts.length > 0 ? ((conversions.length / allContacts.length) * 100).toFixed(1) : 0}%.
                                </div>
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
                
                console.log('✅ Reports loaded successfully');
            }
        } catch (error) {
            console.error('❌ Error in reports:', error);
        }
    };

    // Fix 4: Notification function
    window.showNotification = function(message, type = 'info', duration = 5000) {
        console.log('📢 Notification:', message);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), duration);
    };

    // Fix 5: Date formatter
    window.formatDate = function(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES');
        } catch (error) {
            return dateString || 'Sin fecha';
        }
    };

    // If already on monitoring or reports tab, load data
    setTimeout(() => {
        const activeTab = document.querySelector('.tab-content:not(.hidden)');
        if (activeTab) {
            if (activeTab.id === 'monitoring') {
                loadMonitoringDataFixed();
            } else if (activeTab.id === 'reports') {
                loadReportsDataFixed();
            }
        }
    }, 1000);

    console.log('✅ All fixes applied successfully!');
});
