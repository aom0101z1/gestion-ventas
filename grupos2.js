// grupos2.js - New Groups Management System
console.log('👥 Loading Grupos2 module (New System)...');

// Groups Manager Class - Version 2
class GroupsManager2 {
    constructor() {
        this.groups = new Map();
        this.initialized = false;

        // Modality configuration
        this.modalities = {
            CB: { name: 'Ciudad Bilingüe', range: [101, 130], color: '#3b82f6' },
            COATS: { name: 'Coats (Company)', range: [131, 134], color: '#f59e0b' },
            NAZARETH: { name: 'Hogar Nazareth', range: [135, 138], color: '#10b981' },
            PRIVADO: { name: 'Clases Privadas', range: [139, 150], color: '#8b5cf6' },
            ONLINE: { name: 'Clases Online', range: [151, 160], color: '#ec4899' }
        };

        // Available rooms for CB
        this.cbRooms = [
            'Sydney', 'London', 'Colombia', 'New York', 'Washington',
            'Moscow', 'Rome', 'Cinema', 'DanceRoom', 'Paris',
            'Sala 101', 'Sala 102', 'Sala 103', 'Sala 104', 'Sala 105',
            'Sala 106', 'Sala 107', 'Sala 108', 'Sala 109', 'Sala 110'
        ];

        // Available days
        this.daysOptions = [
            { value: 'Lunes', short: 'L' },
            { value: 'Martes', short: 'Ma' },
            { value: 'Miércoles', short: 'Mi' },
            { value: 'Jueves', short: 'J' },
            { value: 'Viernes', short: 'V' },
            { value: 'Sábado', short: 'S' }
        ];

        // Age categories with colors
        this.ageCategories = {
            'ninos_4_8': { name: 'Niños 4-8', icon: '👶', color: '#ec4899', textColor: 'white' },
            'ninos_9_12': { name: 'Niños 9-12', icon: '🧒', color: '#f97316', textColor: 'white' },
            'jovenes_13_17': { name: 'Jóvenes 13-17', icon: '🧑', color: '#eab308', textColor: 'black' },
            'adultos': { name: 'Adultos', icon: '👨', color: '#22c55e', textColor: 'white' }
        };
    }

    // Initialize
    async init(forceReload = false) {
        if (this.initialized && !forceReload) return;
        console.log('🚀 Initializing Grupos2 manager', forceReload ? '(force reload)' : '');
        await this.loadGroups();
        this.initialized = true;
    }

    // Load groups from Firebase
    async loadGroups() {
        try {
            console.log('📂 Loading groups from Firebase (grupos2)...');

            // Clear existing data to ensure fresh load
            this.groups.clear();

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'grupos2');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log('✅ Groups data received:', Object.keys(data || {}).length, 'groups');

                Object.entries(data).forEach(([id, group]) => {
                    this.groups.set(parseInt(id), group);
                });
            } else {
                console.log('⚠️ No groups data exists in database (this is normal for new system)');
            }

            console.log(`✅ Successfully loaded ${this.groups.size} groups`);

        } catch (error) {
            console.error('❌ Error loading groups:', error);
        }
    }

    // Generate next group ID based on modality
    getNextGroupId(modality) {
        const modalityConfig = this.modalities[modality];
        if (!modalityConfig) return 101;

        const [minId, maxId] = modalityConfig.range;

        // Find existing groups in this range
        const existingIds = Array.from(this.groups.keys())
            .filter(id => id >= minId && id <= maxId)
            .sort((a, b) => a - b);

        // If no groups exist, return min ID
        if (existingIds.length === 0) return minId;

        // Find first gap in sequence
        for (let i = 0; i < existingIds.length; i++) {
            const expectedId = minId + i;
            if (existingIds[i] !== expectedId) {
                return expectedId;
            }
        }

        // Return next in sequence
        return existingIds[existingIds.length - 1] + 1;
    }

    // Generate display name
    generateDisplayName(groupData) {
        const modality = groupData.modality;
        const book = `Book${groupData.book}${groupData.unit ? '.U' + groupData.unit : ''}`;
        const daysShort = this.getDaysShort(groupData.days);
        const time = this.formatTime(groupData.startTime);

        let parts = [modality, book, daysShort, time];

        if (modality === 'CB' && groupData.room) {
            parts.push(groupData.room.replace('Sala ', 'S'));
        }

        return parts.join(' - ');
    }

    // Get days short format
    getDaysShort(daysArray) {
        if (!daysArray || daysArray.length === 0) return '';

        return daysArray.map(day => {
            const dayOption = this.daysOptions.find(d => d.value === day);
            return dayOption ? dayOption.short : day.substring(0, 2);
        }).join('-');
    }

    // Format time
    formatTime(time24) {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${hour12}${ampm}`;
    }

    // Save group
    async saveGroup(groupData) {
        try {
            // If no ID, generate one
            if (!groupData.groupId) {
                groupData.groupId = this.getNextGroupId(groupData.modality);
            }

            // Generate display name
            groupData.displayName = this.generateDisplayName(groupData);
            groupData.daysShort = this.getDaysShort(groupData.days);

            // Add metadata
            const now = new Date().toISOString();
            if (!groupData.createdAt) {
                groupData.createdAt = now;
            }
            groupData.updatedAt = now;

            // Ensure arrays exist
            if (!groupData.studentIds) groupData.studentIds = [];

            // Save to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `grupos2/${groupData.groupId}`);
            await db.set(ref, groupData);

            // Update local cache
            this.groups.set(groupData.groupId, groupData);

            console.log('✅ Group saved:', groupData.groupId, groupData.displayName);
            return groupData;
        } catch (error) {
            console.error('❌ Error saving group:', error);
            throw error;
        }
    }

    // Delete group
    async deleteGroup(groupId) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `grupos2/${groupId}`);
            await db.remove(ref);

            this.groups.delete(groupId);
            console.log('✅ Group deleted:', groupId);
        } catch (error) {
            console.error('❌ Error deleting group:', error);
            throw error;
        }
    }

    // Get groups with student count
    getGroupsWithStats() {
        const groups = Array.from(this.groups.values());

        return groups.map(group => {
            const studentCount = group.studentIds ? group.studentIds.length : 0;
            const maxStudents = group.maxStudents || 8;

            let status;
            if (studentCount === 0) {
                status = { color: '#6b7280', text: 'Sin estudiantes' };
            } else if (studentCount < 4) {
                status = { color: '#ef4444', text: 'Necesita más' };
            } else if (studentCount >= maxStudents) {
                status = { color: '#f59e0b', text: 'Lleno' };
            } else {
                status = { color: '#10b981', text: 'Óptimo' };
            }

            return {
                ...group,
                studentCount,
                status
            };
        });
    }

    // Get filtered groups
    filterGroups(filters) {
        let groups = this.getGroupsWithStats();

        if (filters.modality && filters.modality !== 'all') {
            groups = groups.filter(g => g.modality === filters.modality);
        }

        if (filters.book && filters.book !== 'all') {
            groups = groups.filter(g => g.book === parseInt(filters.book));
        }

        if (filters.teacher && filters.teacher !== 'all') {
            groups = groups.filter(g => g.teacherId === filters.teacher);
        }

        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'active') {
                groups = groups.filter(g => g.status === 'active');
            } else if (filters.status === 'needStudents') {
                groups = groups.filter(g => g.studentCount < 4);
            } else if (filters.status === 'full') {
                groups = groups.filter(g => g.studentCount >= (g.maxStudents || 8));
            }
        }

        // Sort by group ID
        groups.sort((a, b) => a.groupId - b.groupId);

        return groups;
    }
}

// Initialize global instance
window.GroupsManager2 = new GroupsManager2();

// Main load function
window.loadGrupos2Tab = async function() {
    console.log('📚 Loading Grupos2 tab');

    // First try to find container inside schoolModuleView (from floating panel)
    let container = document.querySelector('#schoolModuleView #grupos2Container');

    // If not found, try the main tab container
    if (!container) {
        container = document.getElementById('grupos2Container');
    }

    if (!container) {
        console.error('❌ grupos2Container not found!');
        return;
    }

    console.log('📦 Using container:', container.parentElement?.id || 'main page');

    try {
        console.log('📝 Rendering view...');
        const viewHTML = renderGrupos2View();
        console.log('📝 View HTML length:', viewHTML.length);
        container.innerHTML = viewHTML;
        console.log('📝 Container updated');

        // Force reload to get fresh data from Firebase each time tab is opened
        await window.GroupsManager2.init(true);
        await refreshGrupos2Grid();
        console.log('✅ Grupos2 tab loaded successfully');
        console.log('✅ showGrupo2Form available?:', typeof showGrupo2Form);
    } catch (error) {
        console.error('❌ Error loading Grupos2 tab:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                <p>❌ Error al cargar Grupos2: ${error.message}</p>
                <button onclick="loadGrupos2Tab()" class="btn btn-primary" style="margin-top: 1rem;">
                    Reintentar
                </button>
            </div>
        `;
    }
};

// Render main view
function renderGrupos2View() {
    return `
        <div style="padding: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white;">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; font-size: 1.75rem;">🎓 Grupos 2.0 (Nuevo Sistema)</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 0.9rem;">Sistema mejorado de gestión de grupos - Solo Admin</p>
                </div>
                <button onclick="showGrupo2Form()" class="btn" style="background: white; color: #667eea; font-weight: bold; padding: 0.75rem 1.5rem;">
                    ➕ Nuevo Grupo
                </button>
            </div>

            <!-- Filters -->
            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                            📍 Modalidad
                        </label>
                        <select id="filterModality" onchange="applyGrupos2Filters()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                            <option value="all">Todas las modalidades</option>
                            <option value="CB">Ciudad Bilingüe</option>
                            <option value="COATS">Coats (Company)</option>
                            <option value="NAZARETH">Hogar Nazareth</option>
                            <option value="PRIVADO">Clases Privadas</option>
                            <option value="ONLINE">Online</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                            📚 Libro
                        </label>
                        <select id="filterBook" onchange="applyGrupos2Filters()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                            <option value="all">Todos los libros</option>
                            ${Array.from({length: 12}, (_, i) => `<option value="${i + 1}">Book ${i + 1}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                            📊 Estado
                        </label>
                        <select id="filterStatus" onchange="applyGrupos2Filters()"
                                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                            <option value="all">Todos</option>
                            <option value="active">Activos</option>
                            <option value="needStudents">Necesitan estudiantes</option>
                            <option value="full">Llenos</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151;">
                            🔍 Buscar
                        </label>
                        <input type="text" id="filterSearch" onkeyup="applyGrupos2Filters()"
                               placeholder="Buscar grupo..."
                               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                    </div>
                </div>
            </div>

            <!-- Form Container -->
            <div id="grupo2FormContainer"></div>

            <!-- Stats -->
            <div id="grupos2Stats" style="margin-bottom: 1rem;"></div>

            <!-- Groups Grid -->
            <div id="grupos2Grid">
                <div style="text-align: center; padding: 2rem; color: #666;">
                    Cargando grupos...
                </div>
            </div>
        </div>
    `;
}

// Render group form
function renderGrupo2Form(group = null) {
    const manager = window.GroupsManager2;
    const isEdit = !!group;

    // Get teachers list (only active teachers)
    let teacherOptions = '<option value="">Sin asignar</option>';
    if (window.TeacherManager && window.TeacherManager.teachers && window.TeacherManager.teachers.size > 0) {
        const teachers = Array.from(window.TeacherManager.teachers.values())
            .filter(t => t.status !== 'inactive') // Only active teachers
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        teacherOptions += teachers.map(t => `
            <option value="${t.id}" ${group?.teacherId === t.id ? 'selected' : ''}>
                ${t.name}
            </option>
        `).join('');
    }

    return `
        <div style="background: #f3f4f6; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 1rem 0;">${isEdit ? '✏️ Editar' : '➕ Nuevo'} Grupo</h3>

            <form id="grupo2Form" onsubmit="return false;" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <!-- Group ID (read-only if editing) -->
                ${isEdit ? `
                    <div class="form-group">
                        <label>ID del Grupo</label>
                        <input type="text" value="${group.groupId}" disabled
                               style="background: #e5e7eb; cursor: not-allowed;">
                    </div>
                ` : ''}

                <!-- Modality -->
                <div class="form-group">
                    <label>Modalidad*</label>
                    <select id="grupo2Modality" required ${isEdit ? 'disabled' : ''}
                            onchange="updateGrupo2Form()"
                            style="${isEdit ? 'background: #e5e7eb; cursor: not-allowed;' : ''}">
                        <option value="">Seleccionar...</option>
                        ${Object.entries(manager.modalities).map(([key, val]) => `
                            <option value="${key}" ${group?.modality === key ? 'selected' : ''}>
                                ${val.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Book -->
                <div class="form-group">
                    <label>Libro (1-12)*</label>
                    <select id="grupo2Book" required>
                        <option value="">Seleccionar...</option>
                        ${Array.from({length: 12}, (_, i) => `
                            <option value="${i + 1}" ${group?.book === i + 1 ? 'selected' : ''}>
                                Book ${i + 1}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Unit -->
                <div class="form-group">
                    <label>Unidad Actual</label>
                    <input type="number" id="grupo2Unit" min="1" max="12" value="${group?.unit || ''}"
                           placeholder="Ej: 1, 2, 3...">
                </div>

                <!-- Days (multiple checkboxes) -->
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Días de Clase*</label>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.5rem;">
                        ${manager.daysOptions.map(day => `
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" name="grupo2Days" value="${day.value}"
                                       ${group?.days?.includes(day.value) ? 'checked' : ''}
                                       style="width: 18px; height: 18px;">
                                <span>${day.value}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Start Time -->
                <div class="form-group">
                    <label>Hora Inicio*</label>
                    <input type="time" id="grupo2StartTime" value="${group?.startTime || ''}" required>
                </div>

                <!-- End Time -->
                <div class="form-group">
                    <label>Hora Fin*</label>
                    <input type="time" id="grupo2EndTime" value="${group?.endTime || ''}" required>
                </div>

                <!-- Location (auto-filled based on modality) -->
                <div class="form-group">
                    <label>Ubicación</label>
                    <input type="text" id="grupo2Location" value="${group?.location || ''}"
                           placeholder="Automático según modalidad">
                </div>

                <!-- Room (CB only) -->
                <div class="form-group" id="grupo2RoomContainer" style="display: ${!group || group.modality === 'CB' ? 'block' : 'none'};">
                    <label>Sala</label>
                    <select id="grupo2Room">
                        <option value="">Seleccionar sala...</option>
                        ${manager.cbRooms.map(room => `
                            <option value="${room}" ${group?.room === room ? 'selected' : ''}>${room}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Teacher -->
                <div class="form-group">
                    <label>Profesor</label>
                    <select id="grupo2Teacher">
                        ${teacherOptions}
                    </select>
                </div>

                <!-- Max Students -->
                <div class="form-group">
                    <label>Capacidad Máxima</label>
                    <input type="number" id="grupo2MaxStudents" min="1" max="15"
                           value="${group?.maxStudents || 8}">
                </div>

                <!-- Status -->
                <div class="form-group">
                    <label>Estado</label>
                    <select id="grupo2Status">
                        <option value="active" ${!group || group.status === 'active' ? 'selected' : ''}>Activo</option>
                        <option value="inactive" ${group?.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                        <option value="completed" ${group?.status === 'completed' ? 'selected' : ''}>Completado</option>
                    </select>
                </div>

                <!-- Age Category -->
                <div class="form-group">
                    <label>Categoría de Edad*</label>
                    <select id="grupo2AgeCategory" required>
                        <option value="">Seleccionar...</option>
                        ${Object.entries(manager.ageCategories).map(([key, val]) => `
                            <option value="${key}" ${group?.ageCategory === key ? 'selected' : ''}
                                    style="background: ${val.color}; color: ${val.textColor};">
                                ${val.icon} ${val.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Buttons -->
                <div style="grid-column: 1 / -1; display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" onclick="cancelGrupo2Form()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" onclick="saveGrupo2Form(${group?.groupId || null})" class="btn btn-primary">
                        ${isEdit ? 'Actualizar' : 'Crear'} Grupo
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Render group card
function renderGrupo2Card(group) {
    const manager = window.GroupsManager2;
    const modalityConfig = manager.modalities[group.modality];
    const ageConfig = manager.ageCategories[group.ageCategory];
    const teacher = window.TeacherManager?.teachers?.get(group.teacherId);

    // Use age category color for the card, fallback to modality color
    const cardColor = ageConfig?.color || modalityConfig?.color || '#3b82f6';
    const cardTextColor = ageConfig?.textColor || 'white';

    return `
        <div style="background: white; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border-left: 6px solid ${cardColor}; border-top: 3px solid ${cardColor};">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.1rem; color: #111827;">
                        <span style="background: ${cardColor}; color: ${cardTextColor};
                                     padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.9rem; margin-right: 0.5rem;">
                            ${group.groupId}
                        </span>
                        ${group.displayName}
                    </h3>
                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="background: ${group.status.color}; color: white;
                                     padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
                            ${group.studentCount}/${group.maxStudents || 8} - ${group.status.text}
                        </span>
                        ${ageConfig ? `
                        <span style="background: ${cardColor}; color: ${cardTextColor};
                                     padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
                            ${ageConfig.icon} ${ageConfig.name}
                        </span>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Info Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem;
                        padding: 0.75rem; background: #f9fafb; border-radius: 6px; font-size: 0.875rem;">
                <div>
                    <strong style="color: #6b7280;">📚 Libro:</strong>
                    <span>Book ${group.book}${group.unit ? ` - Unit ${group.unit}` : ''}</span>
                </div>
                <div>
                    <strong style="color: #6b7280;">📅 Días:</strong>
                    <span>${group.daysShort || group.days?.join(', ') || '-'}</span>
                </div>
                <div>
                    <strong style="color: #6b7280;">🕐 Horario:</strong>
                    <span>${group.startTime} - ${group.endTime}</span>
                </div>
                <div>
                    <strong style="color: #6b7280;">📍 Ubicación:</strong>
                    <span>${group.location || modalityConfig?.name || '-'}</span>
                </div>
                ${group.room ? `
                <div>
                    <strong style="color: #6b7280;">🚪 Sala:</strong>
                    <span>${group.room}</span>
                </div>
                ` : ''}
                <div>
                    <strong style="color: #6b7280;">👩‍🏫 Profesor:</strong>
                    <span>${teacher?.name || 'Sin asignar'}</span>
                </div>
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button onclick="showGrupo2Form(${group.groupId})" class="btn btn-sm"
                        style="background: #3b82f6; color: white; padding: 0.5rem 1rem;">
                    ✏️ Editar
                </button>
                <button onclick="viewGrupo2Students(${group.groupId})" class="btn btn-sm"
                        style="background: #10b981; color: white; padding: 0.5rem 1rem;">
                    👥 Estudiantes (${group.studentCount})
                </button>
                <button onclick="deleteGrupo2(${group.groupId})" class="btn btn-sm"
                        style="background: #ef4444; color: white; padding: 0.5rem 1rem;">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `;
}

// Show/hide form
window.showGrupo2Form = async function(groupId = null) {
    // Ensure TeacherManager is initialized to populate teacher dropdown
    if (window.TeacherManager && !window.TeacherManager.initialized) {
        try {
            await window.TeacherManager.init();
            console.log('✅ TeacherManager initialized for Grupos 2.0');
        } catch (err) {
            console.warn('⚠️ Could not initialize TeacherManager:', err.message || err);
        }
    }

    const group = groupId ? window.GroupsManager2.groups.get(groupId) : null;
    document.getElementById('grupo2FormContainer').innerHTML = renderGrupo2Form(group);
};

window.cancelGrupo2Form = function() {
    document.getElementById('grupo2FormContainer').innerHTML = '';
};

// Update form based on modality selection
window.updateGrupo2Form = function() {
    const modality = document.getElementById('grupo2Modality').value;
    const manager = window.GroupsManager2;
    const modalityConfig = manager.modalities[modality];

    if (modalityConfig) {
        document.getElementById('grupo2Location').value = modalityConfig.name;

        // Show/hide room selector
        const roomContainer = document.getElementById('grupo2RoomContainer');
        if (roomContainer) {
            roomContainer.style.display = modality === 'CB' ? 'block' : 'none';
        }
    }
};

// Save group
window.saveGrupo2Form = async function(groupId) {
    try {
        // Get selected days
        const daysCheckboxes = document.querySelectorAll('input[name="grupo2Days"]:checked');
        const days = Array.from(daysCheckboxes).map(cb => cb.value);

        if (days.length === 0) {
            window.showNotification('⚠️ Selecciona al menos un día', 'warning');
            return false;
        }

        // Get teacher info
        const teacherId = document.getElementById('grupo2Teacher').value;
        let teacherName = '';
        if (teacherId && window.TeacherManager?.teachers) {
            const teacher = window.TeacherManager.teachers.get(teacherId);
            if (teacher) teacherName = teacher.name;
        }

        // Validate age category
        const ageCategory = document.getElementById('grupo2AgeCategory').value;
        if (!ageCategory) {
            window.showNotification('⚠️ Selecciona una categoría de edad', 'warning');
            return false;
        }

        const groupData = {
            groupId: groupId || null,
            modality: document.getElementById('grupo2Modality').value,
            book: parseInt(document.getElementById('grupo2Book').value),
            unit: parseInt(document.getElementById('grupo2Unit').value) || null,
            days: days,
            startTime: document.getElementById('grupo2StartTime').value,
            endTime: document.getElementById('grupo2EndTime').value,
            location: document.getElementById('grupo2Location').value,
            room: document.getElementById('grupo2Room')?.value || '',
            teacherId: teacherId,
            teacherName: teacherName,
            maxStudents: parseInt(document.getElementById('grupo2MaxStudents').value) || 8,
            status: document.getElementById('grupo2Status').value,
            ageCategory: ageCategory,
            studentIds: groupId ? window.GroupsManager2.groups.get(groupId)?.studentIds || [] : []
        };

        await window.GroupsManager2.saveGroup(groupData);

        window.showNotification(`✅ Grupo ${groupData.groupId} guardado exitosamente`, 'success');
        cancelGrupo2Form();
        await refreshGrupos2Grid();

        return false;
    } catch (error) {
        console.error('❌ Error saving group:', error);
        window.showNotification('❌ Error al guardar grupo: ' + error.message, 'error');
        return false;
    }
};

// Delete group
window.deleteGrupo2 = async function(groupId) {
    const group = window.GroupsManager2.groups.get(groupId);

    if (!confirm(`¿Eliminar grupo ${groupId} - ${group?.displayName}?`)) {
        return;
    }

    try {
        await window.GroupsManager2.deleteGroup(groupId);
        window.showNotification('✅ Grupo eliminado', 'success');
        await refreshGrupos2Grid();
    } catch (error) {
        console.error('❌ Error deleting group:', error);
        window.showNotification('❌ Error al eliminar grupo', 'error');
    }
};

// View students modal
window.viewGrupo2Students = async function(groupId) {
    const group = window.GroupsManager2.groups.get(groupId);
    if (!group) {
        window.showNotification('❌ Grupo no encontrado', 'error');
        return;
    }

    // Ensure StudentManager is initialized
    if (window.StudentManager && !window.StudentManager.initialized) {
        try {
            await window.StudentManager.init();
        } catch (err) {
            console.warn('⚠️ Could not initialize StudentManager:', err);
        }
    }

    const studentIds = group.studentIds || [];
    const ageConfig = window.GroupsManager2.ageCategories[group.ageCategory];
    const cardColor = ageConfig?.color || '#3b82f6';

    // Get student details from StudentManager
    const assignedStudents = studentIds.map(id => {
        const student = window.StudentManager?.students?.get(id);
        return student ? { id, ...student } : { id, nombre: `ID: ${id} (no encontrado)`, notFound: true };
    });

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'grupo2StudentsModal';
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
        z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 700px; width: 95%; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="background: ${cardColor}; color: ${ageConfig?.textColor || 'white'}; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="margin: 0; font-size: 1.25rem;">👥 Estudiantes del Grupo ${groupId}</h2>
                    <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">${group.displayName}</p>
                </div>
                <button onclick="closeGrupo2StudentsModal()" style="background: rgba(255,255,255,0.2); border: none; color: inherit; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.25rem;">
                    ✕
                </button>
            </div>

            <!-- Content -->
            <div style="padding: 1.25rem; overflow-y: auto; flex: 1;">
                <!-- Stats -->
                <div style="display: flex; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="flex: 1; background: #f3f4f6; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${cardColor};">${assignedStudents.length}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Asignados</div>
                    </div>
                    <div style="flex: 1; background: #f3f4f6; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #6b7280;">${group.maxStudents || 8}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Capacidad</div>
                    </div>
                    <div style="flex: 1; background: #f3f4f6; padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${assignedStudents.length < (group.maxStudents || 8) ? '#10b981' : '#ef4444'};">
                            ${(group.maxStudents || 8) - assignedStudents.length}
                        </div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Disponibles</div>
                    </div>
                </div>

                <!-- Add Student Section -->
                <div style="margin-bottom: 1.25rem; padding: 1rem; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                    <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">➕ Agregar Estudiante</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <select id="addStudentToGroup" style="flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="">Seleccionar estudiante...</option>
                            ${getAvailableStudentsOptions(studentIds)}
                        </select>
                        <button onclick="addStudentToGrupo2(${groupId})" style="background: #10b981; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            ➕ Agregar
                        </button>
                    </div>
                </div>

                <!-- Student List -->
                <div>
                    <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: #374151;">📋 Lista de Estudiantes (${assignedStudents.length})</h3>
                    ${assignedStudents.length === 0 ? `
                        <div style="text-align: center; padding: 2rem; color: #6b7280; background: #f9fafb; border-radius: 8px;">
                            <p style="font-size: 2rem; margin: 0;">📭</p>
                            <p style="margin: 0.5rem 0 0 0;">No hay estudiantes asignados a este grupo</p>
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${assignedStudents.map((student, index) => `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: ${student.notFound ? '#fef2f2' : '#f9fafb'}; border-radius: 8px; border-left: 3px solid ${student.notFound ? '#ef4444' : cardColor};">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="background: ${cardColor}; color: ${ageConfig?.textColor || 'white'}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                                            ${index + 1}
                                        </span>
                                        <div>
                                            <div style="font-weight: 500; color: #111827;">${student.nombre || 'Sin nombre'}</div>
                                            ${!student.notFound ? `
                                                <div style="font-size: 0.8rem; color: #6b7280;">
                                                    ${student.telefono || ''} ${student.correo ? '• ' + student.correo : ''}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <button onclick="removeStudentFromGrupo2(${groupId}, '${student.id}')"
                                            style="background: #fee2e2; color: #dc2626; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                        🗑️ Quitar
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 1rem 1.25rem; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
                <button onclick="closeGrupo2StudentsModal()" style="background: #6b7280; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

// Get available students (not in any group or in this group)
function getAvailableStudentsOptions(currentGroupStudentIds) {
    if (!window.StudentManager?.students) return '';

    // Get all active students
    const allStudents = Array.from(window.StudentManager.students.entries())
        .filter(([id, s]) => s.status !== 'inactive')
        .sort((a, b) => (a[1].nombre || '').localeCompare(b[1].nombre || ''));

    // Get students already in other groups
    const studentsInOtherGroups = new Set();
    window.GroupsManager2.groups.forEach((group, groupId) => {
        (group.studentIds || []).forEach(sid => {
            if (!currentGroupStudentIds.includes(sid)) {
                studentsInOtherGroups.add(sid);
            }
        });
    });

    return allStudents
        .filter(([id, s]) => !currentGroupStudentIds.includes(id))
        .map(([id, student]) => {
            const inOtherGroup = studentsInOtherGroups.has(id);
            return `<option value="${id}" ${inOtherGroup ? 'style="color: #9ca3af;"' : ''}>
                ${student.nombre || 'Sin nombre'}${inOtherGroup ? ' (en otro grupo)' : ''}
            </option>`;
        }).join('');
}

// Close modal
window.closeGrupo2StudentsModal = function() {
    const modal = document.getElementById('grupo2StudentsModal');
    if (modal) modal.remove();
};

// Add student to group
window.addStudentToGrupo2 = async function(groupId) {
    const select = document.getElementById('addStudentToGroup');
    const studentId = select.value;

    if (!studentId) {
        window.showNotification('⚠️ Selecciona un estudiante', 'warning');
        return;
    }

    try {
        const group = window.GroupsManager2.groups.get(groupId);
        if (!group) throw new Error('Grupo no encontrado');

        // Check capacity
        const currentCount = (group.studentIds || []).length;
        if (currentCount >= (group.maxStudents || 8)) {
            window.showNotification('⚠️ El grupo está lleno', 'warning');
            return;
        }

        // Add student
        const studentIds = [...(group.studentIds || []), studentId];

        // Save to Firebase
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `grupos2/${groupId}/studentIds`);
        await db.set(ref, studentIds);

        // Update local cache
        group.studentIds = studentIds;

        window.showNotification('✅ Estudiante agregado al grupo', 'success');

        // Refresh modal
        closeGrupo2StudentsModal();
        viewGrupo2Students(groupId);

        // Refresh grid to update count
        await refreshGrupos2Grid();
    } catch (error) {
        console.error('❌ Error adding student to group:', error);
        window.showNotification('❌ Error al agregar estudiante', 'error');
    }
};

// Remove student from group
window.removeStudentFromGrupo2 = async function(groupId, studentId) {
    if (!confirm('¿Quitar este estudiante del grupo?')) return;

    try {
        const group = window.GroupsManager2.groups.get(groupId);
        if (!group) throw new Error('Grupo no encontrado');

        // Remove student
        const studentIds = (group.studentIds || []).filter(id => id !== studentId);

        // Save to Firebase
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `grupos2/${groupId}/studentIds`);
        await db.set(ref, studentIds);

        // Update local cache
        group.studentIds = studentIds;

        window.showNotification('✅ Estudiante removido del grupo', 'success');

        // Refresh modal
        closeGrupo2StudentsModal();
        viewGrupo2Students(groupId);

        // Refresh grid to update count
        await refreshGrupos2Grid();
    } catch (error) {
        console.error('❌ Error removing student from group:', error);
        window.showNotification('❌ Error al remover estudiante', 'error');
    }
};

// Apply filters
window.applyGrupos2Filters = function() {
    const filters = {
        modality: document.getElementById('filterModality').value,
        book: document.getElementById('filterBook').value,
        status: document.getElementById('filterStatus').value,
        search: document.getElementById('filterSearch').value.toLowerCase()
    };

    let groups = window.GroupsManager2.filterGroups(filters);

    // Apply search filter
    if (filters.search) {
        groups = groups.filter(g =>
            g.displayName.toLowerCase().includes(filters.search) ||
            g.groupId.toString().includes(filters.search) ||
            g.teacherName?.toLowerCase().includes(filters.search)
        );
    }

    renderGrupos2Grid(groups);
};

// Refresh grid
window.refreshGrupos2Grid = async function() {
    const groups = window.GroupsManager2.getGroupsWithStats();
    renderGrupos2Grid(groups);
};

// Render grid
function renderGrupos2Grid(groups) {
    const grid = document.getElementById('grupos2Grid');
    const stats = document.getElementById('grupos2Stats');

    if (!grid) return;

    // Render stats
    if (stats) {
        const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);
        const activeGroups = groups.filter(g => g.status === 'active').length;
        const needStudents = groups.filter(g => g.studentCount < 4).length;

        stats.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #3b82f6;">${groups.length}</div>
                    <div style="color: #6b7280; font-size: 0.875rem;">Total Grupos</div>
                </div>
                <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${activeGroups}</div>
                    <div style="color: #6b7280; font-size: 0.875rem;">Grupos Activos</div>
                </div>
                <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${totalStudents}</div>
                    <div style="color: #6b7280; font-size: 0.875rem;">Total Estudiantes</div>
                </div>
                <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">${needStudents}</div>
                    <div style="color: #6b7280; font-size: 0.875rem;">Necesitan Estudiantes</div>
                </div>
            </div>
        `;
    }

    // Render groups
    if (groups.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                <p style="color: #6b7280; margin-bottom: 1rem;">No hay grupos creados</p>
                <button onclick="showGrupo2Form()" class="btn btn-primary">
                    ➕ Crear Primer Grupo
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            ${groups.map(group => renderGrupo2Card(group)).join('')}
        </div>
    `;
}

console.log('✅ Grupos2 module loaded successfully');
