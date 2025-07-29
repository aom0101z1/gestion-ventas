// director-dashboard.js - DIRECTOR DASHBOARD MODULE
// ===== DIRECTOR DASHBOARD CONFIGURATION =====
console.log('📊 Loading Director Dashboard Module...');

// ===== MODULE STATE =====
let dashboardUserProfile = null;
let dashboardIsDirector = false;
let dashboardData = {
    contacts: [],
    users: {},
    lastUpdate: null
};

// ===== MODULE INITIALIZATION =====
async function initializeDirectorDashboard() {
    console.log('📊 Initializing Director Dashboard...');
    
    try {
        // Check if user is director
        if (!window.FirebaseData || !window.FirebaseData.currentUser) {
            console.log('❌ Firebase not available for director dashboard');
            return;
        }
        
        dashboardUserProfile = await window.FirebaseData.loadUserProfile();
        dashboardIsDirector = dashboardUserProfile?.role === 'director';
        
        if (!dashboardIsDirector) {
            console.log('ℹ️ User is not director, skipping dashboard initialization');
            return;
        }
        
        console.log('👑 Director dashboard authorized for:', dashboardUserProfile.name);
        
        // Load data and render
        await loadDashboardData();
        await renderAllDashboardSections();
        
        console.log('✅ Director Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing director dashboard:', error);
        showDashboardError('Error al inicializar dashboard de director');
    }
}

// ===== DATA LOADING =====
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data from Firebase...');
        
        // Load contacts and users in parallel
        const [contacts, users] = await Promise.all([
            window.FirebaseData.getAllContacts(),
            window.FirebaseData.getAllUsers()
        ]);
        
        dashboardData = {
            contacts: contacts || [],
            users: users || {},
            lastUpdate: new Date()
        };
        
        console.log(`✅ Dashboard data loaded: ${dashboardData.contacts.length} contacts, ${Object.keys(dashboardData.users).length} users`);
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        dashboardData = { contacts: [], users: {}, lastUpdate: new Date() };
        throw error;
    }
}

// ===== MAIN RENDER FUNCTION =====
async function renderAllDashboardSections() {
    console.log('🎨 Rendering all dashboard sections...');
    
    try {
        await Promise.all([
            renderTeamPerformance(),
            renderSalesRanking(),
            renderExecutiveSummary()
        ]);
        
        console.log('✅ All dashboard sections rendered successfully');
        
    } catch (error) {
        console.error('❌ Error rendering dashboard sections:', error);
    }
}

// ===== TEAM PERFORMANCE SECTION =====
async function renderTeamPerformance() {
    const container = document.getElementById('teamPerformance');
    if (!container) return;
    
    try {
        console.log('👥 Rendering team performance...');
        
        const teamStats = calculateTeamStats();
        
        container.innerHTML = `
            <h4>👥 Rendimiento del Equipo</h4>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
                        <div style="font-size: 1.8rem; font-weight: bold;">${teamStats.totalSalespeople}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Vendedores Activos</div>
                    </div>
                    <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 8px;">
                        <div style="font-size: 1.8rem; font-weight: bold;">${teamStats.avgContactsPerPerson}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Promedio Contactos</div>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <h5 style="margin-bottom: 1rem; font-size: 1rem; color: #374151;">📈 Top Performers:</h5>
                    ${teamStats.topPerformers.length > 0 ? teamStats.topPerformers.map((person, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: ${index === 0 ? '#f0f9ff' : '#f9fafb'}; border-left: 4px solid ${index === 0 ? '#3b82f6' : '#e5e7eb'}; border-radius: 0 6px 6px 0;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <span style="font-size: 1.2rem;">${index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}</span>
                                <div>
                                    <div style="font-weight: 600; color: #1f2937;">${person.name}</div>
                                    <div style="font-size: 0.8rem; color: #6b7280;">${person.conversions} conversiones • ${person.conversionRate}% tasa</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.2rem; font-weight: bold; color: #10b981;">${person.totalContacts}</div>
                                <div style="font-size: 0.8rem; color: #6b7280;">contactos</div>
                            </div>
                        </div>
                    `).join('') : '<div style="text-align: center; color: #6b7280; padding: 1rem;">No hay datos de rendimiento disponibles</div>'}
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #6b7280; text-align: center;">
                    ⏰ Actualizado: ${dashboardData.lastUpdate ? dashboardData.lastUpdate.toLocaleTimeString() : 'Nunca'}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error rendering team performance:', error);
        container.innerHTML = createErrorSection('👥 Rendimiento del Equipo', 'Error al cargar rendimiento del equipo');
    }
}

// ===== SALES RANKING SECTION =====
async function renderSalesRanking() {
    const container = document.getElementById('salesRanking');
    if (!container) return;
    
    try {
        console.log('🏆 Rendering sales ranking...');
        
        const ranking = calculateSalesRanking();
        
        container.innerHTML = `
            <h4>🏆 Ranking de Ventas</h4>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${ranking.length > 0 ? ranking.map((person, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`;
                    const bgColor = index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)' : 
                                   index === 1 ? 'linear-gradient(135deg, #f3f4f6 0%, #9ca3af 100%)' : 
                                   index === 2 ? 'linear-gradient(135deg, #fed7aa 0%, #f97316 100%)' : 
                                   '#f9fafb';
                    const textColor = index <= 2 ? '#1f2937' : '#374151';
                    
                    return `
                        <div style="background: ${bgColor}; margin-bottom: 0.75rem; border-radius: 8px; overflow: hidden; border: 1px solid ${index === 0 ? '#fbbf24' : '#e5e7eb'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span style="font-size: 1.5rem; min-width: 40px; text-align: center;">${medal}</span>
                                    <div>
                                        <div style="font-weight: 600; font-size: 1rem; color: ${textColor};">${person.name}</div>
                                        <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.25rem;">
                                            💰 ${person.conversions} conversiones • 📞 ${person.totalContacts} contactos
                                        </div>
                                        <div style="font-size: 0.8rem; color: #059669; font-weight: 500;">
                                            📊 ${person.conversionRate}% tasa de conversión
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${person.conversions}</div>
                                    <div style="font-size: 0.8rem; color: #6b7280;">ventas</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : '<div style="text-align: center; color: #6b7280; padding: 2rem;">📈 No hay datos de ventas disponibles</div>'}
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #6b7280; text-align: center;">
                    ⏰ Actualizado: ${dashboardData.lastUpdate ? dashboardData.lastUpdate.toLocaleTimeString() : 'Nunca'}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error rendering sales ranking:', error);
        container.innerHTML = createErrorSection('🏆 Ranking de Ventas', 'Error al cargar ranking de ventas');
    }
}

// ===== EXECUTIVE SUMMARY SECTION =====
async function renderExecutiveSummary() {
    const container = document.getElementById('executiveSummary');
    if (!container) return;
    
    try {
        console.log('📈 Rendering executive summary...');
        
        const summary = calculateExecutiveSummary();
        
        container.innerHTML = `
            <h4>📈 Resumen Ejecutivo</h4>
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #dbeafe 0%, #3b82f6 100%); color: white; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold;">${summary.totalContacts}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Total Contactos</div>
                    </div>
                    <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, ${summary.conversionRate > 10 ? '#dcfce7' : summary.conversionRate > 5 ? '#fef3c7' : '#fee2e2'} 0%, ${summary.conversionRate > 10 ? '#10b981' : summary.conversionRate > 5 ? '#f59e0b' : '#ef4444'} 100%); color: white; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold;">${summary.conversionRate}%</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Tasa Conversión</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h5 style="font-size: 1rem; margin-bottom: 1rem; color: #374151;">📊 Distribución por Estado:</h5>
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 6px;">
                        ${Object.entries(summary.statusDistribution).map(([status, count]) => {
                            const percentage = summary.totalContacts > 0 ? ((count / summary.totalContacts) * 100).toFixed(1) : 0;
                            const color = getStatusColor(status);
                            
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></div>
                                        <span style="font-size: 0.9rem; font-weight: 500;">${status}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="width: 80px; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
                                        </div>
                                        <span style="font-size: 0.9rem; font-weight: bold; min-width: 40px; text-align: right;">${count}</span>
                                        <span style="font-size: 0.8rem; color: #6b7280; min-width: 35px;">({percentage}%)</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); padding: 1.5rem; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; align-items: start; gap: 0.75rem;">
                        <span style="font-size: 1.5rem;">💡</span>
                        <div>
                            <div style="font-size: 0.9rem; font-weight: 600; color: #1e40af; margin-bottom: 0.5rem;">Insight Clave:</div>
                            <div style="font-size: 0.9rem; color: #374151; line-height: 1.5;">${summary.keyInsight}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #6b7280; text-align: center;">
                    ⏰ Actualizado: ${dashboardData.lastUpdate ? dashboardData.lastUpdate.toLocaleTimeString() : 'Nunca'}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error rendering executive summary:', error);
        container.innerHTML = createErrorSection('📈 Resumen Ejecutivo', 'Error al cargar resumen ejecutivo');
    }
}

// ===== CALCULATION FUNCTIONS =====
function calculateTeamStats() {
    const salespeople = Object.entries(dashboardData.users)
        .filter(([userId, user]) => user.role === 'vendedor')
        .map(([userId, user]) => {
            const userContacts = dashboardData.contacts.filter(contact => contact.salespersonId === userId);
            const conversions = userContacts.filter(contact => 
                contact.status && contact.status.toLowerCase() === 'convertido'
            ).length;
            
            return {
                id: userId,
                name: user.name,
                totalContacts: userContacts.length,
                conversions: conversions,
                conversionRate: userContacts.length > 0 ? ((conversions / userContacts.length) * 100).toFixed(1) : 0
            };
        })
        .sort((a, b) => b.totalContacts - a.totalContacts);
    
    const totalSalespeople = salespeople.length;
    const avgContactsPerPerson = totalSalespeople > 0 ? Math.round(dashboardData.contacts.length / totalSalespeople) : 0;
    
    return {
        totalSalespeople,
        avgContactsPerPerson,
        topPerformers: salespeople.slice(0, 3)
    };
}

function calculateSalesRanking() {
    return Object.entries(dashboardData.users)
        .filter(([userId, user]) => user.role === 'vendedor')
        .map(([userId, user]) => {
            const userContacts = dashboardData.contacts.filter(contact => contact.salespersonId === userId);
            const conversions = userContacts.filter(contact => 
                contact.status && contact.status.toLowerCase() === 'convertido'
            ).length;
            
            return {
                id: userId,
                name: user.name,
                totalContacts: userContacts.length,
                conversions: conversions,
                conversionRate: userContacts.length > 0 ? ((conversions / userContacts.length) * 100).toFixed(1) : 0
            };
        })
        .sort((a, b) => b.conversions - a.conversions || b.totalContacts - a.totalContacts)
        .slice(0, 8);
}

function calculateExecutiveSummary() {
    const totalContacts = dashboardData.contacts.length;
    const conversions = dashboardData.contacts.filter(contact => 
        contact.status && contact.status.toLowerCase() === 'convertido'
    ).length;
    const conversionRate = totalContacts > 0 ? ((conversions / totalContacts) * 100).toFixed(1) : 0;
    
    // Status distribution
    const statusDistribution = {};
    dashboardData.contacts.forEach(contact => {
        const status = contact.status || 'Sin Estado';
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });
    
    // Generate key insight
    let keyInsight = 'No hay suficientes datos para generar insights específicos.';
    if (totalContacts > 0) {
        const mostCommonStatus = Object.entries(statusDistribution)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (conversionRate >= 15) {
            keyInsight = `🎉 Excelente desempeño con ${conversionRate}% de conversión. El equipo está superando expectativas y manteniendo un flujo efectivo de ventas.`;
        } else if (conversionRate >= 10) {
            keyInsight = `✅ Buen desempeño con ${conversionRate}% de conversión. Hay oportunidades para optimizar el proceso y alcanzar el 15% objetivo.`;
        } else if (conversionRate >= 5) {
            keyInsight = `⚠️ Conversión promedio del ${conversionRate}%. Recomendado enfocar en entrenamientos de ventas y seguimiento más cercano a leads.`;
        } else {
            keyInsight = `🔍 La mayoría de contactos están en "${mostCommonStatus[0]}" (${mostCommonStatus[1]} contactos). Priorizar mover leads través del pipeline más rápidamente.`;
        }
        
        // Add team performance insight
        const activeTeamMembers = Object.values(dashboardData.users).filter(user => user.role === 'vendedor').length;
        if (activeTeamMembers > 0) {
            const contactsPerMember = Math.round(totalContacts / activeTeamMembers);
            keyInsight += ` Promedio de ${contactsPerMember} contactos por vendedor.`;
        }
    }
    
    return {
        totalContacts,
        conversionRate: parseFloat(conversionRate),
        statusDistribution,
        keyInsight
    };
}

function getStatusColor(status) {
    const colors = {
        'Nuevo': '#fbbf24',
        'Contactado': '#3b82f6',
        'Interesado': '#10b981',
        'Negociación': '#f97316',
        'Convertido': '#22c55e',
        'Perdido': '#ef4444',
        'Sin Estado': '#6b7280'
    };
    return colors[status] || '#6b7280';
}

// ===== UTILITY FUNCTIONS =====
function createErrorSection(title, message) {
    return `
        <h4>${title}</h4>
        <div style="background: #fee2e2; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #dc2626; text-align: center;">
            <div style="color: #dc2626; font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
            <div style="color: #dc2626; font-weight: 500;">${message}</div>
            <button onclick="refreshDirectorDashboard()" style="background: #dc2626; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                🔄 Reintentar
            </button>
        </div>
    `;
}

function showDashboardError(message) {
    console.error('Director Dashboard Error:', message);
    
    // Show error in all containers
    const containers = ['teamPerformance', 'salesRanking', 'executiveSummary'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = createErrorSection('Error', message);
        }
    });
}

// ===== PUBLIC FUNCTIONS =====
async function refreshDirectorDashboard() {
    console.log('🔄 Refreshing director dashboard...');
    
    if (!dashboardIsDirector) {
        console.log('❌ User is not director, cannot refresh dashboard');
        return;
    }
    
    try {
        // Show loading state
        const containers = ['teamPerformance', 'salesRanking', 'executiveSummary'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #6b7280;">
                        <div class="loading-spinner"></div>
                        <br>Cargando...
                    </div>
                `;
            }
        });
        
        await loadDashboardData();
        await renderAllDashboardSections();
        
        console.log('✅ Director dashboard refreshed successfully');
        
    } catch (error) {
        console.error('❌ Error refreshing director dashboard:', error);
        showDashboardError('Error al actualizar dashboard');
    }
}

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
window.refreshDirectorDashboard = refreshDirectorDashboard;
window.initializeDirectorDashboard = initializeDirectorDashboard;

// ===== AUTO-INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Director Dashboard module ready');
    
    // Initialize when Firebase is ready
    if (window.FirebaseData && window.FirebaseData.currentUser) {
        setTimeout(initializeDirectorDashboard, 2000);
    } else {
        window.addEventListener('firebaseReady', () => {
            console.log('🔥 Firebase ready, initializing director dashboard...');
            setTimeout(initializeDirectorDashboard, 2000);
        });
    }
});

console.log('✅ Director Dashboard module loaded successfully');
