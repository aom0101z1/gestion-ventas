/* ============================================================================
 * 💰 cobros-engine.js — the collections rule engine (23 Oct 2026, tarde)
 *
 * PURE: no DOM, no Firebase, no globals read. Same file runs in the browser
 * (window.CobrosEngine, used by students-unified.js) and in Node
 * (require('./cobros-engine.js')) for the future automatic sender.
 *
 * Ported faithfully from the TutorBox portal /admin/cobros (CobrosPanel.tsx,
 * computeRows + buildText, 22 Oct 2026). Rule:
 *   día de pago efectivo = DP2 (1-31) si existe, si no DP1 · DP2 = 0 → semestre (nunca se cobra)
 *   mensualidad pagada del mes = Σ (baseAmount ?? amount) de los pagos NO cancelados cuyo
 *     month (español, minúscula) + year coinciden · esperado = valor + valor2
 *   paymentExceptions/{sid}/{year}-{monthIndex0} = mes cubierto · vacaciones (dic 2025, ene 2026)
 *   modalidad 'Prueba' y tipoPago POR_HORAS nunca se cobran
 *   inscrito después de la fecha de este mes → empieza el mes siguiente
 *   diff = hoy − vencimiento:  8+ suspend · 1–7 late · 0 today · −2..−1 soon · −5..−3 remind
 *   mes anterior sin pagar (y este mes al día o aún lejos) → prev
 *   acuerdoPago vigente (hasta ≥ hoy) y el mes sin cubrir → agreement
 *   partial = pagó algo (> 0) pero menos de lo esperado
 * Dropped from the portal (TutorBox-only): users/roles (staff skip), paymentStatus
 * platform notices, the "inClass" text, cobrosLog in the TutorBox DB.
 * ========================================================================== */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.CobrosEngine = api;
    else if (root) root.CobrosEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SCHOOL_WA = '324 297 3737';
    const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                    'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    /** PaymentConfig.holidays in payments.js (key = year-monthIndex0). */
    const DEFAULT_HOLIDAYS = ['2025-11', '2026-0'];

    /** Ordered (most urgent first). `key` is what cobrosLog stores as `kind`. */
    const BUCKETS = [
        { key: 'suspend',   emoji: '🔒', label: 'Cuenta suspendida (8+ días)', short: 'Suspendida' },
        { key: 'late',      emoji: '⛔', label: 'Vencido (1–7 días)',          short: 'Vencido' },
        { key: 'today',     emoji: '🔴', label: 'Hoy es su día de pago',       short: 'Hoy' },
        { key: 'soon',      emoji: '🟠', label: 'Se vence en 1–2 días',        short: '1–2 días' },
        { key: 'remind',    emoji: '🟡', label: 'Recordar (3–5 días antes)',   short: '3–5 días' },
        { key: 'prev',      emoji: '⏪', label: 'Mes anterior pendiente',      short: 'Mes anterior' },
        { key: 'agreement', emoji: '📅', label: 'Acuerdo de pago vigente',     short: 'Acuerdo' }
    ];
    const BUCKET = {};
    BUCKETS.forEach(b => { BUCKET[b.key] = b; });

    /** Why an active student is not in the collections list at all. */
    const SKIP_REASONS = {
        prueba:         'Clase de prueba (modalidad Prueba): no se cobra',
        por_horas:      'Por horas: no tiene mensualidad',
        semestre:       'Semestre pagado (DP2 = 0): no se cobra',
        sin_dia:        'Sin día de pago en la ficha',
        sin_valor:      'Valor de mensualidad en 0',
        inicia_despues: 'Inició después de la fecha de pago de este mes: se cobra desde el mes siguiente'
    };

    // ── helpers ──────────────────────────────────────────────────────────
    const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    const dayNum = (y, m0, d) => Date.UTC(y, m0, d) / 86400000;
    const parseIso = (iso) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
        return m ? dayNum(+m[1], +m[2] - 1, +m[3]) : null;
    };
    const isoOf = (y, m0, d) => `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const lastDayOf = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    /** 'YYYY-MM-DD' → 'viernes 17 de noviembre' (UTC arithmetic: same result in any server TZ). */
    function longDate(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
        if (!m) return String(iso || '');
        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
    }
    const firstNames = (full) => String(full || '').trim().split(/\s+/).slice(0, 2).join(' ');
    /** $280.000 (es-CO grouping, no ICU dependency). */
    function cop(n) {
        const r = Math.round(num(n));
        const s = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${r < 0 ? '-' : ''}$${s}`;
    }

    /** Día de pago efectivo (CRM rule): DP2 1-31 if set; DP2 = 0 → semestre pagado; else DP1. */
    function effectivePayDay(s) {
        const dp2 = s.diaPago2;
        if (dp2 !== null && dp2 !== undefined && dp2 !== '' && Number(dp2) === 0) return { day: null, semestre: true };
        const n2 = parseInt(String(dp2), 10);
        if (Number.isFinite(n2) && n2 >= 1 && n2 <= 31) return { day: n2, semestre: false };
        const n1 = parseInt(String(s.diaPago), 10);
        return { day: Number.isFinite(n1) && n1 >= 1 && n1 <= 31 ? n1 : null, semestre: false };
    }

    /** holidays: array of 'y-mi' keys, array of {year, month:'diciembre'} (PaymentConfig.holidays), a Set, or a fn(y, mi). */
    function holidayFn(holidays) {
        if (typeof holidays === 'function') return holidays;
        const set = new Set();
        const src = holidays === undefined || holidays === null ? DEFAULT_HOLIDAYS
            : (holidays instanceof Set ? [...holidays] : holidays);
        (Array.isArray(src) ? src : []).forEach(h => {
            if (typeof h === 'string') set.add(h);
            else if (h && h.year !== undefined && h.month !== undefined) {
                const mi = typeof h.month === 'number' ? h.month : MONTHS.indexOf(String(h.month).toLowerCase());
                if (mi >= 0) set.add(`${num(h.year)}-${mi}`);
            }
        });
        return (y, mi) => set.has(`${y}-${mi}`);
    }

    /** exceptions: the paymentExceptions tree {sid: {'2026-9': {...}}} or a fn isExempt(sid, mi, y). */
    function exemptFn(exceptions) {
        if (typeof exceptions === 'function') return exceptions;
        const tree = exceptions || {};
        return (sid, mi, y) => !!(tree[sid] && tree[sid][`${y}-${mi}`]);
    }

    const toArray = (x) => {
        if (!x) return [];
        if (Array.isArray(x)) return x;
        if (typeof x.values === 'function' && !(x.constructor === Object)) return Array.from(x.values());
        return Object.values(x);
    };

    /**
     * computeRows({ students, payments, exceptions, todayIso, holidays, isActive, isMonthRequired })
     *   students   array | Map | object of CRM student records
     *   payments   array | Map | object of CRM payments (status 'cancelled' skipped)
     *   exceptions paymentExceptions tree or isExempt(sid, monthIndex0, year)
     *   todayIso   'YYYY-MM-DD' (Colombia)
     *   holidays   optional (default dic 2025 + ene 2026)
     *   isActive   optional fn(s) — default CRM convention: (status || 'active') === 'active'
     *   isMonthRequired optional fn(s, mi, y) — CRM isMonthRequiredByStatus; only used for the
     *              PREVIOUS month (a month the student spent inactive is not owed)
     * → { rows, notes, ok }
     *   rows  [{ s, bucket, dueIso, diff, expected, paidNow, remaining, partial, prevOwed, prevMonthName, agreement, phone }]
     *         sorted by bucket order, then diff desc (most overdue first), then name
     *   notes [{ s, id, name, reason, label, nextDueIso? }]  active students that are never billed / not yet
     *   ok    [{ s, id, name, why, nextDueIso }]             billable and fine for now ("Al día")
     */
    function computeRows(opts) {
        const o = opts || {};
        const todayIso = String(o.todayIso || '').slice(0, 10);
        const [ty, tm, td] = todayIso.split('-').map(Number);
        if (!ty || !tm || !td) throw new Error('computeRows: todayIso must be YYYY-MM-DD');
        const mi = tm - 1;
        const todayN = dayNum(ty, mi, td);
        const lastDay = lastDayOf(ty, mi);
        const prevY = mi === 0 ? ty - 1 : ty, prevMi = mi === 0 ? 11 : mi - 1;
        const prevLast = lastDayOf(prevY, prevMi);
        const nextY = mi === 11 ? ty + 1 : ty, nextMi = mi === 11 ? 0 : mi + 1;
        const nextLast = lastDayOf(nextY, nextMi);
        const monthStartN = dayNum(ty, mi, 1);
        const isHoliday = holidayFn(o.holidays);
        const isExempt = exemptFn(o.exceptions);
        const isActive = typeof o.isActive === 'function' ? o.isActive : (s) => (s.status || 'active') === 'active';
        const isMonthRequired = typeof o.isMonthRequired === 'function' ? o.isMonthRequired : null;

        // tuition paid per student per month (baseAmount when present, like the CRM)
        const paid = {};
        toArray(o.payments).forEach(p => {
            if (!p || !p.studentId || p.status === 'cancelled') return;
            const m0 = MONTHS.indexOf(String(p.month || '').toLowerCase());
            if (m0 < 0) return;
            const key = `${num(p.year)}-${m0}`;
            const base = p.baseAmount !== undefined && p.baseAmount !== null ? num(p.baseAmount) : num(p.amount);
            if (!paid[p.studentId]) paid[p.studentId] = {};
            paid[p.studentId][key] = (paid[p.studentId][key] || 0) + base;
        });

        const rows = [], notes = [], ok = [];
        const note = (s, reason, extra) => notes.push(Object.assign(
            { s, id: s.id, name: s.nombre || '', reason, label: SKIP_REASONS[reason] || reason }, extra || {}));

        toArray(o.students).forEach(s => {
            if (!s || !s.id) return;
            if (!isActive(s)) return;
            const name = s.nombre || '';
            if (s.modalidad === 'Prueba') { note(s, 'prueba'); return; }
            if (s.tipoPago === 'POR_HORAS') { note(s, 'por_horas'); return; }
            const { day, semestre } = effectivePayDay(s);
            if (isHoliday(ty, mi)) {
                ok.push({ s, id: s.id, name, why: 'vacaciones', nextDueIso: day ? isoOf(nextY, nextMi, Math.min(day, nextLast)) : null });
                return;
            }
            if (semestre) { note(s, 'semestre'); return; }
            if (!day) { note(s, 'sin_dia'); return; }
            const expected = num(s.valor) + num(s.valor2);
            if (expected <= 0) { note(s, 'sin_valor'); return; }
            const started = parseIso(s.fechaInicio || '');
            const dueN = dayNum(ty, mi, Math.min(day, lastDay));
            const dueIso = isoOf(ty, mi, Math.min(day, lastDay));
            const nextDueIso = isoOf(nextY, nextMi, Math.min(day, nextLast));
            if (started !== null && started > dueN && started >= monthStartN) { // enrolled after this month's date → next month
                note(s, 'inicia_despues', { nextDueIso });
                return;
            }
            const diff = todayN - dueN;
            const paidNow = (paid[s.id] && paid[s.id][`${ty}-${mi}`]) || 0;
            const exNow = !!isExempt(s.id, mi, ty);
            const covered = exNow || paidNow >= expected;
            // previous month (the CRM status never looks back; the earthquake cases live here)
            const prevDueN = dayNum(prevY, prevMi, Math.min(day, prevLast));
            const prevDueIso = isoOf(prevY, prevMi, Math.min(day, prevLast));
            const prevPaid = (paid[s.id] && paid[s.id][`${prevY}-${prevMi}`]) || 0;
            const prevEx = !!isExempt(s.id, prevMi, prevY) || isHoliday(prevY, prevMi)
                || (isMonthRequired ? isMonthRequired(s, prevMi, prevY) === false : false);
            const prevOwed = !prevEx && prevPaid < expected && (started === null || started <= prevDueN)
                ? { month: MONTHS[prevMi], remaining: expected - prevPaid, partial: prevPaid > 0 } : null;
            const hasta = (s.acuerdoPago && s.acuerdoPago.hasta) || '';
            const hastaN = parseIso(hasta);
            const agreement = hasta && (hastaN === null ? -1 : hastaN) >= todayN
                ? { hasta, nota: (s.acuerdoPago && s.acuerdoPago.nota) || '' } : null;
            const base = {
                s, expected, paidNow, remaining: Math.max(0, expected - paidNow),
                partial: paidNow > 0 && !covered, prevOwed,
                prevMonthName: prevOwed ? prevOwed.month : null, agreement, phone: waDigits(s.telefono)
            };
            if (covered) {
                if (prevOwed) rows.push(Object.assign({}, base, { bucket: 'prev', dueIso: prevDueIso, diff: todayN - prevDueN, partial: false }));
                else ok.push({ s, id: s.id, name, why: exNow ? 'excepcion' : 'pagado', nextDueIso });
                return;
            }
            let bucket = null;
            if (agreement) bucket = 'agreement';
            else if (diff < -5) bucket = prevOwed ? 'prev' : null;
            else if (diff <= -3) bucket = 'remind';
            else if (diff <= -1) bucket = 'soon';
            else if (diff === 0) bucket = 'today';
            else if (diff <= 7) bucket = 'late';
            else bucket = 'suspend';
            if (!bucket) { ok.push({ s, id: s.id, name, why: 'aun_no', nextDueIso: dueIso }); return; }
            rows.push(Object.assign({}, base, {
                bucket,
                dueIso: bucket === 'prev' ? prevDueIso : dueIso,
                diff: bucket === 'prev' ? todayN - prevDueN : diff
            }));
        });

        const order = BUCKETS.map(b => b.key);
        rows.sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket) || b.diff - a.diff
            || String(a.s.nombre || '').localeCompare(String(b.s.nombre || ''), 'es'));
        return { rows, notes, ok };
    }

    /** The texts — the founder's moments, in the school's voice (portal buildText, minus inClass). */
    function buildText(r, sender) {
        const who = firstNames(r.s.nombre || '');
        const from = String(sender || '').trim();
        const intro = from && from.toLowerCase() !== 'ciudad bilingüe'
            ? `Hola ${who}, te escribe ${from} de Ciudad Bilingüe 👋 `
            : `Hola ${who}, te escribe Ciudad Bilingüe 👋 `;
        const sig = ` Cuando lo hagas, envíanos el comprobante por WhatsApp al ${SCHOOL_WA}. ¡Gracias!`;
        const remaining = r.remaining !== undefined ? r.remaining : Math.max(0, num(r.expected) - num(r.paidNow));
        const parcial = r.partial && r.bucket !== 'prev' ? ` (te falta ${cop(remaining)} de la mensualidad)` : '';
        const prev = r.prevOwed && r.bucket !== 'prev'
            ? ` Además, la mensualidad de ${r.prevOwed.month} aparece pendiente${r.prevOwed.partial ? ` (faltan ${cop(r.prevOwed.remaining)})` : ''}; si ya la pagaste, envíanos el comprobante.`
            : '';
        const date = longDate(r.dueIso);
        let body = '';
        switch (r.bucket) {
            case 'remind': body = `Te recordamos que tu mensualidad vence el ${date}${parcial}. Puedes pagar desde ya y seguir disfrutando de tus clases sin interrupciones 😉`; break;
            case 'soon': body = r.diff === -1
                ? `Tu pago se vence mañana ${date}${parcial}. Realiza tu pago para que sigas disfrutando de tus clases 😉`
                : `Tu pago se vence en 2 días (${date})${parcial}. Realiza tu pago para que sigas disfrutando de tus clases 😉`; break;
            case 'today': body = `Hoy es tu día de pago${parcial}. Por favor realiza tu pago para que sigas disfrutando de tus clases 😉`; break;
            case 'late': body = `Tu mensualidad venció el ${date}${parcial}. Recuerda hacer el pago antes de tu próxima clase para que sigas disfrutando de tus clases con normalidad 🙏`; break;
            case 'suspend': body = `Tu cuenta ha sido suspendida por falta de pago (mensualidad del ${date}${parcial}). Para reactivarla, realiza el pago y envíanos el comprobante; al ponerte al día recuperas tu cupo, tus cristales y todo lo que has ganado.`; break;
            case 'agreement': {
                const h = r.agreement && r.agreement.hasta ? longDate(r.agreement.hasta) : date;
                body = `Según el acuerdo con la academia, tienes plazo hasta el ${h} para ponerte al día con tu mensualidad${parcial}. Gracias por cumplirlo y seguir disfrutando de tus clases 😉`; break;
            }
            case 'prev': body = `Según nuestro registro, la mensualidad de ${(r.prevOwed && r.prevOwed.month) || ''} quedó pendiente${r.prevOwed && r.prevOwed.partial ? ` (faltan ${cop(r.prevOwed.remaining)})` : ''}. Si ya la pagaste, envíanos el comprobante; si no, ponte al día para seguir disfrutando de tus clases 🙏`; break;
        }
        return { whatsapp: `${intro}${body}${prev}${sig}`, body };
    }

    /** Colombian phone → wa.me digits. First number when the ficha has several ("300… / 311…"). */
    function waDigits(raw) {
        const first = String(raw || '').split(/[\/,;]+/)[0];
        let d = first.replace(/\D/g, '');
        if (d.startsWith('0057')) d = d.slice(4);
        if (d.length === 10) d = '57' + d;
        return d.length >= 11 ? d : null;
    }

    /** https://wa.me/57XXXXXXXXXX?text=… — null when the ficha has no usable number. */
    function waLink(telefono, text) {
        const d = waDigits(telefono);
        if (!d) return null;
        return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    }

    return {
        BUCKETS, BUCKET, SKIP_REASONS, MONTHS, SCHOOL_WA, DEFAULT_HOLIDAYS,
        computeRows, buildText, waLink, waDigits, effectivePayDay, longDate, cop, firstNames
    };
});
