// ==================== BANK-RECONCILIATION.JS ====================
// Anti-fraud Phase 5: reconcile non-cash income vs bank statements.
// Every Transferencia/Nequi/Bancolombia income recorded in the CRM
// (tuition payments, tienda sales, otros ingresos) is listed here so the
// owner can tick it off against the real bank/Nequi statement. Money that
// was collected in cash but recorded as "transfer to a personal account"
// shows up as a transfer that is NOT in the statement → mark "No está" →
// security alert + permanent record.
// - bankReconciliations/{key}: verification mark per real-world transfer
//   (key = masterPaymentId when a multi-month payment was split, so one
//   bank transfer = one row). Admin/director only, enforced by rules.
// ================================================================

class BankReconciliationManagerClass {
    constructor() {
        this.marks = new Map();      // key -> { status: 'ok'|'missing', ... }
        this.rows = [];              // normalized income rows for current range
        this.usersByUid = new Map(); // uid -> display name/email
    }

    isBankAdmin() {
        const email = window.FirebaseData?.currentUser?.email;
        const role = window.userRole;
        return email === 'admin@ciudadbilingue.com' || role === 'admin' || role === 'director';
    }

    // ---------- data loading ----------

    async loadMarks() {
        const db = window.firebaseModules.database;
        const snap = await db.get(db.ref(window.FirebaseData.database, 'bankReconciliations'));
        this.marks.clear();
        if (snap.exists()) {
            Object.entries(snap.val()).forEach(([key, m]) => this.marks.set(key, m));
        }
    }

    async loadUsers() {
        if (this.usersByUid.size > 0) return;
        try {
            const db = window.firebaseModules.database;
            const snap = await db.get(db.ref(window.FirebaseData.database, 'users'));
            if (snap.exists()) {
                Object.entries(snap.val()).forEach(([uid, u]) => {
                    const p = u?.profile || {};
                    this.usersByUid.set(uid, p.name || p.nombre || p.email || uid.slice(0, 8));
                });
            }
        } catch (e) {
            console.warn('Could not load users for names:', e);
        }
    }

    // Normalize a bank label. Anything that isn't clearly Nequi/Bancolombia
    // still needs checking somewhere → bucket as 'Otro'.
    normalizeBank(value) {
        if (value === 'Nequi' || value === 'Bancolombia') return value;
        return 'Otro';
    }

    // Collect every non-cash income in [startDate, endDate] (YYYY-MM-DD,
    // inclusive) from payments + sales + otrosIngresos, grouped so that one
    // row = one expected line in the bank statement.
    async collectRows(startDate, endDate) {
        const db = window.firebaseModules.database;
        const inRange = (d) => d && d >= startDate && d <= endDate;
        const groups = new Map(); // key -> row

        // --- Tuition payments (multi-month split shares masterPaymentId) ---
        const paySnap = await db.get(db.ref(window.FirebaseData.database, 'payments'));
        if (paySnap.exists()) {
            Object.values(paySnap.val()).forEach(p => {
                if (!p || p.method !== 'Transferencia' || p.status === 'cancelled') return;
                const day = (p.date || '').slice(0, 10);
                if (!inRange(day)) return;
                const key = p.masterPaymentId || p.id;
                const student = window.StudentManager?.students?.get(p.studentId);
                let row = groups.get(key);
                if (!row) {
                    row = {
                        key,
                        sourceType: 'pago',
                        date: day,
                        time: (p.date || '').slice(11, 16),
                        bank: this.normalizeBank(p.bank),
                        amount: 0,
                        months: [],
                        desc: student?.nombre || p.studentId || 'Estudiante',
                        byUid: p.registeredBy || null
                    };
                    groups.set(key, row);
                }
                row.amount += Number(p.amount) || 0;
                if (p.month) row.months.push(`${p.month} ${p.year || ''}`.trim());
            });
        }

        // --- Tienda sales ---
        const salesSnap = await db.get(db.ref(window.FirebaseData.database, 'sales'));
        if (salesSnap.exists()) {
            Object.values(salesSnap.val()).forEach(s => {
                if (!s) return;
                const method = s.paymentMethod;
                if (method === 'Efectivo' || !method) return;
                const day = (s.date || '').slice(0, 10);
                if (!inRange(day)) return;
                groups.set(s.id, {
                    key: s.id,
                    sourceType: 'tienda',
                    date: day,
                    time: (s.date || '').slice(11, 16),
                    bank: this.normalizeBank(method),
                    amount: Number(s.total) || 0,
                    months: [],
                    desc: `Tienda${s.customerName ? ' - ' + s.customerName : ''} (${(s.items || []).length} prod.)`,
                    byEmail: s.cashier || null
                });
            });
        }

        // --- Otros ingresos ---
        const otrosSnap = await db.get(db.ref(window.FirebaseData.database, 'otrosIngresos'));
        if (otrosSnap.exists()) {
            Object.values(otrosSnap.val()).forEach(o => {
                if (!o) return;
                const method = o.metodoPago;
                if (method === 'Efectivo' || !method) return;
                if (!inRange(o.fecha)) return;
                groups.set(o.id, {
                    key: o.id,
                    sourceType: 'otro',
                    date: o.fecha,
                    time: (o.creadoEn || '').slice(11, 16),
                    bank: this.normalizeBank(method),
                    amount: Number(o.monto) || 0,
                    months: [],
                    desc: `Otro ingreso: ${o.concepto || ''}`,
                    byEmail: o.registradoPor || null
                });
            });
        }

        this.rows = Array.from(groups.values())
            .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
        return this.rows;
    }

    employeeLabel(row) {
        if (row.byEmail) return row.byEmail;
        if (row.byUid) return this.usersByUid.get(row.byUid) || row.byUid.slice(0, 8);
        return '—';
    }

    // ---------- verification marks ----------

    async setMark(key, status, note) {
        if (!this.isBankAdmin()) return;
        const row = this.rows.find(r => r.key === key);
        if (!row) return;
        try {
            const db = window.firebaseModules.database;
            const mark = {
                status, // 'ok' | 'missing'
                note: note || '',
                sourceType: row.sourceType,
                bank: row.bank,
                amount: row.amount,
                date: row.date,
                desc: row.desc,
                byEmail: window.FirebaseData?.currentUser?.email || 'unknown',
                at: new Date().toISOString()
            };
            await db.set(db.ref(window.FirebaseData.database, `bankReconciliations/${key}`), mark);
            this.marks.set(key, mark);

            if (status === 'missing') {
                if (typeof window.logSecurityAlert === 'function') {
                    await window.logSecurityAlert(
                        'bank-mismatch',
                        `Consignación NO encontrada en el banco: ${row.desc} - $${row.amount.toLocaleString('es-CO')} (${row.bank}, ${row.date}). ${note || ''}`,
                        {}
                    );
                }
            }
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    status === 'ok' ? 'Consignación verificada' : 'Consignación NO encontrada',
                    'bank-reconciliation', key,
                    `${row.desc} - $${row.amount.toLocaleString('es-CO')} (${row.bank}, ${row.date})`,
                    { after: mark }
                );
            }
            this.renderTable();
        } catch (error) {
            console.error('❌ Error saving reconciliation mark:', error);
            window.showNotification('❌ Error guardando verificación', 'error');
        }
    }

    async markOk(key) { await this.setMark(key, 'ok', ''); }

    async markMissing(key) {
        const note = prompt('¿Qué encontraste? (ej: "no aparece en Nequi", "monto distinto")') || '';
        await this.setMark(key, 'missing', note);
    }

    async clearMark(key) {
        if (!this.isBankAdmin()) return;
        try {
            const db = window.firebaseModules.database;
            await db.set(db.ref(window.FirebaseData.database, `bankReconciliations/${key}`), null);
            this.marks.delete(key);
            this.renderTable();
        } catch (error) {
            console.error('❌ Error clearing mark:', error);
        }
    }

    // ---------- UI ----------

    async showPanel() {
        if (!this.isBankAdmin()) {
            window.showNotification('🚫 Solo administración puede ver la conciliación bancaria', 'error');
            return;
        }

        const today = window.getLocalDate();
        const monthStart = today.slice(0, 8) + '01';

        document.getElementById('bankReconModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', `
            <div id="bankReconModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: white; border-radius: 12px; max-width: 1100px; width: 100%; max-height: 92vh; overflow-y: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">🏦 Conciliación Bancaria</h3>
                        <button onclick="document.getElementById('bankReconModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
                    </div>
                    <p style="font-size: 0.85rem; color: #6b7280; margin-top: 0;">
                        Compara cada consignación registrada en el CRM contra tu extracto de Nequi/Bancolombia.
                        Si un pago dice "Transferencia" pero NO está en tu cuenta, márcalo <strong>✗ No está</strong> — queda registrado y genera alerta.
                    </p>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; margin-bottom: 1rem;">
                        <div><label style="font-size: 0.75rem; color: #6b7280; display: block;">Desde</label>
                            <input type="date" id="bankReconStart" value="${monthStart}" style="padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 6px;"></div>
                        <div><label style="font-size: 0.75rem; color: #6b7280; display: block;">Hasta</label>
                            <input type="date" id="bankReconEnd" value="${today}" style="padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 6px;"></div>
                        <div><label style="font-size: 0.75rem; color: #6b7280; display: block;">Cuenta</label>
                            <select id="bankReconBank" onchange="window.BankReconManager.renderTable()" style="padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="">Todas</option>
                                <option value="Nequi">Nequi</option>
                                <option value="Bancolombia">Bancolombia</option>
                                <option value="Otro">Otro</option>
                            </select></div>
                        <div><label style="font-size: 0.75rem; color: #6b7280; display: block;">Estado</label>
                            <select id="bankReconStatus" onchange="window.BankReconManager.renderTable()" style="padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="">Todos</option>
                                <option value="pending">Pendiente</option>
                                <option value="ok">✓ Verificado</option>
                                <option value="missing">✗ No está</option>
                            </select></div>
                        <button onclick="window.BankReconManager.refresh()" class="btn btn-sm" style="background: #2563eb; color: white; padding: 0.5rem 1rem;">🔍 Buscar</button>
                        <button onclick="window.BankReconManager.exportCsv()" class="btn btn-sm" style="background: #10b981; color: white; padding: 0.5rem 1rem;">📊 CSV</button>
                    </div>
                    <div id="bankReconSummary"></div>
                    <div id="bankReconTable" style="overflow-x: auto;">
                        <div style="padding: 2rem; text-align: center; color: #6b7280;">Cargando...</div>
                    </div>
                </div>
            </div>
        `);

        await this.refresh();
    }

    async refresh() {
        const start = document.getElementById('bankReconStart')?.value;
        const end = document.getElementById('bankReconEnd')?.value;
        if (!start || !end) return;
        const tableEl = document.getElementById('bankReconTable');
        if (tableEl) tableEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">Cargando...</div>';
        await Promise.all([this.loadMarks(), this.loadUsers()]);
        await this.collectRows(start, end);
        this.renderTable();
    }

    filteredRows() {
        const bank = document.getElementById('bankReconBank')?.value || '';
        const status = document.getElementById('bankReconStatus')?.value || '';
        return this.rows.filter(r => {
            if (bank && r.bank !== bank) return false;
            const mark = this.marks.get(r.key);
            const st = mark ? mark.status : 'pending';
            if (status && st !== status) return false;
            return true;
        });
    }

    renderTable() {
        const summaryEl = document.getElementById('bankReconSummary');
        const tableEl = document.getElementById('bankReconTable');
        if (!tableEl) return;

        const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO');
        const rows = this.filteredRows();

        // Summary over the filtered set
        let totalOk = 0, totalMissing = 0, totalPending = 0;
        const bankTotals = {};
        rows.forEach(r => {
            bankTotals[r.bank] = (bankTotals[r.bank] || 0) + r.amount;
            const st = this.marks.get(r.key)?.status || 'pending';
            if (st === 'ok') totalOk += r.amount;
            else if (st === 'missing') totalMissing += r.amount;
            else totalPending += r.amount;
        });

        if (summaryEl) {
            const tile = (label, value, color) => `
                <div style="background: ${color}15; border: 1px solid ${color}; border-radius: 8px; padding: 0.6rem 1rem; min-width: 140px;">
                    <div style="font-size: 0.7rem; color: #6b7280;">${label}</div>
                    <div style="font-weight: 700; color: ${color};">${value}</div>
                </div>`;
            summaryEl.innerHTML = `
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem;">
                    ${Object.entries(bankTotals).map(([b, t]) => tile(b, fmt(t), '#2563eb')).join('')}
                    ${tile('✓ Verificado', fmt(totalOk), '#16a34a')}
                    ${tile('Pendiente', fmt(totalPending), '#f59e0b')}
                    ${tile('✗ No está', fmt(totalMissing), '#dc2626')}
                </div>`;
        }

        const SOURCE_LABEL = { pago: '🎓 Pago', tienda: '🛒 Tienda', otro: '📥 Otro ingreso' };

        // Group by day so each block can be checked against the statement's
        // transactions for that date.
        const byDay = new Map();
        rows.forEach(r => {
            if (!byDay.has(r.date)) byDay.set(r.date, []);
            byDay.get(r.date).push(r);
        });

        const blocks = Array.from(byDay.entries()).map(([day, dayRows]) => {
            const dayBankTotals = {};
            dayRows.forEach(r => { dayBankTotals[r.bank] = (dayBankTotals[r.bank] || 0) + r.amount; });
            const totalsLabel = Object.entries(dayBankTotals)
                .map(([b, t]) => `${b}: ${fmt(t)}`).join(' · ');

            const trs = dayRows.map(r => {
                const mark = this.marks.get(r.key);
                const st = mark ? mark.status : 'pending';
                const rowBg = st === 'missing' ? 'background: #fef2f2;' : (st === 'ok' ? 'opacity: 0.6;' : '');
                const statusCell = st === 'ok'
                    ? `<span style="color:#16a34a;">✓ ${mark.byEmail ? mark.byEmail.split('@')[0] : ''}</span>
                       <button onclick="window.BankReconManager.clearMark('${r.key}')" title="Deshacer" style="background:none;border:none;cursor:pointer;color:#9ca3af;">↩</button>`
                    : st === 'missing'
                    ? `<span style="color:#dc2626;" title="${(mark.note || '').replace(/"/g, '&quot;')}">✗ No está</span>
                       <button onclick="window.BankReconManager.clearMark('${r.key}')" title="Deshacer" style="background:none;border:none;cursor:pointer;color:#9ca3af;">↩</button>`
                    : `<button onclick="window.BankReconManager.markOk('${r.key}')" class="btn btn-sm" style="background:#16a34a;color:white;padding:2px 8px;font-size:0.7rem;">✓ Sí está</button>
                       <button onclick="window.BankReconManager.markMissing('${r.key}')" class="btn btn-sm" style="background:#dc2626;color:white;padding:2px 8px;font-size:0.7rem;">✗ No está</button>`;
                return `
                    <tr style="border-bottom: 1px solid #e5e7eb; ${rowBg}">
                        <td style="padding: 6px 8px; white-space: nowrap;">${r.time || ''}</td>
                        <td style="padding: 6px 8px;">${SOURCE_LABEL[r.sourceType] || r.sourceType}</td>
                        <td style="padding: 6px 8px;">${r.desc}${r.months.length ? ` <span style="color:#6b7280;font-size:0.75rem;">(${r.months.join(', ')})</span>` : ''}</td>
                        <td style="padding: 6px 8px; font-size: 0.75rem; color: #6b7280;">${this.employeeLabel(r)}</td>
                        <td style="padding: 6px 8px;">${r.bank}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 600;">${fmt(r.amount)}</td>
                        <td style="padding: 6px 8px; white-space: nowrap;">${statusCell}</td>
                    </tr>`;
            }).join('');

            return `
                <tr style="background: #eff6ff; border-top: 2px solid #bfdbfe;">
                    <td colspan="7" style="padding: 6px 8px; font-weight: 700;">📅 ${day} <span style="font-weight: 500; color: #374151; font-size: 0.8rem;">— ${totalsLabel}</span></td>
                </tr>${trs}`;
        }).join('');

        tableEl.innerHTML = rows.length === 0
            ? '<div style="padding: 2rem; text-align: center; color: #6b7280;">No hay consignaciones en este rango 🎉</div>'
            : `<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="background: #f3f4f6; text-align: left;">
                        <th style="padding: 8px;">Hora</th><th style="padding: 8px;">Origen</th>
                        <th style="padding: 8px;">Detalle</th><th style="padding: 8px;">Empleado</th>
                        <th style="padding: 8px;">Cuenta</th><th style="padding: 8px; text-align: right;">Monto</th>
                        <th style="padding: 8px;">Verificación</th>
                    </tr>
                </thead>
                <tbody>${blocks}</tbody>
            </table>`;
    }

    exportCsv() {
        const rows = this.filteredRows();
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [
            ['Fecha', 'Hora', 'Origen', 'Detalle', 'Empleado', 'Cuenta', 'Monto', 'Estado', 'Nota'].join(';'),
            ...rows.map(r => {
                const mark = this.marks.get(r.key);
                return [r.date, r.time || '', r.sourceType, esc(r.desc), esc(this.employeeLabel(r)),
                    r.bank, r.amount, mark ? mark.status : 'pendiente', esc(mark?.note || '')].join(';');
            })
        ];
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `conciliacion-bancaria-${window.getLocalDate()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}

window.BankReconManager = new BankReconciliationManagerClass();
console.log('🏦 Bank reconciliation module loaded');
