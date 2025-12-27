// class-progress.js - Class Progress Tracking Module
console.log('📚 Loading Class Progress module...');

// Class Progress Manager
class ClassProgressManager {
    constructor() {
        this.progressRecords = new Map();
        this.initialized = false;

        // Colombian Holidays 2025 (Festivos Colombia)
        this.holidays2025 = {
            '2025-01-01': { name: 'Año Nuevo', type: 'national' },
            '2025-01-06': { name: 'Día de los Reyes Magos', type: 'national' },
            '2025-03-24': { name: 'Día de San José', type: 'national' },
            '2025-04-13': { name: 'Domingo de Ramos', type: 'religious' },
            '2025-04-17': { name: 'Jueves Santo', type: 'national' },
            '2025-04-18': { name: 'Viernes Santo', type: 'national' },
            '2025-04-20': { name: 'Domingo de Resurrección', type: 'religious' },
            '2025-05-01': { name: 'Día del Trabajo', type: 'national' },
            '2025-06-02': { name: 'Día de la Ascensión', type: 'national' },
            '2025-06-23': { name: 'Corpus Christi', type: 'national' },
            '2025-06-30': { name: 'Sagrado Corazón de Jesús', type: 'national' },
            '2025-06-30': { name: 'San Pedro y San Pablo', type: 'national' },
            '2025-07-20': { name: 'Día de la Independencia', type: 'national' },
            '2025-08-07': { name: 'Batalla de Boyacá', type: 'national' },
            '2025-08-18': { name: 'Asunción de la Virgen', type: 'national' },
            '2025-10-13': { name: 'Día de la Raza', type: 'national' },
            '2025-11-03': { name: 'Todos los Santos', type: 'national' },
            '2025-11-17': { name: 'Independencia de Cartagena', type: 'national' },
            '2025-12-08': { name: 'Inmaculada Concepción', type: 'national' },
            '2025-12-25': { name: 'Navidad', type: 'national' }
        };

        // Vacation periods
        this.vacationPeriods = [
            { start: '2025-12-15', end: '2026-01-15', name: 'Vacaciones de Navidad' },
            { start: '2025-06-15', end: '2025-07-15', name: 'Vacaciones de Mitad de Año' }
        ];

        // Schedule types configuration
        this.scheduleTypes = {
            intensive: {
                name: 'Intensivo (3 días)',
                daysPerWeek: 3,
                hoursPerDay: 2,
                unitsPerClass: 2,
                unitsPerWeek: 6,
                description: 'Lunes, Miércoles, Viernes - 2 horas'
            },
            regular: {
                name: 'Regular (2 días)',
                daysPerWeek: 2,
                hoursPerDay: 2,
                unitsPerClass: 2,
                unitsPerWeek: 4,
                description: 'Martes, Jueves - 2 horas'
            },
            weekend: {
                name: 'Fin de Semana',
                daysPerWeek: 1,
                hoursPerDay: 4,
                unitsPerClass: 4,
                unitsPerWeek: 4,
                description: 'Sábado - 4 horas'
            }
        };

        // Unit sections that make up a complete unit
        this.unitSections = [
            { id: 'qa', name: 'Q&A Practice', icon: '❓' },
            { id: 'grammarHeaven', name: 'Grammar Heaven', icon: '📖' },
            { id: 'exercises', name: 'Exercises', icon: '✏️' },
            { id: 'vocabulary', name: 'Vocabulary', icon: '📝' }
        ];

        // Incomplete reasons
        this.incompleteReasons = [
            { value: 'students_needed_practice', label: 'Estudiantes necesitaron más práctica' },
            { value: 'many_questions', label: 'Muchas preguntas de los estudiantes' },
            { value: 'technical_issues', label: 'Problemas técnicos' },
            { value: 'late_start', label: 'Inicio tardío' },
            { value: 'student_absences', label: 'Ausencias de estudiantes' },
            { value: 'review_needed', label: 'Repaso de unidades anteriores' },
            { value: 'other', label: 'Otro (especificar en notas)' }
        ];

        // Books configuration
        this.books = {
            1: { name: 'Book 1 - A1 Beginner', totalUnits: 52 },
            2: { name: 'Book 2 - A2 Elementary', totalUnits: 52 },
            3: { name: 'Book 3 - B1 Intermediate', totalUnits: 52 },
            4: { name: 'Book 4 - B1+ Upper Intermediate', totalUnits: 52 },
            5: { name: 'Book 5 - B2 Advanced', totalUnits: 52 }
        };
    }

    // Initialize
    async init(forceReload = false) {
        if (this.initialized && !forceReload) return;
        console.log('🚀 Initializing Class Progress manager');
        await this.loadProgressRecords();
        this.initialized = true;
    }

    // Load progress records from Firebase
    async loadProgressRecords() {
        try {
            this.progressRecords.clear();

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'classProgress');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([groupId, dates]) => {
                    if (!this.progressRecords.has(groupId)) {
                        this.progressRecords.set(groupId, new Map());
                    }
                    Object.entries(dates).forEach(([date, record]) => {
                        this.progressRecords.get(groupId).set(date, record);
                    });
                });
            }

            console.log(`✅ Loaded progress records for ${this.progressRecords.size} groups`);
        } catch (error) {
            console.error('❌ Error loading progress records:', error);
        }
    }

    // Save progress record
    async saveProgressRecord(groupId, date, progressData) {
        try {
            const record = {
                ...progressData,
                groupId,
                date,
                updatedAt: new Date().toISOString(),
                createdAt: progressData.createdAt || new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `classProgress/${groupId}/${date}`);
            await db.set(ref, record);

            // Update local cache
            if (!this.progressRecords.has(groupId)) {
                this.progressRecords.set(groupId, new Map());
            }
            this.progressRecords.get(groupId).set(date, record);

            console.log('✅ Progress record saved:', groupId, date);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Progreso de clase registrado',
                    'classProgress',
                    `${groupId}-${date}`,
                    `Grupo ${groupId} - ${date} - Unidades: ${progressData.unitsCovered?.map(u => u.unit).join(', ') || 'N/A'}`,
                    { after: record }
                );
            }

            return record;
        } catch (error) {
            console.error('❌ Error saving progress record:', error);
            throw error;
        }
    }

    // Delete progress record
    async deleteProgressRecord(groupId, date) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `classProgress/${groupId}/${date}`);
            await db.remove(ref);

            if (this.progressRecords.has(groupId)) {
                this.progressRecords.get(groupId).delete(date);
            }

            console.log('✅ Progress record deleted:', groupId, date);
        } catch (error) {
            console.error('❌ Error deleting progress record:', error);
            throw error;
        }
    }

    // Get progress for a specific group
    getGroupProgress(groupId) {
        return this.progressRecords.get(groupId) || new Map();
    }

    // Get all progress records for a date
    getProgressByDate(date) {
        const results = [];
        this.progressRecords.forEach((dates, groupId) => {
            if (dates.has(date)) {
                results.push({ groupId, ...dates.get(date) });
            }
        });
        return results;
    }

    // Get current unit for a group
    getCurrentUnit(groupId) {
        const groupProgress = this.getGroupProgress(groupId);
        if (groupProgress.size === 0) return 1;

        let maxUnit = 0;
        groupProgress.forEach(record => {
            if (record.unitsCovered) {
                record.unitsCovered.forEach(uc => {
                    if (uc.unit > maxUnit) maxUnit = uc.unit;
                });
            }
        });

        return maxUnit || 1;
    }

    // Check if a date is a holiday
    isHoliday(dateStr) {
        return this.holidays2025[dateStr] || null;
    }

    // Check if a date is in vacation period
    isVacation(dateStr) {
        const date = new Date(dateStr);
        for (const period of this.vacationPeriods) {
            const start = new Date(period.start);
            const end = new Date(period.end);
            if (date >= start && date <= end) {
                return period;
            }
        }
        return null;
    }

    // Get expected progress for a group based on start date and schedule
    getExpectedProgress(groupId, group) {
        if (!group) return null;

        const startDate = new Date(group.startDate || '2025-01-01');
        const today = new Date();
        const scheduleType = this.scheduleTypes[group.scheduleType] || this.scheduleTypes.regular;

        // Count class days between start and today (excluding holidays and vacations)
        let classDays = 0;
        let currentDate = new Date(startDate);

        const scheduleDays = this.getScheduleDays(group.days);

        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();

            if (scheduleDays.includes(dayOfWeek) && !this.isHoliday(dateStr) && !this.isVacation(dateStr)) {
                classDays++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        const expectedUnits = classDays * scheduleType.unitsPerClass;
        const actualUnit = this.getCurrentUnit(groupId);

        return {
            expectedUnits,
            actualUnit,
            difference: actualUnit - expectedUnits,
            status: actualUnit >= expectedUnits ? 'on_track' : 'behind',
            classDaysHeld: classDays
        };
    }

    // Convert day names to day numbers (0=Sunday, 1=Monday, etc)
    getScheduleDays(daysArray) {
        if (!daysArray) return [];
        const dayMap = {
            'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
            'Jueves': 4, 'Viernes': 5, 'Sábado': 6
        };
        return daysArray.map(d => dayMap[d]).filter(d => d !== undefined);
    }

    // Get teacher's groups
    getTeacherGroups(teacherId) {
        if (!window.GroupsManager2) return [];
        return Array.from(window.GroupsManager2.groups.values())
            .filter(g => g.teacherId === teacherId && g.status === 'active');
    }

    // Get all active groups with progress info
    getAllGroupsWithProgress() {
        if (!window.GroupsManager2) return [];

        return Array.from(window.GroupsManager2.groups.entries()).map(([id, group]) => {
            const currentUnit = this.getCurrentUnit(id);
            const book = this.books[group.book] || { totalUnits: 52 };
            const progressPercent = Math.round((currentUnit / book.totalUnits) * 100);

            return {
                ...group,
                groupId: id,
                currentUnit,
                totalUnits: book.totalUnits,
                progressPercent,
                expectedProgress: this.getExpectedProgress(id, group)
            };
        });
    }

    // Get classes scheduled for a specific date
    getClassesForDate(dateStr) {
        if (!window.GroupsManager2) return [];

        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = dayNames[dayOfWeek];

        // Check if it's a holiday
        const holiday = this.isHoliday(dateStr);
        if (holiday) {
            return { holiday, classes: [] };
        }

        // Check if it's vacation
        const vacation = this.isVacation(dateStr);
        if (vacation) {
            return { vacation, classes: [] };
        }

        // Get groups scheduled for this day
        const classes = Array.from(window.GroupsManager2.groups.entries())
            .filter(([id, group]) => {
                return group.status === 'active' &&
                       group.days &&
                       group.days.includes(dayName);
            })
            .map(([id, group]) => {
                const progress = this.getGroupProgress(id);
                const todayProgress = progress.get(dateStr);
                const currentUnit = this.getCurrentUnit(id);

                return {
                    groupId: id,
                    ...group,
                    currentUnit,
                    todayProgress,
                    status: todayProgress ?
                        (todayProgress.completedExpected ? 'completed' : 'partial') :
                        'pending'
                };
            })
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        return { classes };
    }

    // Generate calendar data for a month
    getMonthCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // Add empty days for the start of the month
        const startPadding = firstDay.getDay();
        for (let i = 0; i < startPadding; i++) {
            days.push({ empty: true });
        }

        // Add each day of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const classesData = this.getClassesForDate(dateStr);

            days.push({
                day,
                date: dateStr,
                dayOfWeek: date.getDay(),
                holiday: classesData.holiday,
                vacation: classesData.vacation,
                classes: classesData.classes || [],
                classCount: (classesData.classes || []).length,
                completedCount: (classesData.classes || []).filter(c => c.status === 'completed').length
            });
        }

        return {
            year,
            month,
            monthName: new Date(year, month).toLocaleString('es-ES', { month: 'long' }),
            days
        };
    }

    // Get weekly summary
    getWeeklySummary(startDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        let totalClasses = 0;
        let completedClasses = 0;
        let totalUnits = 0;
        const dailyStats = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const classesData = this.getClassesForDate(dateStr);

            if (classesData.classes) {
                const dayClasses = classesData.classes.length;
                const dayCompleted = classesData.classes.filter(c => c.status === 'completed').length;
                let dayUnits = 0;

                classesData.classes.forEach(c => {
                    if (c.todayProgress && c.todayProgress.unitsCovered) {
                        dayUnits += c.todayProgress.unitsCovered.length;
                    }
                });

                totalClasses += dayClasses;
                completedClasses += dayCompleted;
                totalUnits += dayUnits;

                dailyStats.push({
                    date: dateStr,
                    dayName: d.toLocaleString('es-ES', { weekday: 'short' }),
                    classes: dayClasses,
                    completed: dayCompleted,
                    units: dayUnits,
                    holiday: classesData.holiday,
                    vacation: classesData.vacation
                });
            }
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            totalClasses,
            completedClasses,
            completionRate: totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0,
            totalUnits,
            dailyStats
        };
    }

    // Get teacher performance stats
    getTeacherStats(teacherId, startDate, endDate) {
        const teacherGroups = this.getTeacherGroups(teacherId);
        let totalClasses = 0;
        let totalUnits = 0;
        let onTrackGroups = 0;

        teacherGroups.forEach(group => {
            const progress = this.getGroupProgress(group.groupId);
            progress.forEach((record, date) => {
                if (date >= startDate && date <= endDate) {
                    totalClasses++;
                    if (record.unitsCovered) {
                        totalUnits += record.unitsCovered.length;
                    }
                }
            });

            const expected = this.getExpectedProgress(group.groupId, group);
            if (expected && expected.status === 'on_track') {
                onTrackGroups++;
            }
        });

        return {
            teacherId,
            groupCount: teacherGroups.length,
            totalClasses,
            totalUnits,
            averageUnitsPerClass: totalClasses > 0 ? (totalUnits / totalClasses).toFixed(1) : 0,
            onTrackGroups,
            onTrackPercentage: teacherGroups.length > 0 ?
                Math.round((onTrackGroups / teacherGroups.length) * 100) : 0
        };
    }

    // Get groups that are behind schedule
    getBehindGroups() {
        return this.getAllGroupsWithProgress()
            .filter(g => g.expectedProgress && g.expectedProgress.status === 'behind')
            .sort((a, b) => a.expectedProgress.difference - b.expectedProgress.difference);
    }

    // Get today's alerts
    getTodayAlerts() {
        const alerts = [];
        const today = new Date().toISOString().split('T')[0];

        // Check for behind groups
        const behindGroups = this.getBehindGroups();
        behindGroups.forEach(group => {
            alerts.push({
                type: 'warning',
                icon: '⚠️',
                message: `Grupo ${group.groupId} está ${Math.abs(group.expectedProgress.difference)} unidades atrasado`,
                groupId: group.groupId
            });
        });

        // Check for missing progress entries from yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const yesterdayClasses = this.getClassesForDate(yesterdayStr);

        if (yesterdayClasses.classes) {
            yesterdayClasses.classes.forEach(c => {
                if (c.status === 'pending') {
                    alerts.push({
                        type: 'error',
                        icon: '❌',
                        message: `Grupo ${c.groupId} - Sin registro de progreso para ${yesterdayStr}`,
                        groupId: c.groupId,
                        date: yesterdayStr
                    });
                }
            });
        }

        // Check for upcoming holidays
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        for (let d = new Date(); d <= nextWeek; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const holiday = this.isHoliday(dateStr);
            if (holiday && dateStr !== today) {
                alerts.push({
                    type: 'info',
                    icon: '🔴',
                    message: `Festivo próximo: ${holiday.name} (${dateStr})`,
                    date: dateStr
                });
            }
        }

        return alerts;
    }
}

// ============================================================================
// UI RENDERING FUNCTIONS
// ============================================================================

// Render the main Class Progress tab
function renderClassProgressTab() {
    const container = document.getElementById('classProgress');
    if (!container) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    container.innerHTML = `
        <div class="class-progress-container">
            <!-- Header -->
            <div class="cp-header">
                <h2>📚 Seguimiento de Progreso por Clases</h2>
                <div class="cp-header-actions">
                    <button class="btn btn-primary" onclick="showNewProgressEntryModal()">
                        ➕ Registrar Progreso
                    </button>
                    <button class="btn btn-secondary" onclick="exportProgressReport()">
                        📥 Exportar
                    </button>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="cp-stats-grid" id="cpStatsGrid">
                <!-- Will be populated -->
            </div>

            <!-- Alerts -->
            <div class="cp-alerts" id="cpAlerts">
                <!-- Will be populated -->
            </div>

            <!-- Sub-tabs -->
            <div class="cp-subtabs">
                <button class="cp-subtab active" onclick="switchClassProgressView('today')" id="cpTodayTab">
                    📅 Hoy
                </button>
                <button class="cp-subtab" onclick="switchClassProgressView('calendar')" id="cpCalendarTab">
                    🗓️ Calendario
                </button>
                <button class="cp-subtab" onclick="switchClassProgressView('groups')" id="cpGroupsTab">
                    👥 Grupos
                </button>
                <button class="cp-subtab" onclick="switchClassProgressView('teachers')" id="cpTeachersTab">
                    👨‍🏫 Profesores
                </button>
                <button class="cp-subtab" onclick="switchClassProgressView('reports')" id="cpReportsTab">
                    📊 Reportes
                </button>
            </div>

            <!-- Content Area -->
            <div class="cp-content" id="cpContent">
                <!-- Will be populated based on selected subtab -->
            </div>
        </div>
    `;

    // Load initial data
    loadClassProgressStats();
    loadClassProgressAlerts();
    switchClassProgressView('today');
}

// Load stats cards
function loadClassProgressStats() {
    const container = document.getElementById('cpStatsGrid');
    if (!container || !window.ClassProgressManager) return;

    // Check if managers are ready
    const groupsReady = window.GroupsManager2 && window.GroupsManager2.initialized;
    const teachersReady = window.TeacherManager && window.TeacherManager.initialized;

    if (!groupsReady || !teachersReady) {
        container.innerHTML = `
            <div class="cp-stat-card">
                <div class="cp-stat-icon">⏳</div>
                <div class="cp-stat-number">...</div>
                <div class="cp-stat-label">Cargando datos...</div>
            </div>
        `;
        return;
    }

    const allGroups = window.ClassProgressManager.getAllGroupsWithProgress();
    const activeGroups = allGroups.filter(g => g.status === 'active');
    const behindGroups = allGroups.filter(g => g.expectedProgress?.status === 'behind');
    const onTrackGroups = allGroups.filter(g => g.expectedProgress?.status === 'on_track');

    // Get today's classes
    const today = new Date().toISOString().split('T')[0];
    const todayClasses = window.ClassProgressManager.getClassesForDate(today);
    const todayCount = todayClasses.classes?.length || 0;
    const todayCompleted = todayClasses.classes?.filter(c => c.status === 'completed').length || 0;

    // Get teacher count
    const teacherCount = window.TeacherManager?.teachers?.size || 0;
    const activeTeachers = Array.from(window.TeacherManager?.teachers?.values() || [])
        .filter(t => t.status === 'active').length;

    container.innerHTML = `
        <div class="cp-stat-card">
            <div class="cp-stat-icon">👥</div>
            <div class="cp-stat-number">${activeGroups.length}</div>
            <div class="cp-stat-label">Grupos Activos</div>
        </div>
        <div class="cp-stat-card">
            <div class="cp-stat-icon">👨‍🏫</div>
            <div class="cp-stat-number">${activeTeachers}</div>
            <div class="cp-stat-label">Profesores</div>
        </div>
        <div class="cp-stat-card">
            <div class="cp-stat-icon">📅</div>
            <div class="cp-stat-number">${todayCompleted}/${todayCount}</div>
            <div class="cp-stat-label">Clases Hoy</div>
        </div>
        <div class="cp-stat-card success">
            <div class="cp-stat-icon">✅</div>
            <div class="cp-stat-number">${onTrackGroups.length}</div>
            <div class="cp-stat-label">Al Día</div>
        </div>
        <div class="cp-stat-card warning">
            <div class="cp-stat-icon">⚠️</div>
            <div class="cp-stat-number">${behindGroups.length}</div>
            <div class="cp-stat-label">Atrasados</div>
        </div>
    `;
}

// Load alerts
function loadClassProgressAlerts() {
    const container = document.getElementById('cpAlerts');
    if (!container || !window.ClassProgressManager) return;

    const alerts = window.ClassProgressManager.getTodayAlerts();

    if (alerts.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="cp-alerts-header">
            <span>⚠️ Alertas (${alerts.length})</span>
            <button class="btn-link" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
                Mostrar/Ocultar
            </button>
        </div>
        <div class="cp-alerts-list">
            ${alerts.map(alert => `
                <div class="cp-alert cp-alert-${alert.type}">
                    <span class="cp-alert-icon">${alert.icon}</span>
                    <span class="cp-alert-message">${alert.message}</span>
                    ${alert.groupId ? `
                        <button class="btn-small" onclick="viewGroupProgress('${alert.groupId}')">
                            Ver
                        </button>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// Switch between sub-views
function switchClassProgressView(view) {
    // Update tab active state
    document.querySelectorAll('.cp-subtab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(`cp${view.charAt(0).toUpperCase() + view.slice(1)}Tab`);
    if (activeTab) activeTab.classList.add('active');

    const content = document.getElementById('cpContent');
    if (!content) return;

    switch (view) {
        case 'today':
            cpRenderTodayView(content);
            break;
        case 'calendar':
            cpRenderCalendarView(content);
            break;
        case 'groups':
            cpRenderGroupsView(content);
            break;
        case 'teachers':
            cpRenderTeachersView(content);
            break;
        case 'reports':
            cpRenderReportsView(content);
            break;
    }
}

// Render Today's View (prefixed to avoid conflicts)
function cpRenderTodayView(container) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayClasses = window.ClassProgressManager.getClassesForDate(todayStr);

    // Check for holiday or vacation
    if (todayClasses.holiday) {
        container.innerHTML = `
            <div class="cp-holiday-notice">
                <div class="cp-holiday-icon">🔴</div>
                <h3>${todayClasses.holiday.name}</h3>
                <p>Hoy es festivo - No hay clases programadas</p>
            </div>
        `;
        return;
    }

    if (todayClasses.vacation) {
        container.innerHTML = `
            <div class="cp-vacation-notice">
                <div class="cp-vacation-icon">🏖️</div>
                <h3>${todayClasses.vacation.name}</h3>
                <p>Periodo de vacaciones - No hay clases</p>
            </div>
        `;
        return;
    }

    const classes = todayClasses.classes || [];

    container.innerHTML = `
        <div class="cp-today-header">
            <h3>📅 Clases de Hoy - ${today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        </div>

        ${classes.length === 0 ? `
            <div class="cp-no-classes">
                <p>No hay clases programadas para hoy</p>
            </div>
        ` : `
            <div class="cp-classes-list">
                ${classes.map(c => renderClassCard(c, todayStr)).join('')}
            </div>
        `}
    `;
}

// Render a class card
function renderClassCard(classData, date) {
    const teacher = window.TeacherManager?.teachers.get(classData.teacherId);
    const teacherName = teacher?.name || 'Sin asignar';
    const book = window.ClassProgressManager.books[classData.book] || { name: `Book ${classData.book}` };

    const statusColors = {
        'completed': { bg: '#dcfce7', border: '#22c55e', text: '✅ Completado' },
        'partial': { bg: '#fef9c3', border: '#eab308', text: '⚠️ Parcial' },
        'pending': { bg: '#f3f4f6', border: '#9ca3af', text: '⬜ Pendiente' }
    };
    const status = statusColors[classData.status] || statusColors.pending;

    return `
        <div class="cp-class-card" style="border-left: 4px solid ${status.border}; background: ${status.bg}">
            <div class="cp-class-header">
                <div class="cp-class-group">
                    <span class="cp-group-id">Grupo ${classData.groupId}</span>
                    <span class="cp-book-name">${book.name}</span>
                </div>
                <div class="cp-class-status">${status.text}</div>
            </div>

            <div class="cp-class-details">
                <div class="cp-class-info">
                    <span>👨‍🏫 ${teacherName}</span>
                    <span>🕐 ${classData.startTime || 'N/A'} - ${classData.endTime || 'N/A'}</span>
                    <span>📍 ${classData.room || 'N/A'}</span>
                </div>
                <div class="cp-class-progress">
                    <span>📚 Unidad actual: ${classData.currentUnit}</span>
                    ${classData.todayProgress ? `
                        <span>✅ Hoy: Unidades ${classData.todayProgress.unitsCovered?.map(u => u.unit).join(', ') || 'N/A'}</span>
                    ` : ''}
                </div>
            </div>

            <div class="cp-class-actions">
                ${classData.status === 'pending' ? `
                    <button class="btn btn-primary btn-small" onclick="showProgressEntryModal('${classData.groupId}', '${date}')">
                        📝 Registrar Progreso
                    </button>
                ` : `
                    <button class="btn btn-secondary btn-small" onclick="viewProgressDetails('${classData.groupId}', '${date}')">
                        👁️ Ver Detalles
                    </button>
                    <button class="btn btn-warning btn-small" onclick="editProgressEntry('${classData.groupId}', '${date}')">
                        ✏️ Editar
                    </button>
                `}
            </div>
        </div>
    `;
}

// Render Calendar View (prefixed to avoid conflicts)
function cpRenderCalendarView(container) {
    const today = new Date();
    // Use currentCalendarDate for navigation, not today
    const displayYear = currentCalendarDate.getFullYear();
    const displayMonth = currentCalendarDate.getMonth();

    const calendar = window.ClassProgressManager.getMonthCalendar(displayYear, displayMonth);

    container.innerHTML = `
        <div class="cp-calendar-header">
            <button class="btn btn-secondary" onclick="changeCalendarMonth(-1)">◀ Anterior</button>
            <h3 id="cpCalendarTitle">${calendar.monthName.charAt(0).toUpperCase() + calendar.monthName.slice(1)} ${calendar.year}</h3>
            <button class="btn btn-secondary" onclick="changeCalendarMonth(1)">Siguiente ▶</button>
        </div>

        <div class="cp-calendar-grid">
            <div class="cp-calendar-day-header">Dom</div>
            <div class="cp-calendar-day-header">Lun</div>
            <div class="cp-calendar-day-header">Mar</div>
            <div class="cp-calendar-day-header">Mié</div>
            <div class="cp-calendar-day-header">Jue</div>
            <div class="cp-calendar-day-header">Vie</div>
            <div class="cp-calendar-day-header">Sáb</div>

            ${calendar.days.map(day => {
                if (day.empty) {
                    return '<div class="cp-calendar-day empty"></div>';
                }

                const isToday = day.date === today.toISOString().split('T')[0];
                const isHoliday = day.holiday;
                const isVacation = day.vacation;

                return `
                    <div class="cp-calendar-day ${isToday ? 'today' : ''} ${isHoliday ? 'holiday' : ''} ${isVacation ? 'vacation' : ''}"
                         onclick="viewDayDetails('${day.date}')">
                        <div class="cp-day-number">${day.day}</div>
                        ${isHoliday ? `<div class="cp-day-holiday">🔴</div>` : ''}
                        ${isVacation ? `<div class="cp-day-vacation">🏖️</div>` : ''}
                        ${day.classCount > 0 ? `
                            <div class="cp-day-classes">
                                ${day.completedCount}/${day.classCount} 📚
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Legend -->
        <div class="cp-calendar-legend">
            <span><span class="legend-dot today"></span> Hoy</span>
            <span><span class="legend-dot holiday"></span> Festivo</span>
            <span><span class="legend-dot vacation"></span> Vacaciones</span>
            <span>📚 Clases completadas/total</span>
        </div>
    `;
}

// Render Groups View (prefixed to avoid conflicts)
function cpRenderGroupsView(container) {
    const groups = window.ClassProgressManager.getAllGroupsWithProgress()
        .filter(g => g.status === 'active')
        .sort((a, b) => a.groupId - b.groupId);

    container.innerHTML = `
        <div class="cp-groups-header">
            <h3>👥 Progreso por Grupos</h3>
            <div class="cp-groups-filters">
                <select id="cpGroupsFilter" onchange="filterGroupsView()">
                    <option value="all">Todos</option>
                    <option value="on_track">Al día</option>
                    <option value="behind">Atrasados</option>
                </select>
                <select id="cpModalityFilter" onchange="filterGroupsView()">
                    <option value="all">Todas las modalidades</option>
                    <option value="CB">Ciudad Bilingüe</option>
                    <option value="COATS">COATS</option>
                    <option value="NAZARETH">Nazareth</option>
                    <option value="PRIVADO">Privado</option>
                    <option value="ONLINE">Online</option>
                </select>
            </div>
        </div>

        <div class="cp-groups-table-container">
            <table class="cp-groups-table">
                <thead>
                    <tr>
                        <th>Grupo</th>
                        <th>Libro</th>
                        <th>Profesor</th>
                        <th>Horario</th>
                        <th>Progreso</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="cpGroupsTableBody">
                    ${groups.map(g => renderGroupRow(g)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Render a group row
function renderGroupRow(group) {
    const teacher = window.TeacherManager?.teachers.get(group.teacherId);
    const teacherName = teacher?.name || 'Sin asignar';
    const book = window.ClassProgressManager.books[group.book] || { name: `Book ${group.book}`, totalUnits: 52 };

    const expected = group.expectedProgress;
    const status = expected?.status || 'unknown';
    const diff = expected?.difference || 0;

    const statusDisplay = {
        'on_track': { class: 'success', text: '✅ Al día' },
        'behind': { class: 'warning', text: `⚠️ ${Math.abs(diff)} atrás` },
        'unknown': { class: '', text: '—' }
    };
    const statusInfo = statusDisplay[status] || statusDisplay.unknown;

    return `
        <tr data-status="${status}" data-modality="${group.modality}">
            <td>
                <strong>Grupo ${group.groupId}</strong>
                <br><small>${group.modality}</small>
            </td>
            <td>${book.name}</td>
            <td>${teacherName}</td>
            <td>
                <small>${group.daysShort || group.days?.join(', ') || 'N/A'}</small>
                <br><small>${group.startTime || 'N/A'}</small>
            </td>
            <td>
                <div class="cp-progress-bar">
                    <div class="cp-progress-fill" style="width: ${group.progressPercent}%"></div>
                </div>
                <small>${group.currentUnit}/${book.totalUnits} (${group.progressPercent}%)</small>
            </td>
            <td class="${statusInfo.class}">${statusInfo.text}</td>
            <td>
                <button class="btn btn-small" onclick="viewGroupProgress('${group.groupId}')">
                    📊 Ver
                </button>
            </td>
        </tr>
    `;
}

// Render Teachers View (prefixed to avoid conflicts with teachers.js)
function cpRenderTeachersView(container) {
    if (!window.TeacherManager) {
        container.innerHTML = '<p>Error: TeacherManager no disponible</p>';
        return;
    }

    const teachers = Array.from(window.TeacherManager.teachers.values())
        .filter(t => t.status === 'active');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    container.innerHTML = `
        <div class="cp-teachers-header">
            <h3>👨‍🏫 Rendimiento de Profesores</h3>
            <div class="cp-date-range">
                <label>Período:</label>
                <input type="date" id="cpTeacherStartDate" value="${startOfMonth}" onchange="updateTeacherStats()">
                <span>a</span>
                <input type="date" id="cpTeacherEndDate" value="${endOfMonth}" onchange="updateTeacherStats()">
            </div>
        </div>

        <div class="cp-teachers-grid" id="cpTeachersGrid">
            ${teachers.map(t => renderTeacherCard(t, startOfMonth, endOfMonth)).join('')}
        </div>
    `;
}

// Render teacher card
function renderTeacherCard(teacher, startDate, endDate) {
    const stats = window.ClassProgressManager.getTeacherStats(teacher.id, startDate, endDate);
    const groups = window.ClassProgressManager.getTeacherGroups(teacher.id);

    return `
        <div class="cp-teacher-card">
            <div class="cp-teacher-header">
                <div class="cp-teacher-avatar">👨‍🏫</div>
                <div class="cp-teacher-info">
                    <h4>${teacher.name}</h4>
                    <small>${groups.length} grupo(s)</small>
                </div>
            </div>

            <div class="cp-teacher-stats">
                <div class="cp-teacher-stat">
                    <span class="cp-stat-value">${stats.totalClasses}</span>
                    <span class="cp-stat-label">Clases</span>
                </div>
                <div class="cp-teacher-stat">
                    <span class="cp-stat-value">${stats.totalUnits}</span>
                    <span class="cp-stat-label">Unidades</span>
                </div>
                <div class="cp-teacher-stat">
                    <span class="cp-stat-value">${stats.averageUnitsPerClass}</span>
                    <span class="cp-stat-label">Prom/Clase</span>
                </div>
                <div class="cp-teacher-stat ${stats.onTrackPercentage >= 80 ? 'success' : 'warning'}">
                    <span class="cp-stat-value">${stats.onTrackPercentage}%</span>
                    <span class="cp-stat-label">Al día</span>
                </div>
            </div>

            <div class="cp-teacher-groups">
                <small>Grupos: ${groups.map(g => g.groupId).join(', ') || 'Ninguno'}</small>
            </div>

            <button class="btn btn-small btn-secondary" onclick="viewTeacherDetails('${teacher.id}')">
                Ver Detalles
            </button>
        </div>
    `;
}

// Render Reports View (prefixed to avoid conflicts)
function cpRenderReportsView(container) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const weekSummary = window.ClassProgressManager.getWeeklySummary(startOfWeek.toISOString().split('T')[0]);

    container.innerHTML = `
        <div class="cp-reports-header">
            <h3>📊 Reportes y Análisis</h3>
        </div>

        <div class="cp-report-section">
            <h4>📅 Resumen Semanal (${weekSummary.startDate} - ${weekSummary.endDate})</h4>

            <div class="cp-weekly-summary">
                <div class="cp-summary-stats">
                    <div class="cp-summary-stat">
                        <span class="cp-stat-big">${weekSummary.totalClasses}</span>
                        <span>Clases Programadas</span>
                    </div>
                    <div class="cp-summary-stat">
                        <span class="cp-stat-big">${weekSummary.completedClasses}</span>
                        <span>Clases Registradas</span>
                    </div>
                    <div class="cp-summary-stat">
                        <span class="cp-stat-big">${weekSummary.completionRate}%</span>
                        <span>Tasa de Registro</span>
                    </div>
                    <div class="cp-summary-stat">
                        <span class="cp-stat-big">${weekSummary.totalUnits}</span>
                        <span>Unidades Cubiertas</span>
                    </div>
                </div>

                <div class="cp-daily-chart">
                    <h5>Unidades por Día</h5>
                    <div class="cp-bar-chart">
                        ${weekSummary.dailyStats.map(day => `
                            <div class="cp-bar-container">
                                <div class="cp-bar" style="height: ${Math.max(day.units * 10, 5)}px"
                                     title="${day.units} unidades">
                                    ${day.units}
                                </div>
                                <span class="cp-bar-label">${day.dayName}</span>
                                ${day.holiday ? '<span class="cp-bar-holiday">🔴</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="cp-report-actions">
            <button class="btn btn-primary" onclick="generateWeeklyReport()">
                📄 Generar Reporte Semanal
            </button>
            <button class="btn btn-secondary" onclick="generateMonthlyReport()">
                📄 Generar Reporte Mensual
            </button>
            <button class="btn btn-secondary" onclick="exportToExcel()">
                📥 Exportar a Excel
            </button>
        </div>
    `;
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

// Show modal to add new progress entry
function showProgressEntryModal(groupId, date) {
    const group = window.GroupsManager2?.groups.get(parseInt(groupId));
    if (!group) {
        alert('Grupo no encontrado');
        return;
    }

    const teacher = window.TeacherManager?.teachers.get(group.teacherId);
    const teacherName = teacher?.name || 'Sin asignar';
    const book = window.ClassProgressManager.books[group.book] || { name: `Book ${group.book}` };
    const currentUnit = window.ClassProgressManager.getCurrentUnit(groupId);
    const nextUnits = [currentUnit + 1, currentUnit + 2];

    // Create modal HTML
    const modalHtml = `
        <div class="modal-overlay" id="progressEntryModal" onclick="closeModalOnOverlay(event)">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>📝 Registrar Progreso de Clase</h3>
                    <button class="modal-close" onclick="closeProgressEntryModal()">×</button>
                </div>

                <div class="modal-body">
                    <!-- Group Info (Read-only) -->
                    <div class="cp-modal-info">
                        <div class="info-row">
                            <span class="info-label">Grupo:</span>
                            <span class="info-value">${groupId} - ${group.displayName || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Profesor:</span>
                            <span class="info-value">${teacherName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Libro:</span>
                            <span class="info-value">${book.name}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Horario:</span>
                            <span class="info-value">${group.daysShort || ''} ${group.startTime || ''} - ${group.endTime || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Salón:</span>
                            <span class="info-value">${group.room || 'N/A'}</span>
                        </div>
                    </div>

                    <hr>

                    <!-- Date & Time -->
                    <div class="form-row">
                        <div class="form-group">
                            <label>📅 Fecha</label>
                            <input type="date" id="progressDate" value="${date}" required>
                        </div>
                        <div class="form-group">
                            <label>🕐 Hora Inicio</label>
                            <input type="time" id="progressStartTime" value="${group.startTime || '08:00'}">
                        </div>
                        <div class="form-group">
                            <label>🕐 Hora Fin</label>
                            <input type="time" id="progressEndTime" value="${group.endTime || '10:00'}">
                        </div>
                    </div>

                    <hr>

                    <!-- Units Covered -->
                    <div class="form-group">
                        <label>📚 Unidades Cubiertas</label>
                        <p class="form-hint">Unidad anterior: ${currentUnit}. Esperadas hoy: ${nextUnits.join(', ')}</p>

                        <div id="unitsCoveredContainer">
                            <div class="unit-entry" data-unit-index="0">
                                <div class="unit-header">
                                    <select class="unit-select" onchange="updateUnitSections(0)">
                                        <option value="">-- Seleccionar Unidad --</option>
                                        ${Array.from({length: 52}, (_, i) => i + 1).map(u => `
                                            <option value="${u}" ${u === nextUnits[0] ? 'selected' : ''}>
                                                Unidad ${u}
                                            </option>
                                        `).join('')}
                                    </select>
                                    <button class="btn btn-small btn-danger" onclick="removeUnitEntry(0)" style="display:none">✕</button>
                                </div>
                                <div class="unit-sections">
                                    ${window.ClassProgressManager.unitSections.map(s => `
                                        <label class="section-checkbox">
                                            <input type="checkbox" name="unit0_${s.id}" checked>
                                            ${s.icon} ${s.name}
                                        </label>
                                    `).join('')}
                                </div>
                                <div class="unit-completion">
                                    <label>
                                        <input type="radio" name="unit0_status" value="complete" checked>
                                        ✅ Completada
                                    </label>
                                    <label>
                                        <input type="radio" name="unit0_status" value="partial">
                                        ⚠️ Parcial
                                    </label>
                                </div>
                                <div class="unit-stopped-at" style="display:none">
                                    <label>Detenido en:</label>
                                    <select name="unit0_stoppedAt">
                                        ${window.ClassProgressManager.unitSections.map(s => `
                                            <option value="${s.name}">${s.icon} ${s.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button class="btn btn-secondary btn-small" onclick="addUnitEntry()">
                            ➕ Agregar Otra Unidad
                        </button>
                    </div>

                    <hr>

                    <!-- Attendance -->
                    <div class="form-row">
                        <div class="form-group">
                            <label>👥 Estudiantes Presentes</label>
                            <input type="number" id="studentsPresent" value="${group.studentIds?.length || 0}" min="0">
                        </div>
                        <div class="form-group">
                            <label>👥 Estudiantes Ausentes</label>
                            <input type="number" id="studentsAbsent" value="0" min="0">
                        </div>
                    </div>

                    <hr>

                    <!-- Completion Status -->
                    <div class="form-group">
                        <label>¿Se completaron las unidades esperadas?</label>
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="completedExpected" value="yes" checked
                                       onchange="toggleIncompleteReason(false)">
                                ✅ Sí
                            </label>
                            <label>
                                <input type="radio" name="completedExpected" value="no"
                                       onchange="toggleIncompleteReason(true)">
                                ❌ No
                            </label>
                        </div>
                    </div>

                    <div class="form-group" id="incompleteReasonGroup" style="display:none">
                        <label>Razón por no completar:</label>
                        <select id="incompleteReason">
                            ${window.ClassProgressManager.incompleteReasons.map(r => `
                                <option value="${r.value}">${r.label}</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Notes -->
                    <div class="form-group">
                        <label>📝 Notas Adicionales</label>
                        <textarea id="progressNotes" rows="3" placeholder="Observaciones, dificultades, logros..."></textarea>
                    </div>

                    <!-- Homework -->
                    <div class="form-group">
                        <label>📚 Tarea Asignada</label>
                        <input type="text" id="progressHomework" placeholder="Ej: Ejercicios página 45-46">
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeProgressEntryModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="saveProgressEntry('${groupId}')">
                        💾 Guardar Progreso
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Setup event listeners for unit status changes
    setupUnitStatusListeners();
}

// Setup listeners for unit completion status
function setupUnitStatusListeners() {
    document.querySelectorAll('input[type="radio"][name^="unit"][name$="_status"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const unitIndex = this.name.match(/unit(\d+)_status/)[1];
            const stoppedAtDiv = document.querySelector(`.unit-entry[data-unit-index="${unitIndex}"] .unit-stopped-at`);
            if (stoppedAtDiv) {
                stoppedAtDiv.style.display = this.value === 'partial' ? 'block' : 'none';
            }
        });
    });
}

// Add another unit entry
let unitEntryCount = 1;
function addUnitEntry() {
    const container = document.getElementById('unitsCoveredContainer');
    const currentUnit = window.ClassProgressManager.getCurrentUnit(
        document.querySelector('.unit-select')?.closest('.modal-content')?.dataset?.groupId
    ) || 1;

    const newEntry = document.createElement('div');
    newEntry.className = 'unit-entry';
    newEntry.dataset.unitIndex = unitEntryCount;

    newEntry.innerHTML = `
        <div class="unit-header">
            <select class="unit-select" onchange="updateUnitSections(${unitEntryCount})">
                <option value="">-- Seleccionar Unidad --</option>
                ${Array.from({length: 52}, (_, i) => i + 1).map(u => `
                    <option value="${u}">Unidad ${u}</option>
                `).join('')}
            </select>
            <button class="btn btn-small btn-danger" onclick="removeUnitEntry(${unitEntryCount})">✕</button>
        </div>
        <div class="unit-sections">
            ${window.ClassProgressManager.unitSections.map(s => `
                <label class="section-checkbox">
                    <input type="checkbox" name="unit${unitEntryCount}_${s.id}" checked>
                    ${s.icon} ${s.name}
                </label>
            `).join('')}
        </div>
        <div class="unit-completion">
            <label>
                <input type="radio" name="unit${unitEntryCount}_status" value="complete" checked>
                ✅ Completada
            </label>
            <label>
                <input type="radio" name="unit${unitEntryCount}_status" value="partial">
                ⚠️ Parcial
            </label>
        </div>
        <div class="unit-stopped-at" style="display:none">
            <label>Detenido en:</label>
            <select name="unit${unitEntryCount}_stoppedAt">
                ${window.ClassProgressManager.unitSections.map(s => `
                    <option value="${s.name}">${s.icon} ${s.name}</option>
                `).join('')}
            </select>
        </div>
    `;

    container.appendChild(newEntry);
    unitEntryCount++;

    // Show remove buttons on all entries
    document.querySelectorAll('.unit-entry .btn-danger').forEach(btn => btn.style.display = 'inline-block');

    setupUnitStatusListeners();
}

// Remove unit entry
function removeUnitEntry(index) {
    const entry = document.querySelector(`.unit-entry[data-unit-index="${index}"]`);
    if (entry) entry.remove();

    // Hide remove button if only one entry left
    const entries = document.querySelectorAll('.unit-entry');
    if (entries.length === 1) {
        entries[0].querySelector('.btn-danger').style.display = 'none';
    }
}

// Toggle incomplete reason visibility
function toggleIncompleteReason(show) {
    const group = document.getElementById('incompleteReasonGroup');
    if (group) group.style.display = show ? 'block' : 'none';
}

// Close progress entry modal
function closeProgressEntryModal() {
    const modal = document.getElementById('progressEntryModal');
    if (modal) modal.remove();
    unitEntryCount = 1;
}

// Close modal when clicking overlay
function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeProgressEntryModal();
    }
}

// Save progress entry
async function saveProgressEntry(groupId) {
    try {
        const date = document.getElementById('progressDate').value;
        const startTime = document.getElementById('progressStartTime').value;
        const endTime = document.getElementById('progressEndTime').value;

        // Collect units covered
        const unitsCovered = [];
        document.querySelectorAll('.unit-entry').forEach(entry => {
            const unitSelect = entry.querySelector('.unit-select');
            const unitNum = parseInt(unitSelect.value);
            if (!unitNum) return;

            const index = entry.dataset.unitIndex;
            const sections = {};
            window.ClassProgressManager.unitSections.forEach(s => {
                const checkbox = entry.querySelector(`input[name="unit${index}_${s.id}"]`);
                sections[s.id] = checkbox?.checked || false;
            });

            const statusRadio = entry.querySelector(`input[name="unit${index}_status"]:checked`);
            const completed = statusRadio?.value === 'complete';

            const stoppedAt = !completed ?
                entry.querySelector(`select[name="unit${index}_stoppedAt"]`)?.value : null;

            unitsCovered.push({
                unit: unitNum,
                sections,
                completed,
                stoppedAt
            });
        });

        if (unitsCovered.length === 0) {
            alert('Por favor seleccione al menos una unidad');
            return;
        }

        // Build progress data
        const progressData = {
            teacherId: window.GroupsManager2?.groups.get(parseInt(groupId))?.teacherId,
            scheduledStart: startTime,
            scheduledEnd: endTime,
            actualStart: startTime,
            actualEnd: endTime,
            unitsCovered,
            currentUnit: Math.max(...unitsCovered.map(u => u.unit)),
            studentsPresent: parseInt(document.getElementById('studentsPresent').value) || 0,
            studentsAbsent: parseInt(document.getElementById('studentsAbsent').value) || 0,
            completedExpected: document.querySelector('input[name="completedExpected"]:checked')?.value === 'yes',
            incompleteReason: document.getElementById('incompleteReason')?.value,
            notes: document.getElementById('progressNotes')?.value || '',
            homework: document.getElementById('progressHomework')?.value || ''
        };

        // Save to Firebase
        await window.ClassProgressManager.saveProgressEntry(groupId, date, progressData);

        // Close modal and refresh view
        closeProgressEntryModal();

        // Refresh the current view
        loadClassProgressStats();
        loadClassProgressAlerts();
        switchClassProgressView('today');

        alert('✅ Progreso guardado exitosamente');

    } catch (error) {
        console.error('Error saving progress:', error);
        alert('❌ Error al guardar: ' + error.message);
    }
}

// Show new progress entry modal (general)
function showNewProgressEntryModal() {
    const today = new Date().toISOString().split('T')[0];
    const todayClasses = window.ClassProgressManager.getClassesForDate(today);

    if (!todayClasses.classes || todayClasses.classes.length === 0) {
        alert('No hay clases programadas para hoy');
        return;
    }

    // If only one class, open directly
    if (todayClasses.classes.length === 1) {
        showProgressEntryModal(todayClasses.classes[0].groupId, today);
        return;
    }

    // Multiple classes - show selection
    const modalHtml = `
        <div class="modal-overlay" id="selectClassModal" onclick="closeModalOnOverlay(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Seleccionar Clase</h3>
                    <button class="modal-close" onclick="document.getElementById('selectClassModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Seleccione la clase para registrar progreso:</p>
                    <div class="class-selection-list">
                        ${todayClasses.classes.map(c => `
                            <button class="class-select-btn ${c.status !== 'pending' ? 'disabled' : ''}"
                                    onclick="selectClassForProgress('${c.groupId}', '${today}')"
                                    ${c.status !== 'pending' ? 'disabled' : ''}>
                                <strong>Grupo ${c.groupId}</strong>
                                <span>${c.startTime} - ${c.endTime}</span>
                                <span>${c.status === 'pending' ? '⬜ Pendiente' : '✅ Ya registrado'}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function selectClassForProgress(groupId, date) {
    document.getElementById('selectClassModal')?.remove();
    showProgressEntryModal(groupId, date);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Calendar month navigation
let currentCalendarDate = new Date();

function changeCalendarMonth(delta) {
    // Create new date to avoid mutation issues
    const newDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + delta, 1);
    currentCalendarDate = newDate;

    // Re-render calendar grid
    const content = document.getElementById('cpContent');
    if (content) cpRenderCalendarView(content);
}

// Reset calendar to current month when switching to calendar view
function resetCalendarToCurrentMonth() {
    currentCalendarDate = new Date();
}

// View day details
function viewDayDetails(dateStr) {
    const classesData = window.ClassProgressManager.getClassesForDate(dateStr);
    console.log('Day details:', dateStr, classesData);
    // TODO: Implement day details modal
}

// View group progress
function viewGroupProgress(groupId) {
    console.log('View group progress:', groupId);
    // TODO: Implement group progress detail view
}

// Filter groups view
function filterGroupsView() {
    const statusFilter = document.getElementById('cpGroupsFilter')?.value || 'all';
    const modalityFilter = document.getElementById('cpModalityFilter')?.value || 'all';

    document.querySelectorAll('#cpGroupsTableBody tr').forEach(row => {
        const rowStatus = row.dataset.status;
        const rowModality = row.dataset.modality;

        const statusMatch = statusFilter === 'all' || rowStatus === statusFilter;
        const modalityMatch = modalityFilter === 'all' || rowModality === modalityFilter;

        row.style.display = (statusMatch && modalityMatch) ? '' : 'none';
    });
}

// Update teacher stats
function updateTeacherStats() {
    const startDate = document.getElementById('cpTeacherStartDate')?.value;
    const endDate = document.getElementById('cpTeacherEndDate')?.value;

    if (startDate && endDate) {
        const container = document.getElementById('cpContent');
        if (container) cpRenderTeachersView(container);
    }
}

// Export functions
function exportProgressReport() {
    console.log('Export progress report');
    alert('Función de exportación en desarrollo');
}

function generateWeeklyReport() {
    console.log('Generate weekly report');
    alert('Generación de reporte semanal en desarrollo');
}

function generateMonthlyReport() {
    console.log('Generate monthly report');
    alert('Generación de reporte mensual en desarrollo');
}

function exportToExcel() {
    console.log('Export to Excel');
    alert('Exportación a Excel en desarrollo');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create global instance
window.ClassProgressManager = new ClassProgressManager();

// Wait for required managers to be ready
async function waitForManagers() {
    const maxAttempts = 20;
    let attempts = 0;

    // Try to initialize managers if they exist but aren't initialized
    if (window.GroupsManager2 && !window.GroupsManager2.initialized) {
        console.log('🔄 Initializing GroupsManager2...');
        try {
            await window.GroupsManager2.init();
        } catch (e) {
            console.error('Error initializing GroupsManager2:', e);
        }
    }

    if (window.TeacherManager && !window.TeacherManager.initialized) {
        console.log('🔄 Initializing TeacherManager...');
        try {
            await window.TeacherManager.init();
        } catch (e) {
            console.error('Error initializing TeacherManager:', e);
        }
    }

    while (attempts < maxAttempts) {
        const hasGroupsManager = window.GroupsManager2 && window.GroupsManager2.initialized;
        const hasTeacherManager = window.TeacherManager && window.TeacherManager.initialized;

        if (hasGroupsManager && hasTeacherManager) {
            console.log('✅ All managers ready for Class Progress');
            return true;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }

    console.warn('⚠️ Some managers not available after waiting');
    return false;
}

// Refresh Class Progress tab data
async function refreshClassProgressData() {
    console.log('🔄 Refreshing Class Progress data...');

    // Ensure managers are ready
    await waitForManagers();

    // Reload progress records
    await window.ClassProgressManager.init(true);

    // Re-render stats and current view
    loadClassProgressStats();
    loadClassProgressAlerts();

    const activeTab = document.querySelector('.cp-subtab.active');
    if (activeTab) {
        const viewName = activeTab.id.replace('cp', '').replace('Tab', '').toLowerCase();
        switchClassProgressView(viewName);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📚 Initializing Class Progress module...');

    // Wait for other managers to be ready
    setTimeout(async () => {
        await waitForManagers();
        await window.ClassProgressManager.init();
        console.log('✅ Class Progress Manager initialized');
    }, 1500);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClassProgressManager };
}
