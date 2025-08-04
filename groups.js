// groups.js - Groups Management Module
console.log('👥 Loading groups module...');

// Groups Manager Class
class GroupsManager {
    constructor() {
        this.groups = new Map();
        this.schedules = new Map();
        this.initialized = false;
    }

    // Initialize
    async init() {
        if (this.initialized) return;
        console.log('🚀 Initializing groups manager');
        await this.loadGroups();
        this.initialized = true;
    }

    // Load groups from Firebase
    async loadGroups() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'groups');
            const snapshot = await db.get(ref);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, group]) => {
                    this.groups.set(id, group);
                });
            }
            
            // Load schedules
            const schedRef = db.ref(window.FirebaseData.database, 'schedules');
            const schedSnapshot = await db.get(schedRef);
            
            if (schedSnapshot.exists()) {
                const schedData = schedSnapshot.val();
                Object.entries(schedData).forEach(([id, schedule]) => {
                    this.schedules.set(id, schedule);
                });
            }
            
            console.log(`✅ Loaded ${this.groups.size} groups`);
        } catch (error) {
            console.error('❌ Error loading groups:', error);
        }
    }

    // Create/Update group
    async saveGroup(groupData) {
        try {
            const id = groupData.id || `GRP-${Date.now()}`;
            const group = {
                ...groupData,
                id,
                updatedAt: new Date().toISOString(),
                createdAt: groupData.createdAt || new Date().toISOString()
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `groups/${id}`);
            await db.set(ref, group);
            
            this.groups.set(id, group);
            console.log('✅ Group saved:', id);
            return group;
        } catch (error) {
            console.error('❌ Error saving group:', error);
            throw error;
        }
    }

    // Get groups with student count
    async getGroupsWithStats() {
        const groups = Array.from(this.groups.values());
        const students = window.StudentManager.getStudents();
        
        return groups.map(group => {
            const groupStudents = students.filter(s => s.grupo === group.name);
            return {
                ...group,
                studentCount: groupStudents.length,
                students: groupStudents,
                status: this.getGroupStatus(groupStudents.length)
            };
        });
    }

    // Get group status based on size
    getGroupStatus(count) {
        if (count < 4) return { color: '#ef4444', text: 'Muy pequeño' };
        if (count > 8) return { color: '#f59e0b', text: 'Muy grande' };
        return { color: '#10b981', text: 'Óptimo' };
    }

    // Assign teacher to group
    async assignTeacher(groupId, teacherId) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `groups/${groupId}/teacherId`);
        await db.set(ref, teacherId);
        
        const group = this.groups.get(groupId);
        if (group) {
            group.teacherId = teacherId;
            this.groups.set(groupId, group);
        }
    }

    // Get available schedules
    getAvailableSchedules() {
        return [
            // Regular schedules
            { id: 'mwf-morning', days: 'L-Mi-V', time: '8:00-10:00', type: 'regular' },
            { id: 'mwf-afternoon', days: 'L-Mi-V', time: '4:00-6:00', type: 'regular' },
            { id: 'mwf-evening', days: 'L-Mi-V', time: '6:30-8:30', type: 'regular' },
            { id: 'tt-morning', days: 'Ma-J', time: '8:00-10:00', type: 'regular' },
            { id: 'tt-afternoon', days: 'Ma-J', time: '4:00-6:00', type: 'regular' },
            { id: 'tt-evening', days: 'Ma-J', time: '6:30-8:30', type: 'regular' },
            // Saturday
            { id: 'sat-morning', days: 'Sábado', time: '8:00-12:00', type: 'saturday' },
            { id: 'sat-afternoon', days: 'Sábado', time: '1:00-5:00', type: 'saturday' },
            // Special locations
            { id: 'hogar-tue', days: 'Martes', time: '1:30-5:30', type: 'hogar', location: 'Hogar Nazareth' },
            { id: 'hogar-wed', days: 'Miércoles', time: '1:30-5:30', type: 'hogar', location: 'Hogar Nazareth' },
            { id: 'hogar-thu', days: 'Jueves', time: '1:30-5:30', type: 'hogar', location: 'Hogar Nazareth' },
            { id: 'coats-tt', days: 'Ma-Mi', time: 'Flexible', type: 'company', location: 'Coats Cadena' },
            { id: 'coats-tf', days: 'J-V', time: 'Flexible', type: 'company', location: 'Coats Cadena' }
        ];
    }
}

// UI Functions
function renderGroupsView() {
    return `
        <div style="padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>📚 Gestión de Grupos</h2>
                <button onclick="showGroupForm()" class="btn btn-primary">
                    ➕ Nuevo Grupo
                </button>
            </div>
            
            <div id="groupFormContainer"></div>
            
            <div style="display: grid; gap: 1rem;" id="groupsGrid">
                <!-- Groups will be rendered here -->
            </div>
        </div>
    `;
}

function renderGroupCard(group) {
    const status = group.status;
    const teacher = window.TeacherManager?.teachers.get(group.teacherId);
    
    return `
        <div style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0;">${group.name}</h3>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: ${status.color}; color: white; padding: 0.25rem 0.75rem; 
                                     border-radius: 4px; font-size: 0.875rem;">
                            ${group.studentCount}/8 - ${status.text}
                        </span>
                    </div>
                </div>
                <button onclick="toggleGroupDetails('${group.id}')" class="btn btn-sm"
                        style="background: #3b82f6; color: white;">
                    ${group.expanded ? '➖' : '➕'}
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
                <div>
                    <strong>📅 Horario:</strong> ${group.schedule || 'Sin asignar'}
                </div>
                <div>
                    <strong>📍 Lugar:</strong> ${group.location || 'CB Principal'}
                </div>
                <div>
                    <strong>👩‍🏫 Profesor:</strong> ${teacher?.name || 'Sin asignar'}
                </div>
                <div>
                    <strong>📖 Libro:</strong> ${group.book || 'Por definir'}
                </div>
            </div>
            
            <div id="groupDetails-${group.id}" style="display: ${group.expanded ? 'block' : 'none'};">
                <hr style="margin: 1rem 0;">
                
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem;">Estudiantes (${group.studentCount})</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${group.students.length ? `
                            <table style="width: 100%; font-size: 0.875rem;">
                                ${group.students.map(s => `
                                    <tr>
                                        <td style="padding: 0.25rem 0;">${s.nombre}</td>
                                        <td style="padding: 0.25rem 0; text-align: right;">
                                            <button onclick="removeFromGroup('${s.id}', '${group.id}')" 
                                                    class="btn btn-sm" style="background: #ef4444; color: white;">
                                                ❌
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </table>
                        ` : '<div style="color: #6b7280;">No hay estudiantes asignados</div>'}
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="showGroupForm('${group.id}')" class="btn btn-sm"
                            style="background: #3b82f6; color: white;">
                        ✏️ Editar
                    </button>
                    <button onclick="assignStudentsModal('${group.id}')" class="btn btn-sm"
                            style="background: #10b981; color: white;">
                        👥 Asignar Estudiantes
                    </button>
                    <button onclick="deleteGroup('${group.id}')" class="btn btn-sm"
                            style="background: #ef4444; color: white;">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderGroupForm(group = null) {
    const schedules = window.GroupsManager.getAvailableSchedules();
    
    return `
        <div style="background: #f3f4f6; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
            <h3>${group ? '✏️ Editar' : '➕ Nuevo'} Grupo</h3>
            
            <form id="groupForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <div class="form-group">
                    <label>Nombre del Grupo*</label>
                    <input type="text" id="groupName" value="${group?.name || ''}" required 
                           placeholder="Ej: A1-Morning-01">
                </div>
                
                <div class="form-group">
                    <label>Horario*</label>
                    <select id="groupSchedule" required onchange="updateLocationField()">
                        <option value="">Seleccionar...</option>
                        ${schedules.map(s => `
                            <option value="${s.id}" data-location="${s.location || ''}"
                                    ${group?.scheduleId === s.id ? 'selected' : ''}>
                                ${s.days} ${s.time} ${s.location ? `- ${s.location}` : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Ubicación</label>
                    <input type="text" id="groupLocation" value="${group?.location || 'CB Principal'}" 
                           placeholder="CB Principal">
                </div>
                
                <div class="form-group">
                    <label>Profesor</label>
                    <select id="groupTeacher">
                        <option value="">Sin asignar</option>
                        ${window.TeacherManager ? Array.from(window.TeacherManager.teachers.values()).map(t => `
                            <option value="${t.id}" ${group?.teacherId === t.id ? 'selected' : ''}>
                                ${t.name}
                            </option>
                        `).join('') : ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Libro/Material</label>
                    <input type="text" id="groupBook" value="${group?.book || ''}" 
                           placeholder="Ej: English File A1">
                </div>
                
                <div class="form-group">
                    <label>Sala/Aula</label>
                    <input type="text" id="groupRoom" value="${group?.room || ''}" 
                           placeholder="Ej: Sala 101">
                </div>
                
                <div style="grid-column: 1/-1; display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="cancelGroupForm()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${group ? 'Actualizar' : 'Crear'} Grupo
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Global functions
window.GroupsManager = new GroupsManager();
window.groupsData = new Map(); // For compatibility

window.loadGroupsTab = async function() {
    console.log('📚 Loading groups tab');
    
    const container = document.getElementById('groupsContainer');
    if (!container) {
        console.error('❌ Groups container not found');
        return;
    }

    await window.GroupsManager.init();
    
    container.innerHTML = renderGroupsView();
    await refreshGroupsGrid();
};

window.refreshGroupsGrid = async function() {
    const groups = await window.GroupsManager.getGroupsWithStats();
    const grid = document.getElementById('groupsGrid');
    
    if (!groups.length) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No hay grupos creados</div>';
        return;
    }
    
    // Sort groups by status (problematic first)
    groups.sort((a, b) => {
        if (a.studentCount < 4 && b.studentCount >= 4) return -1;
        if (a.studentCount >= 4 && b.studentCount < 4) return 1;
        if (a.studentCount > 8 && b.studentCount <= 8) return -1;
        if (a.studentCount <= 8 && b.studentCount > 8) return 1;
        return a.name.localeCompare(b.name);
    });
    
    grid.innerHTML = groups.map(group => renderGroupCard(group)).join('');
    
    // Update global groupsData for student module
    window.groupsData.clear();
    groups.forEach(g => window.groupsData.set(g.name, g));
};

window.showGroupForm = function(groupId = null) {
    const group = groupId ? window.GroupsManager.groups.get(groupId) : null;
    document.getElementById('groupFormContainer').innerHTML = renderGroupForm(group);
    
    document.getElementById('groupForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveGroupForm(groupId);
    };
};

window.cancelGroupForm = function() {
    document.getElementById('groupFormContainer').innerHTML = '';
};

window.toggleGroupDetails = function(groupId) {
    const details = document.getElementById(`groupDetails-${groupId}`);
    if (details) {
        const isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
        
        // Update expanded state
        const group = window.GroupsManager.groups.get(groupId);
        if (group) {
            group.expanded = isHidden;
        }
    }
};

window.updateLocationField = function() {
    const select = document.getElementById('groupSchedule');
    const location = select.options[select.selectedIndex]?.dataset.location;
    if (location) {
        document.getElementById('groupLocation').value = location;
    }
};

// ===== REPLACE YOUR CURRENT assignStudentsModal FUNCTION WITH ALL OF THIS =====

window.assignStudentsModal = async function(groupId) {
    console.log('📚 Opening assign students modal for group:', groupId);
    
    // Get the group details
    const group = window.groupsData.get(groupId);
    if (!group) {
        alert('Grupo no encontrado');
        return;
    }
    
    // Initialize StudentManager if needed
    if (!window.StudentManager.initialized) {
        await window.StudentManager.init();
    }
    
    // Get all students
    const allStudents = window.StudentManager.getStudents();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'assignStudentsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
            <h2 style="margin: 0 0 1rem 0;">📚 Asignar Estudiantes a ${group.name}</h2>
            
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <button onclick="selectAllStudents(true)" class="btn btn-sm" 
                        style="background: #10b981; color: white;">
                    ✅ Seleccionar Todos
                </button>
                <button onclick="selectAllStudents(false)" class="btn btn-sm"
                        style="background: #6b7280; color: white;">
                    ❌ Deseleccionar Todos
                </button>
                <input type="text" id="studentFilterInput" placeholder="Buscar estudiante..." 
                       style="flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;"
                       onkeyup="filterStudentsList()">
            </div>
            
            <div style="flex: 1; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
                <table style="width: 100%;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 0.5rem; text-align: center; width: 50px;">
                                <input type="checkbox" id="selectAllCheckbox" onchange="selectAllStudents(this.checked)">
                            </th>
                            <th style="padding: 0.5rem; text-align: left;">Nombre</th>
                            <th style="padding: 0.5rem; text-align: left;">Documento</th>
                            <th style="padding: 0.5rem; text-align: left;">Teléfono</th>
                            <th style="padding: 0.5rem; text-align: left;">Grupo Actual</th>
                        </tr>
                    </thead>
                    <tbody id="studentListBody">
                        ${allStudents.map(student => {
                            const isInThisGroup = student.grupo === groupId;
                            const hasOtherGroup = student.grupo && student.grupo !== groupId;
                            
                            return `
                                <tr class="student-row" data-student-name="${(student.nombre || '').toLowerCase()}">
                                    <td style="padding: 0.5rem; text-align: center;">
                                        <input type="checkbox" 
                                               class="student-checkbox" 
                                               data-student-id="${student.id}"
                                               ${isInThisGroup ? 'checked disabled' : ''}>
                                    </td>
                                    <td style="padding: 0.5rem;">
                                        ${student.nombre || '-'}
                                        ${isInThisGroup ? '<span style="color: #10b981; font-weight: bold;"> ✓</span>' : ''}
                                    </td>
                                    <td style="padding: 0.5rem;">${student.tipoDoc || ''} ${student.numDoc || '-'}</td>
                                    <td style="padding: 0.5rem;">${student.telefono || '-'}</td>
                                    <td style="padding: 0.5rem;">
                                        ${isInThisGroup ? 
                                            `<span style="color: #10b981; font-weight: bold;">${group.name}</span>` : 
                                            hasOtherGroup ? 
                                            `<span style="color: #f59e0b;">${student.grupo}</span>` : 
                                            '<span style="color: #6b7280;">Sin grupo</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <div id="selectionCount" style="color: #6b7280;">
                    0 estudiantes seleccionados
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="closeAssignStudentsModal()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button onclick="assignSelectedStudents('${groupId}')" class="btn btn-primary">
                        ✅ Asignar Estudiantes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    updateSelectionCount();
};

// Function to close the modal
window.closeAssignStudentsModal = function() {
    const modal = document.getElementById('assignStudentsModal');
    if (modal) {
        modal.remove();
    }
};

// Function to select/deselect all students
window.selectAllStudents = function(checked) {
    const checkboxes = document.querySelectorAll('.student-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = checked);
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checked;
    }
    
    updateSelectionCount();
};

// Function to filter students list
window.filterStudentsList = function() {
    const filter = document.getElementById('studentFilterInput').value.toLowerCase();
    const rows = document.querySelectorAll('.student-row');
    
    rows.forEach(row => {
        const name = row.dataset.studentName;
        row.style.display = name.includes(filter) ? '' : 'none';
    });
};

// Function to update selection count
window.updateSelectionCount = function() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked:not(:disabled)');
    const countElement = document.getElementById('selectionCount');
    if (countElement) {
        countElement.textContent = `${checkboxes.length} estudiantes seleccionados`;
    }
    
    // Add event listeners to checkboxes if not already added
    document.querySelectorAll('.student-checkbox').forEach(cb => {
        if (!cb.hasListener) {
            cb.addEventListener('change', updateSelectionCount);
            cb.hasListener = true;
        }
    });
};

// Function to assign selected students to the group
window.assignSelectedStudents = async function(groupId) {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked:not(:disabled)');
    
    if (checkboxes.length === 0) {
        alert('Por favor selecciona al menos un estudiante');
        return;
    }
    
    const group = window.groupsData.get(groupId);
    
    try {
        // Show loading
        const modal = document.getElementById('assignStudentsModal');
        const originalContent = modal.innerHTML;
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 3rem;
                border-radius: 12px;
                text-align: center;
            ">
                <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                <p>Asignando estudiantes al grupo ${group.name}...</p>
            </div>
        `;
        
        // Update each selected student
        let assigned = 0;
        for (const checkbox of checkboxes) {
            const studentId = checkbox.dataset.studentId;
            await window.StudentManager.updateStudent(studentId, { grupo: groupId });
            assigned++;
        }
        
        // Update group student count
        if (!group.students) group.students = [];
        
        // Get updated list of students in this group
        const studentsInGroup = window.StudentManager.getStudents({ grupo: groupId });
        group.students = studentsInGroup.map(s => s.id);
        
        // Save group changes
        await window.GroupsManager.updateGroup(groupId, { students: group.students });
        
        // Show success
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 3rem;
                border-radius: 12px;
                text-align: center;
            ">
                <div style="font-size: 3rem; color: #10b981; margin-bottom: 1rem;">✅</div>
                <p style="font-size: 1.2rem; margin-bottom: 2rem;">
                    ${assigned} estudiantes asignados exitosamente al grupo ${group.name}
                </p>
                <button onclick="closeAssignStudentsModal(); loadGroupsTab();" class="btn btn-primary">
                    Aceptar
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('Error assigning students:', error);
        alert('Error al asignar estudiantes: ' + error.message);
        closeAssignStudentsModal();
    }
};

// Add CSS for loading spinner
if (!document.getElementById('assign-students-styles')) {
    const style = document.createElement('style');
    style.id = 'assign-students-styles';
    style.textContent = `
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .student-row:hover {
            background-color: #f9fafb;
        }
        
        .student-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .student-checkbox:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    `;
    document.head.appendChild(style);
}

// ===== KEEP YOUR EXISTING FUNCTIONS BELOW =====

window.removeFromGroup = async function(studentId, groupId) {
    if (!confirm('¿Quitar estudiante del grupo?')) return;
    
    await window.StudentManager.updateStudent(studentId, { grupo: '' });
    await refreshGroupsGrid();
    window.showNotification('✅ Estudiante removido del grupo', 'success');
};

window.deleteGroup = async function(groupId) {
    if (!confirm('¿Eliminar este grupo? Los estudiantes quedarán sin grupo asignado.')) return;
    
    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `groups/${groupId}`);
        await db.remove(ref);
        
        window.GroupsManager.groups.delete(groupId);
        await refreshGroupsGrid();
        window.showNotification('✅ Grupo eliminado', 'success');
    } catch (error) {
        console.error('❌ Error deleting group:', error);
        window.showNotification('❌ Error al eliminar grupo', 'error');
    }
};

window.removeFromGroup = async function(studentId, groupId) {
    if (!confirm('¿Quitar estudiante del grupo?')) return;
    
    await window.StudentManager.updateStudent(studentId, { grupo: '' });
    await refreshGroupsGrid();
    window.showNotification('✅ Estudiante removido del grupo', 'success');
};

window.deleteGroup = async function(groupId) {
    if (!confirm('¿Eliminar este grupo? Los estudiantes quedarán sin grupo asignado.')) return;
    
    try {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `groups/${groupId}`);
        await db.remove(ref);
        
        window.GroupsManager.groups.delete(groupId);
        await refreshGroupsGrid();
        window.showNotification('✅ Grupo eliminado', 'success');
    } catch (error) {
        console.error('❌ Error deleting group:', error);
        window.showNotification('❌ Error al eliminar grupo', 'error');
    }
};

async function saveGroupForm(groupId) {
    try {
        const scheduleSelect = document.getElementById('groupSchedule');
        const selectedSchedule = window.GroupsManager.getAvailableSchedules()
            .find(s => s.id === scheduleSelect.value);
        
        const groupData = {
            id: groupId,
            name: document.getElementById('groupName').value,
            scheduleId: scheduleSelect.value,
            schedule: selectedSchedule ? `${selectedSchedule.days} ${selectedSchedule.time}` : '',
            location: document.getElementById('groupLocation').value,
            teacherId: document.getElementById('groupTeacher').value,
            book: document.getElementById('groupBook').value,
            room: document.getElementById('groupRoom').value
        };

        await window.GroupsManager.saveGroup(groupData);
        
        window.showNotification('✅ Grupo guardado', 'success');
        cancelGroupForm();
        await refreshGroupsGrid();
    } catch (error) {
        console.error('❌ Error saving group:', error);
        window.showNotification('❌ Error al guardar grupo', 'error');
    }
}


// ===== ASSIGN STUDENTS TO GROUP FUNCTIONALITY =====

// Function to show the assign students modal
window.assignStudentsModal = async function(groupId) {
    // ... (all the code from the first artifact)
};

// Function to close the modal
window.closeAssignStudentsModal = function() {
    // ...
};

// Function to select/deselect all students
window.selectAllStudents = function(checked) {
    // ...
};

// Function to filter students list
window.filterStudentsList = function() {
    // ...
};

// Function to update selection count
window.updateSelectionCount = function() {
    // ...
};

// Function to assign selected students to the group
window.assignSelectedStudents = async function(groupId) {
    // ...
};

// Add CSS for loading spinner
if (!document.getElementById('assign-students-styles')) {
    // ... (the CSS part)
}

console.log('✅ Groups module loaded successfully');
