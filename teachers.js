// teachers.js - Teacher Management Module
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
    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing teacher manager');
        await this.loadTeachers();
        this.initialized = true;
    }

    // Load teachers from Firebase
    async loadTeachers() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'teachers');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, teacher]) => {
                    this.teachers.set(id, teacher);
                });
            }
            
            // Load attendance records
            const attRef = db.ref(window.FirebaseData.database, 'attendance');
            const attSnapshot = await db.get(attRef);
            
            if (attSnapshot.exists()) {
                const attData = attSnapshot.val();
                Object.entries(attData).forEach(([id, record]) => {
                    this.attendance.set(id, record);
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

    // Calculate teacher hours for period
    getTeacherHours(teacherId, startDate, endDate) {
        const attendance = Array.from(this.attendance.values())
            .filter(a => 
                a.teacherId === teacherId &&
                a.date >= startDate &&
                a.date <= endDate
            );
        
        const totalMinutes = attendance.reduce((sum, record) => {
            if (record.checkIn && record.checkOut) {
                const checkIn = new Date(`${record.date} ${record.checkIn}`);
                const checkOut = new Date(`${record.date} ${record.checkOut}`);
                return sum + (checkOut - checkIn) / (1000 * 60);
            }
            return sum;
        }, 0);
        
        return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
    }

    // Calculate payment
    calculatePayment(teacherId, month, year) {
        const teacher = this.teachers.get(teacherId);
        if (!teacher) return 0;
        
        if (teacher.paymentType === 'salary') {
            return teacher.monthlySalary || 0;
        }
        
        // Calculate hourly payment
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        
        const hours = this.getTeacherHours(teacherId, startDate, endDate);
        const rate = teacher.hourlyRate || 0;
        
        return Math.round(hours * rate);
    }

    // Record attendance
    async recordAttendance(attendanceData) {
        try {
            const id = `ATT-${Date.now()}`;
            const record = {
                id,
                teacherId: attendanceData.teacherId,
                date: attendanceData.date,
                checkIn: attendanceData.checkIn,
                checkOut: attendanceData.checkOut,
                groupId: attendanceData.groupId,
                students: attendanceData.students || [],
                createdAt: new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `attendance/${id}`);
            await db.set(ref, record);
            
            this.attendance.set(id, record);
            return record;
        } catch (error) {
            console.error('❌ Error recording attendance:', error);
            throw error;
        }
    }
}

// UI Functions
function renderTeacherForm(teacher = null) {
    return `
        <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
            <h3>${teacher ? '✏️ Editar' : '➕ Nuevo'} Profesor</h3>
            
            <form id="teacherForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label>Nombre Completo*</label>
                    <input type="text" id="tchName" value="${teacher?.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Teléfono*</label>
                    <input type="tel" id="tchPhone" value="${teacher?.phone || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Correo*</label>
                    <input type="email" id="tchEmail" value="${teacher?.email || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Idiomas</label>
                    <select id="tchLanguages" multiple style="height: 80px;">
                        <option value="english" ${teacher?.languages?.includes('english') ? 'selected' : ''}>
                            Inglés
                        </option>
                        <option value="portuguese" ${teacher?.languages?.includes('portuguese') ? 'selected' : ''}>
                            Portugués
                        </option>
                        <option value="german" ${teacher?.languages?.includes('german') ? 'selected' : ''}>
                            Alemán
                        </option>
                        <option value="spanish" ${teacher?.languages?.includes('spanish') ? 'selected' : ''}>
                            Español
                        </option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tipo de Pago</label>
                    <select id="tchPaymentType" onchange="togglePaymentFields()">
                        <option value="hourly" ${teacher?.paymentType === 'hourly' ? 'selected' : ''}>
                            Por Hora
                        </option>
                        <option value="salary" ${teacher?.paymentType === 'salary' ? 'selected' : ''}>
                            Salario Mensual
                        </option>
                    </select>
                </div>
                
                <div class="form-group" id="hourlyRateGroup">
                    <label>Tarifa por Hora (COP)</label>
                    <select id="tchHourlyRate">
                        ${window.TeacherManager.payRates.map(rate => `
                            <option value="${rate}" ${teacher?.hourlyRate === rate ? 'selected' : ''}>
                                $${rate.toLocaleString()}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group" id="salaryGroup" style="display: none;">
                    <label>Salario Mensual (COP)</label>
                    <input type="number" id="tchMonthlySalary" value="${teacher?.monthlySalary || ''}" min="0">
                </div>
                
                <div class="form-group">
                    <label>Disponibilidad</label>
                    <select id="tchAvailability" multiple style="height: 100px;">
                        <option value="morning">Mañana (8-12)</option>
                        <option value="afternoon">Tarde (2-6)</option>
                        <option value="evening">Noche (6:30-8:30)</option>
                        <option value="saturday">Sábados</option>
                        <option value="flexible">Horario Flexible</option>
                    </select>
                </div>
                
                <div style="grid-column: 1/-1; display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="cancelTeacherForm()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${teacher ? 'Actualizar' : 'Guardar'} Profesor
                    </button>
                </div>
            </form>
        </div>
    `;
}

function renderTeacherInfoCard(teacher) {
    const groups = Array.from(window.GroupsManager?.groups.values() || [])
        .filter(g => g.teacherId === teacher.id);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const hours = window.TeacherManager.getTeacherHours(
        teacher.id, 
        `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
        `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31`
    );
    const payment = window.TeacherManager.calculatePayment(teacher.id, currentMonth, currentYear);
    
    return `
        <div style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0;">${teacher.name}</h3>
                    <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: #6b7280;">
                        <span>📱 ${teacher.phone}</span>
                        <span>✉️ ${teacher.email}</span>
                    </div>
                </div>
                <button onclick="editTeacher('${teacher.id}')" class="btn btn-sm"
                        style="background: #3b82f6; color: white;">
                    ✏️
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div style="text-align: center; padding: 0.5rem; background: #f3f4f6; border-radius: 4px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                        ${groups.length}
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">Grupos</div>
                </div>
                <div style="text-align: center; padding: 0.5rem; background: #f3f4f6; border-radius: 4px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                        ${hours}h
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">Este mes</div>
                </div>
                <div style="text-align: center; padding: 0.5rem; background: #f3f4f6; border-radius: 4px;">
                    <div style="font-size: 1.2rem; font-weight: bold; color: #f59e0b;">
                        $${payment.toLocaleString()}
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">A pagar</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                ${(teacher.languages || []).map(lang => `
                    <span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; 
                                 border-radius: 4px; font-size: 0.75rem;">
                        ${lang === 'english' ? '🇬🇧 Inglés' :
                          lang === 'portuguese' ? '🇧🇷 Portugués' :
                          lang === 'german' ? '🇩🇪 Alemán' :
                          lang === 'spanish' ? '🇪🇸 Español' : lang}
                    </span>
                `).join('')}
            </div>
            
            <div style="font-size: 0.875rem; color: #6b7280;">
                ${teacher.paymentType === 'salary' ? 
                    `💼 Salario: $${(teacher.monthlySalary || 0).toLocaleString()}` :
                    `⏰ Por hora: $${(teacher.hourlyRate || 0).toLocaleString()}/h`}
            </div>
        </div>
    `;
}

// Global functions
window.TeacherManager = new TeacherManager();

window.loadTeachersTab = async function() {
    console.log('👩‍🏫 Loading teachers tab');
    
    const container = document.getElementById('teachersContainer');
    if (!container) {
        console.error('❌ Teachers container not found');
        return;
    }

    await window.TeacherManager.init();
    
    const teachers = Array.from(window.TeacherManager.teachers.values());
    
    container.innerHTML = `
        <div style="padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>👩‍🏫 Gestión de Profesores</h2>
                <button onclick="showTeacherForm()" class="btn btn-primary">
                    ➕ Nuevo Profesor
                </button>
            </div>
            
            <div id="teacherFormContainer"></div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                ${teachers.length ?
                    teachers.map(teacher => renderTeacherInfoCard(teacher)).join('') :
                    '<div style="text-align: center; padding: 2rem; color: #666;">No hay profesores registrados</div>'
                }
            </div>
        </div>
    `;
};

window.showTeacherForm = function(teacherId = null) {
    const teacher = teacherId ? window.TeacherManager.teachers.get(teacherId) : null;
    document.getElementById('teacherFormContainer').innerHTML = renderTeacherForm(teacher);
    
    if (teacher) {
        togglePaymentFields();
    }
    
    document.getElementById('teacherForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveTeacherForm(teacherId);
    };
};

window.editTeacher = function(id) {
    showTeacherForm(id);
};

window.cancelTeacherForm = function() {
    document.getElementById('teacherFormContainer').innerHTML = '';
};

window.togglePaymentFields = function() {
    const type = document.getElementById('tchPaymentType').value;
    document.getElementById('hourlyRateGroup').style.display = type === 'hourly' ? 'block' : 'none';
    document.getElementById('salaryGroup').style.display = type === 'salary' ? 'block' : 'none';
};

async function saveTeacherForm(teacherId) {
    try {
        const languagesSelect = document.getElementById('tchLanguages');
        const availabilitySelect = document.getElementById('tchAvailability');
        
        const teacherData = {
            id: teacherId,
            name: document.getElementById('tchName').value,
            phone: document.getElementById('tchPhone').value,
            email: document.getElementById('tchEmail').value,
            languages: Array.from(languagesSelect.selectedOptions).map(o => o.value),
            paymentType: document.getElementById('tchPaymentType').value,
            hourlyRate: parseInt(document.getElementById('tchHourlyRate').value) || 0,
            monthlySalary: parseInt(document.getElementById('tchMonthlySalary').value) || 0,
            availability: Array.from(availabilitySelect.selectedOptions).map(o => o.value)
        };

        await window.TeacherManager.saveTeacher(teacherData);
        
        window.showNotification('✅ Profesor guardado', 'success');
        cancelTeacherForm();
        loadTeachersTab();
    } catch (error) {
        console.error('❌ Error saving teacher:', error);
        window.showNotification('❌ Error al guardar', 'error');
    }
}

console.log('✅ Teachers module loaded successfully');
