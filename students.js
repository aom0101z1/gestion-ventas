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
                            ${window.groupsData ? Array.from(window.groupsData.keys()).map(g =>
                                `<option value="${g}" ${student?.grupo === g ? 'selected' : ''}>${g}</option>`
                            ).join('') : ''}
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
                        <label>Valor Mensualidad ($)</label>
                        <input type="number" id="stuValor" value="${student?.valor || ''}" min="0" placeholder="Valor mensual">
                    </div>

                    <div class="form-group" id="valorHoraGroup" style="display: ${student?.tipoPago === 'POR_HORAS' ? 'block' : 'none'};">
                        <label>Valor / Hora ($)</label>
                        <input type="number" id="stuValorHora" value="${student?.valorHora || ''}" min="0" placeholder="Valor por hora" step="0.01">
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
                        <button type="submit" class="btn btn-primary">
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
                                ${s.nombre || '-'}
                                ${s.paymentNotes ? ' 📋' : ''}
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
                            <td style="padding: 0.75rem;">${s.grupo || 'Sin grupo'}</td>
                            <td style="padding: 0.75rem;">
                                ${s.modalidad || '-'}
                                ${s.modalidadDetalle ? `<br><small style="color: #6b7280;">${s.modalidadDetalle}</small>` : ''}
                            </td>
                            <td style="padding: 0.75rem;">
                                ${s.tipoPago === 'POR_HORAS' ? 'Por horas' : s.tipoPago || '-'}<br>
                                <small>${s.tipoPago === 'POR_HORAS' ?
                                    `$${(s.valorHora || 0).toLocaleString()}/hora` :
                                    `$${(s.valor || 0).toLocaleString()}`
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
                <button onclick="showStudentForm()" class="btn btn-primary">
                    ➕ Nuevo Estudiante
                </button>
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

window.showStudentForm = function(studentId = null) {
    const student = studentId ? window.StudentManager.students.get(studentId) : null;
    
    // Remove any existing modal first
    const existingModal = document.getElementById('studentFormModal');
    if (existingModal) existingModal.remove();
    
    // Append modal to container
    const container = document.getElementById('studentsContainer');
    container.insertAdjacentHTML('beforeend', renderStudentForm(student));
    
    document.getElementById('studentForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveStudentForm(studentId);
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
};

// Handle payment type change to show/hide hourly rate field
window.handleTipoPagoChange = function() {
    const tipoPago = document.getElementById('stuTipoPago').value;
    const valorMensualGroup = document.getElementById('valorMensualGroup');
    const valorHoraGroup = document.getElementById('valorHoraGroup');

    if (tipoPago === 'POR_HORAS') {
        valorMensualGroup.style.display = 'none';
        valorHoraGroup.style.display = 'block';
        // Clear monthly value when switching to hourly
        document.getElementById('stuValor').value = '';
    } else {
        valorMensualGroup.style.display = 'block';
        valorHoraGroup.style.display = 'none';
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
window.toggleStatus = async function(id) {
    const student = window.StudentManager.students.get(id);
    if (!student) return;
    
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
            grupo: document.getElementById('stuGrupo').value,
            modalidad: document.getElementById('stuModalidad').value,
            modalidadDetalle: document.getElementById('stuModalidadDetalle').value,
            tipoPago: tipoPago,
            valor: tipoPago === 'POR_HORAS' ? 0 : (parseInt(document.getElementById('stuValor').value) || 0),
            valorHora: tipoPago === 'POR_HORAS' ? (parseFloat(document.getElementById('stuValorHora').value) || 0) : 0,
            diaPago: parseInt(document.getElementById('stuDiaPago').value) || 1
        };

        let savedStudent;
        if (studentId) {
            await window.StudentManager.updateStudent(studentId, studentData);
            savedStudent = studentData;
        } else {
            savedStudent = await window.StudentManager.saveStudent(studentData);

            // If it's a new student and has enrollment fee, register it as a payment
            const matriculaInput = document.getElementById('stuMatricula');
            const matriculaValue = matriculaInput ? parseInt(matriculaInput.value) || 0 : 0;

            if (matriculaValue > 0 && window.PaymentManager) {
                try {
                    console.log('💰 Registering enrollment fee:', matriculaValue);

                    const enrollmentPayment = {
                        id: `PAY-MATRICULA-${Date.now()}`,
                        studentId: savedStudent.id,
                        amount: matriculaValue,
                        method: 'Efectivo', // Default to cash, can be changed later
                        bank: '',
                        month: 'matrícula',
                        year: new Date().getFullYear(),
                        date: window.getColombiaDateTime ? window.getColombiaDateTime() : new Date().toISOString(),
                        registeredBy: window.FirebaseData?.currentUser?.uid || 'Sistema',
                        notes: 'Matrícula - Pago de inscripción'
                    };

                    // Save to Firebase
                    const db = window.firebaseModules.database;
                    const ref = db.ref(window.FirebaseData.database, `payments/${enrollmentPayment.id}`);
                    await db.set(ref, enrollmentPayment);

                    // Add to PaymentManager cache
                    window.PaymentManager.payments.set(enrollmentPayment.id, enrollmentPayment);

                    console.log('✅ Enrollment fee registered:', enrollmentPayment.id);
                } catch (error) {
                    console.error('❌ Error registering enrollment fee:', error);
                    window.showNotification('⚠️ Estudiante guardado pero error al registrar matrícula', 'warning');
                }
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
                        <div>
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem;">💰 Pagos de ${student.nombre}</h3>
                            <div style="font-size: 0.9rem; opacity: 0.9;">
                                Mensualidad: $${(student.valor || 0).toLocaleString('es-CO')} •
                                Total pagado: $${totalPaid.toLocaleString('es-CO')}
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

console.log('✅ Students module loaded successfully');
