// groups.js - Groups Management with Schedule Information
console.log('👥 Loading groups module with schedule...');

// Groups Manager Class
class GroupsManager {
    constructor() {
        this.groups = new Map();
        this.locations = new Map();
        this.initializeLocations();
    }

    // Initialize default locations
    initializeLocations() {
        const defaultLocations = [
            { id: 'LOC-001', name: 'CB Office', address: 'Calle Principal 123' },
            { id: 'LOC-002', name: 'Coats Cadena', address: 'Av. Industrial 456' },
            { id: 'LOC-003', name: 'Online', address: 'Virtual' },
            { id: 'LOC-004', name: 'Cliente Externo', address: 'Por definir' }
        ];
        
        defaultLocations.forEach(loc => {
            this.locations.set(loc.id, loc);
        });
    }

    // Create new group with schedule
    async createGroup(groupData) {
        try {
            const group = {
                id: `GRP-${Date.now()}`,
                name: groupData.name,
                level: groupData.level || 'Intermedio',
                teacherId: groupData.teacherId,
                students: groupData.students || [],
                schedule: {
                    days: groupData.days || [], // ['Lunes', 'Miércoles', 'Viernes']
                    startTime: groupData.startTime || '08:00',
                    endTime: groupData.endTime || '10:00',
                    duration: groupData.duration || 2, // hours
                    locationId: groupData.locationId || 'LOC-001',
                    locationName: this.locations.get(groupData.locationId)?.name || 'CB Office'
                },
                maxStudents: groupData.maxStudents || 15,
                status: 'active',
                createdAt: new Date().toISOString()
            };

            // Save to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `groups/${group.id}`);
            await db.set(ref, group);
            
            this.groups.set(group.id, group);
            console.log('✅ Group created:', group.id);
            return group;
        } catch (error) {
            console.error('❌ Error creating group:', error);
            throw error;
        }
    }

    // Update group schedule
    async updateGroupSchedule(groupId, scheduleData) {
        try {
            const group = this.groups.get(groupId);
            if (!group) throw new Error('Grupo no encontrado');

            // Calculate duration from start and end time
            if (scheduleData.startTime && scheduleData.endTime) {
                const start = new Date(`2024-01-01 ${scheduleData.startTime}`);
                const end = new Date(`2024-01-01 ${scheduleData.endTime}`);
                scheduleData.duration = (end - start) / (1000 * 60 * 60); // Convert to hours
            }

            group.schedule = { ...group.schedule, ...scheduleData };

            // Update Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `groups/${groupId}/schedule`);
            await db.set(ref, group.schedule);
            
            console.log('✅ Schedule updated for group:', groupId);
            return group;
        } catch (error) {
            console.error('❌ Error updating schedule:', error);
            throw error;
        }
    }

    // Add student to group
    async addStudentToGroup(groupId, studentId) {
        try {
            const group = this.groups.get(groupId);
            if (!group) throw new Error('Grupo no encontrado');
            
            if (group.students.includes(studentId)) {
                throw new Error('Estudiante ya está en el grupo');
            }
            
            if (group.students.length >= group.maxStudents) {
                throw new Error('Grupo lleno');
            }

            group.students.push(studentId);

            // Update Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `groups/${groupId}/students`);
            await db.set(ref, group.students);
            
            console.log('✅ Student added to group');
            return group;
        } catch (error) {
            console.error('❌ Error adding student:', error);
            throw error;
        }
    }

    // Remove student from group
    async removeStudentFromGroup(groupId, studentId) {
        try {
            const group = this.groups.get(groupId);
            if (!group) throw new Error('Grupo no encontrado');
            
            group.students = group.students.filter(id => id !== studentId);

            // Update Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `groups/${groupId}/students`);
            await db.set(ref, group.students);
            
            console.log('✅ Student removed from group');
            return group;
        } catch (error) {
            console.error('❌ Error removing student:', error);
            throw error;
        }
    }

    // Get groups by teacher
    getGroupsByTeacher(teacherId) {
        return Array.from(this.groups.values())
            .filter(g => g.teacherId === teacherId);
    }

    // Get groups by day
    getGroupsByDay(day) {
        return Array.from(this.groups.values())
            .filter(g => g.schedule.days.includes(day));
    }

    // Get today's groups
    getTodayGroups() {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const today = days[new Date().getDay()];
        return this.getGroupsByDay(today);
    }

    // Load groups from Firebase
    async loadGroups() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'groups');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const groups = snapshot.val();
                this.groups.clear();
                Object.entries(groups).forEach(([id, group]) => {
                    this.groups.set(id, group);
                });
                console.log(`✅ Loaded ${this.groups.size} groups`);
            }
        } catch (error) {
            console.error('❌ Error loading groups:', error);
        }
    }

    // Add new location
    async addLocation(name, address) {
        const location = {
            id: `LOC-${Date.now()}`,
            name,
            address
        };
        
        this.locations.set(location.id, location);
        
        // Save to Firebase
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `locations/${location.id}`);
        await db.set(ref, location);
        
        return location;
    }
}

// UI Functions
function renderGroupsTab() {
    const groups = Array.from(window.GroupsManager?.groups.values() || []);
    const teachers = Array.from(window.TeacherManager?.teachers.values() || []);
    
    return `
        <div style="padding: 1rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">👥 Gestión de Grupos</h2>
                <button onclick="showCreateGroupModal()" class="btn btn-primary">
                    ➕ Nuevo Grupo
                </button>
            </div>
            
            <!-- Today's Groups Summary -->
            <div style="background: #e0f2fe; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0;">📅 Grupos de Hoy</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
                    ${window.GroupsManager?.getTodayGroups().map(g => `
                        <div style="background: white; padding: 0.5rem; border-radius: 4px;">
                            <strong>${g.name}</strong><br>
                            <small>${g.schedule.startTime} - ${g.schedule.endTime}</small>
                        </div>
                    `).join('') || '<p>No hay grupos programados para hoy</p>'}
                </div>
            </div>
            
            <!-- Groups Table -->
            <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Nombre</th>
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Profesor</th>
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Horario</th>
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Ubicación</th>
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Estudiantes</th>
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groups.map(group => `
                            <tr>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                                    <strong>${group.name}</strong><br>
                                    <small style="color: #6b7280;">${group.level}</small>
                                </td>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                                    ${teachers.find(t => t.id === group.teacherId)?.name || 'Sin asignar'}
                                </td>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                                    <small>
                                        ${group.schedule?.days?.join(', ') || 'Sin definir'}<br>
                                        ${group.schedule?.startTime || ''} - ${group.schedule?.endTime || ''}<br>
                                        (${group.schedule?.duration || 0} horas)
                                    </small>
                                </td>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                                    ${group.schedule?.locationName || 'N/A'}
                                </td>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                                    ${group.students?.length || 0} / ${group.maxStudents}
                                </td>
                                <td style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                                    <button onclick="editGroup('${group.id}')" class="btn btn-sm btn-secondary">✏️</button>
                                    <button onclick="manageStudents('${group.id}')" class="btn btn-sm btn-primary">👥</button>
                                    <button onclick="setPaymentRate('${group.id}')" class="btn btn-sm btn-success">💰</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showCreateGroupModal() {
    const teachers = Array.from(window.TeacherManager?.teachers.values() || []);
    const locations = Array.from(window.GroupsManager?.locations.values() || []);
    
    const modal = `
        <div id="createGroupModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3>➕ Crear Nuevo Grupo</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Nombre del Grupo</label>
                        <input type="text" id="groupName" placeholder="Ej: Inglés Avanzado A1" 
                               style="width: 100%; padding: 0.5rem;">
                    </div>
                    
                    <div class="form-group">
                        <label>Nivel</label>
                        <select id="groupLevel" style="width: 100%; padding: 0.5rem;">
                            <option value="Básico">Básico</option>
                            <option value="Intermedio">Intermedio</option>
                            <option value="Avanzado">Avanzado</option>
                            <option value="Conversacional">Conversacional</option>
                            <option value="Business">Business</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Profesor</label>
                        <select id="groupTeacher" style="width: 100%; padding: 0.5rem;">
                            <option value="">Seleccionar profesor...</option>
                            ${teachers.map(t => `
                                <option value="${t.id}">${t.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Máximo de Estudiantes</label>
                        <input type="number" id="groupMaxStudents" value="15" 
                               style="width: 100%; padding: 0.5rem;">
                    </div>
                </div>
                
                <h4 style="margin-top: 1.5rem;">📅 Horario</h4>
                
                <div class="form-group">
                    <label>Días de Clase</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                        ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => `
                            <label style="display: flex; align-items: center;">
                                <input type="checkbox" name="groupDays" value="${day}" style="margin-right: 0.5rem;">
                                ${day}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Hora Inicio</label>
                        <input type="time" id="groupStartTime" value="08:00" 
                               style="width: 100%; padding: 0.5rem;">
                    </div>
                    
                    <div class="form-group">
                        <label>Hora Fin</label>
                        <input type="time" id="groupEndTime" value="10:00" 
                               style="width: 100%; padding: 0.5rem;">
                    </div>
                    
                    <div class="form-group">
                        <label>Duración (horas)</label>
                        <select id="groupDuration" style="width: 100%; padding: 0.5rem;">
                            <option value="1">1 hora</option>
                            <option value="2" selected>2 horas</option>
                            <option value="3">3 horas</option>
                            <option value="4">4 horas</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Ubicación</label>
                    <select id="groupLocation" style="width: 100%; padding: 0.5rem;">
                        ${locations.map(loc => `
                            <option value="${loc.id}">${loc.name} - ${loc.address}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="closeModal('createGroupModal')" 
                            class="btn btn-secondary" style="flex: 1;">
                        Cancelar
                    </button>
                    <button onclick="saveGroup()" 
                            class="btn btn-primary" style="flex: 1;">
                        Crear Grupo
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function manageStudentsModal(groupId) {
    const group = window.GroupsManager?.groups.get(groupId);
    const allStudents = Array.from(window.StudentManager?.students.values() || []);
    const groupStudents = group?.students || [];
    
    const modal = `
        <div id="manageStudentsModal" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; 
                        max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3>👥 Gestionar Estudiantes - ${group?.name}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <!-- Available Students -->
                    <div>
                        <h4>Estudiantes Disponibles</h4>
                        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 4px; padding: 0.5rem;">
                            ${allStudents.filter(s => !groupStudents.includes(s.id)).map(student => `
                                <div style="padding: 0.5rem; border-bottom: 1px solid #f3f4f6;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>${student.nombre}</span>
                                        <button onclick="addToGroup('${groupId}', '${student.id}')" 
                                                class="btn btn-sm btn-primary">➕</button>
                                    </div>
                                </div>
                            `).join('') || '<p style="text-align: center; color: #6b7280;">No hay estudiantes disponibles</p>'}
                        </div>
                    </div>
                    
                    <!-- Group Students -->
                    <div>
                        <h4>Estudiantes en el Grupo (${groupStudents.length}/${group?.maxStudents})</h4>
                        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 4px; padding: 0.5rem;">
                            ${groupStudents.map(studentId => {
                                const student = window.StudentManager?.students.get(studentId);
                                return student ? `
                                    <div style="padding: 0.5rem; border-bottom: 1px solid #f3f4f6;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span>${student.nombre}</span>
                                            <button onclick="removeFromGroup('${groupId}', '${studentId}')" 
                                                    class="btn btn-sm btn-danger">❌</button>
                                        </div>
                                    </div>
                                ` : '';
                            }).join('') || '<p style="text-align: center; color: #6b7280;">No hay estudiantes en este grupo</p>'}
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <button onclick="closeModal('manageStudentsModal')" 
                            class="btn btn-secondary" style="width: 100%;">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

// Global Functions
window.GroupsManager = new GroupsManager();

window.loadGroupsTab = async function() {
    await window.GroupsManager.loadGroups();
    const container = document.getElementById('groupsContainer');
    if (container) {
        container.innerHTML = renderGroupsTab();
    }
};

window.saveGroup = async function() {
    const days = Array.from(document.querySelectorAll('input[name="groupDays"]:checked'))
        .map(cb => cb.value);
    
    if (days.length === 0) {
        window.showNotification('⚠️ Seleccione al menos un día', 'warning');
        return;
    }
    
    const groupData = {
        name: document.getElementById('groupName').value,
        level: document.getElementById('groupLevel').value,
        teacherId: document.getElementById('groupTeacher').value,
        maxStudents: parseInt(document.getElementById('groupMaxStudents').value),
        days,
        startTime: document.getElementById('groupStartTime').value,
        endTime: document.getElementById('groupEndTime').value,
        duration: parseFloat(document.getElementById('groupDuration').value),
        locationId: document.getElementById('groupLocation').value
    };
    
    if (!groupData.name || !groupData.teacherId) {
        window.showNotification('⚠️ Complete todos los campos requeridos', 'warning');
        return;
    }
    
    try {
        await window.GroupsManager.createGroup(groupData);
        window.showNotification('✅ Grupo creado exitosamente', 'success');
        closeModal('createGroupModal');
        loadGroupsTab();
    } catch (error) {
        window.showNotification('❌ Error al crear grupo', 'error');
    }
};

window.editGroup = function(groupId) {
    // Similar to create but with pre-filled data
    const group = window.GroupsManager.groups.get(groupId);
    if (group) {
        // Show edit modal with group data
        console.log('Edit group:', group);
    }
};

window.manageStudents = function(groupId) {
    manageStudentsModal(groupId);
};

window.setPaymentRate = function(groupId) {
    // This will be handled by the payments module
    if (window.PaymentManager) {
        window.PaymentManager.showRateModal(groupId);
    } else {
        window.showNotification('⚠️ Módulo de pagos no cargado', 'warning');
    }
};

window.addToGroup = async function(groupId, studentId) {
    try {
        await window.GroupsManager.addStudentToGroup(groupId, studentId);
        window.showNotification('✅ Estudiante agregado', 'success');
        closeModal('manageStudentsModal');
        manageStudents(groupId);
    } catch (error) {
        window.showNotification(`❌ ${error.message}`, 'error');
    }
};

window.removeFromGroup = async function(groupId, studentId) {
    try {
        await window.GroupsManager.removeStudentFromGroup(groupId, studentId);
        window.showNotification('✅ Estudiante removido', 'success');
        closeModal('manageStudentsModal');
        manageStudents(groupId);
    } catch (error) {
        window.showNotification('❌ Error al remover estudiante', 'error');
    }
};

window.closeModal = function(modalId) {
    document.getElementById(modalId)?.remove();
};

// Initialize on load
if (window.FirebaseData?.database) {
    window.GroupsManager.loadGroups();
}

console.log('✅ Groups module with schedule loaded successfully');
