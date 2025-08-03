// students.js - Student Management Module
console.log('👥 Loading students module...');

// Student data structure matching Excel
const studentFields = {
    nombre: '', tipoDoc: 'C.C', edad: '', numDoc: '', telefono: '', correo: '',
    acudiente: '', docAcudiente: '', fechaInicio: '', grupo: '', tipoPago: 'MENSUAL',
    valor: '', fechaPago: '', pagos: {}
};

// Student Manager Class
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

    // Get filtered students
    getStudents(filters = {}) {
        let students = Array.from(this.students.values());
        
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

    // Update student
    async updateStudent(id, updates) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `students/${id}`);
        updates.updatedAt = new Date().toISOString();
        await db.update(ref, updates);
        
        const existing = this.students.get(id);
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

// UI Functions
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

function renderStudentTable(students) {
    if (!students.length) {
        return '<div style="text-align: center; padding: 2rem; color: #666;">No hay estudiantes registrados</div>';
    }

    return `
        <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: #f3f4f6;">
                <tr>
                    <th style="padding: 0.75rem; text-align: left;">Nombre</th>
                    <th style="padding: 0.75rem; text-align: left;">Documento</th>
                    <th style="padding: 0.75rem; text-align: left;">Teléfono</th>
                    <th style="padding: 0.75rem; text-align: left;">Grupo</th>
                    <th style="padding: 0.75rem; text-align: left;">Pago</th>
                    <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${students.map(s => `
                    <tr style="border-top: 1px solid #e5e7eb;">
                        <td style="padding: 0.75rem;">${s.nombre || '-'}</td>
                        <td style="padding: 0.75rem;">${s.tipoDoc || ''} ${s.numDoc || '-'}</td>
                        <td style="padding: 0.75rem;">
                            <a href="https://wa.me/57${s.telefono?.replace(/\D/g, '')}" 
                               target="_blank" style="color: #059669;">
                                ${s.telefono || '-'}
                            </a>
                        </td>
                        <td style="padding: 0.75rem;">${s.grupo || 'Sin grupo'}</td>
                        <td style="padding: 0.75rem;">
                            ${s.tipoPago || '-'}<br>
                            <small>$${(s.valor || 0).toLocaleString()}</small>
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
                            <button onclick="deleteStudent('${s.id}')" class="btn btn-sm"
                                    style="background: #ef4444; color: white;">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Global functions
window.StudentManager = new StudentManager();

window.loadStudentsTab = async function() {
    console.log('📚 Loading students tab');
    
    const container = document.getElementById('studentsContainer');
    if (!container) {
        console.error('❌ Students container not found');
        return;
    }

    await window.StudentManager.init();
    
    container.innerHTML = `
        <div style="padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>👥 Gestión de Estudiantes</h2>
                <div style="display: flex; gap: 1rem;">
                    <input type="text" id="studentSearch" placeholder="Buscar..." 
                           style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
                    <button onclick="showStudentForm()" class="btn btn-primary">
                        ➕ Nuevo Estudiante
                    </button>
                </div>
            </div>
            
            <div id="studentFormContainer"></div>
            <div id="studentTableContainer">
                ${renderStudentTable(window.StudentManager.getStudents())}
            </div>
        </div>
    `;

    // Add search listener
    document.getElementById('studentSearch')?.addEventListener('input', (e) => {
        const filtered = window.StudentManager.getStudents({ search: e.target.value });
        document.getElementById('studentTableContainer').innerHTML = renderStudentTable(filtered);
    });
};

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

window.viewStudentPayments = function(id) {
    // This will be handled by payments module
    window.showNotification('💰 Ver pagos - Próximamente', 'info');
};

console.log('✅ Students module loaded successfully');
