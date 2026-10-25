// students-unified.js — 🧑‍🎓 Estudiantes unificado (v1, 23 oct 2026)
//
// One screen per student: the full student record ("ficha 360") + the payment
// state + the 12-month grid + every payment, side by side.
//
// THIS MODULE IS A VIEW. It never writes to Firebase by itself: no set/update/
// push/remove, no PaymentManager.recordPayment / recordMultiMonthPayment. Every
// change goes through the existing, validated flows of Estudiantes (students.js)
// and Pagos (payments.js): processPayment (via its own modal), saveStudentForm,
// StudentManager.toggleStudentStatus, saveDiaPago2, cyclePagoOK,
// PaymentExceptionsManager.grant/revoke, openEditPaymentModal,
// confirmDeletePayment, openStudentNotes. Because all three modules read the
// same RTDB nodes (students/, payments/, paymentExceptions/), Estudiantes and
// Pagos show the same data after any movement made here.
//
// Plan / recon map: estudiantes-unificado-PLAN.md (§8).
//
// 💰 Cobranza (23 oct 2026, tarde — PLAN §10): a "Cobranza" filter (buckets from
// cobros-engine.js, the same rule as tutorbox.app/admin/cobros) + a Cobranza card in
// the ficha with the WhatsApp text. The ONLY write of this module lives in
// logSent()/unlogSent(): cobrosLog/{YYYY-MM-DD}/{studentId} (the "✓ ya le envié" mark).
//
// 🖼️ Tarjeta (23 oct 2026, noche — PLAN §11): the Cobranza card's "🖼️ Tarjeta" button opens a
// modal that draws the 1080×1350 WhatsApp image (cobros-card.js, ported from
// tutorbox.app/admin/cobranza) → copy image / download / open WhatsApp / ✅ Ya le envié
// (logSent channel 'card'). No new writes.
//
// 📎 Comprobante (25 oct 2026 — PLAN §12): upload / drop / paste a payment receipt → the TutorBox CF
// readReceipt (Claude vision) reads it → ✅/⚠️/⛔ checks → "✅ Registrar pago con estos datos" saves the image
// in CRM Storage (receipts/{studentId}/…) and PRE-FILLS the existing payment modal; the person confirms
// with its own Registrar button (processPayment stays the only payment writer). After the save,
// saveReceiptRecord() writes paymentReceipts/{autoId} — the module's third allowed write.

(function () {
    'use strict';

    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const OWNER_EMAIL = 'admin@ciudadbilingue.com';
    const LS_LAST = 'suLastStudentId';
    const LS_STATUS = 'suStatusFilter';
    const LS_BUCKET = 'suCobrosBucket';       // stored, but the view always opens on "Todos"
    const LS_HIDESENT = 'suCobrosHideSent';
    const LS_SENDER = 'tbx_cobros_sender';    // same key as tutorbox.app/admin/cobros
    const CHANNEL_ICON = { wa: '💬', copy: '📋', manual: '✅', card: '🖼️' };
    // Modals of the old modules that land in <body> with z-index 1000 and would
    // stay hidden behind #schoolModuleView (z-index 10000) — PLAN R1.
    const LIFT_IDS = ['paymentModal', 'studentNotesModal', 'inactiveModal', 'studentFormModal',
                      'editPaymentModal', 'deletePaymentModal', 'createStudentAccountModal'];
    const LIFT_Z = '10001'; // above the view; the camera modal (10001, appended later) still wins

    const SU = {
        selectedId: null,
        year: new Date().getFullYear(),
        search: '',
        status: 'active',
        statusCache: new Map(),   // studentId -> PaymentManager.getPaymentStatus(s)
        bodyObserver: null,
        viewObserver: null,
        loading: false,
        // 💰 Cobranza
        bucket: '',               // '' = Todos · a CobrosEngine bucket key · 'ok' = Al día
        hideSent: true,
        cobros: null,             // { rows, notes, ok, byId, day } from CobrosEngine.computeRows
        sent: {},                 // cobrosLog/{sentDay} → { studentId: {kind, channel, at, by, name} }
        sentDay: '',
        drafts: new Map(),        // 'studentId|bucket' → edited text
        listIds: [],              // ids rendered in the list (for ➡ Siguiente)
        anchorAfter: null,        // ids that followed the selected student before it left the list
        // 📎 Comprobantes
        receipts: null,           // paymentReceipts/* (null = not readable yet, e.g. rules not published)
        receiptByPayment: new Map() // paymentId → receipt record (for the 📎 icon in the payments table)
    };

    // ───────────────────────── small helpers ─────────────────────────

    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = (n) => new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Number(n) || 0);
    const notify = (msg, type = 'info') => {
        if (typeof window.showNotification === 'function') window.showNotification(msg, type);
        else console.log(msg);
    };
    const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
    const today = () => (typeof window.getTodayInColombia === 'function'
        ? window.getTodayInColombia() : new Date().toISOString().slice(0, 10));
    // 'YYYY-MM-DD…' → 'DD/MM/YYYY' without going through Date (dates are stored without zone)
    const fmtDate = (s) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
        return m ? `${m[3]}/${m[2]}/${m[1]}` : (s ? esc(s) : '—');
    };
    const fmtDateTime = (s) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''));
        return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : fmtDate(s);
    };
    const tuitionOf = (p) => (p.baseAmount !== undefined ? (Number(p.baseAmount) || 0) : (Number(p.amount) || 0));

    // ───────────────────────── roles (UX only — rules enforce) ─────────────────────────

    const userEmail = () => window.FirebaseData?.currentUser?.email || '';
    const isSales = () => window.userRole === 'ventas' || window.PermissionEnforcer?.userRole === 'ventas';
    const isOwner = () => userEmail() === OWNER_EMAIL;                 // edit / cancel payments (as in Pagos)
    const canWrite = () => !isSales();                                  // rules: ventas cannot write students/payments
    const canExceptions = () => !isSales() && !!window.PaymentExceptionsManager?.isExceptionsAdmin?.();
    // the "Abrir en Estudiantes / Pagos" links follow the same module permission as the bar
    const canOpen = (perm) => !isSales() && (!window.PermissionEnforcer?.isReady || window.PermissionEnforcer.hasPermission(perm));
    const canToggle = () => !isSales() && (typeof window.canToggleStudentStatus === 'function'
        ? window.canToggleStudentStatus() : !!window.isStudentMoneyAdmin?.());

    // ───────────────────────── loading (same sequence as the Pagos screen) ─────────────────────────

    async function ensureLoaded() {
        await window.StudentManager.init();
        await window.PaymentManager.init();
        if (window.InvoiceStorage) await window.InvoiceStorage.init();
        if (window.PricingManager && !window.PricingManager.loaded) await window.PricingManager.init();
        if (window.BookManager && !window.BookManager.loaded) await window.BookManager.init();
        if (window.PaymentExceptionsManager && !window.PaymentExceptionsManager.loaded) {
            await window.PaymentExceptionsManager.load();
        }
        // builds _lastPayByStudent / _paidThisMonth from PaymentManager.payments (memory)
        if (typeof window.refreshLastPayments === 'function') await window.refreshLastPayments(true);
    }

    /** Re-read from Firebase (reload=true) or just repaint from the managers' caches. */
    async function refresh(studentId = SU.selectedId, { reload = false } = {}) {
        try {
            if (reload) {
                await window.StudentManager.loadStudents();
                await window.PaymentManager.loadPayments(); // also reloads paymentExceptions
                if (window.PricingManager && !window.PricingManager.loaded) await window.PricingManager.init();
                if (typeof window.refreshLastPayments === 'function') await window.refreshLastPayments(true);
            }
        } catch (e) {
            console.error('Estudiantes unificado — recarga:', e);
            notify('❌ No se pudo recargar: ' + (e.message || e), 'error');
        }
        if (reload || SU.sentDay !== today()) await loadSentLog();
        if (reload || SU.receipts === null) await loadReceipts();
        if (!$('studentsUnifiedContainer')) return;
        SU.statusCache.clear();
        computeCobros();
        if (studentId) SU.selectedId = studentId;
        renderList();
        renderFicha();
    }

    // ───────────────────────── 💰 cobranza (engine + "ya le envié" log) ─────────────────────────

    const engine = () => window.CobrosEngine || null;
    const senderName = () => (lsGet(LS_SENDER) || '').trim() || 'Ciudad Bilingüe';
    const bucketInfo = (key) => (key === 'ok'
        ? { key: 'ok', emoji: '✅', label: 'Al día', short: 'Al día' }
        : (engine()?.BUCKET?.[key] || { key, emoji: '', label: key, short: key }));
    const timeCO = (iso) => {
        try {
            return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' });
        } catch (e) { return ''; }
    };
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    /** "venció hace 3 días" / "vence hoy" / "vence en 2 días" / "septiembre sin pagar" */
    const dueShort = (r) => r.bucket === 'prev' ? `${r.prevMonthName || ''} sin pagar`
        : r.bucket === 'agreement' ? `acuerdo hasta ${ddmm(r.agreement?.hasta)}`
        : r.diff === 0 ? 'vence hoy' : r.diff < 0 ? `vence en ${plural(-r.diff, 'día')}` : `venció hace ${plural(r.diff, 'día')}`;
    const ddmm = (iso) => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[2]}/${m[1]}` : '—'; };

    /** Runs the pure engine over the managers' caches (no reads, no writes). */
    function computeCobros() {
        const E = engine();
        SU.cobros = null;
        if (!E) return;
        try {
            const day = today();
            const res = E.computeRows({
                students: window.StudentManager.students,
                payments: window.PaymentManager.payments,
                exceptions: (sid, mi, y) => !!window.PaymentExceptionsManager?.isExempt?.(sid, mi, y),
                todayIso: day,
                // PaymentConfig is a script-level const of payments.js (not on window — PLAN R3)
                holidays: (typeof PaymentConfig !== 'undefined' && Array.isArray(PaymentConfig.holidays)) ? PaymentConfig.holidays : undefined,
                isMonthRequired: typeof window.isMonthRequiredByStatus === 'function' ? window.isMonthRequiredByStatus : undefined
            });
            const byId = new Map();
            res.notes.forEach(n => byId.set(n.id, { type: 'note', n }));
            res.ok.forEach(o => byId.set(o.id, { type: 'ok', o }));
            res.rows.forEach(r => byId.set(r.s.id, { type: 'row', r }));
            SU.cobros = Object.assign({}, res, { byId, day });
        } catch (e) {
            console.error('Estudiantes unificado — cobranza:', e);
        }
    }

    /** Today's "ya le envié" marks — one READ of cobrosLog/{today}. */
    async function loadSentLog() {
        const day = today();
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, `cobrosLog/${day}`));
            SU.sent = snap.val() || {};
        } catch (e) {
            console.warn('Estudiantes unificado — cobrosLog (¿reglas sin publicar?):', e);
            SU.sent = {};
        }
        SU.sentDay = day;
    }

    function repaintCobros() {
        renderList();
        renderFicha();
    }

    // THE ONLY FIREBASE WRITES OF THIS MODULE: cobrosLog/{YYYY-MM-DD}/{studentId}
    async function logSent(studentId, bucket, channel) {
        if (!canWrite() || !studentId) return false;
        const day = today();
        if (SU.sentDay !== day) { SU.sent = {}; SU.sentDay = day; }
        const s = window.StudentManager.students.get(studentId);
        const cu = window.FirebaseData?.currentUser;
        const rec = { kind: bucket, channel, at: new Date().toISOString(), by: cu?.email || cu?.uid || 'desconocido', name: s?.nombre || '' };
        const before = SU.sent[studentId];
        SU.sent[studentId] = rec;
        repaintCobros();
        try {
            const db = window.firebaseModules.database;
            await db.set(db.ref(window.FirebaseData.database, `cobrosLog/${day}/${studentId}`), rec);
        } catch (e) {
            console.error('cobrosLog set:', e);
            if (before) SU.sent[studentId] = before; else delete SU.sent[studentId];
            repaintCobros();
            notify('❌ Falta publicar las reglas (cobrosLog): la marca «enviado» no se guardó. ' + (e.code || e.message || ''), 'error');
            return false;
        }
        if (typeof window.logAudit === 'function') {
            const b = bucketInfo(bucket);
            try {
                window.logAudit('Cobro enviado', 'student', studentId,
                    `💬 ${b.emoji} ${b.label} · ${channel} · ${s?.nombre || studentId}`, { bucket, channel });
            } catch (e) { console.warn('logAudit:', e); }
        }
        return true;
    }

    async function unlogSent(studentId) {
        if (!canWrite() || !studentId) return false;
        const day = SU.sentDay || today();
        const before = SU.sent[studentId];
        delete SU.sent[studentId];
        repaintCobros();
        try {
            const db = window.firebaseModules.database;
            await db.remove(db.ref(window.FirebaseData.database, `cobrosLog/${day}/${studentId}`));
        } catch (e) {
            console.error('cobrosLog remove:', e);
            if (before) SU.sent[studentId] = before;
            repaintCobros();
            notify('❌ Falta publicar las reglas (cobrosLog): no se pudo deshacer. ' + (e.code || e.message || ''), 'error');
            return false;
        }
        return true;
    }

    /** The text in the card's textarea (edited draft wins over the generated one). */
    function cobroText(r) {
        const key = `${r.s.id}|${r.bucket}`;
        if (SU.drafts.has(key)) return SU.drafts.get(key);
        return engine().buildText(r, senderName()).whatsapp;
    }

    function currentRow() {
        const e = SU.cobros?.byId?.get(SU.selectedId);
        return e && e.type === 'row' ? e.r : null;
    }

    function cobWhatsApp() {
        const r = currentRow();
        if (!r || !canWrite()) return;
        const text = $('suCobText')?.value || cobroText(r);
        const link = engine().waLink(r.s.telefono, text);
        if (!link) { notify('Este estudiante no tiene un teléfono válido para WhatsApp', 'warning'); return; }
        window.open(link, '_blank', 'noopener'); // synchronous in the click → not blocked as a popup
        logSent(r.s.id, r.bucket, 'wa');
    }

    async function cobCopy() {
        const r = currentRow();
        if (!r || !canWrite()) return;
        const text = $('suCobText')?.value || cobroText(r);
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
            const ta = $('suCobText');
            if (ta) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } }
        }
        if (!ok) { notify('No pude copiar; selecciona el texto a mano', 'warning'); return; }
        notify('📋 Mensaje copiado', 'success');
        logSent(r.s.id, r.bucket, 'copy');
    }

    function nextStudentId() {
        const ids = SU.listIds;
        const i = ids.indexOf(SU.selectedId);
        if (i >= 0) return ids[i + 1] || null;
        if (SU.anchorAfter) { const n = SU.anchorAfter.find(id => ids.includes(id)); if (n) return n; }
        return ids[0] || null;
    }

    function goNext() {
        const id = nextStudentId();
        if (!id || id === SU.selectedId) { notify('No hay más estudiantes en esta lista 🎉', 'info'); return; }
        selectStudent(id);
        const sel = window.CSS?.escape ? CSS.escape(id) : id;
        document.querySelector(`#suList [data-id="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
        $('suFicha')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ───────────────────────── 🖼️ Tarjeta (WhatsApp image, PLAN §11) ─────────────────────────
    // A modal in <body> (z-index 10001, above #schoolModuleView) with its own listeners.
    // Read-only except "✅ Ya le envié", which goes through logSent (channel 'card').

    const cardApi = () => window.CobrosCard || null;
    const CARD = { row: null, moment: '', octo: null };

    function closeCardModal() {
        const m = $('suCardModal');
        if (m) m.remove();
        document.removeEventListener('keydown', onCardKey);
        CARD.row = null;
    }
    function onCardKey(e) { if (e.key === 'Escape') closeCardModal(); }
    const cardMsg = (t, kind = 'info') => {
        const el = $('suCardMsg');
        if (el) { el.textContent = t; el.className = `su-card-msg su-card-msg-${kind}`; }
    };

    function drawCardNow() {
        const C = cardApi();
        const cv = $('suCardCanvas');
        if (!C || !cv || !CARD.row) return;
        const t = C.textFor(CARD.row, senderName(), CARD.moment);
        C.drawCard(cv, Object.assign({}, t, { octo: CARD.octo }));
    }

    /** Plain WhatsApp text for the chosen moment (the card's textarea draft wins when the moment is the row's own). */
    function cardWhatsAppText() {
        const r = CARD.row;
        const ta = $('suCobText');
        if (CARD.moment === r.bucket && ta && ta.dataset.key === `${r.s.id}|${r.bucket}`) return ta.value;
        if (CARD.moment === r.bucket) return cobroText(r);
        return engine().buildText(Object.assign({}, r, { bucket: CARD.moment }), senderName()).whatsapp;
    }

    function openCardModal() {
        const C = cardApi();
        const r = currentRow();
        if (!r) return;
        if (!C) { notify('❌ No cargó cobros-card.js (recarga la página)', 'error'); return; }
        closeCardModal();
        CARD.row = r;
        CARD.moment = C.MOMENT[r.bucket] ? r.bucket : 'remind';
        const sales = isSales();
        const sl = SU.sent[r.s.id];
        const link = engine().waLink(r.s.telefono, 'x');
        const opts = C.MOMENTS.map(m => `<option value="${esc(m.id)}"${m.id === CARD.moment ? ' selected' : ''}>${esc(m.label)}${m.id === r.bucket ? ' (actual)' : ''}</option>`).join('');
        const wrapEl = document.createElement('div');
        wrapEl.id = 'suCardModal';
        wrapEl.className = 'su-card-modal';
        wrapEl.innerHTML = `
            <div class="su-card-box" role="dialog" aria-label="Tarjeta de cobro">
                <div class="su-card-preview"><canvas id="suCardCanvas" width="1080" height="1350"></canvas></div>
                <div class="su-card-side">
                    <div class="su-row-between" style="align-items:flex-start;">
                        <div>
                            <h3 style="margin:0;font-size:1.1rem;">🖼️ Tarjeta para WhatsApp</h3>
                            <div class="su-muted" style="font-size:0.82rem;">${esc(r.s.nombre || '')}</div>
                        </div>
                        <button type="button" class="su-linkbtn" data-card="close" title="Cerrar (Esc)" style="font-size:1.2rem;color:#6b7280;">✕</button>
                    </div>
                    <label class="su-card-lbl">Momento
                        <select id="suCardMoment" class="su-input">${opts}</select>
                    </label>
                    <label class="su-card-lbl">Firma
                        <input id="suCardSender" class="su-input" maxlength="40" value="${esc(senderName())}">
                    </label>
                    ${sl ? `<div class="su-sent-line">✓ enviado hoy ${esc(timeCO(sl.at))} por ${esc(sl.by || '—')} · ${CHANNEL_ICON[sl.channel] || esc(sl.channel || '')}</div>` : ''}
                    <div class="su-card-actions">
                        <button type="button" class="su-btn" style="background:#111827;" data-card="copy">📋 Copiar imagen</button>
                        <button type="button" class="su-btn" style="background:#4f46e5;" data-card="download">⬇️ Descargar</button>
                        ${sales ? '' : `<button type="button" class="su-btn" style="background:#16a34a;" data-card="wa" ${link ? '' : 'disabled title="Sin teléfono válido en la ficha"'}>💬 Abrir WhatsApp</button>`}
                        ${sales ? '' : (sl ? '<button type="button" class="su-btn" style="background:#059669;" disabled>✓ Ya enviado hoy</button>'
                                          : '<button type="button" class="su-btn" style="background:#059669;" data-card="mark" title="Marca el envío de hoy (canal 🖼️ tarjeta)">✅ Ya le envié</button>')}
                        <button type="button" class="su-btn" style="background:#6b7280;" data-card="close">Cerrar</button>
                    </div>
                    <p class="su-card-hint">💡 ${sales ? '' : '«Abrir WhatsApp» abre el chat con el mensaje de texto; '}copia la imagen y pégala en el chat (Ctrl+V). Copiar imágenes funciona en Chrome/Edge; si no se puede, se descarga el PNG.</p>
                    <div id="suCardMsg" class="su-card-msg"></div>
                </div>
            </div>`;
        document.body.appendChild(wrapEl);
        document.addEventListener('keydown', onCardKey);

        wrapEl.addEventListener('click', (e) => {
            if (e.target === wrapEl) { closeCardModal(); return; } // backdrop
            const b = e.target.closest('[data-card]');
            if (!b || b.disabled) return;
            const act = b.dataset.card;
            if (act === 'close') closeCardModal();
            else if (act === 'copy') cardCopy();
            else if (act === 'download') cardDownload(false);
            else if (act === 'wa') cardWhatsApp();
            else if (act === 'mark') cardMark(b);
        });
        wrapEl.addEventListener('change', (e) => {
            if (e.target.id === 'suCardMoment') { CARD.moment = e.target.value; drawCardNow(); }
        });
        wrapEl.addEventListener('input', (e) => {
            if (e.target.id !== 'suCardSender') return;
            lsSet(LS_SENDER, e.target.value);
            // keep the Cobranza card (Firma input + generated text) in sync
            const fs = $('suSender'); if (fs) fs.value = e.target.value;
            const ta = $('suCobText');
            if (ta && CARD.row && !SU.drafts.has(`${CARD.row.s.id}|${CARD.row.bucket}`)) ta.value = cobroText(CARD.row);
            drawCardNow();
        });

        drawCardNow();
        C.loadOcto().then((img) => { if (img && CARD.row === r) { CARD.octo = img; drawCardNow(); } });
    }

    function cardDownload(fallback) {
        const C = cardApi();
        const cv = $('suCardCanvas');
        if (!C || !cv || !CARD.row) return;
        const a = document.createElement('a');
        a.href = cv.toDataURL('image/png');
        a.download = C.fileName(CARD.row);
        document.body.appendChild(a); a.click(); a.remove();
        cardMsg(fallback ? '⚠️ Este navegador no dejó copiar la imagen: la descargué. Adjúntala en WhatsApp.' : '⬇️ Imagen descargada', fallback ? 'warn' : 'ok');
    }

    async function cardCopy() {
        const C = cardApi();
        const cv = $('suCardCanvas');
        if (!C || !cv) return;
        if (!navigator.clipboard?.write || typeof window.ClipboardItem === 'undefined') { cardDownload(true); return; }
        try {
            try {
                // promise form first: keeps the user gesture alive while the PNG encodes (Safari needs it)
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': C.toPngBlob(cv) })]);
            } catch (e1) {
                const blob = await C.toPngBlob(cv);
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            }
            cardMsg('📋 Imagen copiada — pégala en el chat de WhatsApp (Ctrl+V)', 'ok');
        } catch (e) {
            console.warn('Tarjeta — copiar imagen:', e);
            cardDownload(true);
        }
    }

    function cardWhatsApp() {
        const r = CARD.row;
        if (!r || !canWrite()) return;
        const link = engine().waLink(r.s.telefono, cardWhatsAppText());
        if (!link) { cardMsg('Este estudiante no tiene un teléfono válido para WhatsApp', 'warn'); return; }
        window.open(link, '_blank', 'noopener'); // synchronous in the click → not blocked as a popup
        cardMsg('💬 WhatsApp abierto con el texto — ahora pega la imagen (📋 Copiar imagen → Ctrl+V)', 'ok');
    }

    async function cardMark(btn) {
        const r = CARD.row;
        if (!r || !canWrite()) return;
        btn.disabled = true;
        const ok = await logSent(r.s.id, CARD.moment || r.bucket, 'card');
        if (ok) { notify(`✅ Marcado como enviado (🖼️ tarjeta) · ${r.s.nombre || ''}`, 'success'); closeCardModal(); }
        else { btn.disabled = false; cardMsg('❌ No se guardó la marca (ver aviso)', 'err'); }
    }

    // ───────────────────────── 📎 Comprobante (receipt reader, PLAN §12) ─────────────────────────
    // Upload / drop / paste the student's receipt → readReceipt (TutorBox CF, Claude vision) reads it →
    // checks (amount, date, duplicate reference, payer, destination, confidence) → "✅ Registrar pago con
    // estos datos" uploads the image to CRM Storage and PRE-FILLS the existing payment modal (openPayment →
    // processPayment, the only validated path). A person confirms with the modal's own Registrar button:
    // nothing here writes a payment. After a successful save, saveReceiptRecord() writes
    // paymentReceipts/{autoId} (this module's third and last allowed write).

    const RECEIPT_FN_URL = 'https://us-central1-tutorbox-4d7c9.cloudfunctions.net/readReceipt';
    // TODO(founder): fill with the school's REAL destination accounts, e.g.
    //   { provider: 'Nequi', name: 'Ciudad Bilingüe', account: '3242973737' },
    //   { provider: 'Bancolombia', name: 'Ciudad Bilingüe SAS', account: '00000000000' },
    // Matching uses the last 4 digits (receipts often mask the rest) or, without digits, the name.
    // While this list is empty every receipt shows "⚠️ cuenta destino no configurada".
    const SCHOOL_ACCOUNTS = [];
    const RC_MAX_DAYS = 45;              // older receipts get a ⚠️
    const RC_MAX_PX = 1600;              // client-side downscale before sending
    const RC_MAX_BYTES = 6 * 1024 * 1024;
    const RC_MIN_CONF = 0.6;
    const RC_RECENT_MS = 2 * 60 * 1000;  // the payment saved by the modal must be this recent
    const FIREBASE_SDK = '10.7.1';       // same version index.html imports
    const RC = { studentId: null, blob: null, mime: '', ext: '', name: '', previewUrl: '', data: null, model: '', busy: false };
    const RC_ERR = {
        unauthorized: 'la clave del puente TutorBox fue rechazada',
        file_too_large: 'el archivo pesa más de 6 MB',
        unsupported_mime_type: 'formato no soportado (usa JPG, PNG, WebP o PDF)',
        image_required: 'no llegó la imagen',
        refused: 'el lector se negó a procesar esta imagen',
        unparseable_reply: 'el lector no devolvió datos claros — prueba con una imagen más nítida',
        ai_error: 'el servicio de IA no respondió (¿créditos de Anthropic?)',
        anthropic_disabled: 'el proveedor de IA está desactivado en TutorBox',
        anthropic_not_configured: 'falta la clave de Anthropic en TutorBox',
        server_not_configured: 'la función no tiene configurada la clave del puente'
    };
    const RC_FIELDS = [
        ['provider', 'Medio', 'select'], ['amount', 'Monto (COP)', 'number'],
        ['dateIso', 'Fecha', 'date'], ['timeHHmm', 'Hora', 'time'],
        ['reference', 'Referencia', 'text'], ['payerName', 'Pagó (nombre)', 'text'],
        ['payerAccountLast4', 'Origen (4 últimos)', 'text'], ['destinationName', 'Destino (nombre)', 'text'],
        ['destinationAccount', 'Destino (cuenta)', 'text'], ['concept', 'Mensaje / concepto', 'text']
    ];
    const RC_ICON = { ok: '✅', warn: '⚠️', stop: '⛔' };

    const refKey = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const nameWords = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length >= 3);
    const daysBetween = (a, b) => {
        const p = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
        return Math.round((p(b) - p(a)) / 86400000);
    };
    // the CRM-bridge key already loaded by tutorbox-admin.js / students.js (same lookup as auditlog.js)
    const bridgeKey = () => (typeof TB_ADMIN_KEY !== 'undefined' ? TB_ADMIN_KEY
        : typeof TUTORBOX_ADMIN_KEY !== 'undefined' ? TUTORBOX_ADMIN_KEY : null);

    /** paymentReceipts — one READ (open to any signed-in user); null when the rules are not published yet. */
    async function loadReceipts() {
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, 'paymentReceipts'));
            SU.receipts = snap.val() || {};
        } catch (e) {
            console.warn('Estudiantes unificado — paymentReceipts (¿reglas sin publicar?):', e);
            SU.receipts = null;
        }
        indexReceipts();
    }

    function indexReceipts() {
        SU.receiptByPayment = new Map();
        Object.entries(SU.receipts || {}).forEach(([rid, r]) => {
            if (!r) return;
            const ids = Array.isArray(r.paymentIds) && r.paymentIds.length ? r.paymentIds : (r.paymentId ? [r.paymentId] : []);
            ids.forEach(pid => SU.receiptByPayment.set(pid, Object.assign({ id: rid }, r)));
        });
    }

    // Firebase Storage: the CRM page does not import it (InvoiceStorage falls back to DB-only), so load the
    // same SDK version lazily here — without touching window.firebaseModules (invoices keep behaving as today).
    let storageApi = null;
    async function getStorageApi() {
        if (storageApi) return storageApi;
        const m = window.firebaseModules?.storage;
        if (m && m.storage && m.storageRef && m.uploadBytes && m.getDownloadURL) {
            storageApi = { storage: m.storage, ref: m.storageRef, uploadBytes: m.uploadBytes, getDownloadURL: m.getDownloadURL };
            return storageApi;
        }
        if (!window.firebaseApp) throw new Error('Firebase no está listo');
        const mod = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK}/firebase-storage.js`);
        storageApi = { storage: mod.getStorage(window.firebaseApp), ref: mod.ref, uploadBytes: mod.uploadBytes, getDownloadURL: mod.getDownloadURL };
        return storageApi;
    }

    function loadImage(blob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No pude abrir la imagen (¿formato HEIC?). Envíala como JPG o PNG.')); };
            img.src = url;
        });
    }

    /** PDF as-is (≤ 6 MB); images re-encoded to JPEG ≤ 1600 px when big or not jpeg/png/webp. */
    async function prepareReceiptFile(file) {
        const type = String(file.type || '').toLowerCase();
        if (type === 'application/pdf') {
            if (file.size > RC_MAX_BYTES) throw new Error('El PDF pesa más de 6 MB');
            return { blob: file, mime: 'application/pdf', ext: 'pdf' };
        }
        if (!type.startsWith('image/')) throw new Error('Sube una imagen (JPG, PNG, WebP) o un PDF');
        const img = await loadImage(file);
        const w = img.naturalWidth, h = img.naturalHeight;
        const keep = ['image/jpeg', 'image/png', 'image/webp'].includes(type) && Math.max(w, h) <= RC_MAX_PX && file.size <= 2 * 1024 * 1024;
        if (keep) return { blob: file, mime: type, ext: type === 'image/jpeg' ? 'jpg' : type.split('/')[1] };
        const k = Math.min(1, RC_MAX_PX / Math.max(w, h));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * k));
        cv.height = Math.max(1, Math.round(h * k));
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; // transparent PNG → white, not black
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const blob = await new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('No pude convertir la imagen'))), 'image/jpeg', 0.88));
        return { blob, mime: 'image/jpeg', ext: 'jpg' };
    }

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => { const s = String(fr.result || ''); resolve(s.slice(s.indexOf(',') + 1)); };
        fr.onerror = () => reject(fr.error || new Error('No pude leer el archivo'));
        fr.readAsDataURL(blob);
    });

    /** What the student owes now: the CobrosEngine row if there is one, else the monthly total. */
    function owedFor(s) {
        const monthly = Number(window.getStudentMonthlyTotal?.(s)) || 0;
        const e = SU.cobros?.byId?.get(s.id);
        if (e && e.type === 'row') {
            const r = e.r;
            const owe = r.bucket === 'prev' ? (r.prevOwed?.remaining || 0) : (r.remaining || 0) + (r.prevOwed?.remaining || 0);
            return { owe, monthly, source: bucketInfo(r.bucket).label };
        }
        return { owe: monthly, monthly, source: e && e.type === 'ok' ? 'al día — mensualidad' : 'mensualidad' };
    }

    /**
     * Month(s) this payment should cover, in order: continues after the last month with tuition
     * (or completes it if it was partial), skipping exonerated / holiday / not-required months; starts at
     * fechaInicio (or this month) when there are no payments. Stops at next month (Mensual limit).
     */
    function suggestMonths(s, amount) {
        const out = { months: [], leftover: 0, partial: false, notes: [] };
        if (s.tipoPago === 'POR_HORAS' || s.modalidad === 'Privadas') {
            out.notes.push('Estudiante por horas: escribe las horas en el formulario (el total se calcula solo).');
            return out;
        }
        const monthly = Number(window.getStudentMonthlyTotal?.(s)) || 0;
        const [cy, cm] = today().split('-').map(Number);
        const curAbs = cy * 12 + (cm - 1);
        const paidBy = new Map();
        let lastAbs = -1;
        studentPaymentRecords(s.id).forEach(p => {
            const mi = MESES.indexOf(String(p.month || '').toLowerCase());
            const y = Number(p.year);
            if (mi < 0 || !(y > 2000) || p.status === 'cancelled') return;
            const t = tuitionOf(p);
            if (t <= 0) return;
            const abs = y * 12 + mi;
            paidBy.set(abs, (paidBy.get(abs) || 0) + t);
            if (abs > lastAbs) lastAbs = abs;
        });
        let start;
        if (lastAbs >= 0) start = (monthly > 0 && paidBy.get(lastAbs) < monthly) ? lastAbs : lastAbs + 1;
        else {
            const fi = /^(\d{4})-(\d{1,2})/.exec(String(s.fechaInicio || ''));
            start = fi ? Number(fi[1]) * 12 + Number(fi[2]) - 1 : curAbs;
        }
        const pem = window.PaymentExceptionsManager;
        const skip = (y, mi) => !!pem?.isExempt?.(s.id, mi, y)
            || ((typeof PaymentConfig !== 'undefined' && PaymentConfig.isHoliday) ? !!PaymentConfig.isHoliday(y, MESES[mi]) : false)
            || (typeof window.isMonthRequiredByStatus === 'function' && !window.isMonthRequiredByStatus(s, mi, y));
        let remaining = Number(amount) || 0;
        for (let abs = start, guard = 0; guard < 36 && out.months.length < 12; abs++, guard++) {
            const y = Math.floor(abs / 12), mi = abs % 12;
            if (abs !== lastAbs && skip(y, mi)) continue;
            if (abs > curAbs + 1) {
                if (!out.months.length) out.notes.push(`El siguiente mes por pagar es ${MESES[mi]} ${y} (más de un mes adelante): en Mensual solo se adelanta 1 mes — elige Trimestre/Semestre/Anual en el formulario.`);
                else if (remaining > 0) out.notes.push('El monto alcanza para más meses, pero en pago Mensual solo se adelanta el mes siguiente (usa Trimestre/Semestre/Anual en el formulario).');
                break;
            }
            const need = monthly > 0 ? monthly - (paidBy.get(abs) || 0) : remaining;
            if (!out.months.length || remaining >= need) {
                out.months.push({ mes: MESES[mi], mi, y, completes: paidBy.has(abs) });
                if (remaining < need) out.partial = true;
                remaining -= need;
                if (monthly <= 0 || remaining <= 0) break;
            } else break;
        }
        out.leftover = Math.max(0, remaining);
        if (out.leftover > 0 && out.months.length) out.notes.push(`Sobran ${money(out.leftover)} después de ${out.months.length} mes${out.months.length === 1 ? '' : 'es'}: ¿matrícula, libro u otro concepto? Agrégalo en el formulario.`);
        const years = [...new Set(out.months.map(m => m.y))];
        if (years.length > 1) out.notes.push(`Los meses cruzan de año: el formulario muestra un año a la vez — se marcan los de ${years[0]}; registra los de ${years[1]} en otro pago.`);
        return out;
    }

    /** ✅ / ⚠️ / ⛔ checks over the (editable) fields. Texts are plain (escaped when rendered). */
    function receiptChecks(s, d) {
        const out = [];
        const add = (level, text) => out.push({ level, text });
        if (!d.isReceipt) add('stop', 'El lector dice que esto no es un comprobante de pago exitoso. Sube el comprobante correcto.');

        const { owe, monthly, source } = owedFor(s);
        if (!(d.amount > 0)) add('stop', 'Falta el monto.');
        else if (owe > 0) {
            if (d.amount === owe) add('ok', `Monto ${money(d.amount)} = lo que debe (${source}).`);
            else if (d.amount < owe) add('warn', `Monto ${money(d.amount)} menor a lo que debe (${money(owe)}, ${source}): quedará como abono parcial.`);
            else if (monthly > 0 && d.amount % monthly === 0) add('ok', `Monto ${money(d.amount)} = ${d.amount / monthly} mensualidades de ${money(monthly)}.`);
            else add('warn', `Monto ${money(d.amount)} mayor a lo que debe (${money(owe)}): ¿varios meses, matrícula o libro?`);
        } else add('warn', `La ficha no tiene valor mensual: no puedo comparar el monto ${money(d.amount)}.`);

        if (!d.dateIso) add('warn', 'No hay fecha (el comprobante no la muestra o no se leyó).');
        else {
            const days = daysBetween(d.dateIso, today());
            if (isNaN(days)) add('warn', 'Fecha inválida.');
            else if (days < 0) add('stop', `La fecha ${d.dateIso} está en el futuro.`);
            else if (days > RC_MAX_DAYS) add('warn', `El comprobante tiene ${days} días (más de ${RC_MAX_DAYS}).`);
            else add('ok', `Fecha ${d.dateIso}${d.timeHHmm ? ' ' + d.timeHHmm : ''} (${days === 0 ? 'hoy' : 'hace ' + plural(days, 'día')}).`);
        }

        const key = refKey(d.reference);
        const all = SU.receipts ? Object.values(SU.receipts).filter(Boolean) : null;
        if (!all) add('warn', 'No pude revisar duplicados (falta publicar las reglas de paymentReceipts).');
        else if (!key) add('warn', 'Sin número de referencia: no se puede verificar si ya se usó.');
        else {
            const dup = all.find(r => refKey(r.reference) === key);
            if (dup) add('stop', `Referencia ${d.reference} YA registrada el ${fmtDate(dup.at)} para ${dup.studentName || dup.studentId} (por ${dup.readBy || '—'}).`);
            else add('ok', `Referencia ${d.reference} no se ha usado antes.`);
        }
        if (all && d.amount > 0 && d.dateIso) {
            const twin = all.find(r => Number(r.amount) === d.amount && r.dateIso === d.dateIso
                && (r.timeHHmm || '') === (d.timeHHmm || '') && (!key || refKey(r.reference) !== key));
            if (twin) add('warn', `Ya hay otro comprobante con el mismo monto, fecha y hora (${twin.studentName || twin.studentId}). ¿Es el mismo?`);
        }

        if (!d.payerName) add('warn', 'El comprobante no muestra quién pagó.');
        else {
            const pw = nameWords(d.payerName);
            const sw = nameWords([s.nombre, s.acudiente].filter(Boolean).join(' '));
            const hit = pw.some(a => sw.some(b => a.startsWith(b) || b.startsWith(a)));
            if (hit) add('ok', `Pagó ${d.payerName} (coincide con estudiante/acudiente).`);
            else add('warn', `Pagó ${d.payerName}: no coincide con el estudiante ni el acudiente (puede ser un familiar).`);
        }

        if (!SCHOOL_ACCOUNTS.length) add('warn', 'Cuenta destino no configurada (SCHOOL_ACCOUNTS): no puedo confirmar que el dinero llegó a la escuela.');
        else {
            const digits = String(d.destinationAccount || '').replace(/\D/g, '');
            const last4 = digits.length >= 4 ? digits.slice(-4) : '';
            const dn = nameWords(d.destinationName);
            const acct = SCHOOL_ACCOUNTS.find(a => (last4 && String(a.account || '').replace(/\D/g, '').slice(-4) === last4)
                || (!last4 && dn.length && nameWords(a.name).some(w => dn.includes(w))));
            if (acct) add('ok', `Destino: ${[acct.provider, acct.name].filter(Boolean).join(' · ')} (···${String(acct.account || '').replace(/\D/g, '').slice(-4)}).`);
            else if (last4) add('stop', `La cuenta destino (···${last4}) no es ninguna de las cuentas de la escuela.`);
            else add('warn', 'El comprobante no muestra la cuenta destino.');
        }

        const pct = Math.round((Number(d.confidence) || 0) * 100);
        if ((Number(d.confidence) || 0) < RC_MIN_CONF) add('warn', `El lector no está seguro (confianza ${pct} %): compara cada campo con la imagen.`);
        else add('ok', `Confianza del lector ${pct} %.`);
        (d.warnings || []).forEach(w => add('warn', `Lector: ${w}`));
        return out;
    }

    function closeReceiptModal() {
        const m = $('suRcModal');
        if (m) m.remove();
        if (RC.previewUrl) { try { URL.revokeObjectURL(RC.previewUrl); } catch (e) { /* noop */ } }
        RC.previewUrl = '';
        document.removeEventListener('keydown', onRcKey);
        document.removeEventListener('paste', onRcPaste);
    }
    function onRcKey(e) { if (e.key === 'Escape') closeReceiptModal(); }
    function onRcPaste(e) {
        const items = e.clipboardData?.items || [];
        for (const it of items) {
            if (it.kind !== 'file') continue;
            const f = it.getAsFile();
            if (f && (String(f.type).startsWith('image/') || f.type === 'application/pdf')) {
                e.preventDefault();
                rcSetFile(f);
                return;
            }
        }
    }
    const rcMsg = (t, kind = 'info') => {
        const el = $('suRcMsg');
        if (el) { el.textContent = t; el.className = `su-card-msg su-card-msg-${kind}`; }
    };

    function openReceiptModal(id) {
        if (!canWrite()) return;
        const s = window.StudentManager.students.get(id);
        if (!s) return;
        closeReceiptModal();
        Object.assign(RC, { studentId: id, blob: null, mime: '', ext: '', name: '', previewUrl: '', data: null, model: '', busy: false });
        const { owe, source } = owedFor(s);
        const el = document.createElement('div');
        el.id = 'suRcModal';
        el.className = 'su-card-modal';
        el.innerHTML = `
            <div class="su-card-box su-rc-box" role="dialog" aria-label="Comprobante de pago">
                <div class="su-rc-left">
                    <div id="suRcDrop" class="su-rc-drop">
                        <div id="suRcPreview" class="su-rc-preview su-muted">📎 Arrastra aquí la imagen o el PDF del comprobante,<br>
                            o pégala con <b>Ctrl+V</b> (copiada de WhatsApp Web).</div>
                        <label class="su-btn" style="background:#4f46e5;display:inline-block;margin-top:0.6rem;">📂 Elegir archivo
                            <input id="suRcFile" type="file" accept="image/*,application/pdf" style="display:none;"></label>
                    </div>
                </div>
                <div class="su-card-side su-rc-side">
                    <div class="su-row-between" style="align-items:flex-start;margin-bottom:0;">
                        <div>
                            <h3 style="margin:0;font-size:1.1rem;">📎 Comprobante de pago</h3>
                            <div class="su-muted" style="font-size:0.82rem;">${esc(s.nombre || '')} · debe ${money(owe)} (${esc(source)})</div>
                        </div>
                        <button type="button" class="su-linkbtn" data-rc="close" title="Cerrar (Esc)" style="font-size:1.2rem;color:#6b7280;">✕</button>
                    </div>
                    <button type="button" id="suRcRead" class="su-btn" style="background:#0f766e;" data-rc="read" disabled>🔍 Leer comprobante</button>
                    <div id="suRcMsg" class="su-card-msg"></div>
                    <div id="suRcFields"></div>
                    <div id="suRcChecks"></div>
                    <div id="suRcMonths"></div>
                    <div class="su-card-actions">
                        <button type="button" id="suRcGo" class="su-btn" style="background:#16a34a;" data-rc="go" disabled>✅ Registrar pago con estos datos</button>
                        <button type="button" class="su-btn" style="background:#6b7280;" data-rc="close">Cerrar</button>
                    </div>
                    <p class="su-card-hint">🔒 <b>Revisa y confirma.</b> Este botón NO registra el pago solo: guarda la imagen y abre el
                        formulario de «Registrar pago» ya lleno (mismas validaciones antifraude, precio, factura y auditoría).
                        El pago queda registrado solo cuando tú presionas su botón <b>Registrar Pago</b>.</p>
                </div>
            </div>`;
        document.body.appendChild(el);
        document.addEventListener('keydown', onRcKey);
        document.addEventListener('paste', onRcPaste);

        el.addEventListener('click', (e) => {
            if (e.target === el) { closeReceiptModal(); return; } // backdrop
            const b = e.target.closest('[data-rc]');
            if (!b || b.disabled) return;
            const act = b.dataset.rc;
            if (act === 'close') closeReceiptModal();
            else if (act === 'read') rcRead();
            else if (act === 'go') rcRegister(b);
        });
        el.addEventListener('change', (e) => {
            if (e.target.id === 'suRcFile' && e.target.files && e.target.files[0]) rcSetFile(e.target.files[0]);
            else if (e.target.id && e.target.id.startsWith('suRc_')) rcUpdate();
        });
        el.addEventListener('input', (e) => { if (e.target.id && e.target.id.startsWith('suRc_')) rcUpdate(); });
        const drop = $('suRcDrop');
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('su-rc-over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('su-rc-over'));
        drop.addEventListener('drop', (e) => {
            e.preventDefault();
            drop.classList.remove('su-rc-over');
            const f = e.dataTransfer?.files?.[0];
            if (f) rcSetFile(f);
        });
    }

    async function rcSetFile(file) {
        if (!$('suRcModal') || RC.busy) return;
        rcMsg('Preparando imagen…');
        try {
            const p = await prepareReceiptFile(file);
            if (RC.previewUrl) { try { URL.revokeObjectURL(RC.previewUrl); } catch (e) { /* noop */ } }
            Object.assign(RC, p, { name: file.name || `comprobante.${p.ext}`, data: null, model: '', previewUrl: '' });
            const pv = $('suRcPreview');
            if (pv) {
                pv.classList.remove('su-muted');
                if (p.mime === 'application/pdf') {
                    pv.innerHTML = `<div style="font-size:3rem;">📄</div><div>${esc(RC.name)} · ${Math.round(p.blob.size / 1024)} KB</div>`;
                } else {
                    RC.previewUrl = URL.createObjectURL(p.blob);
                    pv.innerHTML = `<img src="${RC.previewUrl}" alt="Comprobante">`;
                }
            }
            $('suRcFields').innerHTML = '';
            $('suRcChecks').innerHTML = '';
            $('suRcMonths').innerHTML = '';
            $('suRcGo').disabled = true;
            const rb = $('suRcRead');
            rb.disabled = false;
            rb.textContent = '🔍 Leer comprobante';
            rcMsg(`Listo (${Math.round(p.blob.size / 1024)} KB). Presiona «Leer comprobante».`, 'ok');
        } catch (e) {
            rcMsg('❌ ' + (e.message || e), 'err');
        }
    }

    async function rcRead() {
        const s = window.StudentManager.students.get(RC.studentId);
        if (!s || !RC.blob || RC.busy) return;
        const key = bridgeKey();
        if (!key) { rcMsg('❌ Falta la clave del puente TutorBox (tutorbox-admin.js no cargó). Recarga la página.', 'err'); return; }
        const btn = $('suRcRead');
        RC.busy = true;
        btn.disabled = true;
        btn.textContent = '⏳ Leyendo…';
        $('suRcGo').disabled = true;
        rcMsg('Leyendo el comprobante (5–30 s)…');
        try {
            const imageBase64 = await blobToBase64(RC.blob);
            let res;
            try {
                res = await fetch(RECEIPT_FN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
                    body: JSON.stringify({ imageBase64, mimeType: RC.mime, studentName: s.nombre || '', expectedAmount: owedFor(s).owe || undefined })
                });
            } catch (netErr) {
                throw new Error('no hay conexión con la función readReceipt (¿ya está desplegada?)');
            }
            const j = await res.json().catch(() => ({}));
            if (!res.ok || !j.ok) throw new Error(RC_ERR[j.error] || j.error || `HTTP ${res.status}`);
            RC.data = j.data || {};
            RC.model = j.model || '';
            if (SU.receipts === null) await loadReceipts(); // retry the duplicate source once
            renderRcFields();
            rcUpdate();
            rcMsg('✅ Leído. Compara los campos con la imagen y corrige lo que haga falta.', 'ok');
        } catch (e) {
            rcMsg('❌ No se pudo leer: ' + (e.message || e), 'err');
        } finally {
            RC.busy = false;
            if ($('suRcRead')) { btn.disabled = false; btn.textContent = RC.data ? '🔍 Leer de nuevo' : '🔍 Leer comprobante'; }
        }
    }

    function renderRcFields() {
        const box = $('suRcFields');
        if (!box || !RC.data) return;
        const d = RC.data;
        box.innerHTML = `<div class="su-rc-grid">${RC_FIELDS.map(([k, label, type]) => {
            const v = d[k] ?? '';
            const input = type === 'select'
                ? `<select id="suRc_${k}" class="su-input">${['Nequi', 'Bancolombia', 'Daviplata', 'otro'].map(o =>
                    `<option value="${o}"${o === v ? ' selected' : ''}>${o === 'otro' ? 'Otro' : o}</option>`).join('')}</select>`
                : `<input id="suRc_${k}" class="su-input" type="${type}" value="${esc(v)}"${type === 'number' ? ' min="0" step="1"' : ''}>`;
            return `<label${k === 'concept' ? ' style="grid-column:1/-1;"' : ''}>${esc(label)}${input}</label>`;
        }).join('')}</div>`;
    }

    /** Current values of the editable fields + what only the reader knows (isReceipt, confidence, warnings). */
    function readRcFields() {
        const d = RC.data || {};
        const v = (k) => { const el = $(`suRc_${k}`); return el ? String(el.value || '').trim() : ''; };
        const amount = Math.round(Number(v('amount').replace(/[^\d.]/g, ''))) || null;
        return {
            isReceipt: d.isReceipt === true,
            provider: v('provider') || 'otro',
            amount,
            dateIso: /^\d{4}-\d{2}-\d{2}$/.test(v('dateIso')) ? v('dateIso') : null,
            timeHHmm: /^\d{2}:\d{2}$/.test(v('timeHHmm')) ? v('timeHHmm') : null,
            reference: v('reference') || null,
            payerName: v('payerName') || null,
            payerAccountLast4: v('payerAccountLast4').replace(/\D/g, '').slice(-4) || null,
            destinationName: v('destinationName') || null,
            destinationAccount: v('destinationAccount') || null,
            concept: v('concept') || null,
            confidence: Number(d.confidence) || 0,
            warnings: Array.isArray(d.warnings) ? d.warnings : []
        };
    }

    function rcUpdate() {
        const s = window.StudentManager.students.get(RC.studentId);
        if (!s || !RC.data) return;
        const d = readRcFields();
        const checks = receiptChecks(s, d);
        $('suRcChecks').innerHTML = `<ul class="su-rc-checks">${checks.map(c =>
            `<li class="su-rc-${c.level}">${RC_ICON[c.level]} ${esc(c.text)}</li>`).join('')}</ul>`;
        const sug = d.amount > 0 ? suggestMonths(s, d.amount) : null;
        $('suRcMonths').innerHTML = sug ? `<div class="su-rc-months">🗓️ <b>Meses que cubre:</b> ${sug.months.length
            ? sug.months.map(m => `${m.mes} ${m.y}${m.completes ? ' (completa abono)' : ''}`).join(', ') + (sug.partial ? ' — <b>abono parcial</b>' : '')
            : '—'}${sug.notes.map(n => `<div class="su-muted" style="font-size:0.78rem;margin-top:0.2rem;">${esc(n)}</div>`).join('')}</div>` : '';
        const stops = checks.filter(c => c.level === 'stop').length;
        const go = $('suRcGo');
        go.disabled = RC.busy || stops > 0;
        go.title = stops ? 'Corrige los ⛔ antes de registrar' : 'Abre el formulario de pago ya lleno; tú confirmas con Registrar Pago';
    }

    async function uploadReceiptImage(studentId) {
        const api = await getStorageApi();
        const path = `receipts/${studentId}/${Date.now()}.${RC.ext || 'jpg'}`;
        const cu = window.FirebaseData?.currentUser;
        const snap = await api.uploadBytes(api.ref(api.storage, path), RC.blob, {
            contentType: RC.mime,
            customMetadata: { studentId, readBy: cu?.email || cu?.uid || '' }
        });
        let url = null;
        try { url = await api.getDownloadURL(snap.ref); } catch (e) { console.warn('receipt URL:', e); }
        return { imagePath: path, imageUrl: url };
    }

    /** Pre-fills #paymentModal (already open). The person still presses its Registrar button. */
    function prefillPaymentModal(s, d, sug) {
        const hourly = s.tipoPago === 'POR_HORAS' || s.modalidad === 'Privadas';
        const notes = [];
        if (!hourly && sug.months.length) {
            const pt = $('paymentType');
            if (pt && pt.value !== 'monthly') { pt.value = 'monthly'; window.handlePaymentTypeChange?.(); }
            const y0 = sug.months[0].y;
            const ysel = $('monthYearSelector');
            if (ysel && Number(ysel.value) !== y0 && [...ysel.options].some(o => Number(o.value) === y0)) {
                ysel.value = String(y0);
                window.changeMonthYearDisplay?.();
            }
            document.querySelectorAll('#paymentModal .month-checkbox').forEach(cb => { cb.checked = false; });
            sug.months.filter(m => m.y === y0).forEach(m => {
                const cb = document.querySelector(`#paymentModal .month-checkbox[data-month="${m.mes}"][data-year="${m.y}"]`);
                if (cb) cb.checked = true;
            });
            window.updateMonthSelection?.(); // fills the official price (read-only) like a manual tick
            const base = $('payAmountBase');
            if (base && d.amount > 0) {
                const official = window.parseCurrencyValue ? window.parseCurrencyValue(base.value) : 0;
                if (official > 0 && d.amount < official) {
                    const pc = $('partialPaymentCheck');
                    if (pc && !pc.checked) { pc.checked = true; window.PricingManager?.onPartialToggle?.(); }
                    base.value = '$' + d.amount.toLocaleString('es-CO');
                    notes.push(`Monto menor al precio de lista (${money(official)}): marqué «Abono / Pago parcial».`);
                } else if (official > 0 && d.amount > official) {
                    notes.push(`El comprobante trae ${money(d.amount - official)} más que la mensualidad: si es matrícula, libro u otro, márcalo en «Artículos adicionales».`);
                } else if (!official || !base.readOnly) {
                    base.value = '$' + d.amount.toLocaleString('es-CO');
                }
                window.updatePaymentTotal?.();
            }
        }
        const method = $('payMethod');
        if (method) { method.value = 'Transferencia'; window.toggleBankOptions?.(); }
        const bank = $('payBank');
        if (bank) bank.value = d.provider === 'Nequi' ? 'Nequi' : d.provider === 'Bancolombia' ? 'Bancolombia' : 'Otro';
        const pn = $('payNotes');
        if (pn) pn.value = `Comprobante ${d.provider} ref ${d.reference || '—'} · ${d.dateIso || 'sin fecha'}`;
        const form = $('paymentForm');
        if (form) {
            form.insertAdjacentHTML('afterbegin', `
                <div class="su-rc-banner">📎 <b>Datos tomados del comprobante</b> — ${esc(d.provider)} · ${money(d.amount)} · ref ${esc(d.reference || '—')} · ${esc(d.dateIso || 'sin fecha')}<br>
                    🗓️ ${sug.months.length ? esc(sug.months.map(m => `${m.mes} ${m.y}`).join(', ')) : 'elige el/los mes(es)'}
                    ${[...sug.notes, ...notes].map(n => `<div style="font-size:0.8rem;margin-top:0.2rem;">⚠️ ${esc(n)}</div>`).join('')}
                    <div style="margin-top:0.35rem;font-weight:700;">Revisa y confirma con «Registrar Pago» (abajo). Si cancelas, no se registra nada.</div>
                </div>`);
        }
    }

    async function rcRegister(btn) {
        const s = window.StudentManager.students.get(RC.studentId);
        if (!s || !RC.data || !RC.blob || RC.busy || !canWrite()) return;
        await loadReceipts(); // fresh duplicate check right before using the reference
        rcUpdate();
        const d = readRcFields();
        const checks = receiptChecks(s, d);
        if (checks.some(c => c.level === 'stop')) { rcMsg('⛔ Hay validaciones que impiden registrar (ver lista).', 'err'); return; }
        if (!window.PricingManager?.loaded) { rcMsg('⏳ Los precios aún no cargan; usa ↻ Recargar y vuelve a intentar.', 'warn'); return; }
        RC.busy = true;
        btn.disabled = true;
        btn.textContent = '⏳ Guardando imagen…';
        let img = { imagePath: null, imageUrl: null };
        try {
            img = await uploadReceiptImage(s.id);
        } catch (e) {
            console.warn('Comprobante — Storage:', e);
            if (!confirm('No se pudo guardar la imagen del comprobante (¿Storage o sus reglas sin publicar?).\n\n¿Continuar con el pago sin guardar la imagen?')) {
                RC.busy = false; btn.disabled = false; btn.textContent = '✅ Registrar pago con estos datos';
                rcMsg('❌ Imagen no guardada: ' + (e.code || e.message || e), 'err');
                return;
            }
        }
        const ctx = {
            studentId: s.id, studentName: s.nombre || '', d, img, model: RC.model, startedAt: Date.now(),
            flags: checks.filter(c => c.level !== 'ok').map(c => `${RC_ICON[c.level]} ${c.text}`)
        };
        const sug = suggestMonths(s, d.amount);
        RC.busy = false;
        closeReceiptModal();
        await openPayment(s.id, {
            prefill: () => prefillPaymentModal(s, d, sug),
            afterSave: () => saveReceiptRecord(ctx)
        });
    }

    // ONE OF THIS MODULE'S FIREBASE WRITES (with logSent/unlogSent): paymentReceipts/{autoId}, create-only.
    async function saveReceiptRecord(ctx) {
        if (!canWrite() || !ctx) return false;
        const now = Date.now();
        // the payment processPayment just wrote: newest PAY-{ts}… of this student from the last 2 min
        const cands = [];
        for (const [pid, p] of window.PaymentManager.payments.entries()) {
            if (!p || p.studentId !== ctx.studentId) continue;
            const id = p.id || pid;
            const m = /^PAY-(\d{13})/.exec(String(id));
            const ts = m ? Number(m[1]) : NaN;
            if (!(ts >= ctx.startedAt - 5000 && now - ts <= RC_RECENT_MS)) continue;
            if (SU.receiptByPayment.has(id)) continue;
            cands.push({ id, ts, group: p.masterPaymentId || p.mixedGroupId || null });
        }
        cands.sort((a, b) => b.ts - a.ts);
        const newest = cands[0] || null;
        const ids = newest ? (newest.group ? cands.filter(c => c.group === newest.group).map(c => c.id) : [newest.id]) : [];
        const cu = window.FirebaseData?.currentUser;
        const d = ctx.d;
        const rec = {
            studentId: ctx.studentId,
            studentName: ctx.studentName,
            paymentId: newest ? newest.id : null,
            paymentIds: ids.length ? ids : null,
            groupId: newest ? newest.group : null,
            reference: d.reference || null,
            provider: d.provider,
            amount: d.amount,
            dateIso: d.dateIso,
            timeHHmm: d.timeHHmm,
            payerName: d.payerName,
            destinationAccount: d.destinationAccount,
            imagePath: ctx.img.imagePath,
            imageUrl: ctx.img.imageUrl,
            readBy: cu?.email || cu?.uid || 'desconocido',
            at: new Date().toISOString(),
            confidence: d.confidence,
            warnings: ctx.flags.length ? ctx.flags.slice(0, 20) : null,
            model: ctx.model || null
        };
        try {
            const db = window.firebaseModules.database;
            const r = await db.push(db.ref(window.FirebaseData.database, 'paymentReceipts'), rec);
            if (!SU.receipts) SU.receipts = {};
            SU.receipts[r.key] = rec;
            indexReceipts();
            notify(newest ? '📎 Comprobante guardado y enlazado al pago' : '📎 Comprobante guardado (no encontré el pago nuevo para enlazarlo)', newest ? 'success' : 'warning');
            if (viewIsOpen()) renderFicha();
            return true;
        } catch (e) {
            console.error('paymentReceipts push:', e);
            notify('❌ El pago SÍ quedó registrado, pero no se guardó el registro del comprobante (¿reglas paymentReceipts sin publicar?). ' + (e.code || e.message || ''), 'error');
            return false;
        }
    }

    async function viewReceipt(pid) {
        const r = SU.receiptByPayment.get(pid);
        if (!r) return;
        const w = window.open('', '_blank'); // opened inside the click → not blocked as a popup
        try {
            let url = r.imageUrl;
            if (!url && r.imagePath) {
                const api = await getStorageApi();
                url = await api.getDownloadURL(api.ref(api.storage, r.imagePath));
            }
            if (!url) {
                if (w) w.close();
                notify(`📎 Comprobante ${r.provider || ''} ref ${r.reference || '—'} · ${r.dateIso || ''} — sin imagen guardada`, 'info');
                return;
            }
            if (w) w.location.href = url; else window.open(url, '_blank', 'noopener');
        } catch (e) {
            if (w) w.close();
            notify('❌ No se pudo abrir la imagen: ' + (e.code || e.message || e), 'error');
        }
    }

    // ───────────────────────── modal lifting (PLAN R1) ─────────────────────────

    function liftModals() {
        stopLift();
        const view = $('schoolModuleView');
        LIFT_IDS.forEach(id => { const el = $(id); if (el) el.style.zIndex = LIFT_Z; });

        SU.bodyObserver = new MutationObserver((muts) => {
            if (!viewIsOpen()) { stopLift(); return; }
            for (const m of muts) {
                m.addedNodes.forEach(n => {
                    if (n.nodeType === 1 && LIFT_IDS.includes(n.id)) n.style.zIndex = LIFT_Z;
                });
                m.removedNodes.forEach(n => {
                    if (n.nodeType === 1 && LIFT_IDS.includes(n.id)) onModalClosed(n.id);
                });
            }
        });
        SU.bodyObserver.observe(document.body, { childList: true });

        if (view) {
            SU.viewObserver = new MutationObserver(() => { if (!viewIsOpen()) stopLift(); });
            SU.viewObserver.observe(view, { attributes: true, attributeFilter: ['style'], childList: true });
        }
    }

    function stopLift() {
        if (SU.bodyObserver) { SU.bodyObserver.disconnect(); SU.bodyObserver = null; }
        if (SU.viewObserver) { SU.viewObserver.disconnect(); SU.viewObserver = null; }
        closeCardModal(); // the 🖼️ Tarjeta modal lives in <body>: never leave it over another module
        closeReceiptModal(); // same for 📎 Comprobante
    }

    function viewIsOpen() {
        const view = $('schoolModuleView');
        return !!(view && view.style.display !== 'none' && $('studentsUnifiedContainer'));
    }

    function onModalClosed(id) {
        if (id === 'editPaymentModal' || id === 'deletePaymentModal') {
            // saveEditedPayment / executeDeletePayment close their modal first and
            // update PaymentManager.payments a moment later → repaint from cache twice.
            setTimeout(() => refresh(), 1500);
            setTimeout(() => refresh(), 4000);
        } else {
            // notes / form / inactive / payment modal: the caches are already updated
            setTimeout(() => refresh(), 150);
        }
    }

    // ───────────────────────── list (left) ─────────────────────────

    function statusOf(s) {
        if (!SU.statusCache.has(s.id)) {
            let st;
            try { st = window.PaymentManager.getPaymentStatus(s); }
            catch (e) { st = { color: '#6b7280', status: '—', icon: '' }; }
            SU.statusCache.set(s.id, st);
        }
        return SU.statusCache.get(s.id);
    }

    /** Students of the chosen Cobranza bucket (active only), most overdue first. */
    function bucketStudents() {
        const c = SU.cobros;
        if (!c) return [];
        let list;
        if (SU.bucket === 'ok') {
            list = c.ok.map(o => o.s).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
        } else {
            list = c.rows.filter(r => r.bucket === SU.bucket).sort((a, b) => b.diff - a.diff ||
                String(a.s.nombre || '').localeCompare(String(b.s.nombre || ''), 'es')).map(r => r.s);
        }
        if (SU.hideSent) list = list.filter(s => !SU.sent[s.id]);
        return list;
    }

    function renderBucketOptions() {
        const sel = $('suBucket');
        if (!sel) return;
        const c = SU.cobros;
        const E = engine();
        if (!c || !E) {
            sel.innerHTML = '<option value="">💰 Cobranza: no disponible</option>';
            sel.disabled = true;
            return;
        }
        sel.disabled = false;
        const counts = {};
        const sentCounts = {};
        c.rows.forEach(r => {
            counts[r.bucket] = (counts[r.bucket] || 0) + 1;
            if (SU.sent[r.s.id]) sentCounts[r.bucket] = (sentCounts[r.bucket] || 0) + 1;
        });
        const opt = (key, emoji, label, n, sentN) =>
            `<option value="${key}"${SU.bucket === key ? ' selected' : ''}>${emoji} ${esc(label)} · ${n}${sentN ? ` (${sentN} ✓)` : ''}</option>`;
        sel.innerHTML = `<option value=""${SU.bucket ? '' : ' selected'}>💰 Cobranza: Todos</option>` +
            E.BUCKETS.map(b => opt(b.key, b.emoji, b.label, counts[b.key] || 0, sentCounts[b.key] || 0)).join('') +
            opt('ok', '✅', 'Al día', c.ok.length, 0);
    }

    function filteredStudents() {
        const all = SU.bucket ? bucketStudents() : window.StudentManager.getStudents({ status: SU.status });
        const q = SU.search.toLowerCase().trim();
        if (!q) return all;
        const qDigits = q.replace(/\D/g, '');
        return all.filter(s => {
            const hay = [s.nombre, s.loginCode, s.numDoc, s.grupo, s.grupo2, s.correo, s.acudiente]
                .map(v => String(v ?? '').toLowerCase());
            if (hay.some(v => v.includes(q))) return true;
            if (qDigits.length >= 3 && String(s.telefono || '').replace(/\D/g, '').includes(qDigits)) return true;
            return false;
        });
    }

    function groupsOf(s) {
        return [s.grupo, s.grupo2].map(g => String(g ?? '').trim()).filter(Boolean);
    }

    function renderList() {
        const box = $('suList');
        if (!box) return;
        renderBucketOptions();
        const statusSel = $('suStatus');
        if (statusSel) {
            statusSel.disabled = !!SU.bucket;
            statusSel.title = SU.bucket ? 'Con un filtro de Cobranza la lista muestra solo estudiantes activos' : '';
        }
        const hideBox = $('suHideSent');
        if (hideBox) hideBox.disabled = !SU.bucket;
        const list = filteredStudents();
        const MAX = 300;
        // ➡ Siguiente: remember who followed the selected student if it just left the list (e.g. marked as sent)
        const ids = list.slice(0, MAX).map(s => s.id);
        if (SU.selectedId && !ids.includes(SU.selectedId) && SU.listIds.includes(SU.selectedId)) {
            SU.anchorAfter = SU.listIds.slice(SU.listIds.indexOf(SU.selectedId) + 1);
        }
        SU.listIds = ids;
        $('suCount').textContent = `${list.length} estudiante(s)`;
        if (!list.length) {
            box.innerHTML = `<div class="su-empty">${SU.bucket ? '🎉 Nadie pendiente en este grupo de cobranza.' : 'No hay estudiantes con ese filtro.'}</div>`;
            return;
        }
        const rowOf = (id) => { const e = SU.cobros?.byId?.get(id); return e && e.type === 'row' ? e.r : null; };
        box.innerHTML = list.slice(0, MAX).map(s => {
            const st = statusOf(s);
            const inactive = s.status === 'inactive';
            const groups = groupsOf(s);
            let chip = `<span class="su-chip" style="background:${esc(st.color)}1a;color:${esc(st.color)};border-color:${esc(st.color)}55;"
                              title="Estado del mes actual según Pagos (usa DP1)">${esc(st.icon || '')} ${esc(st.status)}</span>`;
            let sentMark = '';
            if (SU.bucket) {
                const r = rowOf(s.id);
                const b = bucketInfo(r ? r.bucket : 'ok');
                chip = `<span class="su-chip su-b-${esc(b.key)}" title="${esc(b.label)}">${b.emoji} ${esc(b.short)}</span>`;
                const sl = SU.sent[s.id];
                if (sl) sentMark = `<span class="su-sent" title="Enviado por ${esc(sl.by || '')}">✓ ${esc(timeCO(sl.at))} ${CHANNEL_ICON[sl.channel] || ''}</span>`;
            }
            return `
                <button type="button" class="su-item${s.id === SU.selectedId ? ' su-item-on' : ''}${inactive ? ' su-item-off' : ''}"
                        data-su="pick" data-id="${esc(s.id)}">
                    <div class="su-item-top">
                        <span class="su-item-name">${esc(s.nombre || '(sin nombre)')}</span>
                        <span style="display:flex;gap:0.3rem;align-items:center;flex-shrink:0;">${sentMark}${chip}</span>
                    </div>
                    <div class="su-item-sub">
                        ${groups.length ? groups.map(g => `📚 ${esc(g)}`).join(' · ') : '<span class="su-muted">Sin grupo</span>'}
                        · DP ${esc(s.diaPago || '—')}
                        · ${s.tipoPago === 'POR_HORAS' ? `${money(s.valorHora)}/h` : money(window.getStudentMonthlyTotal(s))}
                        ${inactive ? ' · <b style="color:#b91c1c;">Inactivo</b>' : ''}
                        ${SU.bucket && rowOf(s.id) ? ` · <b>${esc(dueShort(rowOf(s.id)))}</b>` : ''}
                    </div>
                </button>`;
        }).join('') + (list.length > MAX
            ? `<div class="su-empty">Se muestran ${MAX} de ${list.length}. Escribe en el buscador para encontrar a los demás.</div>` : '');
    }

    // ───────────────────────── ficha (right) ─────────────────────────

    function phoneLinks(tel) {
        const raw = String(tel || '').trim();
        if (!raw) return '—';
        return raw.split(/[\/,;]+/).map(part => {
            let d = part.replace(/\D/g, '');
            if (!d) return esc(part.trim());
            if (d.length === 10) d = '57' + d;
            return `<a href="https://wa.me/${d}" target="_blank" rel="noopener" class="su-link">${esc(part.trim())}</a>`;
        }).join(' · ');
    }

    function field(label, value, title = '') {
        return `<div class="su-field"${title ? ` title="${esc(title)}"` : ''}><span class="su-lbl">${esc(label)}</span><span class="su-val">${value}</span></div>`;
    }

    function lastInactiveEntry(s) {
        let h = s.statusHistory;
        if (h && !Array.isArray(h)) h = Object.values(h);
        if (!h || !h.length) return null;
        const offs = h.filter(e => e && e.newStatus === 'inactive');
        return offs.length ? offs[offs.length - 1] : null;
    }

    // CRM staff names for the "Registró" column: one READ of users/*/profile per session
    // (users/.read is open to any signed-in user; nothing is written). Repaints when loaded.
    const staffNames = new Map();
    let staffNamesPromise = null;
    function loadStaffNames() {
        if (staffNamesPromise) return staffNamesPromise;
        staffNamesPromise = (async () => {
            try {
                const db = window.firebaseModules.database;
                const snap = await db.get(db.ref(window.FirebaseData.database, 'users'));
                Object.entries(snap.val() || {}).forEach(([uid, u]) => {
                    const p = u && u.profile ? u.profile : u || {};
                    const label = p.name || p.nombre || p.displayName || p.email || '';
                    if (label) staffNames.set(uid, label);
                });
                if (staffNames.size && viewIsOpen()) renderFicha();
            } catch (e) {
                console.warn('Estudiantes unificado — nombres de usuario:', e);
            }
        })();
        return staffNamesPromise;
    }

    function userLabel(uid) {
        if (!uid) return '—';
        const cu = window.FirebaseData?.currentUser;
        if (cu && cu.uid === uid) return esc(cu.email || 'Tú');
        if (staffNames.has(uid)) return `<span title="${esc(uid)}">${esc(staffNames.get(uid))}</span>`;
        const u = window.AdminCenter?.users?.get?.(uid); // only if Admin Center already loaded them
        if (u) return esc(u.name || u.nombre || u.email || uid);
        if (!staffNamesPromise) loadStaffNames();
        return `<span title="${esc(uid)}">${esc(String(uid).slice(0, 6))}…</span>`;
    }

    /** 💰 Cobranza card (inside the first card, right under the actions bar). */
    function renderCobranza(s) {
        const E = engine();
        if (!E || !SU.cobros || (s.status || 'active') !== 'active') return '';
        const entry = SU.cobros.byId.get(s.id);
        if (!entry) return '';
        const nextBtn = SU.listIds.length ? '<button type="button" class="su-linkbtn" data-su="cobNext" title="Pasa al siguiente estudiante de la lista de la izquierda">➡ Siguiente</button>' : '';
        if (entry.type === 'ok') {
            const why = entry.o.why === 'vacaciones' ? ' (mes de vacaciones)' : entry.o.why === 'excepcion' ? ' (mes exonerado)' : '';
            return `<div class="su-cob-line su-b-ok">✅ Al día${why}${entry.o.nextDueIso ? ` — próximo vencimiento ${ddmm(entry.o.nextDueIso)}` : ''} ${nextBtn}</div>`;
        }
        if (entry.type === 'note') {
            return `<div class="su-cob-line su-muted">💰 Cobranza: ${esc(entry.n.label)}${entry.n.nextDueIso ? ` — primer vencimiento ${ddmm(entry.n.nextDueIso)}` : ''} ${nextBtn}</div>`;
        }
        const r = entry.r;
        const b = bucketInfo(r.bucket);
        const sales = isSales();
        const sl = SU.sent[s.id];
        const link = E.waLink(s.telefono, 'x');
        const owe = r.bucket === 'prev' ? (r.prevOwed?.remaining || 0) : r.remaining + (r.prevOwed?.remaining || 0);
        const lines = [];
        if (r.bucket === 'prev') {
            lines.push(`La mensualidad de <b>${esc(r.prevMonthName)}</b> quedó sin pagar (venció el ${esc(E.longDate(r.dueIso))}, hace ${plural(r.diff, 'día')}).`);
        } else {
            lines.push(r.diff === 0 ? `Vence <b>hoy</b> (${esc(E.longDate(r.dueIso))}).`
                : r.diff < 0 ? `Vence el <b>${esc(E.longDate(r.dueIso))}</b> (en ${plural(-r.diff, 'día')}).`
                : `Venció el <b>${esc(E.longDate(r.dueIso))}</b> (hace ${plural(r.diff, 'día')}).`);
        }
        lines.push(`Debe <b>${money(owe)}</b>${r.bucket !== 'prev' ? ` · mensualidad ${money(r.expected)}` : ''}.`);
        if (r.partial) lines.push(`Pago parcial: abonó ${money(r.paidNow)}, le falta ${money(r.remaining)}.`);
        if (r.prevOwed && r.bucket !== 'prev') lines.push(`También debe ${esc(r.prevOwed.month)} (${money(r.prevOwed.remaining)}).`);
        if (r.agreement) lines.push(`📅 Acuerdo de pago hasta el ${esc(E.longDate(r.agreement.hasta))}${r.agreement.nota ? ` — ${esc(r.agreement.nota)}` : ''}.`);
        const sentLine = sl
            ? `<div class="su-sent-line">✓ enviado hoy ${esc(timeCO(sl.at))} por ${esc(sl.by || '—')} · ${CHANNEL_ICON[sl.channel] || esc(sl.channel || '')}${sl.kind && sl.kind !== r.bucket ? ` <span class="su-muted">(como ${esc(bucketInfo(sl.kind).short)})</span>` : ''}</div>`
            : '';
        const buttons = sales ? '' : `
            <button type="button" class="su-btn" style="background:#16a34a;" data-su="cobWa" ${link ? '' : 'disabled title="Sin teléfono válido en la ficha"'}>💬 WhatsApp</button>
            <button type="button" class="su-btn" style="background:#111827;" data-su="cobCopy">📋 Copiar</button>
            ${sl ? '<button type="button" class="su-btn" style="background:#6b7280;" data-su="cobUndo" title="Quita la marca de hoy">↩ Deshacer</button>'
                 : '<button type="button" class="su-btn" style="background:#059669;" data-su="cobMark" title="Márcalo como enviado sin abrir WhatsApp">✅ Ya le envié</button>'}`;
        return `
            <div class="su-cob su-cob-${esc(r.bucket)}">
                <div class="su-row-between" style="margin-bottom:0.35rem;">
                    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                        <b>💰 Cobranza</b>
                        <span class="su-chip su-b-${esc(r.bucket)}">${b.emoji} ${esc(b.label)}</span>
                        ${link ? '' : '<span class="su-chip" style="background:#fee2e2;color:#b91c1c;border-color:#fecaca;">sin teléfono válido</span>'}
                    </div>
                    ${nextBtn}
                </div>
                <div class="su-cob-why">${lines.join(' ')}</div>
                ${sentLine}
                <textarea id="suCobText" class="su-input su-cob-text" ${sales ? 'readonly' : ''} data-key="${esc(s.id + '|' + r.bucket)}">${esc(cobroText(r))}</textarea>
                <div class="su-cob-actions">
                    ${sales ? '' : `<label class="su-muted" style="font-size:0.8rem;">Firma <input id="suSender" class="su-input" style="width:150px;padding:0.3rem 0.45rem;" value="${esc(senderName())}" maxlength="40"></label>`}
                    ${buttons}
                    ${window.CobrosCard ? '<button type="button" class="su-btn" style="background:#4f46e5;" data-su="cobCard" title="Imagen bonita para WhatsApp con el nombre del estudiante (copiar / descargar)">🖼️ Tarjeta</button>' : ''}
                </div>
            </div>`;
    }

    function renderFicha() {
        const box = $('suFicha');
        if (!box) return;
        const s = SU.selectedId ? window.StudentManager.students.get(SU.selectedId) : null;
        if (!s) {
            box.innerHTML = `<div class="su-card su-empty" style="padding:3rem 1rem;">
                👈 Elige un estudiante de la lista para ver su ficha y sus pagos juntos.</div>`;
            return;
        }
        const sales = isSales();
        const inactive = s.status === 'inactive';
        const st = statusOf(s);
        const total = window.getStudentMonthlyTotal(s);
        const groups = groupsOf(s);
        const off = inactive ? lastInactiveEntry(s) : null;
        const acu = s.acuerdoPago && s.acuerdoPago.hasta ? s.acuerdoPago : null;
        const acuVigente = acu && acu.hasta >= today();
        const notes = Array.isArray(s.notes) ? s.notes : (s.notes ? Object.values(s.notes) : []);
        const dp2 = s.diaPago2;
        const dp2Zero = Number(dp2) === 0 && dp2 !== null && dp2 !== '' && dp2 !== undefined;
        const pricingReady = !!window.PricingManager?.loaded;
        const colegio = s.colegio ? (s.colegio.nombre || s.colegio.name || s.colegio.label || '') : '';
        const tbxHref = s.tutorboxUid
            ? `https://tutorbox.app/admin/student?uid=${encodeURIComponent(s.tutorboxUid)}&name=${encodeURIComponent(s.nombre || '')}` : '';

        box.innerHTML = `
            <div class="su-card">
                <div class="su-head">
                    <div class="su-photo">${s.photoUrl ? `<img src="${esc(s.photoUrl)}" alt="">` : '👤'}</div>
                    <div style="flex:1;min-width:0;">
                        <h3 class="su-name">${esc(s.nombre || '(sin nombre)')}
                            <span class="su-chip" style="background:${inactive ? '#fee2e2' : '#d1fae5'};color:${inactive ? '#b91c1c' : '#065f46'};border-color:${inactive ? '#fecaca' : '#a7f3d0'};">
                                ${inactive ? '❌ Inactivo' : '✅ Activo'}</span>
                        </h3>
                        <div class="su-muted" style="font-size:0.8rem;">${esc(s.id)}${s.createdAt ? ' · registrado ' + fmtDate(s.createdAt) : ''}</div>
                        ${inactive && off ? `<div class="su-warn">Inactivo desde ${fmtDate(off.date || off.changedAt)}${off.reason ? ' · ' + esc(off.reason) : ''}${off.notes ? ' · ' + esc(off.notes) : ''}</div>` : ''}
                    </div>
                    <div class="su-headlinks">
                        ${canOpen('students') ? '<button type="button" class="su-linkbtn" data-su="openStudents" title="Abre el módulo Estudiantes (esta vista se cierra)">↗ Abrir en Estudiantes</button>' : ''}
                        ${canOpen('payments') ? '<button type="button" class="su-linkbtn" data-su="openPayments" title="Abre el módulo Pagos (esta vista se cierra)">↗ Abrir en Pagos</button>' : ''}
                    </div>
                </div>

                <div class="su-actions">
                    ${canWrite() ? `<button type="button" class="su-btn" style="background:#10b981;" data-su="pay" ${pricingReady ? '' : 'disabled title="Cargando precios… (si no carga, usa ↻ Recargar)"'}>💵 Registrar pago</button>` : ''}
                    ${canWrite() ? '<button type="button" class="su-btn" style="background:#0e7490;" data-su="receipt" title="Sube el comprobante (Nequi / Bancolombia…): se lee solo, se valida y llena el formulario de pago para que lo confirmes">📎 Comprobante</button>' : ''}
                    ${canWrite() ? '<button type="button" class="su-btn" style="background:#3b82f6;" data-su="edit">✏️ Editar datos</button>' : ''}
                    ${canToggle() ? `<button type="button" class="su-btn" style="background:${inactive ? '#16a34a' : '#ef4444'};" data-su="toggle">🔄 ${inactive ? 'Activar' : 'Inactivar'}</button>` : ''}
                    ${canWrite() ? `<button type="button" class="su-btn" style="background:${notes.length ? '#f59e0b' : '#8b5cf6'};" data-su="notes">📝 Notas${notes.length ? ' (' + notes.length + ')' : ''}</button>` : ''}
                    <button type="button" class="su-btn" style="background:#0f766e;" data-su="paz" title="Solo si el estado del mes es Pagado">🧾 Paz y salvo</button>
                    <button type="button" class="su-btn" style="background:#22c55e;" data-su="wa" title="Abre WhatsApp con el recordatorio de pago">💬 WhatsApp</button>
                    ${canExceptions() ? '<button type="button" class="su-btn" style="background:#7c3aed;" data-su="exc">🏷️ Excepciones</button>' : ''}
                    <button type="button" class="su-btn" style="background:#6b7280;" data-su="refresh" title="Vuelve a leer estudiantes y pagos desde la base de datos">↻ Recargar</button>
                </div>
                ${sales ? '<div class="su-note">Vista de solo lectura para el rol de ventas.</div>' : ''}
                ${renderCobranza(s)}

                <div class="su-cols">
                    <div>
                        <h4 class="su-h4">Datos personales y contacto</h4>
                        ${field('Documento', esc([s.tipoDoc, s.numDoc].filter(Boolean).join(' ') || '—'))}
                        ${field('Edad', esc(s.edad || '—'))}
                        ${field('Teléfono', phoneLinks(s.telefono))}
                        ${field('Correo', s.correo ? `<a class="su-link" href="mailto:${esc(s.correo)}">${esc(s.correo)}</a>` : '—')}
                        ${field('Acudiente', esc([s.acudiente, s.docAcudiente].filter(Boolean).join(' · ') || '—'))}
                        ${colegio ? field('Colegio', esc(colegio)) : ''}
                        ${field('Inicio de clases', fmtDate(s.fechaInicio))}
                        ${field('Grupo(s)', groups.length ? groups.map(g => `<span class="su-tag">📚 ${esc(g)}</span>`).join(' ') : '<span class="su-muted">Sin grupo</span>')}
                        ${field('TutorBox', [
                            s.loginCode ? `<span class="su-code">🎟️ ${esc(s.loginCode)}</span>` : '<span class="su-muted">sin código</span>',
                            tbxHref ? `<a class="su-link" href="${tbxHref}" target="_blank" rel="noopener">ver en tutorbox.app</a>` : '',
                            `<span id="liveChip-${esc(s.id)}"></span>`
                        ].filter(Boolean).join(' '))}
                    </div>
                    <div>
                        <h4 class="su-h4">Plan y cobro</h4>
                        ${field('Modalidad', esc([s.modalidad, s.modalidadDetalle].filter(Boolean).join(' · ') || '—'))}
                        ${field('Curso(s)', esc([s.cursoTipo, s.cursoTipo2].filter(Boolean).join(' + ') || '—'))}
                        ${field('Tipo de pago', esc(s.tipoPago === 'POR_HORAS' ? 'Por horas' : (s.tipoPago || '—')))}
                        ${s.tipoPago === 'POR_HORAS'
                            ? field('Valor hora', money(s.valorHora))
                            : field('Mensualidad', `${money(s.valor)}${s.valor2 ? ` + ${money(s.valor2)} = <b>${money(total)}</b>` : ''}`,
                                    'Total mensual = valor + valor2 (getStudentMonthlyTotal)')}
                        ${field('DP1 (ficha)', `<b>${esc(s.diaPago || '—')}</b>`, 'Día de pago registrado en la ficha. Solo Dirección lo cambia (Editar datos).')}
                        ${field('DP2 · 0=sem', !sales
                            ? `<input type="number" min="0" max="31" class="su-dp2${dp2Zero ? ' su-dp2-zero' : ''}" value="${esc(dp2 ?? '')}" placeholder="—"
                                      onchange="saveDiaPago2('${esc(s.id)}', this)"
                                      title="Día de pago ajustado — se guarda al salir de la casilla (igual que en Estudiantes). 0 = semestre pagado.">`
                            : `<b>${esc(dp2 ?? '—')}</b>`)}
                        ${field('Estado del mes', `<span class="su-chip" style="background:${esc(st.color)}1a;color:${esc(st.color)};border-color:${esc(st.color)}55;">${esc(st.icon || '')} ${esc(st.status)}</span>
                            <span class="su-muted" style="font-size:0.75rem;">mes actual · DP1</span>`,
                            'PaymentManager.getPaymentStatus: solo el mes actual, con DP1; no mira acuerdo, OK ni excepciones.')}
                        ${field('Aviso del mes', !sales
                            ? `<span id="pagoOK-${esc(s.id)}"></span> <span class="su-muted" style="font-size:0.75rem;">OK · S · T · 📅 acuerdo (clic cicla, igual que en Estudiantes)</span>`
                            : esc(({ acuerdo: '📅 Acuerdo de pago', ok: 'OK (exonerado este mes)', no: 'No (recibe aviso)', S: 'Semestre', T: 'Test',
                                     okauto: 'OK automático', parcial: 'Pago parcial', pendiente: 'Pendiente' })[window.pagoEstadoMes ? window.pagoEstadoMes(s).estado : ''] || '—'))}
                        ${field('Último pago', `<span id="lastPay-${esc(s.id)}"></span>`)}
                        ${field('Acuerdo de pago', acu
                            ? `<span style="${acuVigente ? 'color:#1e40af;font-weight:700;' : 'color:#9ca3af;text-decoration:line-through;'}">📅 hasta ${fmtDate(acu.hasta)}</span>${acuVigente ? '' : ' <span class="su-muted">(vencido)</span>'}${acu.nota ? `<div class="su-muted" style="font-size:0.8rem;">${esc(acu.nota)}</div>` : ''}`
                            : '<span class="su-muted">ninguno</span>')}
                        ${s.paymentNotes ? field('Acuerdo antiguo 📋', esc(s.paymentNotes)) : ''}
                    </div>
                </div>

                ${notes.length ? `
                <h4 class="su-h4">Notas (${notes.length})${canWrite() ? ' <button type="button" class="su-linkbtn" data-su="notes">ver / agregar</button>' : ''}</h4>
                <div class="su-notes">
                    ${notes.slice(-3).reverse().map(n => `
                        <div class="su-noteitem"><div>${esc(n.text)}</div>
                            <div class="su-muted" style="font-size:0.75rem;">${esc(n.createdByName || n.createdBy || '')} · ${fmtDateTime(n.createdAt)}</div></div>`).join('')}
                </div>` : ''}
            </div>

            <div class="su-card" id="suGridCard">${renderGrid(s)}</div>
            ${canExceptions() ? `<div class="su-card" id="suExcCard">${renderExceptions(s)}</div>` : ''}
            <div class="su-card">${renderPayments(s)}</div>
        `;

        // Let the existing painters fill their spans (they look elements up by id).
        try { window.paintPagoOK?.(); } catch (e) { console.warn(e); }
        try { window.paintLastPayments?.(); } catch (e) { console.warn(e); }
        try { window.paintLiveClassChips?.(); } catch (e) { /* chips only if Estudiantes loaded them */ }
    }

    // ───────────────────────── 12-month grid ─────────────────────────

    const GRID_KINDS = {
        paid:     { label: 'Pagado',          bg: '#d1fae5', fg: '#065f46' },
        partial:  { label: 'Parcial',         bg: '#fef3c7', fg: '#92400e' },
        items:    { label: 'Solo artículos',  bg: '#ffedd5', fg: '#9a3412' },
        exempt:   { label: 'Exonerado',       bg: '#ede9fe', fg: '#5b21b6' },
        holiday:  { label: 'Vacaciones',      bg: '#dbeafe', fg: '#1e40af' },
        before:   { label: 'Antes del inicio', bg: '#f3f4f6', fg: '#6b7280' },
        notreq:   { label: 'No exigido',      bg: '#f3f4f6', fg: '#6b7280' },
        pending:  { label: 'Pendiente',       bg: '#fffbeb', fg: '#b45309' },
        overdue:  { label: 'Vencido',         bg: '#fee2e2', fg: '#b91c1c' },
        none:     { label: '—',               bg: '#ffffff', fg: '#9ca3af' }
    };

    function studentPaymentRecords(studentId) {
        const out = [];
        for (const [id, p] of window.PaymentManager.payments.entries()) {
            if (p && p.studentId === studentId) out.push({ ...p, id: p.id || id });
        }
        return out;
    }

    function gridYears(s, recs) {
        const now = new Date().getFullYear();
        const ys = new Set([now, now + 1, SU.year]);
        recs.forEach(p => { const y = Number(p.year); if (y > 2000) ys.add(y); });
        const m = /^(\d{4})/.exec(String(s.fechaInicio || ''));
        if (m) ys.add(Number(m[1]));
        return [...ys].sort((a, b) => b - a);
    }

    // Read-only, computed locally. Base = getStudentPaymentHistory (as in Pagos)
    // + overlays: exceptions, holidays, fechaInicio, isMonthRequiredByStatus.
    function computeGrid(s, year, recs) {
        const expected = window.getStudentMonthlyTotal(s);
        const fi = /^(\d{4})-(\d{1,2})/.exec(String(s.fechaInicio || ''));
        const start = fi ? { y: Number(fi[1]), m: Number(fi[2]) - 1 } : null;
        const nowY = new Date().getFullYear(), nowM = new Date().getMonth();
        const pem = window.PaymentExceptionsManager;
        const holiday = (y, m) => (typeof PaymentConfig !== 'undefined' && PaymentConfig.isHoliday) ? PaymentConfig.isHoliday(y, m) : false;

        return MESES.map((mes, i) => {
            const monthRecs = recs.filter(p => String(p.month || '').toLowerCase() === mes && Number(p.year) === year && p.status !== 'cancelled');
            const tuition = monthRecs.reduce((a, p) => a + tuitionOf(p), 0);
            const amount = monthRecs.reduce((a, p) => a + (Number(p.amount) || 0), 0);
            const exempt = !!pem?.isExempt?.(s.id, i, year);
            let kind;
            if (monthRecs.length) {
                if (tuition <= 0) kind = 'items';
                else if (expected > 0 && tuition < expected && s.tipoPago !== 'POR_HORAS') kind = 'partial';
                else kind = 'paid';
            } else if (exempt) kind = 'exempt';
            else if (holiday(year, mes)) kind = 'holiday';
            else if (start && (year < start.y || (year === start.y && i < start.m))) kind = 'before';
            else if (typeof window.isMonthRequiredByStatus === 'function' && !window.isMonthRequiredByStatus(s, i, year)) kind = 'notreq';
            else if (year < nowY || (year === nowY && i < nowM)) kind = s.diaPago ? 'overdue' : 'none';
            else if (year === nowY && i === nowM) {
                const pd = parseInt(s.diaPago) || 0;
                kind = !pd ? 'none' : (new Date(year, i, pd) >= new Date() ? 'pending' : 'overdue');
            } else kind = 'none';
            return { mes, i, kind, tuition, amount, exempt, recs: monthRecs };
        });
    }

    function renderGrid(s) {
        const recs = studentPaymentRecords(s.id);
        const years = gridYears(s, recs);
        const cells = computeGrid(s, SU.year, recs);
        const nowY = new Date().getFullYear(), nowM = new Date().getMonth();
        return `
            <div class="su-row-between">
                <h4 class="su-h4" style="margin:0;">Meses ${SU.year}</h4>
                <label class="su-muted" style="font-size:0.85rem;">Año
                    <select id="suYear" class="su-input" style="width:auto;padding:0.25rem 0.5rem;">
                        ${years.map(y => `<option value="${y}"${y === SU.year ? ' selected' : ''}>${y}</option>`).join('')}
                    </select>
                </label>
            </div>
            <div class="su-months">
                ${cells.map(c => {
                    const k = GRID_KINDS[c.kind];
                    const isNow = SU.year === nowY && c.i === nowM;
                    const tip = [
                        `${c.mes} ${SU.year}: ${k.label}`,
                        c.recs.length ? `Registros: ${c.recs.length} · total ${money(c.amount)} · mensualidad ${money(c.tuition)}` : '',
                        c.exempt ? 'Tiene excepción de pago autorizada' : ''
                    ].filter(Boolean).join('\n');
                    return `<div class="su-month${isNow ? ' su-month-now' : ''}" style="background:${k.bg};color:${k.fg};" title="${esc(tip)}">
                        <div class="su-month-name">${MES_CORTO[c.i]}${c.exempt && c.kind !== 'exempt' ? ' 🏷️' : ''}</div>
                        <div class="su-month-kind">${k.label}</div>
                        ${c.recs.length ? `<div class="su-month-amt">${money(c.tuition || c.amount)}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>
            <div class="su-legend">
                ${Object.entries(GRID_KINDS).filter(([key]) => key !== 'none').map(([, k]) =>
                    `<span><i style="background:${k.bg};border-color:${k.fg}55;"></i>${k.label}</span>`).join('')}
            </div>
            <div class="su-muted" style="font-size:0.75rem;margin-top:0.35rem;">
                Solo lectura. Pagado/Parcial comparan la parte de mensualidad (baseAmount) con el total mensual;
                «Exonerado» = excepción autorizada; «No exigido» = mes en que estuvo inactivo;
                «Vencido/Pendiente» usan DP1. El recuadro con borde es el mes actual.
            </div>`;
    }

    // ───────────────────────── exceptions (admins) ─────────────────────────

    function renderExceptions(s) {
        const pem = window.PaymentExceptionsManager;
        const list = pem ? [...pem.map.values()].filter(e => e.studentId === s.id)
            .sort((a, b) => (Number(b.year) - Number(a.year)) || (Number(b.monthIndex) - Number(a.monthIndex))) : [];
        const nowM = new Date().getMonth();
        return `
            <h4 class="su-h4">🏷️ Excepciones de pago (meses exonerados)</h4>
            ${list.length ? `<table class="su-table"><thead><tr><th>Mes</th><th>Motivo</th><th>Autorizó</th><th></th></tr></thead><tbody>
                ${list.map(e => `<tr>
                    <td>${esc(e.month || '')} ${esc(e.year || '')}</td>
                    <td>${esc(e.reason || '—')}</td>
                    <td>${esc(e.grantedBy || '')}<div class="su-muted" style="font-size:0.75rem;">${fmtDateTime(e.grantedAt)}</div></td>
                    <td><button type="button" class="su-linkbtn" style="color:#b91c1c;" data-su="excRevoke" data-key="${esc(e.key)}">Revocar</button></td>
                </tr>`).join('')}
            </tbody></table>` : '<div class="su-muted">Este estudiante no tiene meses exonerados.</div>'}
            <div class="su-excform">
                <select id="suExcMonth" class="su-input" style="width:auto;">
                    ${MESES.map((m, i) => `<option value="${i}"${i === nowM ? ' selected' : ''}>${m}</option>`).join('')}
                </select>
                <input id="suExcYear" type="number" class="su-input" style="width:90px;" value="${SU.year}" min="2024" max="2100">
                <input id="suExcReason" type="text" class="su-input" style="flex:1;min-width:160px;" placeholder="Motivo (obligatorio)" maxlength="300">
                <button type="button" class="su-btn" style="background:#7c3aed;" data-su="excGrant">Autorizar excepción</button>
            </div>`;
    }

    // ───────────────────────── payments list ─────────────────────────

    function paymentConcept(p) {
        const parts = [];
        const pt = p.paymentType;
        if (pt === 'hourly') parts.push('Por horas');
        else if (pt && pt !== 'monthly') {
            const name = (typeof PaymentConfig !== 'undefined' && PaymentConfig.paymentTypes?.[pt]?.name) || pt;
            parts.push(name + (p.installment ? ` (${p.installment})` : ''));
        }
        if (Array.isArray(p.lineItems) && p.lineItems.length) {
            parts.push(p.lineItems.map(li => `${li.concept}${li.amount ? ' ' + money(li.amount) : ''}`).join(' + '));
        } else {
            if (p.matriculaAmount) parts.push(`Matrícula ${money(p.matriculaAmount)}`);
            if (p.certificadoAmount) parts.push(`Certificado ${money(p.certificadoAmount)}`);
            if (p.otroAmount) parts.push(`${p.otroConcepto || 'Otro'} ${money(p.otroAmount)}`);
        }
        if (!parts.length) parts.push('Mensualidad');
        return parts.join(' · ');
    }

    function renderPayments(s) {
        const recs = studentPaymentRecords(s.id);
        const sales = isSales();
        const owner = isOwner();
        // group by masterPaymentId (multi-month) / mixedGroupId (cash + transfer)
        const groups = new Map();
        recs.forEach(p => {
            const key = p.masterPaymentId || p.mixedGroupId || p.id;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(p);
        });
        const ordered = [...groups.entries()].map(([key, items]) => {
            items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) ||
                (Number(a.year) - Number(b.year)) || (MESES.indexOf(a.month) - MESES.indexOf(b.month)));
            const last = items.reduce((m, p) => (String(p.date || '') > m ? String(p.date || '') : m), '');
            return { key, items, last };
        }).sort((a, b) => b.last.localeCompare(a.last));

        const totalAll = recs.reduce((a, p) => a + (Number(p.amount) || 0), 0);
        const header = `
            <div class="su-row-between">
                <h4 class="su-h4" style="margin:0;">Pagos registrados (${recs.length}) · ${money(totalAll)}</h4>
                <span class="su-muted" style="font-size:0.75rem;" title="El módulo de Pagos descarta los pagos anulados al cargar; por eso tampoco aparecen aquí.">ⓘ los anulados no aparecen</span>
            </div>`;
        if (!recs.length) return header + '<div class="su-empty">Sin pagos registrados.</div>';

        const rows = ordered.map(g => {
            const multi = g.items.length > 1;
            const kind = g.items[0].masterPaymentId ? 'Pago de varios meses' : g.items[0].mixedGroupId ? 'Pago mixto' : '';
            const gTotal = g.items.reduce((a, p) => a + (Number(p.amount) || 0), 0);
            const head = multi ? `<tr class="su-grouphead"><td colspan="8">${esc(kind || 'Grupo')} · ${g.items.length} registros · ${money(gTotal)}</td></tr>` : '';
            return head + g.items.map(p => {
                const cancelled = p.status === 'cancelled';
                const base = p.baseAmount !== undefined && Number(p.baseAmount) !== Number(p.amount)
                    ? `<div class="su-muted" style="font-size:0.75rem;" title="Parte de mensualidad (cuenta para «pagó el mes»)">mensualidad ${money(p.baseAmount)}</div>` : '';
                const ces = p.cesantiasStatus === 'pending' ? ' <span class="su-chip" style="background:#ede9fe;color:#5b21b6;border-color:#ddd6fe;">📋 cesantías por recibir</span>' : '';
                const inv = p.invoiceNumber
                    ? `<button type="button" class="su-linkbtn" data-su="inv" data-pid="${esc(p.id)}" title="Ver la factura. Si no existe en la base de datos, Pagos la vuelve a generar (escribe).">🧾 ${esc(p.invoiceNumber)}</button>`
                    : (sales ? '<span class="su-muted">—</span>'
                        : `<button type="button" class="su-linkbtn" style="color:#b45309;" data-su="inv" data-pid="${esc(p.id)}" data-new="1" title="Este pago no tiene factura: al abrirla se GENERA una nueva con número nuevo.">🧾 generar</button>`);
                const rc = SU.receiptByPayment.get(p.id);
                const rcBtn = rc ? ` <button type="button" class="su-icon" data-su="rcView" data-pid="${esc(p.id)}"
                    title="Ver comprobante · ${esc(rc.provider || '')} ref ${esc(rc.reference || '—')} · ${esc(rc.dateIso || '')} · leído por ${esc(rc.readBy || '')}">📎</button>` : '';
                const acts = owner ? `
                    <button type="button" class="su-icon" data-su="editPay" data-pid="${esc(p.id)}" title="Editar pago (solo admin@)">✏️</button>
                    <button type="button" class="su-icon" data-su="delPay" data-pid="${esc(p.id)}" title="Anular pago y factura (solo admin@)">🗑️</button>` : '';
                return `<tr class="${multi ? 'su-grouprow' : ''}"${cancelled ? ' style="text-decoration:line-through;color:#9ca3af;"' : ''}>
                    <td>${fmtDateTime(p.date)}</td>
                    <td>${esc(p.month || '')} ${esc(p.year || '')}</td>
                    <td>${esc(paymentConcept(p))}${p.notes ? `<div class="su-muted" style="font-size:0.75rem;">${esc(p.notes)}</div>` : ''}</td>
                    <td style="text-align:right;white-space:nowrap;"><b>${money(p.amount)}</b>${base}</td>
                    <td>${esc(p.method || '—')}${p.bank ? ' · ' + esc(p.bank) : ''}${ces}</td>
                    <td style="white-space:nowrap;">${inv}${rcBtn}</td>
                    <td>${userLabel(p.registeredBy)}${p.lastEditedBy ? `<div class="su-muted" style="font-size:0.75rem;">editado: ${esc(p.lastEditedBy)}</div>` : ''}</td>
                    <td style="white-space:nowrap;">${acts}</td>
                </tr>`;
            }).join('');
        }).join('');

        return header + `
            <div class="su-tablewrap"><table class="su-table">
                <thead><tr><th>Fecha</th><th>Mes</th><th>Concepto</th><th style="text-align:right;">Monto</th>
                    <th>Método</th><th>Factura</th><th>Registró</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>`;
    }

    // ───────────────────────── actions (thin wrappers) ─────────────────────────

    // opts (📎 Comprobante): prefill() fills the freshly opened modal; afterSave() runs once it closed = saved.
    async function openPayment(id, opts = {}) {
        if (!canWrite()) return;
        if (!window.PricingManager?.loaded) {
            notify('⏳ Los precios aún no cargan; el pago no se puede validar. Usa ↻ Recargar.', 'warning');
            return;
        }
        await ensureLoaded();
        if (typeof window.showPaymentModal !== 'function' || typeof window.processPayment !== 'function') {
            notify('❌ El módulo de Pagos no está disponible', 'error');
            return;
        }
        window.showPaymentModal(id);
        const modal = $('paymentModal');
        const form = $('paymentForm');
        if (!modal || !form) return;
        modal.style.zIndex = LIFT_Z;
        // Same validated path as Pagos (anti-fraud, pricing, books, invoice), then refresh.
        form.onsubmit = async (e) => {
            e.preventDefault();
            await window.processPayment(id);
            if (!$('paymentModal')) { // closed = saved
                await refresh(id, { reload: true });
                if (typeof opts.afterSave === 'function') await opts.afterSave();
            }
        };
        if (typeof opts.prefill === 'function') {
            try { opts.prefill(); } catch (err) { console.error('Prefill del pago:', err); notify('⚠️ No pude llenar todo el formulario: revisa los campos', 'warning'); }
        }
    }

    async function openEdit(id) {
        if (!canWrite()) return;
        const st = window.StudentManager.students.get(id);
        if (!st || typeof window.renderStudentForm !== 'function' || typeof window.saveStudentForm !== 'function') return;
        $('studentFormModal')?.remove();
        if (window.GroupsManager2) {
            try { await window.GroupsManager2.init(true); } catch (e) { console.warn('Grupos 2.0:', e); }
        }
        // showStudentForm needs #studentsContainer, so mount the same form in <body>
        document.body.insertAdjacentHTML('beforeend', window.renderStudentForm(st));
        const modal = $('studentFormModal');
        if (modal) modal.style.zIndex = LIFT_Z;
        const form = $('studentForm');
        if (!form) return;
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = $('stuSubmitBtn');
            if (btn && btn.disabled) return;
            if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }
            try {
                await window.saveStudentForm(id);
            } catch (err) {
                console.error('Editar datos:', err);
            }
            // saveStudentForm swallows its own errors and leaves the modal open (PLAN R10)
            if ($('studentFormModal')) {
                if (btn) { btn.disabled = false; btn.textContent = 'Actualizar Estudiante'; }
            } else {
                refresh(id);
            }
        };
    }

    async function toggleStudent(id) {
        if (!canToggle()) {
            notify('🚫 No tienes permiso para activar o inactivar estudiantes (pídelo al Director).', 'error');
            return;
        }
        const st = window.StudentManager.students.get(id);
        if (!st) return;
        const done = (msg) => {
            try { window.syncStatusToTutorBox?.(id); } catch (e) { console.warn(e); }
            notify(msg, 'success');
            refresh(id);
        };
        if (st.status !== 'inactive') {
            if (typeof window.renderInactiveModal !== 'function') return;
            $('inactiveModal')?.remove();
            document.body.insertAdjacentHTML('beforeend', window.renderInactiveModal(id));
            const modal = $('inactiveModal');
            if (modal) modal.style.zIndex = LIFT_Z;
            const dateInput = $('inactiveDate');
            if (dateInput) dateInput.value = today(); // Colombia date (the stock modal uses UTC)
            const form = $('inactiveForm');
            if (!form) return;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                if (btn && btn.disabled) return;
                if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }
                try {
                    await window.StudentManager.toggleStudentStatus(id, {
                        date: $('inactiveDate').value,
                        reason: $('inactiveReason').value,
                        notes: $('inactiveNotes').value
                    });
                    window.closeInactiveModal?.();
                    done('📋 Estado actualizado');
                } catch (err) {
                    console.error('Inactivar:', err);
                    notify('❌ No se pudo cambiar el estado: ' + (err.message || err), 'error');
                    if (btn) { btn.disabled = false; btn.textContent = 'Marcar Inactivo'; }
                }
            };
        } else if (confirm('¿Reactivar este estudiante?')) {
            try {
                await window.StudentManager.toggleStudentStatus(id, { reason: 'Reactivado', notes: 'Estudiante reactivado' });
                done('✅ Estudiante reactivado');
            } catch (err) {
                console.error('Reactivar:', err);
                notify('❌ No se pudo cambiar el estado: ' + (err.message || err), 'error');
            }
        }
    }

    async function grantException(id) {
        if (!canExceptions()) return;
        const mi = parseInt($('suExcMonth')?.value, 10);
        const y = parseInt($('suExcYear')?.value, 10);
        const reason = ($('suExcReason')?.value || '').trim();
        if (isNaN(mi) || mi < 0 || mi > 11 || isNaN(y) || y < 2020 || y > 2100) { notify('Mes o año inválido', 'error'); return; }
        if (!reason) { notify('Escribe el motivo de la excepción', 'warning'); return; }
        if (window.PaymentExceptionsManager.isExempt(id, mi, y)) { notify(`${MESES[mi]} ${y} ya está exonerado`, 'info'); return; }
        const st = window.StudentManager.students.get(id);
        if (!confirm(`¿Exonerar ${MESES[mi]} ${y} a ${st?.nombre || 'este estudiante'}?\n\nMotivo: ${reason}\n\nEl mes deja de exigirse para el orden de pagos. No registra dinero.`)) return;
        const ok = await window.PaymentExceptionsManager.grant(id, mi, y, MESES[mi], reason);
        if (ok) refresh(id);
    }

    async function revokeException(id, key) {
        if (!canExceptions() || !key) return;
        const ex = window.PaymentExceptionsManager.map.get(`${id}|${key}`);
        if (!confirm(`¿Revocar la excepción de ${ex?.month || key} ${ex?.year || ''}?`)) return;
        const ok = await window.PaymentExceptionsManager.revoke(id, key);
        notify(ok ? '✅ Excepción revocada' : '❌ No se pudo revocar la excepción', ok ? 'success' : 'error');
        refresh(id);
    }

    function selectStudent(id) {
        SU.selectedId = id;
        SU.anchorAfter = null;
        lsSet(LS_LAST, id);
        document.querySelectorAll('#suList .su-item').forEach(b =>
            b.classList.toggle('su-item-on', b.dataset.id === id));
        renderFicha();
        if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
            $('suFicha')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async function onClick(e) {
        // OK · S · T · 📅 acuerdo (cyclePagoOK, students.js) may change acuerdoPago → recompute the Cobranza card
        if (e.target.closest && e.target.closest('[id^="pagoOK-"]')) {
            setTimeout(() => { if (viewIsOpen()) refresh(); }, 1500);
        }
        const el = e.target.closest('[data-su]');
        if (!el || el.disabled) return;
        const act = el.dataset.su;
        const id = SU.selectedId;
        try {
            switch (act) {
                case 'pick': selectStudent(el.dataset.id); break;
                case 'pay': await openPayment(id); break;
                case 'receipt': openReceiptModal(id); break;
                case 'rcView': await viewReceipt(el.dataset.pid); break;
                case 'edit': await openEdit(id); break;
                case 'toggle': await toggleStudent(id); break;
                case 'notes': if (canWrite()) window.openStudentNotes?.(id); break;
                case 'paz': await window.generatePazYSalvo?.(id); break;
                case 'wa': await window.sendPaymentReminder?.(id); break;
                case 'exc': $('suExcCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
                case 'excGrant': await grantException(id); break;
                case 'excRevoke': await revokeException(id, el.dataset.key); break;
                case 'cobWa': cobWhatsApp(); break; // window.open must stay synchronous in the click
                case 'cobCopy': await cobCopy(); break;
                case 'cobMark': { const r = currentRow(); if (r) await logSent(r.s.id, r.bucket, 'manual'); break; }
                case 'cobUndo': await unlogSent(id); break;
                case 'cobNext': goNext(); break;
                case 'cobCard': openCardModal(); break;
                case 'refresh':
                    el.disabled = true; el.textContent = '⏳ Recargando...';
                    await refresh(id, { reload: true });
                    notify('↻ Datos recargados', 'success');
                    break;
                case 'openStudents': if (canOpen('students')) { stopLift(); window.openModule?.('Students'); } break;
                case 'openPayments': if (canOpen('payments')) { stopLift(); window.openModule?.('Payments'); } break;
                case 'inv':
                    if (el.dataset.new === '1') {
                        if (isSales()) return;
                        if (!confirm('Este pago no tiene factura. Abrirla GENERA una factura nueva con número nuevo. ¿Continuar?')) return;
                    }
                    await window.viewPaymentInvoice?.(el.dataset.pid);
                    if (el.dataset.new === '1') setTimeout(() => refresh(id, { reload: true }), 1500);
                    break;
                case 'editPay':
                    if (isOwner()) await window.openEditPaymentModal?.(el.dataset.pid, id);
                    break;
                case 'delPay':
                    if (isOwner()) await window.confirmDeletePayment?.(el.dataset.pid, id);
                    break;
            }
        } catch (err) {
            console.error('Estudiantes unificado —', act, err);
            notify('❌ ' + (err.message || err), 'error');
        }
    }

    // ───────────────────────── styles ─────────────────────────

    function injectStyles() {
        if ($('suStyles')) return;
        const css = document.createElement('style');
        css.id = 'suStyles';
        css.textContent = `
        .su-wrap { --su-border:#e5e7eb; --su-muted:#6b7280; --su-accent:#3b82f6; color:#111827; }
        .su-wrap * { box-sizing:border-box; }
        .su-top { display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.75rem; }
        .su-top h2 { margin:0; font-size:1.35rem; }
        .su-grid { display:grid; grid-template-columns:320px minmax(0,1fr); gap:1rem; align-items:start; }
        .su-left { position:sticky; top:0.5rem; background:#fff; border:1px solid var(--su-border); border-radius:8px; padding:0.75rem; }
        .su-input { width:100%; padding:0.5rem 0.6rem; border:1px solid #d1d5db; border-radius:6px; font-size:0.9rem; background:#fff; }
        .su-list { margin-top:0.5rem; max-height:calc(100vh - 260px); overflow-y:auto; display:flex; flex-direction:column; gap:4px; }
        .su-item { text-align:left; background:#fff; border:1px solid var(--su-border); border-radius:6px; padding:0.45rem 0.55rem; cursor:pointer; font:inherit; width:100%; }
        .su-item:hover { border-color:var(--su-accent); background:#f8fafc; }
        .su-item-on { border-color:var(--su-accent); background:#eff6ff; box-shadow:inset 3px 0 0 var(--su-accent); }
        .su-item-off { background:#fef2f2; }
        .su-item-top { display:flex; justify-content:space-between; gap:0.4rem; align-items:center; }
        .su-item-name { font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .su-item-sub { font-size:0.75rem; color:var(--su-muted); margin-top:2px; }
        .su-chip { display:inline-block; border:1px solid; border-radius:999px; padding:0.05rem 0.45rem; font-size:0.72rem; font-weight:700; white-space:nowrap; }
        .su-muted { color:var(--su-muted); }
        .su-empty { color:var(--su-muted); text-align:center; padding:1rem; font-size:0.9rem; }
        .su-card { background:#fff; border:1px solid var(--su-border); border-radius:8px; padding:1rem; margin-bottom:1rem; }
        .su-head { display:flex; gap:0.75rem; align-items:flex-start; flex-wrap:wrap; }
        .su-photo { width:56px; height:56px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.6rem; color:#9ca3af; flex-shrink:0; }
        .su-photo img { width:100%; height:100%; object-fit:cover; }
        .su-name { margin:0; font-size:1.2rem; display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; }
        .su-headlinks { display:flex; flex-direction:column; gap:0.25rem; align-items:flex-end; }
        .su-warn { margin-top:0.3rem; background:#fef2f2; color:#991b1b; border:1px solid #fecaca; border-radius:6px; padding:0.3rem 0.5rem; font-size:0.8rem; }
        .su-note { margin-top:0.5rem; background:#fffbeb; color:#92400e; border:1px solid #fde68a; border-radius:6px; padding:0.35rem 0.6rem; font-size:0.8rem; }
        .su-actions { display:flex; flex-wrap:wrap; gap:0.4rem; margin:0.9rem 0 0.25rem; }
        .su-btn { color:#fff; border:none; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.85rem; font-weight:600; cursor:pointer; }
        .su-btn:hover:not(:disabled) { opacity:0.85; }
        .su-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .su-linkbtn { background:none; border:none; color:#2563eb; cursor:pointer; font-size:0.82rem; padding:0.1rem 0.2rem; font-weight:600; }
        .su-linkbtn:hover { text-decoration:underline; }
        .su-link { color:#059669; }
        .su-icon { background:#f3f4f6; border:1px solid var(--su-border); border-radius:6px; cursor:pointer; padding:0.2rem 0.4rem; font-size:0.95rem; }
        .su-cols { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-top:0.75rem; }
        .su-h4 { margin:0.5rem 0 0.4rem; font-size:0.95rem; color:#374151; }
        .su-field { display:flex; gap:0.5rem; padding:0.28rem 0; border-bottom:1px dashed #f1f5f9; font-size:0.88rem; align-items:baseline; }
        .su-lbl { width:118px; flex-shrink:0; color:var(--su-muted); font-size:0.8rem; }
        .su-val { flex:1; min-width:0; overflow-wrap:anywhere; }
        .su-tag { background:#10b981; color:#fff; padding:0.1rem 0.4rem; border-radius:4px; font-size:0.78rem; font-weight:600; }
        .su-code { background:#fef3c7; color:#92400e; padding:0.1rem 0.45rem; border-radius:6px; font-family:monospace; font-weight:800; letter-spacing:0.06em; border:1px solid #fcd34d; }
        .su-dp2 { width:64px; padding:0.25rem; text-align:center; border-radius:4px; font-weight:800; border:1px solid #d1d5db; color:#7c3aed; background:#faf5ff; }
        .su-dp2-zero { border:2px solid #6d28d9; color:#fff; background:#7c3aed; }
        .su-notes { display:flex; flex-direction:column; gap:0.35rem; }
        .su-noteitem { background:#f9fafb; border:1px solid var(--su-border); border-radius:6px; padding:0.4rem 0.6rem; font-size:0.85rem; }
        .su-row-between { display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.6rem; }
        .su-months { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:6px; }
        .su-month { border:1px solid rgba(0,0,0,0.06); border-radius:6px; padding:0.4rem; min-height:62px; }
        .su-month-now { outline:2px solid #1f2937; outline-offset:1px; }
        .su-month-name { font-weight:800; font-size:0.85rem; }
        .su-month-kind { font-size:0.72rem; font-weight:600; }
        .su-month-amt { font-size:0.72rem; margin-top:2px; }
        .su-legend { display:flex; flex-wrap:wrap; gap:0.3rem 0.8rem; margin-top:0.6rem; font-size:0.72rem; color:#374151; }
        .su-legend i { display:inline-block; width:11px; height:11px; border-radius:3px; border:1px solid; margin-right:4px; vertical-align:-1px; }
        .su-tablewrap { overflow-x:auto; }
        .su-table { width:100%; border-collapse:collapse; font-size:0.83rem; }
        .su-table th { background:#f3f4f6; text-align:left; padding:0.45rem 0.5rem; font-weight:600; white-space:nowrap; }
        .su-table td { padding:0.45rem 0.5rem; border-top:1px solid var(--su-border); vertical-align:top; }
        .su-grouphead td { background:#f8fafc; font-size:0.75rem; font-weight:700; color:#475569; }
        .su-grouprow td:first-child { border-left:3px solid #cbd5e1; }
        .su-excform { display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.7rem; align-items:center; }
        .su-b-suspend   { color:#991b1b; background:#fee2e2; border-color:#fca5a5; }
        .su-b-late      { color:#b91c1c; background:#fee2e2; border-color:#fecaca; }
        .su-b-today     { color:#c2410c; background:#ffedd5; border-color:#fed7aa; }
        .su-b-soon      { color:#b45309; background:#fef3c7; border-color:#fde68a; }
        .su-b-remind    { color:#a16207; background:#fef9c3; border-color:#fef08a; }
        .su-b-prev      { color:#6b7280; background:#f3f4f6; border-color:#e5e7eb; }
        .su-b-agreement { color:#1e40af; background:#dbeafe; border-color:#bfdbfe; }
        .su-b-ok        { color:#065f46; background:#d1fae5; border-color:#a7f3d0; }
        .su-sent { font-size:0.7rem; font-weight:700; color:#047857; white-space:nowrap; }
        .su-cob { margin-top:0.75rem; border:1px solid var(--su-border); border-left:4px solid #9ca3af; border-radius:8px; padding:0.65rem 0.75rem; background:#fcfcfd; }
        .su-cob-suspend { border-left-color:#991b1b; } .su-cob-late { border-left-color:#b91c1c; }
        .su-cob-today { border-left-color:#c2410c; } .su-cob-soon { border-left-color:#b45309; }
        .su-cob-remind { border-left-color:#a16207; } .su-cob-prev { border-left-color:#6b7280; }
        .su-cob-agreement { border-left-color:#1e40af; }
        .su-cob-why { font-size:0.85rem; color:#374151; margin-bottom:0.4rem; }
        .su-cob-text { min-height:96px; resize:vertical; font-family:inherit; font-size:0.85rem; line-height:1.35; }
        .su-cob-text[readonly] { background:#f9fafb; }
        .su-cob-actions { display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center; margin-top:0.45rem; }
        .su-cob-line { margin-top:0.75rem; border:1px solid var(--su-border); border-radius:8px; padding:0.45rem 0.7rem; font-size:0.85rem; font-weight:600; }
        .su-cob-line.su-muted { font-weight:500; background:#f9fafb; }
        .su-sent-line { font-size:0.8rem; font-weight:700; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:0.25rem 0.5rem; margin-bottom:0.4rem; }
        .su-card-modal { position:fixed; inset:0; z-index:10001; background:rgba(15,23,42,0.6); display:flex; align-items:center; justify-content:center; padding:1rem; color:#111827; --su-border:#e5e7eb; --su-muted:#6b7280; --su-accent:#3b82f6; }
        .su-card-modal * { box-sizing:border-box; }
        .su-card-box { background:#fff; border-radius:12px; box-shadow:0 20px 50px rgba(0,0,0,0.35); display:flex; gap:1rem; padding:1rem; max-width:min(980px, 100%); max-height:calc(100vh - 2rem); overflow:auto; }
        .su-card-preview { flex:0 0 auto; display:flex; align-items:flex-start; justify-content:center; }
        .su-card-preview canvas { display:block; width:auto; height:min(650px, calc(100vh - 4rem)); max-width:520px; border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 4px 14px rgba(0,0,0,0.15); }
        .su-card-side { width:330px; display:flex; flex-direction:column; gap:0.6rem; }
        .su-card-lbl { display:flex; flex-direction:column; gap:0.2rem; font-size:0.78rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.02em; }
        .su-card-lbl .su-input { text-transform:none; font-weight:500; color:#111827; letter-spacing:normal; }
        .su-card-actions { display:flex; flex-wrap:wrap; gap:0.4rem; }
        .su-card-hint { font-size:0.78rem; color:#6b7280; margin:0; line-height:1.35; }
        .su-card-msg { font-size:0.82rem; font-weight:600; min-height:1.2em; }
        .su-card-msg-ok { color:#047857; } .su-card-msg-warn { color:#b45309; } .su-card-msg-err { color:#b91c1c; }
        @media (max-width: 760px) {
            .su-card-box { flex-direction:column; }
            .su-card-preview canvas { width:100%; height:auto; max-width:100%; }
            .su-card-side { width:100%; }
        }
        .su-rc-box { width:min(1000px, 100%); }
        .su-rc-left { flex:1 1 360px; min-width:240px; display:flex; }
        .su-rc-drop { flex:1; border:2px dashed #cbd5e1; border-radius:10px; padding:1rem; text-align:center; min-height:320px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; }
        .su-rc-drop.su-rc-over { border-color:#4f46e5; background:#eef2ff; }
        .su-rc-preview { font-size:0.88rem; line-height:1.5; }
        .su-rc-preview img { display:block; max-width:100%; max-height:calc(100vh - 9rem); border-radius:8px; border:1px solid #e5e7eb; margin:0 auto; }
        .su-rc-side { width:390px; }
        .su-rc-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.35rem 0.5rem; }
        .su-rc-grid label { display:flex; flex-direction:column; gap:0.15rem; font-size:0.7rem; font-weight:700; color:#6b7280; }
        .su-rc-grid .su-input { padding:0.3rem 0.45rem; font-size:0.85rem; color:#111827; font-weight:500; }
        .su-rc-checks { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.2rem; font-size:0.8rem; }
        .su-rc-checks li { padding:0.2rem 0.45rem; border-radius:6px; }
        .su-rc-ok { background:#ecfdf5; color:#065f46; }
        .su-rc-warn { background:#fffbeb; color:#92400e; }
        .su-rc-stop { background:#fef2f2; color:#991b1b; font-weight:700; }
        .su-rc-months { font-size:0.82rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:0.35rem 0.5rem; color:#1e3a8a; }
        .su-rc-banner { background:#ecfdf5; border:2px solid #10b981; border-radius:8px; padding:0.6rem 0.75rem; margin-bottom:1rem; font-size:0.88rem; color:#065f46; line-height:1.4; }
        @media (max-width: 760px) { .su-rc-side { width:100%; } .su-rc-drop { min-height:200px; } }
        .su-foot { font-size:0.78rem; color:var(--su-muted); border-top:1px solid var(--su-border); padding-top:0.6rem; margin-top:0.5rem; }
        @media (max-width: 1100px) { .su-cols { grid-template-columns:1fr; } }
        @media (max-width: 860px) {
            .su-grid { grid-template-columns:1fr; }
            .su-left { position:static; }
            .su-list { max-height:40vh; }
            .su-months { grid-template-columns:repeat(3, minmax(0,1fr)); }
            .su-headlinks { flex-direction:row; align-items:center; }
        }`;
        document.head.appendChild(css);
    }

    // ───────────────────────── entry point (school-buttons.js → openModule) ─────────────────────────

    window.loadStudentsUnifiedTab = async function () {
        const container = $('studentsUnifiedContainer');
        if (!container) { console.error('❌ studentsUnifiedContainer not found'); return; }

        const pe = window.PermissionEnforcer;
        if (pe && pe.isReady && !pe.hasPermission('studentsUnified')) {
            container.innerHTML = '<div style="padding:3rem;text-align:center;color:#6b7280;">🚫 No tienes permiso para este módulo (Admin → Ver Permisos).</div>';
            return;
        }
        if (!window.StudentManager || !window.PaymentManager) {
            container.innerHTML = '<div style="padding:2rem;text-align:center;color:#ef4444;">❌ Estudiantes o Pagos no están disponibles</div>';
            return;
        }
        if (SU.loading) return;
        SU.loading = true;
        injectStyles();

        try {
            await ensureLoaded();
        } catch (e) {
            console.error('Estudiantes unificado — carga:', e);
            container.innerHTML = `<div style="padding:2rem;text-align:center;color:#ef4444;">❌ Error cargando datos: ${esc(e.message || e)}</div>`;
            SU.loading = false;
            return;
        }
        SU.loading = false;

        const savedStatus = lsGet(LS_STATUS);
        SU.status = ['active', 'inactive', 'all'].includes(savedStatus) ? savedStatus : 'active';
        SU.year = new Date().getFullYear();
        SU.search = ''; // the search box is rebuilt empty → the filter must start empty too (founder, 23 Oct: "solo me muestra 1")
        SU.bucket = ''; // same lesson: always open on "Cobranza: Todos" (the choice is stored in LS_BUCKET but not restored)
        SU.hideSent = lsGet(LS_HIDESENT) !== '0';
        SU.listIds = [];
        SU.anchorAfter = null;
        SU.statusCache.clear();
        await loadSentLog();
        await loadReceipts();
        computeCobros();
        const last = lsGet(LS_LAST);
        SU.selectedId = last && window.StudentManager.students.has(last) ? last : null;

        container.innerHTML = `
            <div class="su-wrap">
                <div class="su-top">
                    <h2>🧑‍🎓 Estudiantes unificado</h2>
                    <span class="su-muted" style="font-size:0.85rem;">Ficha del estudiante y sus pagos en una sola pantalla</span>
                </div>
                <div class="su-grid">
                    <aside class="su-left">
                        <input id="suSearch" class="su-input" type="search" autocomplete="off"
                               placeholder="🔍 Nombre, código, teléfono, grupo, documento…">
                        <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;">
                            <select id="suStatus" class="su-input" style="flex:1;">
                                <option value="active"${SU.status === 'active' ? ' selected' : ''}>Activos</option>
                                <option value="inactive"${SU.status === 'inactive' ? ' selected' : ''}>Inactivos</option>
                                <option value="all"${SU.status === 'all' ? ' selected' : ''}>Todos</option>
                            </select>
                            <span id="suCount" class="su-muted" style="font-size:0.78rem;white-space:nowrap;"></span>
                        </div>
                        <select id="suBucket" class="su-input" style="margin-top:0.5rem;" title="Condiciones de cobro (misma regla que Cobros en tutorbox.app)"></select>
                        <label class="su-muted" style="display:flex;gap:0.35rem;align-items:center;font-size:0.8rem;margin-top:0.35rem;">
                            <input type="checkbox" id="suHideSent"${SU.hideSent ? ' checked' : ''}> ocultar enviados hoy
                        </label>
                        <div id="suList" class="su-list"></div>
                    </aside>
                    <section id="suFicha"></section>
                </div>
                <p class="su-foot">ⓘ <b>Cómo funciona:</b> esta vista no guarda nada propio. Muestra los mismos datos de
                    Estudiantes y Pagos, y cada botón usa el mismo formulario y las mismas validaciones de esos módulos
                    (antifraude, factura, auditoría). Lo que cambies aquí aparece allá, y al revés (usa ↻ Recargar para
                    ver movimientos hechos por otra persona en otra sesión).</p>
            </div>`;

        container.addEventListener('click', onClick);
        container.addEventListener('change', (e) => {
            if (e.target.id === 'suStatus') {
                SU.status = e.target.value;
                lsSet(LS_STATUS, SU.status);
                renderList();
            } else if (e.target.id === 'suYear') {
                SU.year = parseInt(e.target.value, 10) || new Date().getFullYear();
                const s = window.StudentManager.students.get(SU.selectedId);
                const card = $('suGridCard');
                if (s && card) card.innerHTML = renderGrid(s);
            } else if (e.target.id === 'suBucket') {
                SU.bucket = e.target.value || '';
                lsSet(LS_BUCKET, SU.bucket);
                renderList();
                renderFicha();
            } else if (e.target.id === 'suHideSent') {
                SU.hideSent = !!e.target.checked;
                lsSet(LS_HIDESENT, SU.hideSent ? '1' : '0');
                renderList();
            } else if (e.target.classList && e.target.classList.contains('su-dp2')) {
                // saveDiaPago2 (students.js) updates the cache asynchronously → recompute the Cobranza card
                setTimeout(() => { if (viewIsOpen()) refresh(); }, 1200);
            }
        });
        container.addEventListener('input', (e) => {
            if (e.target.id === 'suCobText') {
                SU.drafts.set(e.target.dataset.key, e.target.value);
            } else if (e.target.id === 'suSender') {
                lsSet(LS_SENDER, e.target.value);
                const r = currentRow();
                const ta = $('suCobText');
                if (r && ta && !SU.drafts.has(`${r.s.id}|${r.bucket}`)) ta.value = cobroText(r);
            }
        });
        let t = null;
        $('suSearch').addEventListener('input', (e) => {
            clearTimeout(t);
            t = setTimeout(() => { SU.search = e.target.value || ''; renderList(); }, 150);
        });

        liftModals();
        renderList();
        renderFicha();

        // Pricing may still be loading in the background on a slow network — enable "Registrar pago" when ready.
        if (!window.PricingManager?.loaded && window.PricingManager) {
            window.PricingManager.init().then(() => { if (viewIsOpen()) renderFicha(); }).catch(() => {});
        }
    };

    // exposed for the console / reviewer
    window.StudentsUnified = { refresh, ensureLoaded, liftModals, stopLift,
        receipts: { suggestMonths, receiptChecks, loadReceipts, SCHOOL_ACCOUNTS } };
})();
