// director-dashboard.js - FIREBASE INTEGRATED VERSION - ENHANCED WITH FUNCTION NUMBERING
// ===== DIRECTOR DASHBOARD MODULE ENHANCED =====
// Advanced analytics, team management, and executive reporting
// ================================================================================

// ===== GLOBAL DASHBOARD VARIABLES =====
let dashboardData = {
    salespeople: [],
    teamMetrics: {},
    trends: [],
    goals: {},
    isLoaded: false
};

let dashboardCharts = {};
let refreshInterval = null;
let performanceMetrics = {
    loadTimes: [],
    chartRenderTimes: [],
    lastRefresh: null
};

// ===== FUNCIÓN 1: INITIALIZE DIRECTOR DASHBOARD =====
async function initializeDirectorDashboard() {
    try {
        console.log('⚡ FUNCIÓN 1: Initialize Director Dashboard');
        
        // Check if user is director
        const userProfile = await window.FirebaseData.loadUserProfile();
        if (!userProfile || userProfile.role !== 'director') {
            console.log('⚠️ User is not director, skipping dashboard initialization');
            return;
        }
        
        const startTime = performance.now();
        
        // Show loading states
        showDashboardLoading();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Render all dashboard components
        await renderDashboardComponents();
        
        // Setup real-time updates
        setupDashboardRealtime();
        
        // Setup auto-refresh
        setupDashboardAutoRefresh();
        
        const initTime = performance.now() - startTime;
        performanceMetrics.loadTimes.push(initTime);
        
        console.log(`✅ Director dashboard initialized in ${initTime.toFixed(2)}ms`);
        showNotification('📊 Dashboard de director cargado', 'success', 2000);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 1 ERROR - Dashboard initialization failed:', error);
        showDashboardError('Error inicializando dashboard');
    }
}

// ===== FUNCIÓN 2: LOAD DASHBOARD DATA =====
async function loadDashboardData() {
    try {
        console.log('⚡ FUNCIÓN 2: Load Dashboard Data');
        
        const startTime = performance.now();
        
        // Load team data
        const [allUsers, allContacts, teamStats] = await Promise.all([
            window.FirebaseData.getAllUsers(),
            window.FirebaseData.getAllContacts(),
            window.AdminData.getTeamStats()
        ]);
        
        // Process salespeople data
        dashboardData.salespeople = Object.entries(allUsers)
            .filter(([uid, user]) => user.role === 'vendedor')
            .map(([uid, user]) => ({
                uid,
                name: user.name,
                email: user.email,
                ...calculateSalespersonMetrics(uid, allContacts)
            }));
        
        // Calculate team metrics
        dashboardData.teamMetrics = calculateTeamMetrics(allContacts);
        
        // Generate trends data
        dashboardData.trends = generateTrendsData(allContacts);
        
        // Load goals
        dashboardData.goals = await loadTeamGoals();
        
        dashboardData.isLoaded = true;
        
        const loadTime = performance.now() - startTime;
        console.log(`📊 Dashboard data loaded in ${loadTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 2 ERROR - Error loading dashboard data:', error);
        throw error;
    }
}

// ===== FUNCIÓN 3: CALCULATE SALESPERSON METRICS =====
function calculateSalespersonMetrics(salespersonId, allContacts) {
    console.log('⚡ FUNCIÓN 3: Calculate Salesperson Metrics');
    
    const userContacts = allContacts.filter(c => c.salespersonId === salespersonId);
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = getWeekRange();
    const thisMonth = getMonthRange();
    
    const todayContacts = userContacts.filter(c => c.date === today);
    const weekContacts = userContacts.filter(c => c.date >= thisWeek.start && c.date <= thisWeek.end);
    const monthContacts = userContacts.filter(c => c.date >= thisMonth.start && c.date <= thisMonth.end);
    
    const conversions = userContacts.filter(c => c.status === 'Convertido');
    const activeLeads = userContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
    
    const conversionRate = userContacts.length > 0 ? 
        (conversions.length / userContacts.length * 100) : 0;
    
    const avgLeadScore = userContacts.length > 0 ? 
        userContacts.reduce((sum, c) => sum + (c.score || 50), 0) / userContacts.length : 50;
    
    // Calculate daily goal progress
    const dailyGoal = 10; // 10 contacts per day
    const dailyProgress = todayContacts.length / dailyGoal * 100;
    
    // Calculate recent activity trend
    const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        return userContacts.filter(c => c.date === dateStr).length;
    }).reverse();
    
    return {
        totalContacts: userContacts.length,
        todayContacts: todayContacts.length,
        weekContacts: weekContacts.length,
        monthContacts: monthContacts.length,
        conversions: conversions.length,
        activeLeads: activeLeads.length,
        conversionRate: conversionRate.toFixed(1),
        avgLeadScore: avgLeadScore.toFixed(1),
        dailyProgress: Math.min(dailyProgress, 100).toFixed(0),
        last7Days: last7Days,
        lastActivity: userContacts.length > 0 ? 
            Math.max(...userContacts.map(c => new Date(c.date).getTime())) : null
    };
}

// ===== FUNCIÓN 4: CALCULATE TEAM METRICS =====
function calculateTeamMetrics(allContacts) {
    console.log('⚡ FUNCIÓN 4: Calculate Team Metrics');
    
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = getWeekRange();
    const thisMonth = getMonthRange();
    
    const todayContacts = allContacts.filter(c => c.date === today);
    const weekContacts = allContacts.filter(c => c.date >= thisWeek.start && c.date <= thisWeek.end);
    const monthContacts = allContacts.filter(c => c.date >= thisMonth.start && c.date <= thisMonth.end);
    
    const conversions = allContacts.filter(c => c.status === 'Convertido');
    const activeLeads = allContacts.filter(c => !['Convertido', 'Perdido'].includes(c.status));
    const lostLeads = allContacts.filter(c => c.status === 'Perdido');
    
    // Calculate conversion funnel
    const funnel = {
        nuevo: allContacts.filter(c => c.status === 'Nuevo').length,
        contactado: allContacts.filter(c => c.status === 'Contactado').length,
        interesado: allContacts.filter(c => c.status === 'Interesado').length,
        negociacion: allContacts.filter(c => c.status === 'Negociación').length,
        convertido: conversions.length,
        perdido: lostLeads.length
    };
    
    // Calculate source effectiveness
    const sourceStats = {};
    allContacts.forEach(contact => {
        const source = contact.source || 'No especificado';
        if (!sourceStats[source]) {
            sourceStats[source] = { total: 0, conversions: 0 };
        }
        sourceStats[source].total++;
        if (contact.status === 'Convertido') {
            sourceStats[source].conversions++;
        }
    });
    
    Object.keys(sourceStats).forEach(source => {
        sourceStats[source].conversionRate = 
            sourceStats[source].total > 0 ? 
            (sourceStats[source].conversions / sourceStats[source].total * 100).toFixed(1) : 0;
    });
    
    return {
        total: allContacts.length,
        today: todayContacts.length,
        week: weekContacts.length,
        month: monthContacts.length,
        conversions: conversions.length,
        activeLeads: activeLeads.length,
        lostLeads: lostLeads.length,
        conversionRate: allContacts.length > 0 ? 
            (conversions.length / allContacts.length * 100).toFixed(1) : 0,
        avgDailyContacts: weekContacts.length / 7,
        funnel: funnel,
        sourceStats: sourceStats
    };
}

// ===== FUNCIÓN 5: GENERATE TRENDS DATA =====
function generateTrendsData(allContacts) {
    console.log('⚡ FUNCIÓN 5: Generate Trends Data');
    
    const trends = {
        daily: [],
        weekly: [],
        monthly: [],
        conversion: []
    };
    
    // Generate last 30 days data
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayContacts = allContacts.filter(c => c.date === dateStr);
        const dayConversions = dayContacts.filter(c => c.status === 'Convertido');
        
        trends.daily.push({
            date: dateStr,
            contacts: dayContacts.length,
            conversions: dayConversions.length,
            conversionRate: dayContacts.length > 0 ? 
                (dayConversions.length / dayContacts.length * 100) : 0
        });
    }
    
    // Generate last 12 weeks data
    for (let i = 11; i >= 0; i--) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - (i * 7));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        
        const weekContacts = allContacts.filter(c => {
            const contactDate = new Date(c.date);
            return contactDate >= startDate && contactDate <= endDate;
        });
        
        const weekConversions = weekContacts.filter(c => c.status === 'Convertido');
        
        trends.weekly.push({
            week: `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`,
            contacts: weekContacts.length,
            conversions: weekConversions.length,
            conversionRate: weekContacts.length > 0 ? 
                (weekConversions.length / weekContacts.length * 100) : 0
        });
    }
    
    return trends;
}

// ===== FUNCIÓN 6: LOAD TEAM GOALS =====
async function loadTeamGoals() {
    try {
        console.log('⚡ FUNCIÓN 6: Load Team Goals');
        
        // In a real implementation, this would load from Firebase
        // For now, using default goals
        return {
            dailyContacts: dashboardData.salespeople.length * 10,
            weeklyContacts: dashboardData.salespeople.length * 50,
            monthlyContacts: dashboardData.salespeople.length * 200,
            monthlyConversions: dashboardData.salespeople.length * 20,
            conversionRate: 15
        };
    } catch (error) {
        console.error('❌ FUNCIÓN 6 ERROR - Error loading team goals:', error);
        return {};
    }
}

// ===== FUNCIÓN 7: RENDER DASHBOARD COMPONENTS =====
async function renderDashboardComponents() {
    try {
        console.log('⚡ FUNCIÓN 7: Render Dashboard Components');
        
        const startTime = performance.now();
        
        // Render components in parallel
        await Promise.all([
            renderTeamOverview(),
            renderSalespeopleCards(),
            renderPerformanceCharts(),
            renderConversionFunnel(),
            renderSourceAnalysis(),
            renderRecentActivity()
        ]);
        
        const renderTime = performance.now() - startTime;
        performanceMetrics.chartRenderTimes.push(renderTime);
        
        console.log(`✅ Dashboard components rendered in ${renderTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 7 ERROR - Error rendering dashboard components:', error);
        throw error;
    }
}

// ===== FUNCIÓN 8: RENDER TEAM OVERVIEW =====
async function renderTeamOverview() {
    try {
        console.log('⚡ FUNCIÓN 8: Render Team Overview');
        
        const container = document.getElementById('teamActivityOverview');
        if (!container) return;
        
        const metrics = dashboardData.teamMetrics;
        const goals = dashboardData.goals;
        
        const dailyProgress = goals.dailyContacts > 0 ? 
            (metrics.today / goals.dailyContacts * 100).toFixed(0) : 0;
        
        const conversionProgress = goals.monthlyConversions > 0 ? 
            (metrics.conversions / goals.monthlyConversions * 100).toFixed(0) : 0;
        
        container.innerHTML = `
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            ">
                <!-- Daily Performance -->
                <div class="metric-card" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="position: relative; z-index: 2;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.25rem;">
                                    ${metrics.today}
                                </div>
                                <div style="opacity: 0.9; font-size: 1rem;">
                                    Contactos Hoy
                                </div>
                            </div>
                            <div style="font-size: 2rem; opacity: 0.8;">📞</div>
                        </div>
                        <div style="margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
                                <span>Meta Diaria</span>
                                <span>${dailyProgress}%</span>
                            </div>
                            <div style="background: rgba(255,255,255,0.2); height: 6px; border-radius: 3px;">
                                <div style="
                                    background: white;
                                    height: 6px;
                                    border-radius: 3px;
                                    width: ${Math.min(dailyProgress, 100)}%;
                                    transition: width 0.5s ease;
                                "></div>
                            </div>
                        </div>
                    </div>
                    <div style="
                        position: absolute;
                        top: -20px;
                        right: -20px;
                        width: 100px;
                        height: 100px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 50%;
                        z-index: 1;
                    "></div>
                </div>
                
                <!-- Weekly Performance -->
                <div class="metric-card" style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="position: relative; z-index: 2;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.25rem;">
                                    ${metrics.week}
                                </div>
                                <div style="opacity: 0.9; font-size: 1rem;">
                                    Esta Semana
                                </div>
                            </div>
                            <div style="font-size: 2rem; opacity: 0.8;">📊</div>
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">
                            Promedio diario: ${metrics.avgDailyContacts.toFixed(1)}
                        </div>
                    </div>
                </div>
                
                <!-- Conversions -->
                <div class="metric-card" style="
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="position: relative; z-index: 2;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.25rem;">
                                    ${metrics.conversions}
                                </div>
                                <div style="opacity: 0.9; font-size: 1rem;">
                                    Conversiones
                                </div>
                            </div>
                            <div style="font-size: 2rem; opacity: 0.8;">💰</div>
                        </div>
                        <div style="margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
                                <span>Tasa: ${metrics.conversionRate}%</span>
                                <span>${conversionProgress}% meta</span>
                            </div>
                            <div style="background: rgba(255,255,255,0.2); height: 6px; border-radius: 3px;">
                                <div style="
                                    background: white;
                                    height: 6px;
                                    border-radius: 3px;
                                    width: ${Math.min(conversionProgress, 100)}%;
                                    transition: width 0.5s ease;
                                "></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Active Leads -->
                <div class="metric-card" style="
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="position: relative; z-index: 2;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.25rem;">
                                    ${metrics.activeLeads}
                                </div>
                                <div style="opacity: 0.9; font-size: 1rem;">
                                    Leads Activos
                                </div>
                            </div>
                            <div style="font-size: 2rem; opacity: 0.8;">🎯</div>
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">
                            En pipeline: ${((metrics.activeLeads / metrics.total) * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ FUNCIÓN 8 ERROR - Error rendering team overview:', error);
    }
}

// ===== FUNCIÓN 9: RENDER SALESPEOPLE CARDS =====
async function renderSalespeopleCards() {
    try {
        console.log('⚡ FUNCIÓN 9: Render Salespeople Cards');
        
        const container = document.getElementById('individualSalespeopleActivity');
        if (!container) return;
        
        // Sort salespeople by today's performance
        const sortedSalespeople = [...dashboardData.salespeople]
            .sort((a, b) => b.todayContacts - a.todayContacts);
        
        container.innerHTML = `
            <h3 style="margin: 0 0 1.5rem 0; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
                👥 Rendimiento Individual del Equipo
                <span style="
                    background: #f3f4f6;
                    color: #6b7280;
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: normal;
                ">
                    ${sortedSalespeople.length} vendedores
                </span>
            </h3>
            
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 1.5rem;
            ">
                ${sortedSalespeople.map(person => {
                    const statusColor = getPerformanceColor(person.dailyProgress);
                    const activityStatus = getActivityStatus(person.lastActivity);
                    const trendDirection = getTrendDirection(person.last7Days);
                    
                    return `
                        <div style="
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                            overflow: hidden;
                            border-left: 4px solid ${statusColor};
                            transition: transform 0.2s ease, box-shadow 0.2s ease;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.12)'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'">
                            
                            <!-- Header -->
                            <div style="
                                padding: 1.5rem 1.5rem 1rem 1.5rem;
                                background: linear-gradient(135deg, ${statusColor}15, ${statusColor}25);
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                    <div>
                                        <h4 style="margin: 0 0 0.25rem 0; color: #1f2937; font-size: 1.1rem;">
                                            ${person.name}
                                        </h4>
                                        <div style="color: #6b7280; font-size: 0.9rem;">
                                            ${person.email}
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="
                                            background: ${statusColor};
                                            color: white;
                                            padding: 0.25rem 0.75rem;
                                            border-radius: 20px;
                                            font-size: 0.8rem;
                                            font-weight: 600;
                                        ">
                                            ${activityStatus}
                                        </span>
                                    </div>
                                </div>
                                
                                <!-- Daily Performance -->
                                <div style="margin-bottom: 1rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span style="font-weight: 600; color: #374151;">Meta Diaria</span>
                                        <span style="font-weight: 600; color: ${statusColor};">
                                            ${person.todayContacts}/10 (${person.dailyProgress}%)
                                        </span>
                                    </div>
                                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                                        <div style="
                                            background: ${statusColor};
                                            height: 8px;
                                            border-radius: 4px;
                                            width: ${Math.min(person.dailyProgress, 100)}%;
                                            transition: width 0.5s ease;
                                        "></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Stats Grid -->
                            <div style="padding: 1rem 1.5rem;">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                                            ${person.weekContacts}
                                        </div>
                                        <div style="font-size: 0.8rem; color: #6b7280;">Esta Semana</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                                            ${person.conversions}
                                        </div>
                                        <div style="font-size: 0.8rem; color: #6b7280;">Conversiones</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">
                                            ${person.conversionRate}%
                                        </div>
                                        <div style="font-size: 0.8rem; color: #6b7280;">Tasa</div>
                                    </div>
                                </div>
                                
                                <!-- 7-Day Trend -->
                                <div style="margin-bottom: 1rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span style="font-size: 0.9rem; color: #6b7280;">Tendencia 7 días</span>
                                        <span style="
                                            color: ${trendDirection === 'up' ? '#10b981' : trendDirection === 'down' ? '#ef4444' : '#6b7280'};
                                            font-size: 0.8rem;
                                            font-weight: 600;
                                        ">
                                            ${trendDirection === 'up' ? '📈 Creciendo' : trendDirection === 'down' ? '📉 Bajando' : '📊 Estable'}
                                        </span>
                                    </div>
                                    <div style="display: flex; gap: 2px; height: 30px; align-items: end;">
                                        ${person.last7Days.map((count, index) => {
                                            const maxCount = Math.max(...person.last7Days, 1);
                                            const height = (count / maxCount) * 100;
                                            return `
                                                <div style="
                                                    flex: 1;
                                                    background: ${statusColor};
                                                    opacity: ${0.3 + (height / 100) * 0.7};
                                                    height: ${Math.max(height, 5)}%;
                                                    border-radius: 2px;
                                                    transition: opacity 0.3s ease;
                                                " title="Día ${index + 1}: ${count} contactos"></div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                
                                <!-- Quick Actions -->
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <button onclick="viewSalespersonDetails('${person.uid}')" style="
                                        background: #f3f4f6;
                                        border: 1px solid #e5e7eb;
                                        color: #374151;
                                        padding: 0.4rem 0.8rem;
                                        border-radius: 6px;
                                        font-size: 0.8rem;
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                    " onmouseover="this.style.background='#e5e7eb'"
                                       onmouseout="this.style.background='#f3f4f6'">
                                        👁️ Ver Detalles
                                    </button>
                                    <button onclick="sendMotivationalMessage('${person.uid}')" style="
                                        background: #dbeafe;
                                        border: 1px solid #3b82f6;
                                        color: #1e40af;
                                        padding: 0.4rem 0.8rem;
                                        border-radius: 6px;
                                        font-size: 0.8rem;
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                    " onmouseover="this.style.background='#bfdbfe'"
                                       onmouseout="this.style.background='#dbeafe'">
                                        💪 Motivar
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('❌ FUNCIÓN 9 ERROR - Error rendering salespeople cards:', error);
    }
}

// ===== FUNCIÓN 10: GET PERFORMANCE COLOR =====
function getPerformanceColor(dailyProgress) {
    console.log('⚡ FUNCIÓN 10: Get Performance Color');
    
    if (dailyProgress >= 100) return '#10b981'; // Green
    if (dailyProgress >= 70) return '#3b82f6';  // Blue
    if (dailyProgress >= 50) return '#f59e0b';  // Orange
    return '#ef4444'; // Red
}

// ===== FUNCIÓN 11: GET ACTIVITY STATUS =====
function getActivityStatus(lastActivity) {
    console.log('⚡ FUNCIÓN 11: Get Activity Status');
    
    if (!lastActivity) return '⚪ Sin datos';
    
    const daysSince = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return '🟢 Activo';
    if (daysSince === 1) return '🟡 Ayer';
    if (daysSince < 7) return `🟠 ${daysSince}d`;
    return '🔴 Inactivo';
}

// ===== FUNCIÓN 12: GET TREND DIRECTION =====
function getTrendDirection(last7Days) {
    console.log('⚡ FUNCIÓN 12: Get Trend Direction');
    
    if (last7Days.length < 3) return 'stable';
    
    const recent = last7Days.slice(-3);
    const earlier = last7Days.slice(-6, -3);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    const change = ((recentAvg - earlierAvg) / (earlierAvg || 1)) * 100;
    
    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
}

// ===== FUNCIÓN 13: RENDER PERFORMANCE CHARTS =====
async function renderPerformanceCharts() {
    console.log('⚡ FUNCIÓN 13: Render Performance Charts');
    
    // This would integrate with a charting library like Chart.js or D3.js
    // For now, we'll create simple text-based charts
    
    const container = document.getElementById('performanceCharts');
    if (!container) return;
    
    container.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <h3 style="margin: 0 0 1.5rem 0;">📈 Gráficos de Rendimiento</h3>
            <div style="color: #6b7280; text-align: center; padding: 3rem;">
                📊 Integración con biblioteca de gráficos pendiente<br>
                <small>Chart.js, D3.js, o similar se integraría aquí</small>
            </div>
        </div>
    `;
}

// ===== FUNCIÓN 14: RENDER CONVERSION FUNNEL =====
async function renderConversionFunnel() {
    try {
        console.log('⚡ FUNCIÓN 14: Render Conversion Funnel');
        
        const container = document.getElementById('conversionFunnel');
        if (!container) return;
        
        const funnel = dashboardData.teamMetrics.funnel;
        const total = Object.values(funnel).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            container.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; color: #6b7280;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🎯</div>
                    <h3>No hay datos de funnel</h3>
                    <p>Los datos aparecerán cuando se registren leads</p>
                </div>
            `;
            return;
        }
        
        const stages = [
            { key: 'nuevo', name: 'Nuevos', color: '#fbbf24', emoji: '🟡' },
            { key: 'contactado', name: 'Contactados', color: '#3b82f6', emoji: '🔵' },
            { key: 'interesado', name: 'Interesados', color: '#10b981', emoji: '🟢' },
            { key: 'negociacion', name: 'Negociación', color: '#f97316', emoji: '🟠' },
            { key: 'convertido', name: 'Convertidos', color: '#22c55e', emoji: '✅' },
            { key: 'perdido', name: 'Perdidos', color: '#ef4444', emoji: '❌' }
        ];
        
        container.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <h3 style="margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                    🎯 Embudo de Conversión
                    <span style="
                        background: #f3f4f6;
                        color: #6b7280;
                        padding: 0.25rem 0.5rem;
                        border-radius: 12px;
                        font-size: 0.8rem;
                        font-weight: normal;
                    ">
                        ${total} leads totales
                    </span>
                </h3>
                
                <div style="space-y: 0.75rem;">
                    ${stages.map(stage => {
                        const count = funnel[stage.key] || 0;
                        const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                        const width = total > 0 ? (count / total * 100) : 0;
                        
                        return `
                            <div style="margin-bottom: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-size: 1.2rem;">${stage.emoji}</span>
                                        <span style="font-weight: 600; color: #374151;">${stage.name}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <span style="color: #6b7280; font-size: 0.9rem;">${percentage}%</span>
                                        <span style="
                                            background: ${stage.color};
                                            color: white;
                                            padding: 0.25rem 0.5rem;
                                            border-radius: 12px;
                                            font-size: 0.8rem;
                                            font-weight: 600;
                                            min-width: 40px;
                                            text-align: center;
                                        ">
                                            ${count}
                                        </span>
                                    </div>
                                </div>
                                <div style="background: #f3f4f6; height: 12px; border-radius: 6px; overflow: hidden;">
                                    <div style="
                                        background: ${stage.color};
                                        height: 12px;
                                        border-radius: 6px;
                                        width: ${width}%;
                                        transition: width 0.5s ease;
                                        position: relative;
                                    ">
                                        ${width > 20 ? `
                                            <div style="
                                                position: absolute;
                                                top: 50%;
                                                left: 8px;
                                                transform: translateY(-50%);
                                                color: white;
                                                font-size: 0.7rem;
                                                font-weight: 600;
                                            ">
                                                ${percentage}%
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Funnel Insights -->
                <div style="margin-top: 2rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1e40af; font-size: 0.9rem;">💡 Insights del Embudo</h4>
                    <div style="font-size: 0.8rem; color: #374151; line-height: 1.4;">
                        ${generateFunnelInsights(funnel, total)}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ FUNCIÓN 14 ERROR - Error rendering conversion funnel:', error);
    }
}

// ===== FUNCIÓN 15: GENERATE FUNNEL INSIGHTS =====
function generateFunnelInsights(funnel, total) {
    console.log('⚡ FUNCIÓN 15: Generate Funnel Insights');
    
    const insights = [];
    
    // Conversion rate from contactado to convertido
    const conversionRate = funnel.contactado > 0 ? 
        (funnel.convertido / funnel.contactado * 100).toFixed(1) : 0;
    
    if (conversionRate > 20) {
        insights.push('🎉 Excelente tasa de conversión del ' + conversionRate + '%');
    } else if (conversionRate > 10) {
        insights.push('📈 Buena tasa de conversión del ' + conversionRate + '%');
    } else if (conversionRate > 0) {
        insights.push('📊 Tasa de conversión del ' + conversionRate + '% - hay oportunidad de mejora');
    }
    
    // Lead loss analysis
    const lossRate = total > 0 ? (funnel.perdido / total * 100).toFixed(1) : 0;
    if (lossRate > 30) {
        insights.push('⚠️ Alto porcentaje de leads perdidos (' + lossRate + '%)');
    }
    
    // Pipeline health
    const activeRate = total > 0 ? 
        ((funnel.contactado + funnel.interesado + funnel.negociacion) / total * 100).toFixed(1) : 0;
    if (activeRate > 50) {
        insights.push('💪 Pipeline saludable con ' + activeRate + '% de leads activos');
    }
    
    return insights.length > 0 ? insights.join('<br>') : 'Agrega más leads para obtener insights';
}

// ===== FUNCIÓN 16: RENDER SOURCE ANALYSIS =====
async function renderSourceAnalysis() {
    try {
        console.log('⚡ FUNCIÓN 16: Render Source Analysis');
        
        const container = document.getElementById('sourceAnalysis');
        if (!container) return;
        
        const sourceStats = dashboardData.teamMetrics.sourceStats;
        const sources = Object.entries(sourceStats)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 8); // Top 8 sources
        
        if (sources.length === 0) {
            container.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; color: #6b7280;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📍</div>
                    <h3>No hay datos de fuentes</h3>
                    <p>Los datos aparecerán cuando se registren leads</p>
                </div>
            `;
            return;
        }
        
        const totalContacts = sources.reduce((sum, [_, stats]) => sum + stats.total, 0);
        
        container.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <h3 style="margin: 0 0 1.5rem 0;">📍 Análisis de Fuentes</h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                    ${sources.map(([source, stats]) => {
                        const percentage = totalContacts > 0 ? (stats.total / totalContacts * 100).toFixed(1) : 0;
                        const conversionColor = getConversionColor(parseFloat(stats.conversionRate));
                        const sourceEmoji = getSourceEmoji(source);
                        
                        return `
                            <div style="
                                border: 1px solid #e5e7eb;
                                border-radius: 8px;
                                padding: 1.5rem;
                                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                                transition: transform 0.2s ease;
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                            <span style="font-size: 1.2rem;">${sourceEmoji}</span>
                                            <h4 style="
                                                margin: 0;
                                                color: #374151;
                                                font-size: 0.95rem;
                                                font-weight: 600;
                                                white-space: nowrap;
                                                overflow: hidden;
                                                text-overflow: ellipsis;
                                            " title="${source}">
                                                ${source.length > 20 ? source.substring(0, 20) + '...' : source}
                                            </h4>
                                        </div>
                                        <div style="color: #6b7280; font-size: 0.8rem;">
                                            ${percentage}% del total
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="
                                            background: #3b82f6;
                                            color: white;
                                            padding: 0.25rem 0.5rem;
                                            border-radius: 12px;
                                            font-size: 0.8rem;
                                            font-weight: 600;
                                        ">
                                            ${stats.total}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="margin-bottom: 1rem;">
                                    <div style="
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;
                                        margin-bottom: 0.5rem;
                                    ">
                                        <span style="font-size: 0.8rem; color: #6b7280;">Conversiones</span>
                                        <span style="
                                            background: ${conversionColor};
                                            color: white;
                                            padding: 0.2rem 0.4rem;
                                            border-radius: 8px;
                                            font-size: 0.7rem;
                                            font-weight: 600;
                                        ">
                                            ${stats.conversions} (${stats.conversionRate}%)
                                        </span>
                                    </div>
                                    <div style="background: #e5e7eb; height: 6px; border-radius: 3px; overflow: hidden;">
                                        <div style="
                                            background: ${conversionColor};
                                            height: 6px;
                                            border-radius: 3px;
                                            width: ${Math.min(stats.conversionRate, 100)}%;
                                            transition: width 0.5s ease;
                                        "></div>
                                    </div>
                                </div>
                                
                                <div style="
                                    background: white;
                                    padding: 0.75rem;
                                    border-radius: 6px;
                                    border-left: 3px solid ${conversionColor};
                                ">
                                    <div style="font-size: 0.8rem; color: #374151;">
                                        <strong>ROI:</strong> ${calculateSourceROI(stats)}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Best Performing Source -->
                ${sources.length > 0 ? `
                    <div style="margin-top: 2rem; padding: 1rem; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #065f46; font-size: 0.9rem;">🏆 Mejor Fuente</h4>
                        <div style="font-size: 0.8rem; color: #374151;">
                            ${getBestSourceAnalysis(sources)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('❌ FUNCIÓN 16 ERROR - Error rendering source analysis:', error);
    }
}

// ===== FUNCIÓN 17: GET SOURCE EMOJI =====
function getSourceEmoji(source) {
    console.log('⚡ FUNCIÓN 17: Get Source Emoji');
    
    const emojiMap = {
        'Facebook': '📘',
        'Instagram': '📸',
        'Google': '🔍',
        'Referido': '👥',
        'Volante': '📄',
        'Pasando por la sede': '🏢'
    };
    
    if (source.includes('CONVENIO:')) return '🤝';
    return emojiMap[source] || '📍';
}

// ===== FUNCIÓN 18: GET CONVERSION COLOR =====
function getConversionColor(conversionRate) {
    console.log('⚡ FUNCIÓN 18: Get Conversion Color');
    
    if (conversionRate >= 20) return '#10b981'; // Green
    if (conversionRate >= 15) return '#3b82f6'; // Blue
    if (conversionRate >= 10) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
}

// ===== FUNCIÓN 19: CALCULATE SOURCE ROI =====
function calculateSourceROI(stats) {
    console.log('⚡ FUNCIÓN 19: Calculate Source ROI');
    
    // Simplified ROI calculation
    if (stats.conversions === 0) return 'No calculado';
    
    const revenuePerConversion = 500000; // Average revenue per conversion in COP
    const costPerLead = 50000; // Estimated cost per lead in COP
    
    const revenue = stats.conversions * revenuePerConversion;
    const cost = stats.total * costPerLead;
    const roi = cost > 0 ? ((revenue - cost) / cost * 100).toFixed(0) : 0;
    
    return `${roi}% ROI`;
}

// ===== FUNCIÓN 20: GET BEST SOURCE ANALYSIS =====
function getBestSourceAnalysis(sources) {
    console.log('⚡ FUNCIÓN 20: Get Best Source Analysis');
    
    if (sources.length === 0) return 'No hay datos suficientes';
    
    // Find best source by conversion rate
    const bestByConversion = sources.reduce((best, [source, stats]) => 
        parseFloat(stats.conversionRate) > parseFloat(best[1].conversionRate) ? [source, stats] : best
    );
    
    // Find best source by volume
    const bestByVolume = sources.reduce((best, [source, stats]) => 
        stats.total > best[1].total ? [source, stats] : best
    );
    
    let analysis = '';
    
    if (bestByConversion[0] === bestByVolume[0]) {
        analysis = `${bestByConversion[0]} es la mejor fuente tanto en volumen (${bestByVolume[1].total} leads) como en conversión (${bestByConversion[1].conversionRate}%).`;
    } else {
        analysis = `${bestByVolume[0]} genera más volumen (${bestByVolume[1].total} leads), pero ${bestByConversion[0]} tiene mejor conversión (${bestByConversion[1].conversionRate}%).`;
    }
    
    return analysis;
}

// ===== FUNCIÓN 21: RENDER RECENT ACTIVITY =====
async function renderRecentActivity() {
    try {
        console.log('⚡ FUNCIÓN 21: Render Recent Activity');
        
        const container = document.getElementById('recentTeamActivity');
        if (!container) return;
        
        // Get recent activities from all contacts
        const allContacts = await window.FirebaseData.getAllContacts();
        const recentActivities = allContacts
            .sort((a, b) => {
                const dateTimeA = new Date(a.date + ' ' + (a.time || '00:00:00'));
                const dateTimeB = new Date(b.date + ' ' + (b.time || '00:00:00'));
                return dateTimeB - dateTimeA;
            })
            .slice(0, 15); // Last 15 activities
        
        container.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0;">🕒 Actividad Reciente del Equipo</h3>
                    <button onclick="refreshDashboard()" style="
                        background: #f3f4f6;
                        border: 1px solid #e5e7eb;
                        color: #374151;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#e5e7eb'"
                       onmouseout="this.style.background='#f3f4f6'">
                        🔄 Actualizar
                    </button>
                </div>
                
                ${recentActivities.length === 0 ? `
                    <div style="text-align: center; color: #6b7280; padding: 3rem;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📝</div>
                        <h4>No hay actividad reciente</h4>
                        <p>La actividad del equipo aparecerá aquí</p>
                    </div>
                ` : `
                    <div style="space-y: 1rem;">
                        ${await Promise.all(recentActivities.map(async (activity, index) => {
                            const userName = await getUserDisplayNameFirebase(activity.salespersonId);
                            const timeAgo = getTimeAgo(activity.date, activity.time);
                            const statusColor = getStatusColor(activity.status);
                            const sourceEmoji = getSourceEmoji(activity.source);
                            
                            return `
                                <div style="
                                    padding: 1rem;
                                    border: 1px solid #e5e7eb;
                                    border-radius: 8px;
                                    background: ${index === 0 ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#fafafa'};
                                    border-left: 4px solid ${statusColor};
                                    transition: all 0.2s ease;
                                    margin-bottom: 1rem;
                                " onmouseover="this.style.background='#f8fafc'"
                                   onmouseout="this.style.background='${index === 0 ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#fafafa'}'">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                                <span style="font-size: 1.1rem;">${sourceEmoji}</span>
                                                <span style="font-weight: 600; color: #374151;">
                                                    ${activity.name}
                                                </span>
                                                ${index === 0 ? '<span style="background: #10b981; color: white; padding: 0.2rem 0.4rem; border-radius: 8px; font-size: 0.7rem; font-weight: 600;">NUEVO</span>' : ''}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                                                <span style="color: #10b981; font-size: 0.9rem;">📞 ${activity.phone}</span>
                                                <span style="
                                                    background: ${statusColor};
                                                    color: white;
                                                    padding: 0.2rem 0.5rem;
                                                    border-radius: 12px;
                                                    font-size: 0.8rem;
                                                    font-weight: 500;
                                                ">
                                                    ${activity.status}
                                                </span>
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: #6b7280;">
                                                <span>👤 ${userName}</span>
                                                <span>📍 ${activity.location}</span>
                                                <span>⏰ ${timeAgo}</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 0.5rem;">
                                            <button onclick="showContactDetails('${activity.id}')" style="
                                                background: none;
                                                border: 1px solid #e5e7eb;
                                                color: #6b7280;
                                                border-radius: 4px;
                                                padding: 0.3rem 0.5rem;
                                                cursor: pointer;
                                                font-size: 0.7rem;
                                                transition: all 0.2s ease;
                                            " title="Ver detalles">
                                                👁️
                                            </button>
                                            <button onclick="openWhatsApp('${activity.phone}', '${activity.name}')" style="
                                                background: #25d366;
                                                border: none;
                                                color: white;
                                                border-radius: 4px;
                                                padding: 0.3rem 0.5rem;
                                                cursor: pointer;
                                                font-size: 0.7rem;
                                                transition: all 0.2s ease;
                                            " title="WhatsApp">
                                                💬
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }))}
                    </div>
                `}
            </div>
        `;
        
    } catch (error) {
        console.error('❌ FUNCIÓN 21 ERROR - Error rendering recent activity:', error);
    }
}

// ===== FUNCIÓN 22: GET STATUS COLOR =====
function getStatusColor(status) {
    console.log('⚡ FUNCIÓN 22: Get Status Color');
    
    const colorMap = {
        'Nuevo': '#fbbf24',
        'Contactado': '#3b82f6',
        'Interesado': '#10b981',
        'Negociación': '#f97316',
        'Convertido': '#22c55e',
        'Perdido': '#ef4444'
    };
    
    return colorMap[status] || '#6b7280';
}

// ===== FUNCIÓN 23: SETUP DASHBOARD REALTIME =====
function setupDashboardRealtime() {
    console.log('⚡ FUNCIÓN 23: Setup Dashboard Realtime');
    
    // Listen for AdminData updates
    if (window.AdminData) {
        window.AdminData.addObserver(async () => {
            console.log('📡 Data updated, refreshing dashboard');
            await loadDashboardData();
            await renderDashboardComponents();
        });
    }
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👁️ Dashboard visible, refreshing');
            setTimeout(refreshDashboard, 1000);
        }
    });
}

// ===== FUNCIÓN 24: SETUP DASHBOARD AUTO REFRESH =====
function setupDashboardAutoRefresh() {
    console.log('⚡ FUNCIÓN 24: Setup Dashboard Auto Refresh');
    
    // Clear existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Set new interval (every 2 minutes)
    refreshInterval = setInterval(async () => {
        if (!document.hidden) {
            console.log('🔄 Auto-refreshing dashboard');
            await refreshDashboard();
        }
    }, 120000);
}

// ===== FUNCIÓN 25: REFRESH DASHBOARD =====
async function refreshDashboard() {
    try {
        console.log('⚡ FUNCIÓN 25: Refresh Dashboard');
        
        const startTime = performance.now();
        
        // Show loading state
        showDashboardLoading(true);
        
        // Reload data
        await loadDashboardData();
        
        // Re-render components
        await renderDashboardComponents();
        
        // Hide loading state
        hideDashboardLoading();
        
        const refreshTime = performance.now() - startTime;
        performanceMetrics.lastRefresh = new Date().toISOString();
        
        console.log(`✅ Dashboard refreshed in ${refreshTime.toFixed(2)}ms`);
        showNotification('📊 Dashboard actualizado', 'success', 1500);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 25 ERROR - Error refreshing dashboard:', error);
        hideDashboardLoading();
        showNotification('❌ Error actualizando dashboard', 'error');
    }
}

// ===== FUNCIÓN 26: SHOW DASHBOARD LOADING =====
function showDashboardLoading(isRefresh = false) {
    console.log('⚡ FUNCIÓN 26: Show Dashboard Loading');
    
    const containers = [
        'teamActivityOverview',
        'individualSalespeopleActivity',
        'recentTeamActivity'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            if (isRefresh) {
                container.style.opacity = '0.6';
            } else {
                container.innerHTML = `
                    <div style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 200px;
                        color: #6b7280;
                    ">
                        <div style="text-align: center;">
                            <div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 1rem;"></div>
                            <div>Cargando dashboard...</div>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// ===== FUNCIÓN 27: HIDE DASHBOARD LOADING =====
function hideDashboardLoading() {
    console.log('⚡ FUNCIÓN 27: Hide Dashboard Loading');
    
    const containers = [
        'teamActivityOverview',
        'individualSalespeopleActivity',
        'recentTeamActivity'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.opacity = '1';
        }
    });
}

// ===== FUNCIÓN 28: SHOW DASHBOARD ERROR =====
function showDashboardError(message) {
    console.log('⚡ FUNCIÓN 28: Show Dashboard Error');
    
    const containers = [
        'teamActivityOverview',
        'individualSalespeopleActivity',
        'recentTeamActivity'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    text-align: center;
                    color: #ef4444;
                ">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin: 0 0 1rem 0; color: #dc2626;">Error en Dashboard</h3>
                    <p style="margin: 0 0 1rem 0; color: #6b7280;">${message}</p>
                    <button onclick="refreshDashboard()" class="btn btn-primary">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    });
}

// ===== FUNCIÓN 29: VIEW SALESPERSON DETAILS =====
async function viewSalespersonDetails(salespersonId) {
    try {
        console.log('⚡ FUNCIÓN 29: View Salesperson Details');
        
        const salesperson = dashboardData.salespeople.find(s => s.uid === salespersonId);
        if (!salesperson) {
            showNotification('❌ Vendedor no encontrado', 'error');
            return;
        }
        
        // Get detailed data
        const userContacts = await window.FirebaseData.getAllContacts();
        const salesPersonContacts = userContacts.filter(c => c.salespersonId === salespersonId);
        
        // Create detailed modal (implementation would go here)
        alert(`📊 DETALLES DE ${salesperson.name.toUpperCase()}:

📞 Contactos totales: ${salesperson.totalContacts}
📅 Contactos hoy: ${salesperson.todayContacts}/10
📈 Esta semana: ${salesperson.weekContacts}
💰 Conversiones: ${salesperson.conversions}
📊 Tasa conversión: ${salesperson.conversionRate}%
⭐ Score promedio: ${salesperson.avgLeadScore}

🎯 Progreso meta diaria: ${salesperson.dailyProgress}%
📧 Email: ${salesperson.email}

${salesPersonContacts.length > 0 ? 
    `\n📋 ÚLTIMOS 3 CONTACTOS:\n${salesPersonContacts.slice(0, 3).map(c => `• ${c.name} (${c.status})`).join('\n')}` : 
    ''}`);
        
    } catch (error) {
        console.error('❌ FUNCIÓN 29 ERROR - Error viewing salesperson details:', error);
        showNotification('❌ Error al mostrar detalles', 'error');
    }
}

// ===== FUNCIÓN 30: SEND MOTIVATIONAL MESSAGE =====
async function sendMotivationalMessage(salespersonId) {
    try {
        console.log('⚡ FUNCIÓN 30: Send Motivational Message');
        
        const salesperson = dashboardData.salespeople.find(s => s.uid === salespersonId);
        if (!salesperson) {
            showNotification('❌ Vendedor no encontrado', 'error');
            return;
        }
        
        const messages = [
            `¡Hola ${salesperson.name}! 🌟 Vas muy bien con ${salesperson.todayContacts} contactos hoy. ¡Sigue así!`,
            `💪 ${salesperson.name}, tu esfuerzo se nota. ${salesperson.conversions} conversiones es genial!`,
            `🎯 ¡${salesperson.name}! Estás al ${salesperson.dailyProgress}% de tu meta diaria. ¡Tú puedes!`,
            `⚡ ${salesperson.name}, tu tasa de conversión del ${salesperson.conversionRate}% es impresionante!`,
            `🚀 ¡Vamos ${salesperson.name}! El equipo cuenta contigo para alcanzar nuestras metas.`
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // In a real implementation, this would send via WhatsApp, email, or internal messaging
        const confirmed = confirm(`💬 MENSAJE MOTIVACIONAL PARA ${salesperson.name}:

${randomMessage}

¿Enviar este mensaje?`);
        
        if (confirmed) {
            // Simulate sending
            showNotification(`📨 Mensaje enviado a ${salesperson.name}`, 'success');
            console.log('📨 Motivational message sent to:', salesperson.name);
        }
        
    } catch (error) {
        console.error('❌ FUNCIÓN 30 ERROR - Error sending motivational message:', error);
        showNotification('❌ Error al enviar mensaje', 'error');
    }
}

// ===== UTILITY FUNCTIONS =====

function getWeekRange() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

function getMonthRange() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// ===== INITIALIZATION =====

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Director dashboard module loaded');
    
    // Wait for dependencies
    const initWhenReady = () => {
        if (window.FirebaseData && window.AdminData) {
            setTimeout(initializeDirectorDashboard, 2000);
        } else {
            setTimeout(initWhenReady, 1000);
        }
    };
    
    initWhenReady();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

console.log('✅ Director-dashboard.js Enhanced loaded with 30 organized functions');
