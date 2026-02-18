// ============================================
// STUDENT PROGRESS MODULE (student-progress.js)
// Reads TutorBox Firebase data to show student app engagement
// Prefix: sp (student progress) to avoid collisions
// ============================================

class StudentProgressManager {
    constructor() {
        this.students = new Map(); // uid -> student data
        this.initialized = false;
        this.loading = false;
        this.lastLoadTime = null;
    }

    async init(forceReload = false) {
        if (this.initialized && !forceReload) return;
        if (this.loading) return;
        this.loading = true;
        try {
            await this.loadAllStudents();
            this.initialized = true;
            this.lastLoadTime = Date.now();
        } catch (err) {
            console.error('❌ StudentProgressManager init error:', err);
        } finally {
            this.loading = false;
        }
    }

    async loadAllStudents() {
        try {
            const response = await fetch(`${SP_CLOUD_FUNCTION_BASE}/getB2BStudents`, {
                method: 'GET',
                headers: {
                    'x-admin-key': SP_ADMIN_KEY
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.students) {
                console.log('ℹ️ No B2B students found in TutorBox');
                return;
            }

            this.students.clear();
            for (const student of data.students) {
                this.students.set(student.uid, student);
            }
            console.log(`✅ Loaded ${this.students.size} B2B students from TutorBox Cloud Function`);
        } catch (err) {
            console.error('❌ Error loading TutorBox students:', err);
            throw err;
        }
    }

    getStudentByUid(uid) {
        return this.students.get(uid) || null;
    }

    getAllStudents() {
        return Array.from(this.students.values());
    }

    getStudentsByGroup(groupName) {
        return this.getAllStudents().filter(s =>
            (s.schoolInfo?.grupo || s.grupo || '').toLowerCase() === groupName.toLowerCase()
        );
    }

    computeEngagementScore(student) {
        const now = Date.now();

        // Recency score (0-40)
        let recencyScore = 0;
        const lastActive = this.getLastActiveTimestamp(student);
        if (lastActive) {
            const daysSince = (now - lastActive) / (1000 * 60 * 60 * 24);
            if (daysSince < 1) recencyScore = 40;
            else if (daysSince <= 2) recencyScore = 30;
            else if (daysSince <= 7) recencyScore = 15;
            else if (daysSince <= 14) recencyScore = 5;
            else recencyScore = 0;
        }

        // Activity score (0-40) based on questions completed
        const questions = this.getQuestionsCompleted(student);
        const activityScore = Math.min(Math.round((questions / 100) * 40), 40);

        // Consistency score (0-20) based on sessions in last 7 days
        const recentSessions = this.getRecentSessionCount(student, 7);
        const consistencyScore = Math.min(Math.round((recentSessions / 7) * 20), 20);

        const total = recencyScore + activityScore + consistencyScore;
        let color = 'red';
        let label = 'Bajo';
        if (total >= 70) { color = 'green'; label = 'Bueno'; }
        else if (total >= 40) { color = 'yellow'; label = 'Regular'; }

        return { total, recencyScore, activityScore, consistencyScore, color, label };
    }

    getLastActiveTimestamp(student) {
        // Check sessionHistory for most recent entry
        const sessions = student.sessionHistory;
        if (sessions && typeof sessions === 'object') {
            let latest = 0;
            for (const entry of Object.values(sessions)) {
                const ts = entry.timestamp || entry.date ? new Date(entry.timestamp || entry.date).getTime() : 0;
                if (ts > latest) latest = ts;
            }
            if (latest > 0) return latest;
        }
        // Fallback: check currentProgress.lastUpdated
        if (student.currentProgress?.lastUpdated) {
            return new Date(student.currentProgress.lastUpdated).getTime();
        }
        // Fallback: account creation date
        if (student.createdAt) {
            return new Date(student.createdAt).getTime();
        }
        return null;
    }

    getQuestionsCompleted(student) {
        return student.currentProgress?.questionsCompleted ||
               student.currentProgress?.totalQuestionsAnswered || 0;
    }

    getRecentSessionCount(student, days) {
        const sessions = student.sessionHistory;
        if (!sessions || typeof sessions !== 'object') return 0;
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        let count = 0;
        for (const entry of Object.values(sessions)) {
            const ts = entry.timestamp || entry.date ? new Date(entry.timestamp || entry.date).getTime() : 0;
            if (ts >= cutoff) count++;
        }
        return count;
    }

    getActiveDaysInRange(student, days) {
        const sessions = student.sessionHistory;
        if (!sessions || typeof sessions !== 'object') return 0;
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const activeDays = new Set();
        for (const entry of Object.values(sessions)) {
            const ts = entry.timestamp || entry.date ? new Date(entry.timestamp || entry.date).getTime() : 0;
            if (ts >= cutoff) {
                activeDays.add(new Date(ts).toDateString());
            }
        }
        return activeDays.size;
    }

    getCurrentBook(student) {
        return student.currentProgress?.currentBook || student.currentProgress?.book || 'Book 1';
    }

    getCurrentUnit(student) {
        return student.currentProgress?.currentUnit || student.currentProgress?.unit || 1;
    }

    getPoints(student) {
        return student.currentProgress?.points || student.currentProgress?.totalPoints || 0;
    }

    getStudentGroup(student) {
        return student.schoolInfo?.grupo || student.grupo || '-';
    }

    getStudentSchool(student) {
        return student.schoolInfo?.schoolName || student.schoolName || '-';
    }
}

// Global instance
window.StudentProgressManager = new StudentProgressManager();

// Constants - reuse from students.js
const SP_CLOUD_FUNCTION_BASE = 'https://us-central1-tutorbox-4d7c9.cloudfunctions.net';
const SP_ADMIN_KEY = 'tbx-admin-2026-cb-provision-k9x7m';

// ============================================
// MODULE LOADER (called by school-buttons.js openModule)
// ============================================

window.loadStudentProgressTab = function() {
    const container = document.getElementById('studentProgressContainer');
    if (!container) return;
    // Render inside the module container (use unique id to avoid collision with tab content div)
    container.innerHTML = '<div id="spModuleContent"></div>';
    renderStudentProgressTab();
};

// ============================================
// MAIN TAB RENDER
// ============================================

let spCurrentView = 'overview';
let spInitialized = false;

async function renderStudentProgressTab() {
    // Check module container first, then fall back to tab content div
    let container = document.getElementById('spModuleContent')
                 || document.getElementById('studentProgress');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="sp-container">
            <div class="sp-header">
                <h2>📱 Progreso App - Estudiantes</h2>
                <div class="sp-header-actions">
                    <button onclick="spRefreshData()" class="sp-btn sp-btn-secondary" id="spRefreshBtn">🔄 Actualizar</button>
                </div>
            </div>
            <div class="sp-loading">
                <div class="sp-spinner"></div>
                <p>Cargando datos de TutorBox...</p>
            </div>
        </div>
    `;

    try {
        await window.StudentProgressManager.init(true);
        spRenderFullTab(container);
        spInitialized = true;
    } catch (err) {
        container.innerHTML = `
            <div class="sp-container">
                <div class="sp-header">
                    <h2>📱 Progreso App - Estudiantes</h2>
                </div>
                <div class="sp-error">
                    <p>❌ Error cargando datos de TutorBox</p>
                    <p style="font-size: 0.85rem; color: #666;">${err.message || 'Verifica la conexion a Firebase'}</p>
                    <button onclick="renderStudentProgressTab()" class="sp-btn sp-btn-primary" style="margin-top: 1rem;">Reintentar</button>
                </div>
            </div>
        `;
    }
}

function spRenderFullTab(container) {
    const mgr = window.StudentProgressManager;
    const allStudents = mgr.getAllStudents();

    // Compute stats
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let activeThisWeek = 0;
    let inactiveSeven = 0;
    let totalQuestions = 0;

    allStudents.forEach(s => {
        const lastActive = mgr.getLastActiveTimestamp(s);
        if (lastActive && lastActive >= oneWeekAgo) activeThisWeek++;
        else inactiveSeven++;
        totalQuestions += mgr.getQuestionsCompleted(s);
    });

    const avgQuestions = allStudents.length > 0 ? Math.round(totalQuestions / allStudents.length) : 0;

    container.innerHTML = `
        <div class="sp-container">
            <div class="sp-header">
                <h2>📱 Progreso App - Estudiantes</h2>
                <div class="sp-header-actions">
                    <button onclick="spRefreshData()" class="sp-btn sp-btn-secondary" id="spRefreshBtn">🔄 Actualizar</button>
                </div>
            </div>

            <div class="sp-stats-grid">
                <div class="sp-stat-card">
                    <div class="sp-stat-icon" style="background: #dbeafe;">📱</div>
                    <div class="sp-stat-number">${allStudents.length}</div>
                    <div class="sp-stat-label">Total con App</div>
                </div>
                <div class="sp-stat-card">
                    <div class="sp-stat-icon" style="background: #d1fae5;">✅</div>
                    <div class="sp-stat-number">${activeThisWeek}</div>
                    <div class="sp-stat-label">Activos esta semana</div>
                </div>
                <div class="sp-stat-card">
                    <div class="sp-stat-icon" style="background: #fee2e2;">⚠️</div>
                    <div class="sp-stat-number">${inactiveSeven}</div>
                    <div class="sp-stat-label">Inactivos 7+ dias</div>
                </div>
                <div class="sp-stat-card">
                    <div class="sp-stat-icon" style="background: #fef3c7;">📊</div>
                    <div class="sp-stat-number">${avgQuestions}</div>
                    <div class="sp-stat-label">Promedio preguntas</div>
                </div>
            </div>

            <div class="sp-subtabs">
                <button class="sp-subtab ${spCurrentView === 'overview' ? 'active' : ''}" onclick="switchStudentProgressView('overview')">📋 Resumen</button>
                <button class="sp-subtab ${spCurrentView === 'students' ? 'active' : ''}" onclick="switchStudentProgressView('students')">👤 Por Estudiante</button>
                <button class="sp-subtab ${spCurrentView === 'reports' ? 'active' : ''}" onclick="switchStudentProgressView('reports')">📊 Reportes</button>
            </div>

            <div id="spContent" class="sp-content"></div>
        </div>
    `;

    // Render current sub-view
    const content = document.getElementById('spContent');
    if (spCurrentView === 'overview') spRenderOverviewView(content);
    else if (spCurrentView === 'students') spRenderStudentsView(content);
    else if (spCurrentView === 'reports') spRenderReportsView(content);
}

function switchStudentProgressView(view) {
    spCurrentView = view;
    // Update active subtab
    document.querySelectorAll('.sp-subtab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.sp-subtab[onclick*="${view}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const content = document.getElementById('spContent');
    if (!content) return;

    if (view === 'overview') spRenderOverviewView(content);
    else if (view === 'students') spRenderStudentsView(content);
    else if (view === 'reports') spRenderReportsView(content);
}

async function spRefreshData() {
    const btn = document.getElementById('spRefreshBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Cargando...'; }
    await window.StudentProgressManager.init(true);
    renderStudentProgressTab();
}

// ============================================
// OVERVIEW VIEW
// ============================================

function spRenderOverviewView(container) {
    const mgr = window.StudentProgressManager;
    const allStudents = mgr.getAllStudents();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // At-risk students (inactive 7+ days)
    const atRisk = allStudents
        .map(s => ({
            ...s,
            lastActive: mgr.getLastActiveTimestamp(s),
            engagement: mgr.computeEngagementScore(s)
        }))
        .filter(s => !s.lastActive || s.lastActive < sevenDaysAgo)
        .sort((a, b) => (a.lastActive || 0) - (b.lastActive || 0));

    // Group breakdown
    const groups = {};
    allStudents.forEach(s => {
        const g = mgr.getStudentGroup(s);
        if (!groups[g]) groups[g] = { name: g, count: 0, totalQuestions: 0, activeCount: 0 };
        groups[g].count++;
        groups[g].totalQuestions += mgr.getQuestionsCompleted(s);
        const la = mgr.getLastActiveTimestamp(s);
        if (la && la >= sevenDaysAgo) groups[g].activeCount++;
    });

    container.innerHTML = `
        <div class="sp-section">
            <h3 style="margin-bottom: 1rem; color: #dc2626;">⚠️ Estudiantes en Riesgo (inactivos 7+ dias) — ${atRisk.length}</h3>
            ${atRisk.length === 0 ? '<p style="color: #059669; font-weight: 600;">Todos los estudiantes estan activos esta semana 🎉</p>' : `
            <div class="sp-table-wrapper">
                <table class="sp-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Grupo</th>
                            <th>Libro/Unidad</th>
                            <th>Preguntas</th>
                            <th>Ultima Actividad</th>
                            <th>Score</th>
                            <th>Accion</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${atRisk.slice(0, 20).map(s => `
                            <tr>
                                <td><strong>${s.fullName || s.displayName || s.email || 'Sin nombre'}</strong></td>
                                <td>${mgr.getStudentGroup(s)}</td>
                                <td>${mgr.getCurrentBook(s)}, U${mgr.getCurrentUnit(s)}</td>
                                <td>${mgr.getQuestionsCompleted(s)}</td>
                                <td>${spFormatLastActive(s.lastActive)}</td>
                                <td>${spEngagementBadge(s.engagement)}</td>
                                <td><button onclick="spShowStudentDetailModal('${s.uid}')" class="sp-btn sp-btn-sm">Ver</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            `}
        </div>

        <div class="sp-section" style="margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;">📊 Progreso por Grupo</h3>
            ${Object.keys(groups).length === 0 ? '<p style="color: #999;">No hay datos de grupos</p>' : `
            <div class="sp-table-wrapper">
                <table class="sp-table">
                    <thead>
                        <tr>
                            <th>Grupo</th>
                            <th>Estudiantes</th>
                            <th>Activos (7d)</th>
                            <th>% Activos</th>
                            <th>Promedio Preguntas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(groups).sort((a, b) => b.count - a.count).map(g => {
                            const pctActive = g.count > 0 ? Math.round((g.activeCount / g.count) * 100) : 0;
                            const avgQ = g.count > 0 ? Math.round(g.totalQuestions / g.count) : 0;
                            return `
                            <tr>
                                <td><strong>${g.name}</strong></td>
                                <td>${g.count}</td>
                                <td>${g.activeCount}</td>
                                <td>
                                    <div class="sp-progress-bar">
                                        <div class="sp-progress-fill" style="width: ${pctActive}%; background: ${pctActive >= 70 ? '#10b981' : pctActive >= 40 ? '#f59e0b' : '#ef4444'};"></div>
                                    </div>
                                    <span style="font-size: 0.8rem;">${pctActive}%</span>
                                </td>
                                <td>${avgQ}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
            `}
        </div>
    `;
}

// ============================================
// STUDENTS VIEW
// ============================================

let spStudentFilter = { group: '', book: '', status: '', search: '' };

function spRenderStudentsView(container) {
    const mgr = window.StudentProgressManager;
    let students = mgr.getAllStudents();

    // Collect unique groups for filter dropdown
    const groupSet = new Set();
    students.forEach(s => groupSet.add(mgr.getStudentGroup(s)));
    const groups = Array.from(groupSet).sort();

    // Apply filters
    if (spStudentFilter.search) {
        const q = spStudentFilter.search.toLowerCase();
        students = students.filter(s =>
            (s.fullName || s.displayName || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q)
        );
    }
    if (spStudentFilter.group) {
        students = students.filter(s => mgr.getStudentGroup(s) === spStudentFilter.group);
    }
    if (spStudentFilter.status === 'active') {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        students = students.filter(s => {
            const la = mgr.getLastActiveTimestamp(s);
            return la && la >= cutoff;
        });
    } else if (spStudentFilter.status === 'inactive') {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        students = students.filter(s => {
            const la = mgr.getLastActiveTimestamp(s);
            return !la || la < cutoff;
        });
    }

    // Sort by name
    students.sort((a, b) => (a.fullName || a.displayName || '').localeCompare(b.fullName || b.displayName || ''));

    // Compute engagement for each
    const enriched = students.map(s => ({
        ...s,
        lastActive: mgr.getLastActiveTimestamp(s),
        engagement: mgr.computeEngagementScore(s),
        questions: mgr.getQuestionsCompleted(s),
        points: mgr.getPoints(s),
        book: mgr.getCurrentBook(s),
        unit: mgr.getCurrentUnit(s),
        group: mgr.getStudentGroup(s)
    }));

    container.innerHTML = `
        <div class="sp-filters">
            <input type="text" id="spSearchInput" placeholder="Buscar por nombre o email..."
                   value="${spStudentFilter.search}" oninput="spUpdateFilter('search', this.value)"
                   class="sp-filter-input" />
            <select id="spGroupFilter" onchange="spUpdateFilter('group', this.value)" class="sp-filter-select">
                <option value="">Todos los grupos</option>
                ${groups.map(g => `<option value="${g}" ${spStudentFilter.group === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
            <select id="spStatusFilter" onchange="spUpdateFilter('status', this.value)" class="sp-filter-select">
                <option value="" ${spStudentFilter.status === '' ? 'selected' : ''}>Todos</option>
                <option value="active" ${spStudentFilter.status === 'active' ? 'selected' : ''}>Activos (7d)</option>
                <option value="inactive" ${spStudentFilter.status === 'inactive' ? 'selected' : ''}>Inactivos (7d)</option>
            </select>
            <span class="sp-result-count">${enriched.length} estudiantes</span>
        </div>

        <div class="sp-table-wrapper">
            <table class="sp-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Grupo</th>
                        <th>Libro / Unidad</th>
                        <th>Preguntas</th>
                        <th>Puntos</th>
                        <th>Ultima Actividad</th>
                        <th>Engagement</th>
                    </tr>
                </thead>
                <tbody>
                    ${enriched.length === 0 ? `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #999;">No se encontraron estudiantes</td></tr>` :
                    enriched.map(s => `
                        <tr onclick="spShowStudentDetailModal('${s.uid}')" style="cursor: pointer;" class="sp-clickable-row">
                            <td><strong>${s.fullName || s.displayName || 'Sin nombre'}</strong></td>
                            <td style="font-size: 0.85rem; color: #666;">${s.email || '-'}</td>
                            <td>${s.group}</td>
                            <td>${s.book}, U${s.unit}</td>
                            <td>${s.questions}</td>
                            <td>${s.points}</td>
                            <td>${spFormatLastActive(s.lastActive)}</td>
                            <td>${spEngagementBadge(s.engagement)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

let spFilterDebounce = null;
function spUpdateFilter(key, value) {
    spStudentFilter[key] = value;
    clearTimeout(spFilterDebounce);
    spFilterDebounce = setTimeout(() => {
        const content = document.getElementById('spContent');
        if (content) spRenderStudentsView(content);
    }, key === 'search' ? 300 : 0);
}

// ============================================
// REPORTS VIEW
// ============================================

function spRenderReportsView(container) {
    const mgr = window.StudentProgressManager;
    const allStudents = mgr.getAllStudents();

    // Collect groups
    const groupSet = new Set();
    allStudents.forEach(s => groupSet.add(mgr.getStudentGroup(s)));
    const groups = Array.from(groupSet).sort();

    container.innerHTML = `
        <div class="sp-section">
            <h3 style="margin-bottom: 1rem;">📊 Exportar Reportes</h3>

            <div class="sp-report-cards">
                <div class="sp-report-card">
                    <h4>📋 Reporte General</h4>
                    <p>Todos los estudiantes B2B con progreso y engagement.</p>
                    <button onclick="spExportCSV('all')" class="sp-btn sp-btn-primary">Descargar CSV</button>
                </div>

                <div class="sp-report-card">
                    <h4>⚠️ Reporte de Inactividad</h4>
                    <p>Estudiantes inactivos 7+ dias.</p>
                    <button onclick="spExportCSV('inactive')" class="sp-btn sp-btn-primary">Descargar CSV</button>
                </div>

                <div class="sp-report-card">
                    <h4>📚 Reporte por Grupo</h4>
                    <p>Selecciona un grupo:</p>
                    <select id="spReportGroupSelect" class="sp-filter-select" style="margin-bottom: 0.5rem;">
                        ${groups.map(g => `<option value="${g}">${g}</option>`).join('')}
                    </select>
                    <button onclick="spExportCSV('group')" class="sp-btn sp-btn-primary">Descargar CSV</button>
                </div>
            </div>
        </div>

        <div class="sp-section" style="margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;">📈 Resumen de Actividad</h3>
            <div class="sp-activity-summary">
                ${spRenderActivitySummary(allStudents)}
            </div>
        </div>
    `;
}

function spRenderActivitySummary(students) {
    const mgr = window.StudentProgressManager;
    const now = Date.now();
    const ranges = [
        { label: 'Hoy', cutoff: now - 1 * 24 * 60 * 60 * 1000 },
        { label: 'Ultimos 3 dias', cutoff: now - 3 * 24 * 60 * 60 * 1000 },
        { label: 'Ultimos 7 dias', cutoff: now - 7 * 24 * 60 * 60 * 1000 },
        { label: 'Ultimos 14 dias', cutoff: now - 14 * 24 * 60 * 60 * 1000 },
        { label: 'Ultimos 30 dias', cutoff: now - 30 * 24 * 60 * 60 * 1000 },
    ];

    return `
        <table class="sp-table" style="max-width: 500px;">
            <thead>
                <tr><th>Periodo</th><th>Activos</th><th>%</th></tr>
            </thead>
            <tbody>
                ${ranges.map(r => {
                    const active = students.filter(s => {
                        const la = mgr.getLastActiveTimestamp(s);
                        return la && la >= r.cutoff;
                    }).length;
                    const pct = students.length > 0 ? Math.round((active / students.length) * 100) : 0;
                    return `
                        <tr>
                            <td>${r.label}</td>
                            <td><strong>${active}</strong> / ${students.length}</td>
                            <td>
                                <div class="sp-progress-bar" style="width: 100px; display: inline-block; vertical-align: middle;">
                                    <div class="sp-progress-fill" style="width: ${pct}%; background: ${pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'};"></div>
                                </div>
                                <span style="font-size: 0.8rem; margin-left: 0.3rem;">${pct}%</span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function spExportCSV(type) {
    const mgr = window.StudentProgressManager;
    let students = mgr.getAllStudents();
    let filename = 'tutorbox-students';

    if (type === 'inactive') {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        students = students.filter(s => {
            const la = mgr.getLastActiveTimestamp(s);
            return !la || la < cutoff;
        });
        filename = 'tutorbox-inactive-students';
    } else if (type === 'group') {
        const groupSelect = document.getElementById('spReportGroupSelect');
        const group = groupSelect ? groupSelect.value : '';
        if (group) {
            students = students.filter(s => mgr.getStudentGroup(s) === group);
            filename = `tutorbox-group-${group.replace(/\s+/g, '-')}`;
        }
    }

    const rows = [['Nombre', 'Email', 'Grupo', 'Escuela', 'Libro', 'Unidad', 'Preguntas', 'Puntos', 'Ultima Actividad', 'Engagement Score', 'Engagement Nivel']];

    students.forEach(s => {
        const engagement = mgr.computeEngagementScore(s);
        const lastActive = mgr.getLastActiveTimestamp(s);
        rows.push([
            s.fullName || s.displayName || '',
            s.email || '',
            mgr.getStudentGroup(s),
            mgr.getStudentSchool(s),
            mgr.getCurrentBook(s),
            mgr.getCurrentUnit(s),
            mgr.getQuestionsCompleted(s),
            mgr.getPoints(s),
            lastActive ? new Date(lastActive).toLocaleString() : 'Nunca',
            engagement.total,
            engagement.label
        ]);
    });

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ CSV exportado: ${students.length} estudiantes`, 'success');
    }
}

// ============================================
// STUDENT DETAIL MODAL
// ============================================

function spShowStudentDetailModal(uid) {
    const mgr = window.StudentProgressManager;

    // If not initialized yet, init first then show
    if (!mgr.initialized) {
        mgr.init().then(() => spShowStudentDetailModal(uid));
        return;
    }

    const student = mgr.getStudentByUid(uid);
    if (!student) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('⚠️ No se encontraron datos de progreso para este estudiante', 'warning');
        }
        return;
    }

    const engagement = mgr.computeEngagementScore(student);
    const lastActive = mgr.getLastActiveTimestamp(student);
    const questions = mgr.getQuestionsCompleted(student);
    const points = mgr.getPoints(student);
    const book = mgr.getCurrentBook(student);
    const unit = mgr.getCurrentUnit(student);
    const group = mgr.getStudentGroup(student);
    const school = mgr.getStudentSchool(student);
    const activeDays7 = mgr.getActiveDaysInRange(student, 7);

    // Book progress (rough: 40 units per book, 16 questions per unit = 640 per book)
    const unitNum = typeof unit === 'number' ? unit : parseInt(unit) || 1;
    const bookProgress = Math.min(Math.round((unitNum / 40) * 100), 100);

    // Session history
    const sessions = student.sessionHistory ? Object.values(student.sessionHistory) : [];
    sessions.sort((a, b) => {
        const ta = new Date(a.timestamp || a.date || 0).getTime();
        const tb = new Date(b.timestamp || b.date || 0).getTime();
        return tb - ta;
    });
    const recentSessions = sessions.slice(0, 15);

    // Build modal
    const modal = document.createElement('div');
    modal.id = 'spDetailModal';
    modal.className = 'sp-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) spCloseStudentDetailModal(); };

    modal.innerHTML = `
        <div class="sp-modal">
            <div class="sp-modal-header">
                <h2>📱 Dashboard del Estudiante</h2>
                <button onclick="spCloseStudentDetailModal()" class="sp-modal-close">&times;</button>
            </div>
            <div class="sp-modal-body">
                <!-- Profile -->
                <div class="sp-detail-section sp-profile-card">
                    <div class="sp-avatar">${(student.fullName || student.displayName || 'U').charAt(0).toUpperCase()}</div>
                    <div class="sp-profile-info">
                        <h3>${student.fullName || student.displayName || 'Sin nombre'}</h3>
                        <p style="color: #666;">${student.email || ''}</p>
                        <p style="font-size: 0.85rem; color: #888;">${group} | ${school}</p>
                        ${student.createdAt ? `<p style="font-size: 0.8rem; color: #aaa;">Cuenta creada: ${new Date(student.createdAt).toLocaleDateString()}</p>` : ''}
                    </div>
                </div>

                <!-- Progress -->
                <div class="sp-detail-section">
                    <h4>📖 Progreso</h4>
                    <div class="sp-detail-grid">
                        <div class="sp-detail-item">
                            <span class="sp-detail-label">Libro / Unidad</span>
                            <span class="sp-detail-value">${book}, Unidad ${unit}</span>
                        </div>
                        <div class="sp-detail-item">
                            <span class="sp-detail-label">Preguntas</span>
                            <span class="sp-detail-value">${questions}</span>
                        </div>
                        <div class="sp-detail-item">
                            <span class="sp-detail-label">Puntos</span>
                            <span class="sp-detail-value">${points}</span>
                        </div>
                        <div class="sp-detail-item">
                            <span class="sp-detail-label">Ultima actividad</span>
                            <span class="sp-detail-value">${spFormatLastActive(lastActive)}</span>
                        </div>
                    </div>
                    <div style="margin-top: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #555;">
                            <span>${bookProgress}% del ${book}</span>
                        </div>
                        <div class="sp-progress-bar" style="height: 10px; margin-top: 4px;">
                            <div class="sp-progress-fill" style="width: ${bookProgress}%; background: #667eea;"></div>
                        </div>
                    </div>
                </div>

                <!-- Engagement -->
                <div class="sp-detail-section">
                    <h4>📊 Engagement</h4>
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                        <div class="sp-engagement-score sp-engagement-${engagement.color}">
                            ${engagement.total}/100
                        </div>
                        <span style="font-weight: 600; color: ${engagement.color === 'green' ? '#059669' : engagement.color === 'yellow' ? '#d97706' : '#dc2626'};">
                            ${engagement.label}
                        </span>
                    </div>
                    <div class="sp-engagement-breakdown">
                        <div class="sp-engagement-bar-row">
                            <span>Recencia</span>
                            <div class="sp-progress-bar" style="flex: 1;">
                                <div class="sp-progress-fill" style="width: ${(engagement.recencyScore / 40) * 100}%; background: #667eea;"></div>
                            </div>
                            <span>${engagement.recencyScore}/40</span>
                        </div>
                        <div class="sp-engagement-bar-row">
                            <span>Actividad</span>
                            <div class="sp-progress-bar" style="flex: 1;">
                                <div class="sp-progress-fill" style="width: ${(engagement.activityScore / 40) * 100}%; background: #10b981;"></div>
                            </div>
                            <span>${engagement.activityScore}/40</span>
                        </div>
                        <div class="sp-engagement-bar-row">
                            <span>Constancia</span>
                            <div class="sp-progress-bar" style="flex: 1;">
                                <div class="sp-progress-fill" style="width: ${(engagement.consistencyScore / 20) * 100}%; background: #f59e0b;"></div>
                            </div>
                            <span>${engagement.consistencyScore}/20</span>
                        </div>
                    </div>
                    <p style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Activo ${activeDays7} de los ultimos 7 dias</p>
                </div>

                <!-- Session History -->
                <div class="sp-detail-section">
                    <h4>📅 Historial de Sesiones ${recentSessions.length > 0 ? `(ultimas ${recentSessions.length})` : ''}</h4>
                    ${recentSessions.length === 0 ? '<p style="color: #999;">Sin historial de sesiones</p>' : `
                    <div class="sp-sessions-list">
                        ${recentSessions.map(s => {
                            const date = s.timestamp || s.date;
                            const dateStr = date ? new Date(date).toLocaleDateString() : '?';
                            const timeStr = date ? new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                            const type = s.type || s.sessionType || 'session';
                            const detail = s.detail || s.book || s.description || '';
                            return `
                                <div class="sp-session-item">
                                    <span class="sp-session-date">${dateStr} ${timeStr}</span>
                                    <span class="sp-session-type">${spSessionTypeLabel(type)}</span>
                                    <span class="sp-session-detail">${detail}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    `}
                </div>

                <!-- Account Actions -->
                <div class="sp-detail-section sp-actions-section">
                    <h4>⚙️ Acciones de Cuenta</h4>
                    <div class="sp-action-buttons">
                        <button onclick="spResetPassword('${uid}', '${(student.email || '').replace(/'/g, "\\'")}')" class="sp-btn sp-btn-warning">
                            🔑 Reset Password
                        </button>
                        <button onclick="spDeactivateAccount('${uid}', '${(student.fullName || student.displayName || '').replace(/'/g, "\\'")}')" class="sp-btn sp-btn-danger">
                            ⛔ Desactivar Cuenta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal first
    const existing = document.getElementById('spDetailModal');
    if (existing) existing.remove();

    document.body.appendChild(modal);
    // Trigger animation
    requestAnimationFrame(() => modal.classList.add('visible'));
}

function spCloseStudentDetailModal() {
    const modal = document.getElementById('spDetailModal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 200);
    }
}

// Make modal functions globally accessible (called from students.js)
window.spShowStudentDetailModal = spShowStudentDetailModal;
window.spCloseStudentDetailModal = spCloseStudentDetailModal;

// ============================================
// ACCOUNT ACTIONS
// ============================================

async function spResetPassword(uid, email) {
    if (!confirm(`Resetear password para ${email}?`)) return;

    try {
        const response = await fetch(`${SP_CLOUD_FUNCTION_BASE}/resetStudentPassword`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': SP_ADMIN_KEY
            },
            body: JSON.stringify({ uid, email })
        });

        const result = await response.json();
        if (response.ok) {
            const newPassword = result.temporaryPassword || result.newPassword || '(ver consola)';
            alert(`✅ Password reseteado!\n\nNuevo password temporal: ${newPassword}\n\nEl estudiante debe cambiarlo al ingresar.`);
        } else {
            alert(`❌ Error: ${result.error || result.message || 'Error desconocido'}`);
        }
    } catch (err) {
        alert(`❌ Error de conexion: ${err.message}`);
    }
}

async function spDeactivateAccount(uid, name) {
    if (!confirm(`⚠️ Desactivar cuenta de "${name}"?\n\nEl estudiante no podra acceder a la app.`)) return;
    if (!confirm(`¿Estas seguro? Esta accion se puede revertir pero el estudiante perdera acceso inmediatamente.`)) return;

    try {
        const response = await fetch(`${SP_CLOUD_FUNCTION_BASE}/deactivateStudentAccount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': SP_ADMIN_KEY
            },
            body: JSON.stringify({ uid })
        });

        const result = await response.json();
        if (response.ok) {
            alert(`✅ Cuenta desactivada para ${name}`);
            spCloseStudentDetailModal();
            // Refresh data
            await window.StudentProgressManager.init(true);
            if (spInitialized) renderStudentProgressTab();
        } else {
            alert(`❌ Error: ${result.error || result.message || 'Error desconocido'}`);
        }
    } catch (err) {
        alert(`❌ Error de conexion: ${err.message}`);
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function spFormatLastActive(timestamp) {
    if (!timestamp) return '<span style="color: #ef4444;">Nunca</span>';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    let text, color;
    if (minutes < 60) {
        text = `hace ${minutes}m`;
        color = '#059669';
    } else if (hours < 24) {
        text = `hace ${hours}h`;
        color = '#059669';
    } else if (days === 1) {
        text = 'ayer';
        color = '#d97706';
    } else if (days <= 7) {
        text = `hace ${days} dias`;
        color = '#d97706';
    } else {
        text = `hace ${days} dias`;
        color = '#dc2626';
    }

    return `<span style="color: ${color}; font-weight: 500;">${text}</span>`;
}

function spEngagementBadge(engagement) {
    const bgColors = { green: '#d1fae5', yellow: '#fef3c7', red: '#fee2e2' };
    const textColors = { green: '#065f46', yellow: '#92400e', red: '#991b1b' };
    return `<span style="background: ${bgColors[engagement.color]}; color: ${textColors[engagement.color]};
            padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
            ${engagement.total} ${engagement.label}</span>`;
}

function spSessionTypeLabel(type) {
    const labels = {
        'progress': '📖',
        'training': '🎯',
        'chat': '💬',
        'game': '🎮',
        'exercise': '✏️',
        'story': '📚',
        'dictation': '📝',
        'session': '📱'
    };
    return labels[type] || '📱';
}

// ============================================
// AUTO-INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Delay init to let Firebase module script load first
    setTimeout(() => {
        if (window.tutorboxDb) {
            console.log('✅ StudentProgressManager ready (TutorBox Firebase available)');
        } else {
            console.log('ℹ️ StudentProgressManager waiting for TutorBox Firebase init');
        }
    }, 2000);
});
