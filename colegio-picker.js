// colegio-picker.js — 🏫 Colegio del estudiante (26 Sep 2026, fundador)
//
// Searchable picker over the national school directory (data/colegios-co.json,
// built by data/build-colegios.mjs from the MEN dataset on datos.gov.co), used in
// the student form (prefix 'stu') and in Clases de prueba (prefix 'trl').
// Optional field: adults without a school leave it empty. A school missing from
// the list can be typed by hand (manual: true) so the Director can review it.
//
// Stored value (students/{id}/colegio, trialRequests/{id}/colegio):
//   { codigo, nombre, municipio, departamento, sector: 'Oficial'|'Privado'|'', manual? }
//
// Also: 🏫 "Por colegio" report in Estudiantes, gated by the `colegios` module
// permission (Admin → permisos). The report is a UI gate only — students/ is
// readable by every signed-in staff member, as it already was.

const COLEGIOS_VERSION = '2025a';
const COLEGIOS_HOME = { municipio: 'Pereira', departamento: 'Risaralda' };
// Words that appear in almost every school name; ignored when searching so
// "colegio san jose" still finds "INSTITUCION EDUCATIVA SAN JOSE".
const COLEGIOS_STOPWORDS = new Set(['colegio', 'col', 'institucion', 'institución', 'inst', 'ie',
    'educativa', 'educativo', 'centro', 'cent', 'educ', 'de', 'del', 'la', 'el', 'los', 'las', 'y']);

let colegiosPromise = null;

function colegioNorm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function colegioEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function loadColegios() {
    if (!colegiosPromise) {
        colegiosPromise = fetch(`data/colegios-co.json?v=${COLEGIOS_VERSION}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(j => j.rows.map(([codigo, nombre, municipio, departamento, s]) => ({
                codigo, nombre, municipio, departamento,
                sector: s === 'O' ? 'Oficial' : 'Privado',
                key: colegioNorm(`${nombre} ${municipio} ${departamento}`),
                home: municipio === COLEGIOS_HOME.municipio ? 0 : departamento === COLEGIOS_HOME.departamento ? 1 : 2
            })))
            .catch(err => { colegiosPromise = null; throw err; });
    }
    return colegiosPromise;
}

function searchColegios(list, query, max = 25) {
    const all = colegioNorm(query).split(' ').filter(Boolean);
    if (!all.length) return [];
    const meaningful = all.filter(t => !COLEGIOS_STOPWORDS.has(t));
    const tokens = meaningful.length ? meaningful : all;
    const first = tokens[0];
    // Tokens match at the start of a word ("san" ≠ "...isan..."); schools whose
    // NAME holds every token as a whole word ("san jose" → COL SAN JOSE) come first.
    return list
        .filter(c => tokens.every(t => (' ' + c.key).includes(' ' + t)))
        .map(c => {
            const words = new Set(colegioNorm(c.nombre).split(' '));
            const whole = tokens.every(t => words.has(t)) ? 0 : 2;
            return { c, rank: c.home * 10 + whole + (c.key.startsWith(first) ? 0 : 1) };
        })
        .sort((a, b) => a.rank - b.rank || a.c.nombre.localeCompare(b.c.nombre, 'es'))
        .slice(0, max)
        .map(x => x.c);
}

function colegioLabel(v) {
    if (!v || !v.nombre) return '';
    const place = [v.municipio, v.departamento].filter(Boolean).join(', ');
    return `${v.nombre}${place ? ` · ${place}` : ''}${v.manual ? ' · (escrito a mano)' : ''}`;
}

const pickerState = {}; // prefix → { results, query }

window.ColegioPicker = {
    label: colegioLabel,

    /** Markup for the picker; `value` is the stored colegio object or null. */
    html(prefix, value = null) {
        const has = !!(value && value.nombre);
        return `
            <div class="colegio-picker" style="position: relative;">
                <input type="hidden" id="${prefix}ColegioJson" value="${colegioEsc(has ? JSON.stringify(value) : '')}">
                <div id="${prefix}ColegioChip" style="display:${has ? 'flex' : 'none'}; align-items:center; gap:0.5rem;
                     background:#eef2ff; border:1px solid #c7d2fe; border-radius:6px; padding:0.45rem 0.6rem; font-size:0.9rem;">
                    <span style="flex:1;">🏫 <span id="${prefix}ColegioChipText">${colegioEsc(colegioLabel(value))}</span></span>
                    <button type="button" onclick="ColegioPicker.clear('${prefix}')" title="Quitar colegio"
                            style="background:none; border:none; cursor:pointer; font-size:1rem; color:#6b7280;">✖</button>
                </div>
                <input type="text" id="${prefix}ColegioInput" autocomplete="off"
                       placeholder="Buscar colegio… (nombre o municipio)"
                       style="display:${has ? 'none' : 'block'}; width:100%;"
                       oninput="ColegioPicker.onInput('${prefix}')"
                       onkeydown="ColegioPicker.onKey(event, '${prefix}')"
                       onblur="setTimeout(() => ColegioPicker.close('${prefix}'), 200)">
                <div id="${prefix}ColegioResults" style="display:none; position:absolute; left:0; right:0; top:100%; z-index:1100;
                     background:white; border:1px solid #d1d5db; border-radius:6px; box-shadow:0 8px 20px rgba(0,0,0,0.15);
                     max-height:280px; overflow-y:auto;"></div>
            </div>`;
    },

    /** The selected colegio object, or null (optional field). */
    read(prefix) {
        const raw = document.getElementById(`${prefix}ColegioJson`)?.value;
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
    },

    async onInput(prefix) {
        const input = document.getElementById(`${prefix}ColegioInput`);
        const box = document.getElementById(`${prefix}ColegioResults`);
        const query = input.value;
        pickerState[prefix] = { results: [], query };
        if (colegioNorm(query).length < 2) { box.style.display = 'none'; return; }
        box.style.display = 'block';
        let list;
        try {
            list = await loadColegios();
        } catch (err) {
            box.innerHTML = `<div style="padding:0.6rem; color:#b91c1c; font-size:0.85rem;">No se pudo cargar la lista de colegios (${colegioEsc(err.message)}). Puedes escribirlo a mano:</div>` + this.manualRow(prefix, query);
            return;
        }
        if (input.value !== query) return; // a newer keystroke is already searching
        const results = searchColegios(list, query);
        pickerState[prefix] = { results, query };
        box.innerHTML = results.map((c, i) => `
            <div onmousedown="event.preventDefault(); ColegioPicker.pick('${prefix}', ${i})"
                 style="padding:0.5rem 0.7rem; cursor:pointer; border-bottom:1px solid #f3f4f6;"
                 onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">
                <div style="font-weight:600; font-size:0.88rem;">${colegioEsc(c.nombre)}</div>
                <div style="color:#6b7280; font-size:0.78rem;">${colegioEsc(c.municipio)}, ${colegioEsc(c.departamento)} · ${c.sector}</div>
            </div>`).join('')
            + (results.length ? '' : '<div style="padding:0.6rem; color:#6b7280; font-size:0.85rem;">Sin resultados en el directorio oficial.</div>')
            + this.manualRow(prefix, query);
    },

    manualRow(prefix, query) {
        return `
            <div onmousedown="event.preventDefault(); ColegioPicker.pickManual('${prefix}')"
                 style="padding:0.5rem 0.7rem; cursor:pointer; color:#1d4ed8; font-size:0.85rem; background:#f8fafc;">
                ➕ No está en la lista: usar «${colegioEsc(query.trim())}»
            </div>`;
    },

    onKey(event, prefix) {
        if (event.key !== 'Enter') return;
        // Enter must not submit the whole form from the search box
        event.preventDefault();
        if (pickerState[prefix]?.results?.length) this.pick(prefix, 0);
    },

    pick(prefix, index) {
        const c = pickerState[prefix]?.results?.[index];
        if (!c) return;
        this.set(prefix, { codigo: c.codigo, nombre: c.nombre, municipio: c.municipio,
            departamento: c.departamento, sector: c.sector });
    },

    pickManual(prefix) {
        const nombre = (pickerState[prefix]?.query || '').trim().replace(/\s+/g, ' ');
        if (!nombre) return;
        this.set(prefix, { codigo: '', nombre, municipio: '', departamento: '', sector: '', manual: true });
    },

    set(prefix, value) {
        document.getElementById(`${prefix}ColegioJson`).value = value ? JSON.stringify(value) : '';
        document.getElementById(`${prefix}ColegioChipText`).textContent = colegioLabel(value);
        document.getElementById(`${prefix}ColegioChip`).style.display = value ? 'flex' : 'none';
        const input = document.getElementById(`${prefix}ColegioInput`);
        input.style.display = value ? 'none' : 'block';
        input.value = '';
        this.close(prefix);
        if (!value) input.focus();
    },

    clear(prefix) { this.set(prefix, null); },

    close(prefix) {
        const box = document.getElementById(`${prefix}ColegioResults`);
        if (box) box.style.display = 'none';
    }
};

// ── 🏫 Report: students per colegio (permission `colegios`) ─────────────────

window.canSeeColegiosReport = function() {
    return !!window.PermissionEnforcer?.hasPermission?.('colegios');
};

window.showColegiosReport = function() {
    if (!window.canSeeColegiosReport()) {
        window.showNotification?.('🚫 No tienes permiso para ver el reporte por colegio (pídelo al Director).', 'error');
        return;
    }
    const includeInactive = document.getElementById('colegiosIncludeInactive')?.checked || false;
    const students = [...(window.StudentManager?.students?.values() || [])]
        .filter(s => includeInactive || (s.status || 'active') === 'active');

    const groups = new Map();
    let sinColegio = 0;
    for (const s of students) {
        const c = s.colegio;
        if (!c || !c.nombre) { sinColegio++; continue; }
        const key = c.codigo || `manual:${colegioNorm(c.nombre)}`;
        if (!groups.has(key)) groups.set(key, { c, students: [] });
        groups.get(key).students.push(s);
    }
    const rows = [...groups.values()].sort((a, b) =>
        b.students.length - a.students.length || a.c.nombre.localeCompare(b.c.nombre, 'es'));

    const byDepto = new Map();
    for (const g of rows) {
        const d = g.c.departamento || '(sin departamento)';
        byDepto.set(d, (byDepto.get(d) || 0) + g.students.length);
    }

    document.getElementById('colegiosReportModal')?.remove();
    const container = document.getElementById('studentsContainer') || document.body;
    container.insertAdjacentHTML('beforeend', `
        <div id="colegiosReportModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 1.5rem 2rem; border-radius: 8px; max-width: 900px; width: 92%; max-height: 90vh; overflow-y: auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                    <h3 style="margin:0;">🏫 Estudiantes por colegio</h3>
                    <button onclick="document.getElementById('colegiosReportModal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">✖</button>
                </div>
                <label style="display:block; margin:0.75rem 0; font-size:0.9rem; color:#374151;">
                    <input type="checkbox" id="colegiosIncludeInactive" ${includeInactive ? 'checked' : ''} onchange="showColegiosReport()">
                    Incluir inactivos
                </label>
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
                    <span style="background:#eef2ff; padding:0.3rem 0.6rem; border-radius:999px; font-size:0.85rem;"><b>${rows.length}</b> colegios</span>
                    <span style="background:#ecfdf5; padding:0.3rem 0.6rem; border-radius:999px; font-size:0.85rem;"><b>${students.length - sinColegio}</b> con colegio</span>
                    <span style="background:#f3f4f6; padding:0.3rem 0.6rem; border-radius:999px; font-size:0.85rem;"><b>${sinColegio}</b> sin colegio</span>
                    ${[...byDepto.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) =>
                        `<span style="background:#fff7ed; padding:0.3rem 0.6rem; border-radius:999px; font-size:0.85rem;">${colegioEsc(d)}: <b>${n}</b></span>`).join('')}
                </div>
                ${rows.length ? `
                <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
                    <thead><tr style="background:#f9fafb; text-align:left;">
                        <th style="padding:0.5rem;">Colegio</th><th style="padding:0.5rem;">Municipio</th>
                        <th style="padding:0.5rem;">Sector</th><th style="padding:0.5rem; text-align:right;">Estudiantes</th>
                    </tr></thead>
                    <tbody>${rows.map(g => `
                        <tr style="border-top:1px solid #f3f4f6;">
                            <td style="padding:0.5rem;">
                                <details><summary style="cursor:pointer;">${colegioEsc(g.c.nombre)}${g.c.manual ? ' <small style="color:#b45309;">(a mano)</small>' : ''}</summary>
                                    <div style="color:#4b5563; padding:0.3rem 0 0.3rem 1rem;">${g.students.map(s => colegioEsc(s.nombre)).sort((a, b) => a.localeCompare(b, 'es')).join('<br>')}</div>
                                </details>
                            </td>
                            <td style="padding:0.5rem;">${colegioEsc([g.c.municipio, g.c.departamento].filter(Boolean).join(', '))}</td>
                            <td style="padding:0.5rem;">${colegioEsc(g.c.sector || '')}</td>
                            <td style="padding:0.5rem; text-align:right; font-weight:600;">${g.students.length}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : '<p style="color:#6b7280;">Todavía ningún estudiante tiene colegio registrado.</p>'}
            </div>
        </div>`);
};
