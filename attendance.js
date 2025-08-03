// attendance.js - Attendance Tracking Module (Mobile-friendly)
console.log('📋 Loading attendance module...');

// Attendance Manager Class
class AttendanceManager {
    constructor() {
        this.currentSession = null;
        this.todayRecords = new Map();
    }

    // Start teaching session (teacher check-in)
    async startSession(teacherId, groupId) {
        try {
            const session = {
                id: `SES-${Date.now()}`,
                teacherId,
                groupId,
                date: new Date().toISOString().split('T')[0],
                checkIn: new Date().toLocaleTimeString('es-CO', { hour12: false }),
                checkOut: null,
                students: [],
                status: 'active'
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `sessions/${session.id}`);
            await db.set(ref, session);
            
            this.currentSession = session;
            console.log('✅ Session started:', session.id);
            return session;
        } catch (error) {
            console.error('❌ Error starting session:', error);
            throw error;
        }
    }

    // End teaching session (teacher check-out)
    async endSession(sessionId) {
        try {
            const checkOut = new Date().toLocaleTimeString('es-CO', { hour12: false });
            
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `sessions/${sessionId}`);
            await db.update(ref, {
                checkOut,
                status: 'completed'
            });
            
            if (this.currentSession?.id === sessionId) {
                this.currentSession = null;
            }
            
            console.log('✅ Session ended:', sessionId);
            return true;
        } catch (error) {
            console.error('❌ Error ending session:', error);
            throw error;
        }
    }

    // Mark student attendance
    async markStudentAttendance(sessionId, studentId, status = 'present') {
        try {
            const attendanceRecord = {
                studentId,
                status, // 'present', 'absent', 'late'
                timestamp: new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 
                              `sessions/${sessionId}/students/${studentId}`);
            await db.set(ref, attendanceRecord);
            
            console.log('✅ Attendance marked:', studentId, status);
            return true;
        } catch (error) {
            console.error('❌ Error marking attendance:', error);
            throw error;
        }
    }

    // Get today's sessions
    async getTodaySessions(teacherId = null) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'sessions');
            const snapshot = await db.get(ref);
            
            if (!snapshot.exists()) return [];
            
            let sessions = Object.values(snapshot.val())
                .filter(s => s.date === today);
            
            if (teacherId) {
                sessions = sessions.filter(s => s.teacherId === teacherId);
            }
            
            return sessions.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
        } catch (error) {
            console.error('❌ Error getting sessions:', error);
            return [];
        }
    }

    // Get attendance statistics
    async getAttendanceStats(studentId, startDate, endDate) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'sessions');
            const snapshot = await db.get(ref);
            
            if (!snapshot.exists()) return { total: 0, present: 0, absent: 0, late: 0 };
            
            const sessions = Object.values(snapshot.val())
                .filter(s => 
                    s.date >= startDate && 
                    s.date <= endDate &&
                    s.students && 
                    s.students[studentId]
                );
            
            const stats = {
                total: sessions.length,
                present: 0,
                absent: 0,
                late: 0
            };
            
            sessions.forEach(session => {
                const attendance = session.students[studentId];
                if (attendance.status === 'present') stats.present++;
                else if (attendance.status === 'absent') stats.absent++;
                else if (attendance.status === 'late') stats.late++;
            });
            
            stats.percentage = stats.total > 0 ? 
                Math.round((stats.present / stats.total) * 100) : 0;
            
            return stats;
        } catch (error) {
            console.error('❌ Error getting attendance stats:', error);
            return { total: 0, present: 0, absent: 0, late: 0, percentage: 0 };
        }
    }
}

// Mobile-friendly UI Functions
function renderMobileAttendance(session, group, students) {
    return `
        <div style="min-height: 100vh; background: #f3f4f6; padding: 1rem;">
            <!-- Header -->
            <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; 
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">📋 Control de Asistencia</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                    <div><strong>Grupo:</strong> ${group.name}</div>
                    <div><strong>Hora inicio:</strong> ${session.checkIn}</div>
                    <div><strong>Profesor:</strong> ${window.TeacherManager?.teachers.get(session.teacherId)?.name || 'N/A'}</div>
                    <div><strong>Estudiantes:</strong> ${students.length}</div>
                </div>
            </div>
            
            <!-- Student List -->
            <div style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <h3 style="margin: 0 0 1rem 0;">Marcar Asistencia</h3>
                <div style="display: grid; gap: 0.75rem;">
                    ${students.map(student => {
                        const attendance = session.students?.[student.id];
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; 
                                        padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                                <div>
                                    <div style="font-weight: 600;">${student.nombre}</div>
                                    <div style="font-size: 0.75rem; color: #6b7280;">
                                        ${student.telefono || 'Sin teléfono'}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button onclick="markAttendance('${session.id}', '${student.id}', 'present')" 
                                            class="btn btn-sm ${attendance?.status === 'present' ? 'btn-success' : 'btn-secondary'}"
                                            style="padding: 0.5rem 1rem;">
                                        ✅
                                    </button>
                                    <button onclick="markAttendance('${session.id}', '${student.id}', 'late')" 
                                            class="btn btn-sm ${attendance?.status === 'late' ? 'btn-warning' : 'btn-secondary'}"
                                            style="padding: 0.5rem 1rem;">
                                        ⏰
                                    </button>
                                    <button onclick="markAttendance('${session.id}', '${student.id}', 'absent')" 
                                            class="btn btn-sm ${attendance?.status === 'absent' ? 'btn-danger' : 'btn-secondary'}"
                                            style="padding: 0.5rem 1rem;">
                                        ❌
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- End Session Button -->
            <button onclick="endTeachingSession('${session.id}')" 
                    class="btn btn-primary" 
                    style="width: 100%; padding: 1rem; font-size: 1.1rem;">
                🏁 Finalizar Clase
            </button>
        </div>
    `;
}

function renderTeacherDashboard(teacher) {
    const today = new Date().toLocaleDateString('es-CO');
    
    return `
        <div style="min-height: 100vh; background: #f3f4f6; padding: 1rem;">
            <!-- Welcome Header -->
            <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
                <h2 style="margin: 0 0 0.5rem 0;">👋 Hola, ${teacher.name}</h2>
                <p style="margin: 0; color: #6b7280;">${today}</p>
            </div>
            
            <!-- Quick Actions -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <button onclick="showStartSessionModal()" 
                        class="btn btn-primary" 
                        style="padding: 2rem 1rem; font-size: 1.1rem;">
                    ▶️ Iniciar Clase
                </button>
                <button onclick="showTodaySessions()" 
                        class="btn btn-secondary" 
                        style="padding: 2rem 1rem; font-size: 1.1rem;">
                    📊 Ver Sesiones
                </button>
            </div>
            
            <!-- Active Session -->
            <div id="activeSessionContainer"></div>
            
            <!-- Today's Summary -->
            <div id="todaySummaryContainer"></div>
        </div>
    `;
}

// Global functions
window.AttendanceManager = new AttendanceManager();

window.loadAttendanceTab = async function() {
    console.log('📋 Loading attendance tab');
    
    const container = document.getElementById('attendanceContainer');
    if (!container) {
        console.error('❌ Attendance container not found');
        return;
    }

    // Check if user is a teacher
    const currentUser = window.FirebaseData?.currentUser;
    if (!currentUser) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center;">Por favor inicia sesión</div>';
        return;
    }

    // Find teacher by email
    const teachers = Array.from(window.TeacherManager?.teachers.values() || []);
    const teacher = teachers.find(t => t.email === currentUser.email);
    
    if (teacher) {
        container.innerHTML = renderTeacherDashboard(teacher);
        await updateActiveSession(teacher.id);
    } else {
        // Admin view
        container.innerHTML = await renderAdminAttendanceView();
    }
};

window.showStartSessionModal = async function() {
    const teachers = Array.from(window.TeacherManager?.teachers.values() || []);
    const currentUser = window.FirebaseData?.currentUser;
    const teacher = teachers.find(t => t.email === currentUser.email);
    
    if (!teacher) {
        window.showNotification('❌ No se encontró el profesor', 'error');
        return;
    }
    
    // Get teacher's groups
    const groups = Array.from(window.GroupsManager?.groups.values() || [])
        .filter(g => g.teacherId === teacher.id);
    
    const modal = `
        <div id="startSessionModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 400px; width: 90%;">
                <h3>▶️ Iniciar Clase</h3>
                
                <div class="form-group">
                    <label>Seleccionar Grupo</label>
                    <select id="sessionGroup" required style="width: 100%; padding: 0.75rem;">
                        <option value="">Seleccionar...</option>
                        ${groups.map(g => `
                            <option value="${g.id}">${g.name} - ${g.schedule}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="closeModal('startSessionModal')" 
                            class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="startNewSession('${teacher.id}')" 
                            class="btn btn-primary" style="flex: 1;">
                        Iniciar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
};

window.startNewSession = async function(teacherId) {
    const groupId = document.getElementById('sessionGroup').value;
    if (!groupId) {
        window.showNotification('⚠️ Selecciona un grupo', 'warning');
        return;
    }
    
    try {
        const session = await window.AttendanceManager.startSession(teacherId, groupId);
        window.showNotification('✅ Clase iniciada', 'success');
        closeModal('startSessionModal');
        
        // Load attendance view
        await loadAttendanceView(session.id);
    } catch (error) {
        console.error('❌ Error starting session:', error);
        window.showNotification('❌ Error al iniciar clase', 'error');
    }
};

window.loadAttendanceView = async function(sessionId) {
    const session = window.AttendanceManager.currentSession;
    if (!session) return;
    
    const group = window.GroupsManager?.groups.get(session.groupId);
    const students = window.StudentManager?.getStudents({ grupo: group?.name }) || [];
    
    const container = document.getElementById('attendanceContainer');
    container.innerHTML = renderMobileAttendance(session, group, students);
};

window.markAttendance = async function(sessionId, studentId, status) {
    await window.AttendanceManager.markStudentAttendance(sessionId, studentId, status);
    window.showNotification('✅ Asistencia marcada', 'success');
    
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

window.endTeachingSession = async function(sessionId) {
    if (!confirm('¿Finalizar la clase?')) return;
    
    try {
        await window.AttendanceManager.endSession(sessionId);
        window.showNotification('✅ Clase finalizada', 'success');
        loadAttendanceTab();
    } catch (error) {
        console.error('❌ Error ending session:', error);
        window.showNotification('❌ Error al finalizar', 'error');
    }
};

window.closeModal = function(modalId) {
    document.getElementById(modalId)?.remove();
};

async function updateActiveSession(teacherId) {
    const sessions = await window.AttendanceManager.getTodaySessions(teacherId);
    const activeSession = sessions.find(s => s.status === 'active');
    
    const container = document.getElementById('activeSessionContainer');
    if (activeSession) {
        const group = window.GroupsManager?.groups.get(activeSession.groupId);
        container.innerHTML = `
            <div style="background: #dbeafe; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <h3 style="margin: 0 0 0.5rem 0;">🔴 Clase en Progreso</h3>
                <p style="margin: 0;">Grupo: ${group?.name || 'N/A'} - Inicio: ${activeSession.checkIn}</p>
                <button onclick="loadAttendanceView('${activeSession.id}')" 
                        class="btn btn-primary" style="margin-top: 0.5rem;">
                    Continuar Clase
                </button>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

// Add button styles
const attendanceStyles = `
    .btn-success { background: #10b981 !important; }
    .btn-warning { background: #f59e0b !important; }
    .btn-danger { background: #ef4444 !important; }
    .btn-secondary { background: #6b7280 !important; }
`;

const styleEl = document.createElement('style');
styleEl.textContent = attendanceStyles;
document.head.appendChild(styleEl);

console.log('✅ Attendance module loaded successfully');
