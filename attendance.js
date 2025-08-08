// attendance.js - Simplified Attendance System with Payment Integration
console.log('📋 Loading attendance module v3.0...');

// ==================================================================================
// ATTENDANCE MANAGER CLASS
// ==================================================================================
class AttendanceManager {
    constructor() {
        this.attendanceRecords = new Map();
        this.substituteRecords = new Map();
        this.holidayCalendar = new Map();
        this.paymentRates = new Map(); // Store teacher-group payment rates
        this.initialized = false;
    }

    // Initialize and load data from Firebase
    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing Attendance Manager...');
        
        try {
            // Load existing attendance records
            await this.loadAttendanceRecords();
            // Load payment rates
            await this.loadPaymentRates();
            // Load holidays
            await this.loadHolidays();
            
            this.initialized = true;
            console.log('✅ Attendance Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing Attendance Manager:', error);
        }
    }

    // Load attendance records from Firebase
    async loadAttendanceRecords() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'attendance');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, record]) => {
                    this.attendanceRecords.set(id, record);
                });
                console.log(`✅ Loaded ${this.attendanceRecords.size} attendance records`);
            }
        } catch (error) {
            console.error('❌ Error loading attendance records:', error);
        }
    }

    // Load payment rates from Firebase
    async loadPaymentRates() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'paymentRates');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, rate]) => {
                    const key = `${rate.teacherId}-${rate.groupId}`;
                    this.paymentRates.set(key, rate);
                });
                console.log(`✅ Loaded ${this.paymentRates.size} payment rates`);
            }
        } catch (error) {
            console.error('❌ Error loading payment rates:', error);
        }
    }

    // Load holidays from Firebase
    async loadHolidays() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'holidays');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, holiday]) => {
                    this.holidayCalendar.set(holiday.date, holiday);
                });
                console.log(`✅ Loaded ${this.holidayCalendar.size} holidays`);
            }
        } catch (error) {
            console.error('❌ Error loading holidays:', error);
        }
    }

    // Get or create payment rate for teacher-group combination
    async getTeacherGroupRate(teacherId, groupId) {
        const key = `${teacherId}-${groupId}`;
        let rate = this.paymentRates.get(key);
        
        if (!rate) {
            // If no specific rate, get teacher's default rate
            const teacher = window.TeacherManager?.teachers?.get(teacherId);
            if (teacher) {
                rate = {
                    teacherId,
                    groupId,
                    amount: teacher.hourlyRate || 17500, // Default rate
                    currency: 'COP',
                    type: 'hourly'
                };
                // Save the rate for future use
                await this.savePaymentRate(rate);
            }
        }
        
        return rate;
    }

    // Save payment rate
    async savePaymentRate(rate) {
        try {
            const key = `${rate.teacherId}-${rate.groupId}`;
            const id = `RATE-${Date.now()}`;
            
            const rateData = {
                id,
                ...rate,
                createdAt: new Date().toISOString()
            };
            
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `paymentRates/${id}`);
            await db.set(ref, rateData);
            
            this.paymentRates.set(key, rateData);
            console.log('✅ Payment rate saved:', key);
            return rateData;
        } catch (error) {
            console.error('❌ Error saving payment rate:', error);
        }
    }

    // Mark class attendance (simplified - no check-out needed)
    async markClassAttendance(groupId, teacherId, date = null, isSubstitute = false) {
        try {
            const attendanceDate = date || new Date().toISOString().split('T')[0];
            
            // Ensure GroupsManager is initialized
            if (!window.GroupsManager?.initialized) {
                await window.GroupsManager?.init();
            }
            
            const group = window.GroupsManager?.groups.get(groupId);
            
            if (!group) {
                throw new Error('Grupo no encontrado');
            }

            // Get scheduled hours from group (parse schedule time)
            let scheduledHours = 2; // Default
            if (group.schedule?.time) {
                const times = group.schedule.time.split('-');
                if (times.length === 2) {
                    const start = times[0].split(':');
                    const end = times[1].split(':');
                    const startHour = parseInt(start[0]) + (parseInt(start[1] || 0) / 60);
                    const endHour = parseInt(end[0]) + (parseInt(end[1] || 0) / 60);
                    scheduledHours = endHour - startHour;
                    if (scheduledHours < 0) scheduledHours += 24; // Handle overnight classes
                }
            }
            // Special case for Saturday classes (4 hours)
            if (group.schedule?.days?.includes('Sábado')) {
                scheduledHours = 4;
            }
            
            const record = {
                id: `ATT-${Date.now()}`,
                groupId,
                groupName: group.name,
                teacherId,
                originalTeacherId: isSubstitute ? group.teacherId : null,
                date: attendanceDate,
                time: new Date().toLocaleTimeString('es-CO', { hour12: false }),
                scheduledHours,
                actualHours: scheduledHours, // Automatically use scheduled hours
                students: {},
                status: 'active',
                isSubstitute,
                paymentGenerated: false
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `attendance/${record.id}`);
            await db.set(ref, record);
            
            this.attendanceRecords.set(record.id, record);
            
            // Auto-generate payment record
            await this.generatePaymentRecord(record);
            
            console.log('✅ Attendance record created:', record.id);
            return record;
        } catch (error) {
            console.error('❌ Error creating attendance:', error);
            throw error;
        }
    }

    // Mark individual student attendance
    async markStudentAttendance(attendanceId, studentId, status = 'present') {
        try {
            const attendance = this.attendanceRecords.get(attendanceId);
            if (!attendance) {
                throw new Error('Registro de asistencia no encontrado');
            }

            const studentRecord = {
                studentId,
                status, // 'present', 'absent', 'late'
                timestamp: new Date().toISOString()
            };

            // Update Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 
                              `attendance/${attendanceId}/students/${studentId}`);
            await db.set(ref, studentRecord);
            
            // Update local record
            attendance.students[studentId] = studentRecord;
            
            console.log('✅ Student attendance marked:', studentId, status);
            return true;
        } catch (error) {
            console.error('❌ Error marking student attendance:', error);
            throw error;
        }
    }

    // Create substitute teacher record
    async createSubstituteRecord(groupId, substituteTeacherId, date, reason = '') {
        try {
            const group = window.GroupsManager?.groups.get(groupId);
            const originalTeacherId = group?.teacherId;
            
            // Mark original teacher as absent (0 hours)
            await this.markAbsentTeacher(groupId, originalTeacherId, date, reason);
            
            // Create attendance for substitute
            const substituteRecord = await this.markClassAttendance(
                groupId, 
                substituteTeacherId, 
                date, 
                true // isSubstitute = true
            );
            
            console.log('✅ Substitute record created');
            return substituteRecord;
        } catch (error) {
            console.error('❌ Error creating substitute record:', error);
            throw error;
        }
    }

    // Mark teacher as absent (0 hours with reason)
    async markAbsentTeacher(groupId, teacherId, date, reason = '') {
        try {
            const group = window.GroupsManager?.groups.get(groupId);
            
            const record = {
                id: `ABS-${Date.now()}`,
                groupId,
                groupName: group?.name || 'Unknown',
                teacherId,
                date,
                scheduledHours: 0,
                actualHours: 0,
                reason, // sick, personal, no students, etc.
                status: 'absent',
                paymentGenerated: true // No payment for absent
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `absences/${record.id}`);
            await db.set(ref, record);
            
            console.log('✅ Absence recorded:', record.id);
            return record;
        } catch (error) {
            console.error('❌ Error recording absence:', error);
            throw error;
        }
    }

    // Generate payment record automatically
    async generatePaymentRecord(attendanceRecord) {
        try {
            if (attendanceRecord.paymentGenerated) return;
            if (attendanceRecord.actualHours === 0) return; // No payment for 0 hours
            
            // Get payment rate from internal method
            const rate = await this.getTeacherGroupRate(
                attendanceRecord.teacherId, 
                attendanceRecord.groupId
            );
            
            if (!rate) {
                console.warn('⚠️ No payment rate defined for this teacher-group combination');
                return;
            }

            const paymentRecord = {
                id: `PAY-${Date.now()}`,
                attendanceId: attendanceRecord.id,
                teacherId: attendanceRecord.teacherId,
                groupId: attendanceRecord.groupId,
                groupName: attendanceRecord.groupName,
                date: attendanceRecord.date,
                hours: attendanceRecord.actualHours,
                rate: rate.amount,
                currency: rate.currency || 'COP',
                total: attendanceRecord.actualHours * rate.amount,
                status: 'pending',
                isSubstitute: attendanceRecord.isSubstitute,
                month: new Date(attendanceRecord.date).toISOString().slice(0, 7), // YYYY-MM
                type: 'class' // To differentiate from monthly salary
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `teacherPayments/${paymentRecord.id}`);
            await db.set(ref, paymentRecord);
            
            // Update attendance record
            attendanceRecord.paymentGenerated = true;
            const attRef = db.ref(window.FirebaseData.database, 
                                 `attendance/${attendanceRecord.id}/paymentGenerated`);
            await db.set(attRef, true);
            
            console.log('✅ Payment record generated:', paymentRecord.id);
            return paymentRecord;
        } catch (error) {
            console.error('❌ Error generating payment:', error);
        }
    }

    // Set holiday (global or per teacher)
    async setHoliday(date, type = 'global', teacherId = null, description = '') {
        try {
            const holiday = {
                id: `HOL-${Date.now()}`,
                date,
                type, // 'global' or 'teacher'
                teacherId,
                description,
                createdAt: new Date().toISOString()
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `holidays/${holiday.id}`);
            await db.set(ref, holiday);
            
            this.holidayCalendar.set(date, holiday);
            
            console.log('✅ Holiday set:', holiday.id);
            return holiday;
        } catch (error) {
            console.error('❌ Error setting holiday:', error);
            throw error;
        }
    }

    // Check if date is holiday
    async isHoliday(date, teacherId = null) {
        const holiday = this.holidayCalendar.get(date);
        if (!holiday) return false;
        
        if (holiday.type === 'global') return true;
        if (holiday.type === 'teacher' && holiday.teacherId === teacherId) return true;
        
        return false;
    }

    // Get attendance records for a date range
    async getAttendanceRecords(startDate, endDate, teacherId = null) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'attendance');
            const snapshot = await db.get(ref);
            
            if (!snapshot.exists()) return [];
            
            let records = Object.values(snapshot.val())
                .filter(r => r.date >= startDate && r.date <= endDate);
            
            if (teacherId) {
                records = records.filter(r => r.teacherId === teacherId);
            }
            
            return records.sort((a, b) => b.date.localeCompare(a.date));
        } catch (error) {
            console.error('❌ Error getting attendance records:', error);
            return [];
        }
    }

    // Get month summary for teacher
    async getMonthSummary(teacherId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        
        const records = await this.getAttendanceRecords(startDate, endDate, teacherId);
        
        const summary = {
            totalHours: 0,
            totalClasses: 0,
            substituteClasses: 0,
            absences: 0,
            byGroup: {}
        };
        
        records.forEach(record => {
            summary.totalHours += record.actualHours;
            summary.totalClasses++;
            
            if (record.isSubstitute) summary.substituteClasses++;
            if (record.actualHours === 0) summary.absences++;
            
            if (!summary.byGroup[record.groupId]) {
                summary.byGroup[record.groupId] = {
                    name: record.groupName,
                    classes: 0,
                    hours: 0
                };
            }
            
            summary.byGroup[record.groupId].classes++;
            summary.byGroup[record.groupId].hours += record.actualHours;
        });
        
        return summary;
    }

    // Get students for a group
    async getStudentsForGroup(groupName) {
        // Ensure StudentManager is initialized
        if (!window.StudentManager?.initialized) {
            await window.StudentManager?.init();
        }
        
        let students = [];
        
        // Try different methods to get students
        if (window.StudentManager?.getStudents) {
            students = window.StudentManager.getStudents({ grupo: groupName });
        } else if (window.StudentManager?.students) {
            students = Array.from(window.StudentManager.students.values())
                .filter(s => s.grupo === groupName && s.status === 'active');
        }
        
        return students;
    }
}

// ==================================================================================
// UI RENDERING FUNCTIONS
// ==================================================================================

function renderAttendanceView() {
    const currentUser = window.FirebaseData?.currentUser;
    const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
    const teacher = teachers.find(t => t.email === currentUser?.email);
    const isAdmin = !teacher;
    
    return `
        <div style="min-height: 100vh; background: #f3f4f6; padding: 1rem;">
            <!-- Header -->
            <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; 
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">
                    📋 Control de Asistencia
                </h2>
                <p style="margin: 0; color: #6b7280;">
                    ${new Date().toLocaleDateString('es-CO', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>
            
            ${isAdmin ? renderAdminControls() : renderTeacherControls(teacher)}
            
            <!-- Active Classes Container -->
            <div id="activeClassesContainer"></div>
            
            <!-- Today's Summary -->
            <div id="todaySummaryContainer"></div>
        </div>
    `;
}

function renderAdminControls() {
    return `
        <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h3 style="margin: 0 0 1rem 0;">Control Administrativo</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <button onclick="window.showAllTeachersAttendance()" class="btn btn-primary">
                    👥 Ver Todos los Profesores
                </button>
                <button onclick="window.showSubstituteModal()" class="btn btn-secondary">
                    🔄 Asignar Sustituto
                </button>
                <button onclick="window.showHolidayModal()" class="btn btn-secondary">
                    🏖️ Configurar Festivos
                </button>
                <button onclick="window.showAbsenceModal()" class="btn btn-warning">
                    ❌ Marcar Ausencia
                </button>
                <button onclick="window.showPaymentRatesModal()" class="btn btn-info">
                    💰 Configurar Tarifas
                </button>
                <button onclick="window.showMonthlyReport()" class="btn btn-success">
                    📊 Reporte Mensual
                </button>
            </div>
        </div>
    `;
}

function renderTeacherControls(teacher) {
    if (!teacher) {
        return `
            <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="color: #ef4444;">No se encontró información del profesor</p>
            </div>
        `;
    }
    
    // Get teacher's groups
    const groups = Array.from(window.GroupsManager?.groups?.values() || [])
        .filter(g => g.teacherId === teacher.id);
    
    return `
        <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h3 style="margin: 0 0 1rem 0;">Mis Grupos - ${teacher.name}</h3>
            ${groups.length === 0 ? 
                '<p style="color: #6b7280;">No tienes grupos asignados</p>' :
                `<div style="display: grid; gap: 0.5rem;">
                    ${groups.map(group => `
                        <button onclick="window.startAttendance('${group.id}', '${teacher.id}')" 
                                class="btn btn-primary" style="padding: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>${group.name}</span>
                                <span style="font-size: 0.875rem; opacity: 0.8;">
                                    ${group.schedule?.days || ''} 
                                    ${group.schedule?.time || ''}
                                </span>
                            </div>
                        </button>
                    `).join('')}
                </div>`
            }
        </div>
    `;
}

async function renderStudentAttendanceList(attendanceId, groupId) {
    const group = window.GroupsManager?.groups.get(groupId);
    
    // Get students for this group
    const students = await window.AttendanceManager.getStudentsForGroup(group?.name);
    
    const attendance = window.AttendanceManager.attendanceRecords.get(attendanceId);
    
    return `
        <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h3 style="margin: 0 0 1rem 0;">
                Lista de Asistencia - ${group?.name || 'Grupo'}
            </h3>
            <p style="margin: 0 0 1rem 0; color: #6b7280;">
                ${students.length} estudiantes en este grupo
            </p>
            ${students.length === 0 ? 
                '<p style="color: #ef4444;">No hay estudiantes asignados a este grupo</p>' :
                `<div style="display: grid; gap: 0.5rem;">
                    ${students.map(student => {
                        const studentAttendance = attendance?.students?.[student.id];
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; 
                                        padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                                <div>
                                    <div style="font-weight: 600;">${student.nombre}</div>
                                    <div style="font-size: 0.75rem; color: #6b7280;">
                                        ${student.telefono || 'Sin teléfono'}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.25rem;">
                                    <button onclick="window.markStudent('${attendanceId}', '${student.id}', 'present')" 
                                            class="btn btn-sm ${studentAttendance?.status === 'present' ? 'btn-success' : 'btn-secondary'}">
                                        ✅
                                    </button>
                                    <button onclick="window.markStudent('${attendanceId}', '${student.id}', 'late')" 
                                            class="btn btn-sm ${studentAttendance?.status === 'late' ? 'btn-warning' : 'btn-secondary'}">
                                        ⏰
                                    </button>
                                    <button onclick="window.markStudent('${attendanceId}', '${student.id}', 'absent')" 
                                            class="btn btn-sm ${studentAttendance?.status === 'absent' ? 'btn-danger' : 'btn-secondary'}">
                                        ❌
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>`
            }
            
            <button onclick="window.completeAttendance('${attendanceId}')" 
                    class="btn btn-success" 
                    style="width: 100%; margin-top: 1rem; padding: 1rem;">
                ✅ Completar Asistencia
            </button>
        </div>
    `;
}

// ==================================================================================
// MODAL FUNCTIONS
// ==================================================================================

window.showPaymentRatesModal = function() {
    const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
    const groups = Array.from(window.GroupsManager?.groups?.values() || []);
    
    const modal = `
        <div id="paymentRatesModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3>💰 Configurar Tarifa de Pago</h3>
                
                <div class="form-group">
                    <label>Profesor</label>
                    <select id="rateTeacher" style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar profesor...</option>
                        ${teachers.map(t => `
                            <option value="${t.id}">${t.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Grupo</label>
                    <select id="rateGroup" style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar grupo...</option>
                        ${groups.map(g => `
                            <option value="${g.id}">${g.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tarifa por Hora (COP)</label>
                    <input type="number" id="rateAmount" 
                           placeholder="Ej: 17500"
                           style="width: 100%; padding: 0.75rem;">
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="window.closeModal('paymentRatesModal')" 
                            class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="window.savePaymentRate()" 
                            class="btn btn-primary" style="flex: 1;">
                        Guardar Tarifa
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
};

window.savePaymentRate = async function() {
    const teacherId = document.getElementById('rateTeacher').value;
    const groupId = document.getElementById('rateGroup').value;
    const amount = parseFloat(document.getElementById('rateAmount').value);
    
    if (!teacherId || !groupId || !amount) {
        window.showNotification('⚠️ Complete todos los campos', 'warning');
        return;
    }
    
    try {
        const rate = {
            teacherId,
            groupId,
            amount,
            currency: 'COP',
            type: 'hourly'
        };
        
        await window.AttendanceManager.savePaymentRate(rate);
        window.showNotification('✅ Tarifa guardada correctamente', 'success');
        window.closeModal('paymentRatesModal');
    } catch (error) {
        console.error('Error saving rate:', error);
        window.showNotification('❌ Error al guardar tarifa', 'error');
    }
};

window.showAbsenceModal = function() {
    const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
    const groups = Array.from(window.GroupsManager?.groups?.values() || []);
    
    const modal = `
        <div id="absenceModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 400px; width: 90%;">
                <h3>❌ Marcar Ausencia</h3>
                
                <div class="form-group">
                    <label>Profesor</label>
                    <select id="absenceTeacher" style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar profesor...</option>
                        ${teachers.map(t => `
                            <option value="${t.id}">${t.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Grupo</label>
                    <select id="absenceGroup" style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar grupo...</option>
                        ${groups.map(g => `
                            <option value="${g.id}">${g.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="absenceDate" 
                           value="${new Date().toISOString().split('T')[0]}"
                           style="width: 100%; padding: 0.75rem;">
                </div>
                
                <div class="form-group">
                    <label>Razón</label>
                    <textarea id="absenceReason" 
                              placeholder="Motivo de la ausencia..."
                              style="width: 100%; padding: 0.75rem;" 
                              rows="3"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="window.closeModal('absenceModal')" 
                            class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="window.saveAbsence()" 
                            class="btn btn-danger" style="flex: 1;">
                        Marcar Ausencia
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
};

window.showSubstituteModal = function() {
    const groups = Array.from(window.GroupsManager?.groups?.values() || []);
    const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
    
    const modal = `
        <div id="substituteModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3>🔄 Asignar Profesor Sustituto</h3>
                
                <div class="form-group">
                    <label>Grupo</label>
                    <select id="substituteGroup" required style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar grupo...</option>
                        ${groups.map(g => `
                            <option value="${g.id}">
                                ${g.name} - ${g.schedule?.days || ''} 
                                (Prof. ${window.TeacherManager?.teachers.get(g.teacherId)?.name || 'N/A'})
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Profesor Sustituto</label>
                    <select id="substituteTeacher" required style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar profesor...</option>
                        ${teachers.map(t => `
                            <option value="${t.id}">${t.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="substituteDate" 
                           value="${new Date().toISOString().split('T')[0]}"
                           style="width: 100%; padding: 0.75rem;">
                </div>
                
                <div class="form-group">
                    <label>Razón de Ausencia</label>
                    <select id="substituteReason" style="width: 100%; padding: 0.75rem;">
                        <option value="sick">Enfermedad</option>
                        <option value="personal">Personal</option>
                        <option value="vacation">Vacaciones</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Notas (opcional)</label>
                    <textarea id="substituteNotes" 
                              style="width: 100%; padding: 0.75rem;" 
                              rows="3"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="window.closeModal('substituteModal')" 
                            class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="window.assignSubstitute()" 
                            class="btn btn-primary" style="flex: 1;">
                        Asignar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
};

window.showHolidayModal = function() {
    const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
    
    const modal = `
        <div id="holidayModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 400px; width: 90%;">
                <h3>🏖️ Configurar Festivo/Vacaciones</h3>
                
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="holidayType" onchange="window.toggleTeacherSelect()" 
                            style="width: 100%; padding: 0.75rem;">
                        <option value="global">Festivo Global</option>
                        <option value="teacher">Vacaciones de Profesor</option>
                    </select>
                </div>
                
                <div class="form-group" id="teacherSelectGroup" style="display: none;">
                    <label>Profesor</label>
                    <select id="holidayTeacher" style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar profesor...</option>
                        ${teachers.map(t => `
                            <option value="${t.id}">${t.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Fecha Inicio</label>
                    <input type="date" id="holidayStartDate" 
                           style="width: 100%; padding: 0.75rem;">
                </div>
                
                <div class="form-group">
                    <label>Fecha Fin</label>
                    <input type="date" id="holidayEndDate" 
                           style="width: 100%; padding: 0.75rem;">
                </div>
                
                <div class="form-group">
                    <label>Descripción</label>
                    <input type="text" id="holidayDescription" 
                           placeholder="Ej: Navidad, Vacaciones de verano..."
                           style="width: 100%; padding: 0.75rem;">
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="window.closeModal('holidayModal')" 
                            class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="window.saveHoliday()" 
                            class="btn btn-primary" style="flex: 1;">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
};

// ==================================================================================
// GLOBAL WINDOW FUNCTIONS
// ==================================================================================

// Initialize the manager
window.AttendanceManager = new AttendanceManager();

// Main loading function
window.loadAttendanceTab = async function() {
    console.log('📋 Loading attendance tab');
    
    const container = document.getElementById('attendanceContainer');
    if (!container) {
        console.error('❌ Attendance container not found');
        return;
    }

    try {
        // Initialize all required managers
        const initPromises = [];
        
        if (window.TeacherManager && !window.TeacherManager.initialized) {
            initPromises.push(window.TeacherManager.init());
        }
        
        if (window.GroupsManager && !window.GroupsManager.initialized) {
            initPromises.push(window.GroupsManager.init());
        }
        
        if (window.StudentManager && !window.StudentManager.initialized) {
            initPromises.push(window.StudentManager.init());
        }
        
        if (!window.AttendanceManager.initialized) {
            initPromises.push(window.AttendanceManager.init());
        }
        
        // Wait for all managers to initialize
        await Promise.all(initPromises);
        
        container.innerHTML = renderAttendanceView();
        await window.loadTodayAttendance();
        
        // If admin, show admin view
        const currentUser = window.FirebaseData?.currentUser;
        const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
        const teacher = teachers.find(t => t.email === currentUser?.email);
        
        if (!teacher) {
            // Admin view - show today's summary
            const summaryContainer = document.getElementById('todaySummaryContainer');
            if (summaryContainer) {
                summaryContainer.innerHTML = await window.renderAdminAttendanceView();
            }
        }
    } catch (error) {
        console.error('❌ Error loading attendance tab:', error);
        container.innerHTML = '<p style="color: red;">Error al cargar el módulo de asistencia</p>';
    }
};

window.startAttendance = async function(groupId, teacherId) {
    try {
        console.log('Starting attendance for group:', groupId, 'teacher:', teacherId);
        
        // Create attendance record
        const record = await window.AttendanceManager.markClassAttendance(groupId, teacherId);
        
        // Show student list for marking attendance
        const container = document.getElementById('activeClassesContainer');
        if (container) {
            container.innerHTML = await renderStudentAttendanceList(record.id, groupId);
        }
        
        window.showNotification('✅ Asistencia iniciada', 'success');
    } catch (error) {
        console.error('Error starting attendance:', error);
        window.showNotification('❌ Error al iniciar asistencia', 'error');
    }
};

window.markStudent = async function(attendanceId, studentId, status) {
    await window.AttendanceManager.markStudentAttendance(attendanceId, studentId, status);
    
    // Update button styles
    const buttons = document.querySelectorAll(`[onclick*="${studentId}"]`);
    buttons.forEach(btn => {
        btn.classList.remove('btn-success', 'btn-warning', 'btn-danger');
        btn.classList.add('btn-secondary');
    });
    
    const activeBtn = document.querySelector(`[onclick*="${studentId}"][onclick*="${status}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add(
            status === 'present' ? 'btn-success' :
            status === 'late' ? 'btn-warning' :
            'btn-danger'
        );
    }
};

window.completeAttendance = function(attendanceId) {
    const record = window.AttendanceManager.attendanceRecords.get(attendanceId);
    if (record) {
        record.status = 'completed';
        window.showNotification('✅ Asistencia completada', 'success');
        window.loadAttendanceTab();
    }
};

window.saveAbsence = async function() {
    const teacherId = document.getElementById('absenceTeacher').value;
    const groupId = document.getElementById('absenceGroup').value;
    const date = document.getElementById('absenceDate').value;
    const reason = document.getElementById('absenceReason').value;
    
    if (!teacherId || !groupId || !date) {
        window.showNotification('⚠️ Complete todos los campos requeridos', 'warning');
        return;
    }
    
    try {
        await window.AttendanceManager.markAbsentTeacher(groupId, teacherId, date, reason);
        window.showNotification('✅ Ausencia registrada', 'success');
        window.closeModal('absenceModal');
        window.loadAttendanceTab();
    } catch (error) {
        console.error('Error marking absence:', error);
        window.showNotification('❌ Error al marcar ausencia', 'error');
    }
};

window.assignSubstitute = async function() {
    const groupId = document.getElementById('substituteGroup').value;
    const teacherId = document.getElementById('substituteTeacher').value;
    const date = document.getElementById('substituteDate').value;
    const reason = document.getElementById('substituteReason').value;
    const notes = document.getElementById('substituteNotes').value;
    
    if (!groupId || !teacherId || !date) {
        window.showNotification('⚠️ Complete todos los campos', 'warning');
        return;
    }
    
    try {
        const fullReason = `${reason}: ${notes}`.trim();
        await window.AttendanceManager.createSubstituteRecord(groupId, teacherId, date, fullReason);
        window.showNotification('✅ Sustituto asignado', 'success');
        window.closeModal('substituteModal');
        window.loadAttendanceTab();
    } catch (error) {
        console.error('Error assigning substitute:', error);
        window.showNotification('❌ Error al asignar sustituto', 'error');
    }
};

window.saveHoliday = async function() {
    const type = document.getElementById('holidayType').value;
    const teacherId = type === 'teacher' ? document.getElementById('holidayTeacher').value : null;
    const startDate = document.getElementById('holidayStartDate').value;
    const endDate = document.getElementById('holidayEndDate').value;
    const description = document.getElementById('holidayDescription').value;
    
    if (!startDate || !endDate || (type === 'teacher' && !teacherId)) {
        window.showNotification('⚠️ Complete todos los campos', 'warning');
        return;
    }
    
    try {
        // Create holiday for each date in range
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            await window.AttendanceManager.setHoliday(dateStr, type, teacherId, description);
        }
        
        window.showNotification('✅ Festivo/Vacaciones configurado', 'success');
        window.closeModal('holidayModal');
    } catch (error) {
        console.error('Error setting holiday:', error);
        window.showNotification('❌ Error al configurar festivo', 'error');
    }
};

window.toggleTeacherSelect = function() {
    const type = document.getElementById('holidayType').value;
    const teacherGroup = document.getElementById('teacherSelectGroup');
    teacherGroup.style.display = type === 'teacher' ? 'block' : 'none';
};

window.closeModal = function(modalId) {
    document.getElementById(modalId)?.remove();
};

window.showAllTeachersAttendance = async function() {
    const container = document.getElementById('activeClassesContainer');
    const today = new Date().toISOString().split('T')[0];
    const records = await window.AttendanceManager.getAttendanceRecords(today, today);
    
    container.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 8px;">
            <h3>Asistencias de Todos los Profesores - Hoy</h3>
            ${records.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">Profesor</th>
                            <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">Grupo</th>
                            <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">Hora</th>
                            <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">Horas</th>
                            <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(r => `
                            <tr>
                                <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                                    ${window.TeacherManager?.teachers.get(r.teacherId)?.name || 'N/A'}
                                </td>
                                <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${r.groupName || 'N/A'}</td>
                                <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${r.time}</td>
                                <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${r.actualHours}</td>
                                <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                                    <span style="
                                        padding: 0.25rem 0.5rem; 
                                        border-radius: 4px;
                                        background: ${r.status === 'completed' ? '#dcfce7' : '#fef3c7'};
                                        color: ${r.status === 'completed' ? '#14532d' : '#78350f'};
                                        font-size: 0.875rem;
                                    ">
                                        ${r.status === 'completed' ? 'Completado' : 'Activo'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p>No hay registros de asistencia para hoy</p>'}
        </div>
    `;
};

window.renderAdminAttendanceView = async function() {
    const today = new Date().toISOString().split('T')[0];
    const records = await window.AttendanceManager.getAttendanceRecords(today, today);
    const pendingCount = records.filter(r => r.status === 'active').length;
    
    return `
        <div style="background: white; padding: 1.5rem; border-radius: 8px;">
            <h3>Vista Administrativa - Asistencias de Hoy</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <div style="background: #e0f2fe; padding: 1rem; border-radius: 8px;">
                    <strong>Clases Activas:</strong> ${pendingCount}
                </div>
                <div style="background: #dcfce7; padding: 1rem; border-radius: 8px;">
                    <strong>Total Clases Hoy:</strong> ${records.length}
                </div>
            </div>
            
            <h4>Registros de Hoy</h4>
            <div style="display: grid; gap: 0.5rem;">
                ${records.map(r => `
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 8px;">
                        <strong>${r.groupName || 'Grupo'}</strong> - 
                        ${window.TeacherManager?.teachers.get(r.teacherId)?.name || 'Profesor'}<br>
                        <small>Hora: ${r.time} | Estado: ${r.status}</small>
                    </div>
                `).join('') || '<p>No hay clases registradas hoy</p>'}
            </div>
        </div>
    `;
};

window.loadTodayAttendance = async function() {
    const today = new Date().toISOString().split('T')[0];
    const records = await window.AttendanceManager.getAttendanceRecords(today, today);
    
    const container = document.getElementById('todaySummaryContainer');
    if (container && records.length > 0) {
        container.innerHTML = `
            <div style="background: white; padding: 1rem; border-radius: 8px;">
                <h3 style="margin: 0 0 1rem 0;">📊 Resumen de Hoy</h3>
                <div style="display: grid; gap: 0.5rem;">
                    ${records.map(r => `
                        <div style="padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span><strong>${r.groupName}</strong></span>
                                <span>${r.actualHours} horas</span>
                            </div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                                ${window.TeacherManager?.teachers.get(r.teacherId)?.name || 'N/A'} - 
                                ${r.time}
                                ${r.isSubstitute ? ' (Sustituto)' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

window.showMonthlyReport = async function() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const teachers = Array.from(window.TeacherManager?.teachers?.values() || []);
    
    let reportHTML = '<h3>📊 Reporte Mensual de Pagos</h3>';
    
    for (const teacher of teachers) {
        const summary = await window.AttendanceManager.getMonthSummary(
            teacher.id, 
            currentYear, 
            currentMonth
        );
        
        const totalPayment = summary.totalHours * (teacher.hourlyRate || 17500);
        
        reportHTML += `
            <div style="background: white; padding: 1rem; margin: 1rem 0; border-radius: 8px;">
                <h4>${teacher.name}</h4>
                <p>Horas totales: ${summary.totalHours}</p>
                <p>Clases: ${summary.totalClasses}</p>
                <p>Pago total: $${totalPayment.toLocaleString()} COP</p>
            </div>
        `;
    }
    
    const container = document.getElementById('activeClassesContainer');
    if (container) {
        container.innerHTML = reportHTML;
    }
};

// Add button styles
const attendanceStyles = `
    .btn-success { background: #10b981 !important; }
    .btn-warning { background: #f59e0b !important; }
    .btn-danger { background: #ef4444 !important; }
    .btn-secondary { background: #6b7280 !important; }
    .btn-info { background: #0ea5e9 !important; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
`;

if (!document.getElementById('attendance-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'attendance-styles';
    styleEl.textContent = attendanceStyles;
    document.head.appendChild(styleEl);
}

console.log('✅ Attendance module v3.0 loaded successfully');
