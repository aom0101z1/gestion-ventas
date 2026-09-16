// trials.js — 🧪 Clases de prueba (15 Sep 2026)
//
// The hand-off between VENTAS and the school. A salesperson (role `ventas`)
// records the people who want a test class with the same details as the
// student registration form MINUS the enrollment fields (grupo, fecha de
// inicio, tipo de curso, valor, día de pago, segundo curso). Reception then
// (1) registers the person for the test class — this creates the real student
// record with modalidad "Prueba" and no value inside a 🧪 Test Class group —
// and, once the salesperson marks "decidió matricularse", (2) completes the
// enrollment in the normal student form (the empty fields stay unlocked for
// staff on a Prueba record, see students.js isTrialRecord).
//
// Data: trialRequests/{TRL-<ms>} — the sales role may write here and in
// contacts only; the database rules block it from students/payments/etc.
console.log('🧪 Loading Trials module...');

const TRIAL_STATUS = {
    pendiente:   { label: '⏳ Pendiente',              color: '#f59e0b', bg: '#fef3c7' },
    programada:  { label: '📅 Clase de prueba lista',  color: '#2563eb', bg: '#dbeafe' },
    si:          { label: '✅ Decidió matricularse',    color: '#059669', bg: '#d1fae5' },
    no:          { label: '❌ No continúa',             color: '#6b7280', bg: '#f3f4f6' },
    matriculado: { label: '🎓 Matriculado',            color: '#7c3aed', bg: '#ede9fe' }
};

class TrialsManager {
    constructor() {
        this.requests = new Map();
        this.loaded = false;
    }

    get db() { return window.firebaseModules.database; }
    get root() { return window.FirebaseData.database; }
    now() { return (typeof window.getLocalDateTime === 'function' && window.getLocalDateTime()) || new Date().toISOString(); }
    me() { return window.FirebaseData?.currentUser?.email || 'staff'; }

    async load() {
        const snap = await this.db.get(this.db.ref(this.root, 'trialRequests'));
        this.requests.clear();
        const data = snap.val() || {};
        for (const [id, r] of Object.entries(data)) this.requests.set(id, { ...r, id });
        this.loaded = true;
        return this.requests;
    }

    async save(data) {
        const isNew = !data.id;
        const id = data.id || `TRL-${Date.now()}`;
        const existing = this.requests.get(id) || {};
        const rec = {
            ...existing,
            ...data,
            id,
            status: data.status || existing.status || 'pendiente',
            createdAt: existing.createdAt || this.now(),
            createdBy: existing.createdBy || this.me(),
            createdByName: existing.createdByName || window.currentUser?.name || window.userProfile?.name || this.me(),
            updatedAt: this.now(),
            updatedBy: this.me()
        };
        await this.db.set(this.db.ref(this.root, `trialRequests/${id}`), rec);
        this.requests.set(id, rec);
        if (typeof window.logAudit === 'function') {
            window.logAudit('Clase de prueba', 'trialRequest', id, `${isNew ? 'Registrada' : 'Editada'}: ${rec.nombre}`).catch(() => {});
        }
        return rec;
    }

    async update(id, updates, auditText) {
        const patch = { ...updates, updatedAt: this.now(), updatedBy: this.me() };
        await this.db.update(this.db.ref(this.root, `trialRequests/${id}`), patch);
        const cur = this.requests.get(id) || { id };
        this.requests.set(id, { ...cur, ...patch });
        if (auditText && typeof window.logAudit === 'function') {
            window.logAudit('Clase de prueba', 'trialRequest', id, auditText).catch(() => {});
        }
    }
}

window.TrialsManager = new TrialsManager();

// ── helpers ────────────────────────────────────────────────────────────────

function trialsIsSales() {
    return window.userRole === 'ventas';
}

// Staff who can create the Prueba student and complete the enrollment
function trialsIsStaff() {
    return !trialsIsSales();
}

function trialsEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Effective status: once the linked student stops being a trial record the
// person is enrolled, whatever the card says.
function trialsEffectiveStatus(req) {
    if (req.status === 'matriculado') return 'matriculado';
    if (req.studentId && window.StudentManager?.students?.size) {
        const s = window.StudentManager.students.get(req.studentId);
        if (s && typeof window.isTrialRecord === 'function' && !window.isTrialRecord(s)) return 'matriculado';
    }
    return req.status || 'pendiente';
}

function trialsTestGroupOptions(selected) {
    const groups = window.GroupsManager2?.groups ? Array.from(window.GroupsManager2.groups.values()) : [];
    const test = groups
        .filter(g => Number(g.groupId) >= 990 && Number(g.groupId) <= 999 && g.status !== 'inactive')
        .sort((a, b) => a.groupId - b.groupId);
    if (!test.length) return '<option value="">— No hay grupos 🧪 Test Class (créalos en Grupos 2.0, ids 990-999) —</option>';
    return '<option value="">Seleccionar grupo de prueba</option>' + test.map(g =>
        `<option value="${g.groupId}" ${String(selected) === String(g.groupId) ? 'selected' : ''}>${g.groupId} - ${trialsEsc(g.displayName || `Grupo ${g.groupId}`)} (${(g.studentIds || []).length}/${g.maxStudents || 8})</option>`
    ).join('');
}

// The module can be open in TWO places: the 🧪 tab (#trials > #trialsContainer) and
// the 🏫 Módulos Escolares overlay (school-buttons.js openModule creates its own
// #trialsContainer inside #schoolModuleView). Prefer the visible one.
function trialsContainerEl() {
    const all = Array.from(document.querySelectorAll('#trialsContainer'));
    return all.reverse().find(el => el.offsetParent !== null) || all[0] || null;
}

// ── tab ────────────────────────────────────────────────────────────────────

window.loadTrialsTab = async function() {
    const container = trialsContainerEl();
    if (!container) return;
    try {
        await window.TrialsManager.load();
        // Student cache lets the list show 🎓 Matriculado automatically
        if (window.StudentManager && (!window.StudentManager.students || window.StudentManager.students.size === 0)) {
            try { await window.StudentManager.loadStudents(); } catch (_) { /* read-only failure is fine */ }
        }
        renderTrialsTab();
    } catch (error) {
        console.error('❌ Error loading trials:', error);
        container.innerHTML = `<div style="padding:2rem;color:#b91c1c;">❌ No se pudieron cargar las clases de prueba: ${trialsEsc(error.message)}</div>`;
    }
};

window.trialsFilter = { status: '', q: '' };

function renderTrialsTab() {
    const container = trialsContainerEl();
    if (!container) return;
    const all = Array.from(window.TrialsManager.requests.values())
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const q = (window.trialsFilter.q || '').toLowerCase().trim();
    const rows = all.filter(r => {
        const st = trialsEffectiveStatus(r);
        if (window.trialsFilter.status && st !== window.trialsFilter.status) return false;
        if (q && !`${r.nombre} ${r.telefono} ${r.correo} ${r.numDoc} ${r.acudiente}`.toLowerCase().includes(q)) return false;
        return true;
    });
    const counts = {};
    all.forEach(r => { const st = trialsEffectiveStatus(r); counts[st] = (counts[st] || 0) + 1; });

    const sales = trialsIsSales();
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
            <div>
                <h2 style="margin:0;">🧪 Clases de prueba</h2>
                <small style="color:#6b7280;">
                    ${sales
                        ? 'Registra aquí a las personas interesadas en una clase de prueba. Recepción las inscribe en el grupo 🧪 Test Class y, si deciden matricularse, completa la matrícula.'
                        : 'Personas enviadas por ventas. <b>Registrar en Test Class</b> crea el estudiante (modalidad Prueba, sin valor); cuando ventas marca "decidió matricularse", <b>Matricular</b> abre la ficha para completar grupo, fecha, tipo de curso, valor y día de pago.'}
                </small>
            </div>
            <button onclick="showTrialForm()" class="btn btn-primary">➕ Nueva persona</button>
        </div>

        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem; align-items:center;">
            ${['', 'pendiente', 'programada', 'si', 'no', 'matriculado'].map(st => `
                <button onclick="trialsSetFilter('${st}')"
                        style="padding:0.4rem 0.8rem; border-radius:999px; border:1px solid ${st && window.trialsFilter.status === st ? TRIAL_STATUS[st].color : '#d1d5db'};
                               background:${st ? (window.trialsFilter.status === st ? TRIAL_STATUS[st].bg : 'white') : (window.trialsFilter.status === '' ? '#e5e7eb' : 'white')}; cursor:pointer; font-size:0.85rem;">
                    ${st ? TRIAL_STATUS[st].label : '📋 Todas'} <b>${st ? (counts[st] || 0) : all.length}</b>
                </button>`).join('')}
            <input id="trialsSearch" type="text" placeholder="🔍 Buscar nombre, teléfono, documento…" value="${trialsEsc(window.trialsFilter.q)}"
                   oninput="trialsSetSearch(this.value)" style="margin-left:auto; padding:0.45rem 0.75rem; border:1px solid #d1d5db; border-radius:6px; min-width:260px;">
        </div>

        ${rows.length === 0 ? `
            <div style="text-align:center; color:#6b7280; padding:3rem; background:#f9fafb; border-radius:8px;">
                ${all.length === 0 ? 'Aún no hay personas registradas para clase de prueba.' : 'Ninguna persona coincide con el filtro.'}
            </div>` : `
            <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f3f4f6; text-align:left;">
                        <th style="padding:0.6rem; min-width:260px;">Nombre</th>
                        <th style="padding:0.6rem;">Teléfono</th>
                        <th style="padding:0.6rem; white-space:nowrap;">Edad</th>
                        ${sales ? '' : '<th style="padding:0.6rem;">Vendedor</th>'}
                        <th style="padding:0.6rem;">Estado</th>
                        <th style="padding:0.6rem;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => renderTrialRow(r)).join('')}
                </tbody>
            </table>
            </div>`}
    `;
}

function renderTrialRow(r) {
    const st = trialsEffectiveStatus(r);
    const S = TRIAL_STATUS[st] || TRIAL_STATUS.pendiente;
    const sales = trialsIsSales();
    const staff = trialsIsStaff();
    const btn = (label, fn, color) => `<button onclick="${fn}" title="${label}" style="padding:0.3rem 0.55rem; margin:0.1rem; border:none; border-radius:5px; cursor:pointer; background:${color}; color:white; font-size:0.8rem;">${label}</button>`;

    const actions = [];
    actions.push(btn('✏️ Editar', `showTrialForm('${r.id}')`, '#4b5563'));
    if (staff && !r.studentId && st !== 'no') {
        actions.push(btn('🧪 Registrar en Test Class', `showTrialRegisterModal('${r.id}')`, '#2563eb'));
    }
    if (st === 'pendiente' || st === 'programada') {
        actions.push(btn('✅ Sí se matricula', `trialsSetDecision('${r.id}', 'si')`, '#059669'));
        actions.push(btn('❌ No continúa', `trialsSetDecision('${r.id}', 'no')`, '#6b7280'));
    }
    if (staff && st === 'si' && r.studentId) {
        actions.push(btn('🎓 Matricular', `trialsOpenEnrollment('${r.id}')`, '#7c3aed'));
    }
    if (staff && st === 'si' && !r.studentId) {
        actions.push(btn('🧪 Primero regístralo en Test Class', `showTrialRegisterModal('${r.id}')`, '#2563eb'));
    }
    if (st === 'no' && !sales) {
        actions.push(btn('↩️ Reabrir', `trialsSetDecision('${r.id}', 'pendiente')`, '#9ca3af'));
    }

    // Test-class group + date live under the status once reception registered the person
    const trialInfo = r.trialGroupId
        ? `<div style="color:#6b7280; font-size:0.75rem;">🧪 Grupo ${trialsEsc(r.trialGroupId)} · ${trialsEsc(r.trialDate || '')}</div>`
        : '';

    return `
        <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:0.6rem; min-width:260px;">
                <div style="font-weight:600; white-space:nowrap;">${trialsEsc(r.nombre)}</div>
                ${r.acudiente ? `<div style="color:#6b7280; font-size:0.8rem;">Acudiente: ${trialsEsc(r.acudiente)}</div>` : ''}
                ${r.notas ? `<div style="color:#6b7280; font-size:0.8rem;">📝 ${trialsEsc(r.notas)}</div>` : ''}
            </td>
            <td style="padding:0.6rem;">
                <a href="https://wa.me/57${trialsEsc(String(r.telefono || '').replace(/\D/g, ''))}" target="_blank" style="color:#2563eb;">${trialsEsc(r.telefono || '')}</a>
                ${r.correo ? `<div style="color:#6b7280; font-size:0.8rem;">${trialsEsc(r.correo)}</div>` : ''}
            </td>
            <td style="padding:0.6rem; white-space:nowrap;">${trialsEsc(r.edadCategoria || '')}${r.edad ? ` · ${trialsEsc(r.edad)} años` : ''}</td>
            ${sales ? '' : `<td style="padding:0.6rem; font-size:0.85rem;">${trialsEsc(r.createdByName || r.createdBy || '')}<div style="color:#6b7280; font-size:0.75rem;">${trialsEsc(String(r.createdAt || '').slice(0, 10))}</div></td>`}
            <td style="padding:0.6rem;">
                <span style="display:inline-block; padding:0.25rem 0.6rem; border-radius:999px; background:${S.bg}; color:${S.color}; font-size:0.8rem; white-space:nowrap;">${S.label}</span>
                ${r.decisionAt ? `<div style="color:#6b7280; font-size:0.75rem;">${trialsEsc(String(r.decisionAt).slice(0, 10))}</div>` : ''}
                ${trialInfo}
            </td>
            <td style="padding:0.6rem; white-space:nowrap;">${actions.join('')}</td>
        </tr>`;
}

window.trialsSetFilter = function(status) {
    window.trialsFilter.status = status;
    renderTrialsTab();
};

window.trialsSetSearch = function(value) {
    window.trialsFilter.q = value;
    const focusId = 'trialsSearch';
    renderTrialsTab();
    const el = document.getElementById(focusId);
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
};

// ── form (registration fields minus the enrollment ones) ───────────────────

function renderTrialForm(req = null) {
    const isEdit = !!req;
    const opt = (v, cur, label) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${label || v}</option>`;
    return `
        <div id="trialFormModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
             background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 900px; width: 90%;
                        max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin:0;">${isEdit ? '✏️ Editar' : '➕ Nueva'} persona para clase de prueba</h3>
                    <button onclick="closeTrialForm()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✖</button>
                </div>
                <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:6px; padding:0.6rem 0.9rem; margin-bottom:1rem; font-size:0.85rem; color:#92400e;">
                    🧪 Documento, modalidad (se asume Online), grupo, fecha de inicio, tipo de curso, valor, día de pago y segundo curso <b>no se llenan aquí</b>: recepción los completa al matricular.
                </div>
                <form id="trialForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Nombre Completo Estudiante*</label>
                        <input type="text" id="trlNombre" value="${trialsEsc(req?.nombre || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Teléfono*</label>
                        <input type="text" id="trlTelefono" value="${trialsEsc(req?.telefono || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Correo</label>
                        <input type="email" id="trlCorreo" value="${trialsEsc(req?.correo || '')}">
                    </div>
                    <div class="form-group">
                        <label>¿Adulto o niño/niña?*</label>
                        <select id="trlEdadCategoria" onchange="trialsEdadCategoriaChange()" required>
                            <option value="">Seleccionar</option>
                            ${opt('Adulto', req?.edadCategoria)}
                            ${opt('Niño', req?.edadCategoria)}
                            ${opt('Niña', req?.edadCategoria)}
                        </select>
                    </div>
                    <div class="form-group" id="trlEdadGroup" style="display:${req?.edadCategoria === 'Niño' || req?.edadCategoria === 'Niña' ? 'block' : 'none'};">
                        <label>Edad del niño/niña*</label>
                        <input type="number" id="trlEdad" min="2" max="17" value="${trialsEsc(req?.edad || '')}" placeholder="Años">
                    </div>
                    <div class="form-group">
                        <label>Nombre Completo Acudiente <small style="color:#6b7280;">(para niños)</small></label>
                        <input type="text" id="trlAcudiente" value="${trialsEsc(req?.acudiente || '')}">
                    </div>
                    <div class="form-group">
                        <label>Tipo Pago</label>
                        <select id="trlTipoPago">
                            ${opt('MENSUAL', req?.tipoPago || 'MENSUAL', 'Mensual')}
                            ${opt('SEMESTRAL', req?.tipoPago, 'Semestral')}
                            ${opt('POR_HORAS', req?.tipoPago, 'Por horas')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fuente / cómo nos conoció</label>
                        <input type="text" id="trlFuente" value="${trialsEsc(req?.fuente || '')}" placeholder="Instagram, referido, convenio…">
                    </div>
                    <div class="form-group" style="grid-column: span 2;">
                        <label>Notas para recepción</label>
                        <textarea id="trlNotas" rows="2" placeholder="Horario que prefiere, nivel, observaciones…">${trialsEsc(req?.notas || '')}</textarea>
                    </div>
                    <div style="grid-column: span 2; display:flex; gap:0.75rem; justify-content:flex-end;">
                        <button type="button" onclick="closeTrialForm()" class="btn" style="background:#e5e7eb;">Cancelar</button>
                        <button type="submit" id="trlSubmitBtn" class="btn btn-primary">${isEdit ? '💾 Guardar cambios' : '➕ Registrar para clase de prueba'}</button>
                    </div>
                </form>
            </div>
        </div>`;
}

// Edad: "Adulto" needs no age; "Niño"/"Niña" reveals the age box (16 Sep 2026)
window.trialsEdadCategoriaChange = function() {
    const cat = document.getElementById('trlEdadCategoria').value;
    const group = document.getElementById('trlEdadGroup');
    const input = document.getElementById('trlEdad');
    const isChild = cat === 'Niño' || cat === 'Niña';
    group.style.display = isChild ? 'block' : 'none';
    input.required = isChild;
    if (!isChild) input.value = '';
};

window.showTrialForm = function(id = null) {
    const req = id ? window.TrialsManager.requests.get(id) : null;
    const container = trialsContainerEl();
    const existing = document.getElementById('trialFormModal');
    if (existing) existing.remove();
    container.insertAdjacentHTML('beforeend', renderTrialForm(req));
    document.getElementById('trialForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('trlSubmitBtn');
        if (btn.disabled) return;
        btn.disabled = true;
        try {
            const v = (elId) => (document.getElementById(elId)?.value || '').trim();
            const edadCategoria = v('trlEdadCategoria');
            const isChild = edadCategoria === 'Niño' || edadCategoria === 'Niña';
            if (isChild && !v('trlEdad')) throw new Error('Indica la edad del niño/niña');
            await window.TrialsManager.save({
                id: req?.id,
                nombre: v('trlNombre'),
                edadCategoria,
                edad: isChild ? v('trlEdad') : '',
                telefono: v('trlTelefono'),
                correo: v('trlCorreo').toLowerCase(),
                acudiente: v('trlAcudiente'),
                // Documento, modalidad and the enrollment fields are completed by
                // reception at matriculation; modalidad is assumed Online for now.
                modalidad: req?.modalidad || 'Online',
                tipoPago: v('trlTipoPago'),
                fuente: v('trlFuente'),
                notas: v('trlNotas')
            });
            closeTrialForm();
            renderTrialsTab();
            window.showNotification?.(req ? '✅ Datos actualizados' : '🧪 Persona registrada para clase de prueba', 'success');
        } catch (err) {
            console.error('trial save:', err);
            window.showNotification?.('❌ No se pudo guardar: ' + err.message, 'error');
            btn.disabled = false;
        }
    };
};

window.closeTrialForm = function() {
    const modal = document.getElementById('trialFormModal');
    if (modal) modal.remove();
};

// ── decision (sales) ───────────────────────────────────────────────────────

window.trialsSetDecision = async function(id, decision) {
    const req = window.TrialsManager.requests.get(id);
    if (!req) return;
    const labels = { si: '✅ ¿Confirmas que decidió matricularse?', no: '❌ ¿Marcar como "no continúa"?', pendiente: '↩️ ¿Reabrir esta solicitud?' };
    if (!confirm(`${labels[decision] || '¿Continuar?'}\n\n${req.nombre}`)) return;
    try {
        await window.TrialsManager.update(id, {
            status: decision,
            decisionAt: window.TrialsManager.now(),
            decisionBy: window.TrialsManager.me()
        }, `Decisión: ${TRIAL_STATUS[decision]?.label || decision} — ${req.nombre}`);
        renderTrialsTab();
        window.showNotification?.(decision === 'si' ? '🎉 Marcado: decidió matricularse. Recepción completa la matrícula.' : 'Estado actualizado', 'success');
    } catch (err) {
        window.showNotification?.('❌ No se pudo actualizar: ' + err.message, 'error');
    }
};

// ── register for the test class (reception) ────────────────────────────────

window.showTrialRegisterModal = async function(id) {
    const req = window.TrialsManager.requests.get(id);
    if (!req) return;
    if (window.GroupsManager2 && (!window.GroupsManager2.groups || window.GroupsManager2.groups.size === 0)) {
        try { await window.GroupsManager2.init(true); } catch (_) {}
    }
    const today = new Date().toISOString().slice(0, 10);
    const container = trialsContainerEl();
    const existing = document.getElementById('trialRegisterModal');
    if (existing) existing.remove();
    container.insertAdjacentHTML('beforeend', `
        <div id="trialRegisterModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 520px; width: 92%;">
                <h3 style="margin-top:0;">🧪 Registrar en Test Class</h3>
                <p style="color:#4b5563; font-size:0.9rem;">
                    Se crea el estudiante <b>${trialsEsc(req.nombre)}</b> con modalidad <b>Prueba</b> y sin valor,
                    dentro del grupo de prueba elegido. Grupo real, tipo de curso, valor y día de pago se completan al matricular.
                </p>
                <div class="form-group">
                    <label>Grupo 🧪 Test Class*</label>
                    <select id="trlRegGroup">${trialsTestGroupOptions(req.trialGroupId)}</select>
                </div>
                <div class="form-group">
                    <label>Fecha de la clase de prueba*</label>
                    <input type="date" id="trlRegDate" value="${trialsEsc(req.trialDate || today)}">
                </div>
                <div style="display:flex; gap:0.75rem; justify-content:flex-end; margin-top:1rem;">
                    <button onclick="document.getElementById('trialRegisterModal').remove()" class="btn" style="background:#e5e7eb;">Cancelar</button>
                    <button id="trlRegBtn" onclick="trialsRegisterStudent('${id}')" class="btn btn-primary">🧪 Crear estudiante de prueba</button>
                </div>
            </div>
        </div>`);
};

window.trialsRegisterStudent = async function(id) {
    const req = window.TrialsManager.requests.get(id);
    if (!req) return;
    const groupId = document.getElementById('trlRegGroup')?.value;
    const date = document.getElementById('trlRegDate')?.value;
    if (!groupId) { window.showNotification?.('Elige un grupo 🧪 Test Class', 'error'); return; }
    if (!date) { window.showNotification?.('Indica la fecha de la clase de prueba', 'error'); return; }
    const btn = document.getElementById('trlRegBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creando…'; }
    try {
        if (!window.StudentManager) throw new Error('Módulo de estudiantes no cargado');
        const student = await window.StudentManager.saveStudent({
            nombre: req.nombre,
            tipoDoc: req.tipoDoc || 'C.C',
            numDoc: req.numDoc || '',
            edad: req.edad || '',
            telefono: req.telefono || '',
            correo: req.correo || '',
            acudiente: req.acudiente || '',
            tipoDocAcudiente: req.tipoDocAcudiente || '',
            docAcudiente: req.docAcudiente || '',
            fechaInicio: date,
            grupo: String(groupId),
            grupo2: '',
            modalidad: 'Prueba',
            modalidadDetalle: '',
            tipoPago: req.tipoPago || 'MENSUAL',
            cursoTipo: '',
            valor: 0,
            valor2: null,
            valorHora: 0,
            diaPago: 1,
            photoUrl: '',
            fuente: req.fuente || '',
            notes: req.notas || '',
            trialRequestId: req.id,
            trialIntendedModalidad: req.modalidad || ''
        });

        // Put the student in the Test Class group (Grupos 2.0 list) and mirror
        // it to the TutorBox class group.
        try {
            const g = window.GroupsManager2?.groups?.get(parseInt(groupId));
            if (g) {
                const ids = g.studentIds || [];
                if (!ids.includes(student.id)) {
                    await window.GroupsManager2.saveGroup({ ...g, studentIds: [...ids, student.id] });
                }
                window.syncGroupMembersToTutorBox?.(groupId);
            }
        } catch (e) {
            console.warn('test-class group update skipped:', e.message);
        }

        await window.TrialsManager.update(id, {
            status: req.status === 'si' ? 'si' : 'programada',
            studentId: student.id,
            trialGroupId: String(groupId),
            trialDate: date,
            registeredBy: window.TrialsManager.me(),
            registeredAt: window.TrialsManager.now()
        }, `Registrado en Test Class ${groupId} (${date}) — ${req.nombre} → ${student.id}`);

        document.getElementById('trialRegisterModal')?.remove();
        renderTrialsTab();
        window.showNotification?.(`🧪 ${req.nombre} registrado como estudiante de prueba en el grupo ${groupId}`, 'success');
    } catch (err) {
        console.error('trial register:', err);
        window.showNotification?.('❌ No se pudo crear el estudiante: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🧪 Crear estudiante de prueba'; }
    }
};

// ── enrollment (reception): open the normal student form ───────────────────

window.trialsOpenEnrollment = async function(id) {
    const req = window.TrialsManager.requests.get(id);
    if (!req || !req.studentId) return;
    if (typeof window.openModule !== 'function') {
        window.showNotification?.('Abre el módulo Estudiantes y busca a ' + req.nombre, 'info');
        return;
    }
    window.openModule('Students');
    // Wait for the Students module to mount and load its cache, then open the form
    const started = Date.now();
    while (Date.now() - started < 8000) {
        await new Promise(r => setTimeout(r, 250));
        if (document.getElementById('studentsContainer') && window.StudentManager?.students?.get(req.studentId)
            && typeof window.showStudentForm === 'function' && !document.querySelector('#studentsContainer .loading-spinner')) {
            await window.showStudentForm(req.studentId);
            window.showNotification?.('🎓 Completa grupo, fecha de inicio, tipo de curso, valor y día de pago; cambia la modalidad de Prueba a la real.', 'info');
            return;
        }
    }
    window.showNotification?.('El módulo Estudiantes tardó en cargar — busca a ' + req.nombre + ' y edítalo.', 'warning');
};

// ── live badge: pending people (reception + admin) ─────────────────────────
//
// Listens to trialRequests in real time. "Pending" = added by sales and not yet
// registered in a Test Class (status pendiente, no studentId). The count shows as
// a red badge on the 🧪 tab button and on the Módulos Escolares button; a toast
// fires when a NEW person arrives during the session.

window.trialsPendingCount = 0;

window.trialsUpdateBadges = function(count) {
    if (typeof count === 'number') window.trialsPendingCount = count;
    const n = window.trialsPendingCount;
    const targets = [document.getElementById('trialsTab'), ...document.querySelectorAll('[data-trials-btn]')];
    targets.forEach(el => {
        if (!el) return;
        let badge = el.querySelector('.trials-badge');
        if (!n) { if (badge) badge.remove(); return; }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'trials-badge';
            badge.style.cssText = 'position:absolute; top:-6px; right:-6px; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:#dc2626; color:white; font-size:0.75rem; font-weight:700; line-height:20px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.3); pointer-events:none;';
            if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
            el.appendChild(badge);
        }
        badge.textContent = n > 99 ? '99+' : String(n);
        badge.title = `${n} persona(s) pendiente(s) de clase de prueba`;
    });
};

window.trialsStartWatcher = function() {
    if (window._trialsWatcherOn || trialsIsSales()) return;
    const db = window.firebaseModules?.database;
    if (!db || !db.onValue || !window.FirebaseData?.database) return;
    window._trialsWatcherOn = true;
    let seenIds = null;
    db.onValue(db.ref(window.FirebaseData.database, 'trialRequests'), (snap) => {
        const data = snap.val() || {};
        // keep the module cache fresh so an open list re-renders with live data
        window.TrialsManager.requests.clear();
        for (const [id, r] of Object.entries(data)) window.TrialsManager.requests.set(id, { ...r, id });
        window.TrialsManager.loaded = true;

        const pending = Object.values(data).filter(r => r && (r.status || 'pendiente') === 'pendiente' && !r.studentId);
        window.trialsUpdateBadges(pending.length);

        const ids = new Set(Object.keys(data));
        if (seenIds) {
            const fresh = Object.entries(data).filter(([id]) => !seenIds.has(id)).map(([, r]) => r);
            if (fresh.length && typeof window.showNotification === 'function') {
                const who = fresh.map(r => r.nombre).filter(Boolean).join(', ');
                window.showNotification(`🧪 Nueva persona para clase de prueba: ${who} — abre 🧪 Clases de prueba`, 'info', 10000);
            }
        }
        seenIds = ids;
        if (trialsContainerEl() && trialsContainerEl().querySelector('table, [id="trialsSearch"]')) renderTrialsTab();
    }, (err) => console.warn('trials watcher:', err.message));
};

// Start once the user is authenticated (the bar and tabs may appear later — the
// badge helper is also called by school-buttons.js after it builds the bar).
(function trialsBoot() {
    const tick = setInterval(() => {
        if (window.FirebaseData?.currentUser && window.userRole) {
            clearInterval(tick);
            window.trialsStartWatcher();
        }
    }, 1000);
})();

console.log('✅ Trials module loaded');
