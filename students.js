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
    lastModified: null
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
            const student = {
                ...studentData,
                id,
                status: studentData.status || 'active',
                statusHistory: studentData.statusHistory || [],
                paymentHistory: studentData.paymentHistory || [],
                updatedAt: new Date().toISOString(),
                createdAt: studentData.createdAt || new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `students/${id}`);
            await db.set(ref, student);
            
            this.students.set(id, student);
            console.log('✅ Student saved:', id);
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
            students = students.filter(s => s.status === filters.status);
        }
        
        if (filters.grupo) {
            students = students.filter(s => s.grupo === filters.grupo);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            students = students.filter(s => 
                s.nombre?.toLowerCase().includes(search) ||
                s.numDoc?.includes(search) ||
                s.telefono?.includes(search)
            );
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
        }
        return true;
    }

    // Delete student
    async deleteStudent(id) {
        if (!confirm('¿Eliminar este estudiante?')) return false;
        
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `students/${id}`);
        await db.remove(ref);
        
        this.students.delete(id);
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
        <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
            <h3>${isEdit ? '✏️ Editar' : '➕ Nuevo'} Estudiante</h3>
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
                    <label>Doc. Acudiente</label>
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
                    <label>Tipo Pago</label>
                    <select id="stuTipoPago">
                        <option value="MENSUAL">Mensual</option>
                        <option value="SEMESTRAL">Semestral</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Valor ($)</label>
                    <input type="number" id="stuValor" value="${student?.valor || ''}" min="0">
                </div>
                
                <div class="form-group">
                    <label>Día de Pago</label>
                    <input type="number" id="stuDiaPago" value="${student?.diaPago || '1'}" min="1" max="31">
                </div>
                
                <div style="grid-column: 1/-1; display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="cancelStudentForm()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'Actualizar' : 'Guardar'} Estudiante
                    </button>
                </div>
            </form>
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
                    <th style="padding: 0.75rem; text-align: left;">Pago</th>
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
                                ${s.tipoPago || '-'}<br>
                                <small>$${(s.valor || 0).toLocaleString()}</small>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <button onclick="toggleStatus('${s.id}')" class="btn btn-sm"
                                        style="background: ${isInactive ? '#ef4444' : '#10b981'}; color: white;">
                                    ${isInactive ? '❌ Inactivo' : '✅ Activo'}
                                </button>
                            </td>
                            <td style="padding: 0.75rem; text-align: center;">
                                <button onclick="editStudent('${s.id}')" class="btn btn-sm" 
                                        style="background: #3b82f6; color: white; margin-right: 0.5rem;">
                                    ✏️
                                </button>
                                <button onclick="viewStudentPayments('${s.id}')" class="btn btn-sm"
                                        style="background: #10b981; color: white; margin-right: 0.5rem;">
                                    💰
                                </button>
                                <button onclick="openPaymentNotes('${s.id}')" class="btn btn-sm"
                                        style="background: #8b5cf6; color: white; margin-right: 0.5rem;"
                                        title="Notas de pago">
                                    📝
                                </button>
                                <button onclick="deleteStudent('${s.id}')" class="btn btn-sm"
                                        style="background: #ef4444; color: white;">
                                    🗑️
                                </button>
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
    
    // Get current filter from localStorage or default to 'all'
    const currentFilter = localStorage.getItem('studentStatusFilter') || 'all';
    
    container.innerHTML = `
        <div style="padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>👥 Gestión de Estudiantes</h2>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <select id="statusFilter" style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                        <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="active" ${currentFilter === 'active' ? 'selected' : ''}>Activos</option>
                        <option value="inactive" ${currentFilter === 'inactive' ? 'selected' : ''}>Inactivos</option>
                    </select>
                    <input type="text" id="studentSearch" placeholder="Buscar..." 
                           style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                    <button onclick="showStudentForm()" class="btn btn-primary">
                        ➕ Nuevo Estudiante
                    </button>
                </div>
            </div>
            
            <div id="studentFormContainer"></div>
            <div id="studentTableContainer">
                ${renderStudentTable(window.StudentManager.getStudents({ status: currentFilter }))}
            </div>
        </div>
    `;

    // Add search listener
    document.getElementById('studentSearch')?.addEventListener('input', (e) => {
        const statusFilter = document.getElementById('statusFilter').value;
        const filtered = window.StudentManager.getStudents({ 
            search: e.target.value,
            status: statusFilter 
        });
        document.getElementById('studentTableContainer').innerHTML = renderStudentTable(filtered);
    });
    
    // Add status filter listener
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        localStorage.setItem('studentStatusFilter', e.target.value);
        const searchValue = document.getElementById('studentSearch').value;
        const filtered = window.StudentManager.getStudents({ 
            status: e.target.value,
            search: searchValue 
        });
        document.getElementById('studentTableContainer').innerHTML = renderStudentTable(filtered);
    });
};

// ============================================
// SECTION 7: GLOBAL FUNCTIONS
// ============================================

window.showStudentForm = function(studentId = null) {
    const student = studentId ? window.StudentManager.students.get(studentId) : null;
    document.getElementById('studentFormContainer').innerHTML = renderStudentForm(student);
    
    document.getElementById('studentForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveStudentForm(studentId);
    };
};

window.editStudent = function(id) {
    showStudentForm(id);
};

window.deleteStudent = async function(id) {
    if (await window.StudentManager.deleteStudent(id)) {
        loadStudentsTab();
        window.showNotification('✅ Estudiante eliminado', 'success');
    }
};

window.cancelStudentForm = function() {
    document.getElementById('studentFormContainer').innerHTML = '';
};

// NEW: Toggle student status
window.toggleStatus = async function(id) {
    const student = window.StudentManager.students.get(id);
    if (!student) return;
    
    if (student.status === 'active') {
        // Show modal for inactive details
        document.body.insertAdjacentHTML('beforeend', renderInactiveModal(id));
        
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

// NEW: Close inactive modal
window.closeInactiveModal = function() {
    const modal = document.getElementById('inactiveModal');
    if (modal) modal.remove();
};

// NEW: Open payment notes modal
window.openPaymentNotes = async function(id) {
    const student = window.StudentManager.students.get(id);
    if (!student) return;
    
    document.body.insertAdjacentHTML('beforeend', renderPaymentNotesModal(student));
    
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

// NEW: Close payment notes modal
window.closePaymentNotesModal = function() {
    const modal = document.getElementById('paymentNotesModal');
    if (modal) modal.remove();
};

// ============================================
// SECTION 8: FORM SAVE FUNCTION
// ============================================

async function saveStudentForm(studentId) {
    try {
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
            tipoPago: document.getElementById('stuTipoPago').value,
            valor: parseInt(document.getElementById('stuValor').value) || 0,
            diaPago: parseInt(document.getElementById('stuDiaPago').value) || 1
        };

        if (studentId) {
            await window.StudentManager.updateStudent(studentId, studentData);
        } else {
            await window.StudentManager.saveStudent(studentData);
        }

        window.showNotification('✅ Estudiante guardado', 'success');
        cancelStudentForm();
        loadStudentsTab();
    } catch (error) {
        console.error('❌ Error saving student:', error);
        window.showNotification('❌ Error al guardar', 'error');
    }
}

// ============================================
// SECTION 9: PAYMENT VIEW FUNCTION
// ============================================

window.viewStudentPayments = function(id) {
    // This will be handled by payments module
    window.showNotification('💰 Ver pagos - Próximamente', 'info');
};

console.log('✅ Students module loaded successfully');
