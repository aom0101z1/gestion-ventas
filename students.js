// students.js - Student Management Module
console.log('👥 Loading students module...');

// ============================================
// SECTION 1: DATA STRUCTURES & FIELD DEFINITIONS
// ============================================

// Student data structure matching Excel - ENHANCED with new fields
const studentFields = {
    nombre: '', tipoDoc: 'C.C', edad: '', numDoc: '', telefono: '', correo: '',
    acudiente: '', docAcudiente: '', fechaInicio: '', grupo: '', tipoPago: 'MENSUAL',
    valor: '', fechaPago: '', pagos: {},
    // NEW FIELDS for status management
    status: 'active', // 'active' or 'inactive'
    statusHistory: [], // Array of status changes
    paymentNotes: '', // Special payment agreements
    paymentHistory: [], // History of payment value changes
    lastModified: null,
    // NEW FIELD for student categorization
    modalidad: '', // Main category: Presencial, Compañia, Escuela, Online, Privadas
    modalidadDetalle: '', // Subcategory: For Compañia (COATS, OTRA) or Escuela (Hogar Nazareth, Remigio, otro)
    // NEW FIELD for hourly payment
    valorHora: '' // Hourly rate for "Por horas" payment type
};

// ============================================
// SECTION 2: STUDENT MANAGER CLASS
// ============================================

class StudentManager {
    constructor() {
        this.students = new Map();
        this.initialized = false;
    }

    // Initialize module
    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing student manager');
        await this.loadStudents();
        this.initialized = true;
    }

    // Load students from Firebase
    async loadStudents() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'students');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, student]) => {
                    // Ensure new fields exist for existing students
                    if (!student.status) student.status = 'active';
                    if (!student.statusHistory) student.statusHistory = [];
                    if (!student.paymentHistory) student.paymentHistory = [];
                    this.students.set(id, student);
                });
            }
            console.log(`✅ Loaded ${this.students.size} students`);
        } catch (error) {
            console.error('❌ Error loading students:', error);
        }
    }

    // Save student
    async saveStudent(studentData) {
        try {
            const id = studentData.id || `STU-${Date.now()}`;
            const isNewStudent = !studentData.id;

            const student = {
                ...studentData,
                id,
                status: studentData.status || 'active',
                statusHistory: studentData.statusHistory || [],
                paymentHistory: studentData.paymentHistory || [],
                updatedAt: window.getLocalDateTime ? window.getLocalDateTime() : new Date().toISOString(),
                createdAt: studentData.createdAt || (window.getLocalDateTime ? window.getLocalDateTime() : new Date().toISOString())
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `students/${id}`);
            await db.set(ref, student);

            this.students.set(id, student);
            console.log('✅ Student saved:', id);

            // Audit log
            if (isNewStudent && typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Estudiante añadido',
                    'student',
                    id,
                    `${student.nombre} - ${student.tipoDoc} ${student.numDoc}`,
                    { after: { nombre: student.nombre, documento: `${student.tipoDoc} ${student.numDoc}`, telefono: student.telefono, grupo: student.grupo, modalidad: student.modalidad } }
                );
            }

            return student;
        } catch (error) {
            console.error('❌ Error saving student:', error);
            throw error;
        }
    }

    // Get filtered students - ENHANCED with status filter
    getStudents(filters = {}) {
        let students = Array.from(this.students.values());

        // Filter by status
        if (filters.status && filters.status !== 'all') {
            students = students.filter(s => {
                // Default to 'active' if status is undefined or missing
                const studentStatus = s.status || 'active';
                return studentStatus === filters.status;
            });
        }

        // Filter by modalidad
        if (filters.modalidad && filters.modalidad !== 'all') {
            students = students.filter(s => s.modalidad === filters.modalidad);
        }

        if (filters.grupo) {
            students = students.filter(s => s.grupo === filters.grupo);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase().trim();
            console.log('🔍 Search filter active:', search, 'Total students before filter:', students.length);

            students = students.filter(s => {
                const nombre = (s.nombre || '').toLowerCase();
                const numDoc = String(s.numDoc || '').toLowerCase();
                const telefono = String(s.telefono || '').toLowerCase();

                return nombre.includes(search) ||
                       numDoc.includes(search) ||
                       telefono.includes(search);
            });

            console.log('✅ Search results:', students.length, 'students found');
        }

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            console.log('📅 Date range filter:', {
                startDate: filters.startDate,
                endDate: filters.endDate,
                totalStudents: students.length
            });

            students = students.filter(s => {
                if (!s.createdAt) return false;

                // Extract date part only (YYYY-MM-DD) to avoid timezone issues
                const studentDateStr = s.createdAt.split('T')[0];

                // Compare dates as strings (YYYY-MM-DD format)
                if (filters.startDate && studentDateStr < filters.startDate) return false;
                if (filters.endDate && studentDateStr > filters.endDate) return false;

                return true;
            });

            console.log('✅ Date filter results:', students.length, 'students found');
        }

        return students.sort((a, b) =>
            (a.nombre || '').localeCompare(b.nombre || '')
        );
    }

    // Update student - ENHANCED to track payment history
    async updateStudent(id, updates) {
        const existing = this.students.get(id);

        // Track payment value changes
        if (existing && updates.valor !== undefined && updates.valor !== existing.valor) {
            if (!updates.paymentHistory) updates.paymentHistory = existing.paymentHistory || [];
            updates.paymentHistory.push({
                previousValue: existing.valor,
                newValue: updates.valor,
                changedAt: new Date().toISOString(),
                notes: updates.paymentChangeReason || 'Manual update'
            });
        }

        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `students/${id}`);
        updates.updatedAt = new Date().toISOString();
        await db.update(ref, updates);

        if (existing) {
            this.students.set(id, { ...existing, ...updates });

            // Audit log - track changed fields
            if (typeof window.logAudit === 'function') {
                const changedFields = {};
                const before = {};
                const after = {};

                Object.keys(updates).forEach(key => {
                    if (key !== 'updatedAt' && key !== 'paymentHistory' && existing[key] !== updates[key]) {
                        before[key] = existing[key];
                        after[key] = updates[key];
                        changedFields[key] = true;
                    }
                });

                if (Object.keys(changedFields).length > 0) {
                    await window.logAudit(
                        'Estudiante editado',
                        'student',
                        id,
                        `${existing.nombre} - Campos modificados: ${Object.keys(changedFields).join(', ')}`,
                        { before, after }
                    );
                }
            }
        }
        return true;
    }

    // Delete student
    async deleteStudent(id) {
        // Check if user is admin or director
        if (window.userRole !== 'admin' && window.userRole !== 'director') {
            window.showNotification('🚫 Comunícate con administración - no tienes permitido borrar datos de esta plataforma', 'error');
            return false;
        }

        if (!confirm('¿Eliminar este estudiante?')) return false;

        const student = this.students.get(id);

        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `students/${id}`);
        await db.remove(ref);

        this.students.delete(id);

        // Audit log
        if (student && typeof window.logAudit === 'function') {
            await window.logAudit(
                'Estudiante eliminado',
                'student',
                id,
                `${student.nombre} - ${student.tipoDoc} ${student.numDoc}`,
                { before: { nombre: student.nombre, documento: `${student.tipoDoc} ${student.numDoc}`, telefono: student.telefono, grupo: student.grupo } }
            );
        }

        return true;
    }

    // NEW: Toggle student status
    async toggleStudentStatus(id, inactiveData = null) {
        const student = this.students.get(id);
        if (!student) return false;

        const newStatus = student.status === 'active' ? 'inactive' : 'active';
        const statusEntry = {
            previousStatus: student.status,
            newStatus: newStatus,
            changedAt: new Date().toISOString(),
            ...inactiveData
        };

        const updates = {
            status: newStatus,
            statusHistory: [...(student.statusHistory || []), statusEntry]
        };

        await this.updateStudent(id, updates);

        // Audit log
        if (typeof window.logAudit === 'function') {
            await window.logAudit(
                'Estado de estudiante cambiado',
                'student',
                id,
                `${student.nombre} - ${student.status === 'active' ? 'Activo' : 'Inactivo'} → ${newStatus === 'active' ? 'Activo' : 'Inactivo'}`,
                { before: { estado: student.status }, after: { estado: newStatus }, razon: inactiveData?.reason || 'No especificada' }
            );
        }

        return true;
    }

    // NEW: Update payment notes
    async updatePaymentNotes(id, notes) {
        await this.updateStudent(id, { paymentNotes: notes });
        return true;
    }

    // Convert from lead
    async convertFromLead(leadId) {
        try {
            const lead = await window.FirebaseData.getContactById(leadId);
            if (!lead) throw new Error('Lead no encontrado');

            const student = {
                nombre: lead.name,
                telefono: lead.phone,
                correo: lead.email,
                fechaInicio: new Date().toISOString().split('T')[0],
                leadId: leadId,
                status: 'active',
                statusHistory: [],
                paymentHistory: [],
                ...studentFields
            };

            const saved = await this.saveStudent(student);
            
            // Update lead status
            await window.FirebaseData.updateContact(leadId, {
                status: 'Convertido',
                studentId: saved.id
            });

            return saved;
        } catch (error) {
            console.error('❌ Error converting lead:', error);
            throw error;
        }
    }
}

// ============================================
// SECTION 3: MODAL COMPONENTS
// ============================================

// NEW: Render inactive status modal
function renderInactiveModal(studentId) {
    return `
        <div id="inactiveModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
             background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%;">
                <h3>📝 Marcar como Inactivo</h3>
                <form id="inactiveForm">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Fecha de inactividad:</label>
                        <input type="date" id="inactiveDate" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Razón:</label>
                        <input type="text" id="inactiveReason" placeholder="Ej: Dejó de asistir, problemas de horario..." required>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Notas adicionales:</label>
                        <textarea id="inactiveNotes" rows="3" placeholder="Detalles adicionales..." 
                                  style="width: 100%; padding: 0.5rem;"></textarea>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button type="button" onclick="closeInactiveModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" style="background: #ef4444;">
                            Marcar Inactivo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// NEW: Render payment notes modal
function renderPaymentNotesModal(student) {
    return `
        <div id="paymentNotesModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
             background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; width: 90%;">
                <h3>💰 Notas de Pago - ${student.nombre}</h3>
                
                ${student.paymentHistory && student.paymentHistory.length > 0 ? `
                    <div style="margin-bottom: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 4px;">
                        <h4>Historial de cambios:</h4>
                        ${student.paymentHistory.map(h => `
                            <div style="margin-bottom: 0.5rem; font-size: 0.9rem;">
                                📅 ${new Date(h.changedAt).toLocaleDateString()} - 
                                De $${(h.previousValue || 0).toLocaleString()} a $${(h.newValue || 0).toLocaleString()}
                                ${h.notes ? `<br><small>${h.notes}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <form id="paymentNotesForm">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Valor actual: $${(student.valor || 0).toLocaleString()}</label>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Nuevo valor ($):</label>
                        <input type="number" id="newPaymentValue" value="${student.valor || ''}" min="0">
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Notas del acuerdo especial:</label>
                        <textarea id="paymentNotes" rows="4" placeholder="Ej: 20% descuento por 2 meses, hermanos en la escuela..." 
                                  style="width: 100%; padding: 0.5rem;">${student.paymentNotes || ''}</textarea>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button type="button" onclick="closePaymentNotesModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ============================================
// SECTION 4: FORM RENDERING
// ============================================

// Helper function to get Grupos 2.0 options for the dropdown
// Official course types (priceList/cursoTipos, admin-managed in 💲 Precios).
// Selecting one auto-fills the official monthly price — no hand-typed values.
function getCursoTipoOptions(selected) {
    const tipos = window.PricingManager?.priceList?.cursoTipos || {};
    return Object.entries(tipos)
        .sort((a, b) => (a[1].nombre || '').localeCompare(b[1].nombre || ''))
        .map(([id, t]) =>
            `<option value="${id}" data-mensual="${Number(t.mensual) || 0}" ${selected === id ? 'selected' : ''}>${t.nombre} — $${(Number(t.mensual) || 0).toLocaleString('es-CO')}/mes</option>`)
        .join('');
}

window.applyCursoTipo = function(which) {
    const select = document.getElementById(which === '2' ? 'stuCursoTipo2' : 'stuCursoTipo');
    const input = document.getElementById(which === '2' ? 'stuValor2' : 'stuValor');
    if (!select || !input) return;
    const opt = select.options[select.selectedIndex];
    const mensual = Number(opt?.dataset?.mensual) || 0;
    if (mensual > 0) input.value = mensual;
};

function getGrupos2Options(selectedGrupo) {
    // Try to get groups from Grupos 2.0 system first
    if (window.GroupsManager2 && window.GroupsManager2.groups && window.GroupsManager2.groups.size > 0) {
        const groups = Array.from(window.GroupsManager2.groups.values())
            .filter(g => g.status === 'active')
            .sort((a, b) => a.groupId - b.groupId);

        return groups.map(g => {
            const displayName = g.displayName || `Grupo ${g.groupId}`;
            const studentCount = g.studentIds ? g.studentIds.length : 0;
            const maxStudents = g.maxStudents || 8;
            return `<option value="${g.groupId}" ${selectedGrupo == g.groupId ? 'selected' : ''}>
                ${g.groupId} - ${displayName} (${studentCount}/${maxStudents})
            </option>`;
        }).join('');
    }

    // Fallback to old groups system if Grupos 2.0 not available
    if (window.groupsData && window.groupsData.size > 0) {
        return Array.from(window.groupsData.keys()).map(g =>
            `<option value="${g}" ${selectedGrupo === g ? 'selected' : ''}>${g}</option>`
        ).join('');
    }

    return '';
}

function renderStudentForm(student = null) {
    const isEdit = !!student;
    return `
        <div id="studentFormModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
             background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 900px; width: 90%; 
                        max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>${isEdit ? '✏️ Editar' : '➕ Nuevo'} Estudiante</h3>
                    <button onclick="closeStudentFormModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">
                        ✖
                    </button>
                </div>
                <form id="studentForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

                    <!-- Photo Section - spans both columns -->
                    <div class="form-group" style="grid-column: span 2; display: flex; justify-content: center; padding: 1rem; background: #f9fafb; border-radius: 8px; margin-bottom: 0.5rem;">
                        <div style="text-align: center;">
                            <div id="studentPhotoPreview" style="width: 120px; height: 120px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; overflow: hidden; border: 3px solid #d1d5db;">
                                ${student?.photoUrl ?
                                    `<img src="${student.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">` :
                                    `<span style="font-size: 3rem; color: #9ca3af;">👤</span>`
                                }
                            </div>
                            <input type="hidden" id="stuPhotoUrl" value="${student?.photoUrl || ''}">
                            <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                                <button type="button" onclick="captureStudentPhoto()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                    📷 Tomar Foto
                                </button>
                                <button type="button" onclick="uploadStudentPhoto()" style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                    📁 Subir Archivo
                                </button>
                                ${student?.photoUrl ? `
                                <button type="button" onclick="removeStudentPhoto()" style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                    🗑️ Quitar
                                </button>
                                ` : ''}
                            </div>
                            <input type="file" id="stuPhotoFile" accept="image/*" style="display: none;" onchange="handlePhotoFileSelect(event)">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Nombre Completo*</label>
                        <input type="text" id="stuNombre" value="${student?.nombre || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Tipo Documento</label>
                        <select id="stuTipoDoc">
                            <option value="C.C" ${student?.tipoDoc === 'C.C' ? 'selected' : ''}>C.C</option>
                            <option value="T.I" ${student?.tipoDoc === 'T.I' ? 'selected' : ''}>T.I</option>
                            <option value="C.E" ${student?.tipoDoc === 'C.E' ? 'selected' : ''}>C.E</option>
                            <option value="PAS" ${student?.tipoDoc === 'PAS' ? 'selected' : ''}>Pasaporte</option>
                            <option value="PPT" ${student?.tipoDoc === 'PPT' ? 'selected' : ''}>PPT</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Número Documento*</label>
                        <input type="text" id="stuNumDoc" value="${student?.numDoc || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Edad</label>
                        <input type="number" id="stuEdad" value="${student?.edad || ''}" min="5" max="100">
                    </div>
                    
                    <div class="form-group">
                        <label>Teléfono*</label>
                        <input type="tel" id="stuTelefono" value="${student?.telefono || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Correo</label>
                        <input type="email" id="stuCorreo" value="${student?.correo || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Acudiente</label>
                        <input type="text" id="stuAcudiente" value="${student?.acudiente || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Tipo Doc. Acudiente</label>
                        <select id="stuTipoDocAcudiente">
                            <option value="" ${!student?.tipoDocAcudiente ? 'selected' : ''}>Seleccionar</option>
                            <option value="C.C" ${student?.tipoDocAcudiente === 'C.C' ? 'selected' : ''}>C.C</option>
                            <option value="T.I" ${student?.tipoDocAcudiente === 'T.I' ? 'selected' : ''}>T.I</option>
                            <option value="C.E" ${student?.tipoDocAcudiente === 'C.E' ? 'selected' : ''}>C.E</option>
                            <option value="PAS" ${student?.tipoDocAcudiente === 'PAS' ? 'selected' : ''}>Pasaporte</option>
                            <option value="PPT" ${student?.tipoDocAcudiente === 'PPT' ? 'selected' : ''}>PPT</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Número Doc. Acudiente</label>
                        <input type="text" id="stuDocAcudiente" value="${student?.docAcudiente || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Fecha Inicio*</label>
                        <input type="date" id="stuFechaInicio" value="${student?.fechaInicio || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Grupo</label>
                        <select id="stuGrupo">
                            <option value="">Sin asignar</option>
                            ${getGrupos2Options(student?.grupo)}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Modalidad</label>
                        <select id="stuModalidad" onchange="handleModalidadChange()">
                            <option value="">Seleccionar</option>
                            <option value="Presencial" ${student?.modalidad === 'Presencial' ? 'selected' : ''}>Presencial</option>
                            <option value="Compañia" ${student?.modalidad === 'Compañia' ? 'selected' : ''}>Compañía</option>
                            <option value="Escuela" ${student?.modalidad === 'Escuela' ? 'selected' : ''}>Escuela</option>
                            <option value="Online" ${student?.modalidad === 'Online' ? 'selected' : ''}>Online</option>
                            <option value="Privadas" ${student?.modalidad === 'Privadas' ? 'selected' : ''}>Privadas</option>
                        </select>
                    </div>

                    <div class="form-group" id="modalidadDetalleGroup" style="display: ${student?.modalidad === 'Compañia' || student?.modalidad === 'Escuela' ? 'block' : 'none'};">
                        <label id="modalidadDetalleLabel">
                            ${student?.modalidad === 'Compañia' ? 'Compañía' : student?.modalidad === 'Escuela' ? 'Escuela' : 'Detalle'}
                        </label>
                        <select id="stuModalidadDetalle">
                            <option value="">Seleccionar</option>
                            ${student?.modalidad === 'Compañia' ? `
                                <option value="COATS" ${student?.modalidadDetalle === 'COATS' ? 'selected' : ''}>COATS</option>
                                <option value="OTRA" ${student?.modalidadDetalle === 'OTRA' ? 'selected' : ''}>OTRA</option>
                            ` : student?.modalidad === 'Escuela' ? `
                                <option value="Hogar Nazareth" ${student?.modalidadDetalle === 'Hogar Nazareth' ? 'selected' : ''}>Hogar Nazareth</option>
                                <option value="Remigio" ${student?.modalidadDetalle === 'Remigio' ? 'selected' : ''}>Remigio</option>
                                <option value="otro" ${student?.modalidadDetalle === 'otro' ? 'selected' : ''}>Otro</option>
                            ` : ''}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Tipo Pago</label>
                        <select id="stuTipoPago" onchange="handleTipoPagoChange()">
                            <option value="MENSUAL" ${student?.tipoPago === 'MENSUAL' ? 'selected' : ''}>Mensual</option>
                            <option value="SEMESTRAL" ${student?.tipoPago === 'SEMESTRAL' ? 'selected' : ''}>Semestral</option>
                            <option value="POR_HORAS" ${student?.tipoPago === 'POR_HORAS' ? 'selected' : ''}>Por horas</option>
                        </select>
                    </div>

                    <div class="form-group" id="valorMensualGroup" style="display: ${!student || student?.tipoPago !== 'POR_HORAS' ? 'block' : 'none'};">
                        <label>Tipo de curso</label>
                        <select id="stuCursoTipo" onchange="applyCursoTipo('1')" ${isEdit && !window.isStudentMoneyAdmin() ? 'disabled style="background:#f3f4f6;"' : ''}>
                            <option value="">— Elegir tipo de curso (pone el precio oficial) —</option>
                            ${getCursoTipoOptions(student?.cursoTipo)}
                        </select>
                        <label style="margin-top: 0.5rem;">Valor Mensualidad ($)</label>
                        <input type="number" id="stuValor" value="${student?.valor || ''}" min="0" placeholder="Valor mensual" ${isEdit && !window.isStudentMoneyAdmin() ? 'readonly style="background:#f3f4f6;"' : ''}>
                        ${isEdit && !window.isStudentMoneyAdmin() ? '<small style="color:#92400e;">Solo el Director puede cambiar el valor de un estudiante ya registrado.</small>' : ''}
                    </div>

                    <div class="form-group" id="valorHoraGroup" style="display: ${student?.tipoPago === 'POR_HORAS' ? 'block' : 'none'};">
                        <label>Valor / Hora ($)</label>
                        <input type="number" id="stuValorHora" value="${student?.valorHora || ''}" min="0" placeholder="Valor por hora" step="0.01" ${isEdit && !window.isStudentMoneyAdmin() ? 'readonly style="background:#f3f4f6;"' : ''}>
                    </div>

                    <div class="form-group" id="segundoCursoGroup" style="display: ${!student || student?.tipoPago !== 'POR_HORAS' ? 'block' : 'none'}; border: 1px dashed #a78bfa; border-radius: 8px; padding: 0.75rem; background: #f5f3ff;">
                        <label style="font-weight: 600;">➕ Segundo curso (opcional)</label>
                        <small style="display: block; color: #6b7280; margin-bottom: 0.5rem;">
                            Para estudiantes que toman dos cursos (ej: entre semana + sábados).
                            La mensualidad total a facturar será la suma de los dos valores.
                        </small>
                        <label>Grupo segundo curso</label>
                        <select id="stuGrupo2">
                            <option value="">Sin segundo curso</option>
                            ${getGrupos2Options(student?.grupo2)}
                        </select>
                        <label style="margin-top: 0.5rem;">Tipo de curso (segundo curso)</label>
                        <select id="stuCursoTipo2" onchange="applyCursoTipo('2')" ${isEdit && !window.isStudentMoneyAdmin() ? 'disabled style="background:#f3f4f6;"' : ''}>
                            <option value="">— Elegir tipo de curso —</option>
                            ${getCursoTipoOptions(student?.cursoTipo2)}
                        </select>
                        <label style="margin-top: 0.5rem;">Valor mensualidad segundo curso ($)</label>
                        <input type="number" id="stuValor2" value="${student?.valor2 || ''}" min="0" placeholder="0 = sin cobro adicional" ${isEdit && !window.isStudentMoneyAdmin() ? 'readonly style="background:#f3f4f6;"' : ''}>
                        ${isEdit && !window.isStudentMoneyAdmin() ? '<small style="color:#92400e;">Solo el Director puede cambiar el valor del segundo curso.</small>' : ''}
                    </div>

                    ${!isEdit ? `
                    <div class="form-group">
                        <label>Matrícula ($)</label>
                        <input type="number" id="stuMatricula" value="" min="0" placeholder="Valor de matrícula">
                        <small style="color: #6b7280; font-size: 0.85rem; margin-top: 0.25rem; display: block;">
                            Solo para estudiantes nuevos. Se registrará como pago único.
                        </small>
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label>Día de Pago</label>
                        <input type="number" id="stuDiaPago" value="${student?.diaPago || '1'}" min="1" max="31">
                    </div>
                    
                    <div style="grid-column: 1/-1; display: flex; gap: 1rem; justify-content: flex-end;">
                        <button type="button" onclick="closeStudentFormModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" id="stuSubmitBtn" class="btn btn-primary">
                            ${isEdit ? 'Actualizar' : 'Guardar'} Estudiante
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ============================================
// SECTION 5: TABLE RENDERING
// ============================================

function renderStudentTable(students) {
    if (!students.length) {
        return '<div style="text-align: center; padding: 2rem; color: #666;">No hay estudiantes registrados</div>';
    }

    return `
        <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: #f3f4f6;">
                <tr>
                    <th style="padding: 0.75rem; text-align: center; width: 50px;">#</th>
                    <th style="padding: 0.75rem; text-align: left;">Nombre</th>
                    <th style="padding: 0.75rem; text-align: left;">Documento</th>
                    <th style="padding: 0.75rem; text-align: left;">Teléfono</th>
                    <th style="padding: 0.75rem; text-align: left;">Grupo</th>
                    <th style="padding: 0.75rem; text-align: left;">Modalidad</th>
                    <th style="padding: 0.75rem; text-align: left;">Pago</th>
                    <th style="padding: 0.75rem; text-align: center;">Fecha Registro</th>
                    <th style="padding: 0.75rem; text-align: center;">Estado</th>
                    <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${students.map((s, index) => {
                    // Ensure telefono is a string
                    const phoneNumber = String(s.telefono || '').replace(/\D/g, '');
                    const isInactive = s.status === 'inactive';
                    const rowStyle = isInactive ? 'background: #fee2e2;' : '';

                    // Format registration date
                    const formatDate = (isoDate) => {
                        if (!isoDate) return '-';
                        const date = new Date(isoDate);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                    };

                    return `
                        <tr style="border-top: 1px solid #e5e7eb; ${rowStyle}">
                            <td style="padding: 0.75rem; text-align: center; font-weight: bold; color: #6b7280;">
                                ${index + 1}
                            </td>
                            <td style="padding: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; ${s.photoUrl ? 'cursor: pointer;' : ''}" ${s.photoUrl ? `onclick="viewStudentPhotoFull('${s.photoUrl}', '${(s.nombre || '').replace(/'/g, "\\'")}')"` : ''}>
                                        ${s.photoUrl ?
                                            `<img src="${s.photoUrl}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">` :
                                            `<span style="font-size: 0.9rem; color: #9ca3af;">👤</span>`
                                        }
                                    </div>
                                    <span>${s.nombre || '-'}${s.paymentNotes ? ' 📋' : ''}</span>
                                </div>
                            </td>
                            <td style="padding: 0.75rem;">${s.tipoDoc || ''} ${s.numDoc || '-'}</td>
                            <td style="padding: 0.75rem;">
                                ${phoneNumber ? `
                                    <a href="https://wa.me/57${phoneNumber}"
                                       target="_blank" style="color: #059669;">
                                        ${s.telefono || '-'}
                                    </a>
                                ` : '-'}
                            </td>
                            <td style="padding: 0.75rem;">
                                ${(s.grupo && !isNaN(parseInt(s.grupo))) ? `
                                    <span style="background: #10b981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500;">
                                        📚 ${s.grupo}
                                    </span>
                                ` : '<span style="color: #9ca3af;">Sin grupo</span>'}
                            </td>
                            <td style="padding: 0.75rem;">
                                ${s.modalidad || '-'}
                                ${s.modalidadDetalle ? `<br><small style="color: #6b7280;">${s.modalidadDetalle}</small>` : ''}
                            </td>
                            <td style="padding: 0.75rem;">
                                ${s.tipoPago === 'POR_HORAS' ? 'Por horas' : s.tipoPago || '-'}<br>
                                <small>${s.tipoPago === 'POR_HORAS' ?
                                    `$${(s.valorHora || 0).toLocaleString()}/hora` :
                                    `$${window.getStudentMonthlyTotal(s).toLocaleString()}${s.valor2 ? ' (2 cursos)' : ''}`
                                }</small>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <span style="color: #6b7280; font-size: 0.9rem;">
                                    ${formatDate(s.createdAt)}
                                </span>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <button onclick="toggleStatus('${s.id}')" class="btn btn-sm"
                                        style="background: ${isInactive ? '#ef4444' : '#10b981'}; color: white;">
                                    ${isInactive ? '❌ Inactivo' : '✅ Activo'}
                                </button>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                                    <button onclick="editStudent('${s.id}')" class="btn btn-sm"
                                            style="background: #3b82f6; color: white; padding: 0.5rem 0.75rem; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif; font-size: 1.2rem; min-width: 42px; height: 36px; line-height: 1;"
                                            aria-label="Editar" title="Editar">
                                        ✏️
                                    </button>
                                    <button onclick="viewStudentPayments('${s.id}')" class="btn btn-sm"
                                            style="background: #10b981; color: white; padding: 0.5rem 0.75rem; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif; font-size: 1.2rem; min-width: 42px; height: 36px; line-height: 1;"
                                            aria-label="Pagos" title="Ver Pagos">
                                        💰
                                    </button>
                                    <button onclick="openStudentNotes('${s.id}')" class="btn btn-sm"
                                            style="background: ${s.notes && s.notes.length > 0 ? '#f59e0b' : '#8b5cf6'}; color: white; padding: 0.5rem 0.75rem; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif; font-size: 1.2rem; min-width: 42px; height: 36px; line-height: 1;"
                                            aria-label="Notas" title="${s.notes && s.notes.length > 0 ? 'Ver Notas (' + s.notes.length + ')' : 'Notas del Estudiante'}">
                                        📝
                                    </button>
                                    ${s.hasAppAccount ? `
                                    <button onclick="spShowStudentDetailModal('${s.tutorboxUid}')"
                                          title="Ver progreso: ${s.tutorboxEmail || ''}"
                                          style="background: #d1fae5; color: #065f46; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; height: 36px; border: 1px solid #a7f3d0; cursor: pointer;">
                                        ✓ App
                                    </button>
                                    ` : `
                                    <button onclick="showCreateStudentAccountModal('${s.id}')" class="btn btn-sm"
                                            style="background: #7c3aed; color: white; padding: 0.5rem 0.75rem; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif; font-size: 1.2rem; min-width: 42px; height: 36px; line-height: 1;"
                                            aria-label="Crear Cuenta TutorBox" title="${s.tutorboxUid ? 'Activar acceso a la APP (ya tiene cuenta de clase)' : 'Crear Cuenta TutorBox (app)'}">
                                        📱
                                    </button>
                                    `}
                                    ${s.loginCode ? `
                                    <button onclick="copyLoginCode('${s.loginCode}')"
                                          title="Código de clase (clic para copiar). Doble clic = imprimir tarjeta"
                                          ondblclick="printLoginCard('${s.id}')"
                                          style="background: #fef3c7; color: #92400e; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.85rem; font-weight: 800; font-family: monospace; letter-spacing: 0.08em; display: inline-flex; align-items: center; height: 36px; border: 1px solid #fcd34d; cursor: pointer;">
                                        🎟️ ${s.loginCode}
                                    </button>
                                    ` : `
                                    <button onclick="generateStudentLoginCode('${s.id}')"
                                          title="Generar código de clase (letra + 5 números) para entrar a las clases en vivo sin contraseña${s.tutorboxUid ? '' : ' — crea una cuenta solo-clases'}"
                                          style="background: #fffbeb; color: #b45309; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; height: 36px; border: 1px dashed #f59e0b; cursor: pointer;">
                                        🎟️ Código
                                    </button>
                                    `}
                                    ${(window.userRole === 'admin' || window.userRole === 'director') ? `
                                    <button onclick="deleteStudent('${s.id}')" class="btn btn-sm"
                                            style="background: #ef4444; color: white; padding: 0.5rem 0.75rem; font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif; font-size: 1.2rem; min-width: 42px; height: 36px; line-height: 1;"
                                            aria-label="Eliminar" title="Eliminar">
                                        🗑️
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// SECTION 6: MAIN TAB LOADER
// ============================================

window.StudentManager = new StudentManager();

window.loadStudentsTab = async function() {
    console.log('📚 Loading students tab');

    // Course-type catalog (official monthly prices) lives in PricingManager
    if (window.PricingManager && !window.PricingManager.loaded) {
        window.PricingManager.init().catch(() => {});
    }

    const container = document.getElementById('studentsContainer');
    if (!container) {
        console.error('❌ Students container not found');
        return;
    }

    await window.StudentManager.init();
    
    // Get current filters from localStorage or default to 'all'
    const currentStatusFilter = localStorage.getItem('studentStatusFilter') || 'all';
    const currentModalidadFilter = localStorage.getItem('studentModalidadFilter') || 'all';

    container.innerHTML = `
        <div style="padding: 1rem;">
            <!-- Header with title and new student button -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>👥 Gestión de Estudiantes</h2>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="generateAllLoginCodes()" class="btn btn-sm" id="genAllCodesBtn"
                            title="Genera el código de clase para TODOS los estudiantes con cuenta TutorBox que aún no tienen uno (no cambia los existentes)"
                            style="background: #f59e0b; color: white;">
                        🎟️ Códigos para todos
                    </button>
                    <button onclick="syncClassPhotos()" class="btn btn-sm" id="syncClassPhotosBtn"
                            title="Trae las selfies tomadas en las clases en vivo (tutorbox.app) a la foto de perfil de cada estudiante con cuenta"
                            style="background: #0ea5e9; color: white;">
                        📸 Sincronizar fotos de clase
                    </button>
                    <button onclick="showStudentForm()" class="btn btn-primary">
                        ➕ Nuevo Estudiante
                    </button>
                </div>
            </div>

            <!-- Quick Date Filters -->
            <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #374151;">📅 Filtros Rápidos por Fecha de Registro</h3>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                    <button onclick="applyQuickDateFilter('today')" class="btn btn-sm" style="background: #3b82f6; color: white;">
                        📅 Hoy
                    </button>
                    <button onclick="applyQuickDateFilter('week')" class="btn btn-sm" style="background: #3b82f6; color: white;">
                        📅 Esta Semana
                    </button>
                    <button onclick="applyQuickDateFilter('month')" class="btn btn-sm" style="background: #3b82f6; color: white;">
                        📅 Este Mes
                    </button>
                    <button onclick="applyQuickDateFilter('last30')" class="btn btn-sm" style="background: #3b82f6; color: white;">
                        📅 Últimos 30 Días
                    </button>
                    <button onclick="applyQuickDateFilter('year')" class="btn btn-sm" style="background: #3b82f6; color: white;">
                        📅 Este Año
                    </button>
                    <button onclick="clearDateFilters()" class="btn btn-sm" style="background: #6b7280; color: white;">
                        ❌ Limpiar Fechas
                    </button>
                </div>

                <!-- Custom Date Range -->
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <div>
                        <label style="font-size: 0.875rem; color: #6b7280; display: block; margin-bottom: 0.25rem;">Fecha Inicio:</label>
                        <input type="date" id="studentStartDate" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="font-size: 0.875rem; color: #6b7280; display: block; margin-bottom: 0.25rem;">Fecha Fin:</label>
                        <input type="date" id="studentEndDate" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                    </div>
                    <button onclick="applyCustomDateFilter()" class="btn btn-sm" style="background: #10b981; color: white; margin-top: 1.25rem;">
                        🔍 Filtrar
                    </button>
                </div>
            </div>

            <!-- Other Filters -->
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                <select id="studentStatusFilter" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                    <option value="all" ${currentStatusFilter === 'all' ? 'selected' : ''}>Todos</option>
                    <option value="active" ${currentStatusFilter === 'active' ? 'selected' : ''}>Activos</option>
                    <option value="inactive" ${currentStatusFilter === 'inactive' ? 'selected' : ''}>Inactivos</option>
                </select>
                <select id="studentModalidadFilter" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                    <option value="all" ${currentModalidadFilter === 'all' ? 'selected' : ''}>Todas las modalidades</option>
                    <option value="Presencial" ${currentModalidadFilter === 'Presencial' ? 'selected' : ''}>Presencial</option>
                    <option value="Compañia" ${currentModalidadFilter === 'Compañia' ? 'selected' : ''}>Compañía</option>
                    <option value="Escuela" ${currentModalidadFilter === 'Escuela' ? 'selected' : ''}>Escuela</option>
                    <option value="Online" ${currentModalidadFilter === 'Online' ? 'selected' : ''}>Online</option>
                    <option value="Privadas" ${currentModalidadFilter === 'Privadas' ? 'selected' : ''}>Privadas</option>
                </select>
                <input type="text" id="studentSearch" placeholder="Buscar por nombre, documento o teléfono..."
                       style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px; flex: 1; min-width: 200px;">
            </div>

            <!-- Results Counter -->
            <div id="studentResultsCounter" style="background: #f3f4f6; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-weight: 500; color: #374151;">
                Mostrando ${window.StudentManager.getStudents({ status: currentStatusFilter, modalidad: currentModalidadFilter }).length} estudiantes
            </div>

            <div id="studentTableContainer">
                ${renderStudentTable(window.StudentManager.getStudents({ status: currentStatusFilter, modalidad: currentModalidadFilter }))}
            </div>
        </div>
    `;

    // Add search listener
    document.getElementById('studentSearch')?.addEventListener('input', refreshStudentTable);

    // Add status filter listener
    document.getElementById('studentStatusFilter')?.addEventListener('change', (e) => {
        localStorage.setItem('studentStatusFilter', e.target.value);
        refreshStudentTable();
    });

    // Add modalidad filter listener
    document.getElementById('studentModalidadFilter')?.addEventListener('change', (e) => {
        localStorage.setItem('studentModalidadFilter', e.target.value);
        refreshStudentTable();
    });

    // Add date filter listeners
    document.getElementById('studentStartDate')?.addEventListener('change', refreshStudentTable);
    document.getElementById('studentEndDate')?.addEventListener('change', refreshStudentTable);
};

// ============================================
// SECTION 7: GLOBAL FUNCTIONS (UPDATED)
// ============================================

window.showStudentForm = async function(studentId = null) {
    const student = studentId ? window.StudentManager.students.get(studentId) : null;

    // Remove any existing modal first
    const existingModal = document.getElementById('studentFormModal');
    if (existingModal) existingModal.remove();

    // Ensure Grupos 2.0 data is loaded for the dropdown
    if (window.GroupsManager2) {
        await window.GroupsManager2.init(true); // Force reload to get latest groups
    }

    // Append modal to container
    const container = document.getElementById('studentsContainer');
    container.insertAdjacentHTML('beforeend', renderStudentForm(student));

    document.getElementById('studentForm').onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('stuSubmitBtn');
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Guardando...';
        try {
            await saveStudentForm(studentId);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = studentId ? 'Actualizar Estudiante' : 'Guardar Estudiante';
        }
    };
};

// NEW: Close student form modal
window.closeStudentFormModal = function() {
    const modal = document.getElementById('studentFormModal');
    if (modal) modal.remove();
};

// Handle cascading dropdown for Modalidad field
window.handleModalidadChange = function() {
    const modalidad = document.getElementById('stuModalidad').value;
    const detalleGroup = document.getElementById('modalidadDetalleGroup');
    const detalleSelect = document.getElementById('stuModalidadDetalle');
    const detalleLabel = document.getElementById('modalidadDetalleLabel');
    const tipoPagoSelect = document.getElementById('stuTipoPago');

    if (modalidad === 'Compañia') {
        detalleGroup.style.display = 'block';
        detalleLabel.textContent = 'Compañía';
        detalleSelect.innerHTML = `
            <option value="">Seleccionar</option>
            <option value="COATS">COATS</option>
            <option value="OTRA">OTRA</option>
        `;
    } else if (modalidad === 'Escuela') {
        detalleGroup.style.display = 'block';
        detalleLabel.textContent = 'Escuela';
        detalleSelect.innerHTML = `
            <option value="">Seleccionar</option>
            <option value="Hogar Nazareth">Hogar Nazareth</option>
            <option value="Remigio">Remigio</option>
            <option value="otro">Otro</option>
        `;
    } else {
        detalleGroup.style.display = 'none';
        detalleSelect.value = '';
    }

    // When "Privadas" is selected, automatically set payment type to "POR_HORAS"
    if (modalidad === 'Privadas') {
        tipoPagoSelect.value = 'POR_HORAS';
        handleTipoPagoChange(); // Trigger the payment type change to show hourly fields
    }
};

// Handle payment type change to show/hide hourly rate field
window.handleTipoPagoChange = function() {
    const tipoPago = document.getElementById('stuTipoPago').value;
    const valorMensualGroup = document.getElementById('valorMensualGroup');
    const valorHoraGroup = document.getElementById('valorHoraGroup');

    const segundoCursoGroup = document.getElementById('segundoCursoGroup');

    if (tipoPago === 'POR_HORAS') {
        valorMensualGroup.style.display = 'none';
        valorHoraGroup.style.display = 'block';
        if (segundoCursoGroup) segundoCursoGroup.style.display = 'none';
        // Clear monthly value when switching to hourly
        document.getElementById('stuValor').value = '';
    } else {
        valorMensualGroup.style.display = 'block';
        valorHoraGroup.style.display = 'none';
        if (segundoCursoGroup) segundoCursoGroup.style.display = 'block';
        // Clear hourly value when switching to monthly/semester
        document.getElementById('stuValorHora').value = '';
    }
};

window.editStudent = function(id) {
    showStudentForm(id);
};

window.deleteStudent = async function(id) {
    // Double-check user role for security
    if (window.userRole !== 'admin' && window.userRole !== 'director') {
        window.showNotification('🚫 Comunícate con administración - no tienes permitido borrar datos de esta plataforma', 'error');
        return;
    }

    if (await window.StudentManager.deleteStudent(id)) {
        loadStudentsTab();
        window.showNotification('✅ Estudiante eliminado', 'success');
    }
};

// UPDATED: Now calls closeStudentFormModal
window.cancelStudentForm = function() {
    closeStudentFormModal();
};

// UPDATED: Toggle student status - Now appends to studentsContainer
// Only Director / admin / super-admin may change a student's active status
window.isStudentMoneyAdmin = function() {
    const email = window.FirebaseData?.currentUser?.email;
    return email === 'admin@ciudadbilingue.com' || window.userRole === 'admin' || window.userRole === 'director';
};

window.toggleStatus = async function(id) {
    const student = window.StudentManager.students.get(id);
    if (!student) return;

    if (!window.isStudentMoneyAdmin()) {
        window.showNotification('🚫 Solo el Director puede activar o inactivar estudiantes.', 'error');
        return;
    }

    if (student.status === 'active') {
        // Show modal for inactive details - FIXED: Append to studentsContainer
        const container = document.getElementById('studentsContainer');
        const existingModal = document.getElementById('inactiveModal');
        if (existingModal) existingModal.remove();
        
        container.insertAdjacentHTML('beforeend', renderInactiveModal(id));
        
        document.getElementById('inactiveForm').onsubmit = async (e) => {
            e.preventDefault();
            const inactiveData = {
                date: document.getElementById('inactiveDate').value,
                reason: document.getElementById('inactiveReason').value,
                notes: document.getElementById('inactiveNotes').value
            };
            
            await window.StudentManager.toggleStudentStatus(id, inactiveData);
            closeInactiveModal();
            loadStudentsTab();
            window.showNotification('📋 Estado actualizado', 'success');
        };
    } else {
        // Reactivating - just toggle
        if (confirm('¿Reactivar este estudiante?')) {
            await window.StudentManager.toggleStudentStatus(id, {
                reason: 'Reactivado',
                notes: 'Estudiante reactivado'
            });
            loadStudentsTab();
            window.showNotification('✅ Estudiante reactivado', 'success');
        }
    }
};

// UPDATED: Close inactive modal
window.closeInactiveModal = function() {
    const modal = document.getElementById('inactiveModal');
    if (modal) modal.remove();
};

// UPDATED: Open payment notes modal - Now appends to studentsContainer
window.openPaymentNotes = async function(id) {
    const student = window.StudentManager.students.get(id);
    if (!student) return;

    if (!window.isStudentMoneyAdmin()) {
        window.showNotification('🚫 Solo el Director puede cambiar el valor / acuerdo de pago de un estudiante.', 'error');
        return;
    }

    // FIXED: Append to studentsContainer instead of body
    const container = document.getElementById('studentsContainer');
    const existingModal = document.getElementById('paymentNotesModal');
    if (existingModal) existingModal.remove();
    
    container.insertAdjacentHTML('beforeend', renderPaymentNotesModal(student));
    
    document.getElementById('paymentNotesForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const newValue = parseInt(document.getElementById('newPaymentValue').value) || 0;
        const notes = document.getElementById('paymentNotes').value;
        
        const updates = {
            paymentNotes: notes
        };
        
        // Only update value if it changed
        if (newValue !== student.valor) {
            updates.valor = newValue;
            updates.paymentChangeReason = notes || 'Actualización manual';
        }
        
        await window.StudentManager.updateStudent(id, updates);
        closePaymentNotesModal();
        loadStudentsTab();
        window.showNotification('💰 Notas de pago actualizadas', 'success');
    };
};

// UPDATED: Close payment notes modal
window.closePaymentNotesModal = function() {
    const modal = document.getElementById('paymentNotesModal');
    if (modal) modal.remove();
};

// ============================================
// STUDENT NOTES SYSTEM - Historial de Notas
// ============================================

window.openStudentNotes = function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) return;

    // Try to find the appropriate container (works from both Students and Payments modules)
    const container = document.getElementById('studentsContainer') ||
                      document.getElementById('paymentsContainer') ||
                      document.body;
    const existingModal = document.getElementById('studentNotesModal');
    if (existingModal) existingModal.remove();

    // Get notes array (create if doesn't exist)
    const notes = student.notes || [];

    const modal = `
        <div id="studentNotesModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
             background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">

                <!-- Header -->
                <div style="padding: 1.5rem; border-bottom: 2px solid #e5e7eb; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; border-radius: 12px 12px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.25rem;">📝 Notas de ${student.nombre}</h3>
                        <button onclick="closeStudentNotesModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">
                            ✖
                        </button>
                    </div>
                </div>

                <!-- Notes History -->
                <div id="notesHistoryContainer" style="flex: 1; overflow-y: auto; padding: 1.5rem; background: #f9fafb;">
                    ${notes.length === 0 ? `
                        <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                            <p style="margin: 0; font-size: 1.1rem;">No hay notas registradas</p>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Agrega la primera nota abajo</p>
                        </div>
                    ` : notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(note => `
                        <div style="background: white; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #8b5cf6; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="background: #8b5cf6; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                                        ${note.createdByName || 'Usuario'}
                                    </span>
                                </div>
                                <div style="text-align: right; font-size: 0.75rem; color: #6b7280;">
                                    <div>${formatDateTime(note.createdAt)}</div>
                                </div>
                            </div>
                            <div style="white-space: pre-wrap; color: #374151; line-height: 1.6;">
                                ${note.text}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Add New Note -->
                <div style="padding: 1.5rem; border-top: 2px solid #e5e7eb; background: white; border-radius: 0 0 12px 12px;">
                    <form id="addNoteForm" onsubmit="return false;">
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                                ➕ Nueva Nota
                            </label>
                            <textarea id="newNoteText"
                                      placeholder="Escribe una nota sobre el estudiante..."
                                      style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; resize: vertical;"
                                      required></textarea>
                        </div>
                        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                            <button type="button" onclick="closeStudentNotesModal()"
                                    style="padding: 0.75rem 1.5rem; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                Cancelar
                            </button>
                            <button type="submit" onclick="saveStudentNote('${studentId}')"
                                    style="padding: 0.75rem 1.5rem; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                💾 Guardar Nota
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', modal);
};

window.saveStudentNote = async function(studentId) {
    const noteText = document.getElementById('newNoteText').value.trim();

    if (!noteText) {
        window.showNotification('⚠️ Por favor escribe una nota', 'warning');
        return;
    }

    try {
        const student = window.StudentManager.students.get(studentId);
        if (!student) {
            window.showNotification('❌ Estudiante no encontrado', 'error');
            return;
        }

        // Get current user info
        const currentUser = window.FirebaseData?.currentUser;
        const userEmail = currentUser?.email || 'Sistema';
        const userName = currentUser?.displayName || userEmail.split('@')[0];

        // Create new note
        const newNote = {
            id: `NOTE-${Date.now()}`,
            text: noteText,
            createdBy: userEmail,
            createdByName: userName,
            createdAt: window.getLocalDateTime ? window.getLocalDateTime() : new Date().toISOString()
        };

        // Get existing notes or create new array
        const notes = student.notes || [];
        notes.push(newNote);

        // Update student with new notes
        await window.StudentManager.updateStudent(studentId, { notes });

        window.showNotification('✅ Nota guardada exitosamente', 'success');

        // Refresh the modal
        closeStudentNotesModal();
        openStudentNotes(studentId);
    } catch (error) {
        console.error('❌ Error saving note:', error);
        window.showNotification('❌ Error al guardar nota', 'error');
    }
};

window.closeStudentNotesModal = function() {
    const modal = document.getElementById('studentNotesModal');
    if (modal) modal.remove();
};

// Close student form modal
window.closeStudentFormModal = function() {
    const modal = document.getElementById('studentFormModal');
    if (modal) modal.remove();
};

// ============================================
// STUDENT PHOTO FUNCTIONS
// ============================================

// Capture photo from camera
window.captureStudentPhoto = function() {
    // Remove existing camera modal if any
    const existingModal = document.getElementById('cameraModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'cameraModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 12px; max-width: 500px; width: 90%; text-align: center;">
            <h3 style="margin: 0 0 1rem 0; color: #374151;">📷 Tomar Foto del Estudiante</h3>

            <div style="position: relative; margin-bottom: 1rem;">
                <video id="cameraVideo" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px; background: #000;"></video>
                <canvas id="cameraCanvas" style="display: none;"></canvas>
            </div>

            <div id="cameraError" style="display: none; color: #ef4444; padding: 1rem; background: #fef2f2; border-radius: 8px; margin-bottom: 1rem;">
                ❌ No se pudo acceder a la cámara. Verifica los permisos del navegador.
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button type="button" onclick="takePhoto()" id="takePhotoBtn" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                    📸 Capturar
                </button>
                <button type="button" onclick="closeCameraModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Start camera
    startCamera();
};

// Start camera stream
async function startCamera() {
    const video = document.getElementById('cameraVideo');
    const errorDiv = document.getElementById('cameraError');
    const takeBtn = document.getElementById('takePhotoBtn');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        video.srcObject = stream;
        window.cameraStream = stream;
    } catch (error) {
        console.error('Camera error:', error);
        errorDiv.style.display = 'block';
        takeBtn.disabled = true;
        takeBtn.style.opacity = '0.5';
    }
}

// Take photo from video
window.takePhoto = function() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 with reduced quality for storage
    const photoData = canvas.toDataURL('image/jpeg', 0.7);

    // Update preview and hidden input
    updatePhotoPreview(photoData);

    // Close camera modal
    closeCameraModal();

    window.showNotification('✅ Foto capturada exitosamente', 'success');
};

// Close camera modal and stop stream
window.closeCameraModal = function() {
    if (window.cameraStream) {
        window.cameraStream.getTracks().forEach(track => track.stop());
        window.cameraStream = null;
    }
    const modal = document.getElementById('cameraModal');
    if (modal) modal.remove();
};

// Upload photo from file
window.uploadStudentPhoto = function() {
    const fileInput = document.getElementById('stuPhotoFile');
    if (fileInput) {
        fileInput.click();
    }
};

// Handle file selection
window.handlePhotoFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        window.showNotification('❌ Por favor selecciona una imagen válida', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        window.showNotification('❌ La imagen es muy grande. Máximo 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // Resize image before storing
        resizeImage(e.target.result, 400, 400, function(resizedData) {
            updatePhotoPreview(resizedData);
            window.showNotification('✅ Foto cargada exitosamente', 'success');
        });
    };
    reader.readAsDataURL(file);

    // Clear the input so the same file can be selected again
    event.target.value = '';
};

// Resize image to reduce storage size
function resizeImage(dataUrl, maxWidth, maxHeight, callback) {
    const img = new Image();
    img.onload = function() {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Return resized image as base64
        callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
}

// Update photo preview in form
function updatePhotoPreview(photoData) {
    const preview = document.getElementById('studentPhotoPreview');
    const hiddenInput = document.getElementById('stuPhotoUrl');

    if (preview) {
        preview.innerHTML = `<img src="${photoData}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
    if (hiddenInput) {
        hiddenInput.value = photoData;
    }

    // Show remove button if not already visible
    const photoSection = preview?.closest('.form-group');
    if (photoSection && !photoSection.querySelector('.remove-photo-btn')) {
        const buttonsDiv = photoSection.querySelector('div[style*="display: flex"]');
        if (buttonsDiv) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-photo-btn';
            removeBtn.onclick = removeStudentPhoto;
            removeBtn.style.cssText = 'padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;';
            removeBtn.innerHTML = '🗑️ Quitar';
            buttonsDiv.appendChild(removeBtn);
        }
    }
}

// Remove student photo
window.removeStudentPhoto = function() {
    const preview = document.getElementById('studentPhotoPreview');
    const hiddenInput = document.getElementById('stuPhotoUrl');

    if (preview) {
        preview.innerHTML = `<span style="font-size: 3rem; color: #9ca3af;">👤</span>`;
    }
    if (hiddenInput) {
        hiddenInput.value = '';
    }

    // Remove the remove button
    const removeBtn = document.querySelector('.remove-photo-btn');
    if (removeBtn) removeBtn.remove();

    window.showNotification('🗑️ Foto eliminada', 'info');
};

// View student photo in full size
window.viewStudentPhotoFull = function(photoUrl, studentName) {
    if (!photoUrl) return;

    const existingModal = document.getElementById('photoFullModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'photoFullModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        cursor: pointer;
    `;
    modal.onclick = function() { modal.remove(); };

    modal.innerHTML = `
        <div style="text-align: center; max-width: 90%; max-height: 90%;">
            <img src="${photoUrl}" style="max-width: 100%; max-height: 80vh; border-radius: 12px; box-shadow: 0 10px 50px rgba(0,0,0,0.5);">
            <p style="color: white; margin-top: 1rem; font-size: 1.1rem;">${studentName}</p>
            <p style="color: #9ca3af; font-size: 0.9rem;">Click en cualquier lugar para cerrar</p>
        </div>
    `;

    document.body.appendChild(modal);
};

// Close student payments modal
window.closeStudentPaymentsModal = function() {
    const modal = document.getElementById('studentPaymentsModal');
    if (modal) modal.remove();
};

// Helper function to format datetime
function formatDateTime(dateStr) {
    if (!dateStr) return '-';

    const date = new Date(dateStr);
    const dateOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit'
    };

    return `${date.toLocaleDateString('es-ES', dateOptions)} • ${date.toLocaleTimeString('es-ES', timeOptions)}`;
}
// ============================================
// SECTION 8: FORM SAVE FUNCTION
// ============================================

async function saveStudentForm(studentId) {
    try {
        const tipoPago = document.getElementById('stuTipoPago').value;
        const newGrupo = document.getElementById('stuGrupo').value;
        const newGrupo2 = document.getElementById('stuGrupo2')?.value || '';

        // Get old grupo value if editing
        const existingStudent = studentId ? window.StudentManager.students.get(studentId) : null;
        const oldGrupo = existingStudent?.grupo || '';
        const oldGrupo2 = existingStudent?.grupo2 || '';

        // valor2 (second course) is director-gated like valor: staff edits must
        // carry the stored value through unchanged or the database rules
        // reject the whole update (null stays null, not 0).
        let valor2;
        if (studentId && !window.isStudentMoneyAdmin()) {
            valor2 = existingStudent?.valor2 !== undefined ? existingStudent.valor2 : null;
        } else if (tipoPago === 'POR_HORAS') {
            valor2 = existingStudent?.valor2 !== undefined ? existingStudent.valor2 : null;
        } else {
            valor2 = parseInt(document.getElementById('stuValor2')?.value) || 0;
        }

        const studentData = {
            id: studentId,
            nombre: document.getElementById('stuNombre').value,
            tipoDoc: document.getElementById('stuTipoDoc').value,
            numDoc: document.getElementById('stuNumDoc').value,
            edad: document.getElementById('stuEdad').value,
            telefono: document.getElementById('stuTelefono').value,
            correo: document.getElementById('stuCorreo').value,
            acudiente: document.getElementById('stuAcudiente').value,
            docAcudiente: document.getElementById('stuDocAcudiente').value,
            fechaInicio: document.getElementById('stuFechaInicio').value,
            grupo: newGrupo,
            grupo2: newGrupo2,
            valor2: valor2,
            cursoTipo: document.getElementById('stuCursoTipo')?.value || '',
            cursoTipo2: document.getElementById('stuCursoTipo2')?.value || '',
            modalidad: document.getElementById('stuModalidad').value,
            modalidadDetalle: document.getElementById('stuModalidadDetalle').value,
            tipoPago: tipoPago,
            valor: tipoPago === 'POR_HORAS' ? 0 : (parseInt(document.getElementById('stuValor').value) || 0),
            valorHora: tipoPago === 'POR_HORAS' ? (parseFloat(document.getElementById('stuValorHora').value) || 0) : 0,
            diaPago: parseInt(document.getElementById('stuDiaPago').value) || 1,
            photoUrl: document.getElementById('stuPhotoUrl')?.value || ''
        };

        let savedStudent;
        if (studentId) {
            await window.StudentManager.updateStudent(studentId, studentData);
            savedStudent = { ...existingStudent, ...studentData };
            // 🔄 mirror name/group/age/guardian/email on the TutorBox profile
            window.syncStudentToTutorBox(studentId, savedStudent);
        } else {
            savedStudent = await window.StudentManager.saveStudent(studentData);

            // Check if there's a matrícula value entered - just notify user to register it via Payments
            // NOTE: We no longer auto-create matrícula payments here because:
            // 1. It was hardcoding payment method as 'Efectivo'
            // 2. Users should use the Payments module to select correct method (Transferencia/Nequi/etc)
            const matriculaInput = document.getElementById('stuMatricula');
            const matriculaValue = matriculaInput ? parseInt(matriculaInput.value) || 0 : 0;

            if (matriculaValue > 0) {
                console.log('ℹ️ Matrícula value entered:', matriculaValue, '- User should register via Payments module');
                window.showNotification(
                    `📝 Estudiante guardado. Recuerda registrar la matrícula ($${matriculaValue.toLocaleString()}) en el módulo de Pagos con el método de pago correcto.`,
                    'info'
                );
            }
        }

        // Update Grupos 2.0 studentIds if group changed. A student can be in
        // two groups (second course): never remove them from a group that the
        // OTHER course field still points to.
        if (window.GroupsManager2 && (oldGrupo !== newGrupo)) {
            try {
                // Remove student from old group
                if (oldGrupo && oldGrupo !== newGrupo2) {
                    const oldGroupId = parseInt(oldGrupo);
                    const oldGroup = window.GroupsManager2.groups.get(oldGroupId);
                    if (oldGroup) {
                        const studentIds = oldGroup.studentIds || [];
                        const newStudentIds = studentIds.filter(id => id !== savedStudent.id);
                        await window.GroupsManager2.saveGroup({
                            ...oldGroup,
                            studentIds: newStudentIds
                        });
                        console.log(`📚 Removed student from group ${oldGrupo}`);
                    }
                }

                // Add student to new group
                if (newGrupo) {
                    const newGroupId = parseInt(newGrupo);
                    const newGroup = window.GroupsManager2.groups.get(newGroupId);
                    if (newGroup) {
                        const studentIds = newGroup.studentIds || [];
                        if (!studentIds.includes(savedStudent.id)) {
                            studentIds.push(savedStudent.id);
                            await window.GroupsManager2.saveGroup({
                                ...newGroup,
                                studentIds: studentIds
                            });
                            console.log(`📚 Added student to group ${newGrupo}`);
                        }
                    }
                }
            } catch (groupError) {
                console.error('⚠️ Error updating group studentIds:', groupError);
                // Don't fail the whole save, just log the error
            }
        }

        // Same sync for the second-course group
        if (window.GroupsManager2 && (oldGrupo2 !== newGrupo2)) {
            try {
                if (oldGrupo2 && oldGrupo2 !== newGrupo) {
                    const oldGroup2 = window.GroupsManager2.groups.get(parseInt(oldGrupo2));
                    if (oldGroup2) {
                        await window.GroupsManager2.saveGroup({
                            ...oldGroup2,
                            studentIds: (oldGroup2.studentIds || []).filter(id => id !== savedStudent.id)
                        });
                        console.log(`📚 Removed student from second-course group ${oldGrupo2}`);
                    }
                }
                if (newGrupo2) {
                    const newGroup2 = window.GroupsManager2.groups.get(parseInt(newGrupo2));
                    if (newGroup2) {
                        const ids = newGroup2.studentIds || [];
                        if (!ids.includes(savedStudent.id)) {
                            ids.push(savedStudent.id);
                            await window.GroupsManager2.saveGroup({ ...newGroup2, studentIds: ids });
                            console.log(`📚 Added student to second-course group ${newGrupo2}`);
                        }
                    }
                }
            } catch (groupError) {
                console.error('⚠️ Error updating second-course group studentIds:', groupError);
            }
        }

        window.showNotification('✅ Estudiante guardado', 'success');
        closeStudentFormModal();
        loadStudentsTab();
    } catch (error) {
        console.error('❌ Error saving student:', error);
        window.showNotification('❌ Error al guardar', 'error');
    }
}

// ============================================
// SECTION 9: PAYMENT VIEW FUNCTION
// ============================================

window.viewStudentPayments = async function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) {
        window.showNotification('❌ Estudiante no encontrado', 'error');
        return;
    }

    console.log('🔍 Loading payments for student:', {
        studentId,
        studentName: student.nombre,
        hasPaymentManager: !!window.PaymentManager,
        paymentsInManager: window.PaymentManager?.payments?.size || 0
    });

    // Get all payments for this student - load directly from Firebase
    let payments = [];

    try {
        // Try PaymentManager first (if available and initialized)
        if (window.PaymentManager && window.PaymentManager.payments && window.PaymentManager.payments.size > 0) {
            payments = Array.from(window.PaymentManager.payments.values())
                .filter(p => p.studentId === studentId)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log('✅ Loaded payments from PaymentManager:', payments.length);
        } else {
            // Load directly from Firebase if PaymentManager not available
            console.log('⚠️ PaymentManager not available, loading from Firebase...');
            const db = window.firebaseModules.database;
            const paymentsRef = db.ref(window.FirebaseData.database, 'payments');
            const snapshot = await db.get(paymentsRef);

            if (snapshot.exists()) {
                const allPayments = snapshot.val();
                payments = Object.entries(allPayments)
                    .map(([id, payment]) => ({ id, ...payment }))
                    .filter(p => p.studentId === studentId)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                console.log('✅ Loaded payments from Firebase:', payments.length);
            } else {
                console.log('⚠️ No payments found in Firebase');
            }
        }
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        window.showNotification('❌ Error al cargar pagos', 'error');
        return;
    }

    const container = document.getElementById('studentsContainer');
    const existingModal = document.getElementById('studentPaymentsModal');
    if (existingModal) existingModal.remove();

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paymentsByYear = {};
    payments.forEach(p => {
        const year = p.year || new Date(p.date).getFullYear();
        if (!paymentsByYear[year]) paymentsByYear[year] = [];
        paymentsByYear[year].push(p);
    });

    const modal = `
        <div id="studentPaymentsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
             background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 12px; max-width: 800px; width: 90%; max-height: 85vh; display: flex; flex-direction: column;">

                <!-- Header -->
                <div style="padding: 1.5rem; border-bottom: 2px solid #e5e7eb; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 12px 12px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <!-- Student Photo -->
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid rgba(255,255,255,0.5); flex-shrink: 0;">
                                ${student.photoUrl ?
                                    `<img src="${student.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onclick="viewStudentPhotoFull('${student.photoUrl}', '${student.nombre}')" title="Click para ver foto completa">` :
                                    `<span style="font-size: 1.8rem;">👤</span>`
                                }
                            </div>
                            <div>
                                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem;">💰 Pagos de ${student.nombre}</h3>
                                <div style="font-size: 0.9rem; opacity: 0.9;">
                                    Mensualidad: $${window.getStudentMonthlyTotal(student).toLocaleString('es-CO')}${student.valor2 ? ` (curso 1: $${(student.valor || 0).toLocaleString('es-CO')} + curso 2: $${Number(student.valor2).toLocaleString('es-CO')})` : ''} •
                                    Total pagado: $${totalPaid.toLocaleString('es-CO')}
                                </div>
                            </div>
                        </div>
                        <button onclick="closeStudentPaymentsModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">
                            ✖
                        </button>
                    </div>
                </div>

                <!-- Payments List -->
                <div style="flex: 1; overflow-y: auto; padding: 1.5rem; background: #f9fafb;">
                    ${payments.length === 0 ? `
                        <div style="text-align: center; padding: 3rem; color: #9ca3af;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">💰</div>
                            <p style="margin: 0; font-size: 1.1rem;">No hay pagos registrados</p>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Los pagos aparecerán aquí cuando se registren</p>
                        </div>
                    ` : Object.keys(paymentsByYear).sort((a, b) => b - a).map(year => `
                        <div style="margin-bottom: 2rem;">
                            <h4 style="color: #374151; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; font-size: 1.1rem;">
                                📅 ${year}
                            </h4>
                            ${paymentsByYear[year].map(payment => {
                                const date = new Date(payment.date);
                                const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                                const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                const monthLabel = payment.month === 'matrícula' ? '🎓 Matrícula' : `📆 ${payment.month.charAt(0).toUpperCase() + payment.month.slice(1)}`;

                                let methodColor = '#3b82f6';
                                if (payment.method === 'Efectivo') methodColor = '#10b981';
                                else if (payment.method === 'Transferencia') methodColor = '#6366f1';
                                else if (payment.bank === 'Nequi') methodColor = '#ec4899';
                                else if (payment.bank === 'Bancolombia') methodColor = '#f59e0b';

                                return `
                                <div style="background: white; padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px; border-left: 4px solid ${methodColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                            <div style="font-weight: 600; color: #111827; font-size: 1.1rem;">
                                                $${(payment.amount || 0).toLocaleString('es-CO')}
                                            </div>
                                            <div style="font-size: 0.9rem; color: #6b7280;">
                                                ${monthLabel}
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="background: ${methodColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">
                                                ${payment.method}${payment.bank ? ' - ' + payment.bank : ''}
                                            </div>
                                            <div style="font-size: 0.75rem; color: #6b7280;">
                                                ${dateStr} • ${timeStr}
                                            </div>
                                        </div>
                                    </div>
                                    ${payment.notes ? `
                                        <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; font-size: 0.85rem; color: #6b7280;">
                                            💬 ${payment.notes}
                                        </div>
                                    ` : ''}
                                </div>
                                `;
                            }).join('')}
                            <div style="text-align: right; font-weight: 600; color: #059669; margin-top: 0.5rem; padding: 0.5rem; background: #d1fae5; border-radius: 6px;">
                                Subtotal ${year}: $${paymentsByYear[year].reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('es-CO')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Footer with Summary -->
                <div style="padding: 1.5rem; border-top: 2px solid #e5e7eb; background: white; border-radius: 0 0 12px 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.25rem;">Total de pagos</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #059669;">
                                $${totalPaid.toLocaleString('es-CO')}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.25rem;">Cantidad de pagos</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #374151;">
                                ${payments.length}
                            </div>
                        </div>
                        <button onclick="closeStudentPaymentsModal()" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Cerrar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', modal);
};

window.closeStudentPaymentsModal = function() {
    const modal = document.getElementById('studentPaymentsModal');
    if (modal) modal.remove();
};

// ============================================
// SECTION 10: DATE FILTER FUNCTIONS
// ============================================

window.applyQuickDateFilter = function(filterType) {
    // Get today's date in Colombia timezone (YYYY-MM-DD)
    const todayStr = window.getTodayInColombia ? window.getTodayInColombia() : new Date().toISOString().split('T')[0];
    const [year, month, day] = todayStr.split('-').map(Number);

    // Create date object without timezone issues
    const today = new Date(year, month - 1, day);

    let startDate, endDate;

    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    switch(filterType) {
        case 'today':
            startDate = endDate = todayStr;
            break;
        case 'week':
            const weekStart = new Date(year, month - 1, day);
            weekStart.setDate(day - today.getDay());
            startDate = formatDate(weekStart);
            endDate = todayStr;
            break;
        case 'month':
            const monthStart = new Date(year, month - 1, 1);
            startDate = formatDate(monthStart);
            endDate = todayStr;
            break;
        case 'last30':
            const last30 = new Date(year, month - 1, day - 30);
            startDate = formatDate(last30);
            endDate = todayStr;
            break;
        case 'year':
            const yearStart = new Date(year, 0, 1);
            startDate = formatDate(yearStart);
            endDate = todayStr;
            break;
    }

    console.log(`📅 Quick filter "${filterType}":`, {
        todayInColombia: todayStr,
        startDate,
        endDate
    });

    document.getElementById('studentStartDate').value = startDate;
    document.getElementById('studentEndDate').value = endDate;

    applyCustomDateFilter();
};

window.clearDateFilters = function() {
    document.getElementById('studentStartDate').value = '';
    document.getElementById('studentEndDate').value = '';
    refreshStudentTable();
};

window.applyCustomDateFilter = function() {
    refreshStudentTable();
};

function refreshStudentTable() {
    const statusFilter = document.getElementById('studentStatusFilter').value;
    const modalidadFilter = document.getElementById('studentModalidadFilter').value;
    const searchValue = document.getElementById('studentSearch').value;
    const startDate = document.getElementById('studentStartDate').value;
    const endDate = document.getElementById('studentEndDate').value;

    const filtered = window.StudentManager.getStudents({
        status: statusFilter,
        modalidad: modalidadFilter,
        search: searchValue,
        startDate: startDate,
        endDate: endDate
    });

    document.getElementById('studentTableContainer').innerHTML = renderStudentTable(filtered);

    // Update counter
    const counterText = startDate || endDate
        ? `Mostrando ${filtered.length} estudiantes ${startDate && endDate ? `registrados del ${startDate} al ${endDate}` : startDate ? `registrados desde ${startDate}` : `registrados hasta ${endDate}`}`
        : `Mostrando ${filtered.length} estudiantes`;

    document.getElementById('studentResultsCounter').textContent = counterText;
}

// ============================================
// SECTION: TUTORBOX APP ACCOUNT PROVISIONING
// ============================================

const TUTORBOX_CLOUD_FUNCTION_BASE = 'https://us-central1-tutorbox-4d7c9.cloudfunctions.net';
const TUTORBOX_ADMIN_KEY = 'tbx-admin-2026-cb-provision-k9x7m';

/**
 * Show modal to create a TutorBox app account for a student
 */
window.showCreateStudentAccountModal = function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) {
        window.showNotification('❌ Estudiante no encontrado', 'error');
        return;
    }

    if (student.hasAppAccount) {
        window.showNotification('Este estudiante ya tiene cuenta TutorBox', 'info');
        return;
    }

    if (!student.telefono) {
        window.showNotification('❌ El estudiante no tiene teléfono registrado. Agrégalo primero para poder crear la cuenta.', 'error');
        return;
    }

    // Take only the first phone number (students may have "3207180698/3137734605")
    const rawPhone = String(student.telefono).split(/[\/,;]+/)[0].trim();
    const phone = rawPhone.startsWith('+') ? rawPhone : `+57${rawPhone.replace(/\D/g, '')}`;

    const modalHTML = `
        <div id="createStudentAccountModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
                display: flex; align-items: center; justify-content: center; z-index: 10002; padding: 1rem;">
            <div style="background: white; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 1.5rem; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; color: white; font-size: 1.25rem;">
                            📱 Crear Cuenta TutorBox
                        </h2>
                        <button onclick="closeCreateStudentAccountModal()" style="background: rgba(255,255,255,0.2); border: none;
                                color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.25rem;">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Body -->
                <div style="padding: 1.5rem;">
                    <!-- Student info -->
                    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #7c3aed, #5b21b6);
                                        border-radius: 50%; display: flex; align-items: center; justify-content: center;
                                        color: white; font-weight: bold; font-size: 1.25rem;">
                                ${(student.nombre || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #111827;">${student.nombre || 'Sin nombre'}</div>
                                <div style="font-size: 0.85rem; color: #6b7280;">📞 ${phone}</div>
                                ${student.grupo ? `<div style="font-size: 0.85rem; color: #6b7280;">📚 Grupo ${student.grupo}</div>` : ''}
                            </div>
                        </div>
                    </div>

                    <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1.25rem;">
                        Se creará una cuenta <strong>@tutorbox.app</strong> con contraseña temporal.
                        El estudiante podrá recuperar su contraseña por SMS.
                    </p>

                    <!-- Book/Course selection -->
                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                            Cursos asignados
                        </label>
                        <select id="studentBookSelect" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; margin-bottom: 8px;">
                            <optgroup label="🇬🇧 English">
                                <option value="1">English — Book 1 (PreA1-A1)</option>
                                <option value="1,2">English — Books 1-2 (A1)</option>
                                <option value="1,2,3">English — Books 1-3 (A1-A2)</option>
                                <option value="1,2,3,4,5">English — Books 1-5 (A1-B1)</option>
                                <option value="1,2,3,4,5,6,7,8,9,10">English — All 10 Books (PreA1-B2)</option>
                            </optgroup>
                            <optgroup label="🇫🇷 French">
                                <option value="101">French — Book 1 (A1)</option>
                                <option value="101,102,103">French — Books 1-3 (A1-B1)</option>
                                <option value="101,102,103,104,105">French — Books 1-5 (A1-B1+)</option>
                                <option value="101,102,103,104,105,106,107,108,109,110">French — All 10 Books (A1-C1)</option>
                            </optgroup>
                            <optgroup label="🇩🇪 German">
                                <option value="601">German — Book 1 (A1)</option>
                                <option value="601,602,603">German — Books 1-3</option>
                                <option value="601,602,603,604,605,606,607,608,609,610">German — All 10 Books</option>
                            </optgroup>
                            <optgroup label="🇪🇸 Spanish">
                                <option value="201">Spanish — Book 1 (A1)</option>
                                <option value="201,202,203">Spanish — Books 1-3</option>
                                <option value="201,202,203,204,205,206,207,208,209,210">Spanish — All 10 Books</option>
                            </optgroup>
                            <optgroup label="💼 Professional English">
                                <option value="901">Business English (B1-B2)</option>
                                <option value="903">Interview Prep (B1-B2)</option>
                                <option value="901,903">Business + Interview Prep</option>
                            </optgroup>
                            <optgroup label="📦 Bundles">
                                <option value="1,2,3,4,5,6,7,8,9,10,101,102,103,104,105,106,107,108,109,110">English + French Complete</option>
                                <option value="1,2,3,4,5,6,7,8,9,10,101,102,103,104,105,106,107,108,109,110,601,602,603,604,605,606,607,608,609,610">English + French + German Complete</option>
                                <option value="1,2,3,4,5,6,7,8,9,10,901,903">English Complete + Professional</option>
                            </optgroup>
                        </select>
                        <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">
                            Para control de acceso detallado (features, idiomas), usa la pestaña TutorBox en el menú principal.
                        </p>
                    </div>

                    <div id="studentAccountError" style="display: none; background: #fee2e2; color: #dc2626; padding: 0.75rem;
                            border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem;"></div>

                    <div id="studentAccountSuccess" style="display: none; background: #d1fae5; color: #065f46; padding: 1rem;
                            border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;"></div>

                    <div id="studentAccountButtons" style="display: flex; gap: 1rem;">
                        <button onclick="closeCreateStudentAccountModal()" style="flex: 1; padding: 0.75rem; border: 2px solid #d1d5db;
                                background: white; border-radius: 8px; cursor: pointer; font-weight: 600; color: #6b7280;">
                            Cancelar
                        </button>
                        <button onclick="createStudentTutorBoxAccount('${studentId}')" id="createStudentAccountBtn"
                                style="flex: 1; padding: 0.75rem; border: none; background: linear-gradient(135deg, #7c3aed, #5b21b6);
                                color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            📱 Crear Cuenta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeCreateStudentAccountModal = function() {
    const modal = document.getElementById('createStudentAccountModal');
    if (modal) modal.remove();
};

// ============================================
// SECTION: 🎟️ CLASS LOGIN CODES + 📸 CLASS PHOTO SYNC (4 Sep 2026)
// Kids sign into tutorbox.app live classes with a letter + 5 random digits
// (e.g. A48213) instead of email/password. The code lives on the TutorBox
// side (users/{uid}/loginCode + loginCodes/{code}); the CRM mirrors it on
// the student record (loginCode, loginCodeAt) and can ROTATE it any time.
// The classroom selfie (classPhotos/{uid}) flows back into photoUrl.
// ============================================

/** Body for provisionClassAccount (phone optional, first number only). */
function classAccountPayload(studentId, student) {
    const rawPhone = String(student.telefono || '').split(/[\/,;]+/)[0].trim();
    const digits = rawPhone.replace(/\D/g, '');
    // Only a plausible mobile goes through: Colombian 10-digit (3xx…) or an
    // international number with country code (10-15 digits). Anything else
    // (landlines, 7-digit, typos) is dropped — the phone is optional for a
    // class account and Firebase rejects malformed numbers.
    let phone = '';
    if (rawPhone.startsWith('+') && digits.length >= 10 && digits.length <= 15) phone = `+${digits}`;
    else if (digits.length === 10 && digits.startsWith('3')) phone = `+57${digits}`;
    else if (digits.length === 12 && digits.startsWith('573')) phone = `+${digits}`;
    const email = String(student.correo || '').trim().toLowerCase();
    return {
        fullName: student.nombre,
        crmStudentId: studentId,
        grupo: student.grupo || '',
        schoolName: 'Ciudad Bilingue',
        edad: student.edad || null,
        acudiente: student.acudiente || null,
        // 🔗 If this email already has a TutorBox account (parent's Gmail,
        // tester account…), the code is attached to THAT account.
        ...(email.includes('@') ? { email } : {}),
        ...(phone ? { phoneNumber: phone } : {})
    };
}

/** Fields the CRM mirrors on the TutorBox profile after a class-account provision. */
function classAccountRecord(data) {
    return {
        tutorboxUid: data.uid,
        tutorboxEmail: data.email,
        classAccount: !data.linkedExisting,
        classAccountAt: new Date().toISOString(),
        ...(data.linkedExisting ? { linkedExistingAccount: true } : {}),
        ...(data.linkedExisting && data.hasAppAccount ? { hasAppAccount: true } : {}),
        loginCode: data.code,
        loginCodeAt: new Date().toISOString(),
        loginCodeBy: window.currentUser?.email || 'admin'
    };
}

/**
 * 🔄 Keep the TutorBox profile in sync with the CRM record (name, group,
 * age, guardian, email, status). Best-effort, never blocks the save.
 */
window.syncStudentToTutorBox = function(studentId, student) {
    if (!student || !student.tutorboxUid) return;
    tbxPost('syncStudentProfile', {
        uid: student.tutorboxUid,
        fullName: student.nombre || '',
        grupo: student.grupo || '',
        edad: student.edad || null,
        acudiente: student.acudiente || null,
        email: String(student.correo || '').trim().toLowerCase(),
        status: student.status || 'active'
    }).catch(e => console.warn('syncStudentProfile:', e.message));
};

async function tbxPost(path, body) {
    const response = await fetch(`${TUTORBOX_CLOUD_FUNCTION_BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': TUTORBOX_ADMIN_KEY },
        body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
}

/**
 * Generate (or rotate, if one exists) the class login code for a student
 * with a TutorBox account. Returns the code. opts.silent skips the
 * confirm/notification (used right after account creation).
 */
window.generateStudentLoginCode = async function(studentId, opts = {}) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) {
        window.showNotification('❌ Estudiante no encontrado', 'error');
        return null;
    }
    const uid = opts.uid || student.tutorboxUid;
    if (!uid) {
        // No TutorBox account yet → create a CLASSROOM-ONLY one (free tier, no
        // books) and get the code in one call. "📱" later enables the app.
        try {
            const data = await tbxPost('provisionClassAccount', classAccountPayload(studentId, student));
            await window.StudentManager.updateStudent(studentId, classAccountRecord(data));
            if (!opts.silent) {
                window.showNotification(`🎟️ Código de ${student.nombre}: ${data.code}${data.linkedExisting ? ' (vinculado a su cuenta existente ' + data.email + ')' : ' (cuenta de clase creada)'}`, 'success');
                if (typeof window.loadStudentsTab === 'function') window.loadStudentsTab();
            }
            return data.code;
        } catch (e) {
            console.error('provisionClassAccount:', e);
            if (!opts.silent) window.showNotification(`❌ No se pudo crear la cuenta de clase: ${e.message}`, 'error');
            return null;
        }
    }
    if (student.loginCode && !opts.silent) {
        const ok = confirm(`${student.nombre} ya tiene el código ${student.loginCode}.\n\n¿Generar uno NUEVO? El anterior dejará de funcionar (útil si perdió la tarjeta).`);
        if (!ok) return null;
    }
    try {
        const data = await tbxPost('setStudentLoginCode', { uid });
        await window.StudentManager.updateStudent(studentId, {
            loginCode: data.code,
            loginCodeAt: new Date().toISOString(),
            loginCodeBy: window.currentUser?.email || 'admin'
        });
        if (typeof window.logAudit === 'function') {
            try { window.logAudit('student_login_code', { studentId, rotated: !!data.rotated }); } catch (e) { /* ignore */ }
        }
        if (!opts.silent) {
            window.showNotification(`🎟️ Código de ${student.nombre}: ${data.code}`, 'success');
            if (typeof window.loadStudentsTab === 'function') window.loadStudentsTab();
        }
        return data.code;
    } catch (e) {
        console.error('generateStudentLoginCode:', e);
        if (!opts.silent) window.showNotification(`❌ No se pudo generar el código: ${e.message}`, 'error');
        return null;
    }
};

/**
 * 🎟️ Batch: issue a code to EVERY student with a TutorBox account that has
 * none yet. Existing codes are never rotated here (use the per-row button).
 */
window.generateAllLoginCodes = async function() {
    const btn = document.getElementById('genAllCodesBtn');
    // Every ACTIVE student without a code. Students without a TutorBox
    // account get a classroom-only account (no app books) in the same pass.
    const todo = Array.from(window.StudentManager.students.values())
        .filter(s => (s.status || 'active') === 'active' && !s.loginCode && s.nombre);
    if (!todo.length) {
        window.showNotification('✅ Todos los estudiantes activos ya tienen código.', 'info');
        return;
    }
    const newAccounts = todo.filter(s => !s.tutorboxUid).length;
    if (!confirm(`Se generará un código de clase para ${todo.length} estudiante(s) activo(s) sin código.\n\n${newAccounts} de ellos aún no tienen cuenta TutorBox: se les creará una cuenta SOLO PARA CLASES (sin acceso a la app; el botón 📱 lo activa después).\n\n¿Continuar?`)) return;
    if (btn) { btn.disabled = true; }
    let ok = 0, failed = 0, done = 0, linked = 0;
    const CONCURRENCY = 4;
    const queue = todo.slice();
    const worker = async () => {
        while (queue.length) {
            const s = queue.shift();
            try {
                if (s.tutorboxUid) {
                    const data = await tbxPost('setStudentLoginCode', { uid: s.tutorboxUid });
                    await window.StudentManager.updateStudent(s.id, {
                        loginCode: data.code,
                        loginCodeAt: new Date().toISOString(),
                        loginCodeBy: window.currentUser?.email || 'admin'
                    });
                } else {
                    const data = await tbxPost('provisionClassAccount', classAccountPayload(s.id, s));
                    await window.StudentManager.updateStudent(s.id, classAccountRecord(data));
                    if (data.linkedExisting) linked++;
                }
                ok++;
            } catch (e) {
                console.warn('code for', s.nombre, 'failed:', e.message);
                failed++;
            }
            done++;
            if (btn) btn.textContent = `⏳ ${done}/${todo.length}…`;
        }
    };
    try {
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
        if (typeof window.logAudit === 'function') {
            try { window.logAudit('student_login_codes_batch', { ok, failed }); } catch (e) { /* ignore */ }
        }
        window.showNotification(`🎟️ Códigos generados: ${ok}${linked ? ` · ${linked} vinculados a cuentas existentes` : ''}${failed ? ` · ${failed} fallaron` : ''}`, failed ? 'warning' : 'success');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🎟️ Códigos para todos'; }
        if (typeof window.loadStudentsTab === 'function') window.loadStudentsTab();
    }
};

window.copyLoginCode = function(code) {
    if (!code) return;
    (navigator.clipboard?.writeText(code) || Promise.reject()).then(
        () => window.showNotification(`📋 Código ${code} copiado`, 'success'),
        () => window.showNotification(`🎟️ Código: ${code}`, 'info')
    );
};

/** Printable pocket card: name + big code + where to type it. */
window.printLoginCard = function(studentId) {
    const s = window.StudentManager.students.get(studentId);
    if (!s || !s.loginCode) return;
    const w = window.open('', '_blank', 'width=520,height=420');
    if (!w) return;
    const name = (s.nombre || '').replace(/</g, '&lt;');
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tarjeta ${s.loginCode}</title>
    <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;background:#fff}
    .card{width:340px;border:3px solid #7c3aed;border-radius:18px;padding:18px 20px;text-align:center}
    .brand{font-weight:900;color:#7c3aed;font-size:14px;letter-spacing:.08em}
    .name{font-size:18px;font-weight:700;margin:10px 0 4px;color:#111827}
    .code{font-family:ui-monospace,Consolas,monospace;font-size:44px;font-weight:900;letter-spacing:.22em;color:#111827;margin:6px 0}
    .how{font-size:12px;color:#4b5563}.how b{color:#111827}
    @media print{body{padding:0}}</style></head><body>
    <div class="card"><div class="brand">🏫 CIUDAD BILINGÜE · TutorBox Live</div>
    <div class="name">${name}</div>
    <div class="how">Mi código de clase</div>
    <div class="code">${s.loginCode}</div>
    <div class="how">1. Entra a <b>tutorbox.app/login</b><br>2. Toca <b>🎟️ Tengo un código</b><br>3. Escribe tu código y ¡a clase! 🎥</div>
    </div><script>setTimeout(function(){window.print()},300)</script></body></html>`);
    w.document.close();
};

/**
 * 📸 Pull the classroom selfies (tutorbox.app live classes) into the CRM
 * profile photo for every student with a TutorBox account. A classroom
 * photo REPLACES an older classroom photo but never a photo uploaded by
 * staff in the CRM (photoUpdatedBy !== 'classroom').
 */
/**
 * Shrink a data-URL photo for CRM storage: 128px JPEG (~5-8 KB). The room
 * selfie is 320px (~30 KB) — fine for one tile, too heavy ×300 students in
 * a node every module downloads.
 */
window.shrinkPhotoDataUrl = function(dataUrl, size = 128, quality = 0.72) {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => {
                const s = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        } catch (e) { resolve(dataUrl); }
    });
};

/**
 * 🧹 One-off maintenance (browser console, admin): compactStudentPhotos()
 * Re-compresses classroom photos already stored at 320px down to 128px.
 * Writes directly (no audit entry). Staff-uploaded photos are left alone.
 */
window.compactStudentPhotos = async function() {
    const db = window.firebaseModules.database;
    let fixed = 0, saved = 0;
    for (const s of window.StudentManager.students.values()) {
        const p = s.photoUrl;
        if (!p || typeof p !== 'string' || !p.startsWith('data:image/') || p.length < 12000) continue;
        if (s.photoUpdatedBy && s.photoUpdatedBy !== 'classroom') continue;
        const small = await window.shrinkPhotoDataUrl(p);
        if (small.length >= p.length) continue;
        await db.update(db.ref(window.FirebaseData.database, `students/${s.id}`), { photoUrl: small });
        s.photoUrl = small;
        fixed++; saved += p.length - small.length;
    }
    console.log(`✅ compactStudentPhotos: ${fixed} photos shrunk, ~${Math.round(saved / 1024)} KB removed`);
    return { fixed, saved };
};

window.syncClassPhotos = async function() {
    const btn = document.getElementById('syncClassPhotosBtn');
    const all = Array.from(window.StudentManager.students.values()).filter(s => s.tutorboxUid);
    if (!all.length) {
        window.showNotification('No hay estudiantes con cuenta TutorBox.', 'info');
        return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sincronizando…'; }
    let updated = 0, skipped = 0;
    try {
        for (let i = 0; i < all.length; i += 100) {
            const chunk = all.slice(i, i + 100);
            const data = await tbxPost('getB2BStudentPhotos', { uids: chunk.map(s => s.tutorboxUid) });
            const photos = data.photos || {};
            for (const s of chunk) {
                const raw = photos[s.tutorboxUid];
                if (!raw) continue;
                const staffPhoto = s.photoUrl && s.photoUpdatedBy && s.photoUpdatedBy !== 'classroom';
                if (staffPhoto) { skipped++; continue; }
                const photo = await window.shrinkPhotoDataUrl(raw);
                if (s.photoUrl === photo) { skipped++; continue; }
                await window.StudentManager.updateStudent(s.id, {
                    photoUrl: photo,
                    photoUpdatedAt: new Date().toISOString(),
                    photoUpdatedBy: 'classroom',
                    photoUpdatedByEmail: 'tutorbox.app/class'
                });
                updated++;
            }
        }
        window.showNotification(`📸 Fotos de clase: ${updated} actualizadas · ${skipped} sin cambios`, 'success');
        if (updated && typeof window.loadStudentsTab === 'function') window.loadStudentsTab();
    } catch (e) {
        console.error('syncClassPhotos:', e);
        window.showNotification(`❌ Error sincronizando fotos: ${e.message}`, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '📸 Sincronizar fotos de clase'; }
    }
};

/**
 * Call Cloud Function to create TutorBox app account
 */
window.createStudentTutorBoxAccount = async function(studentId) {
    const student = window.StudentManager.students.get(studentId);
    if (!student) return;

    const errorDiv = document.getElementById('studentAccountError');
    const successDiv = document.getElementById('studentAccountSuccess');
    const btn = document.getElementById('createStudentAccountBtn');
    const bookSelect = document.getElementById('studentBookSelect');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    const enrolledBooks = bookSelect.value.split(',').map(Number);
    // Take only the first phone number (students may have "3207180698/3137734605")
    const rawPhone = String(student.telefono).split(/[\/,;]+/)[0].trim();
    const phone = rawPhone.startsWith('+') ? rawPhone : `+57${rawPhone.replace(/\D/g, '')}`;

    btn.disabled = true;
    btn.innerHTML = '⏳ Creando cuenta...';

    // Classroom-only account already exists (🎟️ code issued first) → UPGRADE it
    // to app access on the SAME uid instead of creating a second account.
    const upgrading = !!student.tutorboxUid;

    try {
        const response = await fetch(
            `${TUTORBOX_CLOUD_FUNCTION_BASE}/${upgrading ? 'enableStudentAppAccess' : 'provisionStudentAccount'}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': TUTORBOX_ADMIN_KEY
                },
                body: JSON.stringify(upgrading ? {
                    uid: student.tutorboxUid,
                    enrolledBooks: enrolledBooks,
                    phoneNumber: phone
                } : {
                    fullName: student.nombre,
                    phoneNumber: phone,
                    schoolName: 'Ciudad Bilingue',
                    grupo: student.grupo || '',
                    enrolledBooks: enrolledBooks,
                    crmStudentId: studentId
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error al crear la cuenta');
        }
        if (upgrading) data.uid = student.tutorboxUid;

        // Update student record in CRM database
        await window.StudentManager.saveStudent({
            ...student,
            hasAppAccount: true,
            tutorboxUid: data.uid,
            tutorboxEmail: data.email,
            appCreatedAt: new Date().toISOString(),
            appCreatedBy: window.currentUser?.uid || 'admin'
        });

        // 🎟️ Class login code (kids sign in with the code only) — best effort.
        let loginCode = student.loginCode || null; // keep an existing code (never rotate here)
        try {
            if (!loginCode) loginCode = await window.generateStudentLoginCode(studentId, { silent: true, uid: data.uid });
        } catch (e) {
            console.warn('login code generation failed:', e);
        }

        // Show credentials
        successDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.5rem;">${upgrading ? '✅ Acceso a la app activado (misma cuenta de clase)' : '✅ Cuenta creada exitosamente'}</div>
            ${loginCode ? `
            <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 0.75rem; margin: 0.5rem 0; text-align: center;">
                <div style="font-size: 0.75rem; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">🎟️ Código de clase (niños)</div>
                <div style="font-family: monospace; font-size: 2rem; font-weight: 900; letter-spacing: 0.2em; color: #78350f;">${loginCode}</div>
                <div style="font-size: 0.75rem; color: #92400e;">Entra en <b>tutorbox.app/login</b> → "Tengo un código". Sin correo ni contraseña.</div>
            </div>` : ''}
            <div style="background: white; border: 1px solid #a7f3d0; border-radius: 6px; padding: 0.75rem; margin-top: 0.5rem;">
                <div style="margin-bottom: 0.5rem;">
                    <span style="font-weight: 600;">📧 Email:</span>
                    <span style="font-family: monospace; background: #ecfdf5; padding: 0.2rem 0.5rem; border-radius: 4px;">${data.email}</span>
                </div>
                <div>
                    <span style="font-weight: 600;">🔑 Contraseña:</span>
                    <span style="font-family: monospace; background: #ecfdf5; padding: 0.2rem 0.5rem; border-radius: 4px;">${data.temporaryPassword}</span>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: #059669; margin-top: 0.5rem;">
                Comparta estas credenciales con el estudiante. Puede cambiar la contraseña desde la app.
            </div>
        `;
        successDiv.style.display = 'block';

        // Hide the create button, show close
        document.getElementById('studentAccountButtons').innerHTML = `
            <button onclick="closeCreateStudentAccountModal()" style="width: 100%; padding: 0.75rem; border: none;
                    background: #6b7280; color: white; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Cerrar
            </button>
        `;

        // Refresh student table
        refreshStudentTable();

    } catch (error) {
        console.error('Error creating TutorBox account:', error);
        errorDiv.textContent = error.message || 'Error al crear la cuenta. Intente nuevamente.';
        errorDiv.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '📱 Crear Cuenta';
    }
};

console.log('✅ Students module loaded successfully');
