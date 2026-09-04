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
            // Capture previous book to detect curriculum advance (book ledger hook)
            const previousBook = groupData.groupId ? this.groups.get(groupData.groupId)?.book : null;

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

            // Book ledger: if the group's book advanced, mark it owed/included for its students
            if (window.BookManager && previousBook != null && Number(groupData.book) !== Number(previousBook)) {
                window.BookManager.onGroupBookAdvance(groupData, previousBook);
            }

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
                // Capacity badge (color/text). NOTE: this used to OVERWRITE the
                // real status (active/inactive/completed) — which is why the
                // "Grupos Activos" counter always showed 0. Both are kept now.
                fillStatus: status,
                groupStatus: group.status || 'active',
                status
            };
        });
    }

    /** Display order: manual sortOrder (⠿ drag & drop) first, then group id. */
    static sortForDisplay(groups) {
        return groups.slice().sort((a, b) => {
            const sa = Number.isFinite(a.sortOrder) ? a.sortOrder : 1e9;
            const sb = Number.isFinite(b.sortOrder) ? b.sortOrder : 1e9;
            return sa - sb || a.groupId - b.groupId;
        });
    }

    /** Partial update (no displayName regeneration, no book-ledger hook). */
    async patchGroup(groupId, updates) {
        const db = window.firebaseModules.database;
        const ref = db.ref(window.FirebaseData.database, `grupos2/${groupId}`);
        updates.updatedAt = new Date().toISOString();
        await db.update(ref, updates);
        const cur = this.groups.get(groupId);
        if (cur) this.groups.set(groupId, { ...cur, ...updates });
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
                groups = groups.filter(g => g.groupStatus === 'active');
            } else if (filters.status === 'needStudents') {
                groups = groups.filter(g => g.studentCount < 4);
            } else if (filters.status === 'full') {
                groups = groups.filter(g => g.studentCount >= (g.maxStudents || 8));
            }
        }

        return GroupsManager2.sortForDisplay(groups);
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
        // 📚 book catalog first so the Libro filter lists the current books
        await window.loadTutorBoxBooks();
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
                            ${(window._tbxBooks && window._tbxBooks.length
                                ? window._tbxBooks.map(b => `<option value="${b.book_number}">${b.book_number} · ${b.title}</option>`)
                                : Array.from({length: 12}, (_, i) => `<option value="${i + 1}">Book ${i + 1}</option>`)).join('')}
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

    // Teachers: ONLY 🎥 TutorBox Live accounts (the list from tutorbox.app/admin/live —
    // the account that opens the live class). The old CRM teacher records were
    // removed from this picker (4 Sep). A group whose teacher is not in the list
    // keeps its current value so it isn't lost on save.
    let teacherOptions = '<option value="">Sin asignar</option>';
    const tbx = window._tbxTeachers || [];
    const currentIsTbx = !!group?.teacherId?.startsWith?.('tbx:');
    const currentMatch = tbx.some(t => `tbx:${t.uid}` === group?.teacherId || (group?.teacherEmail && group.teacherEmail === t.email));
    if (group?.teacherId && !currentMatch) {
        teacherOptions += `<option value="${group.teacherId}" selected>${group.teacherName || group.teacherId} (actual)</option>`;
    }
    if (tbx.length) {
        teacherOptions += tbx.map(t => `
            <option value="tbx:${t.uid}" ${group?.teacherId === `tbx:${t.uid}` || (!currentIsTbx && group?.teacherEmail && group.teacherEmail === t.email) ? 'selected' : ''}>
                ${t.name} · ${t.email}
            </option>
        `).join('');
    } else {
        teacherOptions += `<option value="" disabled>⚠️ No se pudo cargar la lista de TutorBox Live</option>`;
    }

    // Books: the CURRENT TutorBox catalog (tutorbox.app books manifest), grouped by
    // family; falls back to Book 1-12 when offline. Value = real book number.
    const books = window._tbxBooks || [];
    const currentBook = group?.book != null ? Number(group.book) : null;
    let bookOptions = '<option value="">Seleccionar...</option>';
    if (books.length) {
        const fams = new Map();
        books.forEach(b => { if (!fams.has(b.familyLabel)) fams.set(b.familyLabel, []); fams.get(b.familyLabel).push(b); });
        for (const [fam, list] of fams) {
            bookOptions += `<optgroup label="${fam}">` + list.map(b => `
                <option value="${b.book_number}" ${currentBook === Number(b.book_number) ? 'selected' : ''}>${b.book_number} · ${b.title}</option>
            `).join('') + `</optgroup>`;
        }
        if (currentBook != null && !books.some(b => Number(b.book_number) === currentBook)) {
            bookOptions += `<option value="${currentBook}" selected>Book ${currentBook} (actual)</option>`;
        }
    } else {
        bookOptions += Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${currentBook === i + 1 ? 'selected' : ''}>Book ${i + 1}</option>`).join('');
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

                <!-- Book (current TutorBox catalog) -->
                <div class="form-group">
                    <label>Libro*</label>
                    <select id="grupo2Book" required>
                        ${bookOptions}
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

    const isInactive = group.groupStatus && group.groupStatus !== 'active';
    const fill = group.fillStatus || group.status;

    return `
        <div id="g2card-${group.groupId}" data-gid="${group.groupId}"
             ondragover="g2DragOver(event, ${group.groupId})" ondragleave="g2DragLeave(event, ${group.groupId})"
             ondrop="g2Drop(event, ${group.groupId})"
             style="background: white; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border-left: 6px solid ${cardColor}; border-top: 3px solid ${cardColor};
                    ${isInactive ? 'opacity: 0.6; filter: grayscale(0.4);' : ''} ${group.hidden ? 'border-style: dashed;' : ''}">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; gap: 0.5rem;">
                <span draggable="true" ondragstart="g2DragStart(event, ${group.groupId})" ondragend="g2DragEnd(event)"
                      title="Arrastra para reordenar"
                      style="cursor: grab; user-select: none; font-size: 1.4rem; line-height: 1; color: #9ca3af; padding: 0.15rem 0.25rem;">⠿</span>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.1rem; color: #111827;">
                        <span style="background: ${cardColor}; color: ${cardTextColor};
                                     padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.9rem; margin-right: 0.5rem;">
                            ${group.groupId}
                        </span>
                        ${group.displayName}
                        ${isInactive ? `<span style="margin-left: 0.5rem; background: #e5e7eb; color: #374151; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">${group.groupStatus === 'completed' ? 'Completado' : 'Inactivo'}</span>` : ''}
                        ${group.hidden ? `<span style="margin-left: 0.35rem; background: #fef3c7; color: #92400e; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700;">🙈 oculto</span>` : ''}
                    </h3>
                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="background: ${fill.color}; color: white;
                                     padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
                            ${group.studentCount}/${group.maxStudents || 8} - ${fill.text}
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
                    <span title="${(window._tbxBooks || []).find(b => Number(b.book_number) === Number(group.book))?.title || ''}">${(() => { const b = (window._tbxBooks || []).find(x => Number(x.book_number) === Number(group.book)); return b ? `${b.book_number} · ${b.title}` : `Book ${group.book}`; })()}${group.unit ? ` - Unit ${group.unit}` : ''}</span>
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
                    <span>${teacher?.name || group.teacherName || 'Sin asignar'}${group.teacherUid ? ' <span title="Profesor de TutorBox Live (clases en vivo)" style="font-size: 0.75rem;">🎥</span>' : ''}</span>
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
                <button onclick="toggleGrupo2Status(${group.groupId})" class="btn btn-sm"
                        title="${isInactive ? 'Marcar como ACTIVO' : 'Marcar como INACTIVO'}"
                        style="background: ${isInactive ? '#6b7280' : '#059669'}; color: white; padding: 0.5rem 1rem;">
                    ${isInactive ? '⏸ Inactivo' : '✅ Activo'}
                </button>
                <button onclick="toggleGrupo2Hidden(${group.groupId})" class="btn btn-sm"
                        title="${group.hidden ? 'Volver a mostrar este grupo en la lista' : 'Esconder este grupo de la lista (no se borra)'}"
                        style="background: ${group.hidden ? '#f59e0b' : '#e5e7eb'}; color: ${group.hidden ? 'white' : '#374151'}; padding: 0.5rem 1rem;">
                    ${group.hidden ? '👁 Mostrar' : '🙈 Ocultar'}
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

    // 🎥 TutorBox Live teachers + 📚 current book catalog (cached; [] when offline)
    await Promise.all([window.loadTutorBoxTeachers(), window.loadTutorBoxBooks()]);

    const group = groupId ? window.GroupsManager2.groups.get(groupId) : null;

    // 🪟 Pop-up (4 Sep): the form opens in a centered modal — same shell as
    // the Estudiantes modal — instead of pushing the page down.
    window.cancelGrupo2Form();
    const modal = document.createElement('div');
    modal.id = 'grupo2FormModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 10001; padding: 1rem;`;
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 1000px; width: 96%; max-height: 90vh;
                    overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
            ${renderGrupo2Form(group)}
        </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) window.cancelGrupo2Form(); });
    document.body.appendChild(modal);
    const onKey = (e) => { if (e.key === 'Escape') { window.cancelGrupo2Form(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
};

window.cancelGrupo2Form = function() {
    const modal = document.getElementById('grupo2FormModal');
    if (modal) modal.remove();
    const inline = document.getElementById('grupo2FormContainer');
    if (inline) inline.innerHTML = '';
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

        // Get teacher info — a TutorBox teacher (value "tbx:<uid>") carries the
        // email that tutorbox.app/admin/groups uses to assign the live class.
        const teacherId = document.getElementById('grupo2Teacher').value;
        let teacherName = '';
        let teacherEmail = '';
        let teacherUid = '';
        if (teacherId && teacherId.startsWith('tbx:')) {
            const t = (window._tbxTeachers || []).find(x => `tbx:${x.uid}` === teacherId);
            if (t) { teacherName = t.name; teacherEmail = t.email || ''; teacherUid = t.uid; }
        } else if (teacherId && window.TeacherManager?.teachers) {
            const teacher = window.TeacherManager.teachers.get(teacherId);
            if (teacher) { teacherName = teacher.name; teacherEmail = (teacher.email || '').trim().toLowerCase(); }
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
            teacherEmail: teacherEmail,
            teacherUid: teacherUid,
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
            <div style="padding: 1rem 1.25rem; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                ${(() => {
                    const withoutAccount = assignedStudents.filter(s => !s.notFound && !s.hasAppAccount && s.telefono);
                    const withAccount = assignedStudents.filter(s => s.hasAppAccount);
                    if (withoutAccount.length > 0) {
                        return `
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <button onclick="batchCreateTutorBoxAccounts(${groupId})" id="batchCreateBtn-${groupId}"
                                        style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
                                    📱 Crear Cuentas TutorBox (${withoutAccount.length} pendientes)
                                </button>
                                ${withAccount.length > 0 ? `<span style="font-size: 0.8rem; color: #059669;">✓ ${withAccount.length} ya tienen cuenta</span>` : ''}
                            </div>
                        `;
                    } else if (withAccount.length > 0) {
                        return `<span style="font-size: 0.85rem; color: #059669; font-weight: 500;">✓ Todos tienen cuenta TutorBox</span>`;
                    }
                    return '<div></div>';
                })()}
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
    const groups = GroupsManager2.sortForDisplay(window.GroupsManager2.getGroupsWithStats());
    renderGrupos2Grid(groups);
};

// 🗓 Tab (Entre semana / Sábados) — remembered per device.
window._grupos2Tab = (function() {
    try { return localStorage.getItem('grupos2Tab') === 'saturday' ? 'saturday' : 'weekday'; } catch (e) { return 'weekday'; }
})();
window.setGrupos2Tab = function(tab) {
    window._grupos2Tab = tab === 'saturday' ? 'saturday' : 'weekday';
    try { localStorage.setItem('grupos2Tab', window._grupos2Tab); } catch (e) { /* ignore */ }
    if (document.getElementById('filterModality')) window.applyGrupos2Filters(); else window.refreshGrupos2Grid();
};

// 🙈 Hidden groups stay out of the list unless the admin toggles "Mostrar ocultos".
window._grupos2ShowHidden = false;
window.toggleGrupos2ShowHidden = function() {
    window._grupos2ShowHidden = !window._grupos2ShowHidden;
    if (typeof window.applyGrupos2Filters === 'function' && document.getElementById('filterModality')) {
        window.applyGrupos2Filters();
    } else {
        window.refreshGrupos2Grid();
    }
};

// Render grid
function renderGrupos2Grid(allGroups) {
    const grid = document.getElementById('grupos2Grid');
    const stats = document.getElementById('grupos2Stats');

    if (!grid) return;

    const hiddenCount = allGroups.filter(g => g.hidden).length;
    const visible = window._grupos2ShowHidden ? allGroups : allGroups.filter(g => !g.hidden);
    // 🗓 Tabs: Sábados vs Entre semana (a group is "Sábado" when its days include Saturday).
    const isSat = g => (g.days || []).some(d => /^s[aá]b/i.test(String(d)) || /^sat/i.test(String(d)));
    const tab = window._grupos2Tab;
    const satCount = visible.filter(isSat).length;
    const weekCount = visible.length - satCount;
    const groups = visible.filter(g => (tab === 'saturday') === isSat(g));

    // Render stats
    if (stats) {
        const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);
        const activeGroups = groups.filter(g => g.groupStatus === 'active').length;
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

    // Render groups (empty state only when there is nothing at all; an empty
    // TAB still shows the tab bar so the admin can switch).
    if (allGroups.length === 0) {
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

    const tabBtn = (key, label, count) => `
        <button onclick="setGrupos2Tab('${key}')"
                style="padding: 0.6rem 1.25rem; border: none; border-radius: 10px 10px 0 0; cursor: pointer; font-weight: 700; font-size: 0.95rem;
                       background: ${tab === key ? '#4f46e5' : '#e5e7eb'}; color: ${tab === key ? 'white' : '#374151'};">
            ${label} <span style="opacity: 0.8; font-weight: 600;">(${count})</span>
        </button>`;

    grid.innerHTML = `
        <div style="display: flex; gap: 0.35rem; border-bottom: 3px solid #4f46e5; margin-bottom: 0.75rem;">
            ${tabBtn('weekday', '📅 Entre semana', weekCount)}
            ${tabBtn('saturday', '🗓 Sábados', satCount)}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: #6b7280;">⠿ Arrastra las tarjetas para ordenarlas (el orden se guarda para todos)</span>
            ${hiddenCount ? `
            <button onclick="toggleGrupos2ShowHidden()" class="btn btn-sm"
                    style="background: ${window._grupos2ShowHidden ? '#f59e0b' : '#e5e7eb'}; color: ${window._grupos2ShowHidden ? 'white' : '#374151'};">
                ${window._grupos2ShowHidden ? '🙈 Esconder ocultos' : `👁 Mostrar ocultos (${hiddenCount})`}
            </button>` : ''}
        </div>
        <div id="grupos2Cards" style="display: grid; gap: 1rem;">
            ${groups.map(group => renderGrupo2Card(group)).join('')}
        </div>
    `;
}

// ============================================
// ⠿ DRAG & DROP ORDER · ✅/⏸ STATUS · 🙈 HIDE  (4 Sep 2026)
// sortOrder / status / hidden are saved on grupos2/{id} (shared by all admins).
// ============================================
let _g2DragId = null;

window.g2DragStart = function(ev, groupId) {
    _g2DragId = groupId;
    ev.dataTransfer.effectAllowed = 'move';
    const card = document.getElementById(`g2card-${groupId}`);
    if (card) card.style.opacity = '0.4';
};
window.g2DragEnd = function() {
    const card = _g2DragId != null ? document.getElementById(`g2card-${_g2DragId}`) : null;
    if (card) card.style.opacity = '';
    document.querySelectorAll('[id^="g2card-"]').forEach(c => { c.style.outline = ''; });
    _g2DragId = null;
};
window.g2DragOver = function(ev, groupId) {
    if (_g2DragId == null || _g2DragId === groupId) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const card = document.getElementById(`g2card-${groupId}`);
    if (card) card.style.outline = '3px solid #6366f1';
};
window.g2DragLeave = function(ev, groupId) {
    const card = document.getElementById(`g2card-${groupId}`);
    if (card) card.style.outline = '';
};
window.g2Drop = async function(ev, targetId) {
    ev.preventDefault();
    const fromId = _g2DragId;
    window.g2DragEnd();
    if (fromId == null || fromId === targetId) return;
    const cards = Array.from(document.querySelectorAll('#grupos2Cards [data-gid]'));
    const ids = cards.map(c => parseInt(c.dataset.gid));
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    // Persist the visible order; groups not on screen keep their sortOrder.
    try {
        const db = window.firebaseModules.database;
        const updates = {};
        ids.forEach((id, i) => { updates[`${id}/sortOrder`] = i; });
        await db.update(db.ref(window.FirebaseData.database, 'grupos2'), updates);
        ids.forEach((id, i) => {
            const g = window.GroupsManager2.groups.get(id);
            if (g) g.sortOrder = i;
        });
    } catch (e) {
        console.error('sortOrder save failed:', e);
        window.showNotification('❌ No se pudo guardar el orden', 'error');
    }
    if (document.getElementById('filterModality')) window.applyGrupos2Filters(); else window.refreshGrupos2Grid();
};

window.toggleGrupo2Status = async function(groupId) {
    const g = window.GroupsManager2.groups.get(groupId);
    if (!g) return;
    const next = (g.status || 'active') === 'active' ? 'inactive' : 'active';
    try {
        await window.GroupsManager2.patchGroup(groupId, { status: next });
        if (typeof window.logAudit === 'function') {
            try { window.logAudit('Grupo editado', 'group', String(groupId), `${g.displayName} → ${next}`, { before: { status: g.status || 'active' }, after: { status: next } }); } catch (e) { /* ignore */ }
        }
        window.showNotification(next === 'active' ? `✅ Grupo ${groupId} activo` : `⏸ Grupo ${groupId} inactivo`, 'success');
    } catch (e) {
        window.showNotification(`❌ No se pudo cambiar el estado: ${e.message}`, 'error');
    }
    if (document.getElementById('filterModality')) window.applyGrupos2Filters(); else window.refreshGrupos2Grid();
};

window.toggleGrupo2Hidden = async function(groupId) {
    const g = window.GroupsManager2.groups.get(groupId);
    if (!g) return;
    const next = !g.hidden;
    try {
        await window.GroupsManager2.patchGroup(groupId, { hidden: next });
        window.showNotification(next ? `🙈 Grupo ${groupId} oculto (botón "Mostrar ocultos" para verlo)` : `👁 Grupo ${groupId} visible`, 'success');
    } catch (e) {
        window.showNotification(`❌ No se pudo ocultar: ${e.message}`, 'error');
    }
    if (document.getElementById('filterModality')) window.applyGrupos2Filters(); else window.refreshGrupos2Grid();
};

// ============================================
// TUTORBOX BATCH ACCOUNT PROVISIONING
// ============================================

const TUTORBOX_CF_BASE = 'https://us-central1-tutorbox-4d7c9.cloudfunctions.net';
const TUTORBOX_KEY = 'tbx-admin-2026-cb-provision-k9x7m';

/**
 * 👩‍🏫 TutorBox Live teachers (same list as tutorbox.app/admin/live) for the
 * group form. Cached 5 min. Returns [] when offline so the form still opens.
 */
/**
 * 📚 Current TutorBox book catalog (tutorbox.app/tools/data/books-manifest.json:
 * English adults 0-10, Teens 42x, Kids 43x, Tiny 47x, French 10x, Spanish 20x…).
 * Cached 30 min; [] when offline → the form falls back to Book 1-12.
 */
window._tbxBooks = [];
let _tbxBooksAt = 0;
window.loadTutorBoxBooks = async function(force = false) {
    if (!force && window._tbxBooks.length && Date.now() - _tbxBooksAt < 30 * 60 * 1000) return window._tbxBooks;
    // cache: 'reload' + a 10-minute version stamp: a copy cached BEFORE the CORS
    // header existed would otherwise be revalidated and reused (CORS failure).
    const stamp = Math.floor(Date.now() / 600000);
    const hosts = ['https://tutorbox.app', 'https://tutorbox-4d7c9.web.app'];
    for (const host of hosts) {
        try {
            const r = await fetch(`${host}/tools/data/books-manifest.json?v=${stamp}`, { cache: 'reload' });
            const data = await r.json();
            if (r.ok && Array.isArray(data) && data.length) {
                window._tbxBooks = data
                    .filter(b => Number.isFinite(Number(b.book_number)))
                    .sort((a, b) => Number(a.book_number) - Number(b.book_number));
                _tbxBooksAt = Date.now();
                console.log(`📚 books-manifest: ${window._tbxBooks.length} libros (${host})`);
                return window._tbxBooks;
            }
        } catch (e) {
            console.warn('books-manifest', host, e.message);
        }
    }
    return window._tbxBooks;
};

window._tbxTeachers = [];
let _tbxTeachersAt = 0;
window.loadTutorBoxTeachers = async function(force = false) {
    if (!force && window._tbxTeachers.length && Date.now() - _tbxTeachersAt < 5 * 60 * 1000) return window._tbxTeachers;
    try {
        const r = await fetch(`${TUTORBOX_CF_BASE}/getTutorBoxTeachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': TUTORBOX_KEY },
            body: '{}'
        });
        const data = await r.json();
        if (r.ok && Array.isArray(data.teachers)) {
            window._tbxTeachers = data.teachers;
            _tbxTeachersAt = Date.now();
        }
    } catch (e) {
        console.warn('getTutorBoxTeachers:', e.message);
    }
    return window._tbxTeachers;
};

/**
 * Batch create TutorBox accounts for all students in a group
 */
window.batchCreateTutorBoxAccounts = async function(groupId) {
    const group = window.GroupsManager2.groups.get(groupId);
    if (!group) return;

    const studentIds = group.studentIds || [];
    const studentsToProvision = [];

    for (const id of studentIds) {
        const student = window.StudentManager?.students?.get(id);
        if (student && !student.hasAppAccount && student.telefono && student.nombre) {
            // Take only the first phone number (students may have "3207180698/3137734605")
            const rawPhone = String(student.telefono).split(/[\/,;]+/)[0].trim();
            const phone = rawPhone.startsWith('+') ? rawPhone : `+57${rawPhone.replace(/\D/g, '')}`;
            studentsToProvision.push({
                fullName: student.nombre,
                phoneNumber: phone,
                grupo: String(groupId),
                enrolledBooks: [1],
                crmStudentId: id
            });
        }
    }

    if (studentsToProvision.length === 0) {
        window.showNotification('No hay estudiantes pendientes para crear cuenta', 'info');
        return;
    }

    if (!confirm(`¿Crear cuentas TutorBox para ${studentsToProvision.length} estudiantes del Grupo ${groupId}?`)) {
        return;
    }

    const btn = document.getElementById(`batchCreateBtn-${groupId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⏳ Creando ${studentsToProvision.length} cuentas...`;
    }

    try {
        const response = await fetch(
            `${TUTORBOX_CF_BASE}/batchProvisionStudents`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': TUTORBOX_KEY
                },
                body: JSON.stringify({
                    students: studentsToProvision,
                    schoolName: 'Ciudad Bilingue'
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en provisión masiva');
        }

        // Update each successfully provisioned student in CRM
        for (const result of (data.results || [])) {
            if (result.success && result.uid) {
                const crmId = studentsToProvision.find(s => s.fullName === result.fullName)?.crmStudentId;
                if (crmId) {
                    const student = window.StudentManager.students.get(crmId);
                    if (student) {
                        await window.StudentManager.saveStudent({
                            ...student,
                            hasAppAccount: true,
                            tutorboxUid: result.uid,
                            tutorboxEmail: result.email,
                            appCreatedAt: new Date().toISOString(),
                            appCreatedBy: window.currentUser?.uid || 'admin'
                        });
                    }
                }
            }
        }

        // Show results modal
        showBatchResultsModal(data, groupId);

    } catch (error) {
        console.error('Error in batch provisioning:', error);
        window.showNotification(`❌ Error: ${error.message}`, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `📱 Crear Cuentas TutorBox (${studentsToProvision.length} pendientes)`;
        }
    }
};

/**
 * Show results modal after batch provisioning
 */
function showBatchResultsModal(data, groupId) {
    const results = data.results || [];
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const modal = document.createElement('div');
    modal.id = 'batchResultsModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10003;padding:1rem;';

    modal.innerHTML = `
        <div style="background:white;border-radius:16px;max-width:600px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
            <div style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:1.5rem;border-radius:16px 16px 0 0;">
                <h2 style="margin:0;color:white;font-size:1.25rem;">
                    📱 Resultado - Grupo ${groupId}
                </h2>
                <p style="margin:0.5rem 0 0;color:rgba(255,255,255,0.9);font-size:0.9rem;">
                    ${succeeded.length} creadas, ${failed.length} fallidas de ${results.length} total
                </p>
            </div>
            <div style="padding:1.5rem;overflow-y:auto;flex:1;">
                ${succeeded.length > 0 ? `
                    <h3 style="margin:0 0 0.75rem;color:#059669;font-size:1rem;">✅ Cuentas Creadas (${succeeded.length})</h3>
                    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.5rem;">
                        ${succeeded.map(r => `
                            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:0.75rem;">
                                <div style="font-weight:600;color:#111827;margin-bottom:0.25rem;">${r.fullName}</div>
                                <div style="font-size:0.85rem;color:#374151;">
                                    📧 <span style="font-family:monospace;">${r.email}</span>
                                </div>
                                <div style="font-size:0.85rem;color:#374151;">
                                    🔑 <span style="font-family:monospace;">${r.temporaryPassword}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${failed.length > 0 ? `
                    <h3 style="margin:0 0 0.75rem;color:#dc2626;font-size:1rem;">❌ Fallidos (${failed.length})</h3>
                    <div style="display:flex;flex-direction:column;gap:0.5rem;">
                        ${failed.map(r => `
                            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:0.75rem;">
                                <div style="font-weight:600;color:#111827;">${r.fullName}</div>
                                <div style="font-size:0.85rem;color:#dc2626;">${r.error}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div style="padding:1rem 1.5rem;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                <button onclick="document.getElementById('batchResultsModal').remove(); closeGrupo2StudentsModal(); viewGrupo2Students(${groupId});"
                        style="background:#7c3aed;color:white;border:none;padding:0.75rem 1.5rem;border-radius:6px;cursor:pointer;font-weight:600;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

console.log('✅ Grupos2 module loaded successfully');
