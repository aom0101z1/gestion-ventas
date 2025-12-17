// teachers.js - Teacher Management Module (Redesigned)
console.log('👩‍🏫 Loading teachers module...');

// Teacher Manager Class
class TeacherManager {
    constructor() {
        this.teachers = new Map();
        this.attendance = new Map();
        this.payRates = [10000, 12000, 15000, 17500, 20000, 22000, 25000];
        this.initialized = false;
    }

    // Initialize
    async init(forceReload = false) {
        if (this.initialized && !forceReload) return;
        console.log('🚀 Initializing teacher manager');
        await this.loadTeachers();
        this.initialized = true;
    }

    // Load teachers from Firebase
    async loadTeachers() {
        try {
            this.teachers.clear();

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'teachers');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, teacher]) => {
                    this.teachers.set(id, teacher);
                });
            }

            console.log(`✅ Loaded ${this.teachers.size} teachers`);
        } catch (error) {
            console.error('❌ Error loading teachers:', error);
        }
    }

    // Save teacher
    async saveTeacher(teacherData) {
        try {
            const id = teacherData.id || `TCH-${Date.now()}`;
            const teacher = {
                ...teacherData,
                id,
                status: teacherData.status || 'active',
                updatedAt: new Date().toISOString(),
                createdAt: teacherData.createdAt || new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `teachers/${id}`);
            await db.set(ref, teacher);

            this.teachers.set(id, teacher);
            console.log('✅ Teacher saved:', id);
            return teacher;
        } catch (error) {
            console.error('❌ Error saving teacher:', error);
            throw error;
        }
    }

    // Delete teacher
    async deleteTeacher(teacherId) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `teachers/${teacherId}`);
            await db.remove(ref);

            this.teachers.delete(teacherId);
            console.log('✅ Teacher deleted:', teacherId);
        } catch (error) {
            console.error('❌ Error deleting teacher:', error);
            throw error;
        }
    }

    // Toggle teacher status
    async toggleStatus(teacherId) {
        const teacher = this.teachers.get(teacherId);
        if (!teacher) return;

        const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
        await this.saveTeacher({ ...teacher, status: newStatus });
        return newStatus;
    }

    // Get groups assigned to teacher (from Grupos 2.0)
    getTeacherGroups(teacherId) {
        if (!window.GroupsManager2 || !window.GroupsManager2.groups) {
            return [];
        }

        return Array.from(window.GroupsManager2.groups.values())
            .filter(g => g.teacherId === teacherId && g.status === 'active');
    }

    // Get teachers with stats
    getTeachersWithStats() {
        return Array.from(this.teachers.values()).map(teacher => {
            const groups = this.getTeacherGroups(teacher.id);
            const totalStudents = groups.reduce((sum, g) => sum + (g.studentIds?.length || 0), 0);

            return {
                ...teacher,
                groupCount: groups.length,
                studentCount: totalStudents,
                groups: groups
            };
        });
    }

    // Filter teachers
    filterTeachers(filters) {
        let teachers = this.getTeachersWithStats();

        if (filters.status && filters.status !== 'all') {
            teachers = teachers.filter(t => t.status === filters.status);
        }

        if (filters.language && filters.language !== 'all') {
            teachers = teachers.filter(t => t.languages?.includes(filters.language));
        }

        if (filters.paymentType && filters.paymentType !== 'all') {
            teachers = teachers.filter(t => t.paymentType === filters.paymentType);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            teachers = teachers.filter(t =>
                t.name?.toLowerCase().includes(search) ||
                t.email?.toLowerCase().includes(search) ||
                t.phone?.includes(search)
            );
        }

        return teachers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
}

// Global instance
window.TeacherManager = new TeacherManager();

// ============================================
// MAIN TAB LOADER
// ============================================

window.loadTeachersTab = async function() {
    console.log('👩‍🏫 Loading teachers tab');

    const container = document.getElementById('teachersContainer');
    if (!container) {
        console.error('❌ Teachers container not found');
        return;
    }

    // Force reload to get fresh data
    await window.TeacherManager.init(true);

    // Also load Grupos 2.0 data for group assignments
    if (window.GroupsManager2) {
        await window.GroupsManager2.init(true);
    }

    container.innerHTML = renderTeachersView();
    await refreshTeachersGrid();
};

// ============================================
// VIEW RENDERING
// ============================================

function renderTeachersView() {
    return `
        <div style="padding: 1.5rem; min-height: 100vh; background: #f3f4f6;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
                        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 1.5rem; border-radius: 12px; color: white;">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 1.75rem;">👩‍🏫 Profesores 2.0</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Gestión de profesores y asignación de grupos</p>
                </div>
                <button onclick="showTeacherModal()" style="background: white; color: #d97706; font-weight: bold;
                        padding: 0.75rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    ➕ Nuevo Profesor
                </button>
            </div>

            <!-- Stats -->
            <div id="teachersStats" style="margin-bottom: 1.5rem;"></div>

            <!-- Filters -->
            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: #6b7280; text-transform: uppercase;">
                            Estado
                        </label>
                        <select id="filterTeacherStatus" onchange="applyTeacherFilters()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="all">Todos</option>
                            <option value="active" selected>Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: #6b7280; text-transform: uppercase;">
                            Idioma
                        </label>
                        <select id="filterTeacherLanguage" onchange="applyTeacherFilters()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="all">Todos</option>
                            <option value="english">Inglés</option>
                            <option value="portuguese">Portugués</option>
                            <option value="german">Alemán</option>
                            <option value="spanish">Español</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: #6b7280; text-transform: uppercase;">
                            Tipo de Pago
                        </label>
                        <select id="filterTeacherPayment" onchange="applyTeacherFilters()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="all">Todos</option>
                            <option value="hourly">Por Hora</option>
                            <option value="salary">Salario Mensual</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: #6b7280; text-transform: uppercase;">
                            Buscar
                        </label>
                        <input type="text" id="filterTeacherSearch" onkeyup="applyTeacherFilters()"
                               placeholder="Nombre, email, teléfono..."
                               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                </div>
            </div>

            <!-- Teachers Table -->
            <div id="teachersGrid" style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                    Cargando profesores...
                </div>
            </div>
        </div>
    `;
}

// ============================================
// GRID RENDERING
// ============================================

function renderTeachersStats(teachers) {
    const active = teachers.filter(t => t.status === 'active').length;
    const inactive = teachers.filter(t => t.status === 'inactive').length;
    const totalGroups = teachers.reduce((sum, t) => sum + t.groupCount, 0);
    const totalStudents = teachers.reduce((sum, t) => sum + t.studentCount, 0);

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            <div style="background: white; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; border-left: 4px solid #f59e0b;">
                <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${teachers.length}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Total Profesores</div>
            </div>
            <div style="background: white; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; border-left: 4px solid #10b981;">
                <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${active}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Activos</div>
            </div>
            <div style="background: white; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; border-left: 4px solid #3b82f6;">
                <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${totalGroups}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Grupos Asignados</div>
            </div>
            <div style="background: white; padding: 1.25rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; border-left: 4px solid #8b5cf6;">
                <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${totalStudents}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Estudiantes Total</div>
            </div>
        </div>
    `;
}

function renderTeachersTable(teachers) {
    if (teachers.length === 0) {
        return `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">👩‍🏫</div>
                <p style="color: #6b7280; margin-bottom: 1rem;">No hay profesores registrados</p>
                <button onclick="showTeacherModal()" style="background: #f59e0b; color: white; padding: 0.75rem 1.5rem;
                        border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    ➕ Agregar Primer Profesor
                </button>
            </div>
        `;
    }

    return `
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <tr>
                    <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Profesor</th>
                    <th style="padding: 1rem; text-align: left; font-weight: 600; color: #374151;">Contacto</th>
                    <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Idiomas</th>
                    <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Grupos</th>
                    <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Pago</th>
                    <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Estado</th>
                    <th style="padding: 1rem; text-align: center; font-weight: 600; color: #374151;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${teachers.map(teacher => renderTeacherRow(teacher)).join('')}
            </tbody>
        </table>
    `;
}

function renderTeacherRow(teacher) {
    const statusColor = teacher.status === 'active' ? '#10b981' : '#6b7280';
    const statusText = teacher.status === 'active' ? 'Activo' : 'Inactivo';
    const statusBg = teacher.status === 'active' ? '#d1fae5' : '#f3f4f6';

    const languageFlags = {
        english: '🇬🇧',
        portuguese: '🇧🇷',
        german: '🇩🇪',
        spanish: '🇪🇸'
    };

    const languages = (teacher.languages || []).map(lang =>
        `<span title="${lang}" style="font-size: 1.25rem;">${languageFlags[lang] || '🌐'}</span>`
    ).join(' ');

    return `
        <tr style="border-bottom: 1px solid #f3f4f6; transition: background 0.2s;"
            onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
            <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #f59e0b, #d97706);
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                                color: white; font-weight: bold; font-size: 1.1rem;">
                        ${(teacher.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #111827;">${teacher.name || 'Sin nombre'}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">ID: ${teacher.id}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 1rem;">
                <div style="font-size: 0.875rem;">
                    <div style="color: #374151;">📱 ${teacher.phone || '-'}</div>
                    <div style="color: #6b7280;">✉️ ${teacher.email || '-'}</div>
                </div>
            </td>
            <td style="padding: 1rem; text-align: center;">
                ${languages || '<span style="color: #9ca3af;">-</span>'}
            </td>
            <td style="padding: 1rem; text-align: center;">
                ${teacher.groupCount > 0 ? `
                    <button onclick="showTeacherGroups('${teacher.id}')"
                            style="background: #dbeafe; color: #1d4ed8; border: none; padding: 0.5rem 0.75rem;
                                   border-radius: 6px; cursor: pointer; font-weight: 600;">
                        📚 ${teacher.groupCount} grupos
                    </button>
                ` : `
                    <span style="color: #9ca3af; font-size: 0.875rem;">Sin grupos</span>
                `}
            </td>
            <td style="padding: 1rem; text-align: center;">
                ${teacher.paymentType === 'salary' ? `
                    <div style="background: #f3e8ff; color: #7c3aed; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500;">
                        💼 Salario
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                        $${(teacher.monthlySalary || 0).toLocaleString('es-CO')}/mes
                    </div>
                ` : `
                    <div style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500;">
                        ⏰ Por hora
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                        $${(teacher.hourlyRate || 0).toLocaleString('es-CO')}/h
                    </div>
                `}
            </td>
            <td style="padding: 1rem; text-align: center;">
                <button onclick="toggleTeacherStatus('${teacher.id}')"
                        style="background: ${statusBg}; color: ${statusColor}; border: none; padding: 0.35rem 0.75rem;
                               border-radius: 20px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;">
                    ${statusText}
                </button>
            </td>
            <td style="padding: 1rem; text-align: center;">
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button onclick="showTeacherModal('${teacher.id}')" title="Editar"
                            style="background: #3b82f6; color: white; border: none; width: 32px; height: 32px;
                                   border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        ✏️
                    </button>
                    <button onclick="deleteTeacher('${teacher.id}')" title="Eliminar"
                            style="background: #ef4444; color: white; border: none; width: 32px; height: 32px;
                                   border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ============================================
// MODAL FORM
// ============================================

window.showTeacherModal = function(teacherId = null) {
    const teacher = teacherId ? window.TeacherManager.teachers.get(teacherId) : null;
    const isEdit = !!teacher;

    const modalHTML = `
        <div id="teacherModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
                display: flex; align-items: center; justify-content: center; z-index: 10001; padding: 1rem;">
            <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                <!-- Modal Header -->
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 1.5rem; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; color: white; font-size: 1.5rem;">
                            ${isEdit ? '✏️ Editar Profesor' : '➕ Nuevo Profesor'}
                        </h2>
                        <button onclick="closeTeacherModal()" style="background: rgba(255,255,255,0.2); border: none;
                                color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.25rem;">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <form id="teacherForm" style="padding: 1.5rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <!-- Name -->
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Nombre Completo *
                            </label>
                            <input type="text" id="tchName" value="${teacher?.name || ''}" required
                                   placeholder="Nombre del profesor"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                        </div>

                        <!-- Phone -->
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Teléfono *
                            </label>
                            <input type="tel" id="tchPhone" value="${teacher?.phone || ''}" required
                                   placeholder="300 123 4567"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                        </div>

                        <!-- Email -->
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Correo *
                            </label>
                            <input type="email" id="tchEmail" value="${teacher?.email || ''}" required
                                   placeholder="profesor@email.com"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                        </div>

                        <!-- Languages -->
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Idiomas que Enseña
                            </label>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.5rem; background: #f9fafb; border-radius: 8px;">
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchLanguages" value="english"
                                           ${teacher?.languages?.includes('english') ? 'checked' : ''}>
                                    <span>🇬🇧 Inglés</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchLanguages" value="portuguese"
                                           ${teacher?.languages?.includes('portuguese') ? 'checked' : ''}>
                                    <span>🇧🇷 Portugués</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchLanguages" value="german"
                                           ${teacher?.languages?.includes('german') ? 'checked' : ''}>
                                    <span>🇩🇪 Alemán</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchLanguages" value="spanish"
                                           ${teacher?.languages?.includes('spanish') ? 'checked' : ''}>
                                    <span>🇪🇸 Español</span>
                                </label>
                            </div>
                        </div>

                        <!-- Payment Type -->
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Tipo de Pago
                            </label>
                            <select id="tchPaymentType" onchange="toggleTeacherPaymentFields()"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                <option value="hourly" ${(!teacher || teacher.paymentType === 'hourly') ? 'selected' : ''}>
                                    ⏰ Por Hora
                                </option>
                                <option value="salary" ${teacher?.paymentType === 'salary' ? 'selected' : ''}>
                                    💼 Salario Mensual
                                </option>
                            </select>
                        </div>

                        <!-- Hourly Rate -->
                        <div id="tchHourlyRateGroup" style="display: ${(!teacher || teacher.paymentType !== 'salary') ? 'block' : 'none'};">
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Tarifa por Hora
                            </label>
                            <select id="tchHourlyRate"
                                    style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                ${window.TeacherManager.payRates.map(rate => `
                                    <option value="${rate}" ${teacher?.hourlyRate === rate ? 'selected' : ''}>
                                        $${rate.toLocaleString('es-CO')}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Monthly Salary -->
                        <div id="tchSalaryGroup" style="display: ${teacher?.paymentType === 'salary' ? 'block' : 'none'};">
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Salario Mensual
                            </label>
                            <input type="number" id="tchMonthlySalary" value="${teacher?.monthlySalary || ''}" min="0"
                                   placeholder="1000000"
                                   style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                        </div>

                        <!-- Availability -->
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                                Disponibilidad
                            </label>
                            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 0.5rem; background: #f9fafb; border-radius: 8px;">
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchAvailability" value="morning"
                                           ${teacher?.availability?.includes('morning') ? 'checked' : ''}>
                                    <span>🌅 Mañana</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchAvailability" value="afternoon"
                                           ${teacher?.availability?.includes('afternoon') ? 'checked' : ''}>
                                    <span>☀️ Tarde</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchAvailability" value="evening"
                                           ${teacher?.availability?.includes('evening') ? 'checked' : ''}>
                                    <span>🌙 Noche</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" name="tchAvailability" value="saturday"
                                           ${teacher?.availability?.includes('saturday') ? 'checked' : ''}>
                                    <span>📅 Sábados</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
                        <button type="button" onclick="closeTeacherModal()"
                                style="padding: 0.75rem 1.5rem; background: #f3f4f6; color: #374151; border: none;
                                       border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 1rem;">
                            Cancelar
                        </button>
                        <button type="submit"
                                style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #f59e0b, #d97706);
                                       color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            ${isEdit ? '💾 Actualizar' : '➕ Crear'} Profesor
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('teacherForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveTeacherForm(teacherId);
    };
};

window.closeTeacherModal = function() {
    const modal = document.getElementById('teacherModal');
    if (modal) modal.remove();
};

window.toggleTeacherPaymentFields = function() {
    const type = document.getElementById('tchPaymentType').value;
    document.getElementById('tchHourlyRateGroup').style.display = type === 'hourly' ? 'block' : 'none';
    document.getElementById('tchSalaryGroup').style.display = type === 'salary' ? 'block' : 'none';
};

async function saveTeacherForm(teacherId) {
    try {
        const languagesCheckboxes = document.querySelectorAll('input[name="tchLanguages"]:checked');
        const availabilityCheckboxes = document.querySelectorAll('input[name="tchAvailability"]:checked');

        const existingTeacher = teacherId ? window.TeacherManager.teachers.get(teacherId) : null;

        const teacherData = {
            id: teacherId,
            name: document.getElementById('tchName').value.trim(),
            phone: document.getElementById('tchPhone').value.trim(),
            email: document.getElementById('tchEmail').value.trim(),
            languages: Array.from(languagesCheckboxes).map(cb => cb.value),
            paymentType: document.getElementById('tchPaymentType').value,
            hourlyRate: parseInt(document.getElementById('tchHourlyRate').value) || 0,
            monthlySalary: parseInt(document.getElementById('tchMonthlySalary').value) || 0,
            availability: Array.from(availabilityCheckboxes).map(cb => cb.value),
            status: existingTeacher?.status || 'active',
            createdAt: existingTeacher?.createdAt
        };

        await window.TeacherManager.saveTeacher(teacherData);

        window.showNotification('✅ Profesor guardado exitosamente', 'success');
        closeTeacherModal();
        await refreshTeachersGrid();
    } catch (error) {
        console.error('❌ Error saving teacher:', error);
        window.showNotification('❌ Error al guardar profesor', 'error');
    }
}

// ============================================
// ACTIONS
// ============================================

window.toggleTeacherStatus = async function(teacherId) {
    try {
        const newStatus = await window.TeacherManager.toggleStatus(teacherId);
        window.showNotification(`✅ Profesor ${newStatus === 'active' ? 'activado' : 'desactivado'}`, 'success');
        await refreshTeachersGrid();
    } catch (error) {
        console.error('❌ Error toggling status:', error);
        window.showNotification('❌ Error al cambiar estado', 'error');
    }
};

window.deleteTeacher = async function(teacherId) {
    const teacher = window.TeacherManager.teachers.get(teacherId);
    if (!teacher) return;

    // Check if teacher has groups assigned
    const groups = window.TeacherManager.getTeacherGroups(teacherId);
    if (groups.length > 0) {
        alert(`⚠️ No se puede eliminar a ${teacher.name} porque tiene ${groups.length} grupo(s) asignado(s).\n\nPrimero reasigna los grupos a otro profesor.`);
        return;
    }

    if (!confirm(`¿Eliminar al profesor "${teacher.name}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }

    try {
        await window.TeacherManager.deleteTeacher(teacherId);
        window.showNotification('✅ Profesor eliminado', 'success');
        await refreshTeachersGrid();
    } catch (error) {
        console.error('❌ Error deleting teacher:', error);
        window.showNotification('❌ Error al eliminar profesor', 'error');
    }
};

window.showTeacherGroups = function(teacherId) {
    const teacher = window.TeacherManager.teachers.get(teacherId);
    const groups = window.TeacherManager.getTeacherGroups(teacherId);

    if (groups.length === 0) {
        alert(`${teacher?.name || 'Este profesor'} no tiene grupos asignados.`);
        return;
    }

    const modalHTML = `
        <div id="teacherGroupsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
                display: flex; align-items: center; justify-content: center; z-index: 10001; padding: 1rem;">
            <div style="background: white; border-radius: 16px; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 1.5rem; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; color: white; font-size: 1.25rem;">
                            📚 Grupos de ${teacher?.name || 'Profesor'}
                        </h2>
                        <button onclick="document.getElementById('teacherGroupsModal').remove()"
                                style="background: rgba(255,255,255,0.2); border: none; color: white;
                                       width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.25rem;">
                            ✕
                        </button>
                    </div>
                </div>
                <div style="padding: 1rem;">
                    ${groups.map(group => `
                        <div style="padding: 1rem; background: #f9fafb; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid #3b82f6;">
                            <div style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">
                                <span style="background: #3b82f6; color: white; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; margin-right: 0.5rem;">
                                    ${group.groupId}
                                </span>
                                ${group.displayName || 'Sin nombre'}
                            </div>
                            <div style="font-size: 0.875rem; color: #6b7280;">
                                📅 ${group.daysShort || group.days?.join(', ')} • 🕐 ${group.startTime} - ${group.endTime}
                            </div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                                👥 ${group.studentIds?.length || 0} estudiantes
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ============================================
// FILTERS & REFRESH
// ============================================

window.applyTeacherFilters = function() {
    const filters = {
        status: document.getElementById('filterTeacherStatus').value,
        language: document.getElementById('filterTeacherLanguage').value,
        paymentType: document.getElementById('filterTeacherPayment').value,
        search: document.getElementById('filterTeacherSearch').value
    };

    const teachers = window.TeacherManager.filterTeachers(filters);

    document.getElementById('teachersStats').innerHTML = renderTeachersStats(teachers);
    document.getElementById('teachersGrid').innerHTML = renderTeachersTable(teachers);
};

window.refreshTeachersGrid = async function() {
    // Get all teachers with stats first (for stats display)
    const allTeachers = window.TeacherManager.getTeachersWithStats();

    // Apply current filter (default to active)
    const filters = {
        status: document.getElementById('filterTeacherStatus')?.value || 'active',
        language: document.getElementById('filterTeacherLanguage')?.value || 'all',
        paymentType: document.getElementById('filterTeacherPayment')?.value || 'all',
        search: document.getElementById('filterTeacherSearch')?.value || ''
    };

    const filteredTeachers = window.TeacherManager.filterTeachers(filters);

    const statsEl = document.getElementById('teachersStats');
    const gridEl = document.getElementById('teachersGrid');

    if (statsEl) {
        statsEl.innerHTML = renderTeachersStats(allTeachers);
    }

    if (gridEl) {
        gridEl.innerHTML = renderTeachersTable(filteredTeachers);
    }
};

console.log('✅ Teachers module loaded successfully');
